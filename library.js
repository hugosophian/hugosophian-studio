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
    // Aufbau und Bewegung wie marioroudil.com am Desktop (main.js, Slider „dt“ und Vertex-Shader):
    // die Bilder liegen in einer geraden Reihe, die Anzeige läuft dem Ziel mit Glättung nach, Loslassen rastet ein.
    gap:        { desktop: 3, mobile: 6 },   // Abstand zwischen den Karten in vw
    speed:      1.5,    // Mausweg mal speed (Mario Desktop: 1.5)
    // Handy: der Finger bewegt mehr (Mario Handy: 3) und ein schneller Wisch läuft weiter, bevor er einrastet
    speedTouch: 3,      // Fingerweg mal speedTouch
    flick:      0.35,   // Schwung: Fingertempo beim Loslassen (px/s) · speedTouch · flick = zusätzlicher Weg in px
    flickMax:   8,      // höchstens so viele Karten Schwung
    bendTouch:  0.7,    // Tiefe des Biegens am Handy (Anteil vom Desktop; vorher Breite / 1440 ≈ 0.27)
    bendCurve:  2,      // Handy: Biegen wächst mit dem Tempo hoch 2 (langsam kaum, schnell stark), Desktop linear wie Mario
    energyMin:  0.5,    // Handy: so viel Biegen kommt bei einem einzelnen normalen Wisch an (Hugo 15:10: etwas sichtbarer) …
    energyFull: 2.5,    // … volles Biegen ab so viel gesammelter Schwung-Energie (ein kräftiger Wisch ≈ 1)
    energyFlick: 1400,  // Fingertempo (px/s), das einem Wisch die Energie 1 gibt (höchstens 1.5 pro Wisch)
    energyDecay: 0.9,   // Energie klingt mit dieser Zeitkonstante (s) wieder ab
    ease:       0.1,    // Glättung pro Bild bei 60 fps (Mario: 0.1, über 65 Hz 0.09; hier bildratenunabhängig)
    velo:       0.75,   // Biegen = (Ziel − Anzeige) / Breite · velo (Mario; beim Mausrad 0.4)
    veloWheel:  0.4,
    wheelIdle:  150,    // ms nach Mausrad/Trackpad, dann einrasten (Mario)
    camera:     600,    // Mario: Kamera 600 px vor der Bildebene
    depth:      800,    // Mario-Vertex: Tiefe cos(Abstand · 1.8 / Breite · π) · Biegen · 800
    twist:      200,    // … plus sin(u − 10) · Biegen · 200 (Drehung über die Kartenbreite)
    bow:        0.625,  // … plus seitlich sin(v · π) · Biegen · 5 · 0.125 Kartenbreiten
    bendMax:    0.4,    // Biegen in die Tiefe begrenzt (Mario ±0.4)
    zoom:       0.5,    // Bild zoomt im Rahmen mit (1 − 0.5 · Biegen) (Mario-Fragment-Shader)
    gl:         true,   // Bilder per WebGL wie Mario; ohne WebGL normale Karten ohne Biegen
    edgeGuard:  40,     // px am Rand, in denen Safaris Zurück-Wischen gesperrt ist
    // Eintritt wie CRL (_spinIntro): die ganze Reihe zieht einmal durch (3 s, back.inOut(.54)),
    // jede Karte blendet in 0.4 s ein, sobald sie rechts ins Bild kommt; beim Landen der Rest
    // Eintritt exakt wie CRL (main.js: Ux._spinIntro + Rx), Hugo 21.11. 13:41:
    // schwarz, bis alle Bilder auf dem Grafikchip sind; dann drehen die Karten auf dem grossen Rad herein
    // (Radius 1.8 · H, Abstand wie bei CRLs 20 Projekten = 18°, Drehung 1.2 × Winkel), 3 s back.inOut(.54),
    // jede Karte blendet in 0.4 s (sine) auf, sobald sie von rechts 0.85 rad unterschreitet; Landen auf dem ersten.
    // Am Schluss legt sich das Rad in die gerade Reihe (Wischen danach wie Mario).
    introWait:  2000,   // höchstens so lange auf das erste Bild warten
    introAll:   350,    // höchstens so lange warten, bis alle Bilder bereit sind; später geladene blenden einfach dann ein (Hugo 15:16: schneller sichtbar)
    introSkip:  0,      // nicht mehr nötig: die Kurve beginnt jetzt direkt mit der höchsten Geschwindigkeit
    vtStart:    650,    // nach dem Ausblenden der Homepage (Übergang „fade“ 0.8 s) so früh starten, die ersten Karten kommen ohnehin erst nach ~0.5 s
    // CRL-Quelle (Rx/_buildPlanes): Karte 0.35·H hoch, 0.78 so breit, 20 Projekte auf 360° (18°), Eintritt = genau eine
    // Umdrehung, jede Karte kommt nur einmal und blendet beim Überqueren der Linie auf. Hugos Karten sind breiter
    // (Querformat ~0.46·H statt 0.27·H), deshalb Abstand nach Kartenbreite statt fix 18°: gleiche Lücke wie CRL.
    ringGap:    2.063,  // Mitte-zu-Mitte-Abstand auf dem Rad in Kartenbreiten (CRL: 2·1.8·sin 9° / 0.273 = 2.063)
    radius:     1.8,    // CRL: Radius = 1.8 · Bildschirmhöhe
    tilt:       1.2,    // CRL: Karte dreht 1.2 × so stark wie ihr Platz auf dem Rad
    fadeAt:     0.85,   // CRL: Einblenden, sobald eine Karte von rechts unter 0.85 rad kommt
    settle:     0.25,   // letzter Anteil des Eintritts, in dem sich das Rad in die gerade Reihe legt
    // Hugo 21.11. 15:24: sofort mit voller Geschwindigkeit sichtbar, dann nur noch abnehmend (wie bei Model).
    // Kurve = zweite Hälfte von CRLs back.inOut, auf die ganze Dauer gestreckt (back.out): Start mit Höchsttempo,
    // gleiches leichtes Überschwingen beim Landen wie CRL (s 0.4 ≙ CRLs .54 in der halben Kurve)
    introMs:    2600,
    introBack:  0.4,
    fadeMs:     400,    // CRL: Karte blendet in 0.4 s (sine.inOut) ein
    // Auswahl wechseln (Hugo 21.11.): alle Bilder ziehen sich zu einem zusammen, der Stapel blendet aus,
    // dann kommt die neue Auswahl wie beim ersten Laden (erstes Bild blendet auf, dann rollt es wie CRL)
    gatherMs:   650,    // Zusammenziehen (in-out cubic)
    gatherFade: 300,    // Stapel blendet aus
    // Vorschau
    pvMs:       1000,   // Vorschau öffnen: Bild fliegt an seinen Platz, gleichzeitig geht der weisse Rahmen zur Vorschau auf (Hugo 21.11.)
    pvOpenMs:   0,      // (früher zweiter Teil nach dem Flug, jetzt alles gleichzeitig)
    pvCloseMs:  850,    // Schliessen: Rahmen und Bild gleichzeitig zurück ins Rad
    pvGap:      .05     // Abstand Vorschau zum Menü-Knopf (Anteil der Bildschirmhöhe); mehr Inhalt scrollt
  };

  var EASE = 'cubic-bezier(.7,0,.2,1)';
  var css = [
    'html.lib-on, html.lib-on body { height: 100%; overflow: hidden; overscroll-behavior: none; background-color: #000; }',
    '[data-lib] { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }',
    '[data-lib] .lib-wheel { position: absolute; inset: 0; }',
    '[data-lib] .lib-item { position: absolute; left: 0; top: 0; visibility: hidden; will-change: transform, opacity; transform-origin: 50% 50%; }',
    '[data-lib] .lib-item.is-vis { visibility: visible; }',
    '[data-lib] .lib-gl { position: absolute; left: 0; top: 0; pointer-events: none; z-index: 0; }',
    '[data-lib] .lib-item.is-gl .lib-card { opacity: 0; }',
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
    /* „Galerie öffnen“ wie auf der Homepage: Text mit Pfeil im Stil von „Alle Projekte“, kein Knopf. Close übernimmt der Menü-Knopf. */
    '[data-lib] .lib-pv-go { display: flex; align-items: center; gap: .5em; align-self: flex-start; color: inherit; text-decoration: none; cursor: pointer; -webkit-tap-highlight-color: transparent; font-family: "Oswald Studio", sans-serif; font-size: .8rem; font-weight: 500; letter-spacing: .12em; line-height: 1.5; text-transform: uppercase; position: relative; touch-action: manipulation; background: none; border: 0; outline: 0; box-shadow: none; text-shadow: none; padding: 0; border-radius: 0; }',
    '[data-lib] .lib-pv-go::after { content: ""; position: absolute; inset: -14px -16px; }',
    '[data-lib] .lib-pv-go .lib-sort-label { font: inherit; letter-spacing: inherit; color: inherit; }',
    '[data-lib] .lib-pv-go .lib-sort-arrow { font-size: 1.1em; line-height: 1; color: inherit; transition: transform .45s cubic-bezier(.3,1.7,.55,1); }',
    '@media (hover: hover) and (pointer: fine) { [data-lib] .lib-pv-go:hover .lib-sort-arrow { transform: translateX(.35em); } }',
    '[data-lib] .lib-pv-go:focus-visible .lib-sort-arrow { transform: translateX(.35em); }',
    '[data-lib] .lib-pv-close { display: none !important; }',
    '[data-lib] .lib-pv-media img { display: block; height: 100%; width: auto; max-width: 100%; object-fit: contain; object-position: left top; }',
    '[data-lib] .lib-wheel { transition: opacity .65s ease, filter .65s ease; }',
    '[data-lib].is-pv-dim .lib-wheel { opacity: .25; }',
    '@media (hover: hover) and (pointer: fine) { [data-lib].is-pv-dim .lib-wheel { filter: blur(8px); } }',
    '[data-lib].is-pv-dim .lib-meta, [data-lib].is-pv-dim .lib-bottom { opacity: 0; }',
    '.lib-fly { position: fixed; left: 0; top: 0; z-index: 60; pointer-events: none; transform-origin: 0 0; will-change: transform; overflow: hidden; }',
    '.lib-fly img { display: block; width: 100%; height: 100%; object-fit: cover; }',
    /* Menü-Knopf: auf der Library steuert dieser Code ihn (Klasse lib-mb), nicht das Scrollen.
       Tempo und Kurven kommen aus dem Website-Footer (--mh-up, --mh-down, --mh-ease-up, --mh-ease-down). */
    'html.lib-on.mh-js .menu-toggle-wrap.mh-on.mh-on { translate: 0 var(--mh-drop); transition: opacity var(--menu-dur) var(--menu-ease-out), visibility 0s, translate var(--mh-down) var(--mh-ease-down); }',
    /* Klein (55 %) nur im versteckten Zustand vor dem Hochbouncen; beim Wegfallen bleibt er gross (wie Homepage) */
    'html.lib-on.mh-js .menu-toggle-wrap.mh-on.mh-on.lib-mb-small { scale: .55; }',
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
        w: 0, h: 0, op: 0, vis: false
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
    all.forEach(function (it) { it.el.style.opacity = '0'; });   // auch die normalen Karten bis zum Eintritt unsichtbar
    // Position auf der Reihe in px: P = Anzeige (Mario lastX), T = Ziel (Mario currentX), beide mit umgekehrtem Vorzeichen
    var P = 0, T = 0, velo = CONFIG.velo, prog = 0;
    var mode = 'idle';           // idle | drag | intro | outro | pv
    var idx = 0, shownIdx = -1;
    var n = 1, L = 1, H = 1, W = 1, cx = 0, cy = 0, loop = true, gapPx = 0;
    var raf = 0, last = 0, intro = null, wheelT = 0, dirty = false, sq = 0, touchNow = false, energy = 0;

    // ---------- Masse ----------
    function measure() {
      W = window.innerWidth; H = window.innerHeight;
      n = Math.max(1, items.length);
      gapPx = (W < 768 ? CONFIG.gap.mobile : CONFIG.gap.desktop) * W / 100;
      cx = stage.clientWidth / 2;
      cy = stage.clientHeight / 2;
      var acc = 0, maxW = 0;
      items.forEach(function (it, i) {
        var h = it.img.offsetHeight, w = it.img.offsetWidth;
        if ((!w || w < 2) && h) w = it.img.naturalWidth ? h * it.img.naturalWidth / it.img.naturalHeight : h * 0.8;
        it.w = Math.max(it.el.offsetWidth, w); it.h = Math.max(it.el.offsetHeight, h);
        if (i > 0) acc += items[i - 1].w / 2 + gapPx + it.w / 2;
        it.c = acc;
        maxW = Math.max(maxW, it.w);
      });
      L = items.length ? acc + items[items.length - 1].w / 2 + gapPx + items[0].w / 2 : 1;   // eine ganze Runde
      // Endlos wie CRL, sobald die Reihe breiter ist als der Bildschirm (sonst sähe man den Übergang)
      loop = n > 2 && L > W + 2 * maxW + gapPx;
      if (gl) { glSize(); items.forEach(glMeasure); }
    }
    function wrapL(d) { var r = d % L; if (r > L / 2) r -= L; else if (r < -L / 2) r += L; return r; }
    function rel(i) { var d = items[i].c - P; return loop ? wrapL(d) : d; }   // Abstand Karte i zur Mitte in px
    function near(i) { return P + rel(i); }                                   // Ziel, um Karte i in die Mitte zu holen
    function nearestTo(p) {
      var best = 0, bd = Infinity;
      for (var i = 0; i < items.length; i++) { var d = items[i].c - p; if (loop) d = wrapL(d); d = Math.abs(d); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    function snapT() { if (items.length) { var i = nearestTo(T), d = items[i].c - T; T += loop ? wrapL(d) : d; } }
    function clampT(t) {
      if (loop || !items.length) return t;
      var lo = items[0].c, hi = items[items.length - 1].c;
      if (t < lo) return lo - (lo - t) * 0.35;
      if (t > hi) return hi + (t - hi) * 0.35;
      return t;
    }

    // ---------- Bilder als WebGL-Flächen wie Mario (Vertex-Shader: Biegen in die Tiefe, Fragment: Zoom im Rahmen) ----------
    // Die normalen Karten bleiben unsichtbar darunter (für Tippen, Vorschau und als Ersatz ohne WebGL).
    var gl = null;
    (function () {
      if (!CONFIG.gl) return;
      var cv = document.createElement('canvas');
      cv.className = 'lib-gl';
      cv.setAttribute('aria-hidden', 'true');
      var c = null;
      try { c = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true }); } catch (e) {}
      if (!c) return;
      var VS = [
        'attribute vec2 aUv;',
        'uniform vec2 uCenter; uniform vec2 uSize; uniform vec2 uView; uniform float uP; uniform float uPc; uniform vec4 uK; uniform float uRot;',
        'varying vec2 vUv;',
        'void main() {',
        '  vUv = aUv;',
        '  vec3 p = vec3((aUv.x - 0.5) * uSize.x, (aUv.y - 0.5) * uSize.y, 0.0);',
        '  p.x += sin(aUv.y * 3.14159265) * uP * uK.z * uSize.x;',               // Mario: pos.x += sin(uv.y·π)·progress·5·0.125
        '  float rc = cos(uRot), rs = sin(uRot);',                                // Drehung (CRL-Rad beim Eintritt)
        '  p.xy = vec2(p.x * rc - p.y * rs, p.x * rs + p.y * rc);',
        '  vec2 w = p.xy + uCenter;',
        '  float dfc = abs(w.x - uView.x * 0.5);',
        '  p.z += cos(dfc * 1.8 / uView.x * 3.14159265) * uPc * uK.x;',          // Mario: cos(dfc·1.8/res.x·π)·clamp(progress)·800
        '  p.z += sin(aUv.x - 10.0) * uPc * uK.y;',                               // Mario: sin(uv.x − 10)·clamp(progress)·200
        '  vec2 c = uView * 0.5;',
        '  vec2 s = c + (w - c) * (uK.w / (uK.w - p.z));',                        // Kamera uK.w px vor der Ebene
        '  gl_Position = vec4(s.x / uView.x * 2.0 - 1.0, s.y / uView.y * 2.0 - 1.0, -p.z / (uK.w * 4.0), 1.0);',
        '}'].join('\n');
      var FS = [
        'precision mediump float;',
        'uniform sampler2D uTex; uniform float uOpacity; uniform vec4 uBox; uniform float uImageAspect; uniform float uCardAspect; uniform float uZoom;',
        'varying vec2 vUv;',
        'void main() {',
        '  float x0 = uBox.x, x1 = uBox.y, y0 = uBox.z, y1 = uBox.w;',
        '  if (vUv.x < x0 || vUv.x > x1 || vUv.y < y0 || vUv.y > y1) { gl_FragColor = vec4(uOpacity); return; }',
        '  vec2 p = vec2((vUv.x - x0) / (x1 - x0), (vUv.y - y0) / (y1 - y0));',
        '  float ia = uCardAspect * ((x1 - x0) / (y1 - y0));',
        '  vec2 uv = p;',
        '  if (uImageAspect > ia) { uv.x = 0.5 + (p.x - 0.5) * ia / uImageAspect; } else { uv.y = 0.5 + (p.y - 0.5) * uImageAspect / ia; }',
        '  uv = (uv - 0.5) * uZoom + 0.5;',                                        // Mario: (uv − 0.5)·(1 − 0.5·progress) + 0.5
        '  vec3 col = texture2D(uTex, clamp(uv, 0.0, 1.0)).rgb;',
        '  gl_FragColor = vec4(col * uOpacity, uOpacity);',
        '}'].join('\n');
      function sh(type, src) { var s = c.createShader(type); c.shaderSource(s, src); c.compileShader(s); return c.getShaderParameter(s, c.COMPILE_STATUS) ? s : null; }
      var vs = sh(c.VERTEX_SHADER, VS), fs = sh(c.FRAGMENT_SHADER, FS);
      if (!vs || !fs) return;
      var pr = c.createProgram(); c.attachShader(pr, vs); c.attachShader(pr, fs); c.linkProgram(pr);
      if (!c.getProgramParameter(pr, c.LINK_STATUS)) return;
      c.useProgram(pr);
      // Fläche 32 × 32, damit das Biegen rund wird
      var N = 32, uv = [], ix = [];
      for (var j = 0; j <= N; j++) for (var i = 0; i <= N; i++) uv.push(i / N, j / N);
      for (j = 0; j < N; j++) for (i = 0; i < N; i++) { var a = j * (N + 1) + i, b = a + 1, d = a + N + 1, e = d + 1; ix.push(a, b, d, b, e, d); }
      var vb = c.createBuffer(); c.bindBuffer(c.ARRAY_BUFFER, vb); c.bufferData(c.ARRAY_BUFFER, new Float32Array(uv), c.STATIC_DRAW);
      var ib = c.createBuffer(); c.bindBuffer(c.ELEMENT_ARRAY_BUFFER, ib); c.bufferData(c.ELEMENT_ARRAY_BUFFER, new Uint16Array(ix), c.STATIC_DRAW);
      var loc = c.getAttribLocation(pr, 'aUv'); c.enableVertexAttribArray(loc); c.vertexAttribPointer(loc, 2, c.FLOAT, false, 0, 0);
      var U = {}; ['uCenter', 'uSize', 'uView', 'uP', 'uPc', 'uK', 'uRot', 'uTex', 'uOpacity', 'uBox', 'uImageAspect', 'uCardAspect', 'uZoom'].forEach(function (k) { U[k] = c.getUniformLocation(pr, k); });
      c.uniform1i(U.uTex, 0);
      c.enable(c.BLEND); c.blendFunc(c.ONE, c.ONE_MINUS_SRC_ALPHA);
      c.pixelStorei(c.UNPACK_FLIP_Y_WEBGL, true);
      wheel.insertBefore(cv, wheel.firstChild);
      gl = { c: c, cv: cv, U: U, n: ix.length, w: 0, h: 0, ox: 0, oy: 0 };
      cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); glOff(); }, false);
    })();
    function glOff() {
      if (!gl) return;
      gl.cv.style.display = 'none';
      all.forEach(function (it) { it.el.classList.remove('is-gl'); });
      gl = null;
    }
    function glSize() {
      if (!gl) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var sr = stage.getBoundingClientRect();
      gl.ox = -sr.left; gl.oy = -sr.top;
      gl.cv.style.left = gl.ox + 'px'; gl.cv.style.top = gl.oy + 'px';
      gl.cv.style.width = W + 'px'; gl.cv.style.height = H + 'px';
      var cw = Math.round(W * dpr), ch = Math.round(H * dpr);
      if (gl.cv.width !== cw) gl.cv.width = cw;
      if (gl.cv.height !== ch) gl.cv.height = ch;
      gl.w = W; gl.h = H;
      gl.c.viewport(0, 0, gl.cv.width, gl.cv.height);
    }
    // Textur laden (Webflow-CDN erlaubt das). Klappt es nicht, bleibt die normale Karte sichtbar.
    // Bild für den Grafikchip vorbereiten. Die Originale sind sehr gross (z. B. 3000 × 4500 px = 54 MB pro Bild auf dem Chip,
    // Entpacken blockiert die Seite). Darum: Datei holen, im Hintergrund direkt auf die nötige Höhe entpacken
    // (createImageBitmap mit resizeHeight), auf ein kleines Canvas zeichnen und daraus die Textur machen.
    // Dieselbe kleine Kopie bekommen Karte und Vorschau, damit dort nichts Grosses mehr entpackt werden muss.
    function needH() {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var card = (items[0] && items[0].img.offsetHeight) || window.innerHeight * 0.32;
      var pvh = pvMedia ? pvMedia.offsetHeight : 0;
      return Math.round(Math.max(card * 1.25, pvh * 1.05, 300) * dpr);
    }
    function glTex(it) {
      if (!gl) return Promise.resolve();
      if (it.texP) return it.texP;
      it.texP = new Promise(function (res) {
        var url = texSrc(it), H0 = needH();
        function upload(cv2, ar) {
          if (!gl) return res();
          var c = gl.c, t = c.createTexture();
          c.bindTexture(c.TEXTURE_2D, t);
          try { c.texImage2D(c.TEXTURE_2D, 0, c.RGBA, c.RGBA, c.UNSIGNED_BYTE, cv2); } catch (e) { return res(); }
          c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MIN_FILTER, c.LINEAR);
          c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MAG_FILTER, c.LINEAR);
          c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_S, c.CLAMP_TO_EDGE);
          c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_T, c.CLAMP_TO_EDGE);
          it.tex = t; it.ar = ar;
          // Format der Karte schon kennen, auch wenn das Bild auf der Seite noch lädt (sonst stimmen die Abstände nicht)
          if (!it.img.naturalWidth) { it.img.style.aspectRatio = String(ar); dirty = true; }
          glMeasure(it);
          // Einmal unsichtbar zeichnen: der Grafikchip übernimmt das Bild jetzt, nicht erst mitten im Eintritt
          c.uniform1f(gl.U.uOpacity, 0); c.uniform2f(gl.U.uView, 100, 100); c.uniform2f(gl.U.uSize, 2, 2); c.uniform2f(gl.U.uCenter, 1, 1);
          c.uniform4f(gl.U.uBox, 0, 1, 0, 1); c.uniform1f(gl.U.uP, 0); c.uniform1f(gl.U.uPc, 0); c.uniform1f(gl.U.uZoom, 1);
          c.uniform4f(gl.U.uK, 0, 0, 0, 600); c.uniform1f(gl.U.uImageAspect, 1); c.uniform1f(gl.U.uCardAspect, 1); c.uniform1f(gl.U.uRot, 0);
          c.drawElements(c.TRIANGLES, 6, c.UNSIGNED_SHORT, 0);
          it.el.classList.add('is-gl');
          // Kleine Kopie für Karte, Flug und Vorschau: erst nach dem Eintritt (afterIntro), damit das Abrollen ruhig bleibt
          if (cv2.toBlob) it.cv2 = cv2;
          if (started && mode !== 'intro' && mode !== 'outro') { afterIntro(); kick(); }
          res();
        }
        function toCanvas(srcImg, w0, h0) {
          var k = Math.min(1, H0 / h0, 2048 / Math.max(w0, h0));
          var w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
          var cv2 = document.createElement('canvas'); cv2.width = w; cv2.height = h;
          var x2 = cv2.getContext('2d'); x2.imageSmoothingEnabled = true; x2.imageSmoothingQuality = 'high';
          x2.drawImage(srcImg, 0, 0, w, h);
          return cv2;
        }
        // Weg 1: im Hintergrund verkleinert entpacken (Chrome, neueres Safari)
        function viaBitmap() {
          return fetch(url, { mode: 'cors', credentials: 'omit' }).then(function (r) {
            if (!r.ok) throw new Error('http');
            return r.blob();
          }).then(function (bl) {
            return createImageBitmap(bl, { resizeHeight: H0, resizeQuality: 'high' }).catch(function () { return createImageBitmap(bl); });
          }).then(function (bm) {
            var ar = bm.width / bm.height;
            var cv2 = toCanvas(bm, bm.width, bm.height);   // ist schon klein: schnell; sonst hier verkleinert
            if (bm.close) bm.close();
            upload(cv2, ar);
          });
        }
        // Weg 2: klassisch über ein Bild
        function viaImage() {
          var im = new Image();
          im.crossOrigin = 'anonymous';
          im.onload = function () {
            var go = function () { upload(toCanvas(im, im.naturalWidth, im.naturalHeight), im.naturalWidth / im.naturalHeight); };
            if (im.decode) im.decode().then(go, go); else go();
          };
          im.onerror = function () { it.texFail = true; res(); };
          im.src = url;
        }
        if (window.createImageBitmap && window.fetch) viaBitmap().catch(viaImage); else viaImage();
        if (!gl) it.texFail = true;
      });
      return it.texP;
    }
    // Passende Grösse aus dem srcset von Webflow (…-p-500, -p-800, …): so klein wie möglich, so scharf wie nötig.
    // Das spart Laden und Entpacken (vorher kam das grosse Bild ein zweites Mal).
    function texSrc(it) {
      var img = it.img, dpr = Math.min(2, window.devicePixelRatio || 1);
      var need = Math.max(img.offsetWidth || 0, (img.offsetHeight || window.innerHeight * 0.3) * 1.6) * dpr * 1.15;
      var best = null, max = null;
      (img.getAttribute('srcset') || '').split(',').forEach(function (part) {
        var m = part.trim().match(/^(\S+)\s+(\d+)w$/);
        if (!m) return;
        var w = +m[2];
        if (!max || w > max.w) max = { u: m[1], w: w };
        if (w >= need && (!best || w < best.w)) best = { u: m[1], w: w };
      });
      return (best || max || {}).u || img.currentSrc || img.src;
    }
    // Weisser Rand als Anteil der Karte (aus den Abständen im Designer)
    function glMeasure(it) {
      if (!it.a) return;
      var cw = it.a.offsetWidth, ch = it.a.offsetHeight;
      if (!cw || !ch) return;
      // Lage des Fotos im weissen Rahmen aus den Innenabständen der Karte (nicht aus Bildschirm-Rechtecken:
      // die stimmen nicht, wenn die Karte gerade gedreht ist oder Safari beim Scrollen die Leiste bewegt)
      var cs = getComputedStyle(it.a);
      var il = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.borderLeftWidth) || 0);
      var itp = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.borderTopWidth) || 0);
      var iw = it.img.offsetWidth, ih = it.img.offsetHeight;
      if (!iw || !ih) return;
      it.cw = cw; it.ch = ch;
      it.box = [il / cw, (il + iw) / cw, 1 - (itp + ih) / ch, 1 - itp / ch];
    }
    function glDraw(list) {
      if (!gl) return;
      var c = gl.c, U = gl.U, sz = Math.max(W < 768 ? CONFIG.bendTouch : 0, Math.min(1, W / 1440));   // Mario rechnet in px für den Desktop
      var pe = prog;
      if (W < 768) { var q = Math.min(1, Math.abs(prog) / CONFIG.bendMax); pe = (prog < 0 ? -1 : 1) * CONFIG.bendMax * Math.pow(q, CONFIG.bendCurve); }
      var pc = Math.max(-CONFIG.bendMax, Math.min(CONFIG.bendMax, pe));
      c.clearColor(0, 0, 0, 0); c.clear(c.COLOR_BUFFER_BIT);
      c.uniform2f(U.uView, gl.w, gl.h);
      c.uniform1f(U.uP, pe);
      c.uniform1f(U.uPc, pc);
      c.uniform4f(U.uK, CONFIG.depth * sz, CONFIG.twist * sz, CONFIG.bow * sz, CONFIG.camera);
      c.uniform1f(U.uZoom, 1 - CONFIG.zoom * pe);
      for (var k = 0; k < list.length; k++) {
        var it = list[k].it;
        if (!it.tex || !it.box || it.el.style.visibility === 'hidden' || !(it.op > 0)) continue;
        c.bindTexture(c.TEXTURE_2D, it.tex);
        c.uniform2f(U.uCenter, list[k].x - gl.ox, gl.h - (list[k].y - gl.oy));
        c.uniform1f(U.uRot, -(list[k].r || 0));
        c.uniform2f(U.uSize, it.cw, it.ch);
        c.uniform1f(U.uOpacity, it.op);
        c.uniform4f(U.uBox, it.box[0], it.box[1], it.box[2], it.box[3]);
        c.uniform1f(U.uImageAspect, it.ar || 1);
        c.uniform1f(U.uCardAspect, it.cw / it.ch);
        c.drawElements(c.TRIANGLES, gl.n, c.UNSIGNED_SHORT, 0);
      }
    }

    // ---------- Zeichnen ----------
    // CRL-Rad (Klasse Rx): Radius 1.8 · H, Karte i auf Winkel t = wrap(i − q) · Abstand, x = R · sin t, y = R · (1 − cos t),
    // Drehung 1.2 · t. ring = 1: ganz Rad, 0: ganz Reihe (beim Eintritt legt sich das Rad am Schluss in die Reihe).
    var ring = 0, ringQ = 0;
    var rStep = Math.PI / 10;
    function ringStep() { return rStep; }
    // Abstand auf dem Rad aus der mittleren Kartenbreite (wie CRL: Lücke ≈ 1 Kartenbreite)
    function calcStep() {
      var sw = 0;
      for (var i = 0; i < items.length; i++) sw += items[i].w;
      var avg = items.length ? sw / items.length : H * 0.273, R = CONFIG.radius * H;
      rStep = 2 * Math.asin(Math.min(1, CONFIG.ringGap * avg / (2 * R)));
    }
    function ringTh(i) {
      var d = i - ringQ;
      if (loop) { d = d % n; if (d > n / 2) d -= n; else if (d < -n / 2) d += n; }
      return d * ringStep();
    }
    var drawn = false;   // erst zeichnen, wenn der Eintritt aufgesetzt ist (sonst landet eine Karte ungemessen oben links: Aufblitzen)
    function render() {
      if (!drawn) return;
      var list = gl ? [] : null, reach = W / 2 + 40, R = CONFIG.radius * H;
      for (var i = 0; i < items.length; i++) {
        var it = items[i], x = rel(i) * (1 - sq), y = 0, r = 0, z = -Math.abs(x);
        if (ring > 0) {
          var th = ringTh(i);
          z = Math.cos(th) * 1000;
          if (Math.abs(th) > 1.45) {
            if (ring >= 1) { if (it.vis) { it.el.classList.remove('is-vis'); it.vis = false; } continue; }
            th = th < 0 ? -1.45 : 1.45;
          }
          var xr = R * Math.sin(th), yr = R * (1 - Math.cos(th));
          x = x + (xr - x) * ring; y = yr * ring; r = CONFIG.tilt * th * ring;
        }
        var ext = (it.w + it.h) / 2;
        if (Math.abs(x) - ext > reach || y - ext > H) {
          if (it.vis) { it.el.classList.remove('is-vis'); it.vis = false; }
          continue;
        }
        var px = cx + x - it.w / 2, py = cy + y - it.h / 2;
        it.el.style.transform = 'translate3d(' + px.toFixed(2) + 'px,' + py.toFixed(2) + 'px,0)' + (r ? ' rotate(' + r.toFixed(4) + 'rad)' : '');
        if (!it.vis) { it.el.classList.add('is-vis'); it.vis = true; }
        it.el.style.zIndex = Math.round(1000 + z / 10);
        if (list) list.push({ it: it, x: cx + x, y: cy + y, r: r, z: z });
      }
      if (list) { list.sort(function (a, b) { return a.z - b.z; }); glDraw(list); }
      idx = nearestTo(P);
      if (idx !== shownIdx && mode !== 'intro' && mode !== 'outro') showMeta(idx);
      if (fill && items.length) {
        var span = items[items.length - 1].c, pos = P;
        if (loop) pos = ((P % L) + L) % L;
        fill.style.width = (span > 0 ? Math.max(0, Math.min(1, pos / span)) * 100 : 100).toFixed(2) + '%';
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

    // GSAP back.inOut(s)
    function backInOut(t, s) {
      function bi(p) { return p * p * ((s + 1) * p - s); }
      return t < 0.5 ? bi(t * 2) / 2 : 1 - bi((1 - t) * 2) / 2;
    }
    // GSAP back.out(s): beginnt mit der höchsten Geschwindigkeit
    function backOut(t, s) { var p = 1 - t; return 1 - p * p * ((s + 1) * p - s); }
    function sineInOut(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }
    function setOp(it, o) { it.op = o; it.el.style.opacity = o >= 1 ? '' : o.toFixed(3); }

    // ---------- Bewegung (Mario dt.update: lastX = lerp(lastX, currentX, ease); progress = (currentX − lastX) / Breite · velo) ----------
    function frame(now) {
      raf = 0;
      if (dirty && mode !== 'intro' && mode !== 'outro') { dirty = false; var keepC = mode === 'idle' && P === T ? items[idx] : null; measure(); if (keepC) P = T = keepC.c; }
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      var busy = false;
      if ((mode === 'outro' || mode === 'intro') && intro && intro.step) {
        busy = true;
        if (intro.step(now, dt)) { var dn = intro.done; intro = null; mode = 'idle'; if (dn) dn(); }
      } else if ((mode === 'intro' || mode === 'outro') && intro) {
        var t = Math.max(0, Math.min(1, (now - intro.t0) / intro.ms));
        var e = mode === 'intro' ? backInOut(t, CONFIG.introBack) : t * t * t;
        P = T = intro.from + (intro.to - intro.from) * e;
        prog = 0;
        if (intro.tick) intro.tick(now, t);
        busy = true;
        if (t >= 1) { mode = 'idle'; P = T = intro.to; var done = intro.done; intro = null; if (done) done(); }
      } else if (mode !== 'pv') {
        P += (T - P) * (1 - Math.pow(1 - CONFIG.ease, dt * 60));
        if (mode !== 'drag' && Math.abs(T - P) < 0.3) P = T;
        // Biegen auf Marios Grenze (±0.4) und weich nachgeführt, damit ein Schwung am Handy nicht springt oder überdreht
        var pt = Math.max(-CONFIG.bendMax, Math.min(CONFIG.bendMax, (P - T) / W * velo));
        // Handy (Hugo 21.11. 15:00): ein normaler Wisch verzerrt wenig, viele schnelle Wische hintereinander immer stärker.
        // „Schwung-Energie“ wächst mit jedem Wisch und klingt ab; sie bestimmt, wie viel vom Biegen ankommt.
        if (touchNow) {
          energy *= Math.exp(-dt / CONFIG.energyDecay);
          var amp = CONFIG.energyMin + (1 - CONFIG.energyMin) * sineInOut(Math.min(1, energy / CONFIG.energyFull));
          pt *= amp;
        }
        prog += (pt - prog) * (1 - Math.pow(1 - 0.2, dt * 60));
        if (P === T && Math.abs(prog) < 0.0005) prog = 0;
        busy = mode === 'drag' || P !== T || prog !== 0;
      }
      render();
      if (busy) kick(); else { last = 0; prog = 0; }
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    function goTo(i) {
      if (!items.length) return;
      T = near(i);
      if (mode !== 'pv') mode = 'idle';
      kick();
    }

    // ---------- Menü-Knopf ----------
    // Immer sichtbar. Beim Laden versteckt; sobald die Galerie geladen ist, bouncet er von unten hoch
    // wie der Close-Knopf im About der Homepage (Feder, wächst dabei und wackelt nach).
    function mbWrap() { return document.querySelector('.menu-toggle-wrap'); }
    function mbShow() {
      var w = mbWrap(); if (!w || w.classList.contains('lib-mb')) return;
      w.classList.add('mh-now', 'lib-mb-small'); void w.offsetWidth; w.classList.remove('mh-now');
      requestAnimationFrame(function () { w.classList.remove('lib-mb-small'); w.classList.add('lib-mb'); });
    }
    // Vorschau offen: Menü-Knopf wird zum Close-Knopf, genau wie beim About der Homepage.
    // Er fällt weg, heisst dann „close“, wird klein und bouncet bei 72 % der Öffnung mit der Feder hoch. Beim Schliessen umgekehrt.
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
      w.classList.remove('lib-mb');                              // fällt in voller Grösse weg (Website-Footer: --mh-down)
      var drop = 500;
      try { var v = getComputedStyle(document.documentElement).getPropertyValue('--mh-down').trim(); drop = parseFloat(v) * (v.indexOf('ms') > -1 ? 1 : 1000) || 500; } catch (e) {}
      mbT = setTimeout(function () {
        b.textContent = toClose ? (pvClose && pvClose.textContent.trim()) || 'close' : mbOrig;
        b.setAttribute('aria-label', toClose ? 'Vorschau schliessen' : 'Menü öffnen');
        w.classList.add('mh-now', 'lib-mb-small'); void w.offsetWidth; w.classList.remove('mh-now');
      }, Math.min(drop, popAt - 30));
      mbT2 = setTimeout(function () { w.classList.remove('lib-mb-small'); w.classList.add('lib-mb'); }, Math.max(popAt, drop + 40));
    }
    // Klick auf den Menü-Knopf bei offener Vorschau: schliesst die Vorschau statt das Menü zu öffnen
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
    root.addEventListener('pointerdown', function (e) {
      if (mode === 'intro' || mode === 'outro' || root.classList.contains('is-pv')) return;
      if (e.target.closest('.lib-top, .lib-pv')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY, p0: T, id: e.pointerId, touch: e.pointerType !== 'mouse', s: [] };
      touchNow = down.touch;
      moved = false; startIdx = idx;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down || e.pointerId !== down.id) return;
      var dx = e.clientX - down.x;
      if (!moved) {
        if (Math.abs(dx) < 6 && Math.abs(e.clientY - down.y) < 6) return;
        moved = true; mode = 'drag';
        down.x = e.clientX; down.p0 = T; dx = 0;   // ohne Sprung beim Start
        last = 0;
        root.classList.add('is-dragging');
      }
      T = clampT(down.p0 - dx * (down.touch ? CONFIG.speedTouch : CONFIG.speed));   // Mario: currentX = offX + (x − onX) · speed
      var now = performance.now();
      down.s.push([e.clientX, now]);
      while (down.s.length > 2 && now - down.s[0][1] > 100) down.s.shift();   // Tempo aus den letzten 100 ms
      kick();
    });
    function release(e, cancelled) {
      if (!down || (e && e.pointerId !== down.id)) return;
      root.classList.remove('is-dragging');
      if (moved || cancelled) {
        mode = 'idle';
        // Handy: Schwung aus dem Fingertempo, dann auf die nächste Karte (Maus wie Mario: ohne Schwung)
        var sm = down.s, now = performance.now();
        if (down.touch && !cancelled && sm.length > 1 && now - sm[sm.length - 1][1] < 80) {
          var a = sm[0], b = sm[sm.length - 1], dtS = (b[1] - a[1]) / 1000;
          if (dtS > 0.008) {
            var v = (b[0] - a[0]) / dtS, step = items.length ? L / items.length : W;
            var throwPx = Math.max(-CONFIG.flickMax * step, Math.min(CONFIG.flickMax * step, -v * CONFIG.speedTouch * CONFIG.flick));
            energy += Math.min(1.5, Math.abs(v) / CONFIG.energyFlick);
            T = clampT(T + throwPx);
            if (!loop && items.length) T = Math.max(items[0].c, Math.min(items[items.length - 1].c, T));
          }
        }
        snapT();
        kick();
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
        if (i > -1) { P = T = near(i); prog = 0; render(); openPreview(i); }
      }
    });
    function tap(x, y) {
      var el = document.elementFromPoint(x, y);
      var item = el && el.closest('.lib-item');
      if (!item) return;
      var i = items.findIndex(function (it) { return it.el === item; });
      if (i < 0) return;
      if (i === idx) { P = T = near(i); prog = 0; render(); openPreview(i); }
      else { goTo(i); activity(); }
    }

    // Trackpad und Mausrad (seitlich und senkrecht)
    var wheelT = 0;
    root.addEventListener('wheel', function (e) {
      if (e.target.closest && e.target.closest('.lib-pv-panel')) return;   // Vorschau scrollt selbst
      e.preventDefault();
      if (mode === 'intro' || mode === 'outro' || root.classList.contains('is-pv')) return;
      if (e.target.closest('.lib-sort-list')) return;
      // Mario: deltaY −= pixelY; deltaY −= pixelX; nach 150 ms Ruhe einrasten, solange Biegen mit 0.4
      var d = e.deltaX + e.deltaY;
      if (e.deltaMode === 1) d *= 32;
      if (!d) return;
      T = clampT(T + d);
      touchNow = false;
      velo = CONFIG.veloWheel; mode = 'idle'; kick();
      clearTimeout(wheelT);
      wheelT = setTimeout(function () { velo = CONFIG.velo; if (mode === 'idle') { snapT(); kick(); } }, CONFIG.wheelIdle);
    }, { passive: false });

    // Tastatur
    document.addEventListener('keydown', function (e) {
      if (html.classList.contains('menu-open')) return;
      if (root.classList.contains('is-pv')) { if (e.key === 'Escape') { e.preventDefault(); closePreview(); } return; }
      if (top && top.classList.contains('is-open') && e.key === 'Escape') { setOpen(false); return; }
      if (mode === 'intro' || mode === 'outro') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        var k = nearestTo(T) + (e.key === 'ArrowRight' ? 1 : -1);
        if (loop) k = (k + n) % n; else k = Math.max(0, Math.min(n - 1, k));
        T = near(k); mode = 'idle'; kick();
      }
    });

    // ---------- Eintritt: Bilder kommen zusammen ----------
    // Eintritt exakt wie CRL (Ux._spinIntro): siehe CONFIG
    function allTex() { return !gl || items.every(function (it) { return it.tex || it.texFail; }); }
    function runIntro(done) {
      measure();
      wheel.style.opacity = '';
      velo = CONFIG.velo; prog = 0; sq = 0;
      var c0 = items.length ? items[0].c : 0;
      drawn = true;
      if (reduce || !items.length) { ring = 0; P = T = c0; mode = 'idle'; items.forEach(function (it) { setOp(it, 1); }); render(); if (done) done(); return; }
      calcStep();
      // CRL: genau eine Umdrehung
      var q0 = -Math.max(1, Math.round(2 * Math.PI / rStep));
      var perItem = L / n;
      items.forEach(function (it) { setOp(it, 0); it.th = null; it.fade = 0; it.want = false; });
      ring = 1; ringQ = q0; P = T = c0 + q0 * perItem;
      mode = 'intro';
      var t0 = performance.now(), tr = 0;
      // Einblend-Linie: CRL 0.85 rad; bei wenigen Projekten ist der Kreis kürzer, dann knapp vor dessen Ende
      var fadeAt = loop ? Math.min(CONFIG.fadeAt, (n / 2 - 0.5) * ringStep()) : CONFIG.fadeAt;
      function fadeOp(it, now) { setOp(it, sineInOut(Math.max(0, Math.min(1, (now - it.fade) / CONFIG.fadeMs)))); }
      intro = { done: function () {
          ring = 0; ringQ = 0;
          var t1 = performance.now(), rest = items.filter(function (it) { return it.op < 1; });
          rest.forEach(function (it) { if (!it.fade || it.fade > t1) it.fade = t1; });
          if (rest.length) (function f() {
            var now = performance.now();
            rest.forEach(function (it) { fadeOp(it, now); });
            render();
            if (rest.some(function (it) { return it.op < 1; })) requestAnimationFrame(f);
          })();
          afterIntro();
          if (done) done();
        }, step: function (now) {
          if (!tr) {
            // kurz auf die Bilder warten (höchstens introAll), dann losdrehen
            if (!(allTex() || performance.now() - t0 >= CONFIG.introAll)) return false;
            if (dirty) { dirty = false; measure(); c0 = items[0].c; perItem = L / n; calcStep(); }
            tr = now - CONFIG.introSkip * CONFIG.introMs;
            // wie CRL: keine Karte ist beim Losdrehen schon da, alle kommen von rechts über die Einblend-Linie
            for (var j = 0; j < items.length; j++) items[j].th = ringTh(j);
          }
          var t = Math.max(0, Math.min(1, (now - tr) / CONFIG.introMs));
          ringQ = q0 * (1 - backOut(t, CONFIG.introBack));
          P = T = c0 + ringQ * perItem;
          // am Schluss legt sich das Rad in die gerade Reihe
          var u = Math.max(0, (t - (1 - CONFIG.settle)) / CONFIG.settle);
          ring = 1 - (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
          for (var i = 0; i < items.length; i++) {
            var it = items[i], th = ringTh(i);
            // hinten ums Rad gesprungen (weniger Projekte als eine Umdrehung): kommt wie neu von rechts
            if (loop && it.th !== null && th - it.th > Math.max(0.5, n * rStep / 2)) { it.fade = 0; it.want = false; setOp(it, 0); }
            if (!it.fade && it.th !== null && it.th > fadeAt && th <= fadeAt && it.th - th < 1) it.want = true;
            // Bild noch nicht bereit: einblenden, sobald es da ist
            if (it.want && !it.fade && (!gl || it.tex || it.texFail)) it.fade = now;
            it.th = th;
            if (it.fade) fadeOp(it, now);
          }
          if (t >= 1) { ringQ = 0; P = T = c0; ring = 0; return true; }
          return false;
        } };
      last = 0; kick();
    }
    // Nach dem Eintritt: Karten auf die kleinen Bildkopien umstellen (vorher nicht, sonst ruckelt das Abrollen)
    function afterIntro() {
      var list = all.filter(function (it) { return it.cv2 && !it.small; }), k = 0;
      (function next() {
        if (k >= list.length || mode === 'intro' || mode === 'outro') return;
        var it = list[k++];
        it.cv2.toBlob(function (bl) {
          if (bl) {
            it.small = URL.createObjectURL(bl);
            var pre = new Image(); pre.src = it.small;
            (pre.decode ? pre.decode() : Promise.resolve()).then(function () {
              if (it.img.srcset) { it.img.removeAttribute('srcset'); it.img.removeAttribute('sizes'); }
              it.img.src = it.small;
            }, function () {});
          }
          setTimeout(next, 60);
        }, 'image/jpeg', 0.9);
      })();
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
    // Auswahl wechseln (Hugo 21.11.): alle Bilder ziehen sich zu einem zusammen, der Stapel blendet aus,
    // dann kommt die neue Auswahl wie beim ersten Laden (erstes Bild blendet auf, dann rollt es wie CRL)
    function inOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function applyFilter() {
      if (mode === 'outro') return;
      if (meta) meta.classList.add('is-swap');
      clearTimeout(wheelT); velo = CONFIG.velo;
      if (reduce || !items.length) { swapNow(); runIntro(function () { showMeta(nearestTo(P), true); }); return; }
      if (mode === 'intro') { intro = null; }
      P = T = P; prog = 0;
      var t0 = performance.now(), op0 = items.map(function (it) { return it.op; });
      mode = 'outro';
      intro = { done: function () {
          sq = 0;
          swapNow();
          runIntro(function () { showMeta(nearestTo(P), true); });
        }, step: function (now) {
          var t = now - t0;
          sq = inOutCubic(Math.min(1, t / CONFIG.gatherMs));
          var f = Math.max(0, (t - CONFIG.gatherMs * 0.75) / CONFIG.gatherFade);
          var o = 1 - sineInOut(Math.min(1, f));
          items.forEach(function (it, i) { setOp(it, Math.min(op0[i], o)); });
          return f >= 1;
        } };
      last = 0; kick();
    }
    function swapNow() {
      items.forEach(function (it) { it.el.classList.remove('is-vis'); it.vis = false; });
      items = all.filter(function (it) { return !current || it.cats.indexOf(current) > -1; });
      all.forEach(function (it) { it.el.style.display = items.indexOf(it) > -1 ? '' : 'none'; });
      shownIdx = -1;
      measure();
    }

    // ---------- Vorschau ----------
    var pvPanel = pv && pv.querySelector('.lib-pv-panel');
    var pvMedia = pv && pv.querySelector('.lib-pv-media');
    var pvName = pv && pv.querySelector('.lib-pv-name');
    var pvYear = pv && pv.querySelector('.lib-pv-year');
    var pvText = pv && pv.querySelector('.lib-pv-text');
    var pvOpen = pv && pv.querySelector('.lib-pv-open');
    var pvClose = pv && pv.querySelector('.lib-pv-close');
    // „Galerie öffnen“ wie auf der Homepage aufbauen: Text + Pfeil →
    if (pvOpen) {
      var goTxt = pvOpen.textContent.trim() || 'Galerie öffnen';
      pvOpen.classList.remove('grey', 'is-menu');
      pvOpen.classList.add('lib-pv-go');
      pvOpen.textContent = '';
      var gl1 = document.createElement('span'); gl1.className = 'lib-sort-label'; gl1.textContent = goTxt;
      var gl2 = document.createElement('span'); gl2.className = 'lib-sort-arrow'; gl2.setAttribute('aria-hidden', 'true'); gl2.textContent = '\u2192';
      pvOpen.appendChild(gl1); pvOpen.appendChild(gl2);
    }
    var pvItem = null, lastFocus = null, pvTimer = 0, pvAt = 0;
    if (pv) { pv.setAttribute('role', 'dialog'); pv.setAttribute('aria-modal', 'true'); pv.setAttribute('aria-hidden', 'true'); if ('inert' in pv) pv.inert = true; }

    function cloneImg(img) {
      // Dasselbe Bild wie in der Karte (schon geladen): kein Nachladen, kein Aufblitzen beim Öffnen
      var c = document.createElement('img');
      c.src = img.currentSrc || img.src;
      c.decoding = 'sync';
      c.alt = img.alt || '';
      return c;
    }
    // Ein Bild fliegt von Rechteck a nach Rechteck b
    function fly(img, a, b, ms, done, delay) {
      var f = document.createElement('div');
      f.className = 'lib-fly';
      f.style.width = b.width + 'px'; f.style.height = b.height + 'px';
      var c = document.createElement('img');
      c.decoding = 'sync'; c.src = img.currentSrc || img.src; c.alt = '';
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

    // Wo das Bild in der Vorschau wirklich steht: Feld hat feste Höhe, Breite höchstens max-width, Bild oben links eingepasst.
    // (Das img-Feld selbst kann bei Querformat höher sein als das Bild, darum nicht dessen Rechteck nehmen.)
    function mediaRect(it) {
      var mr = pvMedia.getBoundingClientRect();
      var ar = it.img.naturalWidth ? it.img.naturalWidth / it.img.naturalHeight : it.w / it.h;
      var maxW = parseFloat(getComputedStyle(pvMedia).maxWidth) || Infinity;
      var h = mr.height, w = Math.min(maxW, h * ar); h = w / ar;
      return { left: mr.left, top: mr.top, width: w, height: h };
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
      mbSwap(true, reduce ? 0 : CONFIG.pvMs * 0.72);
      prefetch(it.href);
      pvPanel.scrollTop = 0;
      var panelR = fitPanel();

      var target = pvMedia && pvMedia.firstChild;
      if (!target) { pvFrame.style.transform = box(panelR); root.classList.add('is-pv', 'is-pv-dim', 'is-pv-in'); mode = 'pv'; return; }
      var b = mediaRect(it);
      var a = rect(it.img.getBoundingClientRect());
      var cardR = rect((it.a || it.img).getBoundingClientRect());
      var D = CONFIG.pvMs;
      // Bild in der Vorschau genau so gross wie es zu sehen ist (kein leeres Feld): der Flug in die Projektseite gleitet dann sauber
      target.style.width = b.width + 'px'; target.style.height = b.height + 'px'; target.style.maxWidth = 'none';
      target.classList.add('is-wait');
      it.el.style.visibility = 'hidden';
      mode = 'pv'; pvState = 'opening';
      render();
      pvFrame.style.transform = box(cardR);
      root.classList.add('is-pv', 'is-pv-dim');
      // Bild fliegt an seinen Platz und der weisse Rahmen geht gleichzeitig zur Vorschau auf: gleiche Dauer, gleiche Kurve,
      // darum liegt das Bild auf dem ganzen Weg im Rahmen. Text blendet ab gut der Hälfte ein.
      frameTo([
        { transform: box(cardR), easing: EASE },
        { transform: box(panelR) }
      ], D, function () { pvFrame.style.transform = box(panelR); if (pvState === 'opening') pvState = 'open'; });
      fly(it.img, a, b, D, function () { target.classList.remove('is-wait'); });
      pvTimer2 = setTimeout(function () {
        if (pvItem !== it || !root.classList.contains('is-pv')) return;
        root.classList.add('is-pv-in');
      }, reduce ? 0 : D * 0.55);
    }
    function closePreview() {
      if (!root.classList.contains('is-pv') || pvState === 'closing') return;
      var it = pvItem, target = pvMedia && pvMedia.firstChild;
      pvItem = null; pvState = 'closing';
      mbSwap(false, reduce ? 0 : CONFIG.pvCloseMs * 0.72 + 300);
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
      var b = mediaRect(it);
      var cardR = rect((it.a || it.img).getBoundingClientRect());
      var a = rect(it.img.getBoundingClientRect());
      var D = CONFIG.pvCloseMs;
      // Rahmen und Bild gleichzeitig zurück ins Rad (gleiche Dauer und Kurve)
      var from = getComputedStyle(pvFrame).transform;   // auch mitten im Öffnen ohne Sprung
      frameTo([
        { transform: from && from !== 'none' ? from : box(panelR), easing: EASE },
        { transform: box(cardR) }
      ], D, function () {
        it.el.style.visibility = '';
        render();
        requestAnimationFrame(finish);
      });
      // gleiche Uhr wie der Rahmen (verzögert statt Timer), damit Bild und Rahmen nie auseinanderlaufen
      target.classList.add('is-wait');
      fly(it.img, b, a, D);
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
      go(); return;   // nicht mehr auf das Ende des Homepage-Übergangs warten: dreht schon, während die Homepage ausblendet
      var t0 = performance.now();
      (function wait() {
        if (!html.classList.contains('hs-vt-fade') || performance.now() - t0 > CONFIG.vtStart) go();
        else requestAnimationFrame(wait);
      })();
    }
    // Die ersten Bilder abwarten (höchstens introWait), alle übrigen laden während des Eintritts weiter.
    function prep(it) {
      if (gl) return glTex(it);   // Textur lädt sofort und unabhängig vom Bild auf der Seite
      return it.img.decode ? it.img.decode().catch(function () {}) : Promise.resolve();
    }
    // Alle Bilder laden sofort parallel; gestartet wird, sobald das erste da ist (es blendet zuerst auf).
    // Abgerollt wird erst, wenn alle auf dem Grafikchip sind (siehe runIntro), darum ruckelt es nicht.
    all.forEach(prep);
    (items[0] ? prep(items[0]) : Promise.resolve()).then(start);
    setTimeout(start, CONFIG.introWait);
    // Später geladene Bilder: Breiten neu messen, ohne Sprung
    all.forEach(function (it) {
      it.img.addEventListener('load', function () {
        if (!started || mode === 'intro') return;
        var keep = items[idx];
        measure();
        if (mode === 'idle' && keep) { P = T = near(items.indexOf(keep)); }
        render();
      });
    });

    var rT = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(function () {
        if (!started) return;   // vor dem Eintritt nichts zeichnen (iPhone meldet beim Laden Grössenänderungen; sonst blitzt die Galerie auf)
        var keep = items[idx];
        measure();
        if (mode !== 'intro' && mode !== 'outro' && keep) { P = T = near(items.indexOf(keep)); if (mode !== 'pv') mode = 'idle'; }
        render();
        if (pvState === 'open' && pvFrame) { if (pvAnim) { pvAnim.cancel(); pvAnim = null; } pvFrame.style.transform = box(fitPanel()); }
      }, 80);
    });
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      // Zurück aus der Projektseite: Vorschau bleibt offen, das Bild fliegt dorthin zurück
      measure(); P = T = near(idx); render();
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
