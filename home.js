/* ============================================================
   HOMEPAGE  ·  hugosophian.studio
   Läuft auf einer Seite mit einem Abschnitt [data-hp].
   Vorbild: marioroudil.com (Vollbild-Bilder senkrecht, Titel-Wechsel, About von der Seite).

   Aufbau im Designer (Klassen):
     section.hp [data-hp] [data-mh-manual]
       .hp-brand                 „Hugo Sophian Studio“ oben links (senkrecht, nur Designer)
       .hp-about-btn             Knopf „About“ oben rechts
       .hp-stage
         Collection List „Homepage Card“ (Sortierung: order) → .hp-slide [data-color = Feld color]
           .hp-media > img.hp-img (card image)
           .hp-title (Feld Titel)
           .hp-data (unsichtbar): .hp-d-intro (Intro), .hp-d-btn (Knopf), a.hp-d-link (Link to Page)
       .hp-intro                 Intro-Ebene: .hp-intro-panel > .hp-intro-title, .hp-intro-text,
                                 a.hp-intro-open, .hp-intro-close
       .hp-about                 About-Panel: .hp-about-panel > .hp-about-title, .hp-about-text, .hp-about-close
   Optional am Abschnitt: data-hp-links='{"kunst":"/lab-creator"}' (Name → anderer Link, zum Testen)
   Aussehen: alles an den hp-Klassen im Designer. Hier steht nur das Verhalten. Werte: CONFIG.
   ============================================================ */
(function () {
  'use strict';

  var CONFIG = {
    parallax:   0.32,   // wie weit das alte Bild nach oben mitläuft (Anteil der Bildschirmhöhe)
    imgLag:     0.45,   // das neue Bild läuft in seinem Rahmen langsamer mit (0 = fest, 1 = gleich schnell)
    oldScale:   0.06,   // das alte Bild zoomt beim Wegfahren leicht heran
    stiffness:  120,    // Feder beim Einrasten (grösser = schneller)
    damping:    0.62,   // kleiner = mehr Überschwingen (Wobble)
    flick:      0.22,   // wie stark ein schneller Wisch zählt (Sekunden Schwung)
    wheelIdle:  120,    // ms nach Mausrad/Trackpad, dann einrasten
    wheelStep:  700,    // Mausrad-Weg (px) für ein ganzes Bild
    edgeGuard:  40,     // px am Rand, in denen Safaris Zurück-Wischen gesperrt ist
    pause:      2000    // Menü-Knopf kommt nach so vielen ms Ruhe
  };

  var css = [
    'html.hp-on, html.hp-on body { height: 100%; overflow: hidden; overscroll-behavior: none; }',
    '[data-hp] { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }',
    '[data-hp] .hp-stage { overflow: hidden; }',
    '[data-hp] .hp-slide { position: absolute; inset: 0; overflow: hidden; visibility: hidden; will-change: transform; backface-visibility: hidden; }',
    '[data-hp] .hp-slide.is-vis { visibility: visible; }',
    '[data-hp] .hp-media { position: absolute; inset: 0; will-change: transform; }',
    '[data-hp] .hp-img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; -webkit-user-drag: none; }',
    '[data-hp] .hp-title { will-change: transform; pointer-events: none; }',
    '[data-hp] .hp-data { display: none !important; }',
    '[data-hp].is-mouse .hp-stage { cursor: pointer; }',
    /* Intro */
    '[data-hp] .hp-intro { visibility: hidden; opacity: 0; transition: opacity .5s ease, visibility 0s linear .5s; }',
    '[data-hp].is-intro .hp-intro { visibility: visible; opacity: 1; transition-delay: 0s; }',
    '[data-hp] .hp-intro-panel > * { opacity: 0; transform: translateY(1.2em); transition: opacity .4s ease, transform .6s cubic-bezier(.2,.7,.2,1); }',
    '[data-hp].is-intro .hp-intro-panel > * { opacity: 1; transform: none; }',
    '[data-hp].is-intro .hp-intro-panel > :nth-child(2) { transition-delay: .06s; }',
    '[data-hp].is-intro .hp-intro-panel > :nth-child(3) { transition-delay: .12s; }',
    '[data-hp].is-intro .hp-intro-panel > :nth-child(4) { transition-delay: .18s; }',
    '[data-hp] .hp-stage { transition: filter .5s ease; }',
    '[data-hp].is-intro .hp-stage { filter: blur(8px) brightness(.55); }',
    /* About: Bild schrumpft zum Streifen links, Text kommt von rechts */
    '[data-hp] .hp-about { visibility: hidden; transition: visibility 0s linear .9s; }',
    '[data-hp].is-about .hp-about { visibility: visible; transition-delay: 0s; }',
    '[data-hp] .hp-about-panel { transform: translateX(101%); transition: transform .9s cubic-bezier(.7,0,.2,1); }',
    '[data-hp].is-about .hp-about-panel { transform: none; }',
    '[data-hp] .hp-about-panel > * { opacity: 0; transition: opacity .3s ease; }',
    '[data-hp].is-about .hp-about-panel > * { opacity: 1; transition: opacity .6s ease .55s; }',
    '[data-hp] .hp-stage { clip-path: inset(0 0 0 0); transition: clip-path .9s cubic-bezier(.7,0,.2,1), filter .5s ease; }',
    '[data-hp].is-about .hp-stage { clip-path: inset(0 calc(100% - var(--hp-strip, 22vw)) 0 0); }',
    '[data-hp] .hp-about-btn, [data-hp] .hp-brand { transition: opacity .4s ease, color .6s ease; }',
    '[data-hp].is-about .hp-about-btn { opacity: 0; pointer-events: none; }',
    /* Menü-Knopf: diese Seite steuert ihn selbst (Klasse lib-mb, Werte aus dem Website-Footer) */
    'html.hp-on.mh-js .menu-toggle-wrap.mh-on.mh-on { translate: 0 var(--mh-drop); transition: opacity var(--menu-dur) var(--menu-ease-out), visibility 0s, translate var(--mh-down) var(--mh-ease-down); }',
    'html.hp-on.mh-js .menu-toggle-wrap.mh-on.mh-on.lib-mb { translate: 0 0; transition: opacity var(--menu-dur) var(--menu-ease-out), visibility 0s, translate var(--mh-up) var(--mh-ease-up); }',
    '@media (prefers-reduced-motion: reduce) { [data-hp] .hp-about-panel, [data-hp] .hp-stage { transition-duration: .01s !important; } }'
  ].join('\n');

  function init(root) {
    if (root.__hp) return;
    root.__hp = true;
    var html = document.documentElement;
    var stage = root.querySelector('.hp-stage');
    if (!stage) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var links = {};
    try { links = JSON.parse(root.getAttribute('data-hp-links') || '{}'); } catch (e) {}

    var slides = [].slice.call(root.querySelectorAll('.hp-slide')).map(function (el) {
      function q(s) { return el.querySelector(s); }
      var link = q('a.hp-d-link'), name = el.getAttribute('data-name') || '';
      var title = q('.hp-title');
      var col = el.getAttribute('data-color') || '';
      if (title && col) title.style.color = col.replace(/,\s*[\d.]+\s*\)\s*$/, ', 1)');   // CMS-Farbe ohne Transparenz
      var img = q('.hp-img');
      if (img) { img.loading = 'eager'; img.sizes = '100vw'; img.setAttribute('draggable', 'false'); }
      stage.appendChild(el);
      return {
        el: el, media: q('.hp-media'), title: title, img: img,
        name: name, label: title ? title.textContent.trim() : name,
        intro: q('.hp-d-intro') ? q('.hp-d-intro').innerHTML : '',
        btn: q('.hp-d-btn') ? q('.hp-d-btn').textContent.trim() : '',
        href: links[name] || (link ? link.getAttribute('href') : '')
      };
    });
    var n = slides.length;
    if (!n) return;

    // Titel auf volle Breite (nur mit Attribut data-hp-fit am Abschnitt): jedes Wort füllt die Breite
    var fit = root.hasAttribute('data-hp-fit');
    function fitTitles() {
      if (!fit) return;
      slides.forEach(function (s) {
        var t = s.title; if (!t) return;
        t.style.fontSize = ''; t.style.whiteSpace = 'nowrap';
        var cs = getComputedStyle(t), fs = parseFloat(cs.fontSize);
        var avail = t.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        var r = document.createRange(); r.selectNodeContents(t);
        var w = r.getBoundingClientRect().width;
        if (w > 0 && avail > 0) t.style.fontSize = (fs * avail / w).toFixed(2) + 'px';
      });
    }
    fitTitles();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitles);

    var F = 0, V = 0, T = 0, H = 1, mode = 'idle', raf = 0, last = 0;
    function wrap(x) { return ((x % n) + n) % n; }
    function rel(j) { var d = wrap(j - F); return d > n / 2 ? d - n : d; }

    // ---------- Zeichnen ----------
    function render() {
      H = stage.clientHeight || window.innerHeight;
      for (var j = 0; j < n; j++) {
        var s = slides[j], r = rel(j), y, my, sc = 1, z, vis;
        if (r > 0 && r < 1) {                 // kommt von unten herein, liegt oben
          y = r * H; my = -y * (1 - CONFIG.imgLag); z = 3; vis = true;
        } else if (r <= 0 && r > -1) {        // aktuelles Bild, läuft langsam nach oben weg
          y = r * H * CONFIG.parallax; my = 0; sc = 1 - r * CONFIG.oldScale; z = 2; vis = true;
        } else { vis = false; }
        if (!vis) { if (s.vis) { s.el.classList.remove('is-vis'); s.vis = false; } continue; }
        s.el.style.zIndex = z;
        s.el.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)';
        if (s.media) s.media.style.transform = 'translate3d(0,' + my.toFixed(2) + 'px,0) scale(' + sc.toFixed(4) + ')';
        if (s.title) s.title.style.transform = 'translate3d(0,' + (-y).toFixed(2) + 'px,0)';   // Titel bleibt am Platz
        if (!s.vis) { s.el.classList.add('is-vis'); s.vis = true; }
      }
    }
    function current() { return wrap(Math.round(F)); }

    // ---------- Feder ----------
    function step(now) {
      raf = 0;
      var dt = last ? Math.min(0.034, (now - last) / 1000) : 0.016;
      last = now;
      if (mode === 'spring') {
        var k = CONFIG.stiffness, c = 2 * Math.sqrt(k) * CONFIG.damping;
        V += (k * (T - F) - c * V) * dt;
        F += V * dt;
        if (Math.abs(T - F) < 0.0005 && Math.abs(V) < 0.005) { F = T; V = 0; mode = 'idle'; }
      }
      render();
      if (mode === 'spring' || mode === 'drag') kick(); else last = 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(step); }
    function goTo(t) { T = t; mode = 'spring'; kick(); }

    // ---------- Menü-Knopf ----------
    var mbTimer = 0, mbPending = false, held = false;
    function mbWrap() { return document.querySelector('.menu-toggle-wrap'); }
    function mbShow() { clearTimeout(mbTimer); mbPending = false; var w = mbWrap(); if (w) w.classList.add('lib-mb'); }
    function mbHide() { clearTimeout(mbTimer); var w = mbWrap(); if (w) w.classList.remove('lib-mb'); }
    function mbWait() { clearTimeout(mbTimer); mbPending = true; if (!held) mbTimer = setTimeout(mbShow, CONFIG.pause); }
    function activity() { if (busy()) return; mbHide(); mbWait(); }
    window.addEventListener('pointerdown', function () { held = true; clearTimeout(mbTimer); }, true);
    window.addEventListener('pointerup', function () { held = false; if (mbPending) mbWait(); }, true);
    window.addEventListener('pointercancel', function () { held = false; if (mbPending) mbWait(); }, true);
    window.addEventListener('keydown', function (e) { if (e.key === 'Tab') mbShow(); });

    function busy() { return root.classList.contains('is-intro') || root.classList.contains('is-about'); }

    // ---------- Finger und Maus (senkrecht) ----------
    var down = null, moved = false, samples = [];
    root.addEventListener('pointerdown', function (e) {
      if (busy() || e.target.closest('.hp-about-btn, a, button, [role="button"]')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY, f0: F, id: e.pointerId };
      moved = false; samples = [{ t: performance.now(), y: e.clientY }];
    });
    window.addEventListener('pointermove', function (e) {
      if (!down || e.pointerId !== down.id) return;
      var dy = e.clientY - down.y;
      if (!moved) {
        if (Math.abs(dy) < 6 && Math.abs(e.clientX - down.x) < 6) return;
        moved = true; mode = 'drag'; down.y = e.clientY; down.f0 = F; dy = 0;
        root.classList.add('is-dragging'); activity();
      }
      var now = performance.now();
      samples.push({ t: now, y: e.clientY });
      while (samples.length > 2 && now - samples[0].t > 90) samples.shift();
      var nf = down.f0 - dy / H;
      // höchstens ein Bild pro Wisch
      nf = Math.max(Math.round(down.f0) - 1, Math.min(Math.round(down.f0) + 1, nf));
      F = nf; kick();
    });
    function release(e, cancel) {
      if (!down || (e && e.pointerId !== down.id)) return;
      root.classList.remove('is-dragging');
      if (moved || cancel) {
        var s0 = samples[0], s1 = samples[samples.length - 1];
        var vy = s1.t > s0.t ? (s1.y - s0.y) / ((s1.t - s0.t) / 1000) : 0;
        if (performance.now() - s1.t > 80) vy = 0;
        V = -vy / H;
        var base = Math.round(down.f0), proj = F + V * CONFIG.flick;
        var t = proj - base > 0.25 ? base + 1 : proj - base < -0.25 ? base - 1 : base;
        goTo(t); activity();
      } else {
        openIntro();
      }
      down = null;
    }
    window.addEventListener('pointerup', function (e) { release(e, false); });
    window.addEventListener('pointercancel', function (e) { release(e, true); });
    root.addEventListener('dragstart', function (e) { e.preventDefault(); });
    root.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1 || busy()) return;
      if (e.target.closest('a, button, [role="button"], .hp-about-btn')) return;
      var x = e.touches[0].clientX;
      if (x < CONFIG.edgeGuard || x > window.innerWidth - CONFIG.edgeGuard) e.preventDefault();
    }, { passive: false });

    // Mausrad und Trackpad: ein Bild pro Geste
    var wheelT = 0, wheelBase = null;
    root.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (busy()) return;
      var d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (e.deltaMode === 1) d *= 32;
      if (!d) return;
      if (wheelBase === null) wheelBase = Math.round(F);
      mode = 'drag';
      F = Math.max(wheelBase - 1, Math.min(wheelBase + 1, F + d / CONFIG.wheelStep));
      kick(); activity();
      clearTimeout(wheelT);
      wheelT = setTimeout(function () {
        var t = F - wheelBase > 0.15 ? wheelBase + 1 : F - wheelBase < -0.15 ? wheelBase - 1 : wheelBase;
        V = 0; wheelBase = null; goTo(t);
      }, CONFIG.wheelIdle);
    }, { passive: false });

    // Tastatur
    document.addEventListener('keydown', function (e) {
      if (html.classList.contains('menu-open')) return;
      if (e.key === 'Escape') { if (root.classList.contains('is-intro')) closeIntro(); else if (root.classList.contains('is-about')) closeAbout(); return; }
      if (busy()) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goTo(Math.round(T === F ? F : T) + 1); activity(); }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goTo(Math.round(T === F ? F : T) - 1); activity(); }
      else if (e.key === 'Enter' && document.activeElement === document.body) openIntro();
    });

    // ---------- Intro ----------
    var intro = root.querySelector('.hp-intro');
    var inTitle = intro && intro.querySelector('.hp-intro-title');
    var inText = intro && intro.querySelector('.hp-intro-text');
    var inOpen = intro && intro.querySelector('.hp-intro-open');
    var inClose = intro && intro.querySelector('.hp-intro-close');
    var openedAt = 0;
    function setDialog(el, on) { if (!el) return; el.setAttribute('aria-hidden', on ? 'false' : 'true'); if ('inert' in el) el.inert = !on; }
    if (intro) { intro.setAttribute('role', 'dialog'); intro.setAttribute('aria-modal', 'true'); setDialog(intro, false); }
    function openIntro() {
      if (!intro || mode === 'spring' && Math.abs(T - F) > 0.02) return;
      var s = slides[current()];
      if (inTitle) inTitle.textContent = s.label;
      if (inText) inText.innerHTML = s.intro;
      if (inOpen) { inOpen.setAttribute('href', s.href || '#'); if (s.btn) inOpen.textContent = s.btn; }
      root.classList.add('is-intro'); setDialog(intro, true); openedAt = performance.now();
      mbShow();
      if (s.href) { var l = document.createElement('link'); l.rel = 'prefetch'; l.href = s.href; document.head.appendChild(l); }
      if (inClose) setTimeout(function () { inClose.focus({ preventScroll: true }); }, 400);
    }
    function closeIntro() { root.classList.remove('is-intro'); setDialog(intro, false); activity(); }
    if (intro) intro.addEventListener('click', function (e) {
      if (performance.now() - openedAt < 450) return;
      if (e.target.closest('.hp-intro-close') || !e.target.closest('.hp-intro-panel')) { e.preventDefault(); closeIntro(); }
    });

    // ---------- About ----------
    var aboutBtn = root.querySelector('.hp-about-btn');
    var about = root.querySelector('.hp-about');
    var aboutClose = about && about.querySelector('.hp-about-close');
    if (about) { about.setAttribute('role', 'dialog'); setDialog(about, false); }
    function openAbout() { if (!about) return; closeIntro(); root.classList.add('is-about'); setDialog(about, true); mbShow(); }
    function closeAbout() { root.classList.remove('is-about'); setDialog(about, false); activity(); }
    [aboutBtn, aboutClose].forEach(function (b) {
      if (!b) return;
      b.setAttribute('role', 'button'); b.setAttribute('tabindex', '0');
      function act(e) { e.preventDefault(); if (b === aboutBtn) openAbout(); else closeAbout(); }
      b.addEventListener('click', act);
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') act(e); });
    });
    if (inClose) { inClose.setAttribute('role', 'button'); inClose.setAttribute('tabindex', '0'); inClose.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeIntro(); } }); }

    // ---------- Start ----------
    root.classList.toggle('is-mouse', window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    // erstes Bild zuerst laden, die anderen danach
    slides.forEach(function (s, i) { if (s.img && i === 0) s.img.setAttribute('fetchpriority', 'high'); });
    render();
    root.classList.add('is-ready');
    mbWait();
    window.addEventListener('resize', function () { fitTitles(); render(); });
    window.addEventListener('pageshow', function (e) { if (e.persisted) { render(); if (!busy()) mbWait(); } });
  }

  function boot() {
    var roots = document.querySelectorAll('[data-hp]');
    if (!roots.length) return;
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
    document.documentElement.classList.add('hp-on');
    [].forEach.call(roots, init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
