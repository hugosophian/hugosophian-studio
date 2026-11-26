#!/usr/bin/env python3
"""Automatische Prüfung der Homepage (home.js) vor jeder Veröffentlichung.

Aufruf (im Repo-Ordner):   python3 tests/run.py            prüfen
                           python3 tests/run.py --update   Vergleichsbilder neu setzen (nach gewollten Änderungen)

Was geprüft wird (Handy 390 × 780, doppelte Auflösung, fester Zufall, virtuelle Uhr = jedes Mal genau gleich):
  1. keine JavaScript-Fehler, beide Shader übersetzen
  2. Andocken: Effekt-Leinwand sitzt direkt im Bild (keine Kopie), jedes Foto wird nur einmal hochgeladen
  3. Wischen: kein neuer Textur-Upload pro Bild (Bildtexturen)
  4. Tippen öffnet About, Schliessen: weisse Seite springt nicht zurück (kein Blitz)
  5. Bildvergleich mit Gitterbild (Andocken, Wischen): Falten, Linien, Doppelkanten fallen als Abweichung auf
  6. Fingerwelle aus (seit 26.11.2026): beim Wischen entsteht keine Welle, die Effekt-Leinwand liegt danach nicht mehr im Bild
  7. Tiefe (seit 26.11.2026, eigene Testseite mit den Dateien aus tiefe/): alle Bilder bekommen ihre Leinwand, eingerastet ist
     sie unsichtbar (man sieht das <img>), beim Wischen sichtbar; Schalter 40/60/80; Bildvergleich
  8. Bildtakt mit 4-fach gebremster CPU (Hinweis, kein Abbruch)
Braucht: pip install playwright pillow numpy  ·  Chrome unter /usr/bin/google-chrome (oder Umgebungsvariable CHROME)
"""
import asyncio, functools, http.server, math, os, socketserver, sys, threading
import numpy as np
from PIL import Image
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, 'tests', 'baseline')
OUT = os.path.join(ROOT, 'tests', 'out')
UPDATE = '--update' in sys.argv
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
TOL = 2.5   # mittlere Abweichung pro Pixel (0–255), ab der ein Bild als verändert gilt

INIT = """(function(){var s=12345;Math.random=function(){s=(s*16807)%2147483647;return (s-1)/2147483646;};
window.__up=0;window.__copy=0;window.__sh=[];
var T=WebGLRenderingContext.prototype.texImage2D;WebGLRenderingContext.prototype.texImage2D=function(){window.__up++;return T.apply(this,arguments)};
var G=WebGLRenderingContext.prototype.getShaderParameter;WebGLRenderingContext.prototype.getShaderParameter=function(x,p){var r=G.apply(this,arguments);if(p===this.COMPILE_STATUS)window.__sh.push(!!r);return r};
var D=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(a){if(a&&a.className==='hp-ripple')window.__copy++;return D.apply(this,arguments)};})()"""

results = []
def check(name, ok, info=''):
    results.append((name, ok, info))
    print(('OK   ' if ok else 'FEHLER ') + name + (('  ·  ' + info) if info else ''))

def serve():
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Q, directory=ROOT)
    s = socketserver.TCPServer(('127.0.0.1', 0), h)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s, s.server_address[1]

def compare(name, path):
    os.makedirs(BASE, exist_ok=True)
    ref = os.path.join(BASE, name + '.png')
    if UPDATE or not os.path.exists(ref):
        Image.open(path).save(ref); check('Bild ' + name, True, 'Vergleichsbild gesetzt'); return
    a = np.asarray(Image.open(path).convert('L'), float); b = np.asarray(Image.open(ref).convert('L'), float)
    if a.shape != b.shape: check('Bild ' + name, False, 'andere Grösse'); return
    d = np.abs(a - b).mean()
    check('Bild ' + name, d <= TOL, 'Abweichung %.2f (Grenze %.1f) – bei gewollter Änderung: --update' % (d, TOL))

async def frames(pg, ms):   # virtuelle Uhr in Bildschritten vorstellen
    for _ in range(int(ms / 16)):
        await pg.clock.run_for(16)

async def main():
    os.makedirs(OUT, exist_ok=True)
    srv, port = serve()
    url = 'http://127.0.0.1:%d/tests/fixtures/homepage.html' % port
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 390, 'height': 780}, is_mobile=True, has_touch=True, device_scale_factor=2)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script(INIT)
        await pg.clock.install(time=0); await pg.clock.pause_at(1000)   # Uhr steht, bis die Prüfung sie vorstellt
        await pg.goto(url); await pg.wait_for_timeout(3000)   # Bilder laden und entpacken (echte Zeit, Uhr steht)
        await frames(pg, 1800)
        sh = await pg.evaluate('__sh'); check('Shader übersetzen', len(sh) >= 2 and all(sh), str(sh))
        # Andocken
        par = None
        for k, t in enumerate((800, 250, 450)):
            await frames(pg, t)
            path = os.path.join(OUT, 'andocken-%d.png' % k); await pg.screenshot(path=path); compare('andocken-%d' % k, path)
            pk = await pg.evaluate("(()=>{var c=document.querySelector('.hp-ripple');return c&&c.parentNode?c.parentNode.className:'-'})()")
            if 'hp-slide' in pk: par = pk
        check('Andocken: Leinwand direkt im Bild', par is not None and 'hp-slide' in par, str(par))
        up0, cp0 = await pg.evaluate('[__up,__copy]')
        nimg = await pg.evaluate("document.querySelectorAll('.hp-slide img').length")
        check('Andocken: Uploads nur einmal je Foto', up0 <= nimg + 3, 'Uploads %d bei %d Fotos, Kopien %d' % (up0, nimg, cp0))   # Bildtexturen: jedes Foto einmal (20:54), sonst wenige
        await frames(pg, 5500)
        # Welle beim Wischen
        # Finger im Takt der virtuellen Uhr (Ereignisse direkt in der Seite – so jedes Mal genau gleich)
        await pg.evaluate("""window.__t=function(tp,x,y){var el=document.elementFromPoint(x,y)||document.body,o={bubbles:true,cancelable:true,composed:true};
          var pm={touchStart:'pointerdown',touchMove:'pointermove',touchEnd:'pointerup'}[tp],tm={touchStart:'touchstart',touchMove:'touchmove',touchEnd:'touchend'}[tp];
          var tg=window.__tg||(window.__tg=el);if(tp==='touchStart')window.__tg=tg=el;
          var t=new Touch({identifier:1,target:tg,clientX:x,clientY:y}),L=tp==='touchEnd'?[]:[t];
          tg.dispatchEvent(new TouchEvent(tm,Object.assign({touches:L,targetTouches:L,changedTouches:[t]},o)));
          tg.dispatchEvent(new PointerEvent(pm,Object.assign({pointerId:1,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,button:0,buttons:tp==='touchEnd'?0:1},o)));};0""")
        last = [0, 0]
        async def touch(tp, pts):
            if pts: last[0], last[1] = pts[0]['x'], pts[0]['y']
            await pg.evaluate("__t('%s',%d,%d)" % (tp, last[0], last[1]))
        u1 = await pg.evaluate('__up')
        await touch('touchStart', [{'x': 120, 'y': 500}])
        for i in range(1, 25):
            await touch('touchMove', [{'x': 120 + 6 * i, 'y': 500 - 9 * i}]); await frames(pg, 16)
        path = os.path.join(OUT, 'wischen.png'); await pg.screenshot(path=path); compare('wischen', path)
        u2 = await pg.evaluate('__up')
        check('Wischen: kein Upload pro Bild', u2 - u1 <= 2, '%d Uploads in 24 Bildern' % (u2 - u1))
        rp = await pg.evaluate("(()=>{var c=document.querySelector('.hp-ripple');return !!(c&&c.parentNode)})()")
        check('Fingerwelle aus: keine Effekt-Leinwand beim Wischen', not rp)
        await touch('touchEnd', []); await frames(pg, 6500)
        # Tippen → About, Schliessen ohne Blitz
        await touch('touchStart', [{'x': 200, 'y': 350}]); await frames(pg, 48); await touch('touchEnd', [])
        await frames(pg, 2000)
        isinfo = await pg.evaluate("document.querySelector('[data-hp]').classList.contains('is-info')")
        check('Tippen öffnet About', isinfo)
        await pg.keyboard.press('Escape')
        jumped = False; seen = 0
        for _ in range(140):
            await frames(pg, 16)
            x = await pg.evaluate("Math.round(document.querySelector('.hp-info-bg').getBoundingClientRect().left)")
            seen = max(seen, x)
            if seen >= 380 and x < 380: jumped = True
        check('Schliessen ohne Blitz', not jumped and seen >= 380, 'weisse Seite zuletzt bei %d px' % x)
        check('keine JavaScript-Fehler', not errs, '; '.join(errs)[:300])
        await b.close()

        # Tiefe: eigene Testseite, die Bild-Dateien kommen aus dem Ordner tiefe/ im Repo (echte Uhr: Laden und Aufbau in ruhigen Lücken)
        b = await p.chromium.launch(executable_path=CHROME, args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 390, 'height': 780}, is_mobile=True, has_touch=True, device_scale_factor=2)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(url.replace('homepage.html', 'homepage-tiefe.html'))
        st = "(()=>[...document.querySelectorAll('.hp-slide')].map(s=>{var c=s.querySelector('.hp-tiefe');return c?(c.style.opacity||'0'):'-'}))()"
        got = []
        for _ in range(40):
            await pg.wait_for_timeout(500); got = await pg.evaluate(st)
            if '-' not in got: break
        check('Tiefe: jedes Bild hat seine Leinwand', '-' not in got, str(got))
        check('Tiefe: eingerastet unsichtbar (man sieht das <img>)', got[0] == '0', str(got))
        nsw = await pg.evaluate("document.querySelectorAll('.hp-tiefe-box input[type=range]').length")
        check('Tiefe: Regler (Tiefe, Fixpunkt, Kippen, Halten) auf der Testseite', nsw == 4, str(nsw))
        await pg.evaluate("""window.__t=function(tp,x,y){var el=document.elementFromPoint(x,y)||document.body,o={bubbles:true,cancelable:true,composed:true};
          var pm={touchStart:'pointerdown',touchMove:'pointermove',touchEnd:'pointerup'}[tp],tm={touchStart:'touchstart',touchMove:'touchmove',touchEnd:'touchend'}[tp];
          var tg=window.__tg||(window.__tg=el);if(tp==='touchStart')window.__tg=tg=el;
          var t=new Touch({identifier:1,target:tg,clientX:x,clientY:y}),L=tp==='touchEnd'?[]:[t];
          tg.dispatchEvent(new TouchEvent(tm,Object.assign({touches:L,targetTouches:L,changedTouches:[t]},o)));
          tg.dispatchEvent(new PointerEvent(pm,Object.assign({pointerId:1,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,button:0,buttons:tp==='touchEnd'?0:1},o)));};0""")
        await pg.evaluate("__t('touchStart',200,420)")
        for i in range(1, 13):
            await pg.evaluate("__t('touchMove',200,%d)" % (420 - 10 * i)); await pg.wait_for_timeout(16)
        await pg.wait_for_timeout(2500)   # Finger hält: das Bild steht knapp halb verschoben
        held = await pg.evaluate(st)
        check('Tiefe: beim Wischen sichtbar', held[0] == '1' and held[1] == '1', str(held))
        path = os.path.join(OUT, 'tiefe.png'); await pg.screenshot(path=path)
        await pg.add_style_tag(content='.hp-tiefe{visibility:hidden!important}')   # dasselbe Bild ohne Tiefe (nur das <img>)
        flat = os.path.join(OUT, 'tiefe-ohne.png'); await pg.screenshot(path=flat)
        da = np.asarray(Image.open(path).convert('L'), float); db = np.asarray(Image.open(flat).convert('L'), float)
        dd = np.abs(da - db).mean()
        # gleich wie das <img> = keine Tiefe (0); leere oder falsche Leinwand = weit über 40
        check('Tiefe: Leinwand zeigt das Foto, in sich verschoben (nicht leer, nicht gleich wie das <img>)', 0.15 < dd < 40, 'Unterschied %.2f' % dd)
        await pg.evaluate("document.head.lastElementChild.remove()")
        compare('tiefe', path)
        await pg.evaluate("__t('touchEnd',200,300)")
        for _ in range(24):   # Einrasten dauert im Test-Browser (Software-Grafik) länger als am Handy
            await pg.wait_for_timeout(500); back = await pg.evaluate(st)
            if '0' in (back[0], back[1]): break
        check('Tiefe: nach dem Einrasten wieder unsichtbar', '0' in (back[0], back[1]), str(back))
        check('Tiefe: keine JavaScript-Fehler', not errs, '; '.join(errs)[:300])
        await b.close()

        # Bildtakt mit gebremster CPU (echte Zeit, nur Hinweis)
        b = await p.chromium.launch(executable_path=CHROME, args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
        ctx = await b.new_context(viewport={'width': 390, 'height': 780}, is_mobile=True, has_touch=True)
        pg = await ctx.new_page(); cdp = await ctx.new_cdp_session(pg)
        await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        await pg.goto(url); await pg.wait_for_timeout(9000)
        ms = await pg.evaluate("""new Promise(r=>{var t=[],l=performance.now();function f(n){t.push(n-l);l=n;if(t.length<90)requestAnimationFrame(f);else r(t)}requestAnimationFrame(f)})""")
        ms = sorted(ms); p95 = ms[int(len(ms) * .95)]
        print('HINWEIS Bildtakt in Ruhe (CPU ×4): Median %.0f ms, 95 %% %.0f ms' % (ms[len(ms) // 2], p95))
        await b.close()
    srv.shutdown()
    bad = [r for r in results if not r[1]]
    print('\n%d von %d Prüfungen bestanden' % (len(results) - len(bad), len(results)))
    sys.exit(1 if bad else 0)

asyncio.run(main())
