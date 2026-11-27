/* ALCHEMIST KURZ · /alchemist-kurz · hugosophian.studio
   Kurze Version der Alchemisten-Seite (Hugo 26./27.11.2026). Alles wird hier mit Canvas gemalt, keine Bilder
   (fester Zufall, darum bei jedem Besuch gleich).

   EINE SZENE (Hugo 27.11., 09:25): ein einziges hohes Bild im Zeichenstil seiner El-Dorado-Referenzen – dichte Muster,
   Formen, die bunt ineinander fliessen wie ein Mosaik, dunkle Konturen. Eigene Motive, nichts aus den Vorlagen kopiert.
   Von oben nach unten: heller Himmel mit Sonne und Wolken → Stufenberge → Pyramiden → Wasserfall → dunkler, satter
   Urwald mit Goldfluss. Die Kamera macht einen grossen Schwung direkt von oben nach unten (langsam los, schnell durch
   die Mitte, weich landen). Nichts wird überblendet: unten steht dasselbe Bild still, und nur der Text der kurzen
   Website blendet darüber ein (helle Lichtung in der Mitte, dunkle Schrift).

   Technik: drei Tiefen-Ebenen als hohe Streifen (in Kacheln gemalt), dazu einzelne Wolken und Blätter. Im Takt werden
   nur Verschiebungen gesetzt, darum läuft der Schwung auf der Grafikkarte. Ohne Flug (zweiter Besuch, «Bewegung
   reduzieren») wird nur das Schlussbild gemalt.

   Aufbau in Webflow (Texte und Aussehen im Designer änderbar):
     section.ak [data-ak]
       .ak-inner > .ak-head (.ak-kicker, h1.ak-title, .ak-lead)
                 > .ak-wheel [data-ak-wheel] > .ak-item [data-ak-item] (.ak-item-name, .ak-item-price, .ak-item-info)
                 > .ak-caption [data-ak-caption]
                 > .ak-contact (a.grey …) > a.ak-long
   Werte zum Feinschliff in AK. Frühere Fassungen (Aquarell-Wald, erster Flug) stehen im Verlauf des Repos. */
(function () {
  'use strict';
  var root = document.querySelector('[data-ak]');
  if (!root || root.__ak) return;
  root.__ak = true;

  // ---------- Werte ----------
  var AK = {
    seed: 7,              // fester Zufall: andere Zahl = anderes Bild
    flightMs: 7200,       // Dauer des Kameraschwungs von oben nach unten (0 = kein Flug)
    flightH: 3.6,         // Weg der Kamera in Bildschirmhöhen
    swingIn: 2.2,         // Anlauf: grösser = bleibt oben länger ruhig
    swingOut: 3.2,        // Landung: grösser = bremst früher und weicher
    rowsVisible: 5,       // sichtbare Zeilen im Rad
    rowDeg: 21,           // Grad pro Zeile auf dem Zylinder (Apple ~ 20)
    drift: 1,             // ruhige Eigenbewegung der Kamera (0 = aus)
    pointer: 1,           // Maus / Finger bewegt die Ebenen (0 = aus)
    scrollPan: 1,         // Scrollen im Rad schiebt den Wald (0 = aus)
    fireflies: 9,         // Glühwürmchen (Hugo 27.11., 08:46: nur ein paar, klein, ruhig; Handy etwas weniger)
    glitter: 22,          // Glitzer-Funken
    introMs: 1500,        // Einblenden ohne Flug (Bewegungssystem: page)
    flyInMs: [2200, 4200] // Glühwürmchen fliegen so lange ein (von – bis)
  };
  var EASE_OUT = 'cubic-bezier(.22,1,.36,1)';
  var PEARL_STRONG = ['#96dcf5', '#c3b2fa', '#f8bed7', '#fae4b4'];

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(hover: none)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var html = document.documentElement;
  html.classList.add('ak-page');

  // ---------- fester Zufall ----------
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var R = rng(AK.seed);
  function rr(a, b) { return a + (b - a) * R(); }
  function pick(arr) { return arr[Math.floor(R() * arr.length)]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hex(c) {
    if (c.charAt(0) === 'r') return c.replace(/[^\d,.]/g, '').split(',').slice(0, 3).map(Number);
    c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function mix(c1, c2, t) {
    var a = hex(c1), b = hex(c2);
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }
  function rgba(c, al) { var a = hex(c); return 'rgba(' + a[0] + ',' + a[1] + ',' + a[2] + ',' + al + ')'; }

  // ---------- CSS ----------
  var css = [
    'html.ak-page, html.ak-page body { height: 100%; overflow: hidden; overscroll-behavior: none; background: #f3f1f9; }',
    '[data-ak] { position: relative; width: 100%; height: 100vh; height: 100lvh; overflow: hidden; isolation: isolate; -webkit-tap-highlight-color: transparent; background: #15123f; }',
    '[data-ak] .ak-inner { position: relative; z-index: 6; height: 100vh; height: 100svh; box-sizing: border-box; }',
    'html:not(.ak-on) [data-ak] .ak-inner { pointer-events: none; }',   /* während des Flugs kann man nichts versehentlich antippen */
    '.ak-world { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }',
    '.ak-world > * { position: absolute; pointer-events: none; }',
    '.ak-layer, .ak-sprite, .ak-shade, .ak-glow { left: 0; top: 0; will-change: transform; transform-origin: 0 0; }',
    '.ak-shade { opacity: .2; }',
    '.ak-rays { inset: 0; mix-blend-mode: screen; will-change: transform; }',
    '.ak-ray { position: absolute; top: -12%; height: 150%; transform-origin: 50% 0; will-change: opacity;',
    '  background: linear-gradient(to bottom, rgba(255,251,238,0) 0%, rgba(255,251,238,.9) 10%, rgba(255,248,232,.5) 38%, rgba(255,246,236,0) 88%);',
    '  -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 38%, #000 62%, transparent 100%); mask-image: linear-gradient(to right, transparent 0%, #000 38%, #000 62%, transparent 100%); }',
    /* Prisma an den Strahlrändern (wie überall auf der Website: Regenbogen nur als Saum) */
    '.ak-ray::before, .ak-ray::after { content: ""; position: absolute; top: 0; bottom: 0; width: 14%; background: linear-gradient(to bottom, rgba(150,220,245,0), rgba(150,220,245,.55) 10%, rgba(195,178,250,.2) 50%, transparent 85%); }',
    '.ak-ray::before { left: 22%; } .ak-ray::after { right: 22%; background: linear-gradient(to bottom, rgba(248,190,215,0), rgba(248,190,215,.55) 10%, rgba(250,228,180,.2) 50%, transparent 85%); }',
    '@keyframes akRay { 0%, 100% { opacity: var(--o1); } 30% { opacity: var(--o2); } 55% { opacity: var(--o3); } 80% { opacity: var(--o2); } }',
    '.ak-dapple { inset: 0; mix-blend-mode: soft-light; opacity: .6; will-change: transform; }',
    '.ak-spot { position: absolute; border-radius: 50%; background: radial-gradient(closest-side, rgba(255,250,235,.95), rgba(255,250,235,0)); will-change: transform; }',
    '@keyframes akSpot { 0%, 100% { transform: translate3d(0,0,0) scale(1); opacity: .9; } 50% { transform: translate3d(var(--dx), var(--dy), 0) scale(1.18); opacity: .45; } }',
    '.ak-fx { inset: 0; width: 100%; height: 100%; z-index: 9; }',
    '.ak-flare { inset: 0; z-index: 10; mix-blend-mode: screen; }',
    '.ak-flare i { position: absolute; border-radius: 50%; will-change: transform; }',
    '.ak-sheen { inset: -30%; z-index: 11; mix-blend-mode: soft-light; opacity: .26; will-change: transform;',
    '  background: linear-gradient(115deg, rgba(218,242,248,0) 30%, rgba(218,242,248,.9) 38%, rgba(229,225,244,.9) 44%, rgba(242,221,227,.9) 50%, rgba(251,243,222,.9) 56%, rgba(251,243,222,0) 64%); }',
    '.ak-cover { position: absolute; inset: 0; z-index: 30; background: #f3f1f9; pointer-events: none; transition: opacity ' + AK.introMs + 'ms ' + EASE_OUT + '; }',
    'html.ak-on .ak-cover { opacity: 0; }',
    '.ak-cover.is-off { opacity: 0; transition: opacity 700ms ease; }',   /* Flug: aus dem Perlweiss in den Himmel */
    /* Einblenden des Inhalts, gestaffelt */
    '[data-ak] .ak-inner > * { transition: opacity 900ms ' + EASE_OUT + ', transform 1200ms ' + EASE_OUT + '; }',
    'html:not(.ak-on) [data-ak] .ak-inner > * { opacity: 0; transform: translate3d(0, 2.5vh, 0); }',
    /* Rad (wie der Timer von Apple) */
    '.ak-wheel-wrap { position: relative; width: 100%; display: flex; justify-content: center; isolation: isolate; }',
    '.ak-wheel-wrap > [data-ak-wheel] { position: relative; z-index: 1; }',
    '[data-ak-wheel] { overflow-y: scroll !important; scroll-snap-type: y mandatory; scrollbar-width: none; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; touch-action: pan-y;',
    '  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 34%, #000 66%, transparent 100%); mask-image: linear-gradient(to bottom, transparent 0%, #000 34%, #000 66%, transparent 100%); outline: none; }',
    '[data-ak-wheel]::-webkit-scrollbar { display: none; }',
    '.ak-pad { flex: none; pointer-events: none; }',
    '[data-ak-item] { scroll-snap-align: center; scroll-snap-stop: normal; will-change: transform, opacity; cursor: pointer; backface-visibility: hidden; user-select: none; -webkit-user-select: none; white-space: nowrap; }',
    '[data-ak-item] .ak-item-price, [data-ak-item] .ak-item-info { display: none !important; }',
    '.ak-band { position: absolute; z-index: 0; left: 50%; pointer-events: none; transform: translateX(-50%); }',
    '.ak-band::before { content: ""; position: absolute; inset: -30% -6%; border-radius: 50%; background: radial-gradient(closest-side, rgba(255,255,255,.7), rgba(255,255,255,0)); }',
    '.ak-band i { position: absolute; left: 0; right: 0; height: 1px; opacity: .85;',
    '  background: linear-gradient(to right, transparent, #96dcf5 18%, #c3b2fa 38%, #fff 50%, #f8bed7 62%, #fae4b4 82%, transparent); }',
    '.ak-band i:first-child { top: 0; } .ak-band i:last-child { bottom: 0; }',
    '[data-ak-caption] { transition: opacity 260ms ease, transform 420ms ' + EASE_OUT + '; }',
    '[data-ak-caption].is-out { opacity: 0 !important; transform: translate3d(0, .8vh, 0) !important; transition-duration: 150ms; }',
    '[data-ak-caption] .ak-cap-price { display: block; font-weight: 500; margin-bottom: .25em; letter-spacing: .04em; }',
    /* Titel mit feinem Perlmutt-Schimmer */
    '[data-ak] .ak-title { background: linear-gradient(100deg, #2a2442 0%, #2a2442 38%, #6e64a5 46%, #a68bd8 50%, #6e64a5 54%, #2a2442 62%, #2a2442 100%);',
    '  background-size: 260% 100%; background-position: 100% 0; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }',
    'html.ak-on [data-ak] .ak-title { animation: akTitle 7s ' + EASE_OUT + ' 1.2s infinite; }',
    '@keyframes akTitle { 0% { background-position: 100% 0; } 40%, 100% { background-position: 0% 0; } }',
    '@media (prefers-reduced-motion: reduce) { .ak-ray, .ak-spot, html.ak-on [data-ak] .ak-title { animation: none !important; } }'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------- Mal-Bausteine ----------
  var INK = '#1a1440';   // Konturfarbe im Urwald (dunkles Violettblau statt Schwarz)
  function canvas(w, h, dpr) {
    var c = document.createElement('canvas');
    c.width = Math.max(2, Math.round(w * dpr)); c.height = Math.max(2, Math.round(h * dpr));
    var x = c.getContext('2d'); x.scale(dpr, dpr); c._w = w; c._h = h; c._dpr = dpr;
    return { c: c, x: x };
  }
  function ol(x, w, col) { x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = col || INK; x.lineWidth = w; x.stroke(); }
  function polyline(x, pts) { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); }
  function spiralPts(cx, cy, r, turns, a0, dir) {
    var pts = [], n = Math.round(turns * 28);
    for (var i = 0; i <= n; i++) { var t = i / n, a = a0 + dir * t * turns * Math.PI * 2, rr2 = r * (1 - t * .85); pts.push([cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2]); }
    return pts;
  }
  function rrect(x, a, b, w, h, r) { r = Math.min(r, w / 2, h / 2); x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

  // weiche geschlossene Form durch Punkte (Kurve läuft durch die Kantenmitten)
  function blob(x, p) {
    var n = p.length, a = p[n - 1], b = p[0];
    x.beginPath(); x.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    for (var i = 0; i < n; i++) { var c = p[i], d = p[(i + 1) % n]; x.quadraticCurveTo(c[0], c[1], (c[0] + d[0]) / 2, (c[1] + d[1]) / 2); }
    x.closePath();
  }
  // abgerundetes Rechteck als 8 Punkte (r = Rundung 0…0.5, j = Zittern von Hand)
  function rpts(cx, cy, w, h, r, j) {
    var x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, a = Math.min(w, h) * r,
        p = [[x0 + a, y0], [x1 - a, y0], [x1, y0 + a], [x1, y1 - a], [x1 - a, y1], [x0 + a, y1], [x0, y1 - a], [x0, y0 + a]];
    if (j) for (var i = 0; i < 8; i++) { p[i][0] += (R() - .5) * 2 * j; p[i][1] += (R() - .5) * 2 * j; }
    return p;
  }
  // Mosaik-Stein (Glyphe): Fläche, heller Innenrand, Kontur, innen ein kleines Zeichen
  function stone(x, cx, cy, w, h, col, o) {
    var m = Math.min(w, h), lw = o.lw, p = rpts(cx, cy, w, h, o.r == null ? .32 : o.r, o.j == null ? m * .05 : o.j);
    blob(x, p); x.fillStyle = col; x.fill();
    if (o.rim !== false) { x.save(); x.clip(); x.lineWidth = m * .26; x.strokeStyle = o.rim || mix(col, '#ffffff', .2); x.stroke(); x.restore(); }
    ol(x, lw, o.line);
    var k = o.kind == null ? Math.floor(R() * 6) : o.kind, c2 = o.c2 || mix(col, INK, .38), i;
    if (m < lw * 7 || k > 3) return;
    if (k === 0) { blob(x, rpts(cx, cy, w * .46, h * .46, .32, 0)); x.fillStyle = c2; x.fill(); ol(x, lw * .7, o.line); }
    else if (k === 1) { x.beginPath(); x.arc(cx, cy, m * .17, 0, 7); x.fillStyle = c2; x.fill(); ol(x, lw * .7, o.line); }
    else if (k === 2) { polyline(x, spiralPts(cx, cy, m * .3, 1.4, R() * 6, R() < .5 ? 1 : -1)); ol(x, lw, c2); }
    else if (w > h) for (i = 0; i < 3; i++) { x.beginPath(); x.moveTo(cx + (i - 1) * w * .2, cy - h * .2); x.lineTo(cx + (i - 1) * w * .2, cy + h * .2); ol(x, lw, c2); }
    else for (i = 0; i < 2; i++) { x.beginPath(); x.moveTo(cx - w * .2, cy + (i - .5) * h * .3); x.lineTo(cx + w * .2, cy + (i - .5) * h * .3); ol(x, lw, c2); }
  }
  // Fläche aus Steinen (1×1, 2×1, 1×2, 2×2). o.test begrenzt die Form, o.palAt wählt die Farben nach dem Ort
  function mosaic(x, x0, y0, x1, y1, s, pal, o) {
    var cols = Math.max(1, Math.round((x1 - x0) / s)), rows = Math.max(1, Math.round((y1 - y0) / s)), cw = (x1 - x0) / cols, ch = (y1 - y0) / rows,
        occ = new Uint8Array(cols * rows), g = o.gap == null ? s * .1 : o.gap, r, c;
    for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
      if (occ[r * cols + c]) continue;
      var q = R(), w2 = q < .25 && c + 1 < cols && !occ[r * cols + c + 1] ? 2 : 1, h2 = (q > .8 || q < .06) && r + 1 < rows && !occ[(r + 1) * cols + c] ? 2 : 1;
      if (w2 === 2 && h2 === 2 && occ[(r + 1) * cols + c + 1]) h2 = 1;
      var cx = x0 + (c + w2 / 2) * cw, cy = y0 + (r + h2 / 2) * ch, ww = w2 * cw - g, hh = h2 * ch - g;
      if (o.test && (w2 > 1 || h2 > 1) && !o.test(cx, cy, ww, hh)) { w2 = h2 = 1; cx = x0 + (c + .5) * cw; cy = y0 + (r + .5) * ch; ww = cw - g; hh = ch - g; }   // passt der grosse Stein nicht, dann ein kleiner
      for (var a = 0; a < h2; a++) for (var b = 0; b < w2; b++) occ[(r + a) * cols + c + b] = 1;
      if (o.test && !o.test(cx, cy, ww, hh)) continue;
      var pl = (o.palAt && o.palAt(cx, cy)) || pal, col = pick(pl);
      stone(x, cx, cy, ww, hh, mix(col, R() < .5 ? '#ffffff' : INK, R() * .14), o);
    }
  }
  // Mäander: dicke runde Bänder, die sich rechtwinklig ineinander schieben und den Grund füllen
  function pipes(x, x0, y0, x1, y1, s, pal, o) {
    var cols = Math.max(2, Math.round((x1 - x0) / s)), rows = Math.max(2, Math.round((y1 - y0) / s)), cw = (x1 - x0) / cols, ch = (y1 - y0) / rows,
        occ = new Uint8Array(cols * rows), DX = [1, 0, -1, 0], DY = [0, 1, 0, -1], n = Math.round(cols * rows * (o.fill || .5)), lw = o.lw, th = Math.min(cw, ch) * .7;
    function free(c, r) { return c >= 0 && r >= 0 && c < cols && r < rows && !occ[r * cols + c] && (!o.test || o.test(x0 + (c + .5) * cw, y0 + (r + .5) * ch)); }
    for (var i = 0; i < n; i++) {
      var c = Math.floor(R() * cols), r = Math.floor(R() * rows); if (!free(c, r)) continue;
      var dir = R() < (o.vert == null ? .7 : o.vert) ? (R() < .5 ? 1 : 3) : (R() < .5 ? 0 : 2), len = 2 + Math.floor(R() * (o.len || 8)), pts = [[x0 + (c + .5) * cw, y0 + (r + .5) * ch]];
      occ[r * cols + c] = 1;
      for (var k = 0; k < len; k++) {
        if (R() < .28) dir = (dir + (R() < .5 ? 1 : 3)) % 4;
        var nc = c + DX[dir], nr = r + DY[dir];
        if (!free(nc, nr)) { dir = (dir + (R() < .5 ? 1 : 3)) % 4; nc = c + DX[dir]; nr = r + DY[dir]; if (!free(nc, nr)) break; }
        c = nc; r = nr; occ[r * cols + c] = 1; pts.push([x0 + (c + .5) * cw, y0 + (r + .5) * ch]);
      }
      var col = pick(pal); col = mix(col, R() < .5 ? '#ffffff' : INK, R() * .12);
      if (pts.length === 1) {
        x.beginPath(); x.arc(pts[0][0], pts[0][1], th * .44, 0, 7); x.fillStyle = col; x.fill(); ol(x, lw, o.line);
        x.beginPath(); x.arc(pts[0][0], pts[0][1], th * .17, 0, 7); x.fillStyle = pick(o.acc || pal); x.fill(); continue;
      }
      polyline(x, pts); ol(x, th + lw * 2, o.line); ol(x, th, col); ol(x, th * .2, mix(col, R() < .6 ? '#ffffff' : INK, .3));
      if (R() < .6) { var e = pts[pts.length - 1]; x.beginPath(); x.arc(e[0], e[1], th * .25, 0, 7); x.fillStyle = pick(o.acc || pal); x.fill(); ol(x, lw * .7, o.line); }
    }
  }
  // fliessende Bänder mit runden Enden: a = Laufrichtung, b = quer dazu; o.v = senkrecht (Wasserfall)
  function flow(x, a0, a1, b0, b1, o) {
    for (var k = 0; k < o.n; k++) {
      var t = (k + R()) / o.n, b = b0 + (b1 - b0) * Math.pow(t, o.pow || 1), g = 1 + t * (o.grow || 0), th = o.th * g * rr(o.t0 || .55, o.t1 || 1.25),
          sa = a0 + (a1 - a0) * rr(-.15, .75), sb = sa + (a1 - a0) * rr(.2, .85), f = rr(.004, .009) * (o.fq || 1), ph = rr(0, 6), amp = o.amp * g, pts = [], q, d;
      for (q = sa; q <= sb; q += 12) { d = b + Math.sin(q * f + ph) * amp + Math.sin(q * f * 2.3 + ph * 1.7) * amp * .4; pts.push(o.v ? [d, q] : [q, d]); }
      var col = pick(o.pal), inner = R() < .45;
      if (pts.length < 2) continue;
      polyline(x, pts);
      if (!o.plain) ol(x, th + o.lw * 2, o.edge);
      ol(x, th, col);
      if (!o.plain && inner) ol(x, th * .16, o.inner || o.edge);
    }
  }
  // Welle, die sich einrollt (Gischt, Ornament)
  function scroll(x, px, py, r, dir, wdt, col, line, lw) {
    var p = [[px - dir * r * 1.5, py + r * 1.5], [px - dir * r * 1.1, py + r * .2]].concat(spiralPts(px, py, r, 1.3, dir > 0 ? Math.PI : 0, dir));
    polyline(x, p); ol(x, wdt + lw * 2, line); ol(x, wdt, col);
  }

  // Blatt: flache Farbe, eine Hälfte dunkler, Mittelrippe und Adern als Linien
  function leafPath(x, len, wid, bend, side) {   // side: 0 = ganze Form, 1 = untere Hälfte bis zur Mittelrippe
    var by = bend * len;
    x.beginPath(); x.moveTo(0, 0);
    x.bezierCurveTo(len * .18, wid * 1.05 + by * .03, len * .72, wid * .72 + by * .55, len, by);
    if (side === 0) x.bezierCurveTo(len * .72, -wid * .72 + by * .55, len * .18, -wid * 1.05 + by * .03, 0, 0);
    else x.bezierCurveTo(len * .72, by * .56, len * .2, by * .04, 0, 0);
    x.closePath();
  }
  function midPoint(len, bend, t) {
    var by = bend * len, u = 1 - t;
    return [3 * u * u * t * len * .2 + 3 * u * t * t * len * .72 + t * t * t * len, 3 * u * u * t * by * .04 + 3 * u * t * t * by * .56 + t * t * t * by];
  }
  function leaf(x, o) {
    var lw = o.lw, b = o.bend || 0, L = o.line || INK, i, s;
    x.save(); x.translate(o.x, o.y); x.rotate(o.a);
    leafPath(x, o.len, o.wid, b, 0); x.fillStyle = o.col; x.fill();
    leafPath(x, o.len, o.wid, b, 1); x.fillStyle = mix(o.col, INK, .24); x.fill();
    if (o.stripes) for (i = 1; i < o.stripes; i++) {
      var t = i / o.stripes, u = 1 - t, p = midPoint(o.len, b, t), wl = (3 * u * u * t * 1.05 + 3 * u * t * t * .72) * o.wid * .82;
      for (s = -1; s <= 1; s += 2) { x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(p[0] + o.len * .06, p[1] + s * wl); ol(x, lw * .5, L); }
    }
    x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(o.len * .2, b * o.len * .04, o.len * .72, b * o.len * .56, o.len * .97, b * o.len * .97); ol(x, lw * .7, L);
    leafPath(x, o.len, o.wid, b, 0); ol(x, lw, L);
    x.restore();
  }
  function fan(x, o) {   // Fächer: lange Blätter aus einem Punkt
    for (var i = 0; i < o.n; i++) {
      var t = o.n > 1 ? i / (o.n - 1) - .5 : 0;
      leaf(x, { x: o.x, y: o.y, a: o.a + t * o.spread, len: o.len * rr(.8, 1.05), wid: o.len * (o.wf || .07), bend: t * .3 + rr(-.08, .08), col: pick(o.cols), lw: o.lw, stripes: o.stripes });
    }
  }
  function fern(x, o) {   // Farnschnecke: Stiel, der oben einrollt, mit kleinen Fiedern
    var dir = o.dir || 1, L = o.len, r = L * .22, pts = [], i;
    for (i = 0; i <= 20; i++) { var t = i / 20; pts.push([o.x + Math.sin(t * 2.4) * dir * L * .28, o.y - t * L]); }
    var top = pts[pts.length - 1];
    pts = pts.concat(spiralPts(top[0] + dir * r, top[1], r, 1.25, Math.PI, dir));
    for (i = 3; i < 18; i += 2) {
      var p = pts[i], s = (i % 4 === 1 ? 1 : -1), ll = L * .16 * (1 - i / 22);
      leaf(x, { x: p[0], y: p[1], a: -Math.PI / 2 + s * 1.1, len: ll, wid: ll * .3, bend: s * .2, col: mix(o.col, '#ffffff', .12), lw: o.lw * .7 });
    }
    polyline(x, pts); ol(x, o.lw * 2 + L * .035); ol(x, L * .035, o.col);
  }
  function flowerA(x, cx, cy, r, col, lw) {   // spitze Blütenblätter
    var n = 6 + Math.floor(R() * 3), a0 = R() * 6, i;
    for (i = 0; i < n; i++) leaf(x, { x: cx, y: cy, a: a0 + i / n * Math.PI * 2, len: r, wid: r * .27, bend: .05, col: col, lw: lw * .8 });
    x.beginPath(); x.arc(cx, cy, r * .28, 0, 7); x.fillStyle = '#ffd75e'; x.fill(); ol(x, lw * .8);
    for (i = 0; i < 7; i++) { x.beginPath(); x.arc(cx + Math.cos(i * .9) * r * .15, cy + Math.sin(i * .9) * r * .15, r * .035, 0, 7); x.fillStyle = '#f07a2a'; x.fill(); }
  }
  function flowerB(x, cx, cy, r, col, lw) {   // runde Blütenblätter mit Innenkreis
    var n = 5 + Math.floor(R() * 3), a0 = R() * 6, i;
    for (i = 0; i < n; i++) {
      var a = a0 + i / n * Math.PI * 2, px = cx + Math.cos(a) * r * .62, py = cy + Math.sin(a) * r * .62;
      x.beginPath(); x.arc(px, py, r * .42, 0, 7); x.fillStyle = col; x.fill(); ol(x, lw * .8);
      x.beginPath(); x.arc(px, py, r * .2, 0, 7); ol(x, lw * .6, mix(col, '#ffffff', .45));
    }
    x.beginPath(); x.arc(cx, cy, r * .34, 0, 7); x.fillStyle = '#ffd75e'; x.fill(); ol(x, lw * .8);
    x.beginPath(); x.arc(cx, cy, r * .14, 0, 7); x.fillStyle = '#f07a2a'; x.fill();
  }
  function scaleBush(x, cx, cy, w, h, pal, lw) {   // Schuppenbusch: Reihen überlappender Bögen in einer Kuppel
    var p = rpts(cx, cy - h / 2, w, h, .46, 0), r = Math.max(5, w * .085), rows = Math.ceil(h / (r * .95)) + 2, cols = Math.ceil(w / (r * 1.7)) + 2, i, j;
    x.save(); blob(x, p); x.fillStyle = mix(pal[0], INK, .45); x.fill(); x.clip();
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
      var sx = cx - w / 2 + (i + (j % 2) * .5) * r * 1.7 - r * .5, sy = cy - h + j * r * .95 + r * .6;
      x.beginPath(); x.arc(sx, sy, r, 0, 7); x.fillStyle = pal[(i + j * 2) % pal.length]; x.fill(); ol(x, lw * .7);
      x.beginPath(); x.arc(sx, sy, r * .45, Math.PI, 0); ol(x, lw * .5, 'rgba(255,255,255,.4)');
    }
    x.restore(); blob(x, p); ol(x, lw * 1.2);
  }
  function vine(x, px, y0, len, col, lw, acc) {   // hängende Ranke mit Blättchen und Perle
    var pts = [], i, ph = R() * 6, amp = rr(6, 18);
    for (i = 0; i <= 16; i++) { var t = i / 16; pts.push([px + Math.sin(t * 5 + ph) * amp * t, y0 + len * t]); }
    polyline(x, pts); ol(x, lw * 3.4); ol(x, lw * 1.8, col);
    for (i = 2; i <= 16; i += 2) { var p = pts[i], s = i % 4 ? 1 : -1; leaf(x, { x: p[0], y: p[1], a: Math.PI / 2 + s, len: len * .08 + 8, wid: len * .026 + 3, bend: s * .15, col: R() < .25 ? pick(acc) : col, lw: lw * .8 }); }
    var e = pts[16]; x.beginPath(); x.arc(e[0], e[1], lw * 3, 0, 7); x.fillStyle = pick(acc); x.fill(); ol(x, lw * .8);
  }
  function totem(x, px, py, s, pal, acc, lw) {   // Glyphen-Säule
    for (var n = 3 + Math.floor(R() * 3), i = 0; i < n; i++) stone(x, px, py - i * s * .92, s * rr(.85, 1.15), s * .86, pick(pal), { lw: lw, c2: pick(acc) });
  }

  // Wolke aus runden Blöcken auf einer Grundlinie; innen Konturen und Schnecken
  function cloud(x, cx, cy, s, o) {
    var n = o.n || 5, lobes = [], bx = cx - s * n * .32, x0 = bx, i;
    for (i = 0; i < n; i++) {
      var w = s * rr(.75, 1.15), h = s * rr(.6, 1.3) * (1 - Math.abs(i - (n - 1) / 2) / n * .95), p = rpts(bx + w / 2, cy - h / 2, w, h, .4, s * .03);
      p.c = [bx + w / 2, cy - h / 2, w, h]; lobes.push(p); if (i < n - 1) bx += w * rr(.55, .76); else bx += w;
    }
    lobes.push(rpts((x0 + bx) / 2, cy - s * .14, bx - x0 + s * .3, s * .36, .5, 0));
    lobes.forEach(function (p) { blob(x, p); ol(x, o.lw * 2.6, o.line); });
    var g = x.createLinearGradient(0, cy - s * 1.3, 0, cy); g.addColorStop(0, o.c1); g.addColorStop(1, o.c2);
    lobes.forEach(function (p) { blob(x, p); x.fillStyle = g; x.fill(); });
    lobes.forEach(function (p, i) {
      if (!p.c) return; var c = p.c;
      blob(x, rpts(c[0], c[1], c[2] * .6, c[3] * .58, .4, 0)); ol(x, o.lw, o.inl);
      if (i % 2) { polyline(x, spiralPts(c[0], c[1], Math.min(c[2], c[3]) * .19, 1.3, R() * 6, 1)); ol(x, o.lw, o.inl); }
    });
  }
  // Sonne (eigene Gestaltung): Flammenstrahlen, Kranz aus Steinen, Perlenring, Schnecke
  function sun(x, cx, cy, r, lw) {
    var L = '#a8431a', i;
    for (i = 0; i < 24; i++) {
      x.save(); x.translate(cx, cy); x.rotate(i / 24 * Math.PI * 2);
      if (i % 2) stone(x, r * 1.44, 0, r * .3, r * .15, '#f59a3a', { lw: lw * .8, line: L, kind: 9, r: .45, j: 0 });
      else {
        x.beginPath(); x.moveTo(r * 1.16, -r * .12); x.quadraticCurveTo(r * 1.65, -r * .13, r * 2.05, 0); x.quadraticCurveTo(r * 1.65, r * .13, r * 1.16, r * .12); x.closePath();
        x.fillStyle = i % 4 ? '#ffd75e' : '#f7c948'; x.fill(); ol(x, lw * .8, L);
        x.beginPath(); x.moveTo(r * 1.26, 0); x.lineTo(r * 1.78, 0); ol(x, lw * .6, '#f59a3a');
      }
      x.restore();
    }
    x.beginPath(); x.arc(cx, cy, r * 1.13, 0, 7); x.fillStyle = '#e85a2a'; x.fill(); ol(x, lw, L);
    for (i = 0; i < 14; i++) {
      x.save(); x.translate(cx, cy); x.rotate(i / 14 * Math.PI * 2);
      stone(x, r * .93, 0, r * .24, r * .34, i % 2 ? '#f7c948' : '#f59a3a', { lw: lw * .7, line: L, kind: i % 2 ? 1 : 9, c2: '#2bb6a0', r: .4, j: 0 });
      x.restore();
    }
    x.beginPath(); x.arc(cx, cy, r * .72, 0, 7); x.fillStyle = '#ffd75e'; x.fill(); ol(x, lw, L);
    for (i = 0; i < 10; i++) { x.beginPath(); x.arc(cx + Math.cos(i * .628) * r * .57, cy + Math.sin(i * .628) * r * .57, r * .055, 0, 7); x.fillStyle = '#2bb6a0'; x.fill(); ol(x, lw * .5, L); }
    x.beginPath(); x.arc(cx, cy, r * .4, 0, 7); x.fillStyle = '#fff0a8'; x.fill(); ol(x, lw * .8, L);
    polyline(x, spiralPts(cx, cy, r * .28, 1.6, 0, 1)); ol(x, lw, '#f07a2a');
  }
  // Grat eines Stufenbergs: Funktion x → y, in Stufen
  function ridge(x0, x1, base, hgt, n, step, flat) {   // flat > 1: oben abgeflacht (Tafelberg), die Flanken fallen in Stufen
    var pk = [], i; for (i = 0; i < n; i++) pk.push([x0 + (x1 - x0) * (i + rr(.25, .75)) / n, hgt * rr(.5, 1), (x1 - x0) / n * rr(.9, 1.6)]);
    return function (px) { var v = hgt * .1, k, d; for (k = 0; k < n; k++) { d = 1 - Math.abs(px - pk[k][0]) / pk[k][2]; if (d > 0) v = Math.max(v, pk[k][1] * Math.pow(Math.min(1, d * (flat || 1)), .85)); } return base - Math.round(v / step) * step; };
  }
  // Berg als Mosaik: Fugenfarbe unter dem Grat, darauf Steine; die Gipfel sind hell
  function rock(x, x0, x1, yTop, yBot, prof, s, o) {
    var px; x.beginPath(); x.moveTo(x0, yBot);
    for (px = x0; px <= x1 + 6; px += 6) x.lineTo(px, prof(px) + s * .12);
    x.lineTo(x1 + 6, yBot); x.closePath(); x.fillStyle = o.grout; x.fill();
    mosaic(x, x0, yTop, x1, yBot, s, o.pal, { lw: o.lw, line: o.line, r: .24, gap: s * .08,
      test: function (cx, cy, w, h) { return cy - h / 2 > prof(cx - w * .3) - s * .1 && cy - h / 2 > prof(cx + w * .3) - s * .1; },
      palAt: function (cx, cy) { var p = prof(cx); return p < o.snowLine && cy - p < o.snowH ? o.snow : null; } });
  }
  // Stufenpyramide: Stufen aus Steinplatten, Friese aus Glyphen, Treppe, Tempel mit Dachkamm
  function pyramid(x, cx, base, w, h, P, lw) {
    var n = 6, th = h * .76 / n, i, L = P.line;
    for (i = 0; i < n; i++) {
      var ww = w * (1 - i / (n + .8)), y = base - th * (i + .5), col = P.pal[i % P.pal.length];
      stone(x, cx, y, ww, th * 1.05, col, { lw: lw, line: L, kind: 9, r: .16, j: th * .03 });
      if (i % 2 === 0 && th > lw * 6) mosaic(x, cx - ww * .47, y - th * .3, cx + ww * .47, y + th * .3, th * .56, P.pal2, { lw: lw * .6, line: L, gap: th * .1 });
    }
    var sw = w * .17, top = base - th * n;
    x.beginPath(); x.moveTo(cx - sw * .7, base); x.lineTo(cx - sw * .36, top); x.lineTo(cx + sw * .36, top); x.lineTo(cx + sw * .7, base); x.closePath(); x.fillStyle = P.stair; x.fill(); ol(x, lw, L);
    for (i = 1; i < n * 3; i++) { var t = i / (n * 3), hw = sw * (.7 - .34 * t); x.beginPath(); x.moveTo(cx - hw, base - th * n * t); x.lineTo(cx + hw, base - th * n * t); ol(x, lw * .6, L); }
    var tw = w * .3, tt = h * .2;
    stone(x, cx, top - tt * .46, tw, tt * .94, P.pal[1], { lw: lw, line: L, kind: 9, r: .14, j: 0 });
    stone(x, cx, top - tt * .32, tw * .3, tt * .62, P.door, { lw: lw * .8, line: L, kind: 9, r: .22, j: 0, rim: false });
    stone(x, cx, top - tt * 1.02, tw * 1.18, tt * .26, P.pal[0], { lw: lw, line: L, kind: 9, r: .3, j: 0 });
    for (i = 0; i < 5; i++) stone(x, cx + (i - 2) * tw * .22, top - tt * 1.3, tw * .17, tt * .32, P.pal2[i % P.pal2.length], { lw: lw * .7, line: L, kind: 1, c2: P.stair, r: .36, j: 0 });
  }
  // Papierkorn nur auf Gemaltem: feines Korn und weiche Flecken, wie auf Papier gemalt
  var paperTile = null;
  function paper(x, x0, y0, w, h) {
    if (!paperTile) {
      var t = canvas(128, 128, 1), P = rng(99), id = t.x.createImageData(128, 128), d = id.data;
      for (var i = 0; i < d.length; i += 4) { var v = P(); d[i] = d[i + 1] = d[i + 2] = v < .5 ? 0 : 255; d[i + 3] = Math.abs(v - .5) * 2 * 255; }
      t.x.putImageData(id, 0, 0); paperTile = t.c;
    }
    x.save(); x.globalCompositeOperation = 'source-atop'; x.fillStyle = x.createPattern(paperTile, 'repeat');
    x.globalAlpha = .05; x.fillRect(x0, y0, w, h);
    x.globalAlpha = .065; x.scale(9, 9); x.fillRect(x0 / 9, y0 / 9, w / 9 + 1, h / 9 + 1);
    x.restore();
  }

  // ---------- Farben ----------
  var P_ROCK = ['#4a3fc0', '#5b4fd6', '#3f55c8', '#6a4fd0', '#3a3aa8', '#5a6fe0'],
      P_FAR = ['#8f86f0', '#a08df2', '#7f8ef0', '#9a7fe8', '#86a0f4', '#b09af6'],
      P_SNOW = ['#eef8ff', '#d6eeff', '#c3e6fb', '#ffffff'],
      P_GOLD = ['#f2b830', '#f7c948', '#e9a420', '#ffd75e', '#d98f1a'],
      P_FIRE = ['#f07a2a', '#e85a2a', '#d94a2e', '#f59a3a', '#c8382e'],
      P_JADE = ['#1aa39a', '#12909a', '#2bb6a0', '#0f7f86', '#49c9b0'],
      P_PURP = ['#5a2a9e', '#7a2fbf', '#8e3fd0', '#6a35b8', '#4b2a8a', '#9b4fe0'],
      P_GREEN = ['#1f9a5a', '#2bb673', '#178a54', '#3fbf6a', '#0f8a6a', '#7fc94a'],
      P_BLUE = ['#2f5fd0', '#3b6fe0', '#274bb0', '#3f8fe0', '#4a52c8'],
      P_WALL = P_PURP.concat(P_JADE, P_BLUE, ['#b0187a', '#c8208a', '#1f9a5a']),
      P_LEAF = P_GREEN.concat(P_JADE, ['#7a2fbf', '#5b3fd1', '#c8208a', '#2f5fd0', '#8fd14f', '#d63f9a']),
      P_FLOWER = ['#e0409a', '#ff5a8a', '#f07a2a', '#ffd75e', '#c58cf0', '#ff7ab8', '#f2f2ff'],
      P_ACC = ['#ffd75e', '#f59a3a', '#ff7ab8', '#7fe0d0', '#f2f2ff'],
      PYR = [
        { pal: ['#f2b830', '#e9a420', '#f7c948'], pal2: ['#e85a2a', '#1aa39a', '#ffd75e', '#c8382e'], stair: '#ffe27a', line: '#6a2a12', door: '#3a1420' },
        { pal: ['#d94a2e', '#c8382e', '#e85a2a'], pal2: ['#f7c948', '#1aa39a', '#2f5fd0', '#ffd75e'], stair: '#f59a3a', line: '#4a1420', door: '#2a0f24' },
        { pal: ['#1aa39a', '#12909a', '#2bb6a0'], pal2: ['#f7c948', '#e0409a', '#7fe0d0', '#f07a2a'], stair: '#7fe0d0', line: '#0c3f52', door: '#0a2a3a' },
        { pal: ['#8e3fd0', '#7a2fbf', '#9b4fe0'], pal2: ['#ffd75e', '#ff7ab8', '#49c9b0', '#f59a3a'], stair: '#c58cf0', line: '#2a1460', door: '#1a0f40' }
      ];

  // ---------- Szene ----------
  var world, strips = [], sprites = [], fliers = [], rays, dapple, glow, flare, sheen, fxC, fxX, W = 0, H = 0, U = 0, LW0 = 2, mob = false,
      camRef = 0, camT = 0, cam = 0, PANS = [0.02, 0.05, 0.09, 0.15], DEPTH = [0.18, 0.38, 0.62, 1];

  // Ein Streifen = eine Tiefen-Ebene. y = 0 ist die Oberkante des Schlussbilds, der Weg der Kamera liegt bei y < 0.
  // Gemalt wird in Kacheln; jedes Teil (add) kennt seine Höhe und wird nur in den Kacheln gemalt, die es berührt.
  function strip(i, f, dprFin, dprFly) {
    var mg = .08, pan = PANS[i] * H * AK.scrollPan, w = W * (1 + mg * 2), fh = H * (1 + mg * 2) + pan * 2, tf = Math.round(camT * f);
    var el = document.createElement('div'); el.className = 'ak-layer'; el.style.width = w + 'px'; el.style.height = (fh + tf) + 'px';
    var S = { el: el, f: f, d: DEPTH[i], w: w, fh: fh, tf: tf, ox: -W * mg, oy: -H * mg - pan - tf, pan: pan, vy: H * mg + pan, items: [], tiles: [] };
    S.X = function (fr) { return W * mg + fr * W; };
    S.Y = function (c, fr) { return S.vy - c * camRef * f + fr * H; };   // Höhe im Streifen, die beim Fortschritt c (1 = oben, 0 = gelandet) am Bildschirm bei fr liegt
    S.add = function (y0, y1, fn) { S.items.push([y0, y1, fn, AK.seed * 7919 + i * 100003 + S.items.length * 31 + 5]); };
    S.build = function () {
      var edges = [-tf], y = -tf, k, n; while (y < 0) { y = Math.min(0, y + 1300); edges.push(y); } edges.push(fh);
      for (k = 0; k < edges.length - 1; k++) {
        var a = edges[k], hh = edges[k + 1] - a + (k < edges.length - 2 ? 1 : 0), todo = [];
        for (n = 0; n < S.items.length; n++) if (S.items[n][1] >= a && S.items[n][0] <= a + hh) todo.push(S.items[n]);
        if (!todo.length) continue;
        var c = canvas(w, hh, a < 0 ? dprFly : dprFin), x = c.x;
        c.c.style.cssText = 'position:absolute;left:0;top:' + (a + tf) + 'px;width:' + w + 'px;height:' + hh + 'px';
        x.translate(0, -a);
        for (n = 0; n < todo.length; n++) { R = rng(todo[n][3]); x.save(); todo[n][2](x); x.restore(); }
        paper(x, 0, a, w, hh);
        el.appendChild(c.c); S.tiles.push([c.c, a]);
      }
    };
    S.release = function () { S.tiles.forEach(function (t) { if (t[1] < 0) { t[0].width = t[0].height = 0; if (t[0].parentNode) t[0].parentNode.removeChild(t[0]); } }); };
    return S;
  }

  // 0 · Himmel (oben hell), Sonne, ferne Stufenberge; nach unten wird es dunkel
  function sceneFar(S) {
    var top = -S.tf, bot = S.fh, lw = LW0 * .7;
    S.add(top, bot, function (x) {
      var g = x.createLinearGradient(0, top, 0, bot), span = bot - top;
      function st(y, c) { g.addColorStop(clamp((y - top) / span, 0, 1), c); }
      if (S.tf > H * .4) { st(top, '#f3f1f9'); st(top + H * .2, '#aee9f7'); st(top + H * .58, '#48bdf0'); st(-H * .15, '#2f86e4'); } else st(top, '#2f86e4');
      st(H * .2, '#3350c4'); st(bot * .6, '#2a2478'); st(bot, '#15123f');
      x.fillStyle = g; x.fillRect(0, top, S.w, span);
    });
    if (S.tf > 0) {
      S.add(top + H * .2, 0, function (x) {   // feine Bänder im Himmel
        flow(x, -20, S.w + 20, top + H * .3, -H * .05, { n: 22, th: U * .022, amp: U * .02, pal: ['rgba(255,255,255,.2)', 'rgba(190,240,255,.22)', 'rgba(110,190,250,.2)'], plain: 1 });
      });
      var sx = S.X(.7), sy = S.Y(1, .2), sr = U * .15;
      S.add(sy - sr * 5, sy + sr * 5, function (x) {
        var g = x.createRadialGradient(sx, sy, 0, sx, sy, sr * 5); g.addColorStop(0, 'rgba(255,250,215,.95)'); g.addColorStop(.25, 'rgba(255,240,170,.5)'); g.addColorStop(1, 'rgba(255,240,170,0)');
        x.fillStyle = g; x.fillRect(sx - sr * 5, sy - sr * 5, sr * 10, sr * 10);
        sun(x, sx, sy, sr, lw * 1.3);
      });
    }
    // ferne Tafelberge: schon ganz oben am Horizont zu sehen (Hugo: «vom Himmel mit Bergen im Hintergrund»)
    var pk = S.Y(1, .76), hg = U * .95, prof = ridge(0, S.w, pk + hg, hg, mob ? 3 : 6, U * .05, 1.9);
    S.add(pk - 10, bot, function (x) { rock(x, 0, S.w, pk, bot, prof, U * .062, { pal: P_FAR, snow: P_SNOW, snowH: U * .12, snowLine: pk + hg * .62, grout: '#5a56c8', line: '#4b46b8', lw: lw }); });
    S.add(pk + hg, bot, function (x) { var g = x.createLinearGradient(0, pk + hg * 1.1, 0, bot); g.addColorStop(0, 'rgba(21,18,63,0)'); g.addColorStop(1, 'rgba(21,18,63,.95)'); x.fillStyle = g; x.fillRect(0, pk + hg, S.w, bot - pk - hg + 2); });
  }

  // 1 · mittlere Stufenberge mit Pyramiden auf den Terrassen
  function sceneMid(S) {
    var lw = LW0 * .85, pk = S.Y(.85, 1), hg = U * 1.35, yEnd = pk + hg + U * 1.6, prof = ridge(0, S.w, pk + hg, hg, mob ? 3 : 5, U * .07, 1.8), n = mob ? 3 : 5, i;
    S.add(pk - 10, yEnd, function (x) {
      rock(x, 0, S.w, pk, yEnd, prof, U * .085, { pal: P_ROCK, snow: ['#dff6ff', '#bfeaf8', '#a6dcf5', '#f4fdff'], snowH: U * .15, snowLine: pk + hg * .5, grout: '#241d70', line: '#1f1a5e', lw: lw });
    });
    for (i = 0; i < n; i++) (function (i) {   // Pyramiden stehen auf den Tafelbergen und Terrassen
      var px = S.X((i + rr(.25, .75)) / n), pw = U * rr(.36, .52), ph = pw * rr(.62, .76), base = Math.max(prof(px - pw * .4), prof(px), prof(px + pw * .4)) + 3;
      S.add(base - ph * 1.5, base + 8, function (x) { pyramid(x, px, base, pw, ph, PYR[(i + 1) % PYR.length], lw); });
    })(i);
    S.add(pk + hg, yEnd, function (x) { x.globalCompositeOperation = 'source-atop'; var g = x.createLinearGradient(0, pk + hg * .9, 0, yEnd); g.addColorStop(0, 'rgba(26,20,64,0)'); g.addColorStop(1, 'rgba(26,20,64,.8)'); x.fillStyle = g; x.fillRect(0, pk + hg * .9, S.w, yEnd); });
  }

  // dichte Urwaldwand zwischen xa(y) und xb(y): Mäander-Grund, darüber Pflanzen in vielen Formen
  function jungle(S, xa, xb, y0, y1, o) {
    var s = U * (o.cell || .075), ph = s * 12, lw = LW0 * (o.lwk || 1), u = U * (o.size || 1), y, i;
    for (y = y0; y < y1; y += ph) (function (ya, yb) {
      S.add(ya - s, yb + s, function (x) {
        var q, xmin = 1e9, xmax = -1e9;
        x.beginPath(); x.moveTo(xa(ya), ya);
        for (q = ya; q <= yb + 1; q += 10) { x.lineTo(xb(q), q); xmin = Math.min(xmin, xa(q)); xmax = Math.max(xmax, xb(q)); }
        x.lineTo(xb(yb + 1), yb + 1);
        for (q = yb + 1; q >= ya; q -= 10) x.lineTo(xa(q), q);
        x.closePath(); x.fillStyle = o.ground; x.fill();
        pipes(x, xmin, ya, xmax, yb, s, o.pal, { lw: lw * .8, line: INK, fill: .62, vert: .72, len: 9, acc: o.acc, test: function (px, py) { return px > xa(py) + s * .35 && px < xb(py) - s * .35; } });
      });
    })(y, Math.min(y1, y + ph));
    var ym = (y0 + y1) / 2, n = Math.round(Math.max(0, xb(ym) - xa(ym)) * (y1 - y0) / (u * u * .09) * (o.dens || 1)), list = [], py;
    for (i = 0; i < n; i++) { py = rr(y0, y1); list.push([rr(xa(py), xb(py)), py, Math.floor(R() * 9)]); }
    list.sort(function (a, b) { return a[1] - b[1]; });
    list.forEach(function (p) { plant(S, p[0], p[1], p[2], o, lw, u); });
  }
  function plant(S, px, py, k, o, lw, u) {
    S.add(py - u * .66, py + u * .55, function (x) {
      var i;
      if (k === 0 || k === 7) fan(x, { x: px, y: py + u * .2, a: -Math.PI / 2 + rr(-.6, .6), spread: rr(1.5, 2.6), n: 6 + Math.floor(R() * 5), len: u * rr(.3, .5), cols: o.leaf, lw: lw, wf: .09, stripes: 5 });
      else if (k === 1) for (i = 0; i < 3; i++) leaf(x, { x: px, y: py + u * .25, a: -Math.PI / 2 + (i - 1) * rr(.4, .75), len: u * rr(.36, .55), wid: u * rr(.07, .1), bend: (i - 1) * .2, col: pick(o.leaf), lw: lw, stripes: 8 });
      else if (k === 2) scaleBush(x, px, py + u * .2, u * rr(.38, .6), u * rr(.26, .4), [pick(o.leaf), pick(o.leaf), pick(o.leaf)], lw);
      else if (k === 3) flowerA(x, px, py, u * rr(.1, .17), pick(o.flower), lw);
      else if (k === 4) flowerB(x, px, py, u * rr(.09, .15), pick(o.flower), lw);
      else if (k === 5) fern(x, { x: px, y: py + u * .3, len: u * rr(.3, .48), col: pick(o.fern), dir: R() < .5 ? 1 : -1, lw: lw * .8 });
      else if (k === 6) {
        fan(x, { x: px, y: py, a: R() * 6, spread: Math.PI * 1.8, n: 10 + Math.floor(R() * 5), len: u * rr(.16, .26), cols: [pick(o.leaf), pick(o.leaf)], lw: lw, wf: .16 });
        x.beginPath(); x.arc(px, py, u * .035, 0, 7); x.fillStyle = pick(o.acc); x.fill(); ol(x, lw);
      } else totem(x, px, py + u * .2, u * rr(.1, .14), o.pal, o.acc, lw);
    });
  }

  // 2 · Hauptebene: Pyramide auf dem Plateau, daraus der Wasserfall, links und rechts Urwaldwände, unten der Goldfluss
  function sceneMain(S) {
    var w = S.w, cx = w / 2, vy = S.vy, bot = S.fh, lw = LW0, yRiver = vy + H * .79, pw = Math.min(W * .9, U * 1.55, H * .78), ph = pw * .7,
        yPlat = S.Y(.6, 1) + ph * 1.06,   // die Spitze der Hauptpyramide taucht bei 60 % des Wegs unten auf
        wf = mob ? W * .58 : Math.min(W * .44, 620), p1 = R() * 6, p2 = R() * 6, i, a,
        WALL = { ground: '#16123a', pal: P_WALL, acc: P_ACC, leaf: P_LEAF, flower: P_FLOWER, fern: ['#7fc94a', '#49c9b0', '#2bb673', '#c58cf0'], dens: 1.5, size: mob ? .62 : .8 };
    function eL(y) { return cx - wf / 2 - Math.sin(y * .006 + p1) * U * .05 - Math.sin(y * .017 + p2) * U * .02; }
    function eR(y) { return cx + wf / 2 + Math.sin(y * .0052 + p2) * U * .05 + Math.sin(y * .019 + p1) * U * .02; }
    // Palmen und Büsche auf dem Plateau, hinter der Pyramide
    for (i = 0; i < (mob ? 8 : 18); i++) plant(S, rr(0, w), yPlat - U * rr(.05, .34), [0, 1, 2, 7, 0, 6][i % 6], WALL, lw, U * WALL.size * 1.2);
    S.add(yPlat - ph * 1.5, yPlat + 8, function (x) { pyramid(x, cx, yPlat, pw, ph, PYR[0], lw); });
    // Plateau-Kante: Band aus Goldsteinen
    S.add(yPlat - 6, yPlat + U * .2, function (x) { mosaic(x, -4, yPlat, w + 4, yPlat + U * .15, U * .15, P_GOLD.concat(P_FIRE), { lw: lw, line: '#6a2a12', gap: U * .014 }); });
    // Wasserfall: zuerst das Wasser als Fläche, dann die Bänder darüber (sie dürfen über die Feldgrenzen laufen: keine Schnittkante)
    var pans = [];
    for (a = yPlat + U * .14; a < yRiver; a += H * .7) pans.push([a, Math.min(yRiver, a + H * .7)]);
    function chan(x, y0, y1) { var y; x.beginPath(); x.moveTo(eL(y0) - U * .12, y0); for (y = y0; y <= y1; y += 12) x.lineTo(eR(y) + U * .12, y); x.lineTo(eR(y1) + U * .12, y1); for (y = y1; y >= y0; y -= 12) x.lineTo(eL(y) - U * .12, y); x.closePath(); }
    pans.forEach(function (q) {
      S.add(q[0] - 2, q[1] + 3, function (x) {
        var g = x.createLinearGradient(0, yPlat, 0, yRiver); g.addColorStop(0, '#2472cc'); g.addColorStop(.5, '#3fa6e6'); g.addColorStop(1, '#8fdcf2');
        chan(x, q[0], q[1] + 2); x.fillStyle = g; x.fill();
      });
    });
    pans.forEach(function (q) {
      S.add(q[0] - H * .5, q[1] + H * .5, function (x) {
        chan(x, Math.max(yPlat + U * .1, q[0] - H * .5), Math.min(yRiver + U * .1, q[1] + H * .5)); x.clip();
        flow(x, q[0] - 40, q[1] + 40, cx - wf * .66, cx + wf * .66, { v: 1, n: Math.round(wf / (U * .0105)), th: U * .02, t0: .35, t1: 2.3, amp: U * .012, pal: ['#e9fbff', '#bfeefa', '#8fdcf2', '#ffffff', '#6fc8f0', '#4aaee8', '#d6f4ff'], edge: '#1f6fc4', inner: '#59bfee', lw: lw * .55, fq: .8 });
      });
    });
    // Urwaldwände
    jungle(S, function () { return -12; }, eL, yPlat + U * .12, bot, WALL);
    jungle(S, eR, function () { return w + 12; }, yPlat + U * .12, bot, WALL);
    // hängende Ranken vor dem Wasser
    for (i = 0; i < (mob ? 5 : 9); i++) (function (px, y0, len) {
      S.add(y0 - 4, y0 + len + 20, function (x) { vine(x, px, y0, len, pick(P_GREEN), lw * .9, P_ACC); });
    })(i % 2 ? eL(vy) + rr(0, U * .12) : eR(vy) - rr(0, U * .12), vy - U * rr(.2, .6), U * rr(.5, 1.1));
    // Goldfluss mit Gischt
    S.add(yRiver - U * .5, bot + 2, function (x) {
      var px, k, nC = Math.round(wf / (U * .12));
      x.beginPath(); x.moveTo(-12, bot + 12);
      for (px = -12; px <= w + 12; px += 10) x.lineTo(px, yRiver + Math.sin(px * .012 + p1) * U * .02);
      x.lineTo(w + 12, bot + 12); x.closePath();
      var g = x.createLinearGradient(0, yRiver, 0, bot); g.addColorStop(0, '#0f5a6e'); g.addColorStop(1, '#0a2f4a'); x.fillStyle = g; x.fill(); ol(x, lw);
      flow(x, -30, w + 30, yRiver + U * .05, bot + U * .05, { n: mob ? 15 : 24, th: U * .042, grow: 1.5, amp: U * .016, pow: 1.25, pal: P_GOLD, edge: '#fff2a8', inner: '#fff2a8', lw: lw * .7 });
      for (k = 0; k < (mob ? 4 : 9); k++) { var lr = U * rr(.03, .06); x.beginPath(); x.ellipse(rr(0, w), rr(yRiver + U * .16, bot - U * .04), lr * 2.3, lr * .55, rr(-.1, .1), 0, 7); ol(x, lr * .5 + lw * 1.4, '#fff2a8'); ol(x, lr * .5, pick(P_GOLD)); }
      for (k = 0; k <= nC; k++) { var r = U * rr(.04, .075); scroll(x, cx - wf * .56 + wf * 1.12 * k / nC, yRiver - r * rr(.1, .8), r, k < nC / 2 ? -1 : 1, U * .022, pick(['#ffffff', '#e9fbff', '#bfeefa']), '#2a7fd0', lw * .7); }
      for (k = 0; k < 18; k++) { x.beginPath(); x.arc(cx + rr(-.6, .6) * wf, yRiver + rr(-.16, .05) * U, U * rr(.008, .02), 0, 7); x.fillStyle = '#ffffff'; x.fill(); ol(x, lw * .5, '#2a7fd0'); }
    });
    // Uferpflanzen vor dem Fluss
    for (i = 0; i < (mob ? 8 : 16); i++) { var left = i % 2 === 0; plant(S, left ? rr(-10, eL(yRiver) + U * .06) : rr(eR(yRiver) - U * .06, w + 10), yRiver + U * rr(-.1, .12), [3, 4, 5, 2, 6, 0, 1, 8][i % 8], WALL, lw, U * WALL.size); }
  }

  // einzelnes Teil mit eigener Tiefe (Wolke, vorbeiziehendes Blatt): liegt beim Fortschritt ci am Bildschirm bei fr
  function flyer(wd, hd, f, ci, xc, fr, fn) {
    var c = canvas(wd, hd, f > 1.9 ? 1 : Math.min(DPR, 1.5)); fn(c.x, wd, hd);
    c.c.className = 'ak-sprite'; c.c.style.width = wd + 'px'; c.c.style.height = hd + 'px'; c.c.style.visibility = 'hidden';
    fliers.push({ el: c.c, x: xc - wd / 2, y: -ci * camRef * f + fr * H - hd / 2, f: f, h: hd, on: 0 });
    world.appendChild(c.c);
  }
  function skyClouds(defs) {   // [Fortschritt, x, Höhe am Bildschirm, Grösse, Tiefe]
    defs.forEach(function (d) {
      var s = U * d[3], cw = s * 5.6, chh = s * 2.1;
      flyer(cw, chh, d[4], d[0], d[1] * W, d[2], function (x) { cloud(x, cw / 2, chh * .88, s, { n: 4 + Math.floor(R() * 3), lw: Math.max(1.2, s * .035), line: '#2a86d8', inl: 'rgba(42,134,216,.5)', c1: '#ffffff', c2: '#9fe3f8' }); });
    });
  }
  function flyLeaves() {
    [[.34, 0, .5, 2.1], [.28, 1, .4, 2.4], [.2, 0, .6, 2], [.15, 1, .5, 2.6], [.09, 0, .35, 2.2]].forEach(function (d) {
      var s = U * rr(.9, 1.3);
      flyer(s, s, d[3], d[0], d[1] ? W - s * .1 : s * .1, d[2], function (x, w, h) {
        fan(x, { x: d[1] ? w * .96 : w * .04, y: h * .5, a: d[1] ? Math.PI : 0, spread: 2.1, n: 7, len: w * .8, cols: P_LEAF, lw: LW0 * 1.6, wf: .1, stripes: 7 });
      });
    });
  }

  function paintScene(fly) {
    R = rng(AK.seed);
    W = root.clientWidth; H = root.clientHeight; mob = W < 768;
    U = clamp(Math.min(W, H * .62), 300, 620); LW0 = Math.max(1.5, U * .0056);
    camRef = Math.round(H * AK.flightH); camT = fly ? camRef : 0; cam = camT;
    if (world) world.remove();
    world = document.createElement('div'); world.className = 'ak-world'; world.setAttribute('aria-hidden', 'true');
    root.insertBefore(world, root.firstChild);
    sprites = []; fliers = [];
    var S0 = strip(0, .3, 1, DPR), S1 = strip(1, .6, 1, Math.min(DPR, 1.5)), S2 = strip(2, 1, DPR, Math.min(DPR, 1.5));   // Schärfe: Schlussbild und Weg nach unten
    strips = [S0, S1, S2];
    sceneFar(S0); sceneMid(S1); sceneMain(S2);
    S0.build(); world.appendChild(S0.el);
    R = rng(AK.seed + 3);
    if (fly) skyClouds([[.99, .22, .58, .1, .42], [.9, .85, .42, .12, .48], [.8, .45, .62, .11, .45], [.72, .12, .5, .13, .5]]);   // ferne Wolken, hinter den mittleren Bergen
    S1.build(); world.appendChild(S1.el);
    S2.build(); world.appendChild(S2.el);
    R = rng(AK.seed + 5);
    if (fly) skyClouds([[.96, .2, .86, .16, .78], [.88, .82, .4, .2, 1.25], [.82, .08, .62, .26, 1.6], [.75, .88, .5, .18, .9], [.69, .3, .45, .3, 1.45], [.64, .76, .62, .22, 1.1], [.6, .14, .5, .26, 1.7], [.56, .6, .4, .2, 1.3]]);

    // Lichtung: weiches Licht hinter dem Text (gehört zum Bild und fährt mit der Kamera mit)
    var gc = document.createElement('canvas'), gw = mob ? W * .84 : Math.min(W * .38, 540), gx;
    gc.width = Math.round(W / 2); gc.height = Math.round(H / 2); gx = gc.getContext('2d');
    gx.shadowColor = 'rgba(252,252,255,.68)'; gx.shadowBlur = mob ? 22 : 30; gx.shadowOffsetX = 5000; gx.fillStyle = '#fff';
    rrect(gx, (W - gw) / 4 - 5000, H * .035, gw / 2, H * .405, gw * .16); gx.fill();
    gc.className = 'ak-glow'; gc.style.width = W + 'px'; gc.style.height = H + 'px'; glow = gc; world.appendChild(gc);

    // vordere Blätter als einzelne Teile mit eigenem Wiegen und Schatten
    function sprite(sw, sh, ax, ay, place, fn) {
      var c = canvas(sw, sh, Math.min(DPR, 1.5)); fn(c.x, sw, sh);
      var shade = canvas(sw, sh, .5); shade.x.drawImage(c.c, 0, 0, sw, sh);
      shade.x.globalCompositeOperation = 'source-in'; shade.x.fillStyle = '#100c30'; shade.x.fillRect(0, 0, sw, sh);
      shade.c.className = 'ak-shade'; shade.c.style.width = sw + 'px'; shade.c.style.height = sh + 'px';
      c.c.className = 'ak-sprite'; c.c.style.width = sw + 'px'; c.c.style.height = sh + 'px';
      sprites.push({ el: c.c, sh: shade.c, x: place[0] - sw * ax, y: place[1] - sh * ay, ax: ax, ay: ay, w: sw, h: sh, amp: rr(.8, 1.8), f: rr(.00028, .00048), ph: rr(0, 6) });
    }
    var Z = mob ? W * .82 : Math.min(W * .5, H * .95), lw = LW0 * 1.25;
    sprite(Z * .62, Z * .62, 0, 0, [-W * (mob ? .22 : .04), -H * (mob ? .07 : .03)], function (x, w, h) {
      fan(x, { x: w * .04, y: h * .04, a: mob ? 1.3 : .75, spread: mob ? .9 : 1.4, n: 7, len: w * .82, cols: ['#5b3fd1', '#7a2fbf', '#12909a', '#2f5fd0', '#c8208a'], lw: lw, wf: .06, stripes: 7 });
      flowerA(x, w * .3, h * .22, w * .08, '#e0409a', lw);
    });
    sprite(Z * .6, Z * .55, 1, 0, [W * (mob ? 1.12 : 1.04), -H * (mob ? .05 : .02)], function (x, w, h) {
      for (var i = 0; i < 3; i++) leaf(x, { x: w * .98, y: h * rr(.02, .2), a: Math.PI * rr(.62, .82), len: w * rr(.6, .85), wid: w * .08, bend: -.2, col: pick(['#1f9a5a', '#12909a', '#7a2fbf']), lw: lw, stripes: 9 });
    });
    sprite(Z * .55, Z * .8, 0, 1, [-W * .05, H * 1.03], function (x, w, h) {
      for (var i = 0; i < 3; i++) leaf(x, { x: w * .05 + i * w * .08, y: h, a: -Math.PI / 2 + rr(.15, .7), len: h * rr(.7, .92), wid: w * .11, bend: rr(.12, .28), col: pick(['#1f9a5a', '#2bb673', '#12909a']), lw: lw, stripes: 11 });
      fern(x, { x: w * .42, y: h, len: h * .36, col: '#7fc94a', dir: -1, lw: lw });
    });
    sprite(Z * .58, Z * .6, 1, 1, [W * 1.05, H * 1.03], function (x, w, h) {
      fan(x, { x: w * .95, y: h, a: -Math.PI / 2 - .55, spread: 1.6, n: 7, len: h * .8, cols: ['#c8208a', '#7a2fbf', '#5b3fd1', '#1f9a5a'], lw: lw, wf: .07, stripes: 7 });
      flowerB(x, w * .48, h * .7, w * .08, '#f07a2a', lw);
    });
    sprites.forEach(function (s) { world.appendChild(s.sh); });

    // Sonnenstrahlen von oben durch das Blätterdach
    rays = document.createElement('div'); rays.className = 'ak-rays';
    var src = [W * .7, -H * .06];
    for (var r = 0; r < 7; r++) {
      var ray = document.createElement('div'); ray.className = 'ak-ray';
      var wv = rr(.07, .2) * Math.max(W, 500), ang = -32 + r * 9 + rr(-3, 3), o1 = rr(.26, .5);
      ray.style.left = (src[0] - wv / 2) + 'px'; ray.style.width = wv + 'px';
      ray.style.transform = 'rotate(' + ang.toFixed(1) + 'deg)';
      ray.style.setProperty('--o1', o1.toFixed(2)); ray.style.setProperty('--o2', (o1 * rr(.3, .7)).toFixed(2)); ray.style.setProperty('--o3', clamp(o1 * rr(1.1, 1.7), 0, .7).toFixed(2));
      ray.style.opacity = o1;
      if (!reduce) ray.style.animation = 'akRay ' + rr(5, 11).toFixed(1) + 's ease-in-out ' + (-rr(0, 10)).toFixed(1) + 's infinite';
      rays.appendChild(ray);
    }
    world.appendChild(rays);
    // Lichtflecken (wandern langsam)
    dapple = document.createElement('div'); dapple.className = 'ak-dapple';
    for (var d = 0; d < 9; d++) {
      var sp = document.createElement('i'); sp.className = 'ak-spot';
      var sz = rr(.12, .3) * Math.min(W, H);
      sp.style.cssText = 'left:' + rr(.1, .9) * W + 'px;top:' + rr(.25, .95) * H + 'px;width:' + sz + 'px;height:' + sz * rr(.5, .8) + 'px;margin:' + (-sz / 2) + 'px 0 0 ' + (-sz / 2) + 'px;--dx:' + rr(-30, 30) + 'px;--dy:' + rr(-20, 20) + 'px;'
        + (reduce ? '' : 'animation:akSpot ' + rr(7, 14).toFixed(1) + 's ease-in-out ' + (-rr(0, 14)).toFixed(1) + 's infinite;');
      dapple.appendChild(sp);
    }
    world.appendChild(dapple);
    sprites.forEach(function (s) { world.appendChild(s.el); });
    if (fly) flyLeaves();

    // Glühwürmchen, Glitzer, Fahrtwind
    var fxc = canvas(W, H, Math.min(DPR, 1.5)); fxC = fxc.c; fxX = fxc.x; fxC.className = 'ak-fx'; world.appendChild(fxC);
    // Linsen-Glanz und Perlmutt-Schimmer (erst unten im Wald)
    flare = document.createElement('div'); flare.className = 'ak-flare';
    [[.22, .1, '#fae4b4', .35], [.45, .05, '#c3b2fa', .3], [.62, .16, '#96dcf5', .18], [.8, .07, '#f8bed7', .28]].forEach(function (f) {
      var i = document.createElement('i'), s = f[1] * Math.min(W, H);
      i.style.cssText = 'width:' + s + 'px;height:' + s + 'px;margin:' + (-s / 2) + 'px 0 0 ' + (-s / 2) + 'px;background:radial-gradient(closest-side,' + rgba(f[2], f[3]) + ',' + rgba(f[2], f[3] * .4) + ' 70%,' + rgba(f[2], 0) + ');';
      i._t = f[0]; flare.appendChild(i);
    });
    world.appendChild(flare);
    sheen = document.createElement('div'); sheen.className = 'ak-sheen'; world.appendChild(sheen);
    initParticles(); initWind();
  }

  // ---------- Glühwürmchen und Glitzer ----------
  var flies = [], sparks = [], sprFly = [], sprStar = [], tStart = 0, nowT = 0;
  function glowSprite(core, halo) {
    var s = 64, c = canvas(s, s, 1), x = c.x, g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.08, core); g.addColorStop(.3, halo); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s); return c.c;
  }
  function starSprite(col) {
    var s = 48, c = canvas(s, s, 1), x = c.x, m = s / 2;
    var g = x.createRadialGradient(m, m, 0, m, m, m * .5); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, rgba(col, 0));
    x.fillStyle = g; x.beginPath(); x.arc(m, m, m * .5, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,.95)';
    [[0, 1], [1, 0]].forEach(function (d) {   // vierzackiger Stern
      x.beginPath(); x.moveTo(m - d[0] * m, m - d[1] * m); x.quadraticCurveTo(m, m, m + d[1] * m * .08, m - d[0] * m * .08);
      x.quadraticCurveTo(m, m, m + d[0] * m, m + d[1] * m); x.quadraticCurveTo(m, m, m - d[1] * m * .08, m + d[0] * m * .08);
      x.quadraticCurveTo(m, m, m - d[0] * m, m - d[1] * m); x.fill();
    });
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = rgba(col, .45); x.fillRect(0, 0, s, s);
    return c.c;
  }
  function initParticles() {
    var P = rng(AK.seed * 31);
    if (!sprFly.length) {
      sprFly = [glowSprite('rgba(255,246,190,1)', 'rgba(250,228,140,.35)'), glowSprite('rgba(236,255,200,1)', 'rgba(190,240,170,.32)'),
        glowSprite('rgba(230,246,255,1)', 'rgba(150,220,245,.33)'), glowSprite('rgba(255,232,244,1)', 'rgba(248,190,215,.33)')];
      sprStar = PEARL_STRONG.concat(['#ffffff']).map(starSprite);
    }
    var n = Math.round(AK.fireflies * (W < 768 ? .8 : 1));
    flies = [];
    for (var i = 0; i < n; i++) {
      var side = Math.floor(P() * 4), sx, sy;   // Start ausserhalb, von allen Seiten
      if (side === 0) { sx = -60; sy = P() * H; } else if (side === 1) { sx = W + 60; sy = P() * H; } else if (side === 2) { sx = P() * W; sy = -60; } else { sx = P() * W; sy = H + 60; }
      var hx = P() * W, hy = H * (.08 + P() * .88);
      flies.push({ sx: sx, sy: sy, hx: hx, hy: hy, x: sx, y: sy, d: P() * 1500, dur: AK.flyInMs[0] + P() * (AK.flyInMs[1] - AK.flyInMs[0]),
        f1: .00006 + P() * .00008, f2: .00005 + P() * .00007, p1: P() * 6, p2: P() * 6, ax: 50 + P() * 90, ay: 40 + P() * 70,   // langsam, weite ruhige Bahnen
        pf: .0004 + P() * .0005, pp: P() * 6, s: 4 + P() * 4, spr: sprFly[Math.floor(P() * sprFly.length)] });
    }
    sparks = [];
    for (var k = 0; k < AK.glitter; k++) sparks.push(newSpark(P, true));
  }
  function newSpark(P, initial, at) {
    P = P || Math.random;
    var x, y;
    if (at) { x = at[0] + (P() - .5) * at[2]; y = at[1] + (P() - .5) * 14; }
    else { var a = (-32 + P() * 60) * Math.PI / 180, dist = P() * H * 1.1; x = W * .7 + Math.sin(-a) * dist; y = -H * .06 + Math.cos(a) * dist; }   // im Licht der Strahlen
    return { x: x, y: y, t0: initial ? -P() * 3000 : nowT, life: 1400 + P() * 2200, s: 8 + P() * 14, spr: sprStar[Math.floor(P() * sprStar.length)], vy: -.004 - P() * .01, rot: P() * 1.5 };
  }

  // ---------- Rad (Timer von Apple) ----------
  var wheel = root.querySelector('[data-ak-wheel]'), items = [], rowH = 0, cur = -1, cap = root.querySelector('[data-ak-caption]'), band, wrap;
  function setupWheel() {
    if (!wheel) return;
    items = [].slice.call(wheel.querySelectorAll('[data-ak-item]'));
    if (!items.length) return;
    wrap = document.createElement('div'); wrap.className = 'ak-wheel-wrap';
    wheel.parentNode.insertBefore(wrap, wheel); wrap.appendChild(wheel);
    wheel.style.display = 'flex'; wheel.style.flexDirection = 'column';
    var p1 = document.createElement('div'), p2 = document.createElement('div'); p1.className = p2.className = 'ak-pad';
    wheel.insertBefore(p1, wheel.firstChild); wheel.appendChild(p2);
    band = document.createElement('div'); band.className = 'ak-band'; band.innerHTML = '<i></i><i></i>'; band.setAttribute('aria-hidden', 'true');
    wrap.appendChild(band);
    wheel.setAttribute('tabindex', '0'); wheel.setAttribute('role', 'listbox'); wheel.setAttribute('aria-label', 'Übersicht');
    items.forEach(function (it, i) {
      it.setAttribute('role', 'option'); it.id = it.id || 'ak-opt-' + i;
      it.addEventListener('click', function () { go(i); });
    });
    wheel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { go(Math.min(items.length - 1, cur + 1)); e.preventDefault(); }
      if (e.key === 'ArrowUp') { go(Math.max(0, cur - 1)); e.preventDefault(); }
    });
    wheel.addEventListener('scroll', function () { lastScroll = performance.now(); }, { passive: true });
    measureWheel();
  }
  function measureWheel() {
    if (!items.length) return;
    rowH = items[0].offsetHeight || 40;
    var h = wheel.clientHeight, pad = Math.max(0, (h - rowH) / 2);
    wheel.firstChild.style.height = wheel.lastChild.style.height = pad + 'px';
    band.style.top = (wheel.offsetTop + pad) + 'px'; band.style.height = rowH + 'px'; band.style.width = Math.min(wheel.clientWidth, W * .92) + 'px';
  }
  function go(i) { wheel.scrollTo({ top: i * rowH, behavior: reduce ? 'auto' : 'smooth' }); }
  var lastScroll = 0, wheelPos = 0;
  function drawWheel() {
    if (!items.length) return 0;
    var p = wheel.scrollTop / rowH, rad = AK.rowDeg * Math.PI / 180, Rcyl = rowH / rad;
    for (var i = 0; i < items.length; i++) {
      var d = i - p, th = d * rad, a = Math.abs(th);
      var it = items[i];
      if (a > 1.6) { if (it._v !== 0) { it.style.opacity = 0; it._v = 0; } continue; }
      var y = Rcyl * Math.sin(th) - d * rowH;   // Ausgleich: im Fluss liegen die Zeilen gerade untereinander
      it.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0) scale(' + (1 - a * .06).toFixed(4) + ',' + Math.max(.05, Math.cos(th)).toFixed(4) + ')';   // Zylinder: Zeilen werden zum Rand flacher
      it.style.opacity = Math.max(0, Math.cos(th) * (1 - a * .18)).toFixed(3);
      it._v = 1;
    }
    var n = clamp(Math.round(p), 0, items.length - 1);
    if (n !== cur) select(n, cur !== -1);
    return p;
  }
  var capT = 0;
  function select(n, spark) {
    var prev = cur; cur = n;
    items.forEach(function (it, i) { it.setAttribute('aria-selected', i === n ? 'true' : 'false'); });
    wheel.setAttribute('aria-activedescendant', items[n].id);
    if (cap) {
      var price = items[n].querySelector('.ak-item-price'), info = items[n].querySelector('.ak-item-info');
      var htmlTxt = (price && price.textContent.trim() ? '<span class="ak-cap-price">' + esc(price.textContent.trim()) + '</span>' : '') + (info ? esc(info.textContent.trim()) : '');
      if (prev === -1 || reduce) cap.innerHTML = htmlTxt;
      else { cap.classList.add('is-out'); clearTimeout(capT); capT = setTimeout(function () { cap.innerHTML = htmlTxt; cap.classList.remove('is-out'); }, 150); }
    }
    if (spark && !reduce && band) {   // kleiner Glitzer an den Enden der Auswahl
      var r = band.getBoundingClientRect(), rw = root.getBoundingClientRect();
      for (var k = 0; k < 3; k++) { sparks.push(newSpark(null, false, [r.left - rw.left + 10, r.top - rw.top + r.height / 2, 40])); sparks.push(newSpark(null, false, [r.right - rw.left - 10, r.top - rw.top + r.height / 2, 40])); }
    }
  }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- Takt ----------
  var ptr = { x: 0, y: 0, tx: 0, ty: 0 }, pan = 0, run = false, raf = 0, tBoot = 0, shown = false, flown = false, fl = null, cover = null, lightK = -1, wind = [];
  root.addEventListener('pointermove', function (e) {
    if (!AK.pointer) return;
    ptr.tx = (e.clientX / W - .5) * 2; ptr.ty = (e.clientY / H - .5) * 2;
  }, { passive: true });
  root.addEventListener('pointerleave', function () { ptr.tx = ptr.ty = 0; });
  root.addEventListener('pointerdown', function () { if (fl) fl.rate = 9; }, true);   // Antippen während des Flugs: schnell zu Ende fliegen

  // Der grosse Schwung: langsam los, schnell durch die Mitte, weich landen; ganz am Ende federt die Kamera einen Hauch nach
  function swing(u) {
    var a = AK.swingIn, b = AK.swingOut, s = a / (a + b), e = u < s ? .5 * Math.pow(u / s, a) : 1 - .5 * Math.pow((1 - u) / (1 - s), b),
        w = clamp((u - .8) / .2, 0, 1), k = Math.sin(Math.PI * w);
    return e + .011 * k * k;
  }
  function initWind() { var P = rng(AK.seed * 17); wind = []; for (var i = 0; i < 30; i++) wind.push([P() * W, P() * (H + 400), .9 + P() * 1.4, .25 + P() * .5]); }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var t = now - tBoot, vel = 0, i;
    if (fl) {
      var c0 = cam; fl.u = Math.min(1, fl.u + Math.min(64, now - fl.last) / fl.D * fl.rate); fl.last = now;
      cam = camT * (1 - swing(fl.u)); vel = cam - c0;
      if (!shown && fl.u >= .8) reveal();
      if (fl.u >= 1) { fl = null; cam = 0; landed(); }
    }
    var p = drawWheel();
    var pn = items.length > 1 ? p / (items.length - 1) - .5 : 0;
    pan += (pn - pan) * .06;
    var k = touch ? .035 : .06;
    ptr.x += (ptr.tx - ptr.x) * k; ptr.y += (ptr.ty - ptr.y) * k;
    var dr = reduce ? 0 : AK.drift;
    var dx = (Math.sin(t * .00011) * 10 + Math.sin(t * .00023 + 1) * 5) * dr - ptr.x * 18 * AK.pointer;
    var dy = (Math.sin(t * .00009 + 2) * 7 + Math.cos(t * .00019) * 4) * dr - ptr.y * 12 * AK.pointer;
    // ohne Flug: beim Einblenden sinkt die Kamera ein Stück ins Bild (leichter Zoom)
    var ip = flown || reduce || !shown ? (shown || flown ? 1 : 0) : clamp((now - tStart) / (AK.introMs * 1.6), 0, 1), ie = 1 - Math.pow(1 - ip, 3);
    for (i = 0; i < strips.length; i++) {
      var L = strips[i], z = 1 + (1 - ie) * .06 * L.d;
      L.el.style.transform = 'translate3d(' + (L.ox + dx * L.d).toFixed(1) + 'px,' + (L.oy + cam * L.f + dy * L.d - pan * 2 * L.pan + (1 - ie) * 40 * L.d).toFixed(1) + 'px,0) scale(' + z.toFixed(4) + ')';
    }
    for (i = 0; i < fliers.length; i++) {
      var F = fliers[i], fy = F.y + cam * F.f, on = fy > -F.h && fy < H ? 1 : 0;
      if (on) F.el.style.transform = 'translate3d(' + (F.x + dx * F.f * .6).toFixed(1) + 'px,' + fy.toFixed(1) + 'px,0)';
      if (on !== F.on) { F.on = on; F.el.style.visibility = on ? 'visible' : 'hidden'; }
    }
    for (i = 0; i < sprites.length; i++) {
      var S = sprites[i], rot = reduce ? 0 : Math.sin(t * S.f + S.ph) * S.amp + Math.sin(t * S.f * 2.3 + S.ph * 2) * S.amp * .35;
      var sx = S.x + dx * 1.35, sy = S.y + cam * 1.5 + dy * 1.35 - pan * 2 * PANS[3] * H * AK.scrollPan * 1.3 + (1 - ie) * 90;
      var piv = 'translate(' + (S.w * S.ax) + 'px,' + (S.h * S.ay) + 'px) rotate(', back = ' translate(' + (-S.w * S.ax) + 'px,' + (-S.h * S.ay) + 'px)';
      S.el.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0) ' + piv + rot.toFixed(2) + 'deg)' + back;
      // Schatten: Licht kommt von oben rechts, also fällt er nach unten links auf das Bild dahinter
      S.sh.style.transform = 'translate3d(' + (sx - W * .035 - dx * .4).toFixed(1) + 'px,' + (sy + H * .03 - dy * .4).toFixed(1) + 'px,0) ' + piv + (rot * 1.3).toFixed(2) + 'deg) scale(1.04)' + back;
    }
    // Licht gehört zum Bild unten und fährt darum mit der Kamera mit
    var cy = cam.toFixed(1);
    if (glow) glow.style.transform = 'translate3d(' + (dx * .5).toFixed(1) + 'px,' + (dy * .5 + cam).toFixed(1) + 'px,0)';
    if (rays) rays.style.transform = 'translate3d(' + (dx * .25).toFixed(1) + 'px,' + (dy * .15 + cam).toFixed(1) + 'px,0)';
    if (dapple) dapple.style.transform = 'translate3d(0,' + cy + 'px,0)';
    var lk = Math.round(clamp(1 - cam / (H * .7), 0, 1) * 50) / 50;
    if (lk !== lightK) { lightK = lk; if (flare) flare.style.opacity = lk; if (sheen) sheen.style.opacity = (lk * .26).toFixed(3); }
    if (flare && lk > 0) {
      var fx0 = W * .7 + dx * .3, fy0 = -H * .06, fcx = W * .5 - dx * 1.2, fcy = H * .55 - dy * 1.2;
      for (i = 0; i < flare.children.length; i++) {
        var c = flare.children[i], tt = c._t;
        c.style.transform = 'translate3d(' + (fx0 + (fcx - fx0) * tt * 1.4).toFixed(1) + 'px,' + (fy0 + (fcy - fy0) * tt * 1.4).toFixed(1) + 'px,0)';
      }
    }
    if (sheen && lk > 0) sheen.style.transform = 'translate3d(' + (Math.sin(t * .00007) * W * .12 + dx * 2).toFixed(1) + 'px,' + (pan * -H * .1 + dy).toFixed(1) + 'px,0)';
    drawFx(now, vel);
  }

  function drawFx(now, vel) {
    if (!fxX) return;
    var t = now - tStart, i; nowT = t;
    fxX.clearRect(0, 0, W, H);
    fxX.globalCompositeOperation = 'lighter';
    var sp = Math.abs(vel);
    if (sp > 1.5) {   // Fahrtwind: helle Striche, je schneller desto länger
      var wa = clamp((sp - 1.5) / 20, 0, 1), span = H + 400;
      fxX.lineCap = 'round'; fxX.strokeStyle = '#ffffff';
      for (i = 0; i < wind.length; i++) {
        var q = wind[i], y = ((q[1] + cam * q[2]) % span + span) % span - 200, len = clamp(sp * q[2] * 2.4, 3, 180);
        fxX.globalAlpha = wa * q[3]; fxX.lineWidth = 1 + q[2] * .8; fxX.beginPath(); fxX.moveTo(q[0], y); fxX.lineTo(q[0], y + len); fxX.stroke();
      }
    }
    if (shown) {
      for (i = 0; i < flies.length; i++) {
        var F = flies[i], x, y2, a;
        var wx = Math.sin(t * F.f1 + F.p1) * F.ax + Math.sin(t * F.f2 * 2.1 + F.p2) * F.ax * .4;
        var wy = Math.cos(t * F.f2 + F.p2) * F.ay + Math.sin(t * F.f1 * 1.7 + F.p1) * F.ay * .5;
        var g = reduce ? 1 : clamp((t - F.d) / F.dur, 0, 1), e = g < 1 ? 1 - Math.pow(1 - g, 3) : 1;
        // Einflug auf einem Bogen, dann frei schwebend
        var bx = F.sx + (F.hx - F.sx) * e + Math.sin(e * Math.PI) * (F.hy - F.sy) * .25, by = F.sy + (F.hy - F.sy) * e - Math.sin(e * Math.PI) * (F.hx - F.sx) * .25;
        x = bx + wx * e; y2 = by + wy * e;
        var pulse = .5 + .5 * Math.sin(t * F.pf + F.pp); pulse = pulse * pulse;
        a = (reduce ? .75 : (.65 + .2 * pulse)) * (g < 1 ? .6 + .4 * e : 1);   // kaum Blinken, nur ein sanftes Atmen
        var s = F.s * (.92 + .12 * pulse);
        fxX.globalAlpha = a; fxX.drawImage(F.spr, x - s, y2 - s, s * 2, s * 2);
      }
      if (!reduce) for (i = sparks.length - 1; i >= 0; i--) {
        var P = sparks[i], age = t - P.t0;
        if (age > P.life) { if (sparks.length > AK.glitter) sparks.splice(i, 1); else sparks[i] = newSpark(null, false); continue; }
        var u = age / P.life, tw = Math.sin(u * Math.PI); tw = tw * tw * tw;
        var ss = P.s * (.4 + tw);
        fxX.globalAlpha = Math.max(0, tw) * .9;
        fxX.save(); fxX.translate(P.x, P.y + age * P.vy * 10); fxX.rotate(P.rot + u * .6);
        fxX.drawImage(P.spr, -ss, -ss, ss * 2, ss * 2); fxX.restore();
      }
    }
    fxX.globalAlpha = 1; fxX.globalCompositeOperation = 'source-over';
  }

  function start() { if (run) return; run = true; if (fl) fl.last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { run = false; cancelAnimationFrame(raf); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });

  // Text der kurzen Website einblenden (gestaffelt); die Glühwürmchen fliegen ab jetzt ein
  function reveal() {
    if (shown) return; shown = true; tStart = performance.now(); nowT = 0;
    html.classList.add('ak-on');
    var kids = root.querySelectorAll('.ak-inner > *'), i;
    for (i = 0; i < kids.length; i++) kids[i].style.transitionDelay = ((flown ? 150 : 450) + i * 140) + 'ms';
    setTimeout(function () { if (cover && cover.parentNode) cover.parentNode.removeChild(cover); for (var j = 0; j < kids.length; j++) kids[j].style.transitionDelay = ''; }, AK.introMs + 1400);
  }
  // gelandet: die Kacheln und Teile vom Weg nach unten werden nicht mehr gebraucht
  function landed() {
    setTimeout(function () {
      strips.forEach(function (S) { S.release(); });
      fliers.forEach(function (F) { F.el.width = F.el.height = 0; if (F.el.parentNode) F.el.parentNode.removeChild(F.el); }); fliers = [];
    }, 600);
  }

  // Grösse: nur bei neuer Breite neu malen (Safari-Leisten ändern nur die Höhe); dann ohne Flug
  var lastW = 0, rsT = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rsT);
    rsT = setTimeout(function () {
      if (Math.abs(root.clientWidth - lastW) > 20) { lastW = root.clientWidth; fl = null; paintScene(false); lightK = -1; reveal(); }
      measureWheel();
    }, 180);
  });

  // ---------- Start ----------
  function boot() {
    cover = document.createElement('div'); cover.className = 'ak-cover'; root.appendChild(cover);
    // Flug beim Klick auf der Weiche (/alchemist) und beim ersten Besuch in dieser Sitzung; Antippen fliegt schnell zu Ende
    var fly = false;
    try { fly = AK.flightMs > 0 && !reduce && (sessionStorage.getItem('ak-fly') === '1' || !sessionStorage.getItem('ak-seen')); sessionStorage.removeItem('ak-fly'); sessionStorage.setItem('ak-seen', '1'); } catch (e) {}
    var t0 = performance.now();
    paintScene(fly); lastW = W;           // teuer: einmal beim Laden, solange die Seite noch perlweiss ist
    if (location.hash === '#ak-test') window.__akPaintMs = Math.round(performance.now() - t0);
    setupWheel();
    drawWheel();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        tBoot = performance.now();
        if (fly) { flown = true; fl = { u: 0, last: tBoot, D: AK.flightMs, rate: 1 }; cover.classList.add('is-off'); }
        else reveal();
        start();
      });
    });
    if (location.hash === '#ak-test') window.__akSeek = function (u) { stop(); run = true; flown = true; fl = null; cam = camT * (1 - swing(u)); lightK = -1; if (u >= .8) reveal(); raf = 0; frameOnce(); };   // nur für Tests: Standbild bei Fortschritt u
  }
  function frameOnce() { var r = requestAnimationFrame; window.requestAnimationFrame = function () { return 0; }; frame(performance.now()); window.requestAnimationFrame = r; }
  if (document.fonts && document.fonts.ready) {
    var done = false, b = function () { if (!done) { done = true; boot(); } };
    document.fonts.ready.then(b); setTimeout(b, 1200);
  } else boot();
})();
