    // ---------- Zur Galerie ----------
    // Hugo 24.11.: Auf dem Weg zu einer Galerie (Creator, Singer, Model) schaltet die Seite ab wie ein alter Röhrenfernseher.
    // Das Bild klappt zu einer hellen Linie zusammen (Blitz am Horizont), die Linie schlägt immer schneller zu einem
    // Lichtpunkt zusammen. Der Punkt bleibt stehen, bis die Galerie da ist; dort fällt er in sich zusammen und explodiert
    // (galerie.js). Seit 28.11.2026 (Hugo 13:55: «sobald das Studio verlassen wird, immer die TV-Animation») auch auf dem Weg zum
    // Alchemist (Auswahl /alchemist). Dort blendet die Seite aus dem Schwarz mit dem Punkt ein (Seiten-Head der Auswahl, hs-vt-crt).
    var CRT = {
      paths:    ['/creator', '/singer', '/model-2027'],   // Seiten mit galerie.js
      off:      ['/alchemist', '/alchemist-kurz', '/mechanic'],   // weitere Ziele mit TV-Animation (ohne Vorladen der Galerie)
      squashMs: 220,    // Bild klappt zur Linie zusammen, wird dabei heller
      lineMs:   440     // Linie schlägt zum Punkt zusammen: holt kurz Schwung nach aussen, dann immer schneller zur Mitte
    };
    // Hugo 25.11.: Linie spitz zulaufend (links und rechts wie eine Nadel), schillernd (Iridescence), zieht schwungvoll zur
    // Mitte bis zum Knall. Lichtpunkt und Knall auf der Galerie-Seite schillern in denselben Farben (galerie.js).
    // Form (Hugo 25.11., 06:45): an den Enden eine feine Nadel, zur Mitte hin wächst ein geschwungener Rücken zum Kreis.
    // Gezeichnet in 1000 × 20 und auf die Bildschirmbreite gezogen (preserveAspectRatio none).
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
    var crtFx = null;
    function crtReset() {
      if (crtFx) { crtFx.remove(); crtFx = null; }
      document.documentElement.classList.remove('hp-crt-on');
      var b = document.body;
      if (b.getAnimations) b.getAnimations().forEach(function (an) { if (an.id === 'hp-crt') an.cancel(); });
      ['transform-origin', 'visibility', 'opacity'].forEach(function (p) { b.style.removeProperty(p); });
    }
    // Zurück aus der Galerie (Seite aus dem Speicher): Röhren-TV zurücksetzen und das About sofort schliessen,
    // damit man beim Bild des Bereichs landet (Hugo 25.11., 07:20), nicht im About
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      try { sessionStorage.removeItem('hp-return'); } catch (er) {}   // nur für ein frisches Laden gedacht
      var back = !!crtFx; crtReset(); if (back) infoInstantClose();
    });
    // Hugo 25.11. (Video 06:04): Am iPhone blieb das Bild als dicker Streifen stehen, die Linie kam nie. Ursache: Die Schritte
    // liefen pro Bild im Haupt-Thread (dort rechnet auch die Sonne) und filter: brightness auf der ganzen Seite ist teuer.
    // Jetzt laufen alle Teile als Web-Animationen (Grafikchip, auch wenn der Haupt-Thread voll ist). Heller wird es über
    // eine weisse Fläche mit Mischmodus «screen», die genau mit dem Bild zusammenklappt.
    function crtOff(done) {
      if (crtFx) return;
      if (!document.getElementById('hp-crt-css')) {
        var st = document.createElement('style'); st.id = 'hp-crt-css'; st.textContent = crtCss; document.head.appendChild(st);
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
    // Galerie vorladen (Hugo 25.11.: «muss die Galerie im Voraus laden»): sobald ein Bereich geöffnet wird,
    // holt die Homepage die Galerie-Seite, ihr Skript und alle Titelbilder in derselben Grösse wie dort.
    // Beim Tippen auf «Galerie öffnen» ist dann alles im Speicher, der Lichtpunkt steht nur noch kurz.
    var warmed = {};
    function warmGallery(href) {
      if (!href || href === '#') return;
      var to = ''; try { to = new URL(href, location.href).pathname.replace(/\/$/, '') || '/'; } catch (er) { return; }
      if (CRT.paths.indexOf(to) < 0 || warmed[to]) return;
      warmed[to] = true;
      try { var l = document.createElement('link'); l.rel = 'prefetch'; l.href = href; document.head.appendChild(l); } catch (er) {}
      fetch(href, { credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (t) { idle(function () {   // Lesen ebenfalls in einer ruhigen Lücke
        var x = new DOMParser().parseFromString(t, 'text/html');
        [].forEach.call(x.querySelectorAll('script[src*="galerie"]'), function (sc) { fetch(sc.src, { mode: 'no-cors' }).catch(function () {}); });
        // seit 25.11. (18:30) lädt die Galerie ihr Skript über einen kleinen Lader (Prüfsumme + Ersatzquelle) – Adresse daraus lesen
        [].forEach.call(x.querySelectorAll('script:not([src])'), function (sc) {
          var mV = /V='([0-9a-f]{40})',F='(galerie\.min\.js)'/.exec(sc.textContent || '');
          if (mV) fetch('https://cdn.jsdelivr.net/gh/hugosophian/hugosophian-studio@' + mV[1] + '/' + mV[2], { mode: 'cors' }).catch(function () {});
        });
        // Audit 25.11.: nur die Bilder dieses Bereichs (die Seite enthält auch die der anderen, galerie.js blendet sie aus)
        var sec = x.querySelector('[data-lib]'), fold = sec && sec.getAttribute('data-lib-folder');
        [].filter.call(x.querySelectorAll('[data-lib] img.lib-img'), function (im) {
          if (!fold) return true;
          var a = im.closest('a[href]'), pth = '';
          try { pth = new URL(a.getAttribute('href'), location.href).pathname; } catch (er) {}
          return pth.indexOf(fold) === 0;
        }).slice(0, 40).forEach(function (im) {
          var p = new Image();
          p.sizes = '(max-width: 767px) 60vw, 30vw';   // gleiche Bildgrösse wie in galerie.js (SIZES), damit der Speicher trifft
          if (im.getAttribute('srcset')) p.srcset = im.getAttribute('srcset');
          p.src = im.getAttribute('src');
        });
      }); }).catch(function () {});
    }
    function go(href) {
      if (!href) return;
      var to = ''; try { to = new URL(href, location.href).pathname; } catch (er) {}
      if (!to) return;
      var clean = to.replace(/\/$/, '') || '/';
      if (CRT.paths.indexOf(clean) > -1) { try { sessionStorage.setItem('hp-return', clean); } catch (er) {} }
      if (!reduce && (CRT.paths.indexOf(clean) > -1 || CRT.off.indexOf(clean) > -1)) {
        // Seite schon jetzt laden, damit der Punkt nicht lange steht
        try { var l = document.createElement('link'); l.rel = 'prefetch'; l.href = href; document.head.appendChild(l); } catch (er) {}
        crtOff(function () {
          window.hsVT = { to: to, type: 'crt' };
          location.href = href;
        });
        return;
      }
      window.hsVT = { to: to, type: 'fade' };
      location.href = href;
    }

