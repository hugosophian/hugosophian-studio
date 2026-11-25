/* GALERIE-MENÜ + STUDIO · alle Seiten ausser der Homepage · hugosophian.studio
   Hugo 25.11. (09:34): «studio» im Menü schaltet die Seite ebenfalls ab wie ein Röhren-TV, der Punkt geht kurz und knapp
   aus, dann die Homepage mit ihrer Ladeanimation.
   Hugo 25.11. (08:55): Im Menü einer Projektseite steht statt «zurück» jetzt «zur galerie». Antippen schaltet die Seite ab
   wie ein alter Röhrenfernseher – genau wie der Weg Homepage → Galerie (home.js, crtOff) – und die Galerie öffnet mit
   Lichtpunkt und Knall. Alchemist-Projekte bleiben wie sie sind. Geladen vom Website-Skript «GalerieMenue». */
(function () {
  var MAP = [['/creator-projects/', '/creator'], ['/singer-projects/', '/singer'], ['/model/', '/model-2027']];
  var hit = MAP.filter(function (r) { return location.pathname.indexOf(r[0]) === 0; })[0];
  if ((location.pathname.replace(/\/$/, '') || '/') === '/' || window.__gxMenu) return;
  window.__gxMenu = true;
  var GAL = hit ? hit[1] : '';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CRT = { squashMs: 220, lineMs: 440 };   // gleiche Werte wie home.js
    var NEEDLE_D = 'M0 10 C 260 9.7, 400 8.6, 455 5.2 C 478 1.2, 522 1.2, 545 5.2 C 600 8.6, 740 9.7, 1000 10 C 740 10.3, 600 11.4, 545 14.8 C 522 18.8, 478 18.8, 455 14.8 C 400 11.4, 260 10.3, 0 10 Z';
    var CORE_D = 'M40 10 C 300 9.85, 420 9.2, 465 7.4 C 484 5.6, 516 5.6, 535 7.4 C 580 9.2, 700 9.85, 960 10 C 700 10.15, 580 10.8, 535 12.6 C 516 14.4, 484 14.4, 465 12.6 C 420 10.8, 300 10.15, 40 10 Z';
    var NEEDLE_SVG = '<svg viewBox="0 0 1000 20" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="hpCrtIri" x1="0" x2="1" y1="0" y2="0">'
      + '<stop offset="0" stop-color="#ff6ad5"/><stop offset=".12" stop-color="#c774e8"/><stop offset=".22" stop-color="#ad8cff"/><stop offset=".32" stop-color="#8795e8"/>'
      + '<stop offset=".42" stop-color="#94d0ff"/><stop offset=".5" stop-color="#ffffff"/><stop offset=".58" stop-color="#94d0ff"/><stop offset=".68" stop-color="#8ff7c8"/>'
      + '<stop offset=".78" stop-color="#fff38a"/><stop offset=".88" stop-color="#ffb86b"/><stop offset="1" stop-color="#ff6ad5"/></linearGradient></defs>'
      + '<path d="' + NEEDLE_D + '" fill="url(#hpCrtIri)"/><path d="' + CORE_D + '" fill="#fff"/></svg>';
    var crtCss = [
      '.hp-crt { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; }',
      '.hp-crt > i { position: absolute; display: block; opacity: 0; }',
      '.hp-crt-line { left: 0; top: 50%; width: 100%; height: 18px; margin-top: -9px; filter: drop-shadow(0 0 4px rgba(255,255,255,.9)) drop-shadow(0 0 16px rgba(190,170,255,.7)); }',
      '.hp-crt-line svg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible; }',
      '.hp-crt-streak { left: -30vw; top: 50%; width: 160vw; height: 90px; margin-top: -45px; background: radial-gradient(ellipse at center, rgba(255,255,255,.9) 0, rgba(225,205,255,.5) 18%, rgba(140,200,255,.14) 45%, rgba(0,0,0,0) 70%); }',
      '.hp-crt-dot { left: 50%; top: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; background: #fff;',
      '  box-shadow: 0 0 6px 2px #fff, 0 0 16px 5px rgba(255,110,220,.55), 0 0 30px 10px rgba(120,210,255,.45), 0 0 56px 18px rgba(255,230,120,.22); }',
      '.hp-crt-dot.is-hold { opacity: 1; animation: hpCrtPulse 1.1s ease-in-out infinite, hpCrtHue 2.4s linear infinite; }',
      '@keyframes hpCrtPulse { 50% { transform: scale(.82); } }',
      '@keyframes hpCrtHue { to { filter: hue-rotate(360deg); } }',
      '.hp-crt-wash { left: 0; top: 0; width: 100%; height: 100%; background: #fff; mix-blend-mode: screen; }',
      'html.hp-crt-on .menu-toggle-wrap { opacity: 0 !important; transition: opacity .15s !important; }',
      'html.hp-crt-on, html.hp-crt-on body { background: #000 !important; }'
    ].join('\n');
    var crtCss = [
      '.hp-crt { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; }',
      '.hp-crt > i { position: absolute; display: block; opacity: 0; }',
      '.hp-crt-line { left: 0; top: 50%; width: 100%; height: 18px; margin-top: -9px; filter: drop-shadow(0 0 4px rgba(255,255,255,.9)) drop-shadow(0 0 16px rgba(190,170,255,.7)); }',
      '.hp-crt-line svg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible; }',
      '.hp-crt-streak { left: -30vw; top: 50%; width: 160vw; height: 90px; margin-top: -45px; background: radial-gradient(ellipse at center, rgba(255,255,255,.9) 0, rgba(225,205,255,.5) 18%, rgba(140,200,255,.14) 45%, rgba(0,0,0,0) 70%); }',
      '.hp-crt-dot { left: 50%; top: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; background: #fff;',
      '  box-shadow: 0 0 6px 2px #fff, 0 0 16px 5px rgba(255,110,220,.55), 0 0 30px 10px rgba(120,210,255,.45), 0 0 56px 18px rgba(255,230,120,.22); }',
      '.hp-crt-dot.is-hold { opacity: 1; animation: hpCrtPulse 1.1s ease-in-out infinite, hpCrtHue 2.4s linear infinite; }',
      '@keyframes hpCrtPulse { 50% { transform: scale(.82); } }',
      '@keyframes hpCrtHue { to { filter: hue-rotate(360deg); } }',
      '.hp-crt-wash { left: 0; top: 0; width: 100%; height: 100%; background: #fff; mix-blend-mode: screen; }',
      'html.hp-crt-on .menu-toggle-wrap, html.hp-crt-on .menu-panel { opacity: 0 !important; transition: opacity .15s !important; }',
      'html.hp-crt-on, html.hp-crt-on body { background: #000 !important; }',
      'html.hp-crt-on body { filter: none !important; scale: none !important; transition: none !important; }'
    ].join('\n');
    var crtFx = null;
    function crtReset() {
      if (crtFx) { crtFx.remove(); crtFx = null; }
      document.documentElement.classList.remove('hp-crt-on');
      var b = document.body;
      if (b.getAnimations) b.getAnimations().forEach(function (an) { if (an.id === 'hp-crt') an.cancel(); });
      ['transform-origin', 'visibility', 'opacity'].forEach(function (p) { b.style.removeProperty(p); });
    }
    // Zurück auf die Projektseite (aus dem Speicher): Fernseher wieder an
    window.addEventListener('pageshow', function (e) { if (e.persisted) crtReset(); });
    function crtOff(done) {
      if (crtFx) return;
      if (!document.getElementById('hp-crt-css-m')) {
        var st = document.createElement('style'); st.id = 'hp-crt-css-m'; st.textContent = crtCss; document.head.appendChild(st);
      }
      var R = document.documentElement, b = document.body, A = CRT.squashMs, L = CRT.lineMs;
      crtFx = document.createElement('div'); crtFx.className = 'hp-crt'; crtFx.setAttribute('aria-hidden', 'true');
      crtFx.innerHTML = '<i class="hp-crt-wash"></i><i class="hp-crt-streak"></i><i class="hp-crt-line">' + NEEDLE_SVG + '</i><i class="hp-crt-dot"></i>';
      R.appendChild(crtFx);
      R.classList.add('hp-crt-on');
      var wash = crtFx.children[0], streak = crtFx.children[1], line = crtFx.children[2], dotEl = crtFx.children[3];
      var IN = 'cubic-bezier(.55,0,.9,.4)', IN4 = 'cubic-bezier(.75,0,.95,.35)', o = { fill: 'both' };
      b.style.setProperty('transform-origin', '50% ' + (window.scrollY + window.innerHeight / 2) + 'px', 'important');
      // 1) Bild klappt senkrecht zusammen und wird heller
      // Hugo 25.11. (06:44): am Ende blendet die Seite ganz aus. Vorher blieb die zusammengeklappte Seite als dünne Linie stehen,
      // weil visibility: hidden am body die Bilder mit visibility: visible (.hp-slide.is-vis) nicht versteckt; opacity schon.
      var sq = b.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(1.04, .02)', opacity: 1, offset: .8 }, { transform: 'scale(1.05, .004)', opacity: 0 }], { duration: A, easing: IN, fill: 'forwards', id: 'hp-crt' });
      wash.animate([{ transform: 'scaleY(1)', opacity: 0 }, { transform: 'scaleY(.02)', opacity: .9, offset: .8 }, { transform: 'scaleY(.004)', opacity: 0 }], { duration: A, easing: IN, fill: 'forwards' });   // blendet selbst aus (blieb sonst als 3-px-Strich stehen)
      streak.animate([{ opacity: 0 }, { opacity: 0, offset: .65 }, { opacity: 1 }], { duration: A, fill: 'forwards' });
      // 2) Blitz am Horizont: die Nadel leuchtet dick auf, holt kurz Schwung nach aussen und schlägt dann immer schneller
      //    zur Mitte zusammen. Die Farben drängen sich dabei zusammen (Schillern).
      var SNAP = 'cubic-bezier(.62,0,.98,.55)';
      line.animate([
        { opacity: 0, transform: 'scaleX(1) scaleY(2.6)', easing: 'ease-out' },
        { opacity: 1, transform: 'scaleX(1) scaleY(2.6)', offset: .02, easing: 'cubic-bezier(.2,.7,.3,1)' },
        { opacity: 1, transform: 'scaleX(1.06) scaleY(1)', offset: .2, easing: SNAP },
        { opacity: 1, transform: 'scaleX(.03) scaleY(.8)', offset: .94 },
        { opacity: 0, transform: 'scaleX(.002) scaleY(.6)' }   // verschwindet ganz im Punkt
      ], { duration: L, delay: A, fill: 'both' });
      streak.animate([
        { opacity: 1, transform: 'scaleX(1) scaleY(1.8)', easing: 'ease-out' },
        { opacity: .85, transform: 'scaleX(1.05) scaleY(1)', offset: .2, easing: SNAP },
        { opacity: .4, transform: 'scaleX(.04) scaleY(.8)', offset: .9 },
        { opacity: 0, transform: 'scaleX(.02) scaleY(.6)' }
      ], { duration: L, delay: A, fill: 'forwards' });
      // Der Kreis in der Mitte gehört zur Nadel (ihr Rücken läuft in ihn hinein). Er bleibt stehen, während die Nadel in ihn
      // hineinzieht, blitzt beim Ankommen kurz auf und bleibt als Lichtpunkt.
      dotEl.animate([{ opacity: 0, transform: 'scale(1.5)' }, { opacity: 1, transform: 'scale(1.5)', offset: .03 }, { opacity: 1, transform: 'scale(1)', offset: .3 }, { opacity: 1, transform: 'scale(1)', offset: .8 }, { opacity: 1, transform: 'scale(2.1)', offset: .9 }, { opacity: 1, transform: 'scale(1)' }], { duration: L + 120, delay: A, fill: 'both' });
      sq.onfinish = function () { if (crtFx) { b.style.setProperty('opacity', '0', 'important'); wash.style.display = 'none'; } };
      setTimeout(function () {
        if (!crtFx) return;
        // 3) Lichtpunkt bleibt, pulsiert und schillert, bis die Galerie da ist
        line.style.display = streak.style.display = 'none';
        dotEl.getAnimations().forEach(function (an) { an.cancel(); });
        dotEl.classList.add('is-hold');
        done();
      }, A + L + 120);
    }

    function prefetch() {
      if (prefetch.done) return; prefetch.done = true;
      try { var l = document.createElement('link'); l.rel = 'prefetch'; l.href = GAL; document.head.appendChild(l); } catch (er) {}
    }
    function go(e) {
      if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0)) return;
      if (e) { e.preventDefault(); e.stopPropagation(); }
      prefetch();
      var leave = function () { window.hsVT = { to: GAL, type: 'crt' }; location.href = GAL; };
      if (reduce) { leave(); return; }
      crtOff(leave);
    }
    // «studio»: kurz abschalten, Punkt geht aus, dann Homepage (mit Ladeanimation). Fängt den Klick vor den anderen
    // Übergängen ab (MenueWeich, SeitenuebergaengeStil), darum auf window in der Capture-Phase.
    function homeLink(a) {
      if (!a || !a.closest('[data-menu-panel], .menu-panel')) return false;
      try { var u = new URL(a.getAttribute('href'), location.href); return u.origin === location.origin && (u.pathname.replace(/\/$/, '') || '/') === '/'; } catch (er) { return false; }
    }
    var homing = false;
    window.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!homeLink(a) || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (homing) return; homing = true;
      var leave = function () { if (leave.done) return; leave.done = true; window.hsVT = { to: '/', type: 'crt' }; location.href = '/'; };
      document.documentElement.classList.remove('menu-open');
      if (reduce) { leave(); return; }
      crtOff(function () {
        var d = crtFx && crtFx.children[3];
        if (!d || !d.animate) { leave(); return; }
        d.classList.remove('is-hold');
        var an = d.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.55)', opacity: 0 }], { duration: 200, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
        an.onfinish = leave; setTimeout(leave, 400);
      });
    }, true);
    window.addEventListener('pageshow', function (e) { if (e.persisted) homing = false; });
    function setup() {
      var panel = document.querySelector('[data-menu-panel]');
      if (!panel) return false;
      // MenueWeich lässt Links mit target in Ruhe (es läuft vor diesem Code) → Studio-Links markieren
      [].forEach.call(panel.querySelectorAll('a[href]'), function (x) { if (homeLink(x)) x.setAttribute('target', '_self'); });
      if (!GAL) return true;
      var a = [].filter.call(panel.querySelectorAll('a[href]'), function (x) {
        try { return (new URL(x.getAttribute('href'), location.href).pathname.replace(/\/$/, '')) === GAL; } catch (er) { return false; }
      })[0];
      if (!a) return false;
      a.textContent = 'zur galerie'; a.setAttribute('aria-label', 'Zurück zur Galerie');
      a.setAttribute('target', '_self');   // der Menü-Übergang (MenueWeich) lässt Links mit target in Ruhe → hier eigener Ablauf
      a.addEventListener('click', go);
      var open = document.querySelector('[data-menu-open]');
      if (open) open.addEventListener('click', prefetch);
      return true;
    }
    if (!setup()) document.addEventListener('DOMContentLoaded', setup);
})();
