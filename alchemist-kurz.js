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

   VON HAND (Hugo 27.11., 11:02 und 11:50): Ausserhalb des Rads lässt sich die ganze Szene gemütlich verschieben – seitlich in
   den Urwald (dezent und weich) und wieder nach oben bis in den Himmel. Hinter der Mitte des Rads und der Beschreibung liegt
   ein weiches helles Feld, über dem Urwald kräftiger. Das Bild richtet sich nach dem Text: Sonne, See und Unterholz liegen
   dort, wo Slogan, Rad und Kontakte auf dem jeweiligen Gerät wirklich stehen (gemessen an der sichtbaren Höhe). Der Urwald hat Tiefe: Bänder und Lianen hinten (immer leicht unterwegs), Pflanzen davor. Das Rad scrollt die Services, mit Parallax
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
    panX: [.09, .05],     // so weit geht es seitlich, als Anteil der Breite: Handy, Computer (Hugo 13:19: dezent und weich wie am Anfang)
    panSoft: 420,         // so weich zieht die Kamera dem Finger nach (Millisekunden; grösser = weicher)
    veil: [.34, .88],     // weiches Feld hinter Rad-Mitte und Beschreibung: Deckkraft in der Lichtung, Deckkraft über dem Urwald (0 = aus)
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
    /* Wiegen im Wind: läuft als CSS-Animation direkt auf der Grafikkarte (kein Rechnen im Takt); steht still, wenn die Kamera weit oben ist */
    '.ak-sway { position: absolute; will-change: transform; animation: akSway 8s ease-in-out infinite alternate; }',
    '@keyframes akSway { from { transform: rotate(calc(var(--a) * -1)); } to { transform: rotate(var(--a)); } }',
    '.ak-far .ak-sway { animation-play-state: paused; }',
    /* Lesbarkeit: die kleinen Texte tragen einen feinen hellen Schein (der Titel nicht: er hat den Perlmutt-Verlauf) */
    '[data-ak] .ak-kicker, [data-ak] .ak-lead, [data-ak] [data-ak-item], [data-ak] [data-ak-caption], [data-ak] .ak-long { text-shadow: 0 0 9px rgba(255,255,255,.8), 0 0 2px rgba(255,255,255,.55); }',
    /* ein einziges weiches Feld hinter der Mitte des Rads und der Beschreibung (Hugo 13:19); fertig gemaltes Bild ohne Kanten */
    '.ak-veil { position: absolute; z-index: 5; pointer-events: none; opacity: 0; will-change: opacity; }',
    /* Licht: fertig gemalte Bilder mit normaler Deckkraft. Kein Mischmodus, keine Masken – die bremsten das Handy bei der Landung */
    '.ak-rays { left: 0; top: 0; will-change: transform; }',
    '.ak-rays canvas { position: absolute; left: 0; top: 0; will-change: opacity; }',
    '@keyframes akRayA { 0%, 100% { opacity: 1; } 35% { opacity: .5; } 70% { opacity: .85; } }',
    '@keyframes akRayB { 0%, 100% { opacity: .55; } 40% { opacity: 1; } 75% { opacity: .65; } }',
    '.ak-dapple { left: 0; top: 0; will-change: transform; }',
    '.ak-dapple canvas { position: absolute; left: 0; top: 0; will-change: transform, opacity; }',
    '@keyframes akSpot { 0%, 100% { transform: translate3d(0,0,0); opacity: 1; } 50% { transform: translate3d(18px,-12px,0); opacity: .65; } }',
    '.ak-fx { left: 0; top: 0; z-index: 9; }',
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
    '@media (prefers-reduced-motion: reduce) { .ak-rays canvas, .ak-dapple canvas, .ak-sway, html.ak-on [data-ak] .ak-title { animation: none !important; } }'
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
  function rrect4(x, a, b, w, h, r) {   // jede Ecke mit eigener Rundung (wirkt von Hand gezeichnet)
    var m = Math.min(w, h) / 2, q = r.map(function (v) { return Math.min(v, m); });
    x.beginPath(); x.moveTo(a + q[0], b); x.arcTo(a + w, b, a + w, b + h, q[1]); x.arcTo(a + w, b + h, a, b + h, q[2]); x.arcTo(a, b + h, a, b, q[3]); x.arcTo(a, b, a + w, b, q[0]); x.closePath();
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
  // weitere Blüten, frei erfunden (Hugo 27.11., 11:55: «die Blumen gefallen mir besonders, da kannst du kreativ weiter erfinden»)
  function dahlia(x, cx, cy, r, cols, lw) {   // gefüllte Blüte: drei Kränze, nach innen heller
    var a0 = R() * 6, k, i, n;
    for (k = 0; k < 3; k++) for (n = [12, 9, 6][k], i = 0; i < n; i++) stripe(x, cx, cy, a0 + (i + k * .5) / n * Math.PI * 2, r * [1, .7, .42][k], r * [.15, .14, .12][k], 0, mix(cols[0], '#ffffff', k * .2), lw * .8, 0, .8);
    x.beginPath(); x.arc(cx, cy, r * .13, 0, 7); x.fillStyle = cols[1]; x.fill(); ol(x, lw * .7);
  }
  function starFlower(x, cx, cy, r, cols, lw) {   // Sternblüte: lange schmale und kurze helle Blütenblätter, Kranz aus Punkten
    var a0 = R() * 6, n = 7 + Math.floor(R() * 3), i;
    for (i = 0; i < n; i++) stripe(x, cx, cy, a0 + (i + .5) / n * Math.PI * 2, r * .58, r * .13, 0, mix(cols[0], '#ffffff', .4), lw * .8, 0, .3);
    for (i = 0; i < n; i++) stripe(x, cx, cy, a0 + i / n * Math.PI * 2, r, r * .1, rr(-.06, .06), cols[0], lw * .8, 1, .15);
    x.beginPath(); x.arc(cx, cy, r * .17, 0, 7); x.fillStyle = cols[1]; x.fill(); ol(x, lw * .7);
    for (i = 0; i < n; i++) { x.beginPath(); x.arc(cx + Math.cos(a0 + i / n * 6.283) * r * .28, cy + Math.sin(a0 + i / n * 6.283) * r * .28, r * .035, 0, 7); x.fillStyle = '#fff6c8'; x.fill(); ol(x, lw * .4); }
  }
  function passion(x, cx, cy, r, cols, lw) {   // Strahlenblüte: runde Blütenblätter, darüber ein Kranz feiner Fäden
    var a0 = R() * 6, n = 9 + Math.floor(R() * 3), i, a;
    for (i = 0; i < n; i++) stripe(x, cx, cy, a0 + i / n * Math.PI * 2, r, r * .2, 0, i % 2 ? cols[0] : mix(cols[0], '#ffffff', .22), lw * .8, 0, 1);
    for (i = 0; i < 26; i++) { a = a0 + i / 26 * Math.PI * 2; x.beginPath(); x.moveTo(cx + Math.cos(a) * r * .2, cy + Math.sin(a) * r * .2); x.lineTo(cx + Math.cos(a) * r * .6, cy + Math.sin(a) * r * .6); ol(x, lw * 1.1, i % 2 ? cols[1] : '#f6f2ff'); }
    x.beginPath(); x.arc(cx, cy, r * .2, 0, 7); x.fillStyle = cols[2]; x.fill(); ol(x, lw * .7);
    for (i = 0; i < 5; i++) { a = a0 + i / 5 * 6.283; x.beginPath(); x.arc(cx + Math.cos(a) * r * .1, cy + Math.sin(a) * r * .1, r * .035, 0, 7); x.fillStyle = INK; x.fill(); }
  }
  function hibiscus(x, cx, cy, r, cols, lw) {   // fünf breite Blütenblätter, dunkles Auge, langer Stempel mit Perlen
    var a0 = R() * 6, i, a, sa = a0 + rr(.2, 1);
    for (i = 0; i < 5; i++) stripe(x, cx, cy, a0 + i / 5 * Math.PI * 2, r, r * .46, rr(-.05, .05), i % 2 ? mix(cols[0], '#ffffff', .12) : cols[0], lw * .85, mix(cols[0], INK, .25), 1);
    x.beginPath(); x.arc(cx, cy, r * .24, 0, 7); x.fillStyle = cols[1]; x.fill(); ol(x, lw * .7);
    x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx + Math.cos(sa + .4) * r * .5, cy + Math.sin(sa + .4) * r * .5, cx + Math.cos(sa) * r * .86, cy + Math.sin(sa) * r * .86); ol(x, lw * 2.6); ol(x, lw * 1.2, '#ffd75e');
    for (i = 0; i < 4; i++) { a = sa + (i - 1.5) * .22; x.beginPath(); x.arc(cx + Math.cos(a) * r * (.8 + (i % 2) * .1), cy + Math.sin(a) * r * (.8 + (i % 2) * .1), r * .05, 0, 7); x.fillStyle = '#ffd75e'; x.fill(); ol(x, lw * .5); }
  }
  function lotus(x, px, py, r, cols, lw) {   // Kelch von der Seite: Blütenblätter fächern nach oben, zwei Kelchblätter, Stiel
    var i, c = cols[0];
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + r * rr(-.3, .3), py + r * .7, px + r * rr(-.2, .2), py + r * 1.3); ol(x, lw * 3); ol(x, lw * 1.4, '#3fae6a');
    for (i = 0; i < 2; i++) stripe(x, px, py, -Math.PI / 2 + (i ? 1.25 : -1.25), r * .55, r * .14, i ? .3 : -.3, '#2f9a4a', lw * .8, 0, .3);
    [0, 4, 1, 3, 2].forEach(function (i) { var t = i / 4 - .5; stripe(x, px, py, -Math.PI / 2 + t * 1.7, r * (1 - Math.abs(t) * .25), r * .25, t * .5, i === 2 ? mix(c, '#ffffff', .25) : i % 2 ? c : mix(c, INK, .12), lw * .85, i === 2 ? 1 : 0, .45); });
  }
  function bell(x, px, py, r, cols, lw) {   // hängende Glockenblüten an einem Bogen
    var n = 2 + Math.floor(R() * 3), d = R() < .5 ? 1 : -1, i, pts = [], t;
    for (i = 0; i <= 12; i++) { t = i / 12; pts.push([px + d * r * 1.6 * t, py - Math.sin(t * Math.PI * .8) * r * .9]); }
    polyline(x, pts); ol(x, lw * 3); ol(x, lw * 1.4, '#3fae6a');
    for (i = 0; i < n; i++) {
      var q = pts[4 + Math.round(i * 8 / n)], s = r * rr(.42, .6), c = i % 2 ? mix(cols[0], '#ffffff', .2) : cols[0], bx = q[0], by = q[1];
      x.beginPath(); x.moveTo(bx, by); x.lineTo(bx, by + s * .3); ol(x, lw * 1.2, '#3fae6a');
      x.beginPath(); x.moveTo(bx - s * .16, by + s * .28);
      x.bezierCurveTo(bx - s * .5, by + s * .4, bx - s * .34, by + s, bx - s * .6, by + s * 1.25);
      x.quadraticCurveTo(bx - s * .3, by + s * 1.42, bx, by + s * 1.26); x.quadraticCurveTo(bx + s * .3, by + s * 1.42, bx + s * .6, by + s * 1.25);
      x.bezierCurveTo(bx + s * .34, by + s, bx + s * .5, by + s * .4, bx + s * .16, by + s * .28);
      x.closePath(); x.fillStyle = c; x.fill(); ol(x, lw * .85);
      x.beginPath(); x.moveTo(bx, by + s * 1.26); x.lineTo(bx, by + s * 1.55); ol(x, lw);
      x.beginPath(); x.arc(bx, by + s * 1.6, s * .09, 0, 7); x.fillStyle = cols[1]; x.fill(); ol(x, lw * .5);
    }
  }
  function cluster(x, px, py, len, cols, lw) {   // Traube: kleine Blüten an einem hängenden Stiel, nach unten kleiner
    var n = 7 + Math.floor(R() * 4), i, d = rr(-.25, .25);
    for (i = 0; i < n; i++) {
      var t = i / (n - 1), bx = px + Math.sin(t * 2.2) * len * d, by = py + t * len, s = len * .12 * (1 - t * .6), k;
      for (k = 0; k < 2; k++) {
        x.beginPath(); x.arc(bx + (k ? 1 : -1) * s * .9, by + k * s * .35, s, 0, 7); x.fillStyle = (i + k) % 3 ? cols[0] : mix(cols[0], '#ffffff', .3); x.fill(); ol(x, lw * .7);
        x.beginPath(); x.arc(bx + (k ? 1 : -1) * s * .9, by + k * s * .35, s * .32, 0, 7); x.fillStyle = cols[1]; x.fill();
      }
    }
  }
  // noch mehr Arten (Hugo 27.11., 13:19: «noch diversere Blumen», angeregt von Urwaldpflanzen – Hummerschere, Fackelingwer, Protea,
  // Nadelkissen, Orchidee, Flamingoblume, Paradiesvogelblume, Bromelie – und von abstrakter, geometrischer Ornamentik; frei gezeichnet)
  var PHI = 1.618034, GA = 2.399963;   // Goldener Schnitt und Goldener Winkel (137.5°): so setzt die Natur Kerne und Blätter
  function lens(x, cx, cy, a, r0, r1, h, col, lw, line) {   // Mandelform (Vesica) entlang eines Strahls
    var m = (r0 + r1) / 2;
    x.save(); x.translate(cx, cy); x.rotate(a);
    x.beginPath(); x.moveTo(r0, 0); x.quadraticCurveTo(m, -h * 2, r1, 0); x.quadraticCurveTo(m, h * 2, r0, 0); x.closePath(); x.fillStyle = col; x.fill(); ol(x, lw, line);
    x.restore();
  }
  function stalk(x, px, py, len, lw) { x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + len * rr(-.25, .25), py + len * .6, px + len * rr(-.18, .18), py + len); ol(x, lw * 3.2); ol(x, lw * 1.6, '#3fae6a'); }
  function heliconia(x, px, py, len, cols, lw) {   // hängende Kette aus Kahn-Blättern im Zickzack
    var n = 5 + Math.floor(R() * 4), st = len / n, d = R() < .5 ? 1 : -1, pts = [[px, py - len * .12]], i;
    for (i = 0; i <= n; i++) pts.push([px + (i % 2 ? 1 : -1) * st * .16, py + i * st]);
    polyline(x, pts); ol(x, lw * 3); ol(x, lw * 1.4, '#3fae6a');
    for (i = 0; i < n; i++) {
      var sd = (i % 2 ? 1 : -1) * d, k = 1 - i / n * .45, q = pts[i + 1];
      stripe(x, q[0], q[1], Math.PI / 2 - sd * 1.05, st * 1.3 * k, st * .36 * k, sd * .28, i % 2 ? cols[0] : mix(cols[0], '#ffffff', .14), lw * .85, 0, .2);
      stripe(x, q[0], q[1], Math.PI / 2 - sd * 1.05, st * .85 * k, st * .12 * k, sd * .28, cols[1], lw * .5, 0, .2);
    }
  }
  function torch(x, px, py, r, cols, lw) {   // Fackel: Kegel aus Schuppen über einem Kranz langer Blätter
    var i, t;
    stalk(x, px, py + r * .15, r * 1.3, lw);
    for (i = 0; i < 7; i++) { t = i / 6 - .5; stripe(x, px, py + r * .15, -Math.PI / 2 + t * 2.9, r * .95, r * .2, t * .7, i % 2 ? cols[0] : mix(cols[0], INK, .12), lw * .85, 0, .5); }
    [4, 4, 3, 2, 1].forEach(function (m, j) {
      for (var q = 0; q < m; q++) { var u = m > 1 ? q / (m - 1) - .5 : 0; stripe(x, px + u * r * (.62 - j * .1), py - j * r * .2, -Math.PI / 2 + u * .5, r * .36, r * .13, 0, (q + j) % 2 ? cols[1] : mix(cols[1], '#ffffff', .28), lw * .7, 0, .9); }
    });
  }
  function protea(x, px, py, r, cols, lw) {   // Kelch aus spitzen Hüllblättern, in der Mitte eine Kuppel aus feinen Strahlen
    var a, i;
    stalk(x, px, py, r * 1.2, lw);
    [0, 10, 1, 9, 2, 8, 3, 7, 4, 6, 5].forEach(function (i) { var t = i / 10 - .5; stripe(x, px, py, -Math.PI / 2 + t * 2.3, r * (1 - Math.abs(t) * .3), r * .16, t * .25, i % 2 ? cols[0] : mix(cols[0], '#ffffff', .22), lw * .8, 1, .12); });
    x.beginPath(); x.ellipse(px, py - r * .32, r * .36, r * .3, 0, 0, 7); x.fillStyle = cols[1]; x.fill(); ol(x, lw * .8);
    for (i = 0; i < 9; i++) { a = -Math.PI / 2 + (i / 8 - .5) * 2.2; x.beginPath(); x.moveTo(px + Math.cos(a) * r * .1, py - r * .32 + Math.sin(a) * r * .08); x.lineTo(px + Math.cos(a) * r * .32, py - r * .32 + Math.sin(a) * r * .27); ol(x, lw * .6, '#fff6c8'); }
  }
  function pincushion(x, cx, cy, r, cols, lw) {   // Nadelkissen: Kugel, rundherum feine Griffel mit Perlen (im Goldenen Winkel verteilt)
    var a0 = R() * 6, i, a, L, d;
    for (i = 0; i < 21; i++) {
      a = a0 + i * GA; L = r * (.72 + (i % 3) * .14);
      x.beginPath(); x.moveTo(cx + Math.cos(a) * r * .3, cy + Math.sin(a) * r * .3); x.quadraticCurveTo(cx + Math.cos(a + .25) * L * .7, cy + Math.sin(a + .25) * L * .7, cx + Math.cos(a) * L, cy + Math.sin(a) * L); ol(x, lw * 2.2); ol(x, lw, cols[0]);
      x.beginPath(); x.arc(cx + Math.cos(a) * L, cy + Math.sin(a) * L, r * .06, 0, 7); x.fillStyle = cols[1]; x.fill(); ol(x, lw * .5);
    }
    x.beginPath(); x.arc(cx, cy, r * .36, 0, 7); x.fillStyle = cols[0]; x.fill(); ol(x, lw * .8);
    for (i = 1; i <= 13; i++) { a = i * GA; d = r * .3 * Math.sqrt(i / 13); x.beginPath(); x.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * .035, 0, 7); x.fillStyle = cols[1]; x.fill(); }
  }
  function phiFlower(x, cx, cy, r, cols, lw) {   // Blüte nach dem Goldenen Winkel: jedes Blütenblatt und jeder Kern sitzt 137.5° weiter (wie bei der Sonnenblume)
    var i, a, d;
    for (i = 21; i >= 1; i--) stripe(x, cx, cy, i * GA, r * (.62 + .38 * i / 21), r * .15, 0, i % 3 ? cols[0] : mix(cols[0], '#ffffff', .3), lw * .75, 0, .5);
    x.beginPath(); x.arc(cx, cy, r * .4, 0, 7); x.fillStyle = cols[2]; x.fill(); ol(x, lw * .8);
    for (i = 1; i <= 34; i++) { a = i * GA; d = r * .36 * Math.sqrt(i / 34); x.beginPath(); x.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * (.022 + .02 * i / 34), 0, 7); x.fillStyle = cols[1]; x.fill(); }
  }
  function mandala(x, cx, cy, r, cols, lw) {   // geometrische Blüte: Mandelblätter in zwei Kränzen auf dunklem Grund, dazwischen Perlen
    var n = R() < .5 ? 6 : 8, a0 = R() * 6, i, a;
    x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fillStyle = mix(cols[0], INK, .5); x.fill(); ol(x, lw * .9);
    for (i = 0; i < n; i++) lens(x, cx, cy, a0 + i / n * 6.2832, 0, r * .95, r * .2, cols[0], lw * .75);
    for (i = 0; i < n; i++) { a = a0 + (i + .5) / n * 6.2832; lens(x, cx, cy, a, 0, r * .6, r * .13, mix(cols[0], '#ffffff', .35), lw * .65); x.beginPath(); x.arc(cx + Math.cos(a) * r * .78, cy + Math.sin(a) * r * .78, r * .06, 0, 7); x.fillStyle = cols[1]; x.fill(); ol(x, lw * .5); }
    x.beginPath(); x.arc(cx, cy, r * .16, 0, 7); x.fillStyle = cols[1]; x.fill(); ol(x, lw * .7);
  }
  function orchid(x, cx, cy, r, cols, lw) {   // drei schmale und zwei breite Blütenblätter, unten eine getupfte Lippe
    var a0 = rr(-.4, .4), i;
    for (i = 0; i < 3; i++) stripe(x, cx, cy, a0 - Math.PI / 2 + i * 2.0944, r, r * .13, 0, mix(cols[0], '#ffffff', .28), lw * .8, 1, .15);
    for (i = -1; i <= 1; i += 2) stripe(x, cx, cy, a0 - Math.PI / 2 + i * 1.15, r * .86, r * .34, i * .1, cols[0], lw * .85, 0, 1);
    x.save(); x.translate(cx, cy); x.rotate(a0);
    x.beginPath(); x.moveTo(-r * .12, r * .05); x.bezierCurveTo(-r * .5, r * .2, -r * .42, r * .62, -r * .12, r * .6); x.quadraticCurveTo(0, r * .78, r * .12, r * .6); x.bezierCurveTo(r * .42, r * .62, r * .5, r * .2, r * .12, r * .05); x.closePath();
    x.fillStyle = cols[1]; x.fill(); ol(x, lw * .85);
    for (i = 0; i < 5; i++) { x.beginPath(); x.arc((i - 2) * r * .08, r * (.3 + (i % 2) * .12), r * .03, 0, 7); x.fillStyle = INK; x.fill(); }
    x.beginPath(); x.arc(0, 0, r * .12, 0, 7); x.fillStyle = '#ffd75e'; x.fill(); ol(x, lw * .7);
    x.restore();
  }
  function heartLeaf(x, px, py, r, cols, lw) {   // Herzblatt mit Kolben
    stalk(x, px, py, r * 1.1, lw);
    x.save(); x.translate(px, py); x.rotate(rr(-.6, .6));
    x.beginPath(); x.moveTo(0, r * .12); x.bezierCurveTo(-r * .5, r * .5, -r, -r * .1, 0, -r); x.bezierCurveTo(r, -r * .1, r * .5, r * .5, 0, r * .12); x.closePath(); x.fillStyle = cols[0]; x.fill(); ol(x, lw * .9);
    x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(-r * .06, -r * .5, 0, -r * .86); ol(x, lw * .6, mix(cols[0], '#ffffff', .4));
    x.restore();
    stripe(x, px, py + r * .04, -Math.PI / 2 + rr(.15, .4), r * .62, r * .075, .1, cols[1], lw * .7, 0, 1);
  }
  function crane(x, px, py, r, cols, lw) {   // Schnabel-Hüllblatt, daraus steigen spitze Blütenblätter und ein blauer Pfeil
    var d = R() < .5 ? 1 : -1, i;
    stalk(x, px - d * r * .2, py + r * .05, r * 1.1, lw);
    for (i = 0; i < 4; i++) stripe(x, px + d * r * .1 * i, py, -Math.PI / 2 + d * (.55 - i * .32), r * (1 - i * .08), r * .13, -d * .1, i % 2 ? mix(cols[0], '#ffffff', .22) : cols[0], lw * .8, 1, .1);
    stripe(x, px + d * r * .05, py, -Math.PI / 2 + d * .9, r * .7, r * .08, 0, cols[1], lw * .8, 0, .05);
    stripe(x, px - d * r * .25, py + r * .05, d > 0 ? -.12 : Math.PI + .12, r * .95, r * .2, d * .12, cols[2], lw * .85, 0, .15);
  }
  function bromeliad(x, px, py, r, cols, lw, z) {   // Trichter aus Bogenblättern, in der Mitte eine Ähre
    var j;
    [0, 8, 1, 7, 2, 6, 3, 5, 4].forEach(function (i) { var t = i / 8 - .5; stripe(x, px, py, -Math.PI / 2 + t * 2.7, r * (1 - Math.abs(t) * .25), r * .13, t * 1.2, z[i % z.length], lw * .85, 1, .15); });
    for (j = 5; j >= 0; j--) [-1, 1].forEach(function (sd) { stripe(x, px, py - r * (.12 + j * .13), -Math.PI / 2 + sd * (.85 - j * .1), r * (.3 - j * .03), r * .09, 0, j % 2 ? cols[0] : mix(cols[0], '#ffffff', .25), lw * .7, 0, .3); });
    stripe(x, px, py - r * .8, -Math.PI / 2, r * .24, r * .07, 0, cols[1], lw * .7, 0, .3);
  }
  // weitere Blüten (Hugo 27.11., 14:44: «noch weitere spannende Blumen»). Sie wachsen nur an neuen Stellen, damit das Bisherige bleibt.
  function fuchsia(x, px, py, r, cols, lw) {   // hängende Tänzerin: abstehende Kelchblätter, Röckchen, lange Staubfäden
    var by = py + r * .5, i, t;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px, by); ol(x, lw * 2.6); ol(x, lw * 1.2, '#3fae6a');
    for (i = 0; i < 5; i++) { t = i / 4 - .5; x.beginPath(); x.moveTo(px + t * r * .2, by + r * .5); x.lineTo(px + t * r * .7, by + r * (1.5 - Math.abs(t) * .35)); ol(x, lw * .8, cols[1]); x.beginPath(); x.arc(px + t * r * .7, by + r * (1.5 - Math.abs(t) * .35), r * .05, 0, 7); x.fillStyle = '#ffd75e'; x.fill(); ol(x, lw * .4); }
    for (i = 0; i < 3; i++) stripe(x, px, by + r * .2, Math.PI / 2 + (i - 1) * .5, r * .62, r * .2, 0, cols[1], lw * .8, 0, 1);
    [-1.25, 1.25, -.62, .62].forEach(function (a, i) { stripe(x, px, by, Math.PI / 2 + a, r * (i < 2 ? .95 : .8), r * .15, a * -.35, i < 2 ? cols[0] : mix(cols[0], '#ffffff', .2), lw * .8, 0, .1); });
    x.beginPath(); x.ellipse(px, by - r * .08, r * .11, r * .16, 0, 0, 7); x.fillStyle = cols[0]; x.fill(); ol(x, lw * .7);
  }
  function trumpet(x, px, py, r, cols, lw) {   // Trompete: langer hängender Trichter mit geschwungenem Saum
    x.save(); x.translate(px, py); x.rotate(rr(-.35, .35));
    x.beginPath(); x.moveTo(0, 0); x.lineTo(0, r * .2); ol(x, lw * 2.6); ol(x, lw * 1.2, '#3fae6a');
    x.beginPath(); x.moveTo(-r * .07, r * .18); x.bezierCurveTo(-r * .1, r * .7, -r * .22, r, -r * .52, r * 1.28);
    x.quadraticCurveTo(-r * .3, r * 1.2, -r * .2, r * 1.42); x.quadraticCurveTo(0, r * 1.22, r * .2, r * 1.42); x.quadraticCurveTo(r * .3, r * 1.2, r * .52, r * 1.28);
    x.bezierCurveTo(r * .22, r, r * .1, r * .7, r * .07, r * .18); x.closePath(); x.fillStyle = cols[0]; x.fill(); ol(x, lw * .85);
    x.beginPath(); x.moveTo(0, r * .3); x.lineTo(0, r * 1.2); ol(x, lw * .6, mix(cols[0], '#ffffff', .5));
    x.beginPath(); x.moveTo(-r * .05, r * .35); x.quadraticCurveTo(-r * .12, r * .9, -r * .3, r * 1.2); ol(x, lw * .5, mix(cols[0], INK, .25));
    x.beginPath(); x.moveTo(r * .05, r * .35); x.quadraticCurveTo(r * .12, r * .9, r * .3, r * 1.2); ol(x, lw * .5, mix(cols[0], INK, .25));
    x.beginPath(); x.ellipse(0, r * .16, r * .1, r * .07, 0, 0, 7); x.fillStyle = '#3fae6a'; x.fill(); ol(x, lw * .6);
    x.restore();
  }
  function lily(x, cx, cy, r, cols, lw) {   // sechs zurückgebogene Blütenblätter mit Tupfen, lange Staubfäden
    var a0 = R() * 6, i, k, a, c2 = mix(cols[0], INK, .6);
    for (i = 0; i < 6; i++) stripe(x, cx, cy, a0 + i / 6 * 6.2832, r, r * .2, i % 2 ? .35 : -.35, i % 2 ? cols[0] : mix(cols[0], '#ffffff', .2), lw * .85, 1, .15);
    for (i = 0; i < 6; i++) for (k = 1; k <= 3; k++) { a = a0 + i / 6 * 6.2832 + (i % 2 ? .1 : -.1) * k; x.beginPath(); x.arc(cx + Math.cos(a) * r * (.2 + k * .12), cy + Math.sin(a) * r * (.2 + k * .12), r * .025, 0, 7); x.fillStyle = c2; x.fill(); }
    for (i = 0; i < 6; i++) { a = a0 + (i + .5) / 6 * 6.2832; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * r * .58, cy + Math.sin(a) * r * .58); ol(x, lw * .8, '#fff6c8'); x.beginPath(); x.ellipse(cx + Math.cos(a) * r * .6, cy + Math.sin(a) * r * .6, r * .07, r * .035, a + 1.57, 0, 7); x.fillStyle = cols[1]; x.fill(); ol(x, lw * .4); }
    x.beginPath(); x.arc(cx, cy, r * .09, 0, 7); x.fillStyle = '#8fc93a'; x.fill(); ol(x, lw * .6);
  }
  function rafflesia(x, cx, cy, r, cols, lw) {   // fünf dicke gesprenkelte Lappen um einen tiefen Schlund
    var a0 = R() * 6, i, k, a, aa, d;
    for (i = 0; i < 5; i++) {
      a = a0 + i / 5 * 6.2832; x.beginPath(); x.ellipse(cx + Math.cos(a) * r * .62, cy + Math.sin(a) * r * .62, r * .46, r * .36, a, 0, 7); x.fillStyle = i % 2 ? cols[0] : mix(cols[0], INK, .1); x.fill(); ol(x, lw * .9);
      for (k = 0; k < 6; k++) { d = r * (.45 + R() * .46); aa = a + (R() - .5) * .66; x.beginPath(); x.arc(cx + Math.cos(aa) * d, cy + Math.sin(aa) * d, r * rr(.025, .05), 0, 7); x.fillStyle = cols[1]; x.fill(); }
    }
    x.beginPath(); x.arc(cx, cy, r * .42, 0, 7); x.fillStyle = mix(cols[0], INK, .3); x.fill(); ol(x, lw * .9);
    x.beginPath(); x.arc(cx, cy, r * .26, 0, 7); x.fillStyle = mix(cols[0], INK, .68); x.fill(); ol(x, lw * .7);
    for (i = 1; i <= 8; i++) { a = i * GA; d = r * .2 * Math.sqrt(i / 8); x.beginPath(); x.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * .028, 0, 7); x.fillStyle = cols[1]; x.fill(); }
  }
  function spiralBloom(x, cx, cy, r, cols, lw) {   // Blüte als Goldene Spirale: die Blätter wachsen von innen nach aussen im Verhältnis φ
    var a0 = R() * 6, d = R() < .5 ? 1 : -1, i, a, sz;
    for (i = 13; i >= 0; i--) { a = a0 + d * i * .62; sz = r * Math.pow(PHI, (i - 13) / 3.2); stripe(x, cx + Math.cos(a) * sz * .25, cy + Math.sin(a) * sz * .25, a, sz * .82, sz * .26, d * .25, i % 2 ? cols[0] : mix(cols[0], '#ffffff', .32), lw * .75, 0, .7); }
    x.beginPath(); x.arc(cx, cy, r * .09, 0, 7); x.fillStyle = cols[1]; x.fill(); ol(x, lw * .6);
  }
  function spike(x, px, py, len, cols, lw) {   // Kerze: aufrechte Ähre aus Blütenpaaren, nach oben kleiner
    var d = rr(-.15, .15), i, t, sz, bx, by;
    x.beginPath(); x.moveTo(px, py + len * .25); x.quadraticCurveTo(px + d * len * .2, py - len * .4, px + d * len, py - len); ol(x, lw * 3); ol(x, lw * 1.4, '#3fae6a');
    for (i = 0; i < 9; i++) {
      t = i / 8; sz = len * .13 * (1 - t * .65); bx = px + d * len * t * t; by = py - len * t;
      stripe(x, bx, by, -Math.PI / 2 - (1.15 - t * .5), sz * 1.5, sz * .55, -.2, i % 2 ? cols[0] : mix(cols[0], '#ffffff', .28), lw * .7, 0, 1);
      stripe(x, bx, by, -Math.PI / 2 + (1.15 - t * .5), sz * 1.5, sz * .55, .2, i % 2 ? mix(cols[0], '#ffffff', .28) : cols[0], lw * .7, 0, 1);
      x.beginPath(); x.arc(bx, by, sz * .22, 0, 7); x.fillStyle = cols[1]; x.fill();
    }
  }
  function glory(x, cx, cy, r, cols, lw) {   // Winde: runde Krone mit fünf Buchten, innen ein heller Stern
    var a0 = R() * 6, p = [], i, a, c2 = mix(cols[0], '#ffffff', .5);
    for (i = 0; i < 10; i++) { a = a0 + i / 10 * 6.2832; p.push([cx + Math.cos(a) * r * (i % 2 ? .84 : 1.06), cy + Math.sin(a) * r * (i % 2 ? .84 : 1.06)]); }
    blob(x, p); x.fillStyle = cols[0]; x.fill(); ol(x, lw * .9);
    for (i = 0; i < 5; i++) lens(x, cx, cy, a0 + i / 5 * 6.2832, r * .12, r * .9, r * .06, c2, lw * .3, c2);
    x.beginPath(); x.arc(cx, cy, r * .2, 0, 7); x.fillStyle = '#fff6c8'; x.fill(); ol(x, lw * .6);
    x.beginPath(); x.arc(cx, cy, r * .08, 0, 7); x.fillStyle = cols[1]; x.fill();
  }
  // Baobab im Stil der Zeichnungen (eigene Form; Hugo 14:44): dicker Flaschenstamm mit Bändern, kurze Äste mit Kronen, daran Lianen
  // mit Blüten. hz = Dunst der Ferne (0…1): je weiter weg, desto heller.
  function baobab(x, px, py, h, lw, hz) {
    function C(c) { return hz ? mix(c, '#bfe4f4', hz) : c; }
    var w = h * .3, th = h * .58, tc = C(pick(['#a8489a', '#8a4fb8', '#b85a8a', '#7a5ac0', '#c0603a'])), L = C(INK), ends = [], n = 5 + Math.floor(R() * 3), i, t, a, bl, bx, ex, ey, z;
    function trunk() { x.beginPath(); x.moveTo(px - w * .62, py); x.bezierCurveTo(px - w * .8, py - th * .45, px - w * .3, py - th * .7, px - w * .3, py - th); x.lineTo(px + w * .3, py - th); x.bezierCurveTo(px + w * .3, py - th * .7, px + w * .8, py - th * .45, px + w * .62, py); x.closePath(); }
    for (i = 0; i < n; i++) {
      t = n > 1 ? i / (n - 1) - .5 : 0; a = -Math.PI / 2 + t * 2.3 + rr(-.12, .12); bl = h * rr(.2, .34) * (1 - Math.abs(t) * .25); bx = px + t * w * .5; ex = bx + Math.cos(a) * bl; ey = py - th + Math.sin(a) * bl;
      x.beginPath(); x.moveTo(bx, py - th + w * .12); x.quadraticCurveTo(bx + Math.cos(a) * bl * .5, py - th + Math.sin(a) * bl * .5 - bl * .14, ex, ey); ol(x, w * .2 + lw * 2, L); ol(x, w * .2, tc);
      ends.push([ex, ey]);
    }
    trunk(); x.fillStyle = tc; x.fill();
    x.save(); trunk(); x.clip();
    for (i = 1; i <= 4; i++) { t = py - th * i / 5; x.beginPath(); x.moveTo(px - w, t + w * .1); x.quadraticCurveTo(px, t - w * .18, px + w, t + w * .1); ol(x, lw * 2.2, i % 2 ? mix(tc, '#ffffff', .32) : mix(tc, INK, .22)); }
    for (i = -1; i <= 1; i++) { x.beginPath(); x.arc(px + i * w * .22, py - th * .5 - Math.abs(i) * w * .03, w * .06, 0, 7); x.fillStyle = C('#ffd75e'); x.fill(); }
    x.restore(); trunk(); ol(x, lw, L);
    ends.forEach(function (e, i) {
      z = [Z_GREEN, Z_TEAL, Z_GREEN, Z_PURP, Z_MAG][Math.floor(R() * 5)].map(C);
      if (i % 2 === 0) {   // Liane mit Blättchen und Blüten
        var len = h * rr(.28, .55), ph = R() * 6, pts = [], q, c = C(pick(P_FLOWER));
        for (q = 0; q <= 8; q++) pts.push([e[0] + Math.sin(q * .8 + ph) * h * .02 * q / 8, e[1] + len * q / 8]);
        polyline(x, pts); ol(x, lw * 2.4, L); ol(x, lw * 1.1, C('#3fae6a'));
        for (q = 2; q <= 8; q += 2) { x.beginPath(); x.arc(pts[q][0] + (q % 4 ? 1 : -1) * h * .018, pts[q][1], h * .016, 0, 7); x.fillStyle = q === 8 ? c : C('#4fae3f'); x.fill(); ol(x, lw * .5, L); }
      }
      crown(x, e[0], e[1] - h * .03, h * rr(.09, .13), z, lw * .9);
    });
  }
  // hängende Liane mit Blattpaaren und kleinen Blüten, am Ende eine grosse Blüte (Hugo 13:21: «Lianen, die runter hängen und sich bewegen, mit Blumen»)
  function flowerVine(x, px, y0, len, amp, lw) {
    var pts = [], n = 18, ph = R() * 6, r0 = Math.max(7, Math.min(len * .05, U * .034)), col = pick(Z_GREEN), fc = pick(P_FLOWER), ac = pick(P_ACC), i, t, p, sd, e;
    for (i = 0; i <= n; i++) { t = i / n; pts.push([px + Math.sin(t * 4.4 + ph) * amp * t, y0 + len * t]); }
    smooth(x, pts); ol(x, lw * 3.6); ol(x, lw * 1.9, col);
    for (i = 2; i < n; i += 2) {
      p = pts[i]; sd = i % 4 ? 1 : -1;
      leaf(x, { x: p[0], y: p[1], a: Math.PI / 2 + sd * 1.05, len: r0 * 1.8, wid: r0 * .5, bend: sd * .15, col: col, lw: lw * .8 });
      if (i % 6 === 0) starFlower(x, p[0] - sd * r0 * 1.3, p[1], r0 * 1.15, [fc, ac], lw * .7);
      else if (i % 6 === 4) flowerB(x, p[0] - sd * r0 * 1.2, p[1], r0 * .75, pick(P_FLOWER), lw * .7);
    }
    e = pts[n]; t = Math.floor(R() * 4);
    if (t === 0) bloom(x, e[0], e[1] + r0 * 1.3, r0 * 2.3, fc, lw);
    else if (t === 1) hibiscus(x, e[0], e[1] + r0 * 1.3, r0 * 2.2, [fc, pick(Z_MAG)], lw);
    else if (t === 2) orchid(x, e[0], e[1] + r0 * 1.2, r0 * 2.2, [fc, ac], lw);
    else dahlia(x, e[0], e[1] + r0 * 1.3, r0 * 2.1, [fc, ac], lw);
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

  // Wolke im Stil der El-Dorado-Zeichnungen (Hugo 27.11., 11:50; eigene Formen): runde Blöcke neben- und übereinander, jede Form
  // mit heller dicker Kontur, innen wiederholt sich die Form, dazu kleine Zeichen. Farben wie bisher (Weiss → Rosa, Flieder, Pfirsich)
  function glyphCloud(x, cx, cy, s, o) {
    var n = o.n || 4, B = [], ws = [], tot = 0, ct = Math.max(1.5, s * .062), i, k, bx;
    for (i = 0; i < n; i++) { k = 1 - Math.abs(i - (n - 1) / 2) / n * 1.1; ws.push([s * rr(.8, 1.35), s * rr(.5, 1.1) * (.5 + .5 * k)]); tot += ws[i][0] * .76; }
    tot += ws[n - 1][0] * .24; bx = cx - tot / 2;
    for (i = 0; i < n; i++) { B.push([bx, cy - ws[i][1], ws[i][0], ws[i][1]]); bx += ws[i][0] * .76; }
    for (i = n - 2; i >= 0; i--) if (R() < .5 && B.length < 8) {   // kleine Blöcke obenauf (liegen dahinter)
      var a = B[i], b = B[i + 1], w2 = s * rr(.5, .8), h2 = s * rr(.4, .6);
      B.unshift([(a[0] + a[2] / 2 + b[0] + b[2] / 2) / 2 - w2 / 2 + rr(-.1, .1) * s, Math.min(a[1], b[1]) - h2 * .72, w2, h2 * 1.3]); i++;
    }
    if (R() < .5) { var c = B[B.length - 1 - Math.floor(R() * Math.min(n, 2))], w3 = s * rr(.55, .8), h3 = s * rr(.3, .42); B.push([c[0] + rr(-.25, .45) * c[2], cy - h3, w3, h3]); }   // kleiner Block davor
    B.forEach(function (q) {
      var m = Math.min(q[2], q[3]), r0 = m * rr(.3, .42), rs = [r0 * rr(.7, 1.35), r0 * rr(.7, 1.35), r0 * rr(.6, 1.1), r0 * rr(.6, 1.1)], g = x.createLinearGradient(0, q[1], 0, q[1] + q[3]), kind, j, iw = q[2] - ct * 5, ih = q[3] - ct * 5, mx = q[0] + q[2] / 2, my = q[1] + q[3] / 2;
      g.addColorStop(0, o.c0); g.addColorStop(1, o.c2);
      x.save(); x.translate(mx, my); x.rotate(rr(-.035, .035)); x.translate(-mx, -my);
      rrect4(x, q[0], q[1], q[2], q[3], rs); ol(x, o.lw * 2, o.line);
      rrect4(x, q[0], q[1], q[2], q[3], rs); x.fillStyle = g; x.fill();
      x.save(); x.clip(); rrect4(x, q[0], q[1], q[2], q[3], rs); x.lineJoin = 'round'; x.lineWidth = ct * 2; x.strokeStyle = o.rim; x.stroke(); x.restore();   // helle dicke Kontur
      if (iw < ct * 3 || ih < ct * 3) { x.restore(); return; }
      rrect4(x, mx - iw / 2, my - ih / 2, iw, ih, rs.map(function (v) { return Math.max(2, v - ct * 2.5); })); x.fillStyle = o.inF; x.fill(); ol(x, ct * .85, o.rim);   // innen wiederholt sich die Form
      kind = Math.floor(R() * 4);
      if (kind === 0 && m > ct * 11) { polyline(x, spiralPts(mx, my, Math.min(iw, ih) * .3, 1.25, R() * 6, R() < .5 ? 1 : -1)); ol(x, ct * .8, o.rim); }
      else if (kind === 1 && iw > ct * 9 && ih > ct * 4) for (j = 0; j < 3; j++) { rrect(x, mx + (j - 1) * iw * .27 - iw * .09, my - ih * .2, iw * .18, ih * .4, ct); ol(x, ct * .65, o.rim); }
      else if (kind === 2 && iw > ct * 8 && ih > ct * 8) { rrect(x, mx - iw / 2 + ct * 2.4, my - ih / 2 + ct * 2.4, iw - ct * 4.8, ih - ct * 4.8, Math.max(2, r0 - ct * 5)); ol(x, ct * .7, o.rim); }
      x.restore();
    });
  }
  function cloudLook(s) { var v = pick([['#fff3f6', '#f7c4d8'], ['#f2f0ff', '#cfd0fb'], ['#fff7ec', '#ffd6ac'], ['#f6efff', '#e0c8f8'], ['#eefaff', '#bfe6fb'], ['#eefaff', '#bfe6fb']]);
    return { n: 3 + Math.floor(R() * 3), lw: Math.max(1, s * .03), line: 'rgba(86,104,206,.75)', rim: '#ffffff', inF: 'rgba(255,255,255,.38)', c0: v[0], c2: v[1] }; }
  // Sonne (eigene Gestaltung; Hugo 27.11., 13:19: noch mehr Ornamente, gern nach heiliger Geometrie und Goldenem Schnitt):
  // Die Ringe verkleinern sich nach innen im Goldenen Schnitt (jeder Radius = der vorige durch √φ), die Zahlen der Teile stammen
  // aus der Fibonacci-Reihe (8, 13, 21, 34), und in der Mitte liegt die «Saat des Lebens» aus sieben Kreisen.
  function sun(x, cx, cy, r, lw) {
    var L = '#a8431a', A = 1.22, q = Math.sqrt(PHI), R1 = A / q, R2 = A / PHI, R3 = R2 / q, R4 = R2 / PHI, R5 = R4 / q, rho = r * R5 / 2 * .97, i, a;
    function at(ang, fn) { x.save(); x.translate(cx, cy); x.rotate(ang); fn(); x.restore(); }
    function ring(rad, col) { x.beginPath(); x.arc(cx, cy, r * rad, 0, 7); x.fillStyle = col; x.fill(); ol(x, lw, L); }
    for (i = 0; i < 26; i++) at(i / 26 * 6.2832 - Math.PI / 2, function () {   // 13 Flammen, dazwischen 13 Blätter mit Perle
      if (i % 2 === 0) {
        x.beginPath(); x.moveTo(r * 1.18, -r * .13); x.quadraticCurveTo(r * 1.6, -r * .15, r * 1.95, 0); x.quadraticCurveTo(r * 1.6, r * .15, r * 1.18, r * .13); x.closePath();
        x.fillStyle = i % 4 ? '#ffd75e' : '#f7c948'; x.fill(); ol(x, lw * .8, L);
        x.beginPath(); x.moveTo(r * 1.28, 0); x.lineTo(r * 1.7, 0); ol(x, lw * .6, '#f59a3a');
      } else {
        stone(x, r * 1.42, 0, r * .34, r * .17, '#f59a3a', { lw: lw * .8, line: L, kind: 9, r: .48, j: 0 });
        x.beginPath(); x.arc(r * 1.7, 0, r * .05, 0, 7); x.fillStyle = '#2bb6a0'; x.fill(); ol(x, lw * .5, L);
      }
    });
    ring(A, '#e85a2a');
    for (i = 0; i < 21; i++) at(i / 21 * 6.2832, function () { stone(x, r * (A + R1) / 2, 0, r * .2, r * .27, i % 2 ? '#f7c948' : '#f59a3a', { lw: lw * .7, line: L, kind: i % 3 ? 9 : 1, c2: '#2bb6a0', r: .42, j: 0 }); });   // Kranz aus 21 Steinen
    ring(R1, '#f7c948');
    for (i = 0; i < 34; i++) { a = i / 34 * 6.2832; x.beginPath(); x.arc(cx + Math.cos(a) * r * (R1 + R2) / 2, cy + Math.sin(a) * r * (R1 + R2) / 2, r * .042, 0, 7); x.fillStyle = i % 2 ? '#2bb6a0' : '#fff6c8'; x.fill(); ol(x, lw * .45, L); }   // 34 Perlen
    ring(R2, '#ffd75e');
    for (i = 0; i < 13; i++) {   // 13 Mandelblätter
      a = i / 13 * 6.2832 - Math.PI / 2;
      lens(x, cx, cy, a, r * R4 * 1.02, r * R2 * .97, r * .052, i % 2 ? '#f59a3a' : '#f07a2a', lw * .6, L);
      x.beginPath(); x.moveTo(cx + Math.cos(a) * r * (R4 + (R2 - R4) * .3), cy + Math.sin(a) * r * (R4 + (R2 - R4) * .3)); x.lineTo(cx + Math.cos(a) * r * (R4 + (R2 - R4) * .72), cy + Math.sin(a) * r * (R4 + (R2 - R4) * .72)); ol(x, lw * .5, '#ffe9a0');
    }
    ring(R4, '#f59a3a');
    for (i = 0; i < 8; i++) { a = i / 8 * 6.2832; x.beginPath(); x.arc(cx + Math.cos(a) * r * (R4 + R5) / 2, cy + Math.sin(a) * r * (R4 + R5) / 2, r * .03, 0, 7); x.fillStyle = '#2bb6a0'; x.fill(); }   // 8 Punkte
    ring(R5, '#fff0a8');
    x.save(); x.beginPath(); x.arc(cx, cy, r * R5, 0, 7); x.clip();   // Saat des Lebens
    for (i = 0; i < 7; i++) { a = i * 1.0472; x.beginPath(); x.arc(cx + (i ? Math.cos(a) * rho : 0), cy + (i ? Math.sin(a) * rho : 0), rho, 0, 7); ol(x, lw * .7, '#f07a2a'); }
    x.restore();
    x.beginPath(); x.arc(cx, cy, r * R5, 0, 7); ol(x, lw * .8, L);
  }
  // Feld um die Sonne: 144 Steine und Ringe, jeder 137.5° (Goldener Winkel) weiter und etwas weiter aussen – wie die Kerne einer
  // Sonnenblume. So entstehen von selbst die Spiralarme, die weit in den Himmel laufen, kleiner und blasser werden. Dazu Perlenkreise
  // in Abständen des Goldenen Schnitts (55, 89 und 144 Perlen).
  function sunField(x, cx, cy, r, lw) {
    var N = 144, n, t, a, d, sz, k, i, m;
    for (k = 2; k <= 4; k++) {
      d = r * 1.22 * Math.pow(PHI, k); m = [55, 89, 144][k - 2];
      for (i = 0; i < m; i++) { a = i / m * 6.2832; x.beginPath(); x.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * (.04 - (k - 2) * .008), 0, 7); x.fillStyle = 'rgba(255,206,100,' + (.75 - (k - 2) * .22) + ')'; x.fill(); }
    }
    for (n = N; n >= 1; n--) {
      t = n / N; a = n * GA; d = r * (2.2 + 6.4 * Math.pow(t, .7)); sz = r * (.3 - .19 * t);
      x.save(); x.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d); x.rotate(a); x.globalAlpha = 1 - t * .8;
      if (n % 3 === 0) {
        x.beginPath(); x.arc(0, 0, sz * .42, 0, 7); x.fillStyle = '#fff3c4'; x.fill(); ol(x, lw * (.7 - t * .3), 'rgba(168,74,26,.7)');
        x.beginPath(); x.arc(0, 0, sz * .16, 0, 7); x.fillStyle = '#2bb6a0'; x.fill();
      } else stone(x, 0, 0, sz * 1.15, sz * .86, n % 3 === 1 ? '#f7c948' : '#f59a3a', { lw: lw * (.85 - t * .45), line: 'rgba(168,74,26,.75)', kind: sz > lw * 7 ? 1 : 9, c2: n % 2 ? '#e85a2a' : '#2bb6a0', r: .42, j: 0 });
      x.restore();
    }
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
      P_FLOWER = ['#e0409a', '#ff5a8a', '#f07a2a', '#ffd75e', '#c58cf0', '#ff7ab8', '#f6f2ff', '#d0379a', '#ff6a4a', '#6aa8ff', '#9b6ff0', '#ffb347'],
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
      camRef = 0, camT = 0, cam = 0, QF = 1, veil = null, veilW = 0, veilV = 0, veilQ = -1, openHW = function () { return 1e6; },
      HX = 0, SR = 30, HOR = .385, SHO = .427, LT = { title: 0, lead: 0, band: 0, capB: 0, capHW: 0, contact: 0, longB: 0, btnHW: 0 },
      SUN = [.5, .325];   // Sonne im Schlussbild (Anteil von Breite und Höhe): tief über dem See, zwischen Slogan und Rad (wird aus dem Layout berechnet)
  // Das Bild richtet sich nach dem Text: wo Slogan, Rad und Kontakte wirklich stehen (auf jedem Gerät anders), dort liegen Sonne, See und Unterholz
  function topOf(el) { var y = 0; while (el && el !== root) { y += el.offsetTop; el = el.offsetParent; } return y; }
  function measureLayout() {
    var lead = root.querySelector('.ak-lead'), con = root.querySelector('.ak-contact'), ttl = root.querySelector('.ak-title'), rh = items.length ? (items[0].offsetHeight || 40) : 40;
    LT.title = ttl ? topOf(ttl) : H * .1;
    LT.lead = lead ? topOf(lead) + lead.offsetHeight : H * .27;
    LT.band = wheel ? topOf(wheel) + (wheel.clientHeight - rh) / 2 : H * .43;
    LT.capB = cap ? topOf(cap) + cap.offsetHeight : H * .62;
    LT.capHW = cap ? Math.min(cap.offsetWidth, W * .94) / 2 : W * .45;
    LT.contact = con ? topOf(con) : 0;
    var lg = root.querySelector('.ak-long'), cw = 0, a = 1e9, b = -1e9, k;
    if (con) { for (k = 0; k < con.children.length; k++) { a = Math.min(a, con.children[k].offsetLeft); b = Math.max(b, con.children[k].offsetLeft + con.children[k].offsetWidth); } cw = Math.max(0, b - a); }
    LT.longB = lg ? topOf(lg) + lg.offsetHeight : 0;
    LT.btnHW = clamp(Math.max(cw, lg ? Math.min(lg.offsetWidth, W * .56) : 0) / 2, W * .16, W * .3);   // halbe Breite von Knöpfen und Link: so viel bleibt unten frei
    if (!(LT.band - LT.lead > 50 && LT.band < H * .7)) { LT.lead = H * .27; LT.band = H * .43; }
    if (!(LT.capB > LT.band)) LT.capB = LT.band + H * .2;
    if (!(LT.contact > LT.capB - 4 && LT.contact < H)) LT.contact = Math.min(H * .9, LT.capB + H * .04);
    if (!(LT.longB > LT.contact && LT.longB < H * 1.05)) LT.longB = Math.min(H * .96, LT.contact + H * .14);
  }
  // weiches Feld hinter der Mitte des Rads und der Beschreibung: einmal gemalt (weiche Kanten ringsum), im Takt ändert sich nur die Deckkraft
  function placeVeil() {
    if (!AK.veil) return;
    measureLayout();
    var F = 46, y0 = LT.band - 14, y1 = LT.contact - 4, half = Math.min(W * .5 - 2, Math.max(wheel ? wheel.clientWidth : 0, cap ? cap.offsetWidth : 0, 240) / 2 + 20), vw = half * 2 + F * 2, vh = y1 - y0 + F * 2, c;
    if (veil && veil.parentNode) veil.parentNode.removeChild(veil);
    c = canvas(vw, vh, .5);
    c.x.shadowColor = 'rgb(247,245,252)'; c.x.shadowBlur = 22; c.x.shadowOffsetX = 5000; c.x.fillStyle = '#fff';
    rrect(c.x, F - 10000, F, half * 2, y1 - y0, 46); c.x.fill();
    veil = c.c; veil.className = 'ak-veil'; veil.setAttribute('aria-hidden', 'true');
    veil.style.cssText = 'left:' + (W / 2 - vw / 2) + 'px;top:' + (y0 - F) + 'px;width:' + vw + 'px;height:' + vh + 'px;';
    veil._y = [y0 + 8, (y0 + y1) / 2, y1 - 8]; veilW = half * .78; veilQ = -1;
    root.insertBefore(veil, root.querySelector('.ak-inner'));
  }
  // Ein Streifen = eine Tiefen-Ebene. y = 0 ist die Oberkante des Schlussbilds, der Weg der Kamera liegt bei y < 0.
  // Gemalt wird in Kacheln; jedes Teil (add) kennt seine Höhe und wird nur in den Kacheln gemalt, die es berührt.
  function strip(i, f, d, pk, dprFin, dprFly, fx) {   // f = Tempo nach oben/unten, fx = Tempo seitlich (ohne Angabe gleich f)
    fx = fx || f;
    var mg = .08, mx = W * mg + XR * fx, pan = pk * H * AK.scrollPan, w = W + mx * 2, fh = H * (1 + mg * 2) + pan * 2 + HX, tf = Math.round(camT * f);   // seitlich so viel breiter, wie die Ebene beim Verschieben wandert
    var el = document.createElement('div'); el.className = 'ak-layer'; el.style.width = w + 'px'; el.style.height = (fh + tf) + 'px';
    var S = { el: el, f: f, fx: fx, d: d, w: w, fh: fh, tf: tf, ox: -mx, oy: -H * mg - pan - tf, pan: pan, vy: H * mg + pan, items: [], tiles: [], sw: [] };
    S.X = function (fr) { return mx + fr * W; };
    S.Y = function (c, fr) { return S.vy - c * camRef * f + fr * H; };   // Höhe im Streifen, die beim Fortschritt c (1 = oben, 0 = gelandet) am Bildschirm bei fr liegt
    S.add = function (y0, y1, fn, seed) { S.items.push([y0, y1, fn, seed == null ? AK.seed * 7919 + i * 100003 + S.items.length * 31 + 5 : seed]); };
    S.insert = function (pos, y0, y1, fn, seed) { S.items.splice(pos, 0, [y0, y1, fn, seed]); };   // nachträglich dazwischen malen; die Zufallszahlen der anderen Teile bleiben, wie sie sind
    S.fill = function (y, col) { var d = document.createElement('div'); d.style.cssText = 'position:absolute;left:0;top:' + (y + tf) + 'px;width:' + w + 'px;height:' + Math.max(0, fh - y) + 'px;background:' + col; el.appendChild(d); };   // einfarbig bis zum unteren Rand
    // Teil, das sich wiegt: eigenes kleines Bild auf dem Streifen, dreht um seinen Fuss (top = es hängt und dreht um die Oberkante)
    S.sway = function (px, py, r, top, fn, hw) { S.sw.push([px, py, r, top, fn, AK.seed * 104729 + i * 7001 + S.sw.length * 13 + 3, hw || r]); };   // hw: halbe Breite (schmal für Lianen)
    S.build = function () {
      var edges = [-tf], y = -tf, k, n; while (y < 0) { y = Math.min(0, y + 1300); edges.push(y); } edges.push(fh);
      for (k = 0; k < edges.length - 1; k++) {
        var a = edges[k], hh = edges[k + 1] - a + (k < edges.length - 2 ? 1 : 0), todo = [], lo = 1e9, hi = -1e9, pd = Math.max(24, U * .15);
        for (n = 0; n < S.items.length; n++) if (S.items[n][1] >= a && S.items[n][0] <= a + hh) { todo.push(S.items[n]); lo = Math.min(lo, S.items[n][0]); hi = Math.max(hi, S.items[n][1]); }
        if (!todo.length) continue;
        lo = Math.max(a, Math.floor(lo - pd)); hi = Math.min(a + hh, Math.ceil(hi + pd));   // nur so hoch, wie die Teile reichen (spart Speicher)
        var c = canvas(w, hi - lo, a < 0 ? dprFly : dprFin), x = c.x;
        c.c.style.cssText = 'position:absolute;left:0;top:' + (lo + tf) + 'px;width:' + w + 'px;height:' + (hi - lo) + 'px';
        x.translate(0, -lo);
        for (n = 0; n < todo.length; n++) { R = rng(todo[n][3]); x.save(); todo[n][2](x); x.restore(); }
        paper(x, 0, lo, w, hi - lo, i > 0 && i < 5 ? 1 : .45);   // Himmel und Berge bleiben glatter
        el.appendChild(c.c); S.tiles.push([c.c, lo]);
      }
      S.sw.forEach(function (q) {
        var r = q[2], hw = q[6], o = q[3] ? 4 : r, c = canvas(hw * 2, r * 2, Math.min(dprFin, 1.5)), P = rng(q[5] + 1);
        R = rng(q[5]); c.x.translate(hw - q[0], o - q[1]); q[4](c.x); paper(c.x, q[0] - hw, q[1] - o, hw * 2, r * 2, 1);
        c.c.className = 'ak-sway'; c.c.style.cssText = 'left:' + (q[0] - hw) + 'px;top:' + (q[1] - o + tf) + 'px;width:' + hw * 2 + 'px;height:' + r * 2 + 'px;transform-origin:50% ' + (q[3] ? '4px' : '50%')
          + ';--a:' + ((q[3] ? 1.2 : 1.6) + P() * 1.7).toFixed(2) + 'deg;animation-duration:' + (3.6 + P() * 3.4).toFixed(2) + 's;animation-delay:' + (-P() * 9).toFixed(2) + 's';
        el.appendChild(c.c);
        sways.push(c.c);
      });
    };
    return S;
  }

  // 0 · Himmel, Sonne und Berge im Hintergrund (sie sind von Anfang an zu sehen und bewegen sich kaum), darunter ferne Hügel
  function sceneFar(S, SA, SN, SH) {
    var top = -S.tf, bot = S.fh, w = S.w, vy = S.vy, lw = LW0 * .7, base = vy + H * HOR, sx = S.X(SUN[0]), sy = vy + H * SUN[1], sr = SR;
    S.add(top, bot, function (x) {
      var g = x.createLinearGradient(0, top, 0, bot), span = bot - top;
      function st(y, c) { g.addColorStop(clamp((y - top) / span, 0, 1), c); }
      if (S.tf > H * .2) { st(top, '#f3f1f9'); st(top + (vy - top) * .5, '#bdeaf7'); }
      st(vy - H * .04, '#5cc6f1'); st(vy + H * (HOR - .225), '#8fd8f4'); st(vy + H * (HOR - .085), '#ffe9c2'); st(base, '#ffdcae'); st(bot, '#ffdcae');
      x.fillStyle = g; x.fillRect(0, top, w, span);
      flow(x, -20, w + 20, top + H * .08, base - U * .1, { n: 26, th: U * .02, amp: U * .018, pal: ['rgba(255,255,255,.2)', 'rgba(200,244,255,.2)', 'rgba(255,240,214,.18)'], plain: 1 });
    });
    S.add(sy - sr * 9.6, sy + sr * 9.6, function (x) {
      var g = x.createRadialGradient(sx, sy, 0, sx, sy, sr * 6); g.addColorStop(0, 'rgba(255,252,225,.95)'); g.addColorStop(.25, 'rgba(255,240,180,.5)'); g.addColorStop(1, 'rgba(255,236,180,0)');
      x.fillStyle = g; x.fillRect(sx - sr * 6, sy - sr * 6, sr * 12, sr * 12);
      sunField(x, sx, sy, sr, lw * 1.2);
      sun(x, sx, sy, sr, lw * 1.3);
    });
    // kleine Wolken, die im Bild stehen bleiben (die grossen ziehen als einzelne Teile vorbei)
    [[.8, -.2, .07], [.24, -.34, .06]].forEach(function (c) {
      var s = U * c[2], py = vy + H * c[1];
      S.add(py - s * 1.6, py + s * .4, function (x) { glyphCloud(x, S.X(c[0]), py, s, cloudLook(s)); });
    });
    var m1 = function (px) { var d = clamp(Math.abs(px - sx) / (w * .44), 0, 1); return .1 + .9 * d * d * (3 - 2 * d); },
        m2 = function (px) { var d = clamp(Math.abs(px - sx) / (w * .38), 0, 1); return .07 + .93 * d * d * (3 - 2 * d); },
        hf1 = peaksFn(0, w, mob ? 4 : 7, U * (mob ? .4 : .46), m1), hf2 = peaksFn(0, w, mob ? 5 : 9, U * .2, m2);
    // Jede Bergtiefe liegt auf einer eigenen Ebene mit eigenem Tempo (Hugo 27.11., 14:44: Parallax zwischen den Bergen). Gemalt wird
    // genau wie vorher (gleiche Zufallszahlen); unter jeder Kette füllt ihre unterste Farbe bis zum Rand, damit im Flug nichts durchscheint.
    var TA = onto(SA, S), TN = onto(SN, S), TH = onto(SH, S), sd = AK.seed * 7919 + 5;
    TA.add(base - U * .5, base + 8, function (x) { strata(x, 0, w, base, hf1, 6, ['#f6f3ff', '#e2defc', '#d2cdfa', '#c2c0f6', '#b3b6f3', '#a6aef0'], { lw: lw * .8, line: 'rgba(96,100,205,.6)', wob: U * .006 }); }, sd + 4 * 31);
    SA.fill(base + TA.ay + 4, '#a6aef0');
    TN.add(base - U * .24, base + 8, function (x) { strata(x, 0, w, base, hf2, 6, ['#f0f4ff', '#b9aaf6', '#9c88ee', '#826fe3', '#6b5ed6', '#5955c8'], { lw: lw, line: '#3c3f9e', wob: U * .004 }); }, sd + 5 * 31);
    SN.fill(base + TN.ay + 4, 'linear-gradient(to bottom,#5955c8 0,#7f8be6 ' + Math.round(H * .05) + 'px,#98a2f2 ' + Math.round(H * .12) + 'px)');   // läuft in die Farbe der Hügel aus (Dunst zwischen den Ketten)
    TH.add(base - U * .03, bot + 6, function (x) { hills(x, 0, w, base + U * .012, bot, 11, ['#98a2f2', '#84a2ea', '#6ba6d8', '#52aac0', '#3fa8a6', '#33a28e', '#2f9a78', '#2f9464', '#3a9a52', '#4aa348', '#5aac44'], { lw: lw, line: 'rgba(24,48,120,.55)', amp: U * .012, fq: .02 }); }, sd + 6 * 31);
    SH.fill(bot + TH.ay, '#5aac44');
  }

  // 1 · Horizont der Lichtung: ferner Urwald, der See als goldener Spiegel der Sonne, davor beginnt die Wiese
  function sceneMid(S) {
    var w = S.w, cx = w / 2, vy = S.vy, bot = S.fh, lw = LW0 * .8, yH = vy + H * HOR, ySh = vy + H * SHO, p1 = R() * 6, list = [], px, k;
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
      var q, g = x.createLinearGradient(0, ySh, 0, vy + H * (SHO + .235));
      g.addColorStop(0, '#eef9b4'); g.addColorStop(1, '#c9ec84');
      x.beginPath(); x.moveTo(-14, bot + 14); for (q = -14; q <= w + 14; q += 10) x.lineTo(q, shore(q)); x.lineTo(w + 14, bot + 14); x.closePath();
      x.fillStyle = g; x.fill(); ol(x, lw, 'rgba(40,120,80,.6)'); x.clip();
      flow(x, -30, w + 30, ySh + U * .012, vy + H * (SHO + .255), { n: mob ? 12 : 18, th: U * .012, grow: 1.8, amp: U * .006, pow: 1.3, pal: ['#f4fbc0', '#e2f4a0', '#d6f08e', '#c9ec84'], plain: 1 });
    });
    var mk = S.items.length;   // hier (vor allem, was danach kommt) stehen später die Baobabs
    if (!mob) {   // Computer: eine zweite Reihe Urwald weiter hinten (Tiefe); auf dem Handy braucht der Text die Breite
      var HW1 = W * .232, yT1 = S.Y(.7, 1), q1 = R() * 6, q2 = R() * 6,
          sh = function (y) { var t = clamp((y - yT1) / (U * .7), 0, 1); return t * t * (3 - 2 * t); },
          eL1 = function (y) { return -14 + (cx - HW1 + 14) * sh(y) + (Math.sin(y * .005 + q1) * .03 + Math.sin(y * .016 + q2) * .012) * U * sh(y); },
          eR1 = function (y) { return w + 14 - (cx - HW1 + 14) * sh(y) - (Math.sin(y * .0046 + q2) * .03 + Math.sin(y * .018 + q1) * .012) * U * sh(y); },
          end = function () { return bot; };
      var o1 = { ground: '#1c2158', size: .5, dens: 1.15, lwk: .8, cell: .05, lianas: [{ x0: 2, x1: cx - HW1 - U * .06, yEnd: end }, { x0: cx + HW1 + U * .06, x1: w - 2, yEnd: end }] };
      ground(S, yT1, bot, eL1, eR1, o1); plants(S, yT1, bot, eL1, eR1, o1);
      S.add(yT1, bot + 4, function (x) {
        var q; x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(140,195,238,.2)';
        x.beginPath(); x.moveTo(-14, yT1); for (q = yT1; q <= bot + 4; q += 12) x.lineTo(eL1(q), q); x.lineTo(-14, bot + 4); x.closePath();
        x.moveTo(w + 14, yT1); for (q = yT1; q <= bot + 4; q += 12) x.lineTo(eR1(q), q); x.lineTo(w + 14, bot + 4); x.closePath(); x.fill();
      });
    }
    // ein paar Baobabs mit Lianen hinten auf der Wiese und am fernen Ufer (Hugo 27.11., 14:44); neben der Textspalte, nach hinten kleiner und heller
    (mob ? [[.265, -1, .055, .34], [.725, -1, .05, .34], [.17, .045, .17, .1], [.84, .05, .15, .1]]
         : [[.42, -1, .042, .36], [.365, -1, .065, .3], [.64, -1, .06, .3], [.3, .05, .2, .1], [.705, .055, .17, .1]]).forEach(function (b, n) {
      var px = S.X(b[0]), py = b[1] < 0 ? yH + 2 : ySh + H * b[1], h = H * b[2];
      S.insert(mk + n, py - h * 1.1, py + 6, function (x) { baobab(x, px, py, h, lw, b[3]); }, AK.seed * 7919 + 100003 + 700001 + n * 31);
    });
  }

  // Urwald in zwei Teilen, damit er Tiefe bekommt (Hugo 27.11., 11:50):
  //   ground: dunkler Grund mit Mäanderbändern und langen Lianen – liegt weiter hinten und wandert immer leicht auf einer kleinen Bahn
  //   plants: Pflanzen und Blüten dicht an dicht davor; am Rand wachsen sie in die Öffnung, oben schliessen Kronen ab
  var FLOWERS = [3, 4, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25], KINDS = [0, 0, 0, 0, 1, 1, 2, 9, 9, 7, 7, 5, 8, 26, 26].concat(FLOWERS, [3, 12, 14, 19, 21, 23]), SIZES = [.55, .7, .7, .85, .85, 1, 1, 1.2, 1.5],
      FLOWERS2 = FLOWERS.concat([27, 28, 29, 30, 31, 32, 33, 27, 28, 29, 30, 31, 32, 33]);   // mit den neuen Arten; nur für neu bepflanzte Stellen
  // zeichnet in die Ebene T mit den Koordinaten der Ebene S (beide decken sich, wenn die Kamera unten steht)
  function onto(T, S) {
    var ax = (T.w - S.w) / 2, ay = T.vy - S.vy;
    return { w: S.w, ax: ax, ay: ay, add: function (y0, y1, fn, seed) { T.add(y0 + ay, y1 + ay, function (x) { x.translate(ax, ay); fn(x); }, seed); },
      sway: function (px, py, r, top, fn, hw) { T.sway(px + ax, py + ay, r, top, function (x) { x.translate(ax, ay); fn(x); }, hw); } };
  }
  function ground(T, y0, y1, eL, eR, o) {
    var w = T.w, s = U * (o.cell || .06), ph = s * 14, lw = LW0 * (o.lwk || 1), u = U * (o.size || 1), top = o.topFn, ys = y0 - (top ? s * 2 : 0), y, px;
    for (y = ys; y < y1; y += ph) (function (ya, yb, first) {
      T.add(ya - s, yb + s, function (x) {
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
        T.add(ya, yb + th * 4, function (x) { liana(x, px, ya, yb, th, col, lw, { step: u * .22, x0: Math.max(rg.x0, px - u * .12), x1: Math.min(rg.x1, px + u * .12), inner: R() < .5 ? mix(col, '#ffffff', .4) : 0, bead: rg.bead ? pick(P_ACC) : 0 }); });
      })(px, rg.yEnd(px), U * rr(.012, .026), pick(P_LIANA));
    });
    if (top && o.crowns) for (px = -u * .1; px < w + u * .1; px += u * rr(.2, .34)) plant(T, px, top(px) + u * rr(-.02, .12), pick([0, 0, 9, 7]), lw, u * rr(1, 1.5), -Math.PI / 2);
  }
  function plants(S, y0, y1, eL, eR, o) {
    var w = S.w, lw = LW0 * (o.lwk || 1), u = U * (o.size || 1), top = o.topFn, y, i, px, py, list = [], n, cz = o.calm, qz = [R() * 6, R() * 6], sz, dq, ne = 0;
    function inJ(qx, qy) { return (!top || qy > top(qx)) && (qx < eL(qy) || qx > eR(qy)); }
    function calm(qy) { return cz && qy > cz[0] && qy < cz[1]; }   // neben dem Text bleiben die Pflanzen klein, damit er frei steht
    n = Math.round((w + 20) * (y1 - y0) / (u * u * .085) * (o.dens || 1));
    for (i = 0; i < n; i++) {
      px = rr(-10, w + 10); py = rr(y0, y1); if (!inJ(px, py)) continue;
      if (R() > .62 + .38 * Math.sin(px / u * 1.7 + qz[0]) * Math.sin(py / u * 1.3 + qz[1]) + .3) continue;   // Dichte in Flecken: dazwischen bleiben die Mäanderbänder sichtbar
      sz = pick(SIZES);
      if (calm(py)) { dq = Math.min(Math.abs(px - eL(py)), Math.abs(px - eR(py))); sz = Math.min(sz, cz[2] + dq / (u * .9)); }
      list.push([px, py, pick(KINDS), sz]);
    }
    list.sort(function (a, b) { return a[1] - b[1]; });
    list.forEach(function (p) { plant(S, p[0], p[1], p[2], lw, u * p[3]); });
    for (y = y0; y < y1; y += u * rr(.14, .26) * (calm(y) ? cz[2] * 1.5 : 1)) [0, 1].forEach(function (sd) {
      var e = sd ? eR : eL, ex = e(y), d = (e(y + 6) - e(y - 6)) / 12, a, c = calm(y);
      if (ex < -10 || ex > w + 10 || eR(y) - eL(y) < 6) return;
      a = (sd ? Math.atan2(d, -1) : Math.atan2(-d, 1)) + (sd ? 1 : -1) * (c ? .95 : .45) / (1 + d * d * 4);
      plant(S, ex + (sd ? 1 : -1) * u * .04, y, R() < (cz && y > cz[1] ? .25 : .55) ? 9 : pick(FLOWERS), lw, u * pick([.7, .85, 1, 1.2]) * (c ? cz[2] : 1), a,
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
      else if (k === 10) dahlia(x, px, py, u * rr(.11, .2), [pick(P_FLOWER), pick(P_ACC)], lw);
      else if (k === 11) bell(x, px, py, u * rr(.12, .2), [pick(P_FLOWER), pick(P_ACC)], lw);
      else if (k === 12) lotus(x, px, py, u * rr(.16, .28), [pick(R() < .5 ? Z_MAG : P_FLOWER)], lw);
      else if (k === 13) passion(x, px, py, u * rr(.11, .19), [pick(P_FLOWER), pick(Z_PURP), pick(P_ACC)], lw);
      else if (k === 14) hibiscus(x, px, py, u * rr(.13, .22), [pick(P_FLOWER), pick(Z_MAG)], lw);
      else if (k === 15) cluster(x, px, py - u * .15, u * rr(.25, .42), [pick(P_FLOWER), pick(P_ACC)], lw);
      else if (k === 16) starFlower(x, px, py, u * rr(.12, .22), [pick(P_FLOWER), pick(P_ACC)], lw);
      else if (k === 17) heliconia(x, px, py - u * .2, u * rr(.32, .5), [pick(['#e0402a', '#f07a2a', '#d0379a', '#ff5a8a']), '#ffd75e'], lw);
      else if (k === 18) torch(x, px, py, u * rr(.16, .26), [pick(Z_MAG.concat(['#e0402a'])), pick(['#ff7ab8', '#ff5a8a', '#f59a3a'])], lw);
      else if (k === 19) protea(x, px, py, u * rr(.17, .28), [pick(P_FLOWER), pick(['#fff0c8', '#f6f2ff', '#ffd75e'])], lw);
      else if (k === 20) pincushion(x, px, py, u * rr(.12, .2), [pick(P_FLOWER), pick(P_ACC)], lw);
      else if (k === 21) phiFlower(x, px, py, u * rr(.13, .22), [pick(P_FLOWER), pick(P_ACC), pick(Z_PURP)], lw);
      else if (k === 22) mandala(x, px, py, u * rr(.1, .17), [pick(P_FLOWER), pick(P_ACC)], lw);
      else if (k === 23) orchid(x, px, py, u * rr(.13, .22), [pick(P_FLOWER), pick(['#f6f2ff', '#ffd75e', '#ff7ab8'])], lw);
      else if (k === 24) heartLeaf(x, px, py, u * rr(.13, .2), [pick(['#e0402a', '#d0379a', '#ff5a8a', '#f6f2ff']), '#ffd75e'], lw);
      else if (k === 25) crane(x, px, py, u * rr(.18, .3), [pick(['#f07a2a', '#f2b830', '#ff6a4a']), '#3560c0', pick(Z_GREEN)], lw);
      else if (k === 26) bromeliad(x, px, py + u * .1, u * rr(.26, .42), [pick(Z_MAG.concat(['#e0402a', '#f07a2a'])), '#ffd75e'], lw, z);
      else if (k === 27) fuchsia(x, px, py - u * .1, u * rr(.12, .19), [pick(['#e0409a', '#ff5a8a', '#f6f2ff', '#e0402a']), pick(Z_PURP)], lw);
      else if (k === 28) trumpet(x, px, py - u * .15, u * rr(.16, .26), [pick(['#fff0c8', '#ffb347', '#ff7ab8', '#f6f2ff', '#ffd75e'])], lw);
      else if (k === 29) lily(x, px, py, u * rr(.14, .23), [pick(['#f07a2a', '#ff6a4a', '#ffd75e', '#ff7ab8', '#f6f2ff']), '#8a3a1a'], lw);
      else if (k === 30) rafflesia(x, px, py, u * rr(.13, .2), [pick(['#e0402a', '#d85a28', '#b8288a', '#f07a2a']), '#fff0c8'], lw);
      else if (k === 31) spiralBloom(x, px, py, u * rr(.14, .22), [pick(P_FLOWER), pick(P_ACC)], lw);
      else if (k === 32) spike(x, px, py + u * .1, u * rr(.3, .46), [pick(P_FLOWER), pick(P_ACC)], lw);
      else if (k === 33) glory(x, px, py, u * rr(.11, .18), [pick(['#6aa8ff', '#9b6ff0', '#c58cf0', '#ff7ab8', '#3560c0']), '#ffd75e'], lw);
      else if (k === 7) for (i = 0, c = 2 + Math.floor(R() * 3); i < c; i++) bigLeaf(x, px, py + u * .25, -Math.PI / 2 + (i - (c - 1) / 2) * rr(.45, .8), u * rr(.34, .56), u * rr(.07, .1), (i - (c - 1) / 2) * .22, pick(z), lw);
      else if (k === 8) pearls(x, px, py - u * .2, u * rr(.25, .45), u * .016, pick(P_ACC), lw, rr(-.25, .25));
      else frond(x, { x: px, y: py, a: dirA == null ? R() * 6 : dirA + rr(-.3, .3), spread: rr(1.1, 1.9), n: 6 + Math.floor(R() * 5), len: u * rr(.3, .56), wid: u * rr(.036, .06), droop: rr(.25, .6), cols: z, lw: lw, rib: R() < .35 ? 1 : 0 });
    };
    if (sway) S.sway(px, py, u * .7, 0, fn); else S.add(py - u * .9, py + u * .9, fn);
  }

  // 2 · Urwald und Lichtung: oben schliesst sich das Blätterdach, darunter öffnet es sich im Bogen zur hellen Wiese.
  // SB = Grund mit Bändern und Lianen (weiter hinten), S = Pflanzen und Wiese, SF = einzelne Pflanzen dicht vor der Kamera
  function sceneMain(S, SB, SF) {
    var w = S.w, cx = w / 2, vy = S.vy, bot = S.fh, lw = LW0, HW = mob ? W * .43 : W * .3, yC = S.Y(.58, 1), yA = vy - H * .36, yB = vy + (mob ? clamp(LT.title - H * .02, -H * .02, H * .085) : H * .02), yU = vy + LT.contact - H * .01, yMd = SHO + .14,   // am Handy ist die Öffnung ab dem Titel ganz breit
        yCb = vy - H * .78, yAb = vy - H * .2, p1 = R() * 6, p2 = R() * 6, p3 = R() * 6, p4 = R() * 6, i, end = function () { return bot; },
        size = mob ? .7 : .82, TB = onto(SB, S), TF = onto(SF, S);
    // Öffnung der Lichtung, wie ein Fenster durch den Urwald (Hugo 13:21): oben ein spitzer Bogen, neben dem Text ein schmaler Rahmen,
    // ab den Kontakten wächst unten das Unterholz mit seinen Blüten wieder herein
    function hwOf(y, a) {
      if (y <= a) return 0;
      var t = clamp((y - a) / (yB - a), 0, 1), f = clamp((y - yU) / (H * .24), 0, 1);
      return Math.max(0, HW * Math.pow(t, 1.5) - Math.pow(f, 1.2) * W * (mob ? .3 : .17));
    }
    function hw(y) { return hwOf(y, yA); }
    function hwB(y) { return hwOf(y, yAb); }   // der Grund dahinter schliesst etwas tiefer: man sieht ihn als zweiten Bogen
    function edge(h, sd, pa, pb) { return function (y) { var v = h(y), k = Math.min(1, v / (U * .25)); return cx + sd * (v + (Math.sin(y * (sd < 0 ? .006 : .0052) + pa) * .03 + Math.sin(y * (sd < 0 ? .017 : .019) + pb) * .012) * U * k); }; }
    var eL = edge(hw, -1, p1, p2), eR = edge(hw, 1, p2, p1), eLb = edge(hwB, -1, p1, p2), eRb = edge(hwB, 1, p2, p1);
    function archYb(px) { var d = Math.abs(px - cx) / HW; return d >= 1 ? bot : yAb + Math.pow(d, 1 / 1.5) * (yB - yAb); }
    function archY(px) { var d = Math.abs(px - cx) / HW; return d >= 1 ? bot : yA + Math.pow(d, 1 / 1.5) * (yB - yA); }
    function topFn(px) { return yC + (Math.sin(px * .011 + p3) * .05 + Math.sin(px * .027 + p4) * .025) * U; }
    function topB(px) { return yCb + (Math.sin(px * .009 + p4) * .05 + Math.sin(px * .023 + p3) * .025) * U; }
    function yN(px) { return vy + H * yMd + Math.cos((px - cx) / w * Math.PI * 2) * U * .018 + Math.sin(px * .011 + p3) * U * .01; }
    openHW = function (yr) { var y = vy + yr; return y < yC - U * .3 ? 1e6 : Math.min(hw(y), hwB(y)); };   // freie halbe Breite der Öffnung (für den Lese-Schleier)
    // nahe Wiese: helle fliessende Bänder, in der Mitte ruhig (dort steht der Text)
    S.add(vy + H * (yMd - .07), bot + 4, function (x) {
      var px, py, k, t, s, g = x.createLinearGradient(0, vy + H * yMd, 0, bot);
      g.addColorStop(0, '#c6ea80'); g.addColorStop(.5, '#b0e170'); g.addColorStop(1, '#93d463');
      x.beginPath(); x.moveTo(-14, bot + 14); for (px = -14; px <= w + 14; px += 10) x.lineTo(px, yN(px)); x.lineTo(w + 14, bot + 14); x.closePath();
      x.fillStyle = g; x.fill(); ol(x, lw * .7, 'rgba(60,150,80,.34)'); x.clip();
      flow(x, -30, w + 30, vy + H * (yMd + .035), bot + U * .05, { n: mob ? 14 : 22, th: U * .03, grow: 1.5, amp: U * .012, pow: 1.25, pal: ['#d2ee8a', '#c4e87a', '#b8e272', '#a8dc6a', '#bfe676'], plain: 1 });
      flow(x, -30, w + 30, vy + H * (yMd + .055), bot + U * .05, { n: mob ? 7 : 11, th: U * .004, grow: 1, amp: U * .012, pow: 1.2, pal: ['rgba(250,255,214,.7)', 'rgba(70,160,80,.3)'], plain: 1 });
      for (k = 0; k < (mob ? 26 : 60); k++) {
        px = rr(0, w); py = rr(vy + H * (yMd + .055), bot); t = clamp((py - vy - H * yMd) / (bot - vy - H * yMd), 0, 1); s = U * (.012 + .03 * t);
        if (py < yU + H * .15 && Math.abs(px - cx) < HW * (mob ? .94 : .62) && (mob || R() < .82)) continue;   // in der Texthöhe bleibt die Mitte frei
        if (R() < .3) flowerB(x, px, py, s, pick(P_FLOWER), lw * .6);
        else if (R() < .35) starFlower(x, px, py, s * 1.3, [pick(P_FLOWER), '#ffd75e'], lw * .6);
        else frond(x, { x: px, y: py, a: -Math.PI / 2, spread: 1.5, n: 5, len: s * 2.4, wid: s * .34, droop: .3, cols: ['#4fae3f', '#2f9a4a', '#6fbf3a'], lw: lw * .6, rib: 0 });
      }
    });
    // hinten: Grund, Bänder, Lianen
    ground(TB, yCb, bot, eLb, eRb, { ground: '#161a48', size: size, topFn: topB, crowns: 1,
      lianas: [{ x0: 2, x1: cx - HW - U * .05, yEnd: end }, { x0: cx + HW + U * .05, x1: w - 2, yEnd: end },
        { x0: cx - HW * .92, x1: cx + HW * .92, yEnd: function (px) { return Math.min(archYb(px) + U * rr(.02, .16), vy + H * .04); }, bead: 1 }] });
    // davor: Pflanzen und Blüten
    plants(S, yC, bot, eL, eR, { size: size, dens: 1.15, topFn: topFn, calm: [vy - H * (mob ? .22 : .03), yU + H * .03, mob ? .3 : .75], sway: [vy - H * .06, mob ? 4 : 1] });   // am Handy steht der Titel ganz oben: auch dort bleiben die Randpflanzen klein
    // Lianen und Ranken hängen vom Bogen in die Lichtung und wiegen sich; viele tragen Blüten (Hugo 13:21).
    // Über dem Titel bleiben sie kurz, aussen neben dem Text dürfen sie lang herunterhängen.
    for (i = 0; i < (mob ? 8 : 18); i++) (function (i) {
      var out = i % 3 !== 2, sd = i % 2 ? 1 : -1, px = cx + sd * HW * (out ? rr(mob ? .95 : .84, 1.05) : rr(.08, .8)), y0 = archY(px) - U * .04,
          len = out ? Math.min(U * rr(.45, 1.15), vy + LT.band + H * rr(0, .1) - y0) : Math.min(U * rr(.25, .6), vy + Math.max(0, LT.lead - H * (mob ? .26 : .2)) - y0), amp = U * rr(.014, .03), fl = R() < .68, r0 = Math.max(7, Math.min(len * .05, U * .034)), fn;
      if (len < U * .12) return;
      fn = fl ? function (x) { flowerVine(x, px, y0, len, amp, lw * .9); } : function (x) { vine(x, px, y0, len, pick(Z_GREEN), lw * .9, P_ACC); };
      if (AK.sway && y0 + len > vy - H * .1) S.sway(px, y0, (len + r0 * 4 + 16) / 2, 1, fn, amp + r0 * 3.6 + 16); else S.add(y0 - 4, y0 + len + r0 * 4 + 12, fn);
    })(i);
    // vorn: einzelne grosse Pflanzen dicht vor der Kamera. Sie liegen nur über dem dichten Urwald, nie frei vor Himmel oder Lichtung
    var nf = Math.round(w * H * .6 / Math.pow(U * size * 1.3, 2) / .42), fl2 = [];
    for (i = 0; i < nf; i++) fl2.push([rr(-10, w + 10), vy + H * rr(-1.3, -.7), pick([0, 1, 9, 7, 3, 10, 13, 14, 16, 12]), rr(1.1, 1.6)]);
    fl2.sort(function (a, b) { return a[1] - b[1]; });
    fl2.forEach(function (q) { plant(TF, q[0], q[1], q[2], lw * 1.15, U * size * q[3]); });

    // ---- unten links und rechts auffüllen (Hugo 27.11., 14:44) ----
    // Die nahe Wiese deckte unten die dunkle Urwaldwand zu: man sah ihre Kante, und daneben reichte die Wiese bis zum Bildrand.
    // Jetzt steht die Wand auch vor der Wiese, in den unteren Ecken reicht der Urwald weiter herein (so weit Knöpfe, Link und Menü
    // es zulassen), und dort wachsen zusätzliche Pflanzen und viele Blüten. Eigene Zufallszahlen: alles Bisherige bleibt, wie es war.
    R = rng(AK.seed + 41);
    var t1 = vy + LT.capB + H * .005, t2 = vy + LT.contact - H * .012, t3 = vy + LT.longB + H * .012, t4 = vy + H,
        hMid = Math.max(LT.btnHW + Math.min(W * .085, 60), mob ? 0 : HW * .62), hMin = Math.max(W * .14, 62), g1 = R() * 6, g2 = R() * 6,
        tS = hMid >= LT.capHW + W * .03 ? Math.min(t1, vy + LT.band + H * .1) : t1,   // wo neben der Beschreibung Platz ist, wächst der Urwald schon früher und sanfter herein
        yW0 = vy + H * yMd - U * .05, sW = U * .06, uF = U * size, seedW = AK.seed * 7919 + 3 * 100003 + 900001, lst = [], nW = 0, yy, nF, sz, dq, px, py, ke = 0;
    function sm(a, b, y) { var t = clamp((y - a) / Math.max(1, b - a), 0, 1); return t * t * (3 - 2 * t); }
    function hwT(y) { return y < t2 ? HW + (hMid - HW) * sm(tS, t2, y) : hMid + (hMin - hMid) * sm(t3, t4, y); }
    function wb(y) { return (Math.sin(y * .011 + g1) * .02 + Math.sin(y * .027 + g2) * .01) * U * sm(tS, tS + U * .12, y); }
    function wL(y) { return y < tS ? eL(y) : Math.max(eL(y), cx - hwT(y) + wb(y)); }
    function wR(y) { return y < tS ? eR(y) : Math.min(eR(y), cx + hwT(y) - wb(y)); }
    for (yy = yW0; yy < bot; yy += sW * 14) (function (ya, yb, n) {   // die Wand: dunkler Grund mit Bändern, gleich nach der Wiese gemalt (unter allen Pflanzen)
      S.insert(1 + n, ya - sW, yb + sW, function (x) {
        var q;
        x.beginPath();
        x.moveTo(-14, ya); for (q = ya; q <= yb + 1; q += 8) x.lineTo(wL(q), q); x.lineTo(wL(yb + 1), yb + 1); x.lineTo(-14, yb + 1); x.closePath();
        x.moveTo(w + 14, ya); for (q = ya; q <= yb + 1; q += 8) x.lineTo(wR(q), q); x.lineTo(wR(yb + 1), yb + 1); x.lineTo(w + 14, yb + 1); x.closePath();
        x.fillStyle = '#161a48'; x.fill();
        pipes(x, -14, ya, w + 14, yb, sW, null, { lw: lw * .8, line: INK, fill: .6, vert: .74, len: 10, acc: P_ACC, dark: .18, palAt: zoneAt, test: function (qx, qy) { return qx < wL(qy) - sW * .4 || qx > wR(qy) + sW * .4; } });
      }, seedW + n * 31);
    })(yy, Math.min(bot, yy + sW * 14), nW++);
    nF = Math.round((w + 20) * (bot - tS) / (uF * uF * .085) * 1.3);
    for (i = 0; i < nF; i++) {   // Pflanzen und Blüten in den Ecken: zur Kante hin klein, damit Knöpfe und Text frei bleiben
      px = rr(-10, w + 10); py = rr(tS - H * .02, bot);
      dq = px < cx ? wL(py) - px : px - wR(py); if (dq < 0) continue;
      sz = Math.min(pick([.6, .75, .9, 1.05, 1.2]), (dq + U * .045) / (uF * .5)); if (sz < .28) continue;
      lst.push([px, py, R() < .64 ? pick(FLOWERS2) : pick([0, 0, 1, 9, 7, 26, 5]), sz]);
    }
    lst.sort(function (a, b) { return a[1] - b[1]; });
    lst.forEach(function (q) { plant(S, q[0], q[1], q[2], lw, uF * q[3]); });
    for (yy = tS; yy < bot; yy += uF * rr(.07, .12)) [0, 1].forEach(function (sd) {   // an der neuen Kante: kleine Wedel und Blüten wachsen in die Öffnung, einige wiegen sich
      var e = sd ? wR : wL, ex = e(yy), d = (e(yy + 6) - e(yy - 6)) / 12, low = yy > t3,
          a = (sd ? Math.atan2(d, -1) : Math.atan2(-d, 1)) + (sd ? 1 : -1) * (low ? .6 : .95) / (1 + d * d * 4);
      if (ex < -10 || ex > w + 10) return;
      plant(S, ex + (sd ? 1 : -1) * uF * .05, yy, R() < .5 ? 9 : pick(FLOWERS2), lw, uF * (low ? .5 : .3) * rr(.8, 1.2), a, !!(AK.sway && ke++ % (mob ? 5 : 3) === 0));
    });
    // einige der neuen Blüten auch oben im dichten Urwald (dort, wo die Kamera durchfliegt; das Schlussbild bleibt, wie es ist)
    nF = Math.round((w + 20) * (vy - H * .3 - yC) / (uF * uF * .085) * .16);
    for (i = 0, lst = []; i < nF; i++) { px = rr(-10, w + 10); py = rr(yC + uF * .3, vy - H * .3); if (py > topFn(px) + uF * .2 && (px < eL(py) - uF * .1 || px > eR(py) + uF * .1)) lst.push([px, py, pick([27, 28, 29, 30, 31, 32, 33]), pick([.8, 1, 1.2])]); }
    lst.sort(function (a, b) { return a[1] - b[1]; });
    lst.forEach(function (q) { plant(S, q[0], q[1], q[2], lw, uF * q[3]); });
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
      flyer(cw, chh, d[4], d[0], d[1] * W, d[2], function (x) { glyphCloud(x, cw / 2, chh * .86, s, cloudLook(s)); }, vx);
    });
  }
  function flyLeaves() {   // grosse Wedel ziehen kurz vor der Landung dicht an der Kamera vorbei
    [[.3, 0, .5, 2.1], [.25, 1, .4, 2.4], [.18, 0, .6, 2], [.13, 1, .5, 2.6], [.08, 0, .35, 2.2]].forEach(function (d) {
      var s = U * rr(.9, 1.3), z = pick([Z_PURP, Z_TEAL, Z_GREEN, Z_MAG, Z_BLUE]);
      flyer(s, s, d[3], d[0], d[1] ? W - s * .1 : s * .1, d[2], function (x, w, h) {
        frond(x, { x: d[1] ? w * .97 : w * .03, y: h * .5, a: d[1] ? Math.PI : 0, spread: 2.2, n: 9, len: w * .8, wid: w * .05, droop: .3, cols: z, lw: LW0 * 1.6, rib: 1 });
      });
      fliers[fliers.length - 1].leaf = 1;
    });
  }

  function paintScene(fly) {
    R = rng(AK.seed);
    var inner = root.querySelector('.ak-inner'), HR = root.clientHeight;
    W = root.clientWidth; H = inner && inner.clientHeight > 200 ? Math.min(HR, inner.clientHeight) : HR; HX = HR - H; mob = W < 768;   // H = sichtbare Höhe (am Handy ohne die Leisten des Browsers); HX = was darunter noch gemalt wird
    U = clamp(Math.min(W, H * .62), 300, 620); LW0 = Math.max(1.5, U * .0056);
    measureLayout();
    var gap = LT.band - LT.lead;
    HOR = (LT.band - H * .03) / H; SHO = HOR + .03;            // Horizont und Ufer liegen an der Oberkante der gewählten Zeile
    SR = clamp(gap * .3, 22, U * .115); SUN[1] = HOR - SR * 1.4 / H;   // die Sonne füllt die Lücke zwischen Slogan und Rad
    ZP = [R() * 6, R() * 6, R() * 6];
    XR = AK.freePan ? W * (mob ? AK.panX[0] : AK.panX[1]) : 0;
    camRef = Math.round(H * AK.flightH); camT = camRef; cam = tgY = fly ? camT : 0; camX = tgX = 0;   // immer das ganze Bild: man kann von Hand wieder nach oben
    if (world) world.remove();
    world = document.createElement('div'); world.className = 'ak-world'; world.setAttribute('aria-hidden', 'true');
    root.insertBefore(world, root.firstChild);
    sprites = []; fliers = []; sways = []; farOn = null;
    var big = W > 1100, q = big ? Math.min(DPR, 1.5) : DPR, qs = Math.min(DPR, big ? 1.25 : 1.5), qf = Math.min(DPR, big ? 1 : 1.25); QF = qs;   // Schärfe nach Bedarf: vorn scharf, Himmel und Hintergrund weicher (Speicher)
    var S0 = strip(0, .14, .18, .006, qs, qs), S1 = strip(1, .5, .38, .016, q, QF), SB = strip(2, .86, .54, .025, qs, qf), S2 = strip(3, 1, .62, .03, q, QF), SF = strip(4, 1.2, .76, .038, qf, qf),
        SA = strip(5, .16, .215, .008, qs, qs, .2), SN = strip(6, .19, .255, .01, qs, qs, .27), SH = strip(7, .215, .3, .013, qs, qs, .36);   // ferne Berge, nahe Berge, Hügel: je eigenes Tempo.
    // Nach oben/unten nur wenig verschieden (der Weg der Kamera ist lang, und oben am Himmel sollen die Berge wie bisher zu sehen sein), seitlich deutlicher
    SB.path = U * .024;   // die Bänder und Lianen wandern immer leicht auf einer kleinen Bahn (Hugo 11:50)
    strips = [S0, SA, SN, SH, S1, SB, S2, SF];
    sceneFar(S0, SA, SN, SH); sceneMid(S1); sceneMain(S2, SB, SF);
    S0.build(); world.appendChild(S0.el);
    SA.build(); world.appendChild(SA.el); SN.build(); world.appendChild(SN.el); SH.build(); world.appendChild(SH.el);
    R = rng(AK.seed + 3);
    // weniger Wolken (Hugo 13:19)
    skyClouds([[1, .2, .3, .07, .25], [.93, .84, .5, .09, .3], [.84, .5, .2, .08, .36], [.74, .16, .6, .1, .42],
      [0, .13, .06, .05, .2], [0, .87, .1, .055, .26]]);   // ferne Wolken; die letzten zwei stehen im Schlussbild am Himmel
    S1.build(); world.appendChild(S1.el);
    R = rng(AK.seed + 4);
    skyClouds([[.98, .72, .2, .14, .6], [.88, .25, .7, .16, .7], [.78, .8, .4, .17, .85], [.68, .3, .55, .19, .95]]);   // mittlere Wolken
    SB.build(); world.appendChild(SB.el);
    S2.build(); world.appendChild(S2.el);
    SF.build(); world.appendChild(SF.el);
    R = rng(AK.seed + 5);
    skyClouds([[.95, .1, .85, .22, 1.3], [.86, .88, .55, .28, 1.7], [.77, .3, .45, .26, 1.4], [.68, .8, .5, .24, 1.25]]);   // nahe Wolken rauschen vorbei

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
    sprite(Zs * .62, Zs * .62, 0, 0, [-W * (mob ? .26 : .04), -H * (mob ? .1 : .03)], function (x, w, h) {
      frond(x, { x: w * .04, y: h * .04, a: mob ? 1.36 : .8, spread: mob ? .85 : 1.5, n: 8, len: w * .84, wid: w * .05, droop: .25, cols: Z_PURP.concat(Z_BLUE), lw: lw, rib: 1 });
      bloom(x, w * .27, h * .2, w * .1, '#d0379a', lw);
    });
    sprite(Zs * .6, Zs * .55, 1, 0, [W * (mob ? 1.12 : 1.04), -H * (mob ? .06 : .02)], function (x, w, h) {
      frond(x, { x: w * .97, y: h * .05, a: Math.PI * .74, spread: 1.1, n: 7, len: w * .82, wid: w * .05, droop: -.2, cols: Z_TEAL.concat(Z_GREEN), lw: lw, rib: 1 });
    });
    sprite(Zs * .55, Zs * .8, 0, 1, [-W * .05, H * 1.03], function (x, w, h) {
      for (var i = 0; i < 3; i++) bigLeaf(x, w * .05 + i * w * .08, h, -Math.PI / 2 + rr(.15, .7), h * rr(.66, .9), w * .11, rr(.12, .28), pick(Z_GREEN.concat(Z_TEAL)), lw);
      fern(x, { x: w * .42, y: h, len: h * .36, col: '#8fc93a', dir: -1, lw: lw });
      hibiscus(x, w * .5, h * .78, w * .13, ['#ff5a8a', '#b8288a'], lw); protea(x, w * .22, h * .62, w * .16, ['#f07a2a', '#fff0c8'], lw);
    });
    sprite(Zs * .58, Zs * .6, 1, 1, [W * 1.05, H * 1.03], function (x, w, h) {
      frond(x, { x: w * .95, y: h, a: -Math.PI / 2 - .55, spread: 1.7, n: 9, len: h * .8, wid: w * .045, droop: .3, cols: Z_MAG.concat(Z_PURP), lw: lw, rib: 1 });
      flowerB(x, w * .46, h * .7, w * .08, '#f07a2a', lw);
      orchid(x, w * .66, h * .56, w * .12, ['#c58cf0', '#ffd75e'], lw); phiFlower(x, w * .3, h * .86, w * .11, ['#ffd75e', '#f07a2a', '#6a2a9a'], lw);
    });
    sprites.forEach(function (s) { world.appendChild(s.sh); });

    // Sonnenstrahlen: von der Sonne über die Lichtung. Jeder Strahl wird einmal gemalt (weich zu den Seiten, Prisma als Saum),
    // verteilt auf zwei Bilder, die gegeneinander atmen
    rays = document.createElement('div'); rays.className = 'ak-rays';
    var rw = W * 1.3, rh = H * 1.25, rc = [canvas(rw, rh, .5), canvas(rw, rh, .5)], r, g;
    function beam(X, wv, len, ang, al) {
      var tc = canvas(wv, len, .5), tx = tc.x;
      g = tx.createLinearGradient(0, 0, 0, len); g.addColorStop(0, 'rgba(255,251,238,0)'); g.addColorStop(.1, 'rgba(255,251,238,.9)'); g.addColorStop(.38, 'rgba(255,248,232,.5)'); g.addColorStop(.88, 'rgba(255,246,236,0)');
      tx.fillStyle = g; tx.fillRect(0, 0, wv, len);
      g = tx.createLinearGradient(0, 0, 0, len); g.addColorStop(0, 'rgba(150,220,245,0)'); g.addColorStop(.1, 'rgba(150,220,245,.55)'); g.addColorStop(.5, 'rgba(195,178,250,.2)'); g.addColorStop(.85, 'rgba(195,178,250,0)');
      tx.fillStyle = g; tx.fillRect(wv * .22, 0, wv * .14, len);
      g = tx.createLinearGradient(0, 0, 0, len); g.addColorStop(0, 'rgba(248,190,215,0)'); g.addColorStop(.1, 'rgba(248,190,215,.55)'); g.addColorStop(.5, 'rgba(250,228,180,.2)'); g.addColorStop(.85, 'rgba(250,228,180,0)');
      tx.fillStyle = g; tx.fillRect(wv * .64, 0, wv * .14, len);
      tx.globalCompositeOperation = 'destination-in';
      g = tx.createLinearGradient(0, 0, wv, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.38, '#000'); g.addColorStop(.62, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
      tx.fillStyle = g; tx.fillRect(0, 0, wv, len);
      X.save(); X.translate(gsx + W * .15, gsy); X.rotate(ang); X.globalAlpha = al; X.drawImage(tc.c, -wv / 2, 0, wv, len); X.restore();
    }
    for (r = 0; r < 7; r++) { var wv = rr(.05, .13) * Math.max(W, 500), ang = (-60 + r * 20 + rr(-5, 5)) * Math.PI / 180; beam(rc[r % 2].x, wv, H * .9, ang, rr(.14, .3)); }
    // dazu fächern Strahlen nach links und rechts (Hugo 27.11., 14:44); eigener Zufall, die bisherigen Strahlen bleiben gleich
    var PR = rng(AK.seed + 91);
    [-112, -95, -78, 78, 95, 112].forEach(function (dg, n) { beam(rc[n % 2].x, (.05 + PR() * .08) * Math.max(W, 500), H * .72, (dg + PR() * 8 - 4) * Math.PI / 180, .13 + PR() * .14); });
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
    if (fly) flyLeaves();   // nur im Flug; danach verschwinden sie (sonst hingen sie beim Verschieben in der Luft)

    // Glühwürmchen, Glitzer, Fahrtwind
    var fxc = canvas(W, H, Math.min(DPR, 1.25)); fxC = fxc.c; fxX = fxc.x; fxC.className = 'ak-fx'; fxC.style.width = W + 'px'; fxC.style.height = H + 'px'; world.appendChild(fxC);
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
    placeVeil();
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
      drag = null, dragged = 0, tgY = 0, tgX = 0, camX = 0, XR = 0, sways = [], farOn = null;
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
    tgX = clamp(drag.cx - mx * .7, -XR, XR); tgY = clamp(drag.cy + my * 1.4, 0, camT);   // das Bild folgt dem Finger, dezent: nach unten ziehen = zurück nach oben
  }, { passive: true });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.on) {   // beim Loslassen gleitet die Kamera noch ein Stück weiter
      if (e.type === 'pointerup' && e.timeStamp - drag.pt < 90) { tgX = clamp(tgX - drag.vx * 110, -XR, XR); tgY = clamp(tgY + drag.vy * 380, 0, camT); }
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

  // Handy: kein «Zurück» durch Wischen vom Bildschirmrand (Hugo 27.11., 11:50). Beim seitlichen Verschieben löste der Browser es sonst aus.
  // 1. Eine Berührung, die am Rand beginnt, bekommt der Browser nicht für seine Wischgeste.
  // 2. Rutscht die Geste trotzdem durch, bleibt die Seite stehen. Der Zurück-Knopf des Browsers geht weiter wie gewohnt.
  var edgeT = -1e9, guard = 0;
  if (touch) {
    root.addEventListener('touchstart', function (e) {
      var q = e.touches && e.touches[0]; if (!q) return;
      if (!guard) { guard = 1; try { history.pushState({ ak: 1 }, ''); } catch (er) {} }
      if (q.clientX < 28 || q.clientX > window.innerWidth - 28) {
        edgeT = performance.now();
        if (e.cancelable && !(e.target.closest && e.target.closest('a, button'))) e.preventDefault();
      }
    }, { passive: false });
    window.addEventListener('popstate', function () {
      if (!guard) return;
      if (performance.now() - edgeT < 3500) { try { history.pushState({ ak: 1 }, ''); } catch (er) {} }
      else { guard = 0; history.back(); }
    });
  }

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
      if (fl.u >= 1) {
        fl = null; cam = tgY = 0; camX = tgX = 0;
        setTimeout(function () { fliers = fliers.filter(function (F) { if (F.leaf && F.el.parentNode) F.el.parentNode.removeChild(F.el); return !F.leaf; }); }, 3200);   // die grossen Wedel gehörten nur zum Flug (weg, sobald alles ruhig steht)
      }
    } else if (AK.freePan) {   // von Hand: die Kamera zieht gemütlich nach
      var kk = 1 - Math.exp(-dt / AK.panSoft);
      cam += (tgY - cam) * kk; camX += (tgX - camX) * kk;
      if (Math.abs(tgY - cam) < .05) cam = tgY;
      if (Math.abs(tgX - camX) < .05) camX = tgX;
    }
    if (veil) {   // weiches Feld: in der Lichtung zart, über dem Urwald kräftiger
      var need = 0, vq;
      if (shown) { for (i = 0; i < 3; i++) need = Math.max(need, clamp((veilW - (openHW(veil._y[i] - cam) - Math.abs(camX))) / (U * .2), 0, 1)); need = AK.veil[0] + (AK.veil[1] - AK.veil[0]) * need; }
      veilV += (need - veilV) * (1 - Math.exp(-dt / 260));
      vq = Math.round(veilV * 50) / 50;
      if (vq !== veilQ) { veilQ = vq; veil.style.opacity = vq; }
    }
    var lit = !fl && shown && cam < H * .45;
    if (lit !== litOn && world) { litOn = lit; world.classList.toggle('ak-lit', lit); }
    var p = drawWheel();
    var pn = items.length > 1 ? p / (items.length - 1) - .5 : 0;
    pan += (pn - pan) * .06;
    ptr.x += (ptr.tx - ptr.x) * .06; ptr.y += (ptr.ty - ptr.y) * .06;
    var dr = reduce ? 0 : AK.drift * (mob ? 1.8 : 1.5);   // der Blick steht nie ganz still (Hugo 11:02), am Handy etwas mehr
    var dx = (Math.sin(t * .00011) * 10 + Math.sin(t * .00023 + 1) * 5) * dr - ptr.x * 18 * AK.pointer;
    var dy = (Math.sin(t * .00009 + 2) * 7 + Math.cos(t * .00019) * 4) * dr * .7 - ptr.y * 12 * AK.pointer;
    // ohne Flug: beim Einblenden sinkt die Kamera ein Stück ins Bild (leichter Zoom)
    var ip = flown || reduce || !shown ? (shown || flown ? 1 : 0) : clamp((now - tStart) / (AK.introMs * 1.6), 0, 1), ie = 1 - Math.pow(1 - ip, 3);
    for (i = 0; i < strips.length; i++) {
      var L = strips[i], z = 1 + (1 - ie) * .06 * L.d, lx = L.ox + dx * L.d - camX * L.fx, ly = L.oy + cam * L.f + dy * L.d - pan * 2 * L.pan + (1 - ie) * 40 * L.d;
      if (L.path && !reduce) { lx += Math.sin(t * .00052) * L.path; ly += Math.sin(t * .00037 + 1.3) * L.path * .75; }   // Bänder und Lianen: immer leicht unterwegs auf einer kleinen Bahn
      L.el.style.transform = 'translate3d(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px,0) scale(' + z.toFixed(4) + ')';
    }
    for (i = 0; i < fliers.length; i++) {
      var F = fliers[i], fy = F.y + cam * F.f, on = fy > -F.h && fy < H ? 1 : 0;
      if (on) {
        var fxp = F.x;
        if (F.vx) { var spn = W + F.w + XR * F.f * 2 + 40, off = F.w + XR * F.f + 20; fxp = ((F.x + off + t * F.vx) % spn + spn) % spn - off; }   // zieht langsam und kommt auf der anderen Seite wieder
        F.el.style.transform = 'translate3d(' + (fxp + dx * F.f * .6 - camX * Math.min(F.f, 1.2)).toFixed(1) + 'px,' + fy.toFixed(1) + 'px,0)';
      }
      if (on !== F.on) { F.on = on; F.el.style.visibility = on ? 'visible' : 'hidden'; }
    }
    var far = cam > H * 1.2;   // weit oben sieht man die wiegenden Pflanzen nicht: Animation anhalten
    if (far !== farOn && world) { farOn = far; world.classList.toggle('ak-far', far); }
    for (i = 0; i < sprites.length; i++) {
      var S = sprites[i], rot = reduce ? 0 : Math.sin(t * S.f + S.ph) * S.amp + Math.sin(t * S.f * 2.3 + S.ph * 2) * S.amp * .35;
      var sx = S.x + dx * 1.35 - camX * 1.2, sy = S.y + cam * 1.25 + dy * 1.35 - pan * H * AK.scrollPan * .13 + (1 - ie) * 90;
      var piv = 'translate(' + (S.w * S.ax) + 'px,' + (S.h * S.ay) + 'px) rotate(', back = ' translate(' + (-S.w * S.ax) + 'px,' + (-S.h * S.ay) + 'px)';
      S.el.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0) ' + piv + rot.toFixed(2) + 'deg)' + back;
      // Schatten: die Sonne steht hinten in der Mitte, also fällt er nach vorn und etwas nach aussen
      S.sh.style.transform = 'translate3d(' + (sx + (S.ax ? 1 : -1) * W * .02 - dx * .4).toFixed(1) + 'px,' + (sy + H * .028 - dy * .4).toFixed(1) + 'px,0) ' + piv + (rot * 1.3).toFixed(2) + 'deg) scale(1.04)' + back;
    }
    // Glanz und Strahlen bleiben bei der Sonne, die Lichtflecken auf der Wiese
    var L0 = strips[0], sdx = L0 ? dx * L0.d - camX * L0.fx : 0, sdy = L0 ? cam * L0.f + dy * L0.d - pan * 2 * L0.pan : 0, sunT = 'translate3d(' + sdx.toFixed(1) + 'px,' + sdy.toFixed(1) + 'px,0)';
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
      W = root.clientWidth; measureWheel();
      if (Math.abs(W - lastW) > 20) { lastW = W; fl = null; paintScene(false); litOn = null; reveal(); measureWheel(); }
      else placeVeil();
    }, 180);
  });

  // ---------- Start ----------
  function boot() {
    cover = document.createElement('div'); cover.className = 'ak-cover'; root.appendChild(cover);
    // Flug beim Klick auf der Weiche (/alchemist) und beim ersten Besuch in dieser Sitzung; Antippen fliegt schnell zu Ende
    var fly = false;
    try { fly = AK.flightMs > 0 && !reduce && (sessionStorage.getItem('ak-fly') === '1' || !sessionStorage.getItem('ak-seen')); sessionStorage.removeItem('ak-fly'); sessionStorage.setItem('ak-seen', '1'); } catch (e) {}
    var t0 = performance.now();
    W = root.clientWidth;
    setupWheel(); drawWheel();            // zuerst das Rad: das Bild richtet sich nach dem Platz des Textes
    paintScene(fly); lastW = W;           // teuer: einmal beim Laden, solange die Seite noch perlweiss ist
    if (location.hash === '#ak-test') window.__akPaintMs = Math.round(performance.now() - t0);
    measureWheel();
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
