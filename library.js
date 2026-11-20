/* ============================================================
   PROJEKT-LIBRARY  ·  hugosophian.studio
   Läuft auf jeder Seite mit einem Abschnitt [data-lib] (Creator, Singer, Model).
   Vorbild: crl-2026.webflow.io/library (Ansicht „Wheel“). Ohne Bibliothek, ohne WebGL.

   Aufbau im Designer (Klassen):
     section.lib [data-lib] [data-lib-folder="/creator-projects/"] [data-mh-manual]
       .lib-top                 .lib-sort (Knopf: .lib-sort-label + .lib-sort-arrow)
                                .lib-sort-list (Collection List „Kategorien“ → .lib-sort-item)
       .lib-meta                .lib-name (links) und .lib-year (rechts), füllt der Code
       .lib-stage               Die Mitte dieses Felds ist die Mitte des vorderen Bilds
         Collection List „Creator Projects“ → .lib-item
           a.lib-card (Link: Projektseite) > img.lib-img (Titelbild; Höhe an .lib-img, Breite auto)
           .lib-data (unsichtbar): .lib-d-name, .lib-d-year, .lib-d-text, .lib-d-cat (je Kategorie)
       .lib-bottom              .ps-bar (.ps-label, .ps-index) und .ps-progress > .ps-progress-fill
       .lib-pv                  Vorschau: .lib-pv-panel > .lib-pv-media, .lib-pv-name, .lib-pv-year,
                                .lib-pv-text, a.lib-pv-open, .lib-pv-close
   Aussehen (Grössen, Schrift, Farben, Abstände): alles an den lib-Klassen im Designer.
   Hier steht nur das Verhalten. Werte zum Anpassen: CONFIG.
   ============================================================ */
(function () {
  'use strict';

  var CONFIG = {
    // Rad (Werte in vw; Desktop / Handy bis 767 px)
    gap:        { desktop: 14, mobile: 18 },   // Abstand zwischen den Bildern
    radius:     { desktop: 96, mobile: 200 },  // Radius des Rads (grösser = flacher)
    // Bewegung
    stiffness:  170,    // Feder beim Einrasten (grösser = schneller)
    damping:    0.8,    // 1 = ohne Überschwingen, kleiner = mehr Nachfedern
    flick:      0.16,   // wie weit ein schneller Wisch nachläuft (Sekunden Schwung)
    maxSkip:    3,      // höchstens so viele Projekte pro Wisch
    edge:       0.35,   // Widerstand über den Anfang / das Ende hinaus
    wheelIdle:  140,    // ms nach Trackpad/Mausrad, dann einrasten
    // Kippen beim Bewegen (Wobble)
    tilt:       0.0045, // Grad pro px/s
    tiltMax:    7,      // höchstens so viele Grad
    tiltStiff:  300,    // Feder des Kippens
    tiltDamp:   0.3,    // kleiner = wackelt länger nach
    // Eintritt: Bilder kommen zusammen
    introDelay: 250,    // ms schwarz, bevor die Bilder kommen
    introMs:    1700,   // Dauer
    introSpin:  0.9,    // wie viel vom Rad vorbeiläuft (1 = alle Bilder)
    dim:        0.0009, // wie stark schnelle Bilder beim Eintritt abdunkeln
    // Vorschau
    pvMs:       650     // Flug des Bilds in die Vorschau (gleich lang wie das Panel)
  };

  var EASE = 'cubic-bezier(.7,0,.2,1)';
  var css = [
    'html.lib-on, html.lib-on body { height: 100%; overflow: hidden; overscroll-behavior: none; background-color: #000; }',
    '[data-lib] { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }',
    '[data-lib] .lib-wheel { position: absolute; inset: 0; }',
    '[data-lib] .lib-item { position: absolute; left: 0; top: 0; visibility: hidden; will-change: transform; backface-visibility: hidden; }',
    '[data-lib] .lib-item.is-vis { visibility: visible; }',
    '[data-lib] .lib-card, [data-lib] .lib-img { -webkit-user-drag: none; }',
    '[data-lib] .lib-img { pointer-events: none; }',
    '[data-lib] .lib-data { display: none !important; }',
    '[data-lib].is-mouse .lib-stage { cursor: grab; }',
    '[data-lib].is-mouse.is-dragging .lib-stage { cursor: grabbing; }',
    /* Name und Jahr: kurz ausblenden beim Wechsel */
    '[data-lib] .lib-name, [data-lib] .lib-year { transition: opacity .25s ease, transform .25s ease; }',
    '[data-lib] .lib-meta.is-swap .lib-name, [data-lib] .lib-meta.is-swap .lib-year { opacity: 0; transform: translateY(-.15em); transition-duration: .14s; }',
    /* Beim Laden: Texte und Leisten erst nach dem Eintritt */
    '[data-lib] .lib-meta, [data-lib] .lib-top, [data-lib] .lib-bottom { transition: opacity .6s ease; }',
    '[data-lib]:not(.is-in) .lib-meta, [data-lib]:not(.is-in) .lib-top, [data-lib]:not(.is-in) .lib-bottom { opacity: 0; }',
    '[data-lib] .ps-progress-fill { transition: none; }',
    /* Sortierung */
    '[data-lib] .lib-sort { cursor: pointer; }',
    '[data-lib] .lib-sort-arrow { display: inline-block; transition: transform .45s cubic-bezier(.3,1.6,.55,1); }',
    '[data-lib] .lib-top.is-open .lib-sort-arrow { transform: rotate(180deg); }',
    '[data-lib] .lib-sort-list { opacity: 0; visibility: hidden; filter: blur(6px); transform: translateY(-.4em); transition: opacity .3s ease, filter .3s ease, transform .3s ease, visibility 0s linear .3s; }',
    '[data-lib] .lib-top.is-open .lib-sort-list { opacity: 1; visibility: visible; filter: none; transform: none; transition-delay: 0s; }',
    '[data-lib] .lib-sort-item { cursor: pointer; }',
    '[data-lib] .lib-top.is-open ~ .lib-meta { opacity: 0; }',
    '[data-lib] .lib-sort-item.is-empty { display: none; }',
    /* Vorschau */
    '[data-lib] .lib-pv { visibility: hidden; transition: visibility 0s linear .65s; }',
    '[data-lib].is-pv .lib-pv { visibility: visible; transition-delay: 0s; }',
    '[data-lib] .lib-pv-panel { transform: translateY(-101%); transition: transform .65s ' + EASE + '; }',
    '[data-lib].is-pv .lib-pv-panel { transform: none; }',
    '[data-lib] .lib-pv-name, [data-lib] .lib-pv-year, [data-lib] .lib-pv-text, [data-lib] .lib-pv-open, [data-lib] .lib-pv-close { opacity: 0; transition: opacity .25s ease; }',
    '[data-lib].is-pv-in .lib-pv-name, [data-lib].is-pv-in .lib-pv-year, [data-lib].is-pv-in .lib-pv-text, [data-lib].is-pv-in .lib-pv-open, [data-lib].is-pv-in .lib-pv-close { opacity: 1; transition: opacity .5s ease; }',
    '[data-lib] .lib-pv-media img { display: block; height: 100%; width: auto; max-width: 100%; object-fit: contain; object-position: left top; }',
    '[data-lib] .lib-wheel { transition: opacity .65s ease, filter .65s ease; }',
    '[data-lib].is-pv .lib-wheel { opacity: .3; filter: blur(8px); }',
    '.lib-fly { position: fixed; left: 0; top: 0; z-index: 60; pointer-events: none; transform-origin: 0 0; will-change: transform; overflow: hidden; }',
    '.lib-fly img { display: block; width: 100%; height: 100%; object-fit: cover; }',
    /* Menü-Knopf: auf der Library steuert dieser Code ihn (Klasse lib-mb), nicht das Scrollen.
       Tempo und Kurven kommen aus dem Website-Footer (--mh-up, --mh-down, --mh-ease-up, --mh-ease-down). */
    'html.lib-on.mh-js .menu-toggle-wrap.mh-on.mh-on { translate: 0 var(--mh-drop); transition: opacity var(--menu-dur) var(--menu-ease-out), visibility 0s, translate var(--mh-down) var(--mh-ease-down); }',
    'html.lib-on.mh-js .menu-toggle-wrap.mh-on.mh-on.lib-mb { translate: 0 0; transition: opacity var(--menu-dur) var(--menu-ease-out), visibility 0s, translate var(--mh-up) var(--mh-ease-up); }',
    '@media (prefers-reduced-motion: reduce) { [data-lib] .lib-pv-panel, [data-lib] .lib-wheel { transition-duration: .01s; } }'
  ].join('\n');

  function init(root) {
    if (root.__lib) return;
    root.__lib = true;

    var html = document.documentElement;
    var stage = root.querySelector('.lib-stage');
    if (!stage) return;
    var meta = root.querySelector('.lib-meta');
    var nameEl = root.querySelector('.lib-name');
    var yearEl = root.querySelector('.lib-year');
    var idxSpans = root.querySelectorAll('.ps-index span');   // Zähler: „01 / 12“ (drei span)
    var curEl = root.querySelector('.ps-current') || idxSpans[0];
    var totEl = root.querySelector('.ps-total') || idxSpans[2];
    var fill = root.querySelector('.ps-progress-fill');
    var top = root.querySelector('.lib-top');
    var sortBtn = root.querySelector('.lib-sort');
    var sortLabel = root.querySelector('.lib-sort-label');
    var pv = root.querySelector('.lib-pv');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Alle Bilder kommen in eine eigene Ebene (für die Unschärfe bei offener Vorschau)
    if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
    var wheel = document.createElement('div');
    wheel.className = 'lib-wheel';
    stage.appendChild(wheel);

    // Projekte einlesen. Nur Projekte aus dem eigenen Ordner (z. B. /creator-projects/).
    var folder = root.getAttribute('data-lib-folder') || '';
    var all = [].slice.call(root.querySelectorAll('.lib-item')).map(function (el) {
      var a = el.querySelector('a.lib-card') || el.querySelector('a');
      var img = el.querySelector('img.lib-img') || el.querySelector('img');
      var href = a ? a.getAttribute('href') || '' : '';
      var path = '';
      try { path = new URL(href, location.href).pathname; } catch (e) {}
      function txt(sel) { var n = el.querySelector(sel); return n ? n.textContent.trim() : ''; }
      var textEl = el.querySelector('.lib-d-text');
      return {
        el: el, a: a, img: img, href: href, path: path,
        name: txt('.lib-d-name') || (img && img.alt) || '',
        year: txt('.lib-d-year'),
        html: textEl ? textEl.innerHTML : '',
        cats: [].slice.call(el.querySelectorAll('.lib-d-cat')).map(function (c) { return c.textContent.trim(); }),
        w: 0, h: 0, c: 0, vis: false
      };
    }).filter(function (it) {
      var ok = it.img && (!folder || it.path.indexOf(folder) === 0);
      if (!ok) it.el.style.display = 'none';
      return ok;
    });
    all.forEach(function (it) {
      wheel.appendChild(it.el);
      if (it.a) it.a.setAttribute('draggable', 'false');
      if (it.img) { it.img.setAttribute('draggable', 'false'); if (it.img.loading === 'lazy') it.img.loading = 'eager'; }
    });

    var items = all.slice();     // aktuelle Auswahl (Sortierung)
    var P = 0, V = 0, T = 0;     // Position auf dem Rad (px), Tempo (px/s), Ziel
    var tilt = 0, tiltV = 0;
    var mode = 'idle';           // idle | drag | spring | intro | pv
    var idx = 0, shownIdx = -1;
    var R = 1, gap = 1, cx = 0, cy = 0;
    var raf = 0, last = 0, intro = null;

    // ---------- Masse ----------
    function measure() {
      var vw = window.innerWidth / 100, mobile = window.innerWidth < 768;
      R = (mobile ? CONFIG.radius.mobile : CONFIG.radius.desktop) * vw;
      gap = (mobile ? CONFIG.gap.mobile : CONFIG.gap.desktop) * vw;
      cx = stage.clientWidth / 2;
      cy = stage.clientHeight / 2;
      var acc = 0;
      items.forEach(function (it, i) {
        var h = it.img.offsetHeight, w = it.img.offsetWidth;
        if ((!w || w < 2) && h) w = it.img.naturalWidth ? h * it.img.naturalWidth / it.img.naturalHeight : h * 0.8;
        it.w = Math.max(it.el.offsetWidth, w); it.h = Math.max(it.el.offsetHeight, h);
        if (i > 0) acc += items[i - 1].w / 2 + gap + it.w / 2;
        it.c = acc;
      });
    }
    function minP() { return items.length ? items[0].c : 0; }
    function maxP() { return items.length ? items[items.length - 1].c : 0; }
    function nearest(p) {
      var best = 0, bd = Infinity;
      for (var i = 0; i < items.length; i++) { var d = Math.abs(items[i].c - p); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    function clampIdx(i) { return Math.max(0, Math.min(items.length - 1, i)); }

    // ---------- Zeichnen ----------
    function render() {
      var dimA = mode === 'intro' ? Math.min(0.75, Math.abs(V) * CONFIG.dim) : 0;
      var reach = cx * 1.4 + 100;
      for (var i = 0; i < items.length; i++) {
        var it = items[i], d = it.c - P, th = d / R;
        if (Math.abs(d) > reach + it.w || Math.abs(th) > 1.3) {
          if (it.vis) { it.el.classList.remove('is-vis'); it.vis = false; }
          continue;
        }
        var x = R * Math.sin(th), y = R * (1 - Math.cos(th));
        var rot = th * 57.29578 + tilt;
        it.el.style.transform = 'translate3d(' + (cx + x - it.w / 2).toFixed(2) + 'px,' + (cy + y - it.h / 2).toFixed(2) + 'px,0) rotate(' + rot.toFixed(3) + 'deg)';
        it.el.style.opacity = dimA ? (1 - dimA).toFixed(3) : '';
        if (!it.vis) { it.el.classList.add('is-vis'); it.vis = true; }
      }
      idx = nearest(P);
      if (idx !== shownIdx && mode !== 'intro') showMeta(idx);
      if (fill) {
        var span = maxP() - minP();
        fill.style.width = (span > 0 ? Math.max(0, Math.min(1, (P - minP()) / span)) * 100 : 100).toFixed(2) + '%';
      }
    }

    var swapT = 0;
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function showMeta(i, instant) {
      shownIdx = i;
      var it = items[i];
      if (curEl) curEl.textContent = pad(items.length ? i + 1 : 0);
      if (totEl) totEl.textContent = pad(items.length);
      if (!meta || !it) return;
      clearTimeout(swapT);
      function set() {
        if (nameEl) nameEl.textContent = it.name;
        if (yearEl) yearEl.textContent = it.year;
        meta.classList.remove('is-swap');
      }
      if (instant) { set(); return; }
      meta.classList.add('is-swap');
      swapT = setTimeout(set, 140);
    }

    // ---------- Physik (Feder) ----------
    function step(now) {
      raf = 0;
      var dt = last ? Math.min(0.034, (now - last) / 1000) : 0.016;
      last = now;
      if (mode === 'spring') {
        var k = CONFIG.stiffness, c = 2 * Math.sqrt(k) * CONFIG.damping;
        V += (k * (T - P) - c * V) * dt;
        P += V * dt;
        if (Math.abs(T - P) < 0.3 && Math.abs(V) < 5) { P = T; V = 0; mode = 'idle'; }
      } else if (mode === 'intro' && intro) {
        var t = Math.max(0, Math.min(1, (now - intro.t0) / intro.ms));
        var np = intro.from + (intro.to - intro.from) * (1 - Math.pow(1 - t, 4));   // easeOutQuart
        V = (np - P) / dt; P = np;
        if (t >= 1) { mode = 'idle'; V = 0; var done = intro.done; intro = null; if (done) done(); }
      } else if (mode === 'idle' || mode === 'pv') {
        V = 0;
      }
      // Kippen folgt dem Tempo und federt nach (Wobble)
      var target = mode === 'intro' ? 0 : Math.max(-CONFIG.tiltMax, Math.min(CONFIG.tiltMax, -V * CONFIG.tilt));
      var tk = CONFIG.tiltStiff, tc = 2 * Math.sqrt(tk) * CONFIG.tiltDamp;
      tiltV += (tk * (target - tilt) - tc * tiltV) * dt;
      tilt += tiltV * dt;
      render();
      var busy = mode === 'spring' || mode === 'intro' || mode === 'drag';
      if (busy || Math.abs(tilt) > 0.02 || Math.abs(tiltV) > 0.1) kick();
      else { tilt = 0; tiltV = 0; last = 0; render(); }
    }
    function kick() { if (!raf) raf = requestAnimationFrame(step); }
    function springTo(i) {
      if (!items.length) return;
      T = items[clampIdx(i)].c;
      mode = 'spring'; kick();
    }

    // ---------- Menü-Knopf ----------
    // Beim Laden versteckt. Beim Wischen weg, nach PAUSE ohne Wischen kommt er hoch
    // (nicht solange ein Finger auf dem Display liegt). Bei offener Vorschau bleibt er.
    var PAUSE = 2000, mbTimer = 0, mbPending = false, held = false;
    function mbWrap() { return document.querySelector('.menu-toggle-wrap'); }
    function mbShow() { clearTimeout(mbTimer); mbPending = false; var w = mbWrap(); if (w) w.classList.add('lib-mb'); }
    function mbHide() { clearTimeout(mbTimer); var w = mbWrap(); if (w) w.classList.remove('lib-mb'); }
    function mbWait() { clearTimeout(mbTimer); mbPending = true; if (!held) mbTimer = setTimeout(mbShow, PAUSE); }
    function activity() { if (root.classList.contains('is-pv')) return; mbHide(); mbWait(); }
    window.addEventListener('pointerdown', function () { held = true; clearTimeout(mbTimer); }, true);
    window.addEventListener('pointerup', function () { held = false; if (mbPending) mbWait(); }, true);
    window.addEventListener('pointercancel', function () { held = false; if (mbPending) mbWait(); }, true);
    window.addEventListener('keydown', function (e) { if (e.key === 'Tab') mbShow(); });   // Tastatur: Knopf muss erreichbar sein

    // ---------- Finger und Maus ----------
    var down = null, moved = false, startIdx = 0, samples = [];
    function edgeClamp(p) {
      var lo = minP(), hi = maxP();
      if (p < lo) return lo - (lo - p) * CONFIG.edge;
      if (p > hi) return hi + (p - hi) * CONFIG.edge;
      return p;
    }
    root.addEventListener('pointerdown', function (e) {
      if (mode === 'intro' || root.classList.contains('is-pv')) return;
      if (e.target.closest('.lib-top, .lib-pv')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY, p0: P, id: e.pointerId };
      moved = false; startIdx = idx;
      samples = [{ t: performance.now(), x: e.clientX }];
      if (mode === 'spring') { mode = 'drag'; down.p0 = P; }
    });
    window.addEventListener('pointermove', function (e) {
      if (!down || e.pointerId !== down.id) return;
      var dx = e.clientX - down.x;
      if (!moved) {
        if (Math.abs(dx) < 6 && Math.abs(e.clientY - down.y) < 6) return;
        moved = true; mode = 'drag';
        down.x = e.clientX; down.p0 = P; dx = 0;   // ohne Sprung beim Start
        root.classList.add('is-dragging');
        activity();
      }
      var now = performance.now();
      samples.push({ t: now, x: e.clientX });
      while (samples.length > 2 && now - samples[0].t > 90) samples.shift();
      var np = edgeClamp(down.p0 - dx);
      var dtm = Math.max(8, now - (down.lt || now - 16)) / 1000;
      V = (np - P) / dtm; down.lt = now;
      P = np; kick();
    });
    function release(e, cancelled) {
      if (!down || (e && e.pointerId !== down.id)) return;
      root.classList.remove('is-dragging');
      if (moved || cancelled) {
        var s0 = samples[0], s1 = samples[samples.length - 1];
        var vx = s1 && s0 && s1.t > s0.t ? (s1.x - s0.x) / ((s1.t - s0.t) / 1000) : 0;
        if (performance.now() - s1.t > 80) vx = 0;    // Finger stand still vor dem Loslassen
        V = -vx;
        var i = nearest(P + V * CONFIG.flick);
        springTo(Math.max(startIdx - CONFIG.maxSkip, Math.min(startIdx + CONFIG.maxSkip, i)));
        activity();
      } else {
        tap(down.x, down.y);
      }
      down = null;
    }
    window.addEventListener('pointerup', function (e) { release(e, false); });
    window.addEventListener('pointercancel', function (e) { release(e, true); });
    root.addEventListener('dragstart', function (e) { e.preventDefault(); });
    // Ein Klick auf ein Bild öffnet nie direkt die Seite, sondern die Vorschau
    root.addEventListener('click', function (e) {
      var a = e.target.closest('a.lib-card');
      if (!a) return;
      e.preventDefault();
      if (e.detail === 0) {   // Tastatur (Enter)
        var i = items.findIndex(function (it) { return it.a === a; });
        if (i > -1) { springTo(i); openPreview(i); }
      }
    });
    function tap(x, y) {
      var el = document.elementFromPoint(x, y);
      var item = el && el.closest('.lib-item');
      if (!item) return;
      var i = items.findIndex(function (it) { return it.el === item; });
      if (i < 0) return;
      if (i === idx) { if (Math.abs(items[i].c - P) > 2) springTo(i); openPreview(i); }
      else { springTo(i); activity(); }
    }

    // Trackpad und Mausrad (seitlich und senkrecht)
    var wheelT = 0;
    root.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (mode === 'intro' || root.classList.contains('is-pv')) return;
      if (e.target.closest('.lib-sort-list')) return;
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (e.deltaMode === 1) d *= 32;
      if (!d) return;
      var np = edgeClamp(P + d);
      V = (np - P) * 60; P = np;
      mode = 'drag'; kick();
      activity();
      clearTimeout(wheelT);
      wheelT = setTimeout(function () { if (mode === 'drag') springTo(nearest(P)); }, CONFIG.wheelIdle);
    }, { passive: false });

    // Tastatur
    document.addEventListener('keydown', function (e) {
      if (html.classList.contains('menu-open')) return;
      if (root.classList.contains('is-pv')) { if (e.key === 'Escape') { e.preventDefault(); closePreview(); } return; }
      if (top && top.classList.contains('is-open') && e.key === 'Escape') { setOpen(false); return; }
      if (mode === 'intro') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); springTo(idx + 1); activity(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); springTo(idx - 1); activity(); }
    });

    // ---------- Eintritt: Bilder kommen zusammen ----------
    function runIntro(done) {
      measure();
      if (reduce || !items.length) { P = T = minP(); V = 0; mode = 'idle'; render(); if (done) done(); return; }
      var span = Math.max(window.innerWidth * 1.6, (maxP() - minP()) * CONFIG.introSpin + window.innerWidth);
      P = minP() + span; V = 0; mode = 'intro';
      render();
      intro = { from: P, to: minP(), t0: performance.now() + CONFIG.introDelay, ms: CONFIG.introMs, done: done };
      last = 0; kick();
    }

    // ---------- Sortierung ----------
    var sortItems = [].slice.call(root.querySelectorAll('.lib-sort-item'));
    var allLabel = sortLabel ? sortLabel.textContent.trim() : 'Alle Projekte';
    var current = '';
    var used = {};
    all.forEach(function (it) { it.cats.forEach(function (c) { used[c] = true; }); });
    if (sortItems.length && Object.keys(used).length) {
      sortItems.forEach(function (s) { if (!used[s.textContent.trim()]) s.classList.add('is-empty'); });
      var allItem = sortItems[0].cloneNode(true);
      allItem.textContent = allLabel;
      allItem.setAttribute('data-all', '');
      sortItems[0].parentNode.insertBefore(allItem, sortItems[0]);
      sortItems.unshift(allItem);
    } else if (top) {
      top.style.display = 'none';         // keine Kategorien in diesem Bereich: Sortierung weg
    }
    function setOpen(on) {
      if (!top) return;
      top.classList.toggle('is-open', on);
      if (sortBtn) sortBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
    }
    if (sortBtn) {
      sortBtn.setAttribute('role', 'button'); sortBtn.setAttribute('tabindex', '0'); sortBtn.setAttribute('aria-expanded', 'false');
      sortBtn.addEventListener('click', function (e) { e.preventDefault(); setOpen(!top.classList.contains('is-open')); });
      sortBtn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!top.classList.contains('is-open')); } });
    }
    document.addEventListener('pointerdown', function (e) {
      if (top && top.classList.contains('is-open') && !e.target.closest('.lib-top')) setOpen(false);
    }, true);
    sortItems.forEach(function (s) {
      s.setAttribute('role', 'button'); s.setAttribute('tabindex', '0');
      s.classList.toggle('is-active', s.hasAttribute('data-all'));
      function pick(e) {
        e.preventDefault();
        var cat = s.hasAttribute('data-all') ? '' : s.textContent.trim();
        setOpen(false);
        sortItems.forEach(function (o) { o.classList.toggle('is-active', o === s); });
        if (sortLabel) sortLabel.textContent = cat || allLabel;
        if (cat === current) return;
        current = cat;
        applyFilter();
      }
      s.addEventListener('click', pick);
      s.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') pick(e); });
    });
    function applyFilter() {
      items.forEach(function (it) { it.el.classList.remove('is-vis'); it.vis = false; });
      items = all.filter(function (it) { return !current || it.cats.indexOf(current) > -1; });
      all.forEach(function (it) { it.el.style.display = items.indexOf(it) > -1 ? '' : 'none'; });
      shownIdx = -1;
      if (meta) meta.classList.add('is-swap');
      runIntro(function () { showMeta(nearest(P)); });
      activity();
    }

    // ---------- Vorschau ----------
    var pvPanel = pv && pv.querySelector('.lib-pv-panel');
    var pvMedia = pv && pv.querySelector('.lib-pv-media');
    var pvName = pv && pv.querySelector('.lib-pv-name');
    var pvYear = pv && pv.querySelector('.lib-pv-year');
    var pvText = pv && pv.querySelector('.lib-pv-text');
    var pvOpen = pv && pv.querySelector('.lib-pv-open');
    var pvClose = pv && pv.querySelector('.lib-pv-close');
    var pvItem = null, lastFocus = null, pvTimer = 0, pvAt = 0;
    if (pv) { pv.setAttribute('role', 'dialog'); pv.setAttribute('aria-modal', 'true'); pv.setAttribute('aria-hidden', 'true'); if ('inert' in pv) pv.inert = true; }

    function cloneImg(img) {
      var c = document.createElement('img');
      if (img.srcset) { c.srcset = img.srcset; c.sizes = img.sizes || '100vw'; }
      c.src = img.currentSrc || img.src;
      c.alt = img.alt || '';
      return c;
    }
    // Ein Bild fliegt von Rechteck a nach Rechteck b
    function fly(img, a, b, ms, done) {
      var f = document.createElement('div');
      f.className = 'lib-fly';
      f.style.width = b.width + 'px'; f.style.height = b.height + 'px';
      var c = document.createElement('img');
      c.src = img.currentSrc || img.src; c.alt = '';
      f.appendChild(c);
      root.appendChild(f);
      var from = 'translate(' + a.left + 'px,' + a.top + 'px) scale(' + (a.width / b.width) + ',' + (a.height / b.height) + ')';
      var to = 'translate(' + b.left + 'px,' + b.top + 'px) scale(1,1)';
      var an = f.animate([{ transform: from }, { transform: to }], { duration: reduce ? 1 : ms, easing: EASE, fill: 'forwards' });
      an.onfinish = function () { if (done) done(); requestAnimationFrame(function () { f.remove(); }); };
    }
    function rect(r) { return { left: r.left, top: r.top, width: r.width, height: r.height }; }

    function openPreview(i) {
      var it = items[i];
      if (!it || root.classList.contains('is-pv')) return;
      if (!pv) { location.href = it.href; return; }
      pvItem = it; lastFocus = document.activeElement; pvAt = performance.now();
      setOpen(false);
      clearTimeout(pvTimer);
      if (pvMedia) { pvMedia.innerHTML = ''; pvMedia.appendChild(cloneImg(it.img)); }
      if (pvName) pvName.textContent = it.name;
      if (pvYear) pvYear.textContent = it.year;
      if (pvText) pvText.innerHTML = it.html;
      if (pvOpen) pvOpen.setAttribute('href', it.href);
      pv.setAttribute('aria-hidden', 'false'); if ('inert' in pv) pv.inert = false;
      mbShow();
      prefetch(it.href);

      var target = pvMedia && pvMedia.firstChild;
      if (!target) { root.classList.add('is-pv', 'is-pv-in'); mode = 'pv'; return; }
      // Endplatz des Bilds im Panel: Panel ist noch oben ausserhalb, darum seine Höhe dazurechnen
      var mr = pvMedia.getBoundingClientRect();
      var ar = it.img.naturalWidth ? it.img.naturalWidth / it.img.naturalHeight : it.w / it.h;
      // Feld hat feste Höhe, Breite automatisch (höchstens max-width)
      var maxW = parseFloat(getComputedStyle(pvMedia).maxWidth) || Infinity;
      var h = mr.height, w = Math.min(maxW, h * ar); h = w / ar;
      var shift = pvPanel ? pvPanel.offsetHeight * 1.01 : 0;
      var b = { left: mr.left, top: mr.top + shift, width: w, height: h };
      var a = rect(it.img.getBoundingClientRect());
      target.style.visibility = 'hidden';
      it.el.style.visibility = 'hidden';
      mode = 'pv';
      root.classList.add('is-pv');
      fly(it.img, a, b, CONFIG.pvMs, function () {
        target.style.visibility = '';
        if (pvItem !== it || !root.classList.contains('is-pv')) return;
        root.classList.add('is-pv-in');
        if (pvClose) pvClose.focus({ preventScroll: true });
      });
    }
    function closePreview() {
      if (!root.classList.contains('is-pv')) return;
      var it = pvItem, target = pvMedia && pvMedia.firstChild;
      pvItem = null;
      root.classList.remove('is-pv-in');
      pv.setAttribute('aria-hidden', 'true'); if ('inert' in pv) pv.inert = true;
      mode = 'idle'; render();
      if (it && target) {
        var a = rect(target.getBoundingClientRect());
        var b = rect(it.img.getBoundingClientRect());
        target.style.visibility = 'hidden';
        it.el.style.visibility = 'hidden';
        fly(it.img, a, b, CONFIG.pvMs, function () { it.el.style.visibility = ''; });
      }
      root.classList.remove('is-pv');
      activity();
      if (lastFocus && lastFocus.focus && lastFocus !== document.body) lastFocus.focus({ preventScroll: true });
    }
    if (pvClose) {
      pvClose.setAttribute('role', 'button'); pvClose.setAttribute('tabindex', '0');
      pvClose.addEventListener('click', function (e) { e.preventDefault(); closePreview(); });
      pvClose.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closePreview(); } });
    }
    // Neben das Panel tippen schliesst (nicht der Klick, der die Vorschau gerade geöffnet hat)
    if (pv) pv.addEventListener('click', function (e) {
      if (performance.now() - pvAt < 450) return;
      if (!e.target.closest('.lib-pv-panel')) closePreview();
    });

    var prefetched = {};
    function prefetch(href) {
      if (!href || prefetched[href]) return;
      prefetched[href] = true;
      var l = document.createElement('link');
      l.rel = 'prefetch'; l.href = href;
      document.head.appendChild(l);
    }

    // ---------- Start ----------
    root.classList.toggle('is-mouse', window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    if (totEl) totEl.textContent = pad(items.length);
    if (curEl) curEl.textContent = pad(items.length ? 1 : 0);
    var started = false;
    function start() {
      if (started) return;
      started = true;
      runIntro(function () {
        root.classList.add('is-in');
        showMeta(idx, true);
        mbWait();
      });
    }
    // Erst die ersten Bilder abwarten (höchstens 1.2 s), damit die Breiten stimmen
    Promise.all(items.slice(0, 6).map(function (it) {
      return it.img.decode ? it.img.decode().catch(function () {}) : Promise.resolve();
    })).then(start);
    setTimeout(start, 1200);
    // Später geladene Bilder: Breiten neu messen, ohne Sprung
    all.forEach(function (it) {
      it.img.addEventListener('load', function () {
        if (!started || mode === 'intro') return;
        var keep = items[idx];
        measure();
        if (mode === 'idle' && keep) { P = T = keep.c; }
        render();
      });
    });

    var rT = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(function () {
        var keep = items[idx];
        measure();
        if (mode !== 'intro' && keep) { P = T = keep.c; V = 0; if (mode !== 'pv') mode = 'idle'; }
        render();
      }, 80);
    });
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      if (root.classList.contains('is-pv')) closePreview();
      measure(); P = T = items[idx] ? items[idx].c : 0; render();
    });
  }

  function boot() {
    var roots = document.querySelectorAll('[data-lib]');
    if (!roots.length) return;
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
    document.documentElement.classList.add('lib-on');
    [].forEach.call(roots, init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
