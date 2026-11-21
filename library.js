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
    // Bewegung wie marioroudil.com am Desktop (main.js, Slider): das Rad läuft dem Ziel mit einer Glättung
    // nach (lerp), der Abstand Ziel–Anzeige ist das Tempo, daraus biegen sich die Bilder in die Tiefe.
    speed:      1.5,    // Finger-/Mausweg mal speed (Mario Desktop: 1.5)
    ease:       0.1,    // Glättung pro Bild bei 60 fps (Mario: 0.1)
    edge:       0.35,   // Widerstand über den Anfang / das Ende hinaus
    wheelIdle:  140,    // ms nach Trackpad/Mausrad, dann einrasten
    edgeGuard:  40,     // px am Rand, in denen Safaris Zurück-Wischen gesperrt ist
    // Bild-Wobble (Mario-Shader: pos.z += cos(Abstand · 1.8 / Breite · π) · Tempo · 800 + sin(u − 10) · Tempo · 200)
    bend:       0.25,   // Tempo = bend · (Ziel − Anzeige) / Bildschirmbreite
    bendMax:    0.4,    // Begrenzung des Tempos (Mario: ±0.4)
    depth:      800,    // Tiefe in px bei Tempo 1
    twist:      200,    // Drehung über die Bildbreite (px Tiefe bei Tempo 1)
    persp:      1.4,    // Blickabstand = persp · Bildschirmhöhe
    // Auswahl wechseln: Bilder drehen weich davon, dann kommt die neue Auswahl wie beim ersten Laden
    outroMs:    750,
    // Eintritt: Bilder kommen zusammen
    introDelay: 250,    // ms schwarz, bevor die Bilder kommen
    introMs:    1700,   // Dauer
    introSpin:  0.9,    // wie viel vom Rad vorbeiläuft (1 = alle Bilder)
    dim:        0.0009, // wie stark schnelle Bilder beim Eintritt abdunkeln
    // Vorschau
    pvMs:       750,    // Vorschau öffnen, Teil 1: Bild mit weissem Rahmen fliegt hoch und heftet sich oben an
    pvOpenMs:   700,    // Teil 2: der Rahmen geht auf und zeigt den Text
    pvCloseMs:  550,    // Schliessen: Rahmen zieht sich zuerst wieder um das Bild zusammen
    pvGap:      .05     // Abstand Vorschau zum Menü-Knopf (Anteil der Bildschirmhöhe); mehr Inhalt scrollt
  };

  var EASE = 'cubic-bezier(.7,0,.2,1)';
  var css = [
    'html.lib-on, html.lib-on body { height: 100%; overflow: hidden; overscroll-behavior: none; background-color: #000; }',
    '[data-lib] { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }',
    '[data-lib] .lib-wheel { position: absolute; inset: 0; }',
    '[data-lib] .lib-item { position: absolute; left: 0; top: 0; visibility: hidden; will-change: transform; backface-visibility: hidden; transform-origin: 50% 50%; }',
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
    /* Weiss kommt vom Rahmen (lib-pv-frame), der mit dem Bild hochfliegt und dann aufgeht. Das Panel selbst ist durchsichtig und scrollt. */
    '[data-lib] .lib-pv-panel { box-sizing: border-box; background-color: transparent !important; overflow-y: auto; overscroll-behavior: contain; touch-action: pan-y; -webkit-overflow-scrolling: touch; scrollbar-width: none; }',
    '[data-lib] .lib-pv-panel::-webkit-scrollbar { display: none; }',
    '[data-lib] .lib-pv-frame { position: absolute; left: 0; top: 0; width: 100px; height: 100px; background-color: #fff; transform-origin: 0 0; will-change: transform; pointer-events: none; visibility: hidden; }',
    '[data-lib].is-pv .lib-pv-frame { visibility: visible; }',
    '[data-lib] .lib-pv-media img.is-wait { visibility: hidden; }',
    /* Menü-Knopf und Menü liegen über der Vorschau, damit man sie immer antippen kann */
    'html.lib-on .menu-toggle-wrap { z-index: 30; }',
    'html.lib-on .menu-panel { z-index: 31; }',
    '[data-lib] .lib-pv-name, [data-lib] .lib-pv-year, [data-lib] .lib-pv-text, [data-lib] .lib-pv-open, [data-lib] .lib-pv-close { opacity: 0; transition: opacity .25s ease; }',
    '[data-lib].is-pv-in .lib-pv-name, [data-lib].is-pv-in .lib-pv-year, [data-lib].is-pv-in .lib-pv-text, [data-lib].is-pv-in .lib-pv-open, [data-lib].is-pv-in .lib-pv-close { opacity: 1; transition: opacity .5s ease; }',
    '[data-lib] .lib-pv-media img { display: block; height: 100%; width: auto; max-width: 100%; object-fit: contain; object-position: left top; }',
    '[data-lib] .lib-wheel { transition: opacity .65s ease, filter .65s ease; }',
    '[data-lib].is-pv-dim .lib-wheel { opacity: .3; filter: blur(8px); }',
    '[data-lib].is-pv-dim .lib-meta, [data-lib].is-pv-dim .lib-bottom { opacity: 0; }',
    '.lib-fly { position: fixed; left: 0; top: 0; z-index: 60; pointer-events: none; transform-origin: 0 0; will-change: transform; overflow: hidden; }',
    '.lib-fly img { display: block; width: 100%; height: 100%; object-fit: cover; }',
    /* Menü-Knopf: auf der Library steuert dieser Code ihn (Klasse lib-mb), nicht das Scrollen.
       Tempo und Kurven kommen aus dem Website-Footer (--mh-up, --mh-down, --mh-ease-up, --mh-ease-down). */
    'html.lib-on.mh-js .menu-toggle-wrap.mh-on.mh-on { translate: 0 var(--mh-drop); scale: .55; transition: opacity var(--menu-dur) var(--menu-ease-out), visibility 0s, translate var(--mh-down) var(--mh-ease-down); }',
    'html.lib-on.mh-js .menu-toggle-wrap.mh-on.mh-on.lib-mb { translate: 0 0; scale: 1; will-change: translate, scale; transition: opacity var(--menu-dur) var(--menu-ease-out), visibility 0s, translate var(--hp-mb-up, .85s) var(--hp-mb-ease, cubic-bezier(.3, 1.9, .5, 1)), scale var(--hp-mb-up2, .85s) var(--hp-mb-ease2, cubic-bezier(.3, 1.9, .5, 1)); }',
    '@media (prefers-reduced-motion: reduce) { [data-lib] .lib-wheel { transition-duration: .01s; } }'
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
    var bendP = 0;               // Tempo für das Biegen (Mario: progress)
    var mode = 'idle';           // idle | drag | spring | intro | outro | pv
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
      var W = window.innerWidth, Hh = window.innerHeight, L = CONFIG.persp * Hh;
      var dimA = mode === 'intro' ? Math.min(0.75, Math.abs(V) * CONFIG.dim) : 0;
      var reach = cx * 1.4 + 100;
      var pc = Math.max(-CONFIG.bendMax, Math.min(CONFIG.bendMax, bendP));
      var flat = Math.abs(pc) < 0.0005;
      for (var i = 0; i < items.length; i++) {
        var it = items[i], d = it.c - P, th = d / R;
        if (Math.abs(d) > reach + it.w || Math.abs(th) > 1.3) {
          if (it.vis) { it.el.classList.remove('is-vis'); it.vis = false; }
          continue;
        }
        var x = R * Math.sin(th), y = R * (1 - Math.cos(th));
        var rot = th * 57.29578;
        var px = cx + x - it.w / 2, py = cy + y - it.h / 2;
        var tf;
        if (flat) {
          tf = 'translate3d(' + px.toFixed(2) + 'px,' + py.toFixed(2) + 'px,0) rotate(' + rot.toFixed(3) + 'deg)';
        } else {
          // Tiefe nach Abstand zur Bildschirmmitte (Kurve) und Drehung über die Bildbreite, wie Marios Vertex-Shader
          var k = 1.8 * Math.PI / W, dfc = Math.abs(x);
          var sz = Math.min(1, W / 1280);   // Mario rechnet in px für den Desktop: am Handy entsprechend kleiner
          var z = Math.cos(dfc * k) * pc * CONFIG.depth * sz;
          var slope = -Math.sin(dfc * k) * k * pc * CONFIG.depth * sz * (x < 0 ? -1 : 1);   // dz/dx am Bild
          slope += (Math.sin(-9) - Math.sin(-10)) * pc * CONFIG.twist * sz / Math.max(1, it.w);
          var ry = -Math.atan(slope) * 57.29578;
          // Fluchtpunkt in der Bildschirmmitte: perspective() um die Mitte statt um das Bild
          var ox = cx - px, oy = cy - py;
          tf = 'translate3d(' + px.toFixed(2) + 'px,' + py.toFixed(2) + 'px,0) translate(' + ox.toFixed(1) + 'px,' + oy.toFixed(1) + 'px) perspective(' + L.toFixed(0) + 'px) translate(' + (-ox).toFixed(1) + 'px,' + (-oy).toFixed(1) + 'px) translate3d(0,0,' + z.toFixed(2) + 'px) rotate(' + rot.toFixed(3) + 'deg) rotateY(' + ry.toFixed(3) + 'deg)';
        }
        it.el.style.transform = tf;
        it.el.style.opacity = dimA ? (1 - dimA).toFixed(3) : '';
        if (!it.vis) { it.el.classList.add('is-vis'); it.vis = true; }
      }
      idx = nearest(P);
      if (idx !== shownIdx && mode !== 'intro' && mode !== 'outro') showMeta(idx);
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

    // ---------- Bewegung (wie Mario: Anzeige läuft dem Ziel mit Glättung nach) ----------
    function step(now) {
      raf = 0;
      var dt = last ? Math.min(0.034, (now - last) / 1000) : 0.016;
      last = now;
      var W = window.innerWidth, busy = false;
      if ((mode === 'intro' || mode === 'outro') && intro) {
        var t = Math.max(0, Math.min(1, (now - intro.t0) / intro.ms));
        var e = mode === 'intro' ? 1 - Math.pow(1 - t, 4) : t * t * t;   // hinein: easeOutQuart, hinaus: easeInCubic
        var np = intro.from + (intro.to - intro.from) * e;
        V = (np - P) / dt; P = np; T = P;
        bendP = mode === 'outro' ? CONFIG.bend * V / 6 / W : 0;   // gleiches Mass wie beim Wischen (Abstand bei 60 fps)
        if (mode === 'outro' && intro.fade) intro.fade(t);
        busy = true;
        if (t >= 1) { mode = 'idle'; V = 0; bendP = 0; var done = intro.done; intro = null; if (done) done(); }
      } else if (mode !== 'pv') {
        var a = 1 - Math.pow(1 - CONFIG.ease, dt * 60);
        var prev = P;
        P += (T - P) * a;
        V = (P - prev) / dt;
        bendP = CONFIG.bend * (T - P) / W;
        if (mode !== 'drag' && Math.abs(T - P) < 0.3) { P = T; V = 0; bendP = 0; if (mode === 'spring') mode = 'idle'; }
        busy = mode === 'drag' || Math.abs(T - P) >= 0.3;
      }
      render();
      if (busy) kick(); else { last = 0; bendP = 0; render(); }
    }
    function kick() { if (!raf) raf = requestAnimationFrame(step); }
    function springTo(i) {
      if (!items.length) return;
      T = items[clampIdx(i)].c;
      if (mode !== 'pv') mode = 'spring';
      kick();
    }

    // ---------- Menü-Knopf ----------
    // Immer sichtbar. Beim Laden versteckt; sobald die Galerie geladen ist, bouncet er von unten hoch
    // wie der Close-Knopf im About der Homepage (Feder, wächst dabei und wackelt nach).
    function mbWrap() { return document.querySelector('.menu-toggle-wrap'); }
    function mbShow() { var w = mbWrap(); if (w) w.classList.add('lib-mb'); }
    function activity() {}
    (function () {
      function settle(z, hz) { return Math.log(500) / (z * 2 * Math.PI * hz); }
      function spring(z, hz, dur, n) {
        var w = 2 * Math.PI * hz, wd = w * Math.sqrt(1 - z * z), pts = [];
        for (var i = 0; i <= n; i++) { var t = dur * i / n; pts.push((1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z * w / wd * Math.sin(wd * t))).toFixed(4)); }
        pts[n] = '1';
        return 'linear(' + pts.join(', ') + ')';
      }
      try {
        if (CSS.supports('transition-timing-function', 'linear(0, 1)')) {
          var hs = document.documentElement.style, d1 = settle(0.45, 1.3), d2 = settle(0.42, 1.6);
          hs.setProperty('--hp-mb-ease', spring(0.45, 1.3, d1, 90)); hs.setProperty('--hp-mb-up', d1.toFixed(2) + 's');
          hs.setProperty('--hp-mb-ease2', spring(0.42, 1.6, d2, 90)); hs.setProperty('--hp-mb-up2', d2.toFixed(2) + 's');
        }
      } catch (e) {}
    })();

    // ---------- Finger und Maus ----------
    var down = null, moved = false, startIdx = 0;
    function edgeClamp(p) {
      var lo = minP(), hi = maxP();
      if (p < lo) return lo - (lo - p) * CONFIG.edge;
      if (p > hi) return hi + (p - hi) * CONFIG.edge;
      return p;
    }
    root.addEventListener('pointerdown', function (e) {
      if (mode === 'intro' || mode === 'outro' || root.classList.contains('is-pv')) return;
      if (e.target.closest('.lib-top, .lib-pv')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY, p0: T, id: e.pointerId };
      moved = false; startIdx = idx;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down || e.pointerId !== down.id) return;
      var dx = e.clientX - down.x;
      if (!moved) {
        if (Math.abs(dx) < 6 && Math.abs(e.clientY - down.y) < 6) return;
        moved = true; mode = 'drag';
        down.x = e.clientX; down.p0 = T; dx = 0;   // ohne Sprung beim Start
        root.classList.add('is-dragging');
      }
      T = edgeClamp(down.p0 - dx * CONFIG.speed);
      kick();
    });
    function release(e, cancelled) {
      if (!down || (e && e.pointerId !== down.id)) return;
      root.classList.remove('is-dragging');
      if (moved || cancelled) {
        springTo(nearest(T));   // Mario: auf das nächstgelegene Bild einrasten, ohne Schwung
      } else {
        tap(down.x, down.y);
      }
      down = null;
    }
    window.addEventListener('pointerup', function (e) { release(e, false); });
    window.addEventListener('pointercancel', function (e) { release(e, true); });
    root.addEventListener('dragstart', function (e) { e.preventDefault(); });
    // iPhone: Wischen vom Bildschirmrand löst in Safari „Zurück/Vor“ aus. Beginnt ein Finger am Rand,
    // wird das verhindert, damit das Rad dreht. (Knöpfe und Vorschau ausgenommen, dort bleiben Tipps möglich.)
    root.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1 || root.classList.contains('is-pv')) return;
      if (e.target.closest('.lib-top, .lib-pv, a:not(.lib-card), [role="button"]')) return;
      var x = e.touches[0].clientX;
      if (x < CONFIG.edgeGuard || x > window.innerWidth - CONFIG.edgeGuard) e.preventDefault();
    }, { passive: false });
    // Ein Klick auf ein Bild öffnet nie direkt die Seite, sondern die Vorschau
    root.addEventListener('click', function (e) {
      var a = e.target.closest('a.lib-card');
      if (!a) return;
      e.preventDefault();
      if (e.detail === 0) {   // Tastatur (Enter)
        var i = items.findIndex(function (it) { return it.a === a; });
        if (i > -1) { P = T = items[i].c; V = 0; bendP = 0; render(); openPreview(i); }
      }
    });
    function tap(x, y) {
      var el = document.elementFromPoint(x, y);
      var item = el && el.closest('.lib-item');
      if (!item) return;
      var i = items.findIndex(function (it) { return it.el === item; });
      if (i < 0) return;
      if (i === idx) { P = T = items[i].c; V = 0; bendP = 0; render(); openPreview(i); }
      else { springTo(i); activity(); }
    }

    // Trackpad und Mausrad (seitlich und senkrecht)
    var wheelT = 0;
    root.addEventListener('wheel', function (e) {
      if (e.target.closest && e.target.closest('.lib-pv-panel')) return;   // Vorschau scrollt selbst
      e.preventDefault();
      if (mode === 'intro' || mode === 'outro' || root.classList.contains('is-pv')) return;
      if (e.target.closest('.lib-sort-list')) return;
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (e.deltaMode === 1) d *= 32;
      if (!d) return;
      T = edgeClamp(T + d);
      mode = 'drag'; kick();
      clearTimeout(wheelT);
      wheelT = setTimeout(function () { if (mode === 'drag') springTo(nearest(T)); }, CONFIG.wheelIdle);
    }, { passive: false });

    // Tastatur
    document.addEventListener('keydown', function (e) {
      if (html.classList.contains('menu-open')) return;
      if (root.classList.contains('is-pv')) { if (e.key === 'Escape') { e.preventDefault(); closePreview(); } return; }
      if (top && top.classList.contains('is-open') && e.key === 'Escape') { setOpen(false); return; }
      if (mode === 'intro' || mode === 'outro') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); springTo(nearest(T) + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); springTo(nearest(T) - 1); }
    });

    // ---------- Eintritt: Bilder kommen zusammen ----------
    function runIntro(done) {
      measure();
      wheel.style.opacity = '';
      if (reduce || !items.length) { P = T = minP(); V = 0; mode = 'idle'; render(); if (done) done(); return; }
      var span = Math.max(window.innerWidth * 1.6, (maxP() - minP()) * CONFIG.introSpin + window.innerWidth);
      P = T = minP() + span; V = 0; mode = 'intro'; bendP = 0;
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
    // Auswahl wechseln: zuerst drehen die Bilder weich davon und blenden aus, dann kommt die neue Auswahl
    function runOutro(done) {
      if (reduce || !items.length) { done(); return; }
      var W = window.innerWidth;
      mode = 'outro';
      intro = { from: P, to: P + W * 1.3, t0: performance.now(), ms: CONFIG.outroMs, done: done,
        fade: function (t) { wheel.style.opacity = (1 - Math.max(0, (t - 0.35) / 0.65)).toFixed(3); } };
      last = 0; kick();
    }
    function applyFilter() {
      if (mode === 'outro') return;
      if (meta) meta.classList.add('is-swap');
      runOutro(swapItems);
    }
    function swapItems() {
      items.forEach(function (it) { it.el.classList.remove('is-vis'); it.vis = false; });
      items = all.filter(function (it) { return !current || it.cats.indexOf(current) > -1; });
      all.forEach(function (it) { it.el.style.display = items.indexOf(it) > -1 ? '' : 'none'; });
      shownIdx = -1;
      if (meta) meta.classList.add('is-swap');
      runIntro(function () { showMeta(nearest(P)); });
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
    function fly(img, a, b, ms, done, delay) {
      var f = document.createElement('div');
      f.className = 'lib-fly';
      f.style.width = b.width + 'px'; f.style.height = b.height + 'px';
      var c = document.createElement('img');
      c.src = img.currentSrc || img.src; c.alt = '';
      f.appendChild(c);
      root.appendChild(f);
      var from = 'translate(' + a.left + 'px,' + a.top + 'px) scale(' + (a.width / b.width) + ',' + (a.height / b.height) + ')';
      var to = 'translate(' + b.left + 'px,' + b.top + 'px) scale(1,1)';
      var an = f.animate([{ transform: from }, { transform: to }], { duration: reduce ? 1 : ms, delay: reduce ? 0 : (delay || 0), easing: EASE, fill: 'both' });
      an.onfinish = function () { if (done) done(); requestAnimationFrame(function () { f.remove(); }); };
    }
    function rect(r) { return { left: r.left, top: r.top, width: r.width, height: r.height }; }

    // Weisser Rahmen: ein Kästchen von 100 × 100 px, per transform auf jedes Rechteck gezogen
    var pvFrame = null, pvAnim = null, pvTimer2 = 0, pvState = '';
    if (pv) { pvFrame = document.createElement('div'); pvFrame.className = 'lib-pv-frame'; pvFrame.setAttribute('aria-hidden', 'true'); pv.insertBefore(pvFrame, pv.firstChild); }
    var EASE_OPEN = 'cubic-bezier(.6,0,.1,1)';
    function box(r) { return 'translate(' + r.left + 'px,' + r.top + 'px) scale(' + (r.width / 100) + ',' + (r.height / 100) + ')'; }
    function frameTo(keys, ms, done) {
      if (pvAnim) pvAnim.cancel();
      pvAnim = pvFrame.animate(keys, { duration: reduce ? 1 : ms, fill: 'forwards' });
      pvAnim.onfinish = function () { if (done) done(); };
    }
    // Oberkante des Menü-Knopfs, wenn er steht (ohne seine Bewegung mitzurechnen)
    function mbTop() {
      var w = mbWrap(), H = window.innerHeight;
      if (!w) return H;
      return H - (parseFloat(getComputedStyle(w).bottom) || 0) - w.offsetHeight;
    }
    // Vorschau höchstens bis 5 % über den Menü-Knopf, mehr Inhalt scrollt
    function fitPanel() {
      pvPanel.style.maxHeight = Math.max(200, mbTop() - window.innerHeight * CONFIG.pvGap) + 'px';
      return { left: 0, top: 0, width: pvPanel.offsetWidth, height: pvPanel.offsetHeight };
    }
    // Rahmen eng ums Bild, oben angeheftet; Rand im gleichen Verhältnis wie bei der Karte im Rad
    function attachRect(b, pad) {
      var side = Math.min(pad.s * b.height, b.left);
      var bottom = Math.max(side, pad.b * b.height);
      return { left: b.left - side, top: 0, width: b.width + 2 * side, height: b.top + b.height + bottom };
    }
    function cardPad(it) {
      var c = (it.a || it.img).getBoundingClientRect(), r = it.img.getBoundingClientRect(), h = r.height || 1;
      return { s: Math.max(0, (r.left - c.left) / h), b: Math.max(0, (c.bottom - r.bottom) / h) };
    }

    function openPreview(i) {
      var it = items[i];
      if (!it || root.classList.contains('is-pv')) return;
      if (!pv) { location.href = it.href; return; }
      pvItem = it; lastFocus = document.activeElement; pvAt = performance.now();
      setOpen(false);
      clearTimeout(pvTimer); clearTimeout(pvTimer2);
      if (pvMedia) { pvMedia.innerHTML = ''; pvMedia.appendChild(cloneImg(it.img)); }
      if (pvName) pvName.textContent = it.name;
      if (pvYear) pvYear.textContent = it.year;
      if (pvText) pvText.innerHTML = it.html;
      if (pvOpen) pvOpen.setAttribute('href', it.href);
      pv.setAttribute('aria-hidden', 'false'); if ('inert' in pv) pv.inert = false;
      mbShow();
      prefetch(it.href);
      pvPanel.scrollTop = 0;
      var panelR = fitPanel();

      var target = pvMedia && pvMedia.firstChild;
      if (!target) { pvFrame.style.transform = box(panelR); root.classList.add('is-pv', 'is-pv-dim', 'is-pv-in'); mode = 'pv'; return; }
      // Endplatz des Bilds im Panel (Feld hat feste Höhe, Breite automatisch, höchstens max-width)
      var mr = pvMedia.getBoundingClientRect();
      var ar = it.img.naturalWidth ? it.img.naturalWidth / it.img.naturalHeight : it.w / it.h;
      var maxW = parseFloat(getComputedStyle(pvMedia).maxWidth) || Infinity;
      var h = mr.height, w = Math.min(maxW, h * ar); h = w / ar;
      var b = { left: mr.left, top: mr.top, width: w, height: h };
      var a = rect(it.img.getBoundingClientRect());
      var cardR = rect((it.a || it.img).getBoundingClientRect());
      var att = attachRect(b, cardPad(it));
      var D1 = CONFIG.pvMs, D2 = CONFIG.pvOpenMs, k = D1 / (D1 + D2);
      target.classList.add('is-wait');
      it.el.style.visibility = 'hidden';
      mode = 'pv'; pvState = 'opening';
      pvFrame.style.transform = box(cardR);
      root.classList.add('is-pv', 'is-pv-dim');
      // 1) Bild und Rahmen fliegen zusammen hoch und heften sich oben an · 2) der Rahmen geht auf
      frameTo([
        { transform: box(cardR), easing: EASE },
        { transform: box(att), offset: k, easing: EASE_OPEN },
        { transform: box(panelR) }
      ], D1 + D2, function () { pvFrame.style.transform = box(panelR); if (pvState === 'opening') pvState = 'open'; });
      fly(it.img, a, b, D1, function () { target.classList.remove('is-wait'); });
      pvTimer2 = setTimeout(function () {
        if (pvItem !== it || !root.classList.contains('is-pv')) return;
        root.classList.add('is-pv-in');
        if (pvClose && !reduce) pvClose.focus({ preventScroll: true, focusVisible: false });
      }, reduce ? 0 : D1 + D2 * .3);
    }
    function closePreview() {
      if (!root.classList.contains('is-pv') || pvState === 'closing') return;
      var it = pvItem, target = pvMedia && pvMedia.firstChild;
      pvItem = null; pvState = 'closing';
      clearTimeout(pvTimer2);
      window.hsVT = null;
      root.classList.remove('is-pv-in', 'is-pv-dim');
      pv.setAttribute('aria-hidden', 'true'); if ('inert' in pv) pv.inert = true;
      if (document.activeElement && pv.contains(document.activeElement)) document.activeElement.blur();
      mode = 'idle'; render();
      function finish() {
        if (pvAnim) { pvAnim.cancel(); pvAnim = null; }
        root.classList.remove('is-pv');
        pvState = '';
        activity();
      }
      if (!it || !target) { finish(); return; }
      pvPanel.scrollTop = 0;
      var panelR = { left: 0, top: 0, width: pvPanel.offsetWidth, height: pvPanel.offsetHeight };
      var b = rect(target.getBoundingClientRect());
      var cardR = rect((it.a || it.img).getBoundingClientRect());
      var a = rect(it.img.getBoundingClientRect());
      var att = attachRect(b, cardPad(it));
      var D1 = CONFIG.pvCloseMs, D2 = CONFIG.pvMs, k = D1 / (D1 + D2);
      // 1) Rahmen zieht sich ums Bild zusammen · 2) Bild und Rahmen fliegen zurück ins Rad
      var from = getComputedStyle(pvFrame).transform;   // auch mitten im Öffnen ohne Sprung
      frameTo([
        { transform: from && from !== 'none' ? from : box(panelR), easing: EASE_OPEN },
        { transform: box(att), offset: k, easing: EASE },
        { transform: box(cardR) }
      ], D1 + D2, function () {
        it.el.style.visibility = '';
        requestAnimationFrame(finish);
      });
      // gleiche Uhr wie der Rahmen (verzögert statt Timer), damit Bild und Rahmen nie auseinanderlaufen
      target.classList.add('is-wait');
      fly(it.img, b, a, D2, null, D1);
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

    // Projektseite und ihr Titelbild vorladen (gleiche Grösse wie dort: sizes der Projekt-Galerie)
    var prefetched = {};
    function prefetch(href) {
      if (!href || prefetched[href]) return;
      prefetched[href] = true;
      var l = document.createElement('link');
      l.rel = 'prefetch'; l.href = href;
      document.head.appendChild(l);
      if (pvItem && pvItem.img) {
        var pre = new Image();
        pre.sizes = '(max-width: 767px) 100vw, 34vw';
        if (pvItem.img.srcset) pre.srcset = pvItem.img.srcset;
        pre.src = pvItem.img.src;
        if (pre.decode) pre.decode().catch(function () {});
      }
    }
    // „Galerie öffnen“: Flug in die Projektseite anmelden (Website-Head, Block SEITENÜBERGÄNGE)
    // Selbst navigieren: Andere Klick-Handler auf Knöpfen (z. B. Webflow-Interaktionen) verhindern sonst den Übergang.
    if (pvOpen) pvOpen.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;   // neuer Tab: normal
      var img = pvMedia && pvMedia.firstChild;
      var href = pvOpen.href, to = '';
      try { to = new URL(href, location.href).pathname; } catch (er) {}
      if (!to) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (img) window.hsVT = { to: to, el: img, sel: '.pg-hero-media' };
      location.href = href;
    });

    // ---------- Start ----------
    root.classList.toggle('is-mouse', window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    if (totEl) totEl.textContent = pad(items.length);
    if (curEl) curEl.textContent = pad(items.length ? 1 : 0);
    var started = false;
    function start() {
      if (started) return;
      started = true;
      // Kommt man mit dem weichen Übergang von der Homepage, erst starten, wenn das Schwarz ganz da ist
      var vt = html.classList.contains('hs-vt-fade');
      function go() {
        runIntro(function () {
          root.classList.add('is-in');
          showMeta(idx, true);
          mbShow();
        });
      }
      if (!vt) { go(); return; }
      var t0 = performance.now();
      (function wait() {
        if (!html.classList.contains('hs-vt-fade') || performance.now() - t0 > 1500) go();
        else requestAnimationFrame(wait);
      })();
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
        if (pvState === 'open' && pvFrame) { if (pvAnim) { pvAnim.cancel(); pvAnim = null; } pvFrame.style.transform = box(fitPanel()); }
      }, 80);
    });
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      // Zurück aus der Projektseite: Vorschau bleibt offen, das Bild fliegt dorthin zurück
      measure(); P = T = items[idx] ? items[idx].c : 0; render();
    });
  }

  // Stil und Seitenklasse sofort setzen (vor dem ersten Bild, auch für Seitenübergänge: schwarzer Grund)
  var styled = false;
  function style() {
    if (styled || !document.querySelector('[data-lib]')) return;
    styled = true;
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
    document.documentElement.classList.add('lib-on');
  }
  function boot() {
    style();
    [].forEach.call(document.querySelectorAll('[data-lib]'), init);
  }
  style();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
