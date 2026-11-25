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
    // Hugo 25.11. (07:00): Bilder ohne weissen Rahmen (die Vorschau geht weiterhin weiss aus dem Bild auf) und näher zusammen
    size:      { desktop: [0.5, 0.85], mobile: [0.48, 0.78] },   // Kartengrösse: Anteil der Grösse aus dem Designer (lib-img 30vh / 46vw)
    cell:      { desktop: 1.4, mobile: 1.32 },   // Hugo 25.11. (07:03): wieder etwas mehr Abstand (vorher 1.18 / 1.12)   // Rasterabstand als Vielfaches der mittleren Kartenbreite (kleiner = dichter, mehr Überlappen)
    jitter:    0.5,     // wie weit eine Karte von ihrem Rasterplatz abweicht (Anteil vom Raster)
    holes:     0.08,    // Anteil leerer Rasterplätze
    // Wenige Projekte (Singer 2, Model 5): mehr Luft und mehr leere Plätze, damit es nicht wie eine Tapete aussieht.
    // Bei fewFrom Projekten und weniger wächst das Raster um bis zu fewCell und die Lücken um bis zu fewHoles.
    fewFrom:   7, fewCell: 0.3, fewHoles: 0.25, fewJitter: 0.3,
    depth:     [0.62, 1.24],   // Tempo beim Ziehen pro Karte (Tiefe): grössere Zahl = bewegt sich mehr und liegt vorne. Hugo 25.11.: hinten halb so schnell wie vorne
    seed:      7,       // anderer Wert = andere Anordnung
    // Ziehen
    speedTouch: 1.0,    // Fingerweg mal
    speedMouse: 1.0,    // Mausweg mal
    friction:   0.94,   // Nachlaufen pro Bild bei 60 fps (näher an 1 = länger)
    flickMax:   70,     // höchstes Tempo beim Loslassen (px pro Bild)
    tapSlop:    8,      // bis so viele px gilt es als Antippen
    edgeGuard:  24,     // iPhone: Wischen am Rand nicht als «Zurück» (px)
    // Laden und Urknall
    // Hugo 25.11. (06:58): kein Aufladen, kein Ring – sobald geladen, sofort Knall mit der weissen Lichtkugel (wie vorher).
    // Gegen das Einfrieren im Moment des Knalls: Bilder werden während des Punkts entpackt, Flug, Kugel und Erschütterung
    // laufen als Web-Animationen auf dem Grafikchip (vorher Bild für Bild im Haupt-Thread, am iPhone 0.5 s eingefroren).
    waitMax:    2500,   // höchstens so lange auf die Bilder warten
    decodeMax:  900,    // höchstens so lange zusätzlich auf das Entpacken der Kopien warten
    sphereMs:   260,    // Lichtkugel füllt den Bildschirm
    fadeMs:     700,    // Licht blendet aus (Hugo 25.11. 07:05: wie am Anfang – vor dem Licht sieht man die Bilder herausschiessen)
    flyMs:      [1000, 1500],   // Flugdauer der Bilder
    flyDelay:   100,    // zufällige Verzögerung bis
    spin:       70,     // Drehung beim Start (Grad, ±)
    debris:     6,      // Bilder, die quer durchs Blickfeld an der Kamera vorbeifliegen und verblassen
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
  var SIZES = '(max-width: 767px) 60vw, 30vw';
  var css = [
    'html.lib-on, html.lib-on body { height: 100%; overflow: hidden; overscroll-behavior: none; background-color: #000; }',
    '[data-lib] { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }',
    '[data-lib] .lib-stage { height: 100% !important; overflow: hidden; }',
    '[data-lib] .lib-wheel { position: absolute; inset: 0; z-index: 1; transition: opacity .65s ease, filter .65s ease; }',
    '[data-lib] .gx-sphere { position: absolute; left: 0; top: 0; border-radius: 50%; z-index: 0; pointer-events: none; opacity: 0; will-change: transform, opacity;',
    '  background: radial-gradient(circle closest-side, #fff 0, #fff 70%, #ffd6f3 79%, #ff8fe0 83%, #b9a0ff 87%, #8fdcff 91%, #9cf7cf 94%, #fff09a 97%, rgba(255,240,160,0) 100%); }',
    '[data-lib] .lib-item { position: absolute; left: 0; top: 0; visibility: hidden; opacity: 0; will-change: transform; transform-origin: 50% 50%; backface-visibility: hidden; }',
    '[data-lib] .lib-item.is-vis { visibility: visible; }',
    '[data-lib] .lib-item.is-off { visibility: hidden; }',
    '[data-lib] .lib-card, [data-lib] .lib-img { -webkit-user-drag: none; }',
    '[data-lib] .lib-wheel .lib-card { padding: 0 !important; background: transparent !important; }',   /* ohne weissen Rahmen */
    '[data-lib] .lib-img { pointer-events: none; }',
    '[data-lib] .lib-data { display: none !important; }',
    '[data-lib].is-mouse .lib-stage { cursor: grab; }',
    '[data-lib].is-mouse.is-dragging .lib-stage { cursor: grabbing; }',
    /* Kein Zähler, kein Projektname über der Mitte (Hugo 24.11.) */
    '[data-lib] .lib-meta, [data-lib] .ps-index, [data-lib] .ps-progress { display: none !important; }',
    '[data-lib] .lib-top, [data-lib] .lib-bottom { transition: opacity .6s ease; }',
    '[data-lib]:not(.is-in) .lib-top, [data-lib]:not(.is-in) .lib-bottom { opacity: 0; pointer-events: none; }',
    '[data-lib] .lib-bottom { pointer-events: none; }',
    /* Hugo 25.11.: Bereichsname unten (z. B. CREATOR) = Zurück wie der Pfeil im Browser */
    '[data-lib].is-in .lib-bottom .ps-label { pointer-events: auto; cursor: pointer; transition: opacity .25s ease; -webkit-tap-highlight-color: transparent; }',
    /* Hugo 25.11. (07:10): Bereichsname gleich gross wie die Schrift der Sortierung (lib-top) */
    '[data-lib] .lib-bottom .ps-label { font-size: .8rem !important; font-weight: 500 !important; letter-spacing: .12em !important; line-height: 1.5 !important; text-transform: uppercase !important; }',
    '@media (max-width: 767px) { [data-lib] .lib-bottom .ps-label { font-size: 3.2vw !important; } }',
    /* Hugo 25.11. (07:14): unsichtbare Klickfläche so gross wie der Menü-Knopf (Grösse misst der Code: --gx-hit-w / --gx-hit-h) */
    '[data-lib] .lib-bottom .ps-label, [data-lib] .lib-sort { position: relative; }',
    '[data-lib] .lib-bottom .ps-label { width: fit-content; }',   /* Klickfläche sitzt auf dem Wort, nicht auf der ganzen Zeile */
    '[data-lib] .lib-bottom .ps-label::after, [data-lib] .lib-sort::after { content: ""; position: absolute; left: 50%; top: 50%; width: max(100%, var(--gx-hit-w, 7rem)); height: max(100%, var(--gx-hit-h, 3rem)); transform: translate(-50%, -50%); }',
    '@media (hover: hover) and (pointer: fine) { [data-lib].is-in .lib-bottom .ps-label:hover { opacity: .6; } }',
    '[data-lib] .lib-bottom .ps-label:focus-visible { outline: 1px solid currentColor; outline-offset: 4px; }',
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
    /* Hugo 25.11. (07:10): offene Sortierung auf einem weissen Feld, das weich einblendet (Schrift über den Bildern lesbar) */
    '[data-lib] .lib-top { transition: opacity .6s ease, color .35s ease; }',
    '[data-lib] .lib-top::before { content: ""; position: absolute; left: -1.1em; right: -1.4em; top: -.8em; bottom: -1em; background: #fff; z-index: -1; opacity: 0; transform: scale(.96); transform-origin: 0 0; transition: opacity .35s ease, transform .45s cubic-bezier(.22,1,.36,1); pointer-events: none; }',
    '[data-lib] .lib-top.is-open { mix-blend-mode: normal !important; color: #000 !important; }',
    '[data-lib] .lib-top.is-open::before { opacity: 1; transform: none; }',
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
      if (p.img) {
        p.img.setAttribute('draggable', 'false');
        // Hugo 25.11. (07:09): nur so gross laden, wie die Bilder hier gezeigt werden (vorher volle Bildschirmbreite).
        // Weniger Pixel = weniger Arbeit für den Grafikchip beim Knall und beim Ziehen. Gleicher Wert in home.js (Vorladen).
        if (p.img.srcset) p.img.sizes = SIZES;   // greift sicher nur, wenn der Seiten-Head es schon vor dem Laden gesetzt hat (dort steht es auch)
        if (p.img.loading === 'lazy') p.img.loading = 'eager';
      }
    });
    [].forEach.call(root.querySelectorAll('[role="list"],[role="listitem"]'), function (e) { e.removeAttribute('role'); });

    var projects = all.slice();   // aktuelle Auswahl (Sortierung)
    var slots = [];               // Karten auf der Fläche
    var clones = [];
    var VW = 1, VH = 1, WW = 1, WH = 1, PAD = 0, BX0 = 0, BX1 = 0, BY0 = 0, BY1 = 0;
    var cam = { x: 0, y: 0 }, vel = { x: 0, y: 0 };
    var mode = 'load';            // load | bang | idle | gather | pv
    var raf = 0, last = 0, gatherAt = 0, bangT = 0;

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
      // Hugo 25.11. (07:13): keine Wiederholungen – jedes Projekt genau einmal («es gibt halt das, was es gibt»).
      // Die Fläche ist so gross wie nötig (Seitenverhältnis wie der Bildschirm), mittig; am Rand federt sie zurück.
      var n = projects.length;
      var cols = clamp(Math.round(Math.sqrt(n * (VW / VH) * (rowH / cell))), 1, n);
      var rows = Math.ceil(n / cols);
      WW = cols * cell; WH = rows * rowH;
      var R = rng(CONFIG.seed + strSeed(location.pathname + (current || '') + (mob ? 'm' : 'd')));
      var list = order(n, R), k = 0;
      for (var r = 0; r < rows; r++) {
        var inRow = Math.min(cols, n - r * cols), rowOff = (cols - inRow) * cell / 2;   // letzte Reihe mittig
        for (var c = 0; c < inRow; c++) {
          var p = list[k++], el = p.el;
          var s = sz[0] + R() * (sz[1] - sz[0]);
          var d = CONFIG.depth[0] + R() * (CONFIG.depth[1] - CONFIG.depth[0]);
          el.style.zIndex = Math.round(d * 100);
          slots.push({
            p: p, el: el, a: el.querySelector('a.lib-card') || el.querySelector('a'), img: el.querySelector('img'),
            s: s, d: d, w: p.w, h: p.h,
            // Weltlage relativ zur Mitte; Reihen leicht versetzt, damit kein Raster sichtbar ist
            x: rowOff + c * cell + cell / 2 + (rows > 1 ? (r % 2 - .5) * cell * .35 : 0) + (R() - .5) * cell * jit - WW / 2,
            y: r * rowH + rowH / 2 + (R() - .5) * rowH * jit - WH / 2,
            rot: (R() - .5) * 2 * CONFIG.spin, dl: R() * CONFIG.flyDelay,
            dur: CONFIG.flyMs[0] + R() * (CONFIG.flyMs[1] - CONFIG.flyMs[0]), s0: .03 + R() * .05,
            off: false
          });
        }
      }
      cam.x = 0; cam.y = 0;
      // Hugo 25.11. (07:16/07:18): ziehen bis das äusserste Bild die Bildschirmmitte erreicht, erst dann der Dämpfer.
      // Pro Bild: bei welcher Kameralage erreicht seine Kante den Rand (mit seiner Tiefe d)? Die äussersten zählen.
      BX0 = Infinity; BX1 = -Infinity; BY0 = Infinity; BY1 = -Infinity;
      slots.forEach(function (sl) {
        var hw = sl.w * sl.s / 2, hh = sl.h * sl.s / 2;
        // Hugo 25.11. (07:18): bis die äusserste Bildkante die Bildschirmmitte erreicht (halb ins Schwarze), sonst wirkt es eng
        BX1 = Math.max(BX1, -(sl.x - hw) / sl.d);   // linke Kante in der Mitte (nach rechts gezogen)
        BX0 = Math.min(BX0, -(sl.x + hw) / sl.d);   // rechte Kante in der Mitte (nach links gezogen)
        BY1 = Math.max(BY1, -(sl.y - hh) / sl.d);
        BY0 = Math.min(BY0, -(sl.y + hh) / sl.d);
      });
      if (!slots.length) { BX0 = BX1 = BY0 = BY1 = 0; }
      // Breiter als der Bildschirm: nach rechts bis die linke Kante am linken Rand steht (und umgekehrt).
      // Schmaler (z. B. Singer): nach rechts bis die rechte Kante am rechten Rand steht. Beides ergibt: Bereich zwischen den Werten.
      var ax = BX1, bx = BX0, ay = BY1, by = BY0;
      BX0 = Math.min(ax, bx); BX1 = Math.max(ax, bx); BY0 = Math.min(ay, by); BY1 = Math.max(ay, by);
    }
    // Lage einer Karte auf dem Bildschirm (Mitte)
    function pos(sl) {
      return { x: VW / 2 + sl.x + cam.x * sl.d, y: VH / 2 + sl.y + cam.y * sl.d };
    }
    // Rand: ausserhalb von BX0…BX1 / BY0…BY1 bremst das Ziehen (Gummiband), danach federt die Fläche zurück
    function outX(v) { return v > BX1 ? v - BX1 : v < BX0 ? v - BX0 : 0; }
    function outY(v) { return v > BY1 ? v - BY1 : v < BY0 ? v - BY0 : 0; }
    function outside() { return Math.abs(outX(cam.x)) > .3 || Math.abs(outY(cam.y)) > .3; }
    function tfOf(sl, x, y, scale, rot) {
      return 'translate3d(' + (x - sl.w / 2).toFixed(1) + 'px,' + (y - sl.h / 2).toFixed(1) + 'px,0) scale(' + (sl.s * scale).toFixed(4) + ') rotate(' + (rot || 0).toFixed(2) + 'deg)';
    }
    function place(sl, x, y, scale, rot) {
      sl.el.style.transform = tfOf(sl, x, y, scale, rot);
      // Hugo 25.11. (07:09, Ziehen stottert): Karten ausserhalb des Bildschirms werden NICHT mehr versteckt. Jedes
      // Verstecken/Zeigen warf ihr Bild vom Grafikchip und lud es neu (50–130 ms Stillstand). Ausserhalb wird ohnehin nichts gezeichnet.
    }

    // ---------- Schleife ----------
    function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    function frame(now) {
      raf = 0;
      var dtf = last ? Math.min(3, (now - last) / 16.67) : 1; last = now;
      var cx = VW / 2, cy = VH / 2, more = false, i, sl, f;

      if (mode === 'gather') {
        var tg = clamp((now - gatherAt) / CONFIG.gatherMs, 0, 1), eg = easeInCubic(tg);
        for (i = 0; i < slots.length; i++) {
          sl = slots[i]; f = sl.from;
          place(sl, f.x + (cx - f.x) * eg, f.y + (cy - f.y) * eg, 1 - .96 * eg, sl.rot * eg * .5);
          sl.el.style.opacity = (1 - clamp((tg - .7) / .3, 0, 1)).toFixed(3);
        }
        if (tg >= 1) { gatherDone(); return; }
        more = true;
      } else if (mode === 'idle') {
        var moving = drag || Math.abs(vel.x) > .05 || Math.abs(vel.y) > .05 || dirty || outside();
        if (!drag) inertia(dtf);
        if (moving) { for (i = 0; i < slots.length; i++) { sl = slots[i]; f = pos(sl); place(sl, f.x, f.y, 1, 0); } dirty = false; }
        more = drag || Math.abs(vel.x) > .05 || Math.abs(vel.y) > .05 || (!drag && outside());
      }
      if (more) raf = requestAnimationFrame(frame);
    }
    var dirty = false;
    function redraw() { dirty = true; kick(); }
    function inertia(dtf) {
      cam.x += vel.x * dtf; cam.y += vel.y * dtf;
      var fr = Math.pow(CONFIG.friction, dtf); vel.x *= fr; vel.y *= fr;
      // am Rand: Schwung stark bremsen und weich zurückfedern
      var ox = outX(cam.x), oy = outY(cam.y), k = 1 - Math.pow(1 - 0.16, dtf), kb = Math.pow(0.6, dtf);
      if (ox) { cam.x -= ox * k; if (vel.x * ox > 0) vel.x *= kb; }
      if (oy) { cam.y -= oy * k; if (vel.y * oy > 0) vel.y *= kb; }
      if (Math.abs(vel.x) < .05) vel.x = 0; if (Math.abs(vel.y) < .05) vel.y = 0;
    }

    // ---------- Urknall ----------
    // Alles läuft als Web-Animation (Grafikchip): Kugel, Erschütterung, Trümmer und der Flug jeder Karte.
    // Die Zielorte werden beim Start einmal berechnet; solange der Flug läuft, ist Ziehen gesperrt.
    var EXPO = 'cubic-bezier(.16,1,.3,1)';   // wie easeOutExpo: schiesst los, bremst lange
    function bang() {
      if (dot) { dot.remove(); dot = null; }
      VW = window.innerWidth; VH = window.innerHeight;
      vel.x = vel.y = 0;
      if (reduce || !slots.length) {
        slots.forEach(function (sl) { sl.el.classList.add('is-vis'); sl.el.style.opacity = '1'; var f = pos(sl); place(sl, f.x, f.y, 1, 0); });
        mode = 'idle'; root.classList.add('is-in'); mbShow(); return;
      }
      mode = 'bang';
      sphere.style.opacity = '0';
      var cx = VW / 2, cy = VH / 2, longest = 0;
      // Lichtkugel: füllt den Bildschirm, blendet aus
      var R0 = Math.hypot(VW, VH) * 0.75;
      sphere.style.width = sphere.style.height = 2 * R0 + 'px';
      var st0 = 'translate3d(' + (cx - R0).toFixed(1) + 'px,' + (cy - R0).toFixed(1) + 'px,0) ';
      sphere.animate([
        { transform: st0 + 'scale(0)', opacity: 1, easing: 'cubic-bezier(.33,1,.68,1)' },
        { transform: st0 + 'scale(1)', opacity: 1, offset: CONFIG.sphereMs / (CONFIG.sphereMs + CONFIG.fadeMs), easing: 'ease-out' },
        { transform: st0 + 'scale(1)', opacity: 0 }
      ], { duration: CONFIG.sphereMs + CONFIG.fadeMs, fill: 'forwards' });
      // Erschütterung
      var shk = [], n = 8, i;
      for (i = 0; i <= n; i++) { var a = (1 - i / n) * CONFIG.shakePx; shk.push({ transform: i === n ? 'none' : 'translate3d(' + ((Math.random() - .5) * 2 * a).toFixed(1) + 'px,' + ((Math.random() - .5) * 2 * a).toFixed(1) + 'px,0)' }); }
      wheel.animate(shk, { duration: CONFIG.shakeMs, easing: 'linear' });
      // Karten fliegen aus der Mitte an ihren Platz
      slots.forEach(function (sl) {
        var f = pos(sl), s0 = sl.s0 / sl.s;
        sl.el.classList.add('is-vis'); sl.el.style.opacity = '1';
        place(sl, f.x, f.y, 1, 0);   // Endlage (bleibt nach der Animation stehen)
        sl.el.animate([
          { transform: tfOf(sl, cx, cy, s0, sl.rot), opacity: 0 },
          { opacity: 1, offset: .02 },   // gleich sichtbar: man sieht sie aus der Quelle schiessen
          { transform: tfOf(sl, f.x, f.y, 1, 0), opacity: 1 }
        ], { duration: sl.dur, delay: sl.dl, easing: EXPO, fill: 'backwards' });
        longest = Math.max(longest, sl.dur + sl.dl);
      });
      // Trümmer: ein paar Bilder fliegen gross quer durchs Blickfeld an der Kamera vorbei und verblassen
      //  (schon in prepare() gebaut und entpackt, sonst sind sie am iPhone im Flug noch leer)
      debrisEls.forEach(function (d) {
        d.el.style.visibility = '';
        var an = d.el.animate([
          { transform: 'translate3d(' + d.x0 + 'px,' + d.y0 + 'px,0) rotate(0deg) scale(.05)', opacity: 0 },
          { opacity: 1, offset: .06 },
          { opacity: 1, offset: .45 },
          { transform: 'translate3d(' + (d.x0 + d.tx) + 'px,' + (d.y0 + d.ty) + 'px,0) rotate(' + d.rot + 'deg) scale(2.65)', opacity: 0 }
        ], { duration: d.dur, delay: d.dl, easing: 'cubic-bezier(.33,1,.68,1)', fill: 'both' });
        an.onfinish = (function (e) { return function () { e.remove(); }; })(d.el);
      });
      debrisEls = [];
      clearTimeout(bangT);
      setTimeout(function () { root.classList.add('is-in'); mbShow(); }, 300);
      bangT = setTimeout(function () {
        slots.forEach(function (sl) { if (sl.el.getAnimations) sl.el.getAnimations().forEach(function (a) { a.cancel(); }); });
        mode = 'idle'; redraw();   // ab jetzt wieder vom Ziehen gesteuert (Rand-Karten wieder ausgeblendet)
      }, Math.max(longest, CONFIG.sphereMs + CONFIG.fadeMs) + 40);
    }
    // Vor dem Knall: alle Karten (auch die Kopien) entpacken, damit im Moment des Knalls nichts einfriert
    var debrisEls = [];
    function makeDebris() {
      debrisEls.forEach(function (d) { d.el.remove(); }); debrisEls = [];
      if (reduce || !projects.length) return;
      var VWn = window.innerWidth, VHn = window.innerHeight, cx = VWn / 2, cy = VHn / 2, m = Math.min(VWn, VHn);
      var Rr = rng(Date.now() & 4095), n = Math.min(CONFIG.debris, Math.max(2, projects.length * 2));
      for (var i = 0; i < n; i++) {
        var p = projects[i % projects.length];
        var src = p.img.currentSrc || p.img.src; if (!src) continue;
        var ar = p.img.naturalWidth ? p.img.naturalWidth / p.img.naturalHeight : .8;
        var w = m * (.22 + Rr() * .16), h = w / ar;
        // Richtungen gleichmässig verteilt, damit sie quer durchs ganze Bild gehen
        var ang = (i + Rr() * .7) / n * Math.PI * 2;
        var el = document.createElement('div');
        el.className = 'lib-fly'; el.style.width = w + 'px'; el.style.height = h + 'px'; el.style.zIndex = '15'; el.style.visibility = 'hidden';
        var im = document.createElement('img'); im.src = src; im.alt = ''; el.appendChild(im);
        root.appendChild(el);
        debrisEls.push({ el: el, img: im, x0: cx - w / 2, y0: cy - h / 2, tx: Math.cos(ang) * VWn * 1.15, ty: Math.sin(ang) * VHn * 1.15,
          rot: (Rr() - .5) * 120, dur: 560 + Rr() * 300, dl: Rr() * 60 });
      }
    }
    function prepare(then) {
      var done = false, warmed = false;
      function go() { if (!done) { done = true; then(); } }
      // Vorwärmen (Hugo 25.11., 07:09: «spielt selten richtig ab»): Im Moment des Knalls musste das iPhone alle Bilder
      // gleichzeitig auf den Grafikchip laden (~0.4 s Stillstand), während die Uhr der Animation schon lief – der Anfang
      // (Herausschiessen) fehlte. Jetzt liegen alle Karten, Trümmer und die Kugel schon während des Punkts in voller
      // Grösse, praktisch unsichtbar (Deckkraft 0.4 %), in der Mitte. Erst wenn das gezeichnet ist, startet der Knall.
      function warm() {
        if (warmed) return; warmed = true;
        if (reduce) { go(); return; }
        var VWn = window.innerWidth, VHn = window.innerHeight, cx = VWn / 2, cy = VHn / 2;
        slots.forEach(function (sl) { sl.el.classList.add('is-vis'); sl.el.style.opacity = '0.004'; place(sl, cx, cy, 1, 0); });
        debrisEls.forEach(function (d) { d.el.style.visibility = ''; d.el.style.opacity = '0.004'; d.el.style.transform = 'translate3d(' + d.x0 + 'px,' + d.y0 + 'px,0)'; });
        var R0 = Math.hypot(VWn, VHn) * 0.75;
        sphere.style.width = sphere.style.height = 2 * R0 + 'px';
        sphere.style.transform = 'translate3d(' + (cx - R0).toFixed(1) + 'px,' + (cy - R0).toFixed(1) + 'px,0)'; sphere.style.opacity = '0.004';
        requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(go, 90); }); });
      }
      makeDebris();
      var imgs = slots.map(function (sl) { return sl.img; }).concat(debrisEls.map(function (d) { return d.img; }));
      Promise.all(imgs.map(function (im) { return im && im.decode ? im.decode().catch(function () {}) : null; })).then(warm);
      setTimeout(warm, reduce ? 0 : CONFIG.decodeMax);
    }

    // ---------- Ziehen, Tippen ----------
    var drag = null, down = null;
    root.addEventListener('pointerdown', function (e) {
      if (mode === 'load' || mode === 'gather' || mode === 'bang' || root.classList.contains('is-pv')) return;
      if (e.target.closest('.lib-top, .lib-pv, .ps-label')) return;
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
      // ausserhalb des Rands nur noch gebremst (Gummiband)
      cam.x += dx * (outX(cam.x + dx) * dx > 0 ? .35 : 1); cam.y += dy * (outY(cam.y + dy) * dy > 0 ? .35 : 1);
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
      if (e.target.closest('.lib-top, .lib-pv, .ps-label, a:not(.lib-card), [role="button"]')) return;
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
      cam.x = clamp(cam.x - e.deltaX * k, BX0 - 60, BX1 + 60); cam.y = clamp(cam.y - e.deltaY * k, BY0 - 60, BY1 + 60); vel.x = vel.y = 0;
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
      prepare(bang);
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

    // Klickflächen so gross wie der Menü-Knopf (offsetWidth/-Height: ohne seine Verschiebung und Verkleinerung)
    function hitSize() {
      var b = document.querySelector('.menu-toggle-wrap [data-menu-open]') || document.querySelector('.menu-toggle-wrap .is-menu');
      if (!b || !b.offsetWidth) return;
      root.style.setProperty('--gx-hit-w', b.offsetWidth + 'px');
      root.style.setProperty('--gx-hit-h', b.offsetHeight + 'px');
    }
    hitSize(); window.addEventListener('resize', hitSize); window.addEventListener('load', hitSize);

    // ---------- Bereichsname = Zurück ----------
    // Wie der Pfeil im Browser: zurück zur vorherigen Seite (meist die Homepage, sie kommt aus dem Speicher).
    // Kam man direkt (Link, Lesezeichen), geht es zur Startseite.
    var backEl = root.querySelector('.lib-bottom .ps-label');
    if (backEl) {
      backEl.setAttribute('role', 'link'); backEl.setAttribute('tabindex', '0'); backEl.setAttribute('aria-label', 'Zurück');
      var goBack = function (e) {
        if (e) e.preventDefault();
        var ref = ''; try { ref = new URL(document.referrer).origin; } catch (er) {}
        if (ref === location.origin && history.length > 1) history.back();
        else { window.hsVT = { to: '/', type: 'studio' }; location.href = '/'; }
      };
      backEl.addEventListener('click', goBack);
      backEl.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') goBack(e); });
    }

    // ---------- Start ----------
    var started = false;
    function start() {
      if (started) return;
      started = true;
      build();
      prepare(bang);   // sobald alles entpackt ist, sofort Knall
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
