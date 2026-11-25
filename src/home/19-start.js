    // ---------- Start ----------
    // Barrierefreiheit (Lighthouse 21.11.): Webflow-Listenrollen passen nicht mehr, weil die Einträge umgebaut werden
    [].forEach.call(root.querySelectorAll('[role="list"],[role="listitem"]'), function (e) { e.removeAttribute('role'); });
    root.classList.toggle('is-mouse', window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    slides.forEach(function (s, i) {
      if (!s.img) return;
      s.img.sizes = '100vw';
      if (i === 0) s.img.setAttribute('fetchpriority', 'high');
    });
    fitTitles();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitTitles(); render(); });
    root.classList.add('is-ready');
    startIntro();
    if (!introOn) mbShow();
    // Hugo 12:19: Text der Spalten in einem festen Bereich (Computer), Schrift bleibt gleich. Passt er nicht hinein, scrollt er
    // im Bereich (Mausrad/Trackpad) mit dem Wort-Effekt wie im Handy-About: beim Öffnen steht er normal da, beim Scrollen
    // gehen die Wörter oben hinaus (aufsteigen, ausblenden), unten kommen sie herein, solange noch Text darunter liegt.
    function fitSides() {
      if (!desk) return;
      slides.forEach(function (s) {
        var sin = s.sideIn, box = sin && sin.querySelector('.hp-side-box'), t = box && box.querySelector('.hp-intro-text'); if (!t) return;
        if (s.sideOrig != null) t.innerHTML = s.sideOrig; else s.sideOrig = t.innerHTML;
        s.sideWords = null; box.scrollTop = 0; t.style.paddingBottom = ''; s.sideZB = 0;
        var over = box.scrollHeight > box.clientHeight + 2;
        sin.classList.toggle('is-scroll', over);
        if (!s.sbar) s.sbar = makeSbar(sin);
        if (!over) { s.sbar.hide(); box.style.webkitMaskImage = box.style.maskImage = ''; return; }
        s.sbarSt = 0;
        if (!box.hpWords) { box.hpWords = true; box.addEventListener('scroll', function () { if (!box.hpRaf) box.hpRaf = requestAnimationFrame(function () { box.hpRaf = 0; sideWords(s, box); }); }, { passive: true }); }
        sideWords(s, box);
      });
    }
    // Scroll-Leiste (Hugo 12:21): host = Element, in dem die Leiste liegt; Lage in px relativ zu host
    var PEARL = ['rgba(150,220,245,.95)', 'rgba(195,178,250,.9)', 'rgba(248,190,215,.85)', 'rgba(250,228,180,.9)'], PEARL_SP = [.55, -.35, .8, -.6];
    // Stoff-Buckel quer zur Leiste: Licht auf dem Kamm (links der Mitte), Schatten an der rechten Flanke, leichte Falte links am Fuss
    var BUMP = 'linear-gradient(to right, rgba(255,255,255,0) 34%, rgba(255,255,255,.9) 43%, rgba(255,255,255,0) 52%),'   // Kamm im Licht
      + 'linear-gradient(to right, rgba(110,100,165,0) 50%, rgba(110,100,165,.2) 60%, rgba(110,100,165,.07) 78%, rgba(110,100,165,0) 100%),'   // Flanke rechts, Stoff zieht weit aus
      + 'linear-gradient(to right, rgba(110,100,165,0) 0%, rgba(110,100,165,.06) 20%, rgba(110,100,165,.1) 33%, rgba(110,100,165,0) 41%),';   // Stoff-Falte links am Fuss
    // Hugo 15:06: «Pille unter Seide» (Konzept 09, Test @19ad88b) verworfen – zurück zur Perlmutt-Leiste (Option 08)
    function makeSbar(host) {
      var bar = document.createElement('div'); bar.className = 'hp-sbar'; bar.setAttribute('aria-hidden', 'true');
      var th = document.createElement('i'); bar.appendChild(th); host.appendChild(bar);
      var actT = 0, last = { };
      return {
        el: bar,
        set: function (x, y, h, st, sh, ch, active) {
          var on = sh > ch + 2 && h > 40; bar.classList.toggle('is-on', on); if (!on) return;
          if (last.x !== x || last.y !== y || last.h !== h) { bar.style.left = x.toFixed(1) + 'px'; bar.style.top = y.toFixed(1) + 'px'; bar.style.height = h.toFixed(1) + 'px'; last = { x: x, y: y, h: h }; }
          var tl = Math.max(36, h * ch / sh), mx = sh - ch, p = Math.max(0, Math.min(1, st / mx));
          // Hugo 12:48: zieht man über Anfang oder Ende hinaus (Gummiband am iPhone), dampft der Griff dezent ein (höchstens 40 %,
          // weich auslaufend) und bleibt am Rand; beim Loslassen federt er mit dem Gummiband zurück in seine Grösse.
          var ov = st < 0 ? -st : (st > mx ? st - mx : 0), len = tl * (1 - 0.4 * (1 - Math.exp(-ov / 90)));
          th.style.height = (len + 16).toFixed(1) + 'px'; th.style.transform = 'translate3d(0,' + ((st > mx ? h - len : (h - tl) * p) - 8).toFixed(1) + 'px,0)';
          // Hugo 12:55: Eindampfen perfekt, ohne Nachfedern (Gummiband bringt ihn von selbst zurück)
          // Perlmutt-Wolken: vier blasse Wolken, jede wandert mit eigenem Tempo und eigener Richtung (über das Ende hinaus schneller)
          var sv = st + (st > mx ? 1 : -1) * ov * 2.4, img = '';
          for (var k = 0; k < 4; k++) {
            var yy = (((30 + k * 25 + sv * PEARL_SP[k] * 0.25) % 140) + 140) % 140 - 20;
            img += 'radial-gradient(ellipse 15% 40% at 47% ' + yy.toFixed(1) + '%, ' + PEARL[k] + ' 0%, rgba(255,255,255,0) 100%),';
          }
          // Seidenglanz: ein heller Streifen entlang des Kamms, der mit dem Scrollen wandert (Stoff gleitet über die Pille)
          var gy = ((((sv * 0.6) % 160) + 160) % 160) - 30;
          var silk = 'radial-gradient(ellipse 9% 22% at 42% ' + gy.toFixed(1) + '%, rgba(255,255,255,.95) 0%, rgba(255,255,255,0) 100%),';
          th.style.backgroundImage = silk + BUMP + img.slice(0, -1);
          if (active) { bar.classList.add('is-active'); clearTimeout(actT); actT = setTimeout(function () { bar.classList.remove('is-active'); }, 900); }
        },
        hide: function () { bar.classList.remove('is-on', 'is-active'); }
      };
    }
    // weicher Masken-Verlauf: 7 Stufen nach smoothstep zwischen a und b (px); down = von sichtbar zu unsichtbar
    function softStops(a, b, down) {
      if (b - a < 0.5) return (down ? 'transparent ' : '#000 ') + b.toFixed(1) + 'px';
      var out = [];
      for (var k = 0; k <= 6; k++) { var t = k / 6, e = t * t * (3 - 2 * t), al = down ? 1 - e : e; out.push('rgba(0,0,0,' + al.toFixed(3) + ') ' + (a + (b - a) * t).toFixed(1) + 'px'); }
      return out.join(', ');
    }
    function sideWords(s, box) {   // Hugo 13:54: nur noch ins Weiss ausblenden (Maske), keine Wort-Bewegung
      var st = box.scrollTop, H2 = box.clientHeight, rem = Math.max(0, box.scrollHeight - H2 - st);
      var fT = Math.min(Math.max(0, st), 52), fB = Math.min(rem, 52);   // 14:00: oben länger, 14:07 weicher
      var m = 'linear-gradient(to bottom, ' + (fT > 0 ? softStops(0, fT, false) : '#000 0') + ', ' + (rem > 0 ? softStops(H2 - fB, H2, true) : '#000 100%') + ')';
      if (box.style.webkitMaskImage !== m) { box.style.webkitMaskImage = m; box.style.maskImage = m; }
      if (s.sbar) s.sbar.set(box.offsetLeft - 14, box.offsetTop, box.clientHeight, st, box.scrollHeight, H2, st !== s.sbarSt); s.sbarSt = st;
    }
    var fitSidesT = 0;
    function fitSidesSoon() { clearTimeout(fitSidesT); fitSidesT = setTimeout(fitSides, 150); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSidesSoon); else fitSidesSoon();
    window.addEventListener('load', fitSidesSoon);
    window.addEventListener('resize', function () { fitTitles(); render(); fitSidesSoon(); });
    window.addEventListener('pageshow', function (e) { if (e.persisted) { render(); if (!introOn) mbShow(); } });
    fitViewport();
  }

  // Safari (Hugo 21.11. 16:05): kommt man aus einer gescrollten Seite über „zum Studio“, bleibt 100dvh manchmal
  // auf einer alten (zu kleinen) Höhe stehen, unten bleibt ein schwarzer Balken. Darum die Höhe laufend an den
  // wirklich sichtbaren Bereich binden (ein unsichtbares, festes Element über die ganze Höhe misst ihn).
  // Prüfwerte einblenden: einmal hugosophian.studio/#diag öffnen (wieder aus: #nodiag).
  function fitViewport() {
    var hp = document.querySelector('[data-hp]');
    if (!hp || !document.body) return;
    var probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:0;top:0;bottom:0;width:1px;visibility:hidden;pointer-events:none;z-index:-1';
    document.body.appendChild(probe);
    var diag = null, unit = {};
    try {
      if (location.hash === '#diag') sessionStorage.setItem('hs-diag', '1');
      if (location.hash === '#nodiag') sessionStorage.removeItem('hs-diag');
      if (sessionStorage.getItem('hs-diag')) {
        diag = document.createElement('div');
        diag.style.cssText = 'position:fixed;left:8px;top:45%;z-index:99999;background:rgba(255,0,0,.85);color:#fff;font:12px/1.35 monospace;padding:6px 8px;white-space:pre;pointer-events:none;text-transform:none';
        document.body.appendChild(diag);
        ['dvh', 'svh', 'lvh'].forEach(function (u) {
          var p = document.createElement('div');
          p.style.cssText = 'position:absolute;top:0;width:1px;visibility:hidden;height:100' + u;
          document.body.appendChild(p); unit[u] = p;
        });
      }
    } catch (e) {}
    var t0 = Date.now(), lastH = 0, nudgeT = 0;
    // Safari (Messung Hugo 16:18): Die Seite wird richtig 692 hoch, Safari zeichnet aber nur die alten 624 px
    // (Höhe mit aufgeklappter oberer Leiste), darunter bleibt es schwarz. Das korrigiert sich erst beim Scrollen,
    // und die Startseite lässt sich nicht scrollen. Darum bei jeder Höhenänderung einmal unsichtbar um 1 px
    // scrollen und gleich zurück: Safari zeichnet dann die ganze Fläche neu.
    var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    function nudge() {
      if (!touch) return;
      clearTimeout(nudgeT);
      nudgeT = setTimeout(function () {
        var de = document.documentElement, b = document.body;
        de.style.overflow = 'auto'; b.style.overflow = 'visible'; b.style.height = 'calc(100% + 2px)';
        window.scrollTo(0, 1);
        requestAnimationFrame(function () {
          window.scrollTo(0, 0);
          de.style.removeProperty('overflow'); b.style.removeProperty('overflow'); b.style.removeProperty('height');
        });
      }, 60);
    }
    function sync() {
      var h = probe.offsetHeight;
      if (h > 100 && Math.abs(hp.offsetHeight - h) > 1) {
        hp.style.height = h + 'px';
        window.dispatchEvent(new Event('resize'));
      }
      if (h > 100 && h !== lastH) { if (lastH) nudge(); lastH = h; }
      if (diag) {
        var v = window.visualViewport;
        diag.textContent = 'fix ' + h + '  hp ' + hp.offsetHeight + '\ninner ' + window.innerHeight + '  vv ' + (v ? Math.round(v.height) + '/' + Math.round(v.offsetTop) : '-') +
          '\ndvh ' + unit.dvh.offsetHeight + '  svh ' + unit.svh.offsetHeight + '  lvh ' + unit.lvh.offsetHeight +
          '\nscrY ' + window.scrollY + '  scr ' + screen.height + '  t ' + ((Date.now() - t0) / 1000).toFixed(1);
      }
    }
    sync();
    ['resize', 'orientationchange', 'pageshow', 'load', 'touchend'].forEach(function (ev) { window.addEventListener(ev, function () { sync(); setTimeout(sync, 120); }); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', sync);
    // nach dem Laden bzw. nach dem Seitenübergang (≈ 0.9 s) sicherheitshalber auch einmal
    window.addEventListener('pageshow', nudge);
    setTimeout(nudge, 400); setTimeout(nudge, 1300);
    setInterval(sync, 400);
  }

  // Stil und Seitenklasse sofort setzen (vor dem ersten Bild, auch für Seitenübergänge: schwarzer Grund)
  var styled = false;
