/* ALCHEMIST KURZ · /alchemist-kurz · hugosophian.studio
   Kurze Version der Alchemisten-Seite (Hugo 26./27.11.2026). Alles wird hier mit Canvas gemalt, keine Bilder
   (fester Zufall, darum bei jedem Besuch gleich).

   EINE SZENE (Hugo 27.11., 09:25 und 10:15): ein einziges hohes Bild, alles im Zeichenstil seiner El-Dorado-Referenzen –
   Formen, die dicht und bunt ineinander fliessen, dunkle Konturen, Farben in Zonen. Eigene Motive, nichts aus den
   Vorlagen kopiert, keine Tempel. Von oben nach unten: heller Himmel mit geschwungenen Schnecken-Wolken, Sonne und
   Berge im Hintergrund → das Blätterdach des Urwalds schliesst sich → darunter öffnet sich im Bogen die Lichtung:
   helle Wiese, goldener See, ferner Wald, links und rechts Urwald. Die Kamera macht einen grossen Schwung direkt von
   oben nach unten (langsam los, schnell durch die Mitte, weich landen). Nichts wird überblendet: unten steht dasselbe
   Bild still, und nur der Text der kurzen Website blendet darüber ein (dunkle Schrift auf Himmel und Wiese).

   VON HAND (Hugo 27.11., 11:02): Ausserhalb des Rads lässt sich die ganze Szene gemütlich verschieben – seitlich in den
   Urwald (mit kräftigem Parallax) und wieder nach oben bis in den Himmel. Das Rad scrollt die Services, mit Parallax
   dort, wo die Kamera gerade steht. Der Wald lebt: Randpflanzen und Ranken wiegen sich, die Wolken ziehen, der Blick
   treibt leicht.

   Technik: drei Tiefen-Ebenen als hohe Streifen (in Kacheln gemalt), dazu einzelne Wolken und Blätter. Im Takt werden
   nur Verschiebungen und Drehungen gesetzt, darum läuft alles auf der Grafikkarte. Das ganze Bild wird einmal beim
   Laden gemalt und bleibt stehen (kein Aufräumen nach der Landung: man kann ja wieder nach oben).

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
    freePan: 1,           // die ganze Szene lässt sich von Hand verschieben: zurück nach oben und seitlich (0 = aus)
    panX: [.3, .14],      // so weit geht es seitlich, als Anteil der Breite: Handy, Computer
    sway: 1,              // Wedel am Rand und Ranken wiegen sich im Wind (0 = aus)
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
    '[data-ak] { position: relative; width: 100%; height: 100vh; height: 100lvh; overflow: hidden; isolation: isolate; -webkit-tap-highlight-color: transparent; background: #15123f; touch-action: none; }',
    '[data-ak].ak-drag { cursor: grabbing; -webkit-user-select: none; user-select: none; }',
    '[data-ak] .ak-inner { position: relative; z-index: 6; height: 100vh; height: 100svh; box-sizing: border-box; }',
    'html:not(.ak-on) [data-ak] .ak-inner { pointer-events: none; }',   /* während des Flugs kann man nichts versehentlich antippen */
    '.ak-world { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }',
    '.ak-world > * { position: absolute; pointer-events: none; }',
    '.ak-layer, .ak-sprite, .ak-shade, .ak-glow { left: 0; top: 0; will-change: transform; transform-origin: 0 0; }',
    '.ak-shade { opacity: .2; }',
    '.ak-sway { position: absolute; will-change: transform; }',
    /* Licht: fertig gemalte Bilder mit normaler Deckkraft. Kein Mischmodus, keine Masken – die bremsten das Handy bei der Landung */
    '.ak-rays { left: 0; top: 0; will-change: transform; }',
    '.ak-rays canvas { position: absolute; left: 0; top: 0; will-change: opacity; }',
    '@keyframes akRayA { 0%, 100% { opacity: 1; } 35% { opacity: .5; } 70% { opacity: .85; } }',
    '@keyframes akRayB { 0%, 100% { opacity: .55; } 40% { opacity: 1; } 75% { opacity: .65; } }',
    '.ak-dapple { left: 0; top: 0; will-change: transform; }',
    '.ak-dapple canvas { position: absolute; left: 0; top: 0; will-change: transform, opacity; }',
    '@keyframes akSpot { 0%, 100% { transform: translate3d(0,0,0); opacity: 1; } 50% { transform: translate3d(18px,-12px,0); opacity: .65; } }',
    '.ak-fx { inset: 0; width: 100%; height: 100%; z-index: 9; }',
    '.ak-flare { inset: 0; z-index: 10; }',
    '.ak-flare i { position: absolute; border-radius: 50%; will-change: transform; }',
    '.ak-sheen { inset: -30%; z-index: 11; will-change: transform;',
    '  background: linear-gradient(115deg, rgba(218,242,248,0) 30%, rgba(218,242,248,.9) 38%, rgba(229,225,244,.9) 44%, rgba(242,221,227,.9) 50%, rgba(251,243,222,.9) 56%, rgba(251,243,222,0) 64%); }',
    /* Das Licht ist nur da, wenn die Kamera unten in der Lichtung steht (ak-lit); es blendet weich ein und aus */
    '.ak-rays, .ak-glow, .ak-dapple, .ak-flare, .ak-sheen { opacity: 0; visibility: hidden; transition: opacity 1.2s ease, visibility 0s linear 1.2s; }',
    '.ak-lit .ak-rays, .ak-lit .ak-glow, .ak-lit .ak-flare { opacity: 1; visibility: visible; transition: opacity 2s ease, visibility 0s; }',
    '.ak-lit .ak-dapple { opacity: 1; visibility: visible; transition: opacity 2s ease, visibility 0s; }',
    '.ak-lit .ak-sheen { opacity: .14; visibility: visible; transition: opacity 2s ease, visibility 0s; }',
    '.ak-world:not(.ak-lit) .ak-rays canvas, .ak-world:not(.ak-lit) .ak-dapple canvas { animation-play-state: paused; }',
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
    'html.ak-on [data-ak] .ak-title { animation: akTitle 7s ' + EASE_OUT + ' 2.6s infinite; }',
    '@keyframes akTitle { 0% { background-position: 100% 0; } 40%, 100% { background-position: 0% 0; } }',
    '@media (prefers-reduced-motion: reduce) { .ak-rays canvas, .ak-dapple canvas, html.ak-on [data-ak] .ak-title { animation: none !important; } }'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------- Mal-Bausteine ----------
  var INK = '#171a4c';   // Kontur: dunkles Blau, wie mit dem Stift gezogen
  function canvas(w, h, dpr) {
    var c = document.createElement('canvas');
    c.width = Math.max(2, Math.round(w * dpr)); c.height = Math.max(2, Math.round(h * dpr));
    var x = c.getContext('2d'); x.scale(dpr, dpr); c._w = w; c._h = h; c._dpr = dpr;
    return { c: c, x: x };
  }
  function ol(x, w, col) { x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = col || INK; x.lineWidth = w; x.stroke(); }
  function polyline(x, pts) { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); }
  // weiche Linie durch Punkte (die Ecken werden rund: so fliessen Bänder und Lianen)
  function smooth(x, p) {
    x.beginPath(); x.moveTo(p[0][0], p[0][1]);
    for (var i = 1; i < p.length - 1; i++) x.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
    x.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
  }
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
  // Glyphen-Stein: Fläche, heller Innenrand, Kontur, innen ein kleines Zeichen
  function stone(x, cx, cy, w, h, col, o) {
    var m = Math.min(w, h), lw = o.lw, p = rpts(cx, cy, w, h, o.r == null ? .32 : o.r, o.j == null ? m * .05 : o.j);
    blob(x, p); x.fillStyle = col; x.fill();
    if (o.rim !== false) { x.save(); x.clip(); x.lineWidth = m * .26; x.strokeStyle = o.rim || mix(col, '#ffffff', .2); x.stroke(); x.restore(); }
    ol(x, lw, o.line);
    var k = o.kind == null ? Math.floor(R() * 6) : o.kind, c2 = o.c2 || mix(col, INK, .38);
    if (m < lw * 7 || k > 3) return;
    if (k === 0) { blob(x, rpts(cx, cy, w * .46, h * .46, .32, 0)); x.fillStyle = c2; x.fill(); ol(x, lw * .7, o.line); }
    else if (k === 1) { x.beginPath(); x.arc(cx, cy, m * .17, 0, 7); x.fillStyle = c2; x.fill(); ol(x, lw * .7, o.line); }
    else { polyline(x, spiralPts(cx, cy, m * .3, 1.4, R() * 6, R() < .5 ? 1 : -1)); ol(x, lw, c2); }
  }
  // Mäander: dicke runde Bänder, die sich ineinander schieben und den Grund füllen. o.palAt wählt die Farben nach dem Ort
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
      var pl = o.palAt ? o.palAt(pts[0][0], pts[0][1]) : pal, col = pick(pl); col = mix(col, R() < .5 ? '#ffffff' : INK, R() * .12);
      if (o.dark) col = mix(col, INK, o.dark);
      if (pts.length === 1) {
        x.beginPath(); x.arc(pts[0][0], pts[0][1], th * .44, 0, 7); x.fillStyle = col; x.fill(); ol(x, lw, o.line);
        x.beginPath(); x.arc(pts[0][0], pts[0][1], th * .17, 0, 7); x.fillStyle = pick(o.acc || pl); x.fill(); continue;
      }
      if (pts.length > 2) smooth(x, pts); else polyline(x, pts);
      ol(x, th + lw * 2, o.line); ol(x, th, col); ol(x, th * .2, mix(col, R() < .6 ? '#ffffff' : INK, .3));
      if (R() < .6) { var e = pts[pts.length - 1]; x.beginPath(); x.arc(e[0], e[1], th * .25, 0, 7); x.fillStyle = pick(o.acc || pl); x.fill(); ol(x, lw * .7, o.line); }
    }
  }
  // fliessende Bänder mit runden Enden: a = Laufrichtung, b = quer dazu; o.v = senkrecht
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

  // ein Streifen: schmal am Fuss, bauchig, spitz am Ende, entlang eines Bogens. Grundform für Wedel, Blätter und Blüten
  function stripe(x, px, py, a, L, w, bend, col, lw, rib, tip) {   // tip: 0 = spitz … 1 = rundes Ende
    var by = bend * L; tip = tip || 0;
    x.save(); x.translate(px, py); x.rotate(a);
    x.beginPath(); x.moveTo(0, -w * .2);
    x.bezierCurveTo(L * .28, -w * 1.05 + by * .08, L * (.74 + .22 * tip), -w * (.8 + .3 * tip) + by * (.58 + .32 * tip), L, by);
    x.bezierCurveTo(L * (.72 + .23 * tip), w * (.62 + .36 * tip) + by * (.62 + .3 * tip), L * .28, w * .95 + by * .1, 0, w * .2);
    x.closePath(); x.fillStyle = col; x.fill(); ol(x, lw);
    if (rib) { x.beginPath(); x.moveTo(L * .08, by * .01); x.bezierCurveTo(L * .3, by * .09, L * .72, by * .58, L * .9, by * .9); ol(x, lw * .6, rib === 1 ? mix(col, '#ffffff', .38) : rib); }
    x.restore();
  }
  // Wedel: Bündel geschwungener Streifen aus einem Punkt (die Farben wechseln sich in einer Tonfamilie ab)
  function frond(x, o) {
    var n = o.n, i, ord = [], c0 = Math.floor(R() * 6), tip = o.tip == null ? rr(.25, 1) : o.tip;
    for (i = 0; i < n; i++) ord.push(i);
    if (!o.even) ord.sort(function (a, b) { return Math.abs(b - (n - 1) / 2) - Math.abs(a - (n - 1) / 2); });   // aussen zuerst, die mittleren liegen oben
    for (i = 0; i < n; i++) {
      var t = n > 1 ? ord[i] / (n - 1) - .5 : 0, k = o.even ? 1 : 1 - Math.abs(t) * .4;
      stripe(x, o.x, o.y, o.a + t * o.spread, o.len * k * rr(.86, 1.06), o.wid * rr(.85, 1.2), (o.even ? 0 : t * 2 * o.droop) + rr(-.07, .07), o.cols[(ord[i] + c0) % o.cols.length], o.lw, o.rib, tip);
    }
  }
  function leaf(x, o) { stripe(x, o.x, o.y, o.a, o.len, o.wid * 1.2, o.bend || 0, o.col, o.lw, o.rib, .5); }
  // breites Blatt mit Mittelrippe und Adern
  function bigLeaf(x, px, py, a, L, w, bend, col, lw) {
    stripe(x, px, py, a, L, w, bend, col, lw, 0, .35);
    var by = bend * L, n = 6, i, t, mx, my, k, c2 = mix(col, '#ffffff', .34);
    x.save(); x.translate(px, py); x.rotate(a);
    x.beginPath(); x.moveTo(L * .05, 0); x.bezierCurveTo(L * .3, by * .09, L * .72, by * .58, L * .93, by * .93); ol(x, lw * .7, c2);
    for (i = 1; i <= n; i++) {
      t = i / (n + 1); mx = L * (.05 + .86 * t); my = by * t * t * .95; k = Math.sin(t * Math.PI) * w;
      x.beginPath(); x.moveTo(mx, my); x.quadraticCurveTo(mx + L * .05, my - k * .4, mx + L * .1, my - k * .66); ol(x, lw * .5, c2);
      x.beginPath(); x.moveTo(mx, my); x.quadraticCurveTo(mx + L * .05, my + k * .36, mx + L * .1, my + k * .58); ol(x, lw * .5, c2);
    }
    x.restore();
  }
  function bloom(x, cx, cy, r, col, lw) {   // grosse Blüte: zwei Kränze spitzer Blütenblätter
    var n = 5 + Math.floor(R() * 3), a0 = R() * 6, i, k;
    for (k = 0; k < 2; k++) for (i = 0; i < n; i++) stripe(x, cx, cy, a0 + (i + k * .5) / n * Math.PI * 2, r * (k ? .6 : 1), r * (k ? .17 : .27), rr(-.1, .1), k ? mix(col, '#ffffff', .3) : col, lw * .9, k ? 0 : 1);
    x.beginPath(); x.arc(cx, cy, r * .2, 0, 7); x.fillStyle = '#ffd75e'; x.fill(); ol(x, lw * .8);
    for (i = 0; i < 6; i++) { x.beginPath(); x.arc(cx + Math.cos(i * 1.05) * r * .1, cy + Math.sin(i * 1.05) * r * .1, r * .03, 0, 7); x.fillStyle = '#e0602a'; x.fill(); }
  }
  function flowerB(x, cx, cy, r, col, lw) {   // runde Blütenblätter mit Innenkreis
    var n = 5 + Math.floor(R() * 3), a0 = R() * 6, i;
    for (i = 0; i < n; i++) {
      var a = a0 + i / n * Math.PI * 2, px = cx + Math.cos(a) * r * .62, py = cy + Math.sin(a) * r * .62;
      x.beginPath(); x.arc(px, py, r * .42, 0, 7); x.fillStyle = col; x.fill(); ol(x, lw * .8);
      x.beginPath(); x.arc(px, py, r * .2, 0, 7); ol(x, lw * .6, mix(col, '#ffffff', .45));
    }
    x.beginPath(); x.arc(cx, cy, r * .34, 0, 7); x.fillStyle = '#ffd75e'; x.fill(); ol(x, lw * .8);
    x.beginPath(); x.arc(cx, cy, r * .14, 0, 7); x.fillStyle = '#e0602a'; x.fill();
  }
  function disc(x, cx, cy, r, cols, lw) {   // Auge: Ringe ineinander
    for (var i = 0; i < cols.length; i++) { x.beginPath(); x.arc(cx, cy, r * (1 - i / cols.length * .86), 0, 7); x.fillStyle = cols[i]; x.fill(); ol(x, lw * (i ? .7 : 1)); }
  }
  function pearls(x, px, py, len, r, col, lw, a) {   // Perlenkette auf dunklem Band
    var n = Math.max(3, Math.round(len / (r * 2.7))), i;
    x.save(); x.translate(px, py); x.rotate(a || 0);
    x.beginPath(); x.moveTo(0, 0); x.lineTo(0, len); ol(x, r * 2.7 + lw * 2, INK); ol(x, r * 2.7, '#2a2478');
    for (i = 0; i < n; i++) { x.beginPath(); x.arc(0, len * (i + .5) / n, r * .82, 0, 7); x.fillStyle = col; x.fill(); }
    x.restore();
  }
  function fern(x, o) {   // Farnschnecke: Stiel, der oben einrollt, mit kleinen Fiedern
    var dir = o.dir || 1, L = o.len, r = L * .22, pts = [], i;
    for (i = 0; i <= 20; i++) { var t = i / 20; pts.push([o.x + Math.sin(t * 2.4) * dir * L * .28, o.y - t * L]); }
    var top = pts[pts.length - 1];
    pts = pts.concat(spiralPts(top[0] + dir * r, top[1], r, 1.25, Math.PI, dir));
    for (i = 3; i < 18; i += 2) {
      var p = pts[i], s = (i % 4 === 1 ? 1 : -1), ll = L * .16 * (1 - i / 22);
      leaf(x, { x: p[0], y: p[1], a: -Math.PI / 2 + s * 1.1, len: ll, wid: ll * .3, bend: s * .2, col: mix(o.col, '#ffffff', .14), lw: o.lw * .7 });
    }
    polyline(x, pts); ol(x, o.lw * 2 + L * .035); ol(x, L * .035, o.col);
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
  // Liane: langes Band, das in weichen Stufen nach unten läuft und alles verbindet
  function liana(x, px, y0, y1, th, col, lw, o) {
    var p = [[px, y0]], y = y0, c = px, st = o.step;
    while (y < y1) {
      y = Math.min(y1, y + st * rr(.6, 1.6)); p.push([c, y]);
      if (y < y1 && R() < .7) { c = clamp(c + (R() < .5 ? -1 : 1) * st * rr(.2, .6), o.x0, o.x1); y = Math.min(y1, y + st * rr(.1, .3)); p.push([c, y]); }
    }
    smooth(x, p); ol(x, th + lw * 2, INK); ol(x, th, col);
    if (o.inner) ol(x, th * .22, o.inner);
    if (o.bead) { var e = p[p.length - 1]; disc(x, e[0], e[1] + th * .6, th * 1.25, [o.bead, col, INK], lw); }
  }

  // Wolke (eigene Form): Bauch aus Bögen, an den Enden rollt sie sich zur Schnecke ein (Hugo 27.11., 11:02: ohne die langen spitzen Fahnen)
  function swirlCloud(x, cx, cy, s, o) {
    var n = o.n || 5, lw = o.lw, L = o.line, lobes = [], rs = [], tot = 0, i, bx;
    for (i = 0; i < n; i++) { var k = 1 - Math.abs(i - (n - 1) / 2) / n * 1.25; rs.push(s * rr(.38, .58) * (.4 + .6 * k)); tot += rs[i] * 1.25; }
    bx = cx - tot / 2;
    for (i = 0; i < n; i++) { lobes.push([bx + rs[i], cy - rs[i] * rr(.5, .85), rs[i]]); bx += rs[i] * 1.25; }
    var x0 = cx - tot / 2, x1 = cx + tot / 2, g = x.createLinearGradient(0, cy - s * 1.2, 0, cy + s * .1);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.5, o.c1); g.addColorStop(1, o.c2);
    [-1, 1].forEach(function (d) {   // Schnecken an den Enden
      var rv = s * rr(.22, .32), vx = d < 0 ? x0 - rv * .15 : x1 + rv * .15, vy2 = cy - rv, sp = spiralPts(vx, vy2, rv, 1.35, Math.PI / 2, -d);
      polyline(x, [[d < 0 ? x0 + s * .5 : x1 - s * .5, cy]].concat(sp)); ol(x, rv * .6 + lw * 2, L); ol(x, rv * .6, o.c1);
      polyline(x, sp.slice(5)); ol(x, lw, o.inl);
    });
    lobes.forEach(function (c) { x.beginPath(); x.arc(c[0], c[1], c[2], 0, 7); ol(x, lw * 2, L); });
    rrect(x, x0, cy - s * .34, tot, s * .36, s * .18); ol(x, lw * 2, L);
    lobes.forEach(function (c) { x.beginPath(); x.arc(c[0], c[1], c[2], 0, 7); x.fillStyle = g; x.fill(); });
    rrect(x, x0, cy - s * .34, tot, s * .36, s * .18); x.fillStyle = g; x.fill();
    lobes.forEach(function (c, i) {
      x.beginPath(); x.arc(c[0], c[1], c[2] * .7, Math.PI * 1.08, Math.PI * 1.92); ol(x, lw, o.inl);
      if (c[2] > s * .33) { polyline(x, spiralPts(c[0], c[1] + c[2] * .12, c[2] * .4, 1.3, Math.PI * (i % 2 ? 0 : 1), i % 2 ? -1 : 1)); ol(x, lw, o.inl); }
    });
  }
  function cloudLook(s) { return { n: 3 + Math.floor(R() * 4), lw: Math.max(1.1, s * .034), line: '#5b6bd0', inl: 'rgba(98,112,214,.5)', c1: '#fff5ea', c2: pick(['#f8cbdc', '#d3d9fb', '#ffdcb6', '#e6d2fa']) }; }
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
  // Grat einer Bergkette: x → Höhe über der Grundlinie (mod drückt die Berge zur Sonne hin flach)
  function peaksFn(x0, x1, n, hgt, mod) {
    var pk = [], i, p1 = R() * 6, p2 = R() * 6;
    for (i = 0; i < n; i++) pk.push([x0 + (x1 - x0) * (i + rr(.2, .8)) / n, rr(.55, 1), (x1 - x0) / n * rr(.75, 1.35), rr(.75, 1.25)]);
    return function (px) {
      var v = .12, k, d;
      for (k = 0; k < n; k++) { d = 1 - Math.abs(px - pk[k][0]) / pk[k][2]; if (d > 0) v = Math.max(v, pk[k][1] * Math.pow(d, pk[k][3])); }
      return hgt * (v + Math.sin(px * .021 + p1) * .03 + Math.sin(px * .047 + p2) * .015) * (mod ? mod(px) : 1);
    };
  }
  // Berge als fliessende Schichten: jede Linie wiederholt den Grat etwas tiefer und flacher; oben hell, unten satt
  function strata(x, x0, x1, base, hf, n, pal, o) {
    for (var k = 0; k < n; k++) {
      var s = Math.pow(1 - k / n, 1.25), px;
      x.beginPath(); x.moveTo(x0, base + 6);
      for (px = x0; px <= x1 + 5; px += 5) x.lineTo(px, base - hf(px) * s - (k ? Math.sin(px * .013 * (1 + k * .3) + k * 1.7) * o.wob * s : 0));
      x.lineTo(x1 + 5, base + 6); x.closePath();
      x.fillStyle = pal[Math.min(k, pal.length - 1)]; x.fill(); ol(x, o.lw, o.line);
    }
  }
  // rollende Hügel von hinten nach vorn, mit kleinen Bögen wie ferne Baumkronen
  function hills(x, x0, x1, yTop, yBot, n, pal, o) {
    for (var k = 0; k < n; k++) {
      var y = yTop + (yBot - yTop) * Math.pow(k / n, 1.5), a = o.amp * (1 + k * .7), f = o.fq / (1 + k * .3), p1 = R() * 6, p2 = R() * 6, px, c = pal[Math.min(k, pal.length - 1)], r = a * 1.1 + 3;
      x.beginPath(); x.moveTo(x0, yBot + 6);
      for (px = x0; px <= x1 + 6; px += 6) x.lineTo(px, y + Math.sin(px * f + p1) * a + Math.sin(px * f * 2.7 + p2) * a * .35);
      x.lineTo(x1 + 6, yBot + 6); x.closePath(); x.fillStyle = c; x.fill(); ol(x, o.lw, o.line);
      for (px = x0 + R() * r; px < x1; px += r * 2.1) { x.beginPath(); x.arc(px, y + Math.sin(px * f + p1) * a + Math.sin(px * f * 2.7 + p2) * a * .35 + r * 1.5, r, Math.PI * 1.05, Math.PI * 1.95); ol(x, o.lw * .7, mix(c, '#ffffff', .3)); }
    }
  }
  function crown(x, cx, cy, r, z, lw) {   // Baumkrone am Horizont: Wedelstern oder Kuppel mit Bögen oder Schnecke
    var k = Math.floor(R() * 3), c = pick(z), c2 = mix(c, '#ffffff', .36);
    if (k === 0) { frond(x, { x: cx, y: cy + r * .3, a: -Math.PI / 2, spread: Math.PI * 1.5, n: 9, len: r * 1.3, wid: r * .17, droop: .5, cols: z, lw: lw * .8, rib: 0 }); return; }
    x.beginPath(); x.ellipse(cx, cy, r * 1.15, r * .85, 0, 0, 7); x.fillStyle = c; x.fill(); ol(x, lw);
    if (k === 1) { x.beginPath(); x.ellipse(cx, cy + r * .12, r * .78, r * .52, 0, Math.PI * 1.1, Math.PI * 1.9); ol(x, lw * .7, c2); x.beginPath(); x.ellipse(cx, cy + r * .2, r * .42, r * .26, 0, Math.PI * 1.1, Math.PI * 1.9); ol(x, lw * .7, c2); }
    else { polyline(x, spiralPts(cx, cy, r * .5, 1.3, R() * 6, 1)); ol(x, lw * .7, c2); }
  }
  // Papierkorn nur auf Gemaltem: feines Korn und weiche Flecken, wie auf Papier gemalt
  var paperTile = null;
  function paper(x, x0, y0, w, h, k) {
    if (!paperTile) {
      var t = canvas(128, 128, 1), P = rng(99), id = t.x.createImageData(128, 128), d = id.data;
      for (var i = 0; i < d.length; i += 4) { var v = P(); d[i] = d[i + 1] = d[i + 2] = v < .5 ? 0 : 255; d[i + 3] = Math.abs(v - .5) * 2 * 255; }
      t.x.putImageData(id, 0, 0); paperTile = t.c;
    }
    x.save(); x.globalCompositeOperation = 'source-atop'; x.fillStyle = x.createPattern(paperTile, 'repeat');
    x.globalAlpha = .05 * k; x.fillRect(x0, y0, w, h);
    x.globalAlpha = .07 * k; x.scale(9, 9); x.fillRect(x0 / 9, y0 / 9, w / 9 + 1, h / 9 + 1);
    x.restore();
  }

  // ---------- Farben: kräftige Gouache-Töne in Zonen. Benachbarte Formen nehmen verwandte Farben, so fliesst alles ineinander ----------
  var Z_PURP = ['#6a2a9a', '#8a35b0', '#a23fb8', '#7a3fc0', '#5a2a88', '#b548a8'],
      Z_MAG = ['#b8288a', '#d0379a', '#e0509f', '#a02078', '#c8409a', '#8e2a8a'],
      Z_BLUE = ['#2a4aa8', '#3560c0', '#2c3c94', '#4a78d0', '#3a52b8', '#5a6fd8'],
      Z_TEAL = ['#178a88', '#1fa39a', '#2bb6a0', '#147a80', '#3fc0a8', '#0f6a78'],
      Z_GREEN = ['#2f9a4a', '#4fae3f', '#6fbf3a', '#238a52', '#8fc93a', '#1f7a4a'],
      Z_WARM = ['#e07a28', '#f09a30', '#d85a28', '#f2b830', '#c8442a', '#f7c948'],
      ZONES = [Z_WARM, Z_GREEN, Z_TEAL, Z_PURP, Z_MAG, Z_PURP, Z_BLUE, Z_TEAL, Z_GREEN],
      P_GOLD = ['#f2b830', '#f7c948', '#e9a420', '#ffd75e', '#d98f1a'],
      P_FLOWER = ['#e0409a', '#ff5a8a', '#f07a2a', '#ffd75e', '#c58cf0', '#ff7ab8', '#f6f2ff', '#d0379a'],
      P_ACC = ['#ffd75e', '#f59a3a', '#ff7ab8', '#7fe0d0', '#f6f2ff'],
      P_LIANA = ['#c8332e', '#e0602a', '#f2b830', '#d0379a', '#8a35b0', '#1fa39a', '#3560c0', '#e0509f'],
      ZP = [0, 0, 0];
  function zoneAt(px, py) {
    var k = 1 / (U * 1.15), v = Math.sin(px * k * 2.3 + ZP[0]) + Math.sin(py * k * 1.45 + ZP[1]) + Math.sin((px * .6 + py) * k + ZP[2]);
    return ZONES[Math.floor(clamp((v + 3) / 6, 0, .999) * ZONES.length)];
  }
  function zc(px, py) { return R() < .14 ? pick(ZONES) : zoneAt(px, py); }

  // ---------- Szene ----------
  var world, strips = [], sprites = [], fliers = [], rays, dapple, glow, flare, sheen, fxC, fxX, W = 0, H = 0, U = 0, LW0 = 2, mob = false,
      camRef = 0, camT = 0, cam = 0, QF = 1, PANS = [0.006, 0.016, 0.03, 0.05], DEPTH = [0.18, 0.38, 0.62, 1],
      SUN = [.5, .325];   // Sonne im Schlussbild (Anteil von Breite und Höhe): tief über dem See, zwischen Slogan und Rad
  // Ein Streifen = eine Tiefen-Ebene. y = 0 ist die Oberkante des Schlussbilds, der Weg der Kamera liegt bei y < 0.
  // Gemalt wird in Kacheln; jedes Teil (add) kennt seine Höhe und wird nur in den Kacheln gemalt, die es berührt.
  function strip(i, f, dprFin, dprFly) {
    var mg = .08, mx = W * mg + XR * f, pan = PANS[i] * H * AK.scrollPan, w = W + mx * 2, fh = H * (1 + mg * 2) + pan * 2, tf = Math.round(camT * f);   // seitlich so viel breiter, wie die Ebene beim Verschieben wandert
    var el = document.createElement('div'); el.className = 'ak-layer'; el.style.width = w + 'px'; el.style.height = (fh + tf) + 'px';
    var S = { el: el, f: f, d: DEPTH[i], w: w, fh: fh, tf: tf, ox: -mx, oy: -H * mg - pan - tf, pan: pan, vy: H * mg + pan, items: [], tiles: [], sw: [] };
    S.X = function (fr) { return mx + fr * W; };
    S.Y = function (c, fr) { return S.vy - c * camRef * f + fr * H; };   // Höhe im Streifen, die beim Fortschritt c (1 = oben, 0 = gelandet) am Bildschirm bei fr liegt
    S.add = function (y0, y1, fn) { S.items.push([y0, y1, fn, AK.seed * 7919 + i * 100003 + S.items.length * 31 + 5]); };
    // Teil, das sich wiegt: eigenes kleines Bild auf dem Streifen, dreht um seinen Fuss (top = es hängt und dreht um die Oberkante)
    S.sway = function (px, py, r, top, fn) { S.sw.push([px, py, r, top, fn, AK.seed * 104729 + i * 7001 + S.sw.length * 13 + 3]); };
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
        paper(x, 0, a, w, hh, i ? 1 : .45);   // der Himmel bleibt glatter
        el.appendChild(c.c); S.tiles.push([c.c, a]);
      }
      S.sw.forEach(function (q) {
        var r = q[2], o = q[3] ? 4 : r, c = canvas(r * 2, r * 2, dprFin), P = rng(q[5] + 1);
        R = rng(q[5]); c.x.translate(r - q[0], o - q[1]); q[4](c.x); paper(c.x, q[0] - r, q[1] - o, r * 2, r * 2, 1);
        c.c.className = 'ak-sway'; c.c.style.cssText = 'left:' + (q[0] - r) + 'px;top:' + (q[1] - o + tf) + 'px;width:' + r * 2 + 'px;height:' + r * 2 + 'px;transform-origin:50% ' + (q[3] ? '4px' : '50%');
        el.appendChild(c.c);
        sways.push({ el: c.c, x: q[0], ph: P() * 6, amp: (q[3] ? 1.5 : 2.2) + P() * 2.2, f: .0007 + P() * .0006 });
      });
    };
    return S;
  }

  // 0 · Himmel, Sonne und Berge im Hintergrund (sie sind von Anfang an zu sehen und bewegen sich kaum), darunter ferne Hügel
  function sceneFar(S) {
    var top = -S.tf, bot = S.fh, w = S.w, vy = S.vy, lw = LW0 * .7, base = vy + H * .385, sx = S.X(SUN[0]), sy = vy + H * SUN[1], sr = Math.min(U * .064, H * .03);
    S.add(top, bot, function (x) {
      var g = x.createLinearGradient(0, top, 0, bot), span = bot - top;
      function st(y, c) { g.addColorStop(clamp((y - top) / span, 0, 1), c); }
      if (S.tf > H * .2) { st(top, '#f3f1f9'); st(top + (vy - top) * .5, '#bdeaf7'); }
      st(vy - H * .04, '#5cc6f1'); st(vy + H * .16, '#8fd8f4'); st(vy + H * .3, '#ffe9c2'); st(base, '#ffdcae'); st(bot, '#ffdcae');
      x.fillStyle = g; x.fillRect(0, top, w, span);
      flow(x, -20, w + 20, top + H * .08, base - U * .1, { n: 26, th: U * .02, amp: U * .018, pal: ['rgba(255,255,255,.2)', 'rgba(200,244,255,.2)', 'rgba(255,240,214,.18)'], plain: 1 });
    });
    S.add(sy - sr * 7, sy + sr * 7, function (x) {
      var g = x.createRadialGradient(sx, sy, 0, sx, sy, sr * 7); g.addColorStop(0, 'rgba(255,252,225,.95)'); g.addColorStop(.22, 'rgba(255,240,180,.55)'); g.addColorStop(1, 'rgba(255,236,180,0)');
      x.fillStyle = g; x.fillRect(sx - sr * 7, sy - sr * 7, sr * 14, sr * 14);
      sun(x, sx, sy, sr, lw * 1.2);
    });
    // kleine Wolken, die im Bild stehen bleiben (die grossen ziehen als einzelne Teile vorbei)
    [[.8, -.18, .07], [.24, -.32, .06], [.62, -.08, .05]].forEach(function (c) {
      var s = U * c[2], py = vy + H * c[1];
      S.add(py - s * 1.6, py + s * .4, function (x) { swirlCloud(x, S.X(c[0]), py, s, cloudLook(s)); });
    });
    var m1 = function (px) { var d = clamp(Math.abs(px - sx) / (w * .44), 0, 1); return .1 + .9 * d * d * (3 - 2 * d); },
        m2 = function (px) { var d = clamp(Math.abs(px - sx) / (w * .38), 0, 1); return .07 + .93 * d * d * (3 - 2 * d); },
        hf1 = peaksFn(0, w, mob ? 4 : 7, U * (mob ? .4 : .46), m1), hf2 = peaksFn(0, w, mob ? 5 : 9, U * .2, m2);
    S.add(base - U * .5, base + 8, function (x) { strata(x, 0, w, base, hf1, 6, ['#f6f3ff', '#e2defc', '#d2cdfa', '#c2c0f6', '#b3b6f3', '#a6aef0'], { lw: lw * .8, line: 'rgba(96,100,205,.6)', wob: U * .006 }); });
    S.add(base - U * .24, base + 8, function (x) { strata(x, 0, w, base, hf2, 6, ['#f0f4ff', '#b9aaf6', '#9c88ee', '#826fe3', '#6b5ed6', '#5955c8'], { lw: lw, line: '#3c3f9e', wob: U * .004 }); });
    S.add(base - U * .03, bot + 6, function (x) { hills(x, 0, w, base + U * .012, bot, 11, ['#98a2f2', '#84a2ea', '#6ba6d8', '#52aac0', '#3fa8a6', '#33a28e', '#2f9a78', '#2f9464', '#3a9a52', '#4aa348', '#5aac44'], { lw: lw, line: 'rgba(24,48,120,.55)', amp: U * .012, fq: .02 }); });
  }

  // 1 · Horizont der Lichtung: ferner Urwald, der See als goldener Spiegel der Sonne, davor beginnt die Wiese
  function sceneMid(S) {
    var w = S.w, cx = w / 2, vy = S.vy, bot = S.fh, lw = LW0 * .8, yH = vy + H * .385, ySh = vy + H * .427, p1 = R() * 6, list = [], px, k;
    function shore(q) { return ySh + Math.sin(q * .008 + p1) * U * .005; }
    for (px = -U * .1; px < w + U * .1; px += U * rr(.03, .06)) {
      k = clamp((Math.abs(px - cx) / (w / 2) - (mob ? .3 : .2)) / .55, 0, 1); if (k <= 0) continue;
      list.push([px, U * (.015 + .2 * k * k) * rr(.35, 1), U * rr(.026, .05) * (.6 + k)]);
    }
    list.sort(function (a, b) { return b[1] - a[1]; });
    S.add(yH - U * .36, yH + 4, function (x) {
      list.forEach(function (c) {
        var py = yH - c[1];
        if (c[1] > c[2] * 1.2) { x.beginPath(); x.moveTo(c[0], py); x.quadraticCurveTo(c[0] + rr(-4, 4), (py + yH) / 2, c[0] + rr(-3, 3), yH + 2); ol(x, lw * 2.6, INK); ol(x, lw * 1.1, '#7a5a9a'); }
        crown(x, c[0], py, c[2], zoneAt(c[0] * 2.2, yH * 1.3), lw);
      });
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(150,205,240,.22)'; x.fillRect(-20, yH - U * .4, w + 40, U * .46);   // Dunst der Ferne
    });
    S.add(yH - 4, ySh + U * .06, function (x) {
      var g = x.createLinearGradient(0, yH, 0, ySh), hgt = ySh - yH, i;
      g.addColorStop(0, '#1a8a96'); g.addColorStop(1, '#0f6078');
      x.fillStyle = g; x.fillRect(-14, yH, w + 28, hgt + U * .04);
      x.save(); x.beginPath(); x.rect(-14, yH, w + 28, hgt + U * .04); x.clip();
      flow(x, -30, w + 30, yH + U * .008, ySh + U * .02, { n: mob ? 9 : 13, th: U * .011, amp: U * .004, pal: ['#1fa39a', '#2bb6a0', '#3f8fd0', '#7fe0d0', '#178a88', '#4a78d0'], edge: '#0a3f5a', inner: '#c8f6ee', lw: lw * .5, fq: 1.4 });
      for (i = 0; i < 3; i++) flow(x, cx - U * (.09 + i * .1), cx + U * (.09 + i * .1), yH + hgt * i / 3 + U * .004, yH + hgt * (i + 1) / 3 + U * .008, { n: 2 + i, th: U * .012, amp: U * .003, pal: P_GOLD, edge: '#fff2a8', inner: '#fff8cc', lw: lw * .5, fq: 1.6 });
      x.restore();
      x.beginPath(); x.moveTo(-14, yH); x.lineTo(w + 14, yH); ol(x, lw, '#0a3f5a');
    });
    S.add(ySh - U * .03, bot + 4, function (x) {
      var q, g = x.createLinearGradient(0, ySh, 0, vy + H * .66);
      g.addColorStop(0, '#eef9b4'); g.addColorStop(1, '#c9ec84');
      x.beginPath(); x.moveTo(-14, bot + 14); for (q = -14; q <= w + 14; q += 10) x.lineTo(q, shore(q)); x.lineTo(w + 14, bot + 14); x.closePath();
      x.fillStyle = g; x.fill(); ol(x, lw, 'rgba(40,120,80,.6)'); x.clip();
      flow(x, -30, w + 30, ySh + U * .012, vy + H * .68, { n: mob ? 12 : 18, th: U * .012, grow: 1.8, amp: U * .006, pow: 1.3, pal: ['#f4fbc0', '#e2f4a0', '#d6f08e', '#c9ec84'], plain: 1 });
    });
    if (!mob) {   // Computer: eine zweite Reihe Urwald weiter hinten (Tiefe); auf dem Handy braucht der Text die Breite
      var HW1 = W * .232, yT1 = S.Y(.7, 1), q1 = R() * 6, q2 = R() * 6,
          sh = function (y) { var t = clamp((y - yT1) / (U * .7), 0, 1); return t * t * (3 - 2 * t); },
          eL1 = function (y) { return -14 + (cx - HW1 + 14) * sh(y) + (Math.sin(y * .005 + q1) * .03 + Math.sin(y * .016 + q2) * .012) * U * sh(y); },
          eR1 = function (y) { return w + 14 - (cx - HW1 + 14) * sh(y) - (Math.sin(y * .0046 + q2) * .03 + Math.sin(y * .018 + q1) * .012) * U * sh(y); },
          end = function () { return bot; };
      jungle(S, yT1, bot, eL1, eR1, { ground: '#1c2158', size: .5, dens: 1.15, lwk: .8, cell: .05, lianas: [{ x0: 2, x1: cx - HW1 - U * .06, yEnd: end }, { x0: cx + HW1 + U * .06, x1: w - 2, yEnd: end }] });
      S.add(yT1, bot + 4, function (x) {
        var q; x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(140,195,238,.2)';
        x.beginPath(); x.moveTo(-14, yT1); for (q = yT1; q <= bot + 4; q += 12) x.lineTo(eL1(q), q); x.lineTo(-14, bot + 4); x.closePath();
        x.moveTo(w + 14, yT1); for (q = yT1; q <= bot + 4; q += 12) x.lineTo(eR1(q), q); x.lineTo(w + 14, bot + 4); x.closePath(); x.fill();
      });
    }
  }

  // dichter Urwald links von eL(y) und rechts von eR(y): dunkler Grund mit Mäanderbändern, lange Lianen, darüber Pflanzen
  // dicht an dicht. Am Rand wachsen Wedel in die Öffnung, oben (o.topFn) schliessen Kronen ab: nirgends eine gerade Kante.
  var KINDS = [0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 5, 6, 7, 7, 8, 8, 9], SIZES = [.55, .7, .7, .85, .85, 1, 1, 1.2, 1.5];
  function jungle(S, y0, y1, eL, eR, o) {
    var w = S.w, s = U * (o.cell || .06), ph = s * 14, lw = LW0 * (o.lwk || 1), u = U * (o.size || 1), top = o.topFn, ys = y0 - (top ? s * 2 : 0), y, i, px, py, list = [], n;
    function inJ(qx, qy) { return (!top || qy > top(qx)) && (qx < eL(qy) || qx > eR(qy)); }
    for (y = ys; y < y1; y += ph) (function (ya, yb, first) {
      S.add(ya - s, yb + s, function (x) {
        var q;
        x.beginPath();
        if (first && top) { x.moveTo(-14, yb + 1); for (q = -14; q <= w + 14; q += 8) x.lineTo(q, top(q)); x.lineTo(w + 14, yb + 1); x.closePath(); }
        else {
          x.moveTo(-14, ya); for (q = ya; q <= yb + 1; q += 8) x.lineTo(eL(q), q); x.lineTo(eL(yb + 1), yb + 1); x.lineTo(-14, yb + 1); x.closePath();
          x.moveTo(w + 14, ya); for (q = ya; q <= yb + 1; q += 8) x.lineTo(eR(q), q); x.lineTo(eR(yb + 1), yb + 1); x.lineTo(w + 14, yb + 1); x.closePath();
        }
        x.fillStyle = o.ground; x.fill();
        pipes(x, -14, ya, w + 14, yb, s, null, { lw: lw * .8, line: INK, fill: .6, vert: .74, len: 10, acc: P_ACC, dark: .18, palAt: zoneAt,
          test: function (qx, qy) { return (!top || qy > top(qx) + s * .5) && (qx < eL(qy) - s * .4 || qx > eR(qy) + s * .4); } });
      });
    })(y, Math.min(y1, y + ph), y === ys);
    (o.lianas || []).forEach(function (rg) {
      for (px = rg.x0 + u * rr(.03, .1); px < rg.x1; px += u * rr(.1, .22)) (function (px, yb, th, col) {
        var ya = top ? top(px) + 2 : y0;
        if (yb - ya < u * .3) return;
        S.add(ya, yb + th * 4, function (x) { liana(x, px, ya, yb, th, col, lw, { step: u * .22, x0: Math.max(rg.x0, px - u * .12), x1: Math.min(rg.x1, px + u * .12), inner: R() < .5 ? mix(col, '#ffffff', .4) : 0, bead: rg.bead ? pick(P_ACC) : 0 }); });
      })(px, rg.yEnd(px), U * rr(.012, .026), pick(P_LIANA));
    });
    n = Math.round((w + 20) * (y1 - y0) / (u * u * .085) * (o.dens || 1));
    var cz = o.calm, qz = [R() * 6, R() * 6], sz, dq;
    function calm(qy) { return cz && qy > cz[0] && qy < cz[1]; }   // neben dem Text bleiben die Pflanzen klein, damit er frei steht
    for (i = 0; i < n; i++) {
      px = rr(-10, w + 10); py = rr(y0, y1); if (!inJ(px, py)) continue;
      if (R() > .62 + .38 * Math.sin(px / u * 1.7 + qz[0]) * Math.sin(py / u * 1.3 + qz[1]) + .3) continue;   // Dichte in Flecken: dazwischen bleiben die Mäanderbänder sichtbar
      sz = pick(SIZES);
      if (calm(py)) { dq = Math.min(Math.abs(px - eL(py)), Math.abs(px - eR(py))); sz = Math.min(sz, cz[2] + dq / (u * .9)); }
      list.push([px, py, pick(KINDS), sz]);
    }
    list.sort(function (a, b) { return a[1] - b[1]; });
    list.forEach(function (p) { plant(S, p[0], p[1], p[2], lw, u * p[3]); });
    var ne = 0;
    for (y = y0; y < y1; y += u * rr(.14, .26) * (calm(y) ? cz[2] * 1.5 : 1)) [0, 1].forEach(function (sd) {
      var e = sd ? eR : eL, ex = e(y), d = (e(y + 6) - e(y - 6)) / 12, a, c = calm(y);
      if (ex < -10 || ex > w + 10 || eR(y) - eL(y) < 6) return;
      a = (sd ? Math.atan2(d, -1) : Math.atan2(-d, 1)) + (sd ? 1 : -1) * (c ? .95 : .45) / (1 + d * d * 4);
      plant(S, ex + (sd ? 1 : -1) * u * .04, y, R() < .7 ? 9 : R() < .5 ? 3 : 4, lw, u * pick([.7, .85, 1, 1.2]) * (c ? cz[2] : 1), a,
        !!(o.sway && AK.sway && y > o.sway[0] && ne++ % o.sway[1] === 0));   // im Schlussbild wiegt sich ein Teil der Randpflanzen
    });
    if (top) for (px = -u * .1; px < w + u * .1; px += u * rr(.18, .3)) plant(S, px, top(px) + u * rr(-.05, .12), pick([0, 0, 2, 9, 7]), lw, u * rr(1.1, 1.7), -Math.PI / 2);
  }
  function plant(S, px, py, k, lw, u, dirA, sway) {
    var fn = function (x) {
      var z = zc(px, py), z2 = R() < .3 ? zc(px + u, py) : z, i, c;
      if (k === 0) frond(x, { x: px, y: py + u * .15, a: -Math.PI / 2 + rr(-.5, .5), spread: rr(1.7, 2.9), n: 7 + Math.floor(R() * 6), len: u * rr(.3, .56), wid: u * rr(.036, .06), droop: rr(.3, .7), cols: z, lw: lw, rib: R() < .3 ? 1 : 0 });
      else if (k === 1) frond(x, { x: px, y: py - u * .2, a: Math.PI / 2 + rr(-.4, .4), spread: rr(1.2, 2.2), n: 6 + Math.floor(R() * 5), len: u * rr(.3, .5), wid: u * rr(.036, .06), droop: -rr(.15, .45), cols: z, lw: lw, rib: 0 });
      else if (k === 2) { frond(x, { x: px, y: py, a: R() * 6, spread: Math.PI * 1.86, n: 11 + Math.floor(R() * 6), len: u * rr(.2, .36), wid: u * rr(.028, .04), droop: 0, cols: z, lw: lw, rib: 0, even: 1 }); disc(x, px, py, u * .05, [pick(P_ACC), pick(z2), INK], lw); }
      else if (k === 3) bloom(x, px, py, u * rr(.13, .24), pick(R() < .6 ? Z_MAG : P_FLOWER), lw);
      else if (k === 4) flowerB(x, px, py, u * rr(.07, .13), pick(P_FLOWER), lw);
      else if (k === 5) fern(x, { x: px, y: py + u * .3, len: u * rr(.3, .5), col: pick(z), dir: R() < .5 ? 1 : -1, lw: lw * .8 });
      else if (k === 6) scaleBush(x, px, py + u * .2, u * rr(.3, .5), u * rr(.22, .36), [pick(z), pick(z), pick(z2)], lw);
      else if (k === 7) for (i = 0, c = 2 + Math.floor(R() * 3); i < c; i++) bigLeaf(x, px, py + u * .25, -Math.PI / 2 + (i - (c - 1) / 2) * rr(.45, .8), u * rr(.34, .56), u * rr(.07, .1), (i - (c - 1) / 2) * .22, pick(z), lw);
      else if (k === 8) { if (R() < .5) disc(x, px, py, u * rr(.05, .09), [pick(z), pick(P_ACC), pick(z2), INK], lw); else pearls(x, px, py - u * .2, u * rr(.25, .45), u * .016, pick(P_ACC), lw, rr(-.25, .25)); }
      else frond(x, { x: px, y: py, a: dirA == null ? R() * 6 : dirA + rr(-.3, .3), spread: rr(1.1, 1.9), n: 6 + Math.floor(R() * 5), len: u * rr(.3, .56), wid: u * rr(.036, .06), droop: rr(.25, .6), cols: z, lw: lw, rib: R() < .35 ? 1 : 0 });
    };
    if (sway) S.sway(px, py, u * .7, 0, fn); else S.add(py - u * .9, py + u * .9, fn);
  }

  // 2 · Urwald und Lichtung: oben schliesst sich das Blätterdach, darunter öffnet es sich im Bogen zur hellen Wiese
  function sceneMain(S) {
    var w = S.w, cx = w / 2, vy = S.vy, bot = S.fh, lw = LW0, HW = mob ? W * .478 : W * .3, yC = S.Y(.58, 1), yA = vy - H * .42, yB = vy + H * (mob ? .085 : .02),
        p1 = R() * 6, p2 = R() * 6, p3 = R() * 6, p4 = R() * 6, i, end = function () { return bot; };
    // Öffnung der Lichtung: oben ein spitzer Bogen, in der Texthöhe breit (Handy: fast die ganze Breite), unten wächst das Unterholz wieder herein
    function hw(y) {
      if (y <= yA) return 0;
      var t = clamp((y - yA) / (yB - yA), 0, 1), f = clamp((y - (vy + H * .845)) / (H * .24), 0, 1);
      return Math.max(0, HW * Math.pow(t, 1.5) - Math.pow(f, 1.2) * W * (mob ? .34 : .17));
    }
    function eL(y) { var h = hw(y), k = Math.min(1, h / (U * .25)); return cx - h - (Math.sin(y * .006 + p1) * .03 + Math.sin(y * .017 + p2) * .012) * U * k; }
    function eR(y) { var h = hw(y), k = Math.min(1, h / (U * .25)); return cx + h + (Math.sin(y * .0052 + p2) * .03 + Math.sin(y * .019 + p1) * .012) * U * k; }
    function archY(px) { var d = Math.abs(px - cx) / HW; return d >= 1 ? bot : yA + Math.pow(d, 1 / 1.5) * (yB - yA); }
    function topFn(px) { return yC + (Math.sin(px * .011 + p3) * .05 + Math.sin(px * .027 + p4) * .025) * U; }
    function yN(px) { return vy + H * .565 + Math.cos((px - cx) / w * Math.PI * 2) * U * .018 + Math.sin(px * .011 + p3) * U * .01; }
    // nahe Wiese: helle fliessende Bänder, in der Mitte ruhig (dort steht der Text)
    S.add(vy + H * .5, bot + 4, function (x) {
      var px, py, k, t, s, g = x.createLinearGradient(0, vy + H * .565, 0, bot);
      g.addColorStop(0, '#c6ea80'); g.addColorStop(.5, '#b0e170'); g.addColorStop(1, '#93d463');
      x.beginPath(); x.moveTo(-14, bot + 14); for (px = -14; px <= w + 14; px += 10) x.lineTo(px, yN(px)); x.lineTo(w + 14, bot + 14); x.closePath();
      x.fillStyle = g; x.fill(); ol(x, lw * .7, 'rgba(60,150,80,.34)'); x.clip();
      flow(x, -30, w + 30, vy + H * .6, bot + U * .05, { n: mob ? 14 : 22, th: U * .03, grow: 1.5, amp: U * .012, pow: 1.25, pal: ['#d2ee8a', '#c4e87a', '#b8e272', '#a8dc6a', '#bfe676'], plain: 1 });
      flow(x, -30, w + 30, vy + H * .62, bot + U * .05, { n: mob ? 7 : 11, th: U * .004, grow: 1, amp: U * .012, pow: 1.2, pal: ['rgba(250,255,214,.7)', 'rgba(70,160,80,.3)'], plain: 1 });
      for (k = 0; k < (mob ? 26 : 60); k++) {
        px = rr(0, w); py = rr(vy + H * .62, bot); t = (py - vy - H * .56) / (bot - vy - H * .56); s = U * (.012 + .03 * t);
        if (py < vy + H * .84 && Math.abs(px - cx) < HW * (mob ? .94 : .62) && (mob || R() < .82)) continue;   // in der Texthöhe bleibt die Mitte frei
        if (R() < .45) flowerB(x, px, py, s, pick(P_FLOWER), lw * .6);
        else frond(x, { x: px, y: py, a: -Math.PI / 2, spread: 1.5, n: 5, len: s * 2.4, wid: s * .34, droop: .3, cols: ['#4fae3f', '#2f9a4a', '#6fbf3a'], lw: lw * .6, rib: 0 });
      }
    });
    jungle(S, yC, bot, eL, eR, { ground: '#161a48', size: mob ? .7 : .82, dens: 1.1, topFn: topFn, calm: [vy - H * .03, vy + H * .86, mob ? .28 : .75], sway: [vy - H * .06, mob ? 3 : 1],
      lianas: [{ x0: 2, x1: cx - HW - U * .05, yEnd: end }, { x0: cx + HW + U * .05, x1: w - 2, yEnd: end },
        { x0: cx - HW * .92, x1: cx + HW * .92, yEnd: function (px) { return Math.min(archY(px) + U * rr(.02, .16), vy + H * .04); }, bead: 1 }] });
    // Ranken hängen vom Bogen in die Lichtung
    for (i = 0; i < (mob ? 5 : 9); i++) (function (px) {
      var y0 = archY(px) - U * .03, len = Math.min(U * rr(.25, .7), vy + H * .06 - y0), fn;
      if (len < U * .1) return;
      fn = function (x) { vine(x, px, y0, len, pick(Z_GREEN), lw * .9, P_ACC); };
      if (AK.sway && y0 + len > vy - H * .1) S.sway(px, y0, len / 2 + 22, 1, fn); else S.add(y0 - 4, y0 + len + 20, fn);
    })(cx + rr(-.9, .9) * HW);
  }

  // einzelnes Teil mit eigener Tiefe (Wolke, vorbeiziehendes Blatt): liegt beim Fortschritt ci am Bildschirm bei fr
  function flyer(wd, hd, f, ci, xc, fr, fn, vx) {
    var c = canvas(wd, hd, f > 1.9 ? 1 : QF); fn(c.x, wd, hd);
    c.c.className = 'ak-sprite'; c.c.style.width = wd + 'px'; c.c.style.height = hd + 'px'; c.c.style.visibility = 'hidden';
    fliers.push({ el: c.c, x: xc - wd / 2, y: -ci * camRef * f + fr * H - hd / 2, f: f, w: wd, h: hd, on: 0, vx: vx || 0 });
    world.appendChild(c.c);
  }
  function skyClouds(defs) {   // [Fortschritt, x, Höhe am Bildschirm, Grösse, Tiefe]
    defs.forEach(function (d) {
      var s = U * d[3], cw = s * 6, chh = s * 2, vx = (R() < .5 ? -1 : 1) * rr(3, 7) * (.5 + d[4] * .5) / 1000;   // die Wolken ziehen langsam
      flyer(cw, chh, d[4], d[0], d[1] * W, d[2], function (x) { swirlCloud(x, cw / 2, chh * .86, s, cloudLook(s)); }, vx);
    });
  }
  function flyLeaves() {   // grosse Wedel ziehen kurz vor der Landung dicht an der Kamera vorbei
    [[.3, 0, .5, 2.1], [.25, 1, .4, 2.4], [.18, 0, .6, 2], [.13, 1, .5, 2.6], [.08, 0, .35, 2.2]].forEach(function (d) {
      var s = U * rr(.9, 1.3), z = pick([Z_PURP, Z_TEAL, Z_GREEN, Z_MAG, Z_BLUE]);
      flyer(s, s, d[3], d[0], d[1] ? W - s * .1 : s * .1, d[2], function (x, w, h) {
        frond(x, { x: d[1] ? w * .97 : w * .03, y: h * .5, a: d[1] ? Math.PI : 0, spread: 2.2, n: 9, len: w * .8, wid: w * .05, droop: .3, cols: z, lw: LW0 * 1.6, rib: 1 });
      });
    });
  }

  function paintScene(fly) {
    R = rng(AK.seed);
    W = root.clientWidth; H = root.clientHeight; mob = W < 768;
    U = clamp(Math.min(W, H * .62), 300, 620); LW0 = Math.max(1.5, U * .0056);
    ZP = [R() * 6, R() * 6, R() * 6];
    XR = AK.freePan ? W * (mob ? AK.panX[0] : AK.panX[1]) : 0;
    camRef = Math.round(H * AK.flightH); camT = camRef; cam = tgY = fly ? camT : 0; camX = tgX = 0;   // immer das ganze Bild: man kann von Hand wieder nach oben
    if (world) world.remove();
    world = document.createElement('div'); world.className = 'ak-world'; world.setAttribute('aria-hidden', 'true');
    root.insertBefore(world, root.firstChild);
    sprites = []; fliers = []; sways = [];
    var q = W > 1100 ? Math.min(DPR, 1.5) : DPR; QF = Math.min(DPR, W > 1100 ? 1.25 : 1.5);   // grosse Bildschirme etwas weniger scharf (Speicher)
    var S0 = strip(0, .14, q, q), S1 = strip(1, .5, q, QF), S2 = strip(2, 1, q, QF);
    strips = [S0, S1, S2];
    sceneFar(S0); sceneMid(S1); sceneMain(S2);
    S0.build(); world.appendChild(S0.el);
    R = rng(AK.seed + 3);
    skyClouds([[1, .2, .3, .07, .25], [.97, .84, .5, .09, .3], [.9, .5, .2, .08, .36], [.84, .14, .62, .1, .4], [.78, .8, .35, .09, .45], [.7, .4, .55, .1, .42],
      [0, .14, .1, .05, .2], [0, .86, .2, .06, .26], [0, .5, .045, .042, .22]]);   // ferne Wolken; die letzten drei stehen im Schlussbild am Himmel
    S1.build(); world.appendChild(S1.el);
    R = rng(AK.seed + 4);
    skyClouds([[.99, .72, .2, .14, .6], [.93, .25, .75, .16, .7], [.86, .85, .5, .15, .8], [.8, .3, .3, .18, .9], [.73, .7, .7, .16, .75], [.67, .2, .5, .2, .95]]);   // mittlere Wolken
    S2.build(); world.appendChild(S2.el);
    R = rng(AK.seed + 5);
    skyClouds([[.97, .1, .9, .22, 1.3], [.9, .9, .6, .26, 1.6], [.85, .3, .5, .3, 1.9], [.79, .75, .4, .24, 1.25], [.74, .1, .6, .3, 1.7], [.69, .6, .5, .26, 1.45], [.65, .9, .4, .22, 1.2]]);   // nahe Wolken rauschen vorbei

    // Glanz der Sonne über dem See (liegt vor den vorderen Ebenen, bleibt aber bei der Sonne)
    var gc = document.createElement('canvas'), gx, gg, gsx = W * SUN[0], gsy = H * SUN[1];
    gc.width = Math.round(W / 2); gc.height = Math.round(H / 2); gx = gc.getContext('2d'); gx.scale(.5, .5);
    gg = gx.createRadialGradient(gsx, gsy, 0, gsx, gsy, H * .34); gg.addColorStop(0, 'rgba(255,248,222,.1)'); gg.addColorStop(.16, 'rgba(255,246,216,.34)'); gg.addColorStop(.45, 'rgba(255,244,214,.14)'); gg.addColorStop(1, 'rgba(255,244,214,0)');
    gx.fillStyle = gg; gx.fillRect(0, 0, W, H);
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
    var Zs = mob ? W * .82 : Math.min(W * .5, H * .95), lw = LW0 * 1.25;
    sprite(Zs * .62, Zs * .62, 0, 0, [-W * (mob ? .2 : .04), -H * (mob ? .08 : .03)], function (x, w, h) {
      frond(x, { x: w * .04, y: h * .04, a: mob ? 1.25 : .8, spread: mob ? 1 : 1.5, n: 8, len: w * .84, wid: w * .05, droop: .25, cols: Z_PURP.concat(Z_BLUE), lw: lw, rib: 1 });
      bloom(x, w * .27, h * .2, w * .1, '#d0379a', lw);
    });
    sprite(Zs * .6, Zs * .55, 1, 0, [W * (mob ? 1.12 : 1.04), -H * (mob ? .06 : .02)], function (x, w, h) {
      frond(x, { x: w * .97, y: h * .05, a: Math.PI * .74, spread: 1.1, n: 7, len: w * .82, wid: w * .05, droop: -.2, cols: Z_TEAL.concat(Z_GREEN), lw: lw, rib: 1 });
    });
    sprite(Zs * .55, Zs * .8, 0, 1, [-W * .05, H * 1.03], function (x, w, h) {
      for (var i = 0; i < 3; i++) bigLeaf(x, w * .05 + i * w * .08, h, -Math.PI / 2 + rr(.15, .7), h * rr(.66, .9), w * .11, rr(.12, .28), pick(Z_GREEN.concat(Z_TEAL)), lw);
      fern(x, { x: w * .42, y: h, len: h * .36, col: '#8fc93a', dir: -1, lw: lw });
    });
    sprite(Zs * .58, Zs * .6, 1, 1, [W * 1.05, H * 1.03], function (x, w, h) {
      frond(x, { x: w * .95, y: h, a: -Math.PI / 2 - .55, spread: 1.7, n: 9, len: h * .8, wid: w * .045, droop: .3, cols: Z_MAG.concat(Z_PURP), lw: lw, rib: 1 });
      flowerB(x, w * .46, h * .7, w * .08, '#f07a2a', lw);
    });
    sprites.forEach(function (s) { world.appendChild(s.sh); });

    // Sonnenstrahlen: von der Sonne über die Lichtung. Jeder Strahl wird einmal gemalt (weich zu den Seiten, Prisma als Saum),
    // verteilt auf zwei Bilder, die gegeneinander atmen
    rays = document.createElement('div'); rays.className = 'ak-rays';
    var rw = W * 1.3, rh = H * 1.25, rc = [canvas(rw, rh, .5), canvas(rw, rh, .5)], r, g;
    for (r = 0; r < 7; r++) {
      var wv = rr(.05, .13) * Math.max(W, 500), len = H * .9, ang = (-60 + r * 20 + rr(-5, 5)) * Math.PI / 180, tc = canvas(wv, len, .5), tx = tc.x, X = rc[r % 2].x;
      g = tx.createLinearGradient(0, 0, 0, len); g.addColorStop(0, 'rgba(255,251,238,0)'); g.addColorStop(.1, 'rgba(255,251,238,.9)'); g.addColorStop(.38, 'rgba(255,248,232,.5)'); g.addColorStop(.88, 'rgba(255,246,236,0)');
      tx.fillStyle = g; tx.fillRect(0, 0, wv, len);
      g = tx.createLinearGradient(0, 0, 0, len); g.addColorStop(0, 'rgba(150,220,245,0)'); g.addColorStop(.1, 'rgba(150,220,245,.55)'); g.addColorStop(.5, 'rgba(195,178,250,.2)'); g.addColorStop(.85, 'rgba(195,178,250,0)');
      tx.fillStyle = g; tx.fillRect(wv * .22, 0, wv * .14, len);
      g = tx.createLinearGradient(0, 0, 0, len); g.addColorStop(0, 'rgba(248,190,215,0)'); g.addColorStop(.1, 'rgba(248,190,215,.55)'); g.addColorStop(.5, 'rgba(250,228,180,.2)'); g.addColorStop(.85, 'rgba(250,228,180,0)');
      tx.fillStyle = g; tx.fillRect(wv * .64, 0, wv * .14, len);
      tx.globalCompositeOperation = 'destination-in';
      g = tx.createLinearGradient(0, 0, wv, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.38, '#000'); g.addColorStop(.62, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
      tx.fillStyle = g; tx.fillRect(0, 0, wv, len);
      X.save(); X.translate(gsx + W * .15, gsy); X.rotate(ang); X.globalAlpha = rr(.14, .3); X.drawImage(tc.c, -wv / 2, 0, wv, len); X.restore();
    }
    rc.forEach(function (c, i) {
      c.c.style.cssText = 'width:' + rw + 'px;height:' + rh + 'px;left:' + (-W * .15) + 'px;' + (reduce ? '' : 'animation:' + (i ? 'akRayB 9s' : 'akRayA 7s') + ' ease-in-out infinite;');
      rays.appendChild(c.c);
    });
    world.appendChild(rays);
    // Lichtflecken auf der Wiese: ein Bild, das langsam wandert
    dapple = document.createElement('div'); dapple.className = 'ak-dapple';
    var dc = canvas(W, H, .5);
    for (var d = 0; d < 9; d++) {
      var sz = rr(.12, .3) * Math.min(W, H), dx0 = rr(.1, .9) * W, dy0 = rr(.3, .95) * H;
      dc.x.save(); dc.x.translate(dx0, dy0); dc.x.scale(1, rr(.5, .8));
      g = dc.x.createRadialGradient(0, 0, 0, 0, 0, sz / 2); g.addColorStop(0, 'rgba(255,250,235,.3)'); g.addColorStop(1, 'rgba(255,250,235,0)');
      dc.x.fillStyle = g; dc.x.fillRect(-sz / 2, -sz / 2, sz, sz); dc.x.restore();
    }
    dc.c.style.cssText = 'width:' + W + 'px;height:' + H + 'px;' + (reduce ? '' : 'animation:akSpot 13s ease-in-out infinite;');
    dapple.appendChild(dc.c); world.appendChild(dapple);
    sprites.forEach(function (s) { world.appendChild(s.el); });
    flyLeaves();

    // Glühwürmchen, Glitzer, Fahrtwind
    var fxc = canvas(W, H, Math.min(DPR, 1.5)); fxC = fxc.c; fxX = fxc.x; fxC.className = 'ak-fx'; world.appendChild(fxC);
    // Linsen-Glanz und Perlmutt-Schimmer (erst unten in der Lichtung)
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
    else { var a = (-60 + P() * 120) * Math.PI / 180, dist = P() * H * .7; x = W * SUN[0] + Math.sin(a) * dist; y = H * SUN[1] + Math.cos(a) * dist; }   // im Licht der Strahlen
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
  }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- Takt ----------
  var ptr = { x: 0, y: 0, tx: 0, ty: 0 }, pan = 0, run = false, raf = 0, tBoot = 0, lastT = 0, shown = false, flown = false, fl = null, cover = null, litOn = null, fxClean = 0, wind = [],
      drag = null, dragged = 0, tgY = 0, tgX = 0, camX = 0, XR = 0, sways = [];
  root.addEventListener('pointermove', function (e) {   // Maus bewegt die Ebenen leicht (am Handy macht das der Finger beim Verschieben)
    if (!AK.pointer || e.pointerType !== 'mouse' || drag) return;
    ptr.tx = (e.clientX / W - .5) * 2; ptr.ty = (e.clientY / H - .5) * 2;
  }, { passive: true });
  root.addEventListener('pointerleave', function () { ptr.tx = ptr.ty = 0; });

  // Kamera von Hand (Hugo 27.11., 11:02): ausserhalb des Rads lässt sich die ganze Szene gemütlich verschieben – seitlich in den
  // Urwald und wieder nach oben bis in den Himmel. Das Rad scrollt weiter die Services, mit Parallax dort, wo die Kamera gerade steht.
  function inWheel(e) { return e.target && e.target.closest && e.target.closest('[data-ak-wheel]'); }
  root.addEventListener('pointerdown', function (e) {
    if (fl) { fl.rate = 9; return; }   // Antippen während des Flugs: schnell zu Ende fliegen
    if (!AK.freePan || !shown || e.button > 0 || inWheel(e)) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: tgX, cy: tgY, on: 0, px: e.clientX, py: e.clientY, pt: e.timeStamp, vx: 0, vy: 0 };
  }, true);
  window.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var mx = e.clientX - drag.x, my = e.clientY - drag.y, d = Math.max(1, e.timeStamp - drag.pt);
    if (!drag.on) {
      if (Math.abs(mx) + Math.abs(my) < 8) return;
      drag.on = 1; root.classList.add('ak-drag'); ptr.tx = ptr.ty = 0;
      try { window.getSelection().removeAllRanges(); } catch (er) {}
    }
    drag.vx = drag.vx * .6 + (e.clientX - drag.px) / d * .4; drag.vy = drag.vy * .6 + (e.clientY - drag.py) / d * .4; drag.px = e.clientX; drag.py = e.clientY; drag.pt = e.timeStamp;
    tgX = clamp(drag.cx - mx * 1.2, -XR, XR); tgY = clamp(drag.cy + my * 1.7, 0, camT);   // das Bild folgt dem Finger: nach unten ziehen = zurück nach oben
  }, { passive: true });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.on) {   // beim Loslassen gleitet die Kamera noch ein Stück weiter
      if (e.type === 'pointerup' && e.timeStamp - drag.pt < 90) { tgX = clamp(tgX - drag.vx * 260, -XR, XR); tgY = clamp(tgY + drag.vy * 420, 0, camT); }
      dragged = 1; setTimeout(function () { dragged = 0; }, 80); root.classList.remove('ak-drag');
    }
    drag = null;
  }
  window.addEventListener('pointerup', endDrag); window.addEventListener('pointercancel', endDrag);
  root.addEventListener('click', function (e) { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = 0; } }, true);   // nach dem Ziehen löst kein Knopf aus
  root.addEventListener('wheel', function (e) {   // Mausrad und Trackpad ausserhalb des Rads
    if (!AK.freePan || fl || !shown || inWheel(e)) return;
    e.preventDefault();
    var k = e.deltaMode === 1 ? 32 : 1;
    tgY = clamp(tgY - e.deltaY * k * 1.1, 0, camT); tgX = clamp(tgX + e.deltaX * k, -XR, XR);
  }, { passive: false });

  // Der grosse Schwung: langsam los, schnell durch die Mitte, weich landen; ganz am Ende federt die Kamera einen Hauch nach
  function swing(u) {
    var a = AK.swingIn, b = AK.swingOut, s = a / (a + b), e = u < s ? .5 * Math.pow(u / s, a) : 1 - .5 * Math.pow((1 - u) / (1 - s), b),
        w = clamp((u - .8) / .2, 0, 1), k = Math.sin(Math.PI * w);
    return e + .011 * k * k;
  }
  function initWind() { var P = rng(AK.seed * 17); wind = []; for (var i = 0; i < 30; i++) wind.push([P() * W, P() * (H + 400), .9 + P() * 1.4, .25 + P() * .5]); }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var t = now - tBoot, dt = Math.min(64, now - lastT), vel = 0, i; lastT = now;
    if (fl) {
      var c0 = cam; fl.u = Math.min(1, fl.u + Math.min(64, now - fl.last) / fl.D * fl.rate); fl.last = now;
      cam = camT * (1 - swing(fl.u)); vel = cam - c0;
      if (!shown && fl.u >= .92) reveal();   // erst wenn die Kamera fast steht: Glas-Knöpfe über einem fahrenden Bild kosten das Handy viel
      if (fl.u >= 1) { fl = null; cam = tgY = 0; camX = tgX = 0; }
    } else if (AK.freePan) {   // von Hand: die Kamera zieht gemütlich nach
      var kk = 1 - Math.exp(-dt / 170);
      cam += (tgY - cam) * kk; camX += (tgX - camX) * kk;
      if (Math.abs(tgY - cam) < .05) cam = tgY;
      if (Math.abs(tgX - camX) < .05) camX = tgX;
    }
    var lit = !fl && shown && cam < H * .45;
    if (lit !== litOn && world) { litOn = lit; world.classList.toggle('ak-lit', lit); }
    var p = drawWheel();
    var pn = items.length > 1 ? p / (items.length - 1) - .5 : 0;
    pan += (pn - pan) * .06;
    ptr.x += (ptr.tx - ptr.x) * .06; ptr.y += (ptr.ty - ptr.y) * .06;
    var dr = reduce ? 0 : AK.drift * (mob ? 2.2 : 1.6);   // der Blick steht nie ganz still (Hugo 11:02), am Handy etwas mehr
    var dx = (Math.sin(t * .00011) * 10 + Math.sin(t * .00023 + 1) * 5) * dr - ptr.x * 18 * AK.pointer;
    var dy = (Math.sin(t * .00009 + 2) * 7 + Math.cos(t * .00019) * 4) * dr * .7 - ptr.y * 12 * AK.pointer;
    // ohne Flug: beim Einblenden sinkt die Kamera ein Stück ins Bild (leichter Zoom)
    var ip = flown || reduce || !shown ? (shown || flown ? 1 : 0) : clamp((now - tStart) / (AK.introMs * 1.6), 0, 1), ie = 1 - Math.pow(1 - ip, 3);
    for (i = 0; i < strips.length; i++) {
      var L = strips[i], z = 1 + (1 - ie) * .06 * L.d;
      L.el.style.transform = 'translate3d(' + (L.ox + dx * L.d - camX * L.f).toFixed(1) + 'px,' + (L.oy + cam * L.f + dy * L.d - pan * 2 * L.pan + (1 - ie) * 40 * L.d).toFixed(1) + 'px,0) scale(' + z.toFixed(4) + ')';
    }
    for (i = 0; i < fliers.length; i++) {
      var F = fliers[i], fy = F.y + cam * F.f, on = fy > -F.h && fy < H ? 1 : 0;
      if (on) {
        var fxp = F.x;
        if (F.vx) { var spn = W + F.w + XR * F.f * 2 + 40, off = F.w + XR * F.f + 20; fxp = ((F.x + off + t * F.vx) % spn + spn) % spn - off; }   // zieht langsam und kommt auf der anderen Seite wieder
        F.el.style.transform = 'translate3d(' + (fxp + dx * F.f * .6 - camX * F.f).toFixed(1) + 'px,' + fy.toFixed(1) + 'px,0)';
      }
      if (on !== F.on) { F.on = on; F.el.style.visibility = on ? 'visible' : 'hidden'; }
    }
    if (sways.length && !reduce && cam < H * 1.2) for (i = 0; i < sways.length; i++) {   // Wind im Urwald: Böen wandern quer durchs Bild
      var q = sways[i], g = .55 + .45 * Math.sin(t * .00023 + q.x * .004);
      q.el.style.transform = 'rotate(' + ((Math.sin(t * q.f + q.ph) + Math.sin(t * q.f * 2.7 + q.ph * 1.3) * .3) * q.amp * g).toFixed(2) + 'deg)';
    }
    for (i = 0; i < sprites.length; i++) {
      var S = sprites[i], rot = reduce ? 0 : Math.sin(t * S.f + S.ph) * S.amp + Math.sin(t * S.f * 2.3 + S.ph * 2) * S.amp * .35;
      var sx = S.x + dx * 1.35 - camX * 1.5, sy = S.y + cam * 1.5 + dy * 1.35 - pan * 2 * PANS[3] * H * AK.scrollPan * 1.3 + (1 - ie) * 90;
      var piv = 'translate(' + (S.w * S.ax) + 'px,' + (S.h * S.ay) + 'px) rotate(', back = ' translate(' + (-S.w * S.ax) + 'px,' + (-S.h * S.ay) + 'px)';
      S.el.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0) ' + piv + rot.toFixed(2) + 'deg)' + back;
      // Schatten: die Sonne steht hinten in der Mitte, also fällt er nach vorn und etwas nach aussen
      S.sh.style.transform = 'translate3d(' + (sx + (S.ax ? 1 : -1) * W * .02 - dx * .4).toFixed(1) + 'px,' + (sy + H * .028 - dy * .4).toFixed(1) + 'px,0) ' + piv + (rot * 1.3).toFixed(2) + 'deg) scale(1.04)' + back;
    }
    // Glanz und Strahlen bleiben bei der Sonne, die Lichtflecken auf der Wiese
    var L0 = strips[0], sdx = L0 ? dx * L0.d - camX * L0.f : 0, sdy = L0 ? cam * L0.f + dy * L0.d - pan * 2 * L0.pan : 0, sunT = 'translate3d(' + sdx.toFixed(1) + 'px,' + sdy.toFixed(1) + 'px,0)';
    if (glow) glow.style.transform = sunT;
    if (rays) rays.style.transform = sunT;
    if (dapple) dapple.style.transform = 'translate3d(' + (-camX).toFixed(1) + 'px,' + cam.toFixed(1) + 'px,0)';
    if (lit && flare) {
      var fx0 = W * SUN[0] + sdx, fy0 = H * SUN[1] + sdy, fcx = W * .28 - dx * 1.2, fcy = H * .88 - dy * 1.2;
      for (i = 0; i < flare.children.length; i++) {
        var c = flare.children[i], tt = c._t;
        c.style.transform = 'translate3d(' + (fx0 + (fcx - fx0) * tt * 1.4).toFixed(1) + 'px,' + (fy0 + (fcy - fy0) * tt * 1.4).toFixed(1) + 'px,0)';
      }
    }
    if (lit && sheen) sheen.style.transform = 'translate3d(' + (Math.sin(t * .00007) * W * .12 + dx * 2).toFixed(1) + 'px,' + (pan * -H * .1 + dy).toFixed(1) + 'px,0)';
    drawFx(now, vel);
  }

  function drawFx(now, vel) {
    if (!fxX) return;
    var t = now - tStart, i, sp = Math.abs(vel), near = shown && cam < H * 1.25; nowT = t;
    if (sp <= 1.5 && !near) { if (!fxClean) { fxX.clearRect(0, 0, W, H); fxClean = 1; } return; }   // weit oben und ohne Fahrtwind gibt es nichts zu malen
    fxClean = 0;
    fxX.clearRect(0, 0, W, H);
    fxX.globalCompositeOperation = 'lighter';
    if (sp > 1.5) {   // Fahrtwind: helle Striche, je schneller desto länger
      var wa = clamp((sp - 1.5) / 20, 0, 1), span = H + 400;
      fxX.lineCap = 'round'; fxX.strokeStyle = '#ffffff';
      for (i = 0; i < wind.length; i++) {
        var q = wind[i], y = ((q[1] + cam * q[2]) % span + span) % span - 200, len = clamp(sp * q[2] * 2.4, 3, 180);
        fxX.globalAlpha = wa * q[3]; fxX.lineWidth = 1 + q[2] * .8; fxX.beginPath(); fxX.moveTo(q[0], y); fxX.lineTo(q[0], y + len); fxX.stroke();
      }
    }
    if (near) {   // Glühwürmchen und Glitzer wohnen in der Lichtung und bleiben dort, wenn die Kamera wandert
      fxX.save(); fxX.translate(-camX * 1.1, cam * 1.1);
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
      fxX.restore();
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
    for (i = 0; i < kids.length; i++) kids[i].style.transitionDelay = ((flown ? 200 : 450) + i * 150) + 'ms';
    setTimeout(function () { if (cover && cover.parentNode) cover.parentNode.removeChild(cover); for (var j = 0; j < kids.length; j++) kids[j].style.transitionDelay = ''; }, AK.introMs + 1400);
  }
  // Grösse: nur bei neuer Breite neu malen (Safari-Leisten ändern nur die Höhe); dann ohne Flug
  var lastW = 0, rsT = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rsT);
    rsT = setTimeout(function () {
      if (Math.abs(root.clientWidth - lastW) > 20) { lastW = root.clientWidth; fl = null; paintScene(false); litOn = null; reveal(); }
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
    if (location.hash === '#ak-test') {   // nur für Tests: Standbild bei Fortschritt u; Kamera von Hand an eine Stelle setzen
      window.__akSeek = function (u) { stop(); run = true; flown = true; fl = null; cam = tgY = camT * (1 - swing(u)); camX = tgX = 0; if (u >= .92) reveal(); raf = 0; frameOnce(); };
      window.__akPan = function (fy, fx) { stop(); run = true; flown = true; fl = null; reveal(); cam = tgY = clamp(fy, 0, 1) * camT; camX = tgX = clamp(fx, -1, 1) * XR; raf = 0; frameOnce(); return [sways.length, fliers.length]; };
    }
  }
  function frameOnce() { var r = requestAnimationFrame; window.requestAnimationFrame = function () { return 0; }; frame(performance.now()); window.requestAnimationFrame = r; }
  if (document.fonts && document.fonts.ready) {
    var done = false, b = function () { if (!done) { done = true; boot(); } };
    document.fonts.ready.then(b); setTimeout(b, 1200);
  } else boot();
})();
