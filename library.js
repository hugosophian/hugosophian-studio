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
    // Rad und Bewegung wie CRL (crl-2k26.vercel.app/main.js, Klassen Rx und Nv), Masse in Bildschirmhöhen H
    radius:     1.8,    // Radius des Rads = 1.8 · H (CRL)
    ringMin:    20,     // Abstand der Bilder: ein Kreis hat mindestens so viele Plätze (CRL: 20 Projekte = 18°)
    tilt:       1.2,    // Bild dreht sich 1.2 × so stark wie sein Platz auf dem Kreis (CRL)
    drag:       0.005,  // Bilder pro px Finger-/Mausweg (CRL dragSensitivity)
    wheelK:     0.0005, // Bilder pro px Mausrad/Trackpad (CRL: 0.5 · 0.001)
    lerp:       0.08,   // Nachlaufzeit in s (CRL lerpFactor, exponentiell)
    snap:       0.1,    // Einrasten pro Bild (60 fps), wenn nicht gezogen wird (CRL snapStrength)
    pullMax:    1.2,    // Biegen: Abstand Ziel–Anzeige, begrenzt (CRL)
    pullEase:   0.15,   // Biegen folgt pro Bild (CRL)
    gl:         true,   // Bilder per WebGL wie CRL (Biegen, Bewegungsunschärfe); ohne WebGL normale Karten
    edgeGuard:  40,     // px am Rand, in denen Safaris Zurück-Wischen gesperrt ist
    // Eintritt wie CRL (_spinIntro): das Rad dreht eine ganze Runde in 3 s (back.inOut(.54)),
    // jedes Bild blendet ein, wenn es von rechts bei 0.85 rad ankommt (0.4 s sine.inOut)
    introDelay: 450,    // ms schwarz, bevor das Rad dreht (CRL: 0.45 s nach dem Vorhang)
    introMs:    3000,
    introBack:  0.54,
    fadeAt:     0.85,
    fadeMs:     400,
    // Auswahl wechseln: Rad dreht beschleunigt weiter und blendet aus, dann Eintritt mit der neuen Auswahl
    outroMs:    750,
    outroSpin:  4,      // Bilder, die dabei vorbeidrehen
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
        w: 0, h: 0, op: 1, vis: false
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
    // Position in Bildern: P = Anzeige, T = Ziel (CRL: current / target, Vorzeichen umgedreht)
    var P = 0, T = 0;
    var pull = 0;                // Biegen (CRL: pull)
    var mode = 'idle';           // idle | drag | intro | outro | pv
    var idx = 0, shownIdx = -1;
    var n = 1, step = 0.3, ringR = 1, H = 1, cx = 0, cy = 0, loop = true;
    var raf = 0, last = 0, intro = null, settleT = 0;

    // ---------- Masse ----------
    function measure() {
      H = window.innerHeight;
      n = Math.max(1, items.length);
      step = 2 * Math.PI / Math.max(n, CONFIG.ringMin);
      ringR = CONFIG.radius * H;
      cx = stage.clientWidth / 2;
      cy = stage.clientHeight / 2;
      var maxW = 0;
      items.forEach(function (it) {
        var h = it.img.offsetHeight, w = it.img.offsetWidth;
        if ((!w || w < 2) && h) w = it.img.naturalWidth ? h * it.img.naturalWidth / it.img.naturalHeight : h * 0.8;
        it.w = Math.max(it.el.offsetWidth, w); it.h = Math.max(it.el.offsetHeight, h);
        maxW = Math.max(maxW, it.w);
      });
      if (gl) { glSize(); items.forEach(glMeasure); }
      // Endlos wie CRL, ausser bei so wenigen Bildern, dass man den Sprung am Rand sehen würde
      var edge = Math.min(Math.PI / 2, (n / 2 - 0.5) * step);
      loop = n > 2 && (ringR * Math.sin(edge) - maxW > window.innerWidth / 2 || ringR * (1 - Math.cos(edge)) > H);
    }
    function wrap(d) { var i = d % n; if (Math.abs(i) > n / 2) i = i > 0 ? i - n : i + n; return i; }
    function rel(i) { return loop ? wrap(i - P) : i - P; }                 // Abstand von Bild i zur Mitte, in Bildern
    function near(i) { return loop ? P + wrap(i - P) : i; }                // Ziel, um Bild i in die Mitte zu holen
    function nearest(p) { var r = Math.round(p); return loop ? ((r % n) + n) % n : Math.max(0, Math.min(n - 1, r)); }
    function clampT(t) { return loop ? t : Math.max(-1, Math.min(n, t)); }  // CRL bounceLimit: 1 Bild über den Rand

    // ---------- Bilder als WebGL-Flächen wie CRL (Shader Lx / Dx): Biegen, weisser Rahmen, Bewegungsunschärfe ----------
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
        'uniform vec2 uCenter; uniform vec2 uSize; uniform float uRot; uniform vec2 uBend; uniform vec2 uView;',
        'varying vec2 vUv;',
        'void main() {',
        '  vUv = aUv;',
        '  float s = sin(aUv.y * 3.14159265);',
        '  vec2 p = vec2((aUv.x - 0.5) * uSize.x - s * uBend.x, (aUv.y - 0.5) * uSize.y + s * uBend.y);',
        '  float cs = cos(uRot), sn = sin(uRot);',
        '  p = vec2(p.x * cs - p.y * sn, p.x * sn + p.y * cs) + uCenter;',
        '  gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, p.y / uView.y * 2.0 - 1.0, 0.0, 1.0);',
        '}'].join('\n');
      var FS = [
        'precision mediump float;',
        'uniform sampler2D uTex; uniform float uOpacity; uniform vec4 uBox; uniform float uImageAspect; uniform float uCardAspect; uniform vec2 uOffset;',
        'varying vec2 vUv;',
        'void main() {',
        '  float x0 = uBox.x, x1 = uBox.y, y0 = uBox.z, y1 = uBox.w;',
        '  if (vUv.x < x0 || vUv.x > x1 || vUv.y < y0 || vUv.y > y1) { gl_FragColor = vec4(uOpacity); return; }',
        '  vec2 p = vec2((vUv.x - x0) / (x1 - x0), (vUv.y - y0) / (y1 - y0));',
        '  float ia = uCardAspect * ((x1 - x0) / (y1 - y0));',
        '  vec2 uv = p;',
        '  if (uImageAspect > ia) { uv.x = 0.5 + (p.x - 0.5) * ia / uImageAspect; } else { uv.y = 0.5 + (p.y - 0.5) * uImageAspect / ia; }',
        '  float sp = length(uOffset);',
        '  vec2 st = sp > 1e-4 ? (uOffset / sp) * min(sp, 0.1) : vec2(0.0);',
        '  vec3 col = vec3(0.0);',
        '  for (int i = 0; i < 10; i++) { float t = float(i) / 9.0 - 0.5; col += texture2D(uTex, clamp(uv + st * t, 0.0, 1.0)).rgb; }',
        '  col /= 10.0;',
        '  gl_FragColor = vec4(col * uOpacity, uOpacity);',
        '}'].join('\n');
      function sh(type, src) { var s = c.createShader(type); c.shaderSource(s, src); c.compileShader(s); return c.getShaderParameter(s, c.COMPILE_STATUS) ? s : null; }
      var vs = sh(c.VERTEX_SHADER, VS), fs = sh(c.FRAGMENT_SHADER, FS);
      if (!vs || !fs) return;
      var pr = c.createProgram(); c.attachShader(pr, vs); c.attachShader(pr, fs); c.linkProgram(pr);
      if (!c.getProgramParameter(pr, c.LINK_STATUS)) return;
      c.useProgram(pr);
      // Fläche 32 × 32 wie CRL (PlaneGeometry), damit das Biegen rund wird
      var N = 32, uv = [], ix = [];
      for (var j = 0; j <= N; j++) for (var i = 0; i <= N; i++) uv.push(i / N, j / N);
      for (j = 0; j < N; j++) for (i = 0; i < N; i++) { var a = j * (N + 1) + i, b = a + 1, d = a + N + 1, e = d + 1; ix.push(a, b, d, b, e, d); }
      var vb = c.createBuffer(); c.bindBuffer(c.ARRAY_BUFFER, vb); c.bufferData(c.ARRAY_BUFFER, new Float32Array(uv), c.STATIC_DRAW);
      var ib = c.createBuffer(); c.bindBuffer(c.ELEMENT_ARRAY_BUFFER, ib); c.bufferData(c.ELEMENT_ARRAY_BUFFER, new Uint16Array(ix), c.STATIC_DRAW);
      var loc = c.getAttribLocation(pr, 'aUv'); c.enableVertexAttribArray(loc); c.vertexAttribPointer(loc, 2, c.FLOAT, false, 0, 0);
      var U = {}; ['uCenter', 'uSize', 'uRot', 'uBend', 'uView', 'uTex', 'uOpacity', 'uBox', 'uImageAspect', 'uCardAspect', 'uOffset'].forEach(function (k) { U[k] = c.getUniformLocation(pr, k); });
      c.uniform1i(U.uTex, 0);
      c.enable(c.BLEND); c.blendFunc(c.ONE, c.ONE_MINUS_SRC_ALPHA);
      c.pixelStorei(c.UNPACK_FLIP_Y_WEBGL, true);
      wheel.insertBefore(cv, wheel.firstChild);
      gl = { c: c, cv: cv, U: U, n: ix.length, dpr: 1, w: 0, h: 0, ox: 0, oy: 0, dead: false };
      cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); glOff(); }, false);
    })();
    function glOff() {
      if (!gl) return;
      gl.dead = true; gl.cv.style.display = 'none';
      all.forEach(function (it) { it.el.classList.remove('is-gl'); });
      gl = null;
    }
    function glSize() {
      if (!gl) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, Hh = window.innerHeight;
      var sr = stage.getBoundingClientRect();
      gl.ox = -sr.left; gl.oy = -sr.top;
      gl.cv.style.left = gl.ox + 'px'; gl.cv.style.top = gl.oy + 'px';
      gl.cv.style.width = W + 'px'; gl.cv.style.height = Hh + 'px';
      gl.cv.width = Math.round(W * dpr); gl.cv.height = Math.round(Hh * dpr);
      gl.dpr = dpr; gl.w = W; gl.h = Hh;
      gl.c.viewport(0, 0, gl.cv.width, gl.cv.height);
    }
    // Textur laden (Webflow-CDN erlaubt das wie bei CRL). Klappt es nicht, bleibt die normale Karte sichtbar.
    function glTex(it) {
      if (!gl || it.tex || it.texLoading) return;
      it.texLoading = true;
      var im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = function () {
        if (!gl) return;
        var c = gl.c, t = c.createTexture();
        c.bindTexture(c.TEXTURE_2D, t);
        try { c.texImage2D(c.TEXTURE_2D, 0, c.RGBA, c.RGBA, c.UNSIGNED_BYTE, im); } catch (e) { return; }
        c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MIN_FILTER, c.LINEAR);
        c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MAG_FILTER, c.LINEAR);
        c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_S, c.CLAMP_TO_EDGE);
        c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_T, c.CLAMP_TO_EDGE);
        it.tex = t; it.ar = im.naturalWidth / im.naturalHeight;
        it.el.classList.add('is-gl');
        glMeasure(it);
        render();
      };
      im.onerror = function () { it.texLoading = false; };
      im.src = it.img.currentSrc || it.img.src;
    }
    // Weisser Rand als Anteil der Karte (aus den Abständen im Designer)
    function glMeasure(it) {
      if (!it.a) return;
      var cw = it.a.offsetWidth, ch = it.a.offsetHeight;
      if (!cw || !ch) return;
      var il = it.img.offsetLeft, itp = it.img.offsetTop, iw = it.img.offsetWidth, ih = it.img.offsetHeight;
      if (it.img.offsetParent !== it.a) { var ar = it.a.getBoundingClientRect(), rr = it.img.getBoundingClientRect(); il = rr.left - ar.left; itp = rr.top - ar.top; }
      it.cw = cw; it.ch = ch;
      it.box = [il / cw, (il + iw) / cw, 1 - (itp + ih) / ch, 1 - itp / ch];
    }
    function glDraw(list) {
      if (!gl) return;
      var c = gl.c, U = gl.U, K = H / 0.8284;   // CRL: Kamera 45°, Abstand 1 → 1 Welteinheit = H / 0.8284 px
      c.clearColor(0, 0, 0, 0); c.clear(c.COLOR_BUFFER_BIT);
      c.uniform2f(U.uView, gl.w, gl.h);
      c.uniform2f(U.uBend, 0.12 * pull * 0.3 * K, 0.06 * pull * 0.1 * K);
      c.uniform2f(U.uOffset, 0.06 * pull, 0.12 * pull);
      list.sort(function (a, b) { return a.z - b.z; });
      for (var k = 0; k < list.length; k++) {
        var it = list[k].it;
        if (!it.tex || !it.box || it.el.style.visibility === 'hidden' || !(it.op > 0)) continue;
        c.bindTexture(c.TEXTURE_2D, it.tex);
        c.uniform2f(U.uCenter, list[k].x - gl.ox, gl.h - (list[k].y - gl.oy));
        c.uniform2f(U.uSize, it.cw, it.ch);
        c.uniform1f(U.uRot, -list[k].r);
        c.uniform1f(U.uOpacity, it.op);
        c.uniform4f(U.uBox, it.box[0], it.box[1], it.box[2], it.box[3]);
        c.uniform1f(U.uImageAspect, it.ar || 1);
        c.uniform1f(U.uCardAspect, it.cw / it.ch);
        c.drawElements(c.TRIANGLES, gl.n, c.UNSIGNED_SHORT, 0);
      }
    }

    // ---------- Zeichnen ----------
    function render() {
      var W = window.innerWidth, list = gl ? [] : null;
      for (var i = 0; i < items.length; i++) {
        var it = items[i], th = rel(i) * step;
        var x = ringR * Math.sin(th), y = ringR * (1 - Math.cos(th));
        if (Math.abs(th) > 1.45 || Math.abs(x) - it.w > W / 2 + 40 || y - it.h > H) {
          if (it.vis) { it.el.classList.remove('is-vis'); it.vis = false; }
          continue;
        }
        var px = cx + x - it.w / 2, py = cy + y - it.h / 2;
        it.el.style.transform = 'translate3d(' + px.toFixed(2) + 'px,' + py.toFixed(2) + 'px,0) rotate(' + (CONFIG.tilt * th).toFixed(4) + 'rad)';
        it.el.style.zIndex = Math.round(100 + 100 * Math.cos(th));
        if (!it.vis) { it.el.classList.add('is-vis'); it.vis = true; }
        if (list) { if (!it.tex) glTex(it); list.push({ it: it, x: cx + x, y: cy + y, r: CONFIG.tilt * th, z: Math.cos(th) }); }
      }
      if (list) glDraw(list);
      idx = nearest(P);
      if (idx !== shownIdx && mode !== 'intro' && mode !== 'outro') showMeta(idx);
      if (fill) {
        var pos = loop ? ((P % n) + n) % n : Math.max(0, Math.min(n - 1, P));
        fill.style.width = (n > 1 ? Math.min(1, pos / (n - 1)) * 100 : 100).toFixed(2) + '%';
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
    function sineInOut(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }
    function setOp(it, o) { it.op = o; it.el.style.opacity = o >= 1 ? '' : o.toFixed(3); }

    // ---------- Bewegung (CRL Nv.update + Rx.update) ----------
    function frame(now) {
      raf = 0;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      var f60 = dt * 60, busy = false;
      if ((mode === 'intro' || mode === 'outro') && intro) {
        var t = Math.max(0, Math.min(1, (now - intro.t0) / intro.ms));
        var e = mode === 'intro' ? backInOut(t, CONFIG.introBack) : t * t * t;
        P = T = intro.from + (intro.to - intro.from) * e;
        if (intro.tick) intro.tick(now, t);
        busy = true;
        if (t >= 1) { mode = 'idle'; P = T = intro.to; var done = intro.done; intro = null; if (done) done(); }
      } else if (mode !== 'pv') {
        if (mode !== 'drag') T += (Math.round(T) - T) * (1 - Math.pow(1 - CONFIG.snap, f60));
        P = T + (P - T) * Math.exp(-dt / CONFIG.lerp);
        if (mode !== 'drag' && Math.abs(T - P) < 0.0005 && Math.abs(Math.round(T) - T) < 0.0005) { P = T = Math.round(T); }
        busy = mode === 'drag' || P !== T || Math.abs(pull) > 0.001;
      }
      var s = Math.max(-CONFIG.pullMax, Math.min(CONFIG.pullMax, T - P));
      pull += (s - pull) * (1 - Math.pow(1 - CONFIG.pullEase, f60));
      if (!busy && Math.abs(pull) < 0.001) pull = 0;
      render();
      if (busy || pull) kick(); else last = 0;
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
        last = 0;
        root.classList.add('is-dragging');
      }
      T = clampT(down.p0 - dx * CONFIG.drag);   // CRL: 0.005 Bilder pro px, ohne Schwung
      kick();
    });
    function release(e, cancelled) {
      if (!down || (e && e.pointerId !== down.id)) return;
      root.classList.remove('is-dragging');
      if (moved || cancelled) {
        mode = 'idle';
        T = loop ? Math.round(T) : Math.max(0, Math.min(n - 1, Math.round(T)));   // CRL: beim Loslassen aufs nächste Bild
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
        if (i > -1) { P = T = near(i); pull = 0; render(); openPreview(i); }
      }
    });
    function tap(x, y) {
      var el = document.elementFromPoint(x, y);
      var item = el && el.closest('.lib-item');
      if (!item) return;
      var i = items.findIndex(function (it) { return it.el === item; });
      if (i < 0) return;
      if (i === idx) { P = T = near(i); pull = 0; render(); openPreview(i); }
      else { goTo(i); activity(); }
    }

    // Trackpad und Mausrad (seitlich und senkrecht)
    var wheelT = 0;
    root.addEventListener('wheel', function (e) {
      if (e.target.closest && e.target.closest('.lib-pv-panel')) return;   // Vorschau scrollt selbst
      e.preventDefault();
      if (mode === 'intro' || mode === 'outro' || root.classList.contains('is-pv')) return;
      if (e.target.closest('.lib-sort-list')) return;
      // CRL (virtual-scroll, scrollInput): grössere Richtung zählt, 0.5 · 0.001 Bilder pro px, Einrasten zieht laufend
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (e.deltaMode === 1) d *= 30;
      if (!d) return;
      T = clampT(T + d * CONFIG.wheelK);
      if (!loop) T = Math.max(0, Math.min(n - 1, T));
      mode = 'idle'; kick();
    }, { passive: false });

    // Tastatur
    document.addEventListener('keydown', function (e) {
      if (html.classList.contains('menu-open')) return;
      if (root.classList.contains('is-pv')) { if (e.key === 'Escape') { e.preventDefault(); closePreview(); } return; }
      if (top && top.classList.contains('is-open') && e.key === 'Escape') { setOpen(false); return; }
      if (mode === 'intro' || mode === 'outro') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); T = clampT(Math.round(T) + 1); if (!loop) T = Math.min(n - 1, T); mode = 'idle'; kick(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); T = clampT(Math.round(T) - 1); if (!loop) T = Math.max(0, T); mode = 'idle'; kick(); }
    });

    // ---------- Eintritt: Bilder kommen zusammen ----------
    function runIntro(done) {
      measure();
      wheel.style.opacity = '';
      if (reduce || !items.length) { P = T = 0; pull = 0; mode = 'idle'; items.forEach(function (it) { setOp(it, 1); }); render(); if (done) done(); return; }
      // CRL _spinIntro: von −n auf 0 (eine ganze Runde), alle Bilder unsichtbar, jedes blendet ein,
      // sobald es von rechts kommend 0.85 rad unterschreitet; beim Landen der Rest
      items.forEach(function (it) { setOp(it, 0); it.th = null; it.fade = 0; });
      P = T = -n; pull = 0; mode = 'intro';
      render();
      function fades(now) {
        for (var i = 0; i < items.length; i++) {
          var it = items[i], th = rel(i) * step;
          if (!it.fade && it.th !== null && it.th > CONFIG.fadeAt && th <= CONFIG.fadeAt && it.th - th < 1) it.fade = now;
          it.th = th;
          if (it.fade) setOp(it, Math.min(1, sineInOut(Math.min(1, (now - it.fade) / CONFIG.fadeMs))));
        }
      }
      intro = { from: -n, to: 0, t0: performance.now() + CONFIG.introDelay, ms: CONFIG.introMs, tick: fades,
        done: function () {
          // gelandet: noch nicht sichtbare Bilder blenden ein
          var t0 = performance.now(), rest = items.filter(function (it) { return it.op < 1; });
          if (rest.length) (function f() {
            var now = performance.now();
            rest.forEach(function (it) { if (!it.fade) it.fade = t0; setOp(it, Math.min(1, sineInOut(Math.min(1, (now - it.fade) / CONFIG.fadeMs)))); });
            if (rest.some(function (it) { return it.op < 1; })) requestAnimationFrame(f);
          })();
          if (done) done();
        } };
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
      mode = 'outro';
      intro = { from: P, to: P + CONFIG.outroSpin, t0: performance.now(), ms: CONFIG.outroMs, done: done,
        tick: function (now, t) { wheel.style.opacity = (1 - Math.max(0, (t - 0.35) / 0.65)).toFixed(3); } };
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
      render();
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
        render();
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
        if (mode === 'idle' && keep) { P = T = near(items.indexOf(keep)); }
        render();
      });
    });

    var rT = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(function () {
        var keep = items[idx];
        measure();
        if (mode !== 'intro' && mode !== 'outro' && keep) { P = T = Math.round(near(items.indexOf(keep))); if (mode !== 'pv') mode = 'idle'; }
        render();
        if (pvState === 'open' && pvFrame) { if (pvAnim) { pvAnim.cancel(); pvAnim = null; } pvFrame.style.transform = box(fitPanel()); }
      }, 80);
    });
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      // Zurück aus der Projektseite: Vorschau bleibt offen, das Bild fliegt dorthin zurück
      measure(); P = T = Math.round(P); render();
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
