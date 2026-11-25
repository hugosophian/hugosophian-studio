/* ============================================================
   GALERIE (Urknall + freie Fläche)  ·  hugosophian.studio
   Ersetzt library.js auf /creator, /singer, /model-2027 (Hugo 24.11.2026).
   Vorbild: zacharyallott.com (Bilder liegen verstreut, die Fläche lässt sich in alle Richtungen ziehen, ohne Ende).

   Ablauf:
     Homepage «Galerie öffnen»: Röhren-TV schaltet ab (home.js), es bleibt ein Lichtpunkt.
     Hier: Der Punkt leuchtet, bis die Bilder geladen sind, fällt in sich zusammen, kurze Stille,
     Urknall (Lichtkugel, Erschütterung, Bilder schiessen aus der Mitte an ihren Platz).
     Danach: ziehen (Finger, Maus), Trackpad, Mausrad, Pfeiltasten. Loslassen läuft mit Schwung nach.
     Bild antippen: Vorschau wie bisher, «Galerie öffnen» fliegt in die Projektseite.
     Sortierung oben: alle Bilder fallen zurück in den Punkt, neuer Urknall mit der neuen Auswahl.

   Aufbau im Designer: gleich wie für library.js (section.lib [data-lib] [data-lib-folder], .lib-stage mit
   .lib-item > a.lib-card > img.lib-img und .lib-data, .lib-top, .lib-bottom, .lib-pv). Nichts umbauen.
   Ein Titelbild pro Projekt. Damit die Fläche voll ist, kommen Projekte mehrfach vor (Kopien der Karte).
   Werte zum Anpassen: CONFIG.
   ============================================================ */
(function () {
  'use strict';

  var CONFIG = {
    // Fläche
    size:      { desktop: [0.4, 0.7], mobile: [0.4, 0.64] },     // Kartengrösse: Anteil der Grösse aus dem Designer (lib-img 30vh / 46vw)
    cell:      { desktop: 1.5, mobile: 1.4 },     // Rasterabstand als Vielfaches der mittleren Kartenbreite (kleiner = dichter, mehr Überlappen)
    jitter:    0.5,     // wie weit eine Karte von ihrem Rasterplatz abweicht (Anteil vom Raster)
    holes:     0.08,    // Anteil leerer Rasterplätze
    // Wenige Projekte (Singer 2, Model 5): mehr Luft und mehr leere Plätze, damit es nicht wie eine Tapete aussieht.
    // Bei fewFrom Projekten und weniger wächst das Raster um bis zu fewCell und die Lücken um bis zu fewHoles.
    fewFrom:   7, fewCell: 0.5, fewHoles: 0.3, fewJitter: 0.3,
    depth:     [0.86, 1.14],   // Tempo beim Ziehen pro Karte (Tiefe): grössere Zahl = bewegt sich mehr und liegt vorne
    seed:      7,       // anderer Wert = andere Anordnung
    // Ziehen
    speedTouch: 1.0,    // Fingerweg mal
    speedMouse: 1.0,    // Mausweg mal
    friction:   0.94,   // Nachlaufen pro Bild bei 60 fps (näher an 1 = länger)
    flickMax:   70,     // höchstes Tempo beim Loslassen (px pro Bild)
    tapSlop:    8,      // bis so viele px gilt es als Antippen
    edgeGuard:  24,     // iPhone: Wischen am Rand nicht als «Zurück» (px)
    // Laden und Urknall
    dotMinMs:   280,    // Lichtpunkt steht mindestens so lange
    waitMax:    2500,   // höchstens so lange auf die Bilder warten
    implodeMs:  150,    // Punkt fällt in sich zusammen
    silenceMs:  70,     // Stille vor dem Knall
    sphereMs:   260,    // Lichtkugel füllt den Bildschirm
    fadeMs:     380,    // Licht blendet aus (Hugo 25.11.: 700 ms wirkte grau und matt)
    flyMs:      [1000, 1500],   // Flugdauer der Bilder
    flyDelay:   100,    // zufällige Verzögerung bis
    spin:       70,     // Drehung beim Start (Grad, ±)
    debris:     5,      // Bilder, die an der Kamera vorbeifliegen
    shakePx:    12,     // Erschütterung beim Knall
    shakeMs:    380,
    // Sortierung
    gatherMs:   560,    // alle Bilder fallen zurück in den Punkt
    // Vorschau (wie library.js)
    pvMs:       1000,
    pvCloseMs:  850,
    pvGap:      .05
  };

  var EASE = 'cubic-bezier(.7,0,.2,1)';
  var css = [
    'html.lib-on, html.lib-on body { height: 100%; overflow: hidden; overscroll-behavior: none; background-color: #000; }',
    '[data-lib] { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }',
    '[data-lib] .lib-stage { height: 100% !important; overflow: hidden; }',
    '[data-lib] .lib-wheel { position: absolute; inset: 0; z-index: 1; transition: opacity .65s ease, filter .65s ease; }',
    '[data-lib] .gx-sphere { position: absolute; left: 50%; top: 50%; border-radius: 50%; z-index: 0; pointer-events: none; opacity: 0;',
    // Hugo 25.11.: Knall mit schillerndem Rand (gleiche Farben wie die Nadel auf der Homepage)
    '  background: radial-gradient(circle, #fff 0, #fff 50%, #ffd6f3 56%, #ff8fe0 59%, #b9a0ff 62%, #8fdcff 65%, #9cf7cf 67.5%, #fff09a 70%, rgba(255,240,160,0) 73%); transform: translate(-50%,-50%) scale(0); }',
    '[data-lib] .lib-item { position: absolute; left: 0; top: 0; visibility: hidden; opacity: 0; will-change: transform; transform-origin: 50% 50%; backface-visibility: hidden; }',
    '[data-lib] .lib-item.is-vis { visibility: visible; }',
    '[data-lib] .lib-item.is-off { visibility: hidden; }',
    '[data-lib] .lib-card, [data-lib] .lib-img { -webkit-user-drag: none; }',
    '[data-lib] .lib-img { pointer-events: none; }',
    '[data-lib] .lib-data { display: none !important; }',
    '[data-lib].is-mouse .lib-stage { cursor: grab; }',
    '[data-lib].is-mouse.is-dragging .lib-stage { cursor: grabbing; }',
    /* Kein Zähler, kein Projektname über der Mitte (Hugo 24.11.) */
    '[data-lib] .lib-meta, [data-lib] .ps-index, [data-lib] .ps-progress { display: none !important; }',
    '[data-lib] .lib-top, [data-lib] .lib-bottom { transition: opacity .6s ease; }',
    '[data-lib]:not(.is-in) .lib-top, [data-lib]:not(.is-in) .lib-bottom { opacity: 0; pointer-events: none; }',
    '[data-lib] .lib-bottom { pointer-events: none; }',
    /* Schrift bleibt über weissen Karten lesbar */
    '[data-lib] .lib-top, [data-lib] .lib-bottom { mix-blend-mode: difference; }',
    /* Lichtpunkt (gleich wie am Ende des Röhren-TV auf der Homepage) */
    '.gx-dot { position: fixed; left: 50%; top: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; background: #fff; z-index: 50; pointer-events: none;',
    '  box-shadow: 0 0 6px 2px #fff, 0 0 16px 5px rgba(255,110,220,.55), 0 0 30px 10px rgba(120,210,255,.45), 0 0 56px 18px rgba(255,230,120,.22);',
    '  animation: gxPulse 1.1s ease-in-out infinite, gxHue 2.4s linear infinite; }',
    '@keyframes gxPulse { 50% { transform: scale(.82); } }',
    '@keyframes gxHue { to { filter: hue-rotate(360deg); } }',
    '.gx-dot.is-go { animation: none; }',
    /* Ankunft von der Homepage: kein Überblenden, der Punkt steht schon da */
    '.hs-vt-crt::view-transition-old(root) { animation: none; opacity: 0; }',
    '.hs-vt-crt::view-transition-new(root) { animation: none; }',
    /* Sortierung */
    '[data-lib] .lib-sort { cursor: pointer; }',
    '[data-lib] .lib-sort-arrow { display: inline-block; transition: transform .45s cubic-bezier(.3,1.6,.55,1); }',
    '[data-lib] .lib-top.is-open .lib-sort-arrow { transform: rotate(180deg); }',
    '[data-lib] .lib-sort-list { opacity: 0; visibility: hidden; filter: blur(6px); transform: translateY(-.4em); transition: opacity .3s ease, filter .3s ease, transform .3s ease, visibility 0s linear .3s; }',
    '[data-lib] .lib-top.is-open .lib-sort-list { opacity: 1; visibility: visible; filter: none; transform: none; transition-delay: 0s; }',
    '[data-lib] .lib-sort-item { cursor: pointer; }',
    '[data-lib] .lib-sort-item.is-empty { display: none; }',
    /* Vorschau (wie library.js) */
    '[data-lib] .lib-pv { visibility: hidden; transition: visibility 0s linear .65s; }',
    '[data-lib].is-pv .lib-pv { visibility: visible; transition-delay: 0s; }',
    '[data-lib] .lib-pv-panel { box-sizing: border-box; background-color: transparent !important; overflow-y: auto; overscroll-behavior: contain; touch-action: pan-y; -webkit-overflow-scrolling: touch; scrollbar-width: none; }',
    '[data-lib] .lib-pv-panel::-webkit-scrollbar { display: none; }',
    '[data-lib] .lib-pv-frame { position: absolute; left: 0; top: 0; width: 100px; height: 100px; background-color: #fff; transform-origin: 0 0; will-change: transform; pointer-events: none; visibility: hidden; }',
    '[data-lib].is-pv .lib-pv-frame { visibility: visible; }',
    '[data-lib] .lib-pv-media img.is-wait { visibility: hidden; }',
    'html.lib-on .menu-toggle-wrap { z-index: 30; }',
    'html.lib-on .menu-panel { z-index: 31; }',
    '[data-lib] .lib-pv-name, [data-lib] .lib-pv-year, [data-lib] .lib-pv-text, [data-lib] .lib-pv-open, [data-lib] .lib-pv-close { opacity: 0; transition: opacity .25s ease; }',
    '[data-lib].is-pv-in .lib-pv-name, [data-lib].is-pv-in .lib-pv-year, [data-lib].is-pv-in .lib-pv-text, [data-lib].is-pv-in .lib-pv-open, [data-lib].is-pv-in .lib-pv-close { opacity: 1; transition: opacity .5s ease; }',
    '[data-lib] .lib-pv-go { display: flex; align-items: center; gap: .5em; align-self: flex-start; color: inherit; text-decoration: none; cursor: pointer; -webkit-tap-highlight-color: transparent; font-family: "Oswald Studio", sans-serif; font-size: .8rem; font-weight: 500; letter-spacing: .12em; line-height: 1.5; text-transform: uppercase; position: relative; touch-action: manipulation; background: none; border: 0; outline: 0; box-shadow: none; text-shadow: none; padding: 0; border-radius: 0; }',
    '[data-lib] .lib-pv-go::after { content: ""; position: absolute; inset: -14px -16px; }',
    '[data-lib] .lib-pv-go .lib-sort-label { font: inherit; letter-spacing: inherit; color: inherit; }',
    '[data-lib] .lib-pv-go .lib-sort-arrow { font-size: 1.1em; line-height: 1; color: inherit; transition: transform .45s cubic-bezier(.3,1.7,.55,1); }',
    '@media (hover: hover) and (pointer: fine) { [data-lib] .lib-pv-go:hover .lib-sort-arrow { transform: translateX(.35em); } }',
    '[data-lib] .lib-pv-go:focus-visible .lib-sort-arrow { transform: translateX(.35em); }',
    '[data-lib] .lib-pv-close { display: none !important; }',
    '[data-lib] .lib-pv-media img { display: block; height: 100%; width: auto; max-width: 100%; object-fit: contain; object-position: left top; }',
    '[data-lib].is-pv-dim .lib-wheel { opacity: .25; }',
    '@media (hover: hover) and (pointer: fine) { [data-lib].is-pv-dim .lib-wheel { filter: blur(8px); } }',
    '[data-lib].is-pv-dim .lib-bottom { opacity: 0; }',
    '.lib-fly { position: fixed; left: 0; top: 0; z-index: 60; pointer-events: none; transform-origin: 0 0; will-change: transform; overflow: hidden; }',
    '.lib-fly img { display: block; width: 100%; height: 100%; object-fit: cover; }',
    /* Menü-Knopf (wie library.js) */
    'html.lib-on.mh-js .menu-toggle-wrap.mh-on.mh-on { translate: 0 var(--mh-drop); transition: opacity var(--menu-dur) var(--menu-ease-out), visibility 0s, translate var(--mh-down) var(--mh-ease-down); }',
    'html.lib-on.mh-js .menu-toggle-wrap.mh-on.mh-on.lib-mb-small { scale: .55; }',
    'html.lib-on.mh-js .menu-toggle-wrap.mh-on.mh-on.lib-mb { translate: 0 0; scale: 1; will-change: translate, scale; transition: opacity var(--menu-dur) var(--menu-ease-out), visibility 0s, translate var(--hp-mb-up, .85s) var(--hp-mb-ease, cubic-bezier(.3, 1.9, .5, 1)), scale var(--hp-mb-up2, .85s) var(--hp-mb-ease2, cubic-bezier(.3, 1.9, .5, 1)); }',
    '@media (prefers-reduced-motion: reduce) { [data-lib] .lib-wheel { transition-duration: .01s; } .gx-dot { animation: none; } }'
  ].join('\n');

  // ---------- kleine Helfer ----------
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function mod(a, n) { return ((a % n) + n) % n; }
  function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInCubic(t) { return t * t * t; }
  function rng(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function strSeed(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h; }

  // Lichtpunkt: sofort beim Laden da (Fortsetzung des Röhren-TV von der Homepage)
  var dot = null;
  function showDot() {
    if (dot || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    dot = document.createElement('div');
    dot.className = 'gx-dot'; dot.setAttribute('aria-hidden', 'true');
    document.documentElement.appendChild(dot);
  }

  function init(root) {
    if (root.__lib) return;
    root.__lib = true;

    var html = document.documentElement;
    var stage = root.querySelector('.lib-stage');
    if (!stage) return;
    var top = root.querySelector('.lib-top');
    var sortBtn = root.querySelector('.lib-sort');
    var sortLabel = root.querySelector('.lib-sort-label');
    var pv = root.querySelector('.lib-pv');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var mouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    root.classList.toggle('is-mouse', mouse);

    var sphere = document.createElement('div'); sphere.className = 'gx-sphere'; sphere.setAttribute('aria-hidden', 'true');
    var wheel = document.createElement('div'); wheel.className = 'lib-wheel';
    stage.appendChild(sphere); stage.appendChild(wheel);

    // ---------- Projekte einlesen (nur aus dem eigenen Ordner) ----------
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
        w: 0, h: 0, used: false
      };
    }).filter(function (p) {
      var ok = p.img && (!folder || p.path.indexOf(folder) === 0);
      if (!ok) p.el.style.display = 'none';
      return ok;
    });
    all.forEach(function (p) {
      wheel.appendChild(p.el);
      if (p.a) p.a.setAttribute('draggable', 'false');
      if (p.img) { p.img.setAttribute('draggable', 'false'); if (p.img.loading === 'lazy') p.img.loading = 'eager'; }
    });
    [].forEach.call(root.querySelectorAll('[role="list"],[role="listitem"]'), function (e) { e.removeAttribute('role'); });

    var projects = all.slice();   // aktuelle Auswahl (Sortierung)
    var slots = [];               // Karten auf der Fläche
    var clones = [];
    var VW = 1, VH = 1, WW = 1, WH = 1, PAD = 0;
    var cam = { x: 0, y: 0 }, vel = { x: 0, y: 0 };
    var mode = 'load';            // load | bang | idle | gather | pv
    var raf = 0, last = 0, bangAt = 0, gatherAt = 0, debris = [];

    // ---------- Masse und Anordnung ----------
    // Kartengrösse aus dem Designer (Karte mit weissem Rand, Bild mit fester Höhe, Breite nach Seitenverhältnis)
    function measureCards() {
      all.forEach(function (p) {
        var t = p.el.style.transform; p.el.style.transform = 'none';
        var w = p.el.offsetWidth, h = p.el.offsetHeight;
        if ((!w || w < 4) && p.img.naturalWidth) {
          var ih = p.img.offsetHeight || h; w = ih * p.img.naturalWidth / p.img.naturalHeight + (p.a ? p.a.offsetWidth - p.img.offsetWidth : 0);
        }
        p.w = w || 200; p.h = h || 260;
        p.el.style.transform = t;
      });
    }
    function order(n, R) {
      // Projekte in gemischter Reihenfolge, nie zweimal dasselbe direkt nebeneinander (wenn möglich)
      var out = [], bag = [];
      for (var k = 0; k < n; k++) {
        if (!bag.length) { bag = projects.slice(); for (var i = bag.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), t = bag[i]; bag[i] = bag[j]; bag[j] = t; } }
        var pick = 0;
        if (projects.length > 1 && out.length && bag[0] === out[out.length - 1]) pick = bag.length > 1 ? 1 : 0;
        out.push(bag.splice(pick, 1)[0]);
      }
      return out;
    }
    function build() {
      VW = window.innerWidth; VH = window.innerHeight;
      var mob = VW < 768;
      measureCards();
      // alte Kopien weg, Originale zurücksetzen
      clones.forEach(function (c) { c.remove(); }); clones = [];
      all.forEach(function (p) { p.used = false; p.el.classList.remove('is-vis'); p.el.style.opacity = '0'; });
      slots = [];
      if (!projects.length) return;
      var sz = mob ? CONFIG.size.mobile : CONFIG.size.desktop;
      var avgW = 0, maxD = 0;
      projects.forEach(function (p) { avgW += p.w; maxD = Math.max(maxD, Math.hypot(p.w, p.h)); });
      avgW = avgW / projects.length * (sz[0] + sz[1]) / 2;
      var few = clamp((CONFIG.fewFrom - projects.length) / (CONFIG.fewFrom - 2), 0, 1);
      var cell = avgW * (mob ? CONFIG.cell.mobile : CONFIG.cell.desktop) * (1 + CONFIG.fewCell * few);
      var holes = CONFIG.holes + CONFIG.fewHoles * few, jit = CONFIG.jitter + CONFIG.fewJitter * few;
      var rowH = cell * 1.05;
      PAD = maxD * sz[1] / 2 + 4;
      var cols = Math.max(3, Math.ceil((VW + 2 * PAD) / cell) + 1);
      var rows = Math.max(3, Math.ceil((VH + 2 * PAD) / rowH) + 1);
      WW = cols * cell; WH = rows * rowH;
      var R = rng(CONFIG.seed + strSeed(location.pathname + (current || '') + (mob ? 'm' : 'd')));
      var list = order(cols * rows, R), k = 0;
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var p = list[k++];
        if (R() < holes) continue;
        var el;
        if (!p.used) { el = p.el; p.used = true; }
        else {
          el = p.el.cloneNode(true);
          el.setAttribute('aria-hidden', 'true');
          var ca = el.querySelector('a'); if (ca) { ca.setAttribute('tabindex', '-1'); ca.setAttribute('draggable', 'false'); }
          var ci = el.querySelector('img'); if (ci) { ci.setAttribute('draggable', 'false'); ci.loading = 'eager'; }
          wheel.appendChild(el); clones.push(el);
        }
        var s = sz[0] + R() * (sz[1] - sz[0]);
        var d = CONFIG.depth[0] + R() * (CONFIG.depth[1] - CONFIG.depth[0]);
        el.style.zIndex = Math.round(d * 100);
        slots.push({
          p: p, el: el, a: el.querySelector('a.lib-card') || el.querySelector('a'), img: el.querySelector('img'),
          s: s, d: d, w: p.w, h: p.h,
          x: c * cell + cell / 2 + (r % 2) * cell / 2 + (R() - .5) * cell * jit,   // Reihen versetzt (kein Raster sichtbar)
          y: r * rowH + rowH / 2 + (R() - .5) * rowH * jit,
          rot: (R() - .5) * 2 * CONFIG.spin, dl: R() * CONFIG.flyDelay,
          dur: CONFIG.flyMs[0] + R() * (CONFIG.flyMs[1] - CONFIG.flyMs[0]), s0: .03 + R() * .05,
          off: false
        });
      }
      // Start so, dass die Fläche mittig liegt
      cam.x = -(WW - VW) / 2; cam.y = -(WH - VH) / 2;
    }
    // Lage einer Karte auf dem Bildschirm (Mitte), endlos in beide Richtungen
    function pos(sl) {
      return { x: mod(sl.x + cam.x * sl.d + PAD, WW) - PAD, y: mod(sl.y + cam.y * sl.d + PAD, WH) - PAD };
    }
    function place(sl, x, y, scale, rot) {
      var t = 'translate3d(' + (x - sl.w / 2).toFixed(1) + 'px,' + (y - sl.h / 2).toFixed(1) + 'px,0) scale(' + (sl.s * scale).toFixed(4) + ')';
      if (rot) t += ' rotate(' + rot.toFixed(2) + 'deg)';
      sl.el.style.transform = t;
      // ausserhalb des Bildschirms nicht zeichnen
      var hw = sl.w * sl.s * scale / 2 + 2, hh = sl.h * sl.s * scale / 2 + 2;
      var off = x + hw < 0 || x - hw > VW || y + hh < 0 || y - hh > VH;
      if (off !== sl.off) { sl.off = off; sl.el.classList.toggle('is-off', off); }
    }

    // ---------- Schleife ----------
    function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    function frame(now) {
      raf = 0;
      var dtf = last ? Math.min(3, (now - last) / 16.67) : 1; last = now;
      var cx = VW / 2, cy = VH / 2, more = false, i, sl, f;

      if (mode === 'bang') {
        var tb = now - bangAt;
        var sp = clamp(tb / CONFIG.sphereMs, 0, 1);
        sphere.style.transform = 'translate(-50%,-50%) scale(' + easeOutCubic(sp).toFixed(4) + ')';
        sphere.style.opacity = sp < 1 ? '1' : (1 - clamp((tb - CONFIG.sphereMs) / CONFIG.fadeMs, 0, 1)).toFixed(3);
        var sk = Math.max(0, 1 - tb / CONFIG.shakeMs) * CONFIG.shakePx;
        wheel.style.transform = sk ? 'translate3d(' + ((Math.random() - .5) * 2 * sk).toFixed(1) + 'px,' + ((Math.random() - .5) * 2 * sk).toFixed(1) + 'px,0)' : '';
        debris.forEach(function (d) {
          var q = clamp(tb / d.dur, 0, 1), e = easeOutCubic(q);
          d.el.style.opacity = (q < .08 ? q / .08 : 1 - clamp((q - .45) / .55, 0, 1)).toFixed(3);
          d.el.style.transform = 'translate3d(' + (cx - d.w / 2 + d.tx * e).toFixed(1) + 'px,' + (cy - d.h / 2 + d.ty * e).toFixed(1) + 'px,0) rotate(' + (d.rot * e).toFixed(1) + 'deg) scale(' + (.05 + 2.6 * e).toFixed(3) + ')';
        });
        if (!drag) inertia(dtf);
        var done = true;
        for (i = 0; i < slots.length; i++) {
          sl = slots[i]; f = pos(sl);
          var q = clamp((tb - sl.dl) / sl.dur, 0, 1);
          if (q < 1) done = false;
          var e = easeOutExpo(q), es = easeOutCubic(clamp(q * 1.6, 0, 1));
          sl.el.style.opacity = Math.min(1, q * 10).toFixed(3);
          place(sl, cx + (f.x - cx) * e, cy + (f.y - cy) * e, sl.s0 / sl.s + (1 - sl.s0 / sl.s) * es, sl.rot * (1 - e));
        }
        if (tb > 300 && !root.classList.contains('is-in')) { root.classList.add('is-in'); mbShow(); }
        if (done && tb > CONFIG.sphereMs + CONFIG.fadeMs) {
          mode = 'idle'; wheel.style.transform = ''; sphere.style.opacity = '0';
          debris.forEach(function (d) { d.el.remove(); }); debris = [];
        }
        more = true;
      } else if (mode === 'gather') {
        var tg = clamp((now - gatherAt) / CONFIG.gatherMs, 0, 1), eg = easeInCubic(tg);
        for (i = 0; i < slots.length; i++) {
          sl = slots[i]; f = sl.from;
          place(sl, f.x + (cx - f.x) * eg, f.y + (cy - f.y) * eg, 1 - .96 * eg, sl.rot * eg * .5);
          sl.el.style.opacity = (1 - clamp((tg - .7) / .3, 0, 1)).toFixed(3);
        }
        if (tg >= 1) { gatherDone(); return; }
        more = true;
      } else if (mode === 'idle') {
        var moving = drag || Math.abs(vel.x) > .05 || Math.abs(vel.y) > .05 || dirty;
        if (!drag) inertia(dtf);
        if (moving) { for (i = 0; i < slots.length; i++) { sl = slots[i]; f = pos(sl); place(sl, f.x, f.y, 1, 0); } dirty = false; }
        more = drag || Math.abs(vel.x) > .05 || Math.abs(vel.y) > .05;
      }
      if (more) raf = requestAnimationFrame(frame);
    }
    var dirty = false;
    function redraw() { dirty = true; kick(); }
    function inertia(dtf) {
      cam.x += vel.x * dtf; cam.y += vel.y * dtf;
      var fr = Math.pow(CONFIG.friction, dtf); vel.x *= fr; vel.y *= fr;
      if (Math.abs(vel.x) < .05) vel.x = 0; if (Math.abs(vel.y) < .05) vel.y = 0;
    }

    // ---------- Urknall ----------
    function bang() {
      if (dot) { dot.remove(); dot = null; }
      VW = window.innerWidth; VH = window.innerHeight;
      if (reduce || !slots.length) {
        slots.forEach(function (sl) { sl.el.classList.add('is-vis'); sl.el.style.opacity = '1'; var f = pos(sl); place(sl, f.x, f.y, 1, 0); });
        mode = 'idle'; root.classList.add('is-in'); mbShow(); return;
      }
      var diag = Math.hypot(VW, VH) * 1.5;
      sphere.style.width = sphere.style.height = diag + 'px';
      sphere.style.left = VW / 2 + 'px'; sphere.style.top = VH / 2 + 'px';
      slots.forEach(function (sl) { sl.el.style.opacity = '0'; sl.el.classList.add('is-vis'); });
      // Trümmer: ein paar Bilder fliegen an der Kamera vorbei
      debris = [];
      var R = rng(Date.now() & 4095), m = Math.min(VW, VH);
      for (var i = 0; i < Math.min(CONFIG.debris, Math.max(2, projects.length * 2)); i++) {
        var p = projects[i % projects.length];
        var src = p.img.currentSrc || p.img.src; if (!src) continue;
        var ar = p.img.naturalWidth ? p.img.naturalWidth / p.img.naturalHeight : .8;
        var w = m * (.22 + R() * .16), h = w / ar, ang = R() * Math.PI * 2;
        var el = document.createElement('div');
        el.className = 'lib-fly'; el.style.width = w + 'px'; el.style.height = h + 'px'; el.style.zIndex = '15'; el.style.opacity = '0';
        var im = document.createElement('img'); im.src = src; im.alt = ''; el.appendChild(im);
        root.appendChild(el);
        debris.push({ el: el, w: w, h: h, tx: Math.cos(ang) * VW * 1.1, ty: Math.sin(ang) * VH * 1.1, rot: (R() - .5) * 120, dur: 520 + R() * 260 });
      }
      mode = 'bang'; bangAt = performance.now(); kick();
    }
    // Punkt fällt zusammen, Stille, dann Knall
    function implode(then) {
      if (reduce || !dot) { then(); return; }
      dot.classList.add('is-go');
      var t0 = performance.now();
      (function f(now) {
        var t = (now - t0) / CONFIG.implodeMs;
        if (t < 1) { dot.style.transform = 'scale(' + (1.25 - 1.17 * easeInCubic(t)).toFixed(3) + ')'; requestAnimationFrame(f); return; }
        dot.style.opacity = '0';
        setTimeout(then, CONFIG.silenceMs);
      })(t0);
    }

    // ---------- Ziehen, Tippen ----------
    var drag = null, down = null;
    root.addEventListener('pointerdown', function (e) {
      if (mode === 'load' || mode === 'gather' || root.classList.contains('is-pv')) return;
      if (e.target.closest('.lib-top, .lib-pv')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY, id: e.pointerId, touch: e.pointerType !== 'mouse', lx: e.clientX, ly: e.clientY, t: performance.now(), moved: false };
      vel.x = vel.y = 0;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down || e.pointerId !== down.id) return;
      if (!down.moved) {
        if (Math.abs(e.clientX - down.x) < CONFIG.tapSlop && Math.abs(e.clientY - down.y) < CONFIG.tapSlop) return;
        down.moved = true; drag = down; root.classList.add('is-dragging');
        down.lx = e.clientX; down.ly = e.clientY; down.t = performance.now();
        return;
      }
      var now = performance.now(), k = down.touch ? CONFIG.speedTouch : CONFIG.speedMouse;
      var dx = (e.clientX - down.lx) * k, dy = (e.clientY - down.ly) * k, dt = Math.max(1, now - down.t);
      cam.x += dx; cam.y += dy;
      vel.x = .7 * (dx / dt * 16.67) + .3 * vel.x; vel.y = .7 * (dy / dt * 16.67) + .3 * vel.y;
      down.lx = e.clientX; down.ly = e.clientY; down.t = now;
      if (mode === 'idle') redraw(); else kick();
    });
    function release(e, cancelled) {
      if (!down || (e && e.pointerId !== down.id)) return;
      var d = down; down = null;
      root.classList.remove('is-dragging');
      if (d.moved) {
        drag = null;
        if (cancelled || performance.now() - d.t > 90) { vel.x = vel.y = 0; }   // still gehalten: kein Schwung
        var v = Math.hypot(vel.x, vel.y);
        if (v > CONFIG.flickMax) { vel.x *= CONFIG.flickMax / v; vel.y *= CONFIG.flickMax / v; }
        kick();
      } else if (!cancelled && mode === 'idle') {
        tap(d.x, d.y);
      }
    }
    window.addEventListener('pointerup', function (e) { release(e, false); });
    window.addEventListener('pointercancel', function (e) { release(e, true); });
    root.addEventListener('dragstart', function (e) { e.preventDefault(); });
    root.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1 || root.classList.contains('is-pv')) return;
      if (e.target.closest('.lib-top, .lib-pv, a:not(.lib-card), [role="button"]')) return;
      var x = e.touches[0].clientX;
      if (x < CONFIG.edgeGuard || x > window.innerWidth - CONFIG.edgeGuard) e.preventDefault();
    }, { passive: false });
    // Klick auf eine Karte öffnet nie direkt die Seite, sondern die Vorschau
    root.addEventListener('click', function (e) {
      var a = e.target.closest('a.lib-card');
      if (!a) return;
      e.preventDefault();
      if (e.detail === 0 && mode === 'idle') {   // Tastatur (Enter)
        var sl = slots.filter(function (s) { return s.a === a; })[0];
        if (sl) openPreview(sl);
      }
    });
    function slotAt(x, y) {
      var el = document.elementFromPoint(x, y), item = el && el.closest('.lib-item');
      if (!item) return null;
      for (var i = 0; i < slots.length; i++) if (slots[i].el === item) return slots[i];
      return null;
    }
    function tap(x, y) { var sl = slotAt(x, y); if (sl) openPreview(sl); }

    // Trackpad und Mausrad: Fläche verschieben
    root.addEventListener('wheel', function (e) {
      if (e.target.closest && e.target.closest('.lib-pv-panel, .lib-sort-list')) return;
      e.preventDefault();
      if (mode !== 'idle' || root.classList.contains('is-pv')) return;
      var k = e.deltaMode === 1 ? 32 : 1;
      cam.x -= e.deltaX * k; cam.y -= e.deltaY * k; vel.x = vel.y = 0;
      redraw();
    }, { passive: false });

    // Tastatur
    document.addEventListener('keydown', function (e) {
      if (html.classList.contains('menu-open')) return;
      if (root.classList.contains('is-pv')) { if (e.key === 'Escape') { e.preventDefault(); closePreview(); } return; }
      if (top && top.classList.contains('is-open') && e.key === 'Escape') { setOpen(false); return; }
      if (mode !== 'idle') return;
      var s = 16, hit = true;
      if (e.key === 'ArrowLeft') vel.x = s; else if (e.key === 'ArrowRight') vel.x = -s;
      else if (e.key === 'ArrowUp') vel.y = s; else if (e.key === 'ArrowDown') vel.y = -s; else hit = false;
      if (hit) { e.preventDefault(); kick(); }
    });

    // ---------- Menü-Knopf (wie library.js) ----------
    function mbWrap() { return document.querySelector('.menu-toggle-wrap'); }
    function mbShow() {
      var w = mbWrap(); if (!w || w.classList.contains('lib-mb')) return;
      w.classList.add('mh-now', 'lib-mb-small'); void w.offsetWidth; w.classList.remove('mh-now');
      requestAnimationFrame(function () { w.classList.remove('lib-mb-small'); w.classList.add('lib-mb'); });
    }
    var mbBtn = null, mbOrig = 'menu', mbT = 0, mbT2 = 0;
    function mbButton() {
      if (mbBtn) return mbBtn;
      mbBtn = document.querySelector('.menu-toggle-wrap [data-menu-open]') || document.querySelector('.menu-toggle-wrap .is-menu');
      if (mbBtn) mbOrig = mbBtn.textContent.trim() || 'menu';
      return mbBtn;
    }
    function mbSwap(toClose, popAt) {
      var w = mbWrap(), b = mbButton(); if (!w || !b) return;
      clearTimeout(mbT); clearTimeout(mbT2);
      w.classList.remove('lib-mb');
      var dropMs = 500;
      try { var v = getComputedStyle(html).getPropertyValue('--mh-down').trim(); dropMs = parseFloat(v) * (v.indexOf('ms') > -1 ? 1 : 1000) || 500; } catch (e) {}
      mbT = setTimeout(function () {
        b.textContent = toClose ? (pvClose && pvClose.textContent.trim()) || 'close' : mbOrig;
        b.setAttribute('aria-label', toClose ? 'Vorschau schliessen' : 'Menü öffnen');
        w.classList.add('mh-now', 'lib-mb-small'); void w.offsetWidth; w.classList.remove('mh-now');
      }, Math.min(dropMs, popAt - 30));
      mbT2 = setTimeout(function () { w.classList.remove('lib-mb-small'); w.classList.add('lib-mb'); }, Math.max(popAt, dropMs + 40));
    }
    function mbIntercept(e) {
      if (!root.classList.contains('is-pv')) return;
      var t = e.target.closest && e.target.closest('.menu-toggle-wrap');
      if (!t) return;
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault(); e.stopImmediatePropagation();
      closePreview();
    }
    window.addEventListener('click', mbIntercept, true);
    window.addEventListener('keydown', mbIntercept, true);
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
          var hs = html.style, d1 = settle(0.45, 1.3), d2 = settle(0.42, 1.6);
          hs.setProperty('--hp-mb-ease', spring(0.45, 1.3, d1, 90)); hs.setProperty('--hp-mb-up', d1.toFixed(2) + 's');
          hs.setProperty('--hp-mb-ease2', spring(0.42, 1.6, d2, 90)); hs.setProperty('--hp-mb-up2', d2.toFixed(2) + 's');
        }
      } catch (e) {}
    })();

    // ---------- Sortierung: neuer Urknall ----------
    var sortItems = [].slice.call(root.querySelectorAll('.lib-sort-item'));
    var allLabel = sortLabel ? sortLabel.textContent.trim() : 'Alle Projekte';
    var current = '';
    var usedCats = {};
    all.forEach(function (p) { p.cats.forEach(function (c) { usedCats[c] = true; }); });
    if (sortItems.length && Object.keys(usedCats).length) {
      sortItems.forEach(function (s) { if (!usedCats[s.textContent.trim()]) s.classList.add('is-empty'); });
      var allItem = sortItems[0].cloneNode(true);
      allItem.textContent = allLabel;
      allItem.setAttribute('data-all', '');
      sortItems[0].parentNode.insertBefore(allItem, sortItems[0]);
      sortItems.unshift(allItem);
    } else if (top) {
      top.style.display = 'none';
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
    function select() { projects = all.filter(function (p) { return !current || p.cats.indexOf(current) > -1; }); }
    function applyFilter() {
      if (mode === 'load' || mode === 'gather') return;
      vel.x = vel.y = 0; drag = null; down = null;
      if (reduce) { select(); build(); bang(); return; }
      // alle sichtbaren Karten fallen zurück in den Punkt
      mode = 'gather'; gatherAt = performance.now();
      slots.forEach(function (sl) { sl.from = pos(sl); });
      kick();
    }
    function gatherDone() {
      slots.forEach(function (sl) { sl.el.classList.remove('is-vis'); });
      showDot();
      if (dot) { dot.style.animation = 'none'; dot.style.transform = 'scale(1.3)'; }
      select(); build();
      setTimeout(function () { implode(bang); }, 120);
    }

    // ---------- Vorschau (wie library.js) ----------
    var pvPanel = pv && pv.querySelector('.lib-pv-panel');
    var pvMedia = pv && pv.querySelector('.lib-pv-media');
    var pvName = pv && pv.querySelector('.lib-pv-name');
    var pvYear = pv && pv.querySelector('.lib-pv-year');
    var pvText = pv && pv.querySelector('.lib-pv-text');
    var pvOpen = pv && pv.querySelector('.lib-pv-open');
    var pvClose = pv && pv.querySelector('.lib-pv-close');
    if (pvOpen) {
      var goTxt = pvOpen.textContent.trim() || 'Galerie öffnen';
      pvOpen.classList.remove('grey', 'is-menu');
      pvOpen.classList.add('lib-pv-go');
      pvOpen.textContent = '';
      var gl1 = document.createElement('span'); gl1.className = 'lib-sort-label'; gl1.textContent = goTxt;
      var gl2 = document.createElement('span'); gl2.className = 'lib-sort-arrow'; gl2.setAttribute('aria-hidden', 'true'); gl2.textContent = '→';
      pvOpen.appendChild(gl1); pvOpen.appendChild(gl2);
    }
    var pvSlot = null, lastFocus = null, pvTimer2 = 0, pvAt = 0, pvFrame = null, pvAnim = null, pvState = '';
    if (pv) {
      pv.setAttribute('role', 'dialog'); pv.setAttribute('aria-modal', 'true'); pv.setAttribute('aria-hidden', 'true'); if ('inert' in pv) pv.inert = true;
      pvFrame = document.createElement('div'); pvFrame.className = 'lib-pv-frame'; pvFrame.setAttribute('aria-hidden', 'true'); pv.insertBefore(pvFrame, pv.firstChild);
    }
    function cloneImg(img) { var c = document.createElement('img'); c.src = img.currentSrc || img.src; c.decoding = 'sync'; c.alt = img.alt || ''; return c; }
    function fly(img, a, b, ms, done) {
      var f = document.createElement('div');
      f.className = 'lib-fly';
      f.style.width = b.width + 'px'; f.style.height = b.height + 'px';
      var c = document.createElement('img'); c.decoding = 'sync'; c.src = img.currentSrc || img.src; c.alt = '';
      f.appendChild(c); root.appendChild(f);
      var from = 'translate(' + a.left + 'px,' + a.top + 'px) scale(' + (a.width / b.width) + ',' + (a.height / b.height) + ')';
      var to = 'translate(' + b.left + 'px,' + b.top + 'px) scale(1,1)';
      var an = f.animate([{ transform: from }, { transform: to }], { duration: reduce ? 1 : ms, easing: EASE, fill: 'both' });
      an.onfinish = function () { if (done) done(); requestAnimationFrame(function () { f.remove(); }); };
    }
    function rect(r) { return { left: r.left, top: r.top, width: r.width, height: r.height }; }
    function box(r) { return 'translate(' + r.left + 'px,' + r.top + 'px) scale(' + (r.width / 100) + ',' + (r.height / 100) + ')'; }
    function frameTo(keys, ms, done) {
      if (pvAnim) pvAnim.cancel();
      pvAnim = pvFrame.animate(keys, { duration: reduce ? 1 : ms, fill: 'forwards' });
      pvAnim.onfinish = function () { if (done) done(); };
    }
    function mbTop() {
      var w = mbWrap(), H = window.innerHeight;
      if (!w) return H;
      return H - (parseFloat(getComputedStyle(w).bottom) || 0) - w.offsetHeight;
    }
    function fitPanel() {
      pvPanel.style.maxHeight = Math.max(200, mbTop() - window.innerHeight * CONFIG.pvGap) + 'px';
      return { left: 0, top: 0, width: pvPanel.offsetWidth, height: pvPanel.offsetHeight };
    }
    function mediaRect(sl) {
      var mr = pvMedia.getBoundingClientRect();
      var ar = sl.img.naturalWidth ? sl.img.naturalWidth / sl.img.naturalHeight : sl.w / sl.h;
      var maxW = parseFloat(getComputedStyle(pvMedia).maxWidth) || Infinity;
      var h = mr.height, w = Math.min(maxW, h * ar); h = w / ar;
      return { left: mr.left, top: mr.top, width: w, height: h };
    }
    function openPreview(sl) {
      if (!sl || root.classList.contains('is-pv')) return;
      var p = sl.p;
      if (!pv) { location.href = p.href; return; }
      vel.x = vel.y = 0;
      pvSlot = sl; lastFocus = document.activeElement; pvAt = performance.now();
      setOpen(false);
      clearTimeout(pvTimer2);
      if (pvMedia) { pvMedia.innerHTML = ''; pvMedia.appendChild(cloneImg(sl.img)); }
      if (pvName) pvName.textContent = p.name;
      if (pvYear) pvYear.textContent = p.year;
      if (pvText) pvText.innerHTML = p.html;
      if (pvOpen) pvOpen.setAttribute('href', p.href);
      pv.setAttribute('aria-hidden', 'false'); if ('inert' in pv) pv.inert = false;
      mbSwap(true, reduce ? 0 : CONFIG.pvMs * 0.72);
      prefetch(p.href, sl.img);
      pvPanel.scrollTop = 0;
      var panelR = fitPanel();
      var target = pvMedia && pvMedia.firstChild;
      if (!target) { pvFrame.style.transform = box(panelR); root.classList.add('is-pv', 'is-pv-dim', 'is-pv-in'); mode = 'pv'; return; }
      var b = mediaRect(sl);
      var a = rect(sl.img.getBoundingClientRect());
      var cardR = rect((sl.a || sl.img).getBoundingClientRect());
      var D = CONFIG.pvMs;
      target.style.width = b.width + 'px'; target.style.height = b.height + 'px'; target.style.maxWidth = 'none';
      target.classList.add('is-wait');
      sl.el.style.visibility = 'hidden';
      mode = 'pv'; pvState = 'opening';
      pvFrame.style.transform = box(cardR);
      root.classList.add('is-pv', 'is-pv-dim');
      frameTo([{ transform: box(cardR), easing: EASE }, { transform: box(panelR) }], D, function () {
        pvFrame.style.transform = box(panelR); if (pvState === 'opening') pvState = 'open';
      });
      fly(sl.img, a, b, D, function () { target.classList.remove('is-wait'); });
      pvTimer2 = setTimeout(function () {
        if (pvSlot !== sl || !root.classList.contains('is-pv')) return;
        root.classList.add('is-pv-in');
      }, reduce ? 0 : D * 0.55);
    }
    function closePreview() {
      if (!root.classList.contains('is-pv') || pvState === 'closing') return;
      var sl = pvSlot, target = pvMedia && pvMedia.firstChild;
      pvSlot = null; pvState = 'closing';
      mbSwap(false, reduce ? 0 : CONFIG.pvCloseMs * 0.72 + 300);
      clearTimeout(pvTimer2);
      window.hsVT = null;
      root.classList.remove('is-pv-in', 'is-pv-dim');
      pv.setAttribute('aria-hidden', 'true'); if ('inert' in pv) pv.inert = true;
      if (document.activeElement && pv.contains(document.activeElement)) document.activeElement.blur();
      function finish() {
        if (pvAnim) { pvAnim.cancel(); pvAnim = null; }
        root.classList.remove('is-pv');
        pvState = ''; mode = 'idle';
      }
      if (!sl || !target) { finish(); return; }
      pvPanel.scrollTop = 0;
      var panelR = { left: 0, top: 0, width: pvPanel.offsetWidth, height: pvPanel.offsetHeight };
      var b = mediaRect(sl);
      var cardR = rect((sl.a || sl.img).getBoundingClientRect());
      var a = rect(sl.img.getBoundingClientRect());
      var from = getComputedStyle(pvFrame).transform;
      frameTo([{ transform: from && from !== 'none' ? from : box(panelR), easing: EASE }, { transform: box(cardR) }], CONFIG.pvCloseMs, function () {
        sl.el.style.visibility = '';
        requestAnimationFrame(finish);
      });
      target.classList.add('is-wait');
      fly(sl.img, b, a, CONFIG.pvCloseMs);
      if (lastFocus && lastFocus.focus && lastFocus !== document.body) lastFocus.focus({ preventScroll: true });
    }
    if (pvClose) {
      pvClose.setAttribute('role', 'button'); pvClose.setAttribute('tabindex', '0');
      pvClose.addEventListener('click', function (e) { e.preventDefault(); closePreview(); });
    }
    if (pv) pv.addEventListener('click', function (e) {
      if (performance.now() - pvAt < 450) return;
      if (!e.target.closest('.lib-pv-panel')) closePreview();
    });
    // Projektseite und ihr Titelbild vorladen (gleiche Grösse wie dort)
    var prefetched = {};
    function prefetch(href, img) {
      if (!href || prefetched[href]) return;
      prefetched[href] = true;
      var l = document.createElement('link'); l.rel = 'prefetch'; l.href = href; document.head.appendChild(l);
      if (img) {
        var pre = new Image();
        pre.sizes = '(max-width: 767px) 100vw, 34vw';
        if (img.srcset) pre.srcset = img.srcset;
        pre.src = img.src;
        if (pre.decode) pre.decode().catch(function () {});
      }
    }
    // «Galerie öffnen»: Flug in die Projektseite anmelden (Website-Head, SEITENÜBERGÄNGE) und selbst navigieren
    if (pvOpen) pvOpen.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
      var img = pvMedia && pvMedia.firstChild, href = pvOpen.href, to = '';
      try { to = new URL(href, location.href).pathname; } catch (er) {}
      if (!to) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (img) window.hsVT = { to: to, el: img, sel: '.pg-hero-media' };
      location.href = href;
    });

    // ---------- Start ----------
    var started = false, t0 = performance.now();
    function start() {
      if (started) return;
      started = true;
      build();
      var wait = Math.max(0, CONFIG.dotMinMs - (performance.now() - t0));
      setTimeout(function () { implode(bang); }, reduce ? 0 : wait);
    }
    // Auf alle Titelbilder warten (höchstens waitMax): der Lichtpunkt ist die Ladeanzeige
    Promise.all(all.map(function (p) {
      var im = p.img;
      if (im.complete && im.naturalWidth) return im.decode ? im.decode().catch(function () {}) : Promise.resolve();
      return new Promise(function (res) { im.addEventListener('load', res, { once: true }); im.addEventListener('error', res, { once: true }); })
        .then(function () { return im.decode ? im.decode().catch(function () {}) : null; });
    })).then(start);
    setTimeout(start, CONFIG.waitMax);

    // Grösse ändern (Drehen am Handy): neu anordnen, ohne neuen Urknall
    var rT = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(function () {
        if (!started || mode !== 'idle' || Math.abs(window.innerWidth - VW) < 2 && Math.abs(window.innerHeight - VH) < 120) return;
        build();
        slots.forEach(function (sl) { sl.el.classList.add('is-vis'); sl.el.style.opacity = '1'; });
        redraw();
      }, 120);
    });
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      // Zurück aus der Projektseite: Vorschau bleibt offen, das Bild fliegt dorthin zurück
      if (dot) { dot.remove(); dot = null; }
      redraw();
    });
  }

  // Stil, Seitenklasse und Lichtpunkt sofort setzen (vor dem ersten Bild)
  var styled = false;
  function style() {
    if (styled || !document.querySelector('[data-lib]')) return;
    styled = true;
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
    document.documentElement.classList.add('lib-on', 'gx-ready');   // gx-ready: Ersatz-Punkt aus dem Seiten-Head aus, ab jetzt zeichnet dieser Code den Punkt
    showDot();
  }
  function boot() {
    style();
    [].forEach.call(document.querySelectorAll('[data-lib]'), init);
  }
  style();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
