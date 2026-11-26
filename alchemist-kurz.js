/* ALCHEMIST KURZ · /alchemist-kurz · hugosophian.studio
   Hugo 26.11.2026 (23:30): kurze Version der Alchemisten-Seite. Eine feste Seite im Urwald (bunt wie El Dorado,
   Stimmung Hirsch-Perlmutt), Parallax in allen Ebenen, Sonnenstrahlen von oben durch die Blätter, weiche Schatten,
   Glühwürmchen, die von überall einfliegen, Glitzer. In der Mitte eine Übersicht zum Hoch- und Runterscrollen wie der
   Timer von Apple, darunter die Kontakte. Hugo 23:35: alles selbst generiert, keine Bilder – die ganze Welt wird hier
   mit Canvas gemalt (fester Zufall, darum bei jedem Besuch gleich).
   Aufbau in Webflow (Texte und Aussehen im Designer änderbar):
     section.ak [data-ak]
       .ak-inner > .ak-head (.ak-kicker, h1.ak-title, .ak-lead)
                 > .ak-wheel [data-ak-wheel] > .ak-item [data-ak-item] (.ak-item-name, .ak-item-price, .ak-item-info)
                 > .ak-caption [data-ak-caption]
                 > .ak-contact (a.grey …) > a.ak-long
   Der Flug (Himmel → Wolken → Berge → Wald) kommt später davor. Werte zum Feinschliff in AK. */
(function () {
  'use strict';
  var root = document.querySelector('[data-ak]');
  if (!root || root.__ak) return;
  root.__ak = true;

  // ---------- Werte ----------
  var AK = {
    seed: 7,              // fester Zufall: andere Zahl = anderer Wald
    style: 'eldorado',    // Hugo 26.11. (23:58): 'eldorado' = nach den Referenzen; 'aquarell' = erster Wald (für den Übergang aufheben)
    wash: .34,            // Perlmutt-Schleier über den El-Dorado-Farben (0 = volle Farben, .6 = sehr pastellig)
    rowsVisible: 5,       // sichtbare Zeilen im Rad
    rowDeg: 21,           // Grad pro Zeile auf dem Zylinder (Apple ~ 20)
    drift: 1,             // ruhige Eigenbewegung der Kamera (0 = aus)
    pointer: 1,           // Maus / Finger bewegt die Ebenen (0 = aus)
    scrollPan: 1,         // Scrollen im Rad schiebt den Wald (0 = aus)
    fireflies: 34,        // Glühwürmchen (Handy etwas weniger)
    glitter: 22,          // Glitzer-Funken
    introMs: 1500,        // Einblenden (Bewegungssystem: page)
    flyInMs: [2200, 4200] // Glühwürmchen fliegen so lange ein (von – bis)
  };
  var EASE_OUT = 'cubic-bezier(.22,1,.36,1)';
  var PEARL = ['#daf2f8', '#e3eaf8', '#e5e1f4', '#f2dde3', '#faebe5', '#fbf3de'];
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
    'html.ak-page, html.ak-page body { height: 100%; overflow: hidden; overscroll-behavior: none; background: #e9ecf7; }',
    '[data-ak] { position: relative; width: 100%; height: 100vh; height: 100lvh; overflow: hidden; isolation: isolate; -webkit-tap-highlight-color: transparent; }',
    '[data-ak] .ak-inner { position: relative; z-index: 6; height: 100vh; height: 100svh; box-sizing: border-box; }',
    '.ak-world { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }',
    '.ak-world > * { position: absolute; pointer-events: none; }',
    '.ak-sky { inset: -10%; background:',
    '  radial-gradient(ellipse 55% 38% at 70% 4%, rgba(255,252,240,1) 0%, rgba(251,243,222,.85) 22%, rgba(251,243,222,0) 70%),',
    '  radial-gradient(ellipse 90% 60% at 30% 10%, rgba(227,234,248,.9) 0%, rgba(227,234,248,0) 70%),',
    '  linear-gradient(to bottom, #f6f1ea 0%, #e3e6f6 26%, #c9cdee 48%, #9fc6d6 72%, #6fa9a7 100%); }',
    '.ak-layer, .ak-sprite, .ak-shade { left: 0; top: 0; will-change: transform; transform-origin: 0 0; }',
    '.ak-shade { opacity: .17; }',
    /* Lichtung in der Mitte: hier fällt die Sonne hin, darum bleibt der Text gut lesbar */
    '.ak-glow { inset: -10%; background: radial-gradient(ellipse 46% 34% at 50% 47%, rgba(252,250,255,.88) 0%, rgba(246,243,253,.6) 38%, rgba(240,236,250,0) 72%); }',
    '@media (max-width: 767px) { .ak-glow { background: radial-gradient(ellipse 62% 46% at 50% 48%, rgba(252,250,255,.9) 0%, rgba(246,243,253,.72) 45%, rgba(240,236,250,0) 80%); } }',
    '.ak-rays { inset: 0; mix-blend-mode: screen; }',
    '.ak-ray { position: absolute; top: -12%; height: 150%; transform-origin: 50% 0; will-change: opacity;',
    '  background: linear-gradient(to bottom, rgba(255,251,238,.9) 0%, rgba(255,248,232,.5) 35%, rgba(255,246,236,0) 88%);',
    '  -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 38%, #000 62%, transparent 100%); mask-image: linear-gradient(to right, transparent 0%, #000 38%, #000 62%, transparent 100%); }',
    /* Prisma an den Strahlrändern (wie überall auf der Website: Regenbogen nur als Saum) */
    '.ak-ray::before, .ak-ray::after { content: ""; position: absolute; top: 0; bottom: 0; width: 14%; background: linear-gradient(to bottom, rgba(150,220,245,.55), rgba(195,178,250,.2) 50%, transparent 85%); }',
    '.ak-ray::before { left: 22%; } .ak-ray::after { right: 22%; background: linear-gradient(to bottom, rgba(248,190,215,.55), rgba(250,228,180,.2) 50%, transparent 85%); }',
    '@keyframes akRay { 0%, 100% { opacity: var(--o1); } 30% { opacity: var(--o2); } 55% { opacity: var(--o3); } 80% { opacity: var(--o2); } }',
    '.ak-dapple { inset: 0; mix-blend-mode: soft-light; }',
    '.ak-spot { position: absolute; border-radius: 50%; background: radial-gradient(closest-side, rgba(255,250,235,.95), rgba(255,250,235,0)); will-change: transform; }',
    '@keyframes akSpot { 0%, 100% { transform: translate3d(0,0,0) scale(1); opacity: .9; } 50% { transform: translate3d(var(--dx), var(--dy), 0) scale(1.18); opacity: .45; } }',
    '.ak-fx { inset: 0; width: 100%; height: 100%; z-index: 9; }',
    '.ak-flare { inset: 0; z-index: 10; mix-blend-mode: screen; }',
    '.ak-flare i { position: absolute; border-radius: 50%; will-change: transform; }',
    '.ak-sheen { inset: -30%; z-index: 11; mix-blend-mode: soft-light; opacity: .38; will-change: transform;',
    '  background: linear-gradient(115deg, rgba(218,242,248,0) 30%, rgba(218,242,248,.9) 38%, rgba(229,225,244,.9) 44%, rgba(242,221,227,.9) 50%, rgba(251,243,222,.9) 56%, rgba(251,243,222,0) 64%); }',
    '.ak-cover { position: absolute; inset: 0; z-index: 30; background: #f3f1f9; pointer-events: none; transition: opacity ' + AK.introMs + 'ms ' + EASE_OUT + '; }',
    'html.ak-on .ak-cover { opacity: 0; }',
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
    '[data-ak-item] { scroll-snap-align: center; scroll-snap-stop: normal; will-change: transform, opacity; cursor: pointer; backface-visibility: hidden; user-select: none; -webkit-user-select: none; }',
    '[data-ak-item] .ak-item-price, [data-ak-item] .ak-item-info { display: none !important; }',
    '.ak-band { position: absolute; z-index: 0; left: 50%; pointer-events: none; transform: translateX(-50%); }',
    '[data-ak-item] { white-space: nowrap; }',
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

  // ---------- Malen ----------
  function canvas(w, h, dpr) {
    var c = document.createElement('canvas');
    c.width = Math.max(2, Math.round(w * dpr)); c.height = Math.max(2, Math.round(h * dpr));
    var x = c.getContext('2d'); x.scale(dpr, dpr); c._w = w; c._h = h; c._dpr = dpr;
    return { c: c, x: x };
  }

  // Mittellinie eines Blatts (Bogen), t = 0..1
  function leafPath(x, len, wid, bend, side) {
    // side: 0 = ganze Form, -1 = obere Hälfte bis Mittelrippe, 1 = untere Hälfte
    var by = bend * len;
    x.beginPath(); x.moveTo(0, 0);
    if (side >= 0) x.bezierCurveTo(len * .18, wid * 1.05 + by * .03, len * .72, wid * .72 + by * .55, len, by);
    else x.bezierCurveTo(len * .18, -wid * 1.05 + by * .03, len * .72, -wid * .72 + by * .55, len, by);
    if (side === 0) x.bezierCurveTo(len * .72, -wid * .72 + by * .55, len * .18, -wid * 1.05 + by * .03, 0, 0);
    else x.bezierCurveTo(len * .72, by * .56, len * .2, by * .04, 0, 0);
    x.closePath();
  }
  function midPoint(len, bend, t) {   // Punkt auf der Mittelrippe (kubische Bezier)
    var by = bend * len, u = 1 - t;
    var px = 3 * u * u * t * len * .2 + 3 * u * t * t * len * .72 + t * t * t * len;
    var py = 3 * u * u * t * by * .04 + 3 * u * t * t * by * .56 + t * t * t * by;
    return [px, py];
  }

  // Ein Blatt: Verlauf, Schattenhälfte, Mittelrippe, Adern, Lichtkante
  function leaf(x, o) {
    var len = o.len, wid = o.wid, bend = o.bend || 0;
    x.save(); x.translate(o.x, o.y); x.rotate(o.a);
    var g = x.createLinearGradient(0, 0, len, bend * len);
    g.addColorStop(0, mix(o.col, '#0b1f2e', .25)); g.addColorStop(.55, o.col); g.addColorStop(1, mix(o.col, o.tip || '#f4f7ff', .32));
    leafPath(x, len, wid, bend, 0); x.fillStyle = g; x.fill();
    if (!o.flat) {
      x.save(); leafPath(x, len, wid, bend, 0); x.clip();
      leafPath(x, len, wid, bend, 1); x.fillStyle = 'rgba(8,24,44,.2)'; x.fill();   // Licht von oben: untere Hälfte im Schatten
      // Adern
      x.strokeStyle = rgba('#f3fbff', o.veinA == null ? .16 : o.veinA); x.lineWidth = Math.max(.6, wid * .035);
      var n = o.veins || Math.round(6 + len / 40);
      for (var i = 1; i < n; i++) {
        var t = i / n, p = midPoint(len, bend, t), q = midPoint(len, bend, Math.min(1, t + .12));
        for (var s = -1; s <= 1; s += 2) {
          x.beginPath(); x.moveTo(p[0], p[1]);
          x.quadraticCurveTo(q[0], p[1] + s * wid * .45, q[0] + len * .05, p[1] + s * wid * (1.05 - t * .55));
          x.stroke();
        }
      }
      x.restore();
      // Mittelrippe
      x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(len * .2, bend * len * .04, len * .72, bend * len * .56, len, bend * len);
      x.strokeStyle = rgba('#f6fff8', .32); x.lineWidth = Math.max(.8, wid * .06); x.stroke();
    }
    // Lichtkante oben (Perlmutt)
    if (o.rim) {
      x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(len * .18, -wid * 1.05 + bend * len * .03, len * .72, -wid * .72 + bend * len * .55, len, bend * len);
      x.strokeStyle = rgba(o.rim, o.rimA || .55); x.lineWidth = Math.max(1, wid * .05); x.stroke();
    }
    x.restore();
  }

  // Monstera: herzförmig mit Schlitzen und Löchern (auf eigener Fläche, damit das Ausschneiden nichts dahinter löscht)
  function monstera(x, o) {
    var S = o.size, t = canvas(S * 2.2, S * 2.2, x.canvas._dpr || 1), y = t.x, cx = S * 1.1, cy = S * 1.1;
    y.save(); y.translate(cx, cy); y.rotate(o.a);
    var g = y.createRadialGradient(S * .55, -S * .2, S * .1, S * .5, 0, S * 1.1);
    g.addColorStop(0, mix(o.col, '#f4fbff', .28)); g.addColorStop(.6, o.col); g.addColorStop(1, mix(o.col, '#06162a', .35));
    y.beginPath(); y.moveTo(S * .02, 0);   // Herzform: Kerbe am Stiel, Spitze vorne
    y.bezierCurveTo(-S * .2, -S * .18, -S * .14, -S * .6, S * .18, -S * .64);
    y.bezierCurveTo(S * .55, -S * .7, S * .95, -S * .42, S * 1.12, S * .02);
    y.bezierCurveTo(S * .95, S * .44, S * .55, S * .7, S * .18, S * .64);
    y.bezierCurveTo(-S * .14, S * .6, -S * .2, S * .18, S * .02, 0);
    y.fillStyle = g; y.fill();
    // Mittelrippe
    y.beginPath(); y.moveTo(0, 0); y.quadraticCurveTo(S * .55, -S * .02, S * 1.08, S * .02);
    y.strokeStyle = rgba('#effff6', .35); y.lineWidth = S * .025; y.stroke();
    // Seitenrippen + Schlitze
    y.globalCompositeOperation = 'destination-out'; y.lineCap = 'round';
    for (var i = 0; i < 7; i++) {
      var tt = .18 + i * .12;
      for (var s = -1; s <= 1; s += 2) {
        if (R() < .25) continue;
        var bx = S * tt, ey = s * S * (.66 - Math.pow(tt - .35, 2) * 1.1);   // Schlitz vom Rand Richtung Mittelrippe
        y.beginPath(); y.moveTo(bx + S * .04, ey * .38); y.lineTo(bx + S * .16, ey * 1.3);
        y.lineWidth = S * rr(.025, .045); y.stroke();
      }
    }
    for (var h = 0; h < 3; h++) { y.beginPath(); y.ellipse(S * rr(.25, .7), S * rr(-.3, .3), S * .04, S * .02, rr(0, 3), 0, 7); y.fill(); }
    y.globalCompositeOperation = 'source-atop';
    var sh = y.createLinearGradient(0, -S, 0, S); sh.addColorStop(0, 'rgba(255,255,255,.08)'); sh.addColorStop(1, 'rgba(6,20,40,.28)');
    y.fillStyle = sh; y.fillRect(-S, -S, S * 3, S * 3);
    y.restore();
    x.drawImage(t.c, o.x - cx, o.y - cy, S * 2.2, S * 2.2);
  }

  // Palmwedel / Farn: Stiel mit Fiederblättchen
  function frond(x, o) {
    var L = o.len, n = o.n || 16;
    x.save(); x.translate(o.x, o.y); x.rotate(o.a);
    var bend = o.bend || .25;
    x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(L * .5, -L * bend * .2, L, L * bend);
    x.strokeStyle = mix(o.col, '#1b2a1c', .35); x.lineWidth = Math.max(1, L * .012); x.stroke();
    for (var i = 1; i <= n; i++) {
      var t = i / (n + 1), u = 1 - t;
      var px = 2 * u * t * L * .5 + t * t * L, py = 2 * u * t * (-L * bend * .2) + t * t * L * bend;
      var ang = Math.atan2(2 * u * (-L * bend * .2) + 2 * t * (L * bend + L * bend * .2), 2 * u * L * .5 + 2 * t * L * .5);
      var ll = L * (o.leaflet || .34) * (1 - t * .55) * rr(.85, 1.1);
      for (var s = -1; s <= 1; s += 2) {
        leaf(x, { x: px, y: py, a: ang + s * rr(.55, .9) + (o.droop || .25), len: ll, wid: ll * (o.wf || .13), bend: s * .12 + .08,
          col: mix(o.col, pick(o.alt || [o.col]), R() * .5), tip: o.tip, flat: o.flat, veins: 3, veinA: .08, rim: o.rim, rimA: (o.rimA || .4) * (s < 0 ? 1 : .3) });
      }
    }
    x.restore();
  }

  // Hibiskus-Blüte (El Dorado: kräftige Farben)
  function flower(x, o) {
    x.save(); x.translate(o.x, o.y); x.rotate(o.a || 0);
    for (var i = 0; i < 5; i++) {
      var a = i / 5 * Math.PI * 2;
      var g = x.createRadialGradient(0, 0, 0, 0, 0, o.r);
      g.addColorStop(0, mix(o.col, '#7a1c4a', .45)); g.addColorStop(.45, o.col); g.addColorStop(1, mix(o.col, '#fff4f0', .45));
      x.save(); x.rotate(a); x.beginPath(); x.moveTo(0, 0);
      x.bezierCurveTo(o.r * .3, -o.r * .7, o.r * 1.05, -o.r * .55, o.r, 0); x.bezierCurveTo(o.r * 1.05, o.r * .55, o.r * .3, o.r * .7, 0, 0);
      x.fillStyle = g; x.fill(); x.restore();
    }
    x.strokeStyle = '#ffe9a8'; x.lineWidth = o.r * .06; x.beginPath(); x.moveTo(0, 0); x.lineTo(o.r * .55, -o.r * .35); x.stroke();
    var gl = x.createRadialGradient(o.r * .55, -o.r * .35, 0, o.r * .55, -o.r * .35, o.r * .22);
    gl.addColorStop(0, 'rgba(255,248,210,1)'); gl.addColorStop(1, 'rgba(255,230,150,0)');
    x.fillStyle = gl; x.beginPath(); x.arc(o.r * .55, -o.r * .35, o.r * .22, 0, 7); x.fill();
    x.restore();
  }

  // Liane von oben mit kleinen Herzblättern
  function liana(x, o) {
    var pts = [], seg = 14;
    for (var i = 0; i <= seg; i++) {
      var t = i / seg;
      pts.push([o.x + Math.sin(t * 3.1 + o.ph) * o.sway * t + o.dx * t, -20 + (o.len + 20) * t]);
    }
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (var k = 1; k < pts.length; k++) x.lineTo(pts[k][0], pts[k][1]);
    x.strokeStyle = o.stem; x.lineWidth = o.w; x.lineCap = 'round'; x.stroke();
    for (var j = 2; j < pts.length; j++) {
      if (R() < .35) continue;
      var s = R() < .5 ? -1 : 1, ll = o.leaf * rr(.7, 1.2);
      leaf(x, { x: pts[j][0], y: pts[j][1], a: Math.PI / 2 + s * rr(.6, 1.2), len: ll, wid: ll * .32, bend: .1 * s, col: mix(o.col, pick(o.alt), R() * .6), veins: 3, rim: o.rim, rimA: .35 });
    }
  }

  // Baumstamm (Licht von rechts oben)
  function trunk(x, o) {
    var g = x.createLinearGradient(o.x - o.w, 0, o.x + o.w, 0);
    g.addColorStop(0, mix(o.col, '#0c1830', .35)); g.addColorStop(.6, o.col); g.addColorStop(1, mix(o.col, '#fbf6ff', .3));
    x.beginPath();
    x.moveTo(o.x - o.w * .6, -10);
    x.bezierCurveTo(o.x - o.w * .5 + o.lean * .3, o.h * .4, o.x - o.w * .8 + o.lean, o.h * .8, o.x - o.w * 1.6 + o.lean, o.h);
    x.lineTo(o.x + o.w * 1.7 + o.lean, o.h);
    x.bezierCurveTo(o.x + o.w * .9 + o.lean, o.h * .8, o.x + o.w * .6 + o.lean * .3, o.h * .4, o.x + o.w * .6, -10);
    x.closePath(); x.fillStyle = g; x.fill();
  }

  function haze(x, w, h, col, a, from) {   // Luftperspektive: hinten mehr Dunst
    x.save(); x.globalCompositeOperation = 'source-atop';
    var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, rgba(col, a)); g.addColorStop(from || 1, rgba(col, a * .55)); g.addColorStop(1, rgba(col, a * .35));
    x.fillStyle = g; x.fillRect(0, 0, w, h); x.restore();
  }

  // ---------- Malstil «El Dorado» (Hugo 26.11.2026, 23:58: Referenzbilder) ----------
  // Eigene Szene im Stil der Referenzen, nichts davon kopiert: flache, satte Farben mit dunkler Kontur, Ornamente
  // (Spiralen, Stufen-Mäander, Punkte), Farnschnecken, ein Goldfluss mit fliessenden Bändern, Stufenwolken, eine
  // ornamentale Sonne und Stufentempel im Dunst. Darüber ein Perlmutt-Schleier (AK.wash), damit es zur Website passt.
  var ED = {
    out: '#1b1640', gold: '#f2c230', goldL: '#ffe27a', teal: '#0f6b6e', tealD: '#0b4a55', em: '#1f9a5a', lime: '#8fd14f',
    mag: '#c2187a', pur: '#7a2fbf', vio: '#5b3fd1', ora: '#f07a2a', blue: '#2f5fd0'
  };
  var ED_LEAF = ['#1f9a5a', '#2bb673', '#0f8a7a', '#8fd14f', '#1f7fa8', '#7a2fbf', '#5b3fd1', '#c2187a'];
  var ED_FLOWER = ['#c2187a', '#e0409a', '#7a2fbf', '#f07a2a', '#ff5a8a', '#9b3fe0'];
  function ol(x, w, col) { x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = col || ED.out; x.lineWidth = w; x.stroke(); }

  function edLeaf(x, o) {
    var lw = o.lw || 2, b = o.bend || 0;
    x.save(); x.translate(o.x, o.y); x.rotate(o.a);
    leafPath(x, o.len, o.wid, b, 0); x.fillStyle = o.col; x.fill();
    x.save(); leafPath(x, o.len, o.wid, b, 0); x.clip();
    x.save(); x.translate(o.len * .06, -o.wid * .28); x.scale(.86, .46); leafPath(x, o.len, o.wid, b, 0);   // flaches Licht zur Oberseite
    x.fillStyle = o.hi || mix(o.col, '#ffffff', .2); x.fill(); x.restore();
    if (o.stripes) {
      var n = o.stripes;
      for (var i = 1; i < n; i++) {
        var t = i / n, p = midPoint(o.len, b, t), q = midPoint(o.len, b, Math.min(1, t + .14));
        for (var s = -1; s <= 1; s += 2) { x.beginPath(); x.moveTo(p[0], p[1]); x.quadraticCurveTo(q[0], p[1] + s * o.wid * .4, q[0] + o.len * .06, p[1] + s * o.wid * 1.2); ol(x, lw * .5, rgba(ED.out, .55)); }
      }
    }
    x.restore();
    x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(o.len * .2, b * o.len * .04, o.len * .72, b * o.len * .56, o.len * .96, b * o.len * .96); ol(x, lw * .7);
    leafPath(x, o.len, o.wid, b, 0); ol(x, lw);
    x.restore();
  }
  function edFan(x, o) {   // Palmfächer: lange schmale Blätter aus einem Punkt
    for (var i = 0; i < o.n; i++) {
      var t = o.n > 1 ? i / (o.n - 1) - .5 : 0;
      edLeaf(x, { x: o.x, y: o.y, a: o.a + t * o.spread, len: o.len * rr(.8, 1.05), wid: o.len * (o.wf || .07), bend: t * .3 + rr(-.08, .08),
        col: pick(o.cols), lw: o.lw, stripes: o.stripes });
    }
  }
  function spiralPts(cx, cy, r, turns, a0, dir) {
    var pts = [], n = Math.round(turns * 28);
    for (var i = 0; i <= n; i++) { var t = i / n, a = a0 + dir * t * turns * Math.PI * 2, rr2 = r * (1 - t * .85); pts.push([cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2]); }
    return pts;
  }
  function polyline(x, pts) { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); }
  function edFern(x, o) {   // Farnschnecke: Stiel, der oben einrollt, mit kleinen Fiedern
    var dir = o.dir || 1, L = o.len, r = L * .22, pts = [];
    for (var i = 0; i <= 20; i++) { var t = i / 20; pts.push([o.x + Math.sin(t * 2.4) * dir * L * .28, o.y - t * L]); }
    var top = pts[pts.length - 1];
    var sp = spiralPts(top[0] + dir * r, top[1], r, 1.25, Math.PI, dir);
    pts = pts.concat(sp);
    for (var k = 3; k < 18; k += 2) {
      var p = pts[k], s = (k % 4 === 1 ? 1 : -1), ll = L * .16 * (1 - k / 22);
      edLeaf(x, { x: p[0], y: p[1], a: -Math.PI / 2 + s * 1.1, len: ll, wid: ll * .3, bend: s * .2, col: mix(o.col, '#ffffff', .12), lw: o.lw * .7 });
    }
    polyline(x, pts); ol(x, o.lw * 2 + L * .035); polyline(x, pts); ol(x, L * .035, o.col);
  }
  function edFlower(x, o) {
    x.save(); x.translate(o.x, o.y); x.rotate(o.a || 0);
    var n = o.n || 7;
    for (var i = 0; i < n; i++) { x.save(); x.rotate(i / n * Math.PI * 2); edLeaf(x, { x: 0, y: 0, a: 0, len: o.r, wid: o.r * .26, bend: .05, col: o.col, lw: o.lw }); x.restore(); }
    x.beginPath(); x.arc(0, 0, o.r * .3, 0, 7); x.fillStyle = ED.gold; x.fill(); ol(x, o.lw);
    for (var d = 0; d < 8; d++) { var a = d / 8 * Math.PI * 2; x.beginPath(); x.arc(Math.cos(a) * o.r * .18, Math.sin(a) * o.r * .18, o.r * .035, 0, 7); x.fillStyle = ED.ora; x.fill(); }
    x.restore();
  }
  function edColumn(x, o) {   // Urwald-Säule: gewellt, oben abgerundet, mit Ornamenten (Stufen-Mäander, Kreise, Spiralen)
    var lw = o.lw, top = o.top, amp = o.w * .12, f = rr(.01, .02), ph = rr(0, 6), n = 24;
    x.beginPath(); x.moveTo(o.x, top + o.w * .5);
    for (var i = 0; i <= n; i++) { var yy = top + o.w * .5 + (o.h - top) * i / n; x.lineTo(o.x + Math.sin(yy * f + ph) * amp, yy); }
    for (var j = n; j >= 0; j--) { var y2 = top + o.w * .5 + (o.h - top) * j / n; x.lineTo(o.x + o.w + Math.sin(y2 * f + ph + .8) * amp, y2); }
    x.arc(o.x + o.w / 2, top + o.w * .5, o.w / 2, 0, Math.PI, true);
    x.closePath(); x.fillStyle = o.col; x.fill(); ol(x, lw);
    var y = top + o.w * .35, c2 = o.col2;
    while (y < o.h - o.w) {
      var kind = Math.floor(R() * 4), dx = Math.sin(y * f + ph) * amp, cx = o.x + o.w / 2 + dx;
      if (kind === 0) {   // Stufen-Mäander
        var st = o.w / 5, pts = [], yy2 = y;
        for (var s = 0; s < 6; s++) { pts.push([o.x + dx + st * .5 + s * st * .8, yy2]); yy2 += (s % 2 ? -st : st) * .9; pts.push([o.x + dx + st * .5 + s * st * .8, yy2]); }
        polyline(x, pts); ol(x, lw * 1.4, c2); y += o.w * .9;
      } else if (kind === 1) {   // Kreis mit Punkt
        x.beginPath(); x.arc(cx, y + o.w * .35, o.w * .28, 0, 7); x.fillStyle = c2; x.fill(); ol(x, lw * .8);
        x.beginPath(); x.arc(cx, y + o.w * .35, o.w * .08, 0, 7); x.fillStyle = ED.goldL; x.fill(); y += o.w * .9;
      } else if (kind === 2) {   // Spirale
        polyline(x, spiralPts(cx, y + o.w * .35, o.w * .32, 1.6, 0, R() < .5 ? 1 : -1)); ol(x, lw * 1.2, c2); y += o.w * .9;
      } else {   // Punktreihe
        for (var d = 0; d < 3; d++) { x.beginPath(); x.arc(cx, y + d * o.w * .26, o.w * .07, 0, 7); x.fillStyle = c2; x.fill(); }
        y += o.w * .8;
      }
      y += rr(o.w * .2, o.w * .6);
    }
  }
  function edBlob(x, lobes, col, lw, hi) {   // mehrere Kugeln als eine Form: zuerst alle Konturen, dann alle Flächen darüber
    lobes.forEach(function (l) { x.beginPath(); x.ellipse(l[0], l[1], l[2], l[3], 0, 0, 7); ol(x, lw * 2); });
    lobes.forEach(function (l) { x.beginPath(); x.ellipse(l[0], l[1], l[2], l[3], 0, 0, 7); x.fillStyle = col; x.fill(); });
    if (hi !== false) lobes.forEach(function (l) { x.beginPath(); x.ellipse(l[0] - l[2] * .25, l[1] - l[3] * .35, l[2] * .4, l[3] * .18, -.3, 0, 7); x.fillStyle = 'rgba(255,255,255,.2)'; x.fill(); });
  }
  function edBush(x, cx, cy, r, col, lw) {
    var lobes = [], n = 4 + Math.floor(R() * 3);
    for (var i = 0; i < n; i++) { var a = Math.PI + (i / (n - 1)) * Math.PI; lobes.push([cx + Math.cos(a) * r * .7, cy + Math.sin(a) * r * .45, r * rr(.38, .55), r * rr(.3, .42)]); }
    lobes.push([cx, cy, r * .8, r * .35]);
    edBlob(x, lobes, col, lw);
  }
  function rrect(x, a, b, w, h, r) { r = Math.min(r, w / 2, h / 2); x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function edCloud(x, o) {   // Stufenwolke aus abgerundeten Blöcken, innen feine Linien
    var bx = o.x, n = 3 + Math.floor(R() * 3);
    var bl = [];
    for (var i = 0; i < n; i++) { var bw = o.s * rr(.5, .9), bh = o.s * rr(.45, 1.1); bl.push([bx, o.y - bh, bw, bh + o.s * .2]); bx += bw * rr(.55, .8); }
    bl.forEach(function (q) { rrect(x, q[0], q[1], q[2], q[3], o.s * .22); ol(x, o.lw * 2, o.line); });
    bl.forEach(function (q) { rrect(x, q[0], q[1], q[2], q[3], o.s * .22); x.fillStyle = o.col; x.fill(); });
    bl.forEach(function (q) { rrect(x, q[0] + q[2] * .18, q[1] + q[3] * .18, q[2] * .5, q[3] * .3, o.s * .1); ol(x, o.lw * .7, o.line); });
  }
  function edTemple(x, o) {   // Stufentempel als flache Silhouette im Dunst
    var w = o.w, sh = o.h / o.n;
    for (var i = 0; i < o.n; i++) {
      var ww = w * (1 - i / (o.n + 1));
      x.fillStyle = o.col; x.fillRect(o.x - ww / 2, o.y - sh * (i + 1), ww, sh + 1);
    }
    x.fillStyle = mix(o.col, '#1b1640', .25);
    x.fillRect(o.x - w * .06, o.y - sh * o.n - sh * .8, w * .12, sh * .8);
  }
  function edSun(x, o) {   // ornamentale Sonne (eigene Gestaltung)
    var r = o.r; x.save(); x.translate(o.x, o.y);
    for (var i = 0; i < 16; i++) {   // Strahlen als Tropfen
      var a = i / 16 * Math.PI * 2; x.save(); x.rotate(a);
      x.beginPath(); x.moveTo(r * 1.18, 0); x.quadraticCurveTo(r * 1.45, -r * .12, r * 1.7, 0); x.quadraticCurveTo(r * 1.45, r * .12, r * 1.18, 0);
      x.fillStyle = i % 2 ? ED.ora : ED.gold; x.fill(); ol(x, o.lw * .8); x.restore();
    }
    x.beginPath(); for (var k = 0; k <= 120; k++) { var t = k / 120 * Math.PI * 2, rr2 = r * (1.02 + .09 * (Math.sin(t * 12) > 0 ? 1 : 0)); x.lineTo(Math.cos(t) * rr2, Math.sin(t) * rr2); }
    x.closePath(); x.fillStyle = '#e0582a'; x.fill(); ol(x, o.lw);
    x.beginPath(); x.arc(0, 0, r * .86, 0, 7); x.fillStyle = ED.ora; x.fill(); ol(x, o.lw);
    for (var d = 0; d < 14; d++) { var b = d / 14 * Math.PI * 2; x.beginPath(); x.arc(Math.cos(b) * r * .7, Math.sin(b) * r * .7, r * .05, 0, 7); x.fillStyle = '#3fbf7a'; x.fill(); }
    x.beginPath(); x.arc(0, 0, r * .55, 0, 7); x.fillStyle = ED.gold; x.fill(); ol(x, o.lw);
    x.beginPath(); x.arc(0, 0, r * .3, 0, 7); x.fillStyle = ED.goldL; x.fill(); ol(x, o.lw * .8);
    polyline(x, spiralPts(0, 0, r * .22, 1.4, 0, 1)); ol(x, o.lw * .8, ED.ora);
    x.restore();
  }
  function edRiver(x, w, h, top, lw) {   // Goldfluss: dunkles Wasser, fliessende Goldbänder und Schlaufen
    var pts = [];
    x.beginPath(); x.moveTo(-10, h + 10);
    for (var i = 0; i <= 40; i++) { var px = -10 + (w + 20) * i / 40; x.lineTo(px, top + Math.sin(px * .012 + 1) * h * .012 + Math.sin(px * .031) * h * .006); }
    x.lineTo(w + 10, h + 10); x.closePath(); x.fillStyle = ED.tealD; x.fill(); ol(x, lw);
    var rows = 9;
    for (var k = 0; k < rows; k++) {
      var t = (k + .6) / rows, y0 = top + (h - top) * Math.pow(t, 1.25), amp = (h - top) * .035 * (.4 + t),
          th = (h - top) * .12 * (.35 + t * 1.1), f = rr(.004, .009), ph = rr(0, 6), f3 = rr(.006, .014), ph3 = rr(0, 6);
      var up = [], dn = [];
      for (var j = 0; j <= 60; j++) {
        var xx = -20 + (w + 40) * j / 60, yy = y0 + Math.sin(xx * f + ph) * amp + Math.sin(xx * f * 2.3 + ph) * amp * .35,
            tt = th * Math.max(0, Math.sin(xx * f3 + ph3)) ;
        up.push([xx, yy - tt / 2]); dn.push([xx, yy + tt / 2]);
      }
      x.beginPath(); x.moveTo(up[0][0], up[0][1]);
      for (var u = 1; u < up.length; u++) x.lineTo(up[u][0], up[u][1]);
      for (var v = dn.length - 1; v >= 0; v--) x.lineTo(dn[v][0], dn[v][1]);
      x.closePath();
      var g = x.createLinearGradient(0, y0 - th, 0, y0 + th); g.addColorStop(0, ED.goldL); g.addColorStop(1, ED.gold);
      x.fillStyle = g; x.fill(); ol(x, lw * .6, '#fff4b8');
    }
    for (var l = 0; l < 5; l++) {   // Schlaufen
      var lx = rr(w * .15, w * .85), ly = rr(top + (h - top) * .3, h * .97), lr = rr(w * .03, w * .07);
      x.beginPath(); x.ellipse(lx, ly, lr * 2, lr * .45, rr(-.15, .15), 0, 7); ol(x, lr * .35, ED.gold); x.beginPath(); x.ellipse(lx, ly, lr * 2, lr * .45, 0, 0, 7); ol(x, lw * .5, '#fff4b8');
    }
  }
  function edRock(x, cx, cy, r, col, lw) {
    x.beginPath(); x.moveTo(cx - r, cy);
    x.bezierCurveTo(cx - r, cy - r * .9, cx - r * .2, cy - r * 1.1, cx + r * .3, cy - r * .8); x.bezierCurveTo(cx + r, cy - r * .7, cx + r * 1.1, cy - r * .1, cx + r, cy);
    x.closePath(); x.fillStyle = col; x.fill(); ol(x, lw);
    x.beginPath(); x.ellipse(cx - r * .2, cy - r * .55, r * .35, r * .12, -.3, 0, 7); x.fillStyle = mix(col, '#ffffff', .25); x.fill();
  }
  var paperTile = null;
  function paper(x, w, h, a) {   // Papierstruktur wie gemalt
    if (!paperTile) {
      var t = canvas(160, 160, 1), P = rng(99), id = t.x.getImageData(0, 0, 160, 160), d = id.data;
      for (var i = 0; i < d.length; i += 4) { var v = 128 + (P() - .5) * 90; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      t.x.putImageData(id, 0, 0); paperTile = t.c;
    }
    x.save(); x.globalCompositeOperation = 'overlay'; x.globalAlpha = a; x.fillStyle = x.createPattern(paperTile, 'repeat'); x.fillRect(0, 0, w, h); x.restore();
  }
  function pearlWash(x, w, h, a) {   // Perlmutt-Schleier (wie das helle Referenzbild): Farben bleiben, werden pastellig
    x.save(); x.globalCompositeOperation = 'source-atop';
    var g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, rgba('#eceff7', a)); g.addColorStop(.3, rgba('#f2dde3', a)); g.addColorStop(.55, rgba('#daf2f8', a)); g.addColorStop(.8, rgba('#fbf3de', a)); g.addColorStop(1, rgba('#e5e1f4', a));
    x.fillStyle = g; x.fillRect(0, 0, w, h); x.restore();
  }

  var ED_SKY = 'linear-gradient(to bottom, #cdeeea 0%, #c4dcf3 34%, #d3c9f0 62%, #c9e6dc 100%)';
  function edLayers(layer, mob) {
    var wa = AK.wash;
    // 0 · Himmel mit Stufenwolken, ornamentaler Sonne (Quelle der Strahlen) und Stufentempeln im Dunst
    layer(0, .75, function (x, w, h) {
      var lw = 2.4;
      edSun(x, { x: w * .66, y: h * .1, r: Math.min(w, h) * (mob ? .1 : .075), lw: lw });
      for (var c = 0; c < (mob ? 4 : 6); c++) {
        var cx = c % 2 ? rr(w * .55, w * .95) : rr(-w * .05, w * .4);
        edCloud(x, { x: cx, y: rr(h * .14, h * .32), s: Math.min(w, h) * rr(.07, .11), col: '#a9e6f2', line: '#effcff', lw: lw });
      }
      for (var t = 0; t < (mob ? 4 : 7); t++) edTemple(x, { x: rr(0, w), y: h * rr(.5, .6), w: rr(w * .12, w * .28), h: h * rr(.12, .22), n: 4 + Math.floor(R() * 3), col: pick(['#4a67c9', '#5a52c2', '#3f7fbf']) });
      for (var b = 0; b < (mob ? 10 : 18); b++)   // ferne Baumkronen als bunte Reihe am Horizont
        edBush(x, rr(-w * .05, w * 1.05), h * rr(.6, .68), rr(w * .06, w * .12), pick(['#7a2fbf', '#c2187a', '#1f9a5a', '#2f5fd0', '#8fd14f', '#0f8a7a']), lw * .8);
      paper(x, w, h, .18); pearlWash(x, w, h, wa + .2);
    });
    // 1 · Urwald-Wand: Ornament-Säulen, Fächer, Büsche (Violett, Türkis, Grün, Magenta)
    layer(1, mob ? 1 : .85, function (x, w, h) {
      var lw = 2;
      var cols = mob ? 7 : 12;
      for (var i = 0; i < cols; i++) {
        var cw = rr(w * .04, w * .08), cxp = (i + rr(-.3, .3)) / cols * w;
        var mid = cxp > w * .28 && cxp < w * .72;
        if (mid && R() < .55) continue;   // in der Mitte lichter, oben bleibt der Himmel frei
        edColumn(x, { x: cxp, w: cw, top: h * (mid ? rr(.32, .45) : rr(.08, .3)), h: h * rr(.62, .78), col: pick(['#7a2fbf', '#0f8a7a', '#1f9a5a', '#5b3fd1', '#2f5fd0']), col2: pick(['#8fd14f', '#f2c230', '#e0409a', '#57d6c8']), lw: lw });
      }
      for (var f = 0; f < (mob ? 7 : 12); f++) {
        var left = R() < .5;
        edFan(x, { x: left ? rr(0, w * .3) : rr(w * .7, w), y: h * rr(.55, .78), a: -Math.PI / 2 + rr(-.5, .5), spread: rr(1.6, 2.4), n: 6 + Math.floor(R() * 4), len: h * rr(.14, .24), cols: ED_LEAF, lw: lw, wf: .08 });
      }
      for (var b = 0; b < (mob ? 8 : 14); b++)
        edBush(x, rr(-w * .05, w * 1.05), h * rr(.72, .8), rr(w * .06, w * .11) * (mob ? 1.3 : 1), pick(['#7a2fbf', '#c2187a', '#1f9a5a', '#2bb673', '#0f8a7a', '#5b3fd1']), lw);
      paper(x, w, h, .16); pearlWash(x, w, h, wa + .08);
    });
    // 2 · vorne am Fluss: Goldfluss, Steine, Bananenblätter, Farnschnecken, Blüten; die Mitte bleibt frei
    layer(2, Math.min(DPR, 1.5), function (x, w, h) {
      var lw = 2.6, top = h * (mob ? .72 : .7);
      edRiver(x, w, h, top, lw);
      for (var r = 0; r < 4; r++) edRock(x, r % 2 ? rr(w * .78, w * .98) : rr(w * .02, w * .22), rr(top + 10, h * .95), rr(w * .04, w * .07) * (mob ? 1.4 : 1), pick(['#c2187a', '#a0146a', '#7a2fbf']), lw);
      for (var b = 0; b < (mob ? 6 : 10); b++) {
        var left = b % 2 === 0;
        edLeaf(x, { x: left ? rr(-w * .06, w * .03) : rr(w * .97, w * 1.06), y: rr(h * .18, h * .85), a: (left ? 0 : Math.PI) + (left ? 1 : -1) * rr(-.6, .3),
          len: rr(w * .26, w * .4) * (mob ? 1 : .75), wid: rr(h * .035, h * .05), bend: (left ? 1 : -1) * rr(.08, .22), col: pick(ED_LEAF), lw: lw, stripes: 9 });
      }
      for (var f = 0; f < (mob ? 5 : 8); f++) {
        var lf = R() < .5;
        edFern(x, { x: lf ? rr(w * .02, w * .2) : rr(w * .8, w * .98), y: top + rr(-10, 30), len: h * rr(.08, .13) * (mob ? .85 : 1), col: pick(['#8fd14f', '#2bb673', '#57d6c8']), dir: lf ? 1 : -1, lw: lw * .8 });
      }
      for (var fl = 0; fl < (mob ? 6 : 9); fl++) {
        var fx = R() < .5 ? rr(w * .02, w * .24) : rr(w * .76, w * .98);
        edFlower(x, { x: fx, y: rr(h * .45, h * .85), r: rr(w * .025, w * .045) * (mob ? 1.4 : 1), a: rr(0, 6), col: pick(ED_FLOWER), lw: lw * .8 });
      }
      paper(x, w, h, .14); pearlWash(x, w, h, wa);
    });
  }
  function edSprites(sprite, S, mob) {
    var lw = 3, wa = AK.wash * .55;
    sprite(S * .62, S * .62, 0, 0, [-W * (mob ? .22 : .04), -H * (mob ? .07 : .03)], function (x, w, h) {
      edFan(x, { x: w * .04, y: h * .04, a: mob ? 1.3 : .75, spread: mob ? .9 : 1.4, n: 7, len: w * .82, cols: ['#5b3fd1', '#7a2fbf', '#0f8a7a', '#1f7fa8'], lw: lw, wf: .06, stripes: 7 });
      edFlower(x, { x: w * .3, y: h * .22, r: w * .08, a: .3, col: '#c2187a', lw: lw * .8 });
      pearlWash(x, w, h, wa);
    });
    sprite(S * .6, S * .55, 1, 0, [W * (mob ? 1.12 : 1.04), -H * (mob ? .05 : .02)], function (x, w, h) {
      for (var i = 0; i < 3; i++) edLeaf(x, { x: w * .98, y: h * rr(.02, .2), a: Math.PI * rr(.62, .82), len: w * rr(.6, .85), wid: w * .08, bend: -.2, col: pick(['#1f9a5a', '#0f8a7a', '#7a2fbf']), lw: lw, stripes: 9 });
      pearlWash(x, w, h, wa);
    });
    sprite(S * .55, S * .8, 0, 1, [-W * .05, H * 1.03], function (x, w, h) {
      for (var i = 0; i < 3; i++) edLeaf(x, { x: w * .05 + i * w * .08, y: h, a: -Math.PI / 2 + rr(.15, .7), len: h * rr(.7, .92), wid: w * .11, bend: rr(.12, .28), col: pick(['#1f9a5a', '#2bb673', '#0f8a7a']), lw: lw, stripes: 11 });
      edFern(x, { x: w * .42, y: h, len: h * .36, col: '#8fd14f', dir: -1, lw: lw });
      pearlWash(x, w, h, wa);
    });
    sprite(S * .58, S * .6, 1, 1, [W * 1.05, H * 1.03], function (x, w, h) {
      edFan(x, { x: w * .95, y: h, a: -Math.PI / 2 - .55, spread: 1.6, n: 7, len: h * .8, cols: ['#c2187a', '#7a2fbf', '#5b3fd1', '#1f9a5a'], lw: lw, wf: .07, stripes: 7 });
      edFlower(x, { x: w * .48, y: h * .7, r: w * .08, a: .4, col: '#f07a2a', lw: lw * .8 });
      pearlWash(x, w, h, wa);
    });
  }

  // ---------- Szene ----------
  var world, layers = [], sprites = [], rays, flare, sheen, fxC, fxX, W = 0, H = 0, PANS = [0.02, 0.05, 0.09, 0.15];
  var DEPTH = [0.18, 0.38, 0.62, 1];

  function paintScene() {
    R = rng(AK.seed);
    W = root.clientWidth; H = root.clientHeight;
    var mob = W < 768, mg = 0.08;   // Rand für Parallax
    if (world) world.remove();
    world = document.createElement('div'); world.className = 'ak-world'; world.setAttribute('aria-hidden', 'true');
    root.insertBefore(world, root.firstChild);
    var sky = document.createElement('div'); sky.className = 'ak-sky'; world.appendChild(sky);
    layers = []; sprites = [];

    function layer(i, dpr, fn) {
      var pan = PANS[i] * H * AK.scrollPan, lw = W * (1 + mg * 2), lh = H * (1 + mg * 2) + pan * 2;
      var c = canvas(lw, lh, dpr); fn(c.x, lw, lh, mob);
      c.c.className = 'ak-layer'; c.c.style.width = lw + 'px'; c.c.style.height = lh + 'px';
      world.appendChild(c.c);
      layers.push({ el: c.c, d: DEPTH[i], ox: -W * mg, oy: -H * mg - pan, pan: pan });
    }

    if (AK.style === 'eldorado') { sky.style.background = ED_SKY; edLayers(layer, mob); } else {
    // 0 · ferne Bäume im Dunst (Flieder, Periwinkel)
    layer(0, .5, function (x, w, h, mob) {
      for (var i = 0; i < (mob ? 7 : 11); i++) trunk(x, { x: rr(0, w), w: rr(6, 16), h: h, lean: rr(-20, 20), col: pick(['#b5b3e6', '#c2bfee', '#a9b4e2']) });
      for (var k = 0; k < 26; k++) {   // Kronen als weiche Wolken oben
        var cx = rr(0, w), cy = rr(-h * .05, h * .28), r = rr(w * .08, w * .2);
        var g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, rgba(pick(['#bfc0ee', '#aebde6', '#c9c3ef']), .9)); g.addColorStop(1, rgba('#c9c3ef', 0));
        x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
      }
      for (var f = 0; f < 10; f++) frond(x, { x: rr(0, w), y: h * rr(.78, 1.02), a: -Math.PI / 2 + rr(-.9, .9), len: rr(h * .12, h * .22), col: '#9fb8d8', alt: ['#b4b0e6'], flat: true, n: 10 });
      haze(x, w, h, '#e4e2f6', .5);
    });

    // 1 · hinterer Urwald (Türkis, Blaugrün)
    layer(1, .75, function (x, w, h, mob) {
      for (var i = 0; i < (mob ? 5 : 8); i++) trunk(x, { x: rr(0, w), w: rr(10, 24), h: h, lean: rr(-40, 40), col: pick(['#6d8fb8', '#5f9aa6', '#7d8cc2']) });
      for (var l = 0; l < (mob ? 4 : 7); l++) liana(x, { x: rr(0, w), len: rr(h * .3, h * .6), sway: rr(10, 30), dx: rr(-20, 20), ph: rr(0, 6), w: 2, stem: '#4d7a86', leaf: 14, col: '#5fb3a8', alt: ['#7fc1c8', '#6aa8c8'] });
      for (var f = 0; f < (mob ? 10 : 16); f++) {
        var left = R() < .5, top = R() < .4;
        frond(x, { x: left ? rr(-w * .05, w * .3) : rr(w * .7, w * 1.05), y: top ? rr(-h * .05, h * .15) : rr(h * .6, h * 1.02),
          a: top ? (left ? rr(.1, .9) : Math.PI - rr(.1, .9)) : (left ? -rr(.3, 1.3) : -Math.PI + rr(.3, 1.3)), len: rr(h * .18, h * .32),
          col: pick(['#4fa7a6', '#62b8a8', '#5a9fc0']), alt: ['#7cc7b9', '#6fb0d6'], n: 14, bend: rr(.15, .35), rim: '#e8f8ff', rimA: .25 });
      }
      for (var b = 0; b < 6; b++) leaf(x, { x: R() < .5 ? rr(0, w * .25) : rr(w * .75, w), y: rr(h * .5, h), a: -Math.PI / 2 + rr(-.8, .8), len: rr(h * .2, h * .32), wid: rr(h * .04, h * .06), bend: rr(-.2, .2), col: pick(['#4f9fae', '#5fb3b8']), rim: '#f2fbff', rimA: .3 });
      haze(x, w, h, '#dfe5f7', .32);
    });

    // 2 · mittlerer Urwald (Smaragd, Jade), Blüten, Boden mit Moos und Farn; die Mitte bleibt frei
    layer(2, 1, function (x, w, h, mob) {
      // Boden
      for (var m = 0; m < 7; m++) {
        var mx = rr(-w * .1, w * 1.1), my = h * rr(.86, 1.02), mr = rr(w * .22, w * .4);
        var g = x.createRadialGradient(mx, my - mr * .4, 0, mx, my, mr); g.addColorStop(0, '#5fbf8f'); g.addColorStop(.7, '#2e8f78'); g.addColorStop(1, 'rgba(36,110,100,0)');
        x.fillStyle = g; x.beginPath(); x.ellipse(mx, my, mr, mr * .45, 0, 0, 7); x.fill();
      }
      for (var fe = 0; fe < (mob ? 12 : 20); fe++) frond(x, { x: rr(0, w), y: h * rr(.88, 1.02), a: -Math.PI / 2 + rr(-1.1, 1.1), len: rr(h * .1, h * .17), col: pick(['#2f9e7e', '#3aad86']), alt: ['#5cc79a', '#2a8f8a'], n: 12, leaflet: .3, wf: .18, droop: .35, rim: '#f0fff6', rimA: .3 });
      // Bananenblätter von den Seiten
      for (var b = 0; b < (mob ? 6 : 9); b++) {
        var left = b % 2 === 0, by = rr(h * .12, h * .9);
        leaf(x, { x: left ? rr(-w * .08, w * .04) : rr(w * .96, w * 1.08), y: by, a: (left ? 0 : Math.PI) + (left ? 1 : -1) * rr(-.55, .35), len: rr(w * .28, w * .42) * (mob ? 1 : .8), wid: rr(h * .035, h * .055),
          bend: (left ? 1 : -1) * rr(.08, .22), col: pick(['#1f8a7a', '#2a9d8a', '#178a8f', '#3aa676']), rim: pick(PEARL_STRONG), rimA: .45, veins: 14 });
      }
      // Monstera unten links/rechts
      for (var k = 0; k < 4; k++) {
        var lk = k % 2 === 0;
        monstera(x, { x: lk ? rr(0, w * .18) : rr(w * .82, w), y: rr(h * .62, h * .92), a: (lk ? -.4 : Math.PI + .4) + rr(-.4, .4), size: rr(w * .12, w * .19) * (mob ? 1.1 : .75), col: pick(['#1d8f74', '#26a083', '#1b7f86']) });
      }
      for (var l = 0; l < 3; l++) liana(x, { x: R() < .5 ? rr(w * .05, w * .25) : rr(w * .75, w * .95), len: rr(h * .25, h * .45), sway: rr(8, 22), dx: rr(-10, 10), ph: rr(0, 6), w: 3, stem: '#2f6b5a', leaf: 20, col: '#2fa07f', alt: ['#47b890', '#2b8fa0'], rim: '#fff0f6' });
      // Blüten (El Dorado)
      for (var fl = 0; fl < (mob ? 6 : 9); fl++) {
        var fx = R() < .5 ? rr(w * .02, w * .26) : rr(w * .74, w * .98);
        flower(x, { x: fx, y: rr(h * .55, h * .95), r: rr(w * .025, w * .045) * (mob ? 1.3 : 1), a: rr(0, 6), col: pick(['#f48fb8', '#ff9f7a', '#f7b9d6', '#e98be6', '#ffc56e']) });
      }
      haze(x, w, h, '#e6ecfa', .1);
    });
    }

    // Lichtung
    var glow = document.createElement('div'); glow.className = 'ak-glow'; world.appendChild(glow);

    // 3 · vordere Blätter als einzelne Teile mit eigenem Wiegen und Schatten
    function sprite(sw, sh, ax, ay, place, fn) {
      var c = canvas(sw, sh, Math.min(DPR, 1.5)); fn(c.x, sw, sh);
      var shade = canvas(sw, sh, .5); shade.x.drawImage(c.c, 0, 0, sw, sh);
      shade.x.globalCompositeOperation = 'source-in'; shade.x.fillStyle = '#16233f'; shade.x.fillRect(0, 0, sw, sh);
      shade.c.className = 'ak-shade'; shade.c.style.width = sw + 'px'; shade.c.style.height = sh + 'px';
      c.c.className = 'ak-sprite'; c.c.style.width = sw + 'px'; c.c.style.height = sh + 'px';
      sprites.push({ el: c.c, sh: shade.c, x: place[0] - sw * ax, y: place[1] - sh * ay, ax: ax, ay: ay, w: sw, h: sh,
        amp: rr(.8, 1.8), f: rr(.00028, .00048), ph: rr(0, 6) });
    }
    var S = mob ? W * .82 : Math.max(W, H * .6);
    if (AK.style === 'eldorado') edSprites(sprite, mob ? S : Math.min(W * .52, H * .95), mob); else {
    // oben links: hängende Wedel
    sprite(S * .62, S * .62, 0, 0, [-W * (mob ? .12 : .04), -H * (mob ? .06 : .03)], function (x, w, h) {
      for (var i = 0; i < 4; i++) frond(x, { x: w * .02, y: h * .02, a: rr(.2, 1.05), len: rr(w * .6, w * .85), col: pick(['#0f5a5c', '#14505f', '#1b6a5a']), alt: ['#1f7a66', '#20465f'], n: 16, bend: rr(.25, .45), rim: pick(PEARL_STRONG), rimA: .55 });
    });
    // oben rechts: Monstera hängt herein
    sprite(S * .6, S * .55, 1, 0, [W * (mob ? 1.12 : 1.04), -H * (mob ? .05 : .02)], function (x, w, h) {
      monstera(x, { x: w * .74, y: h * .2, a: Math.PI * .74, size: w * .34, col: '#12605f' });   // ganz in der Fläche, sonst harte Kante
      for (var i = 0; i < 2; i++) leaf(x, { x: w, y: h * rr(0, .2), a: Math.PI * rr(.6, .8), len: w * rr(.6, .8), wid: w * .07, bend: -.18, col: pick(['#14505f', '#1b6a5a']), rim: '#c3b2fa', rimA: .55, veins: 12 });
    });
    // unten links: Bananenblatt wächst hoch
    sprite(S * .55, S * .8, 0, 1, [-W * .05, H * 1.03], function (x, w, h) {
      for (var i = 0; i < 3; i++) leaf(x, { x: w * .05 + i * w * .08, y: h, a: -Math.PI / 2 + rr(.15, .7), len: h * rr(.7, .95), wid: w * .11, bend: rr(.12, .28), col: pick(['#0f5a5c', '#1b6a5a', '#165f6e']), rim: pick(PEARL_STRONG), rimA: .55, veins: 18 });
      frond(x, { x: w * .1, y: h, a: -Math.PI / 2 + .35, len: h * .55, col: '#17614f', alt: ['#1f7a66'], n: 14, rim: '#f8bed7', rimA: .45 });
    });
    // unten rechts: Farn und Monstera
    sprite(S * .58, S * .6, 1, 1, [W * 1.05, H * 1.03], function (x, w, h) {
      monstera(x, { x: w * .82, y: h * .78, a: -Math.PI * .72, size: w * .36, col: '#145a63' });
      for (var i = 0; i < 3; i++) frond(x, { x: w * rr(.7, 1), y: h, a: -Math.PI / 2 - rr(.2, .9), len: h * rr(.55, .8), col: pick(['#0f5a5c', '#1b6a5a']), alt: ['#20465f'], n: 15, rim: pick(PEARL_STRONG), rimA: .5 });
      flower(x, { x: w * .45, y: h * .72, r: w * .07, a: .4, col: '#f48fb8' });
    });
    }
    // Schatten liegen über der Mitte (unter dem Text), die Blätter ganz vorne
    sprites.forEach(function (s) { world.appendChild(s.sh); });

    // Strahlen von oben rechts (dort steht die Sonne)
    rays = document.createElement('div'); rays.className = 'ak-rays';
    var src = [W * .7, -H * .06];
    for (var r = 0; r < 7; r++) {
      var ray = document.createElement('div'); ray.className = 'ak-ray';
      var wv = rr(.07, .2) * Math.max(W, 500), ang = -32 + r * 9 + rr(-3, 3);
      ray.style.left = (src[0] - wv / 2) + 'px'; ray.style.width = wv + 'px';
      ray.style.transform = 'rotate(' + ang.toFixed(1) + 'deg)';
      var o1 = rr(.3, .55);
      ray.style.setProperty('--o1', o1.toFixed(2)); ray.style.setProperty('--o2', (o1 * rr(.3, .7)).toFixed(2)); ray.style.setProperty('--o3', clamp(o1 * rr(1.1, 1.7), 0, .7).toFixed(2));
      ray.style.opacity = o1;
      if (!reduce) ray.style.animation = 'akRay ' + rr(5, 11).toFixed(1) + 's ease-in-out ' + (-rr(0, 10)).toFixed(1) + 's infinite';
      rays.appendChild(ray);
    }
    world.appendChild(rays);

    // Lichtflecken durch die Blätter (wandern langsam)
    var dap = document.createElement('div'); dap.className = 'ak-dapple';
    for (var d = 0; d < 9; d++) {
      var sp = document.createElement('i'); sp.className = 'ak-spot';
      var sz = rr(.12, .3) * Math.min(W, H);
      sp.style.cssText = 'left:' + rr(.1, .9) * W + 'px;top:' + rr(.25, .95) * H + 'px;width:' + sz + 'px;height:' + sz * rr(.5, .8) + 'px;margin:' + (-sz / 2) + 'px 0 0 ' + (-sz / 2) + 'px;--dx:' + rr(-30, 30) + 'px;--dy:' + rr(-20, 20) + 'px;'
        + (reduce ? '' : 'animation:akSpot ' + rr(7, 14).toFixed(1) + 's ease-in-out ' + (-rr(0, 14)).toFixed(1) + 's infinite;');
      dap.appendChild(sp);
    }
    world.appendChild(dap);

    sprites.forEach(function (s) { world.appendChild(s.el); });

    // Glühwürmchen + Glitzer
    var fxc = canvas(W, H, Math.min(DPR, 1.5)); fxC = fxc.c; fxX = fxc.x; fxC.className = 'ak-fx'; world.appendChild(fxC);

    // Linsen-Glanz entlang der Linie Sonne → Mitte
    flare = document.createElement('div'); flare.className = 'ak-flare';
    var fl = [[.22, .1, '#fae4b4', .35], [.45, .05, '#c3b2fa', .3], [.62, .16, '#96dcf5', .18], [.8, .07, '#f8bed7', .28]];
    fl.forEach(function (f) {
      var i = document.createElement('i'), s = f[1] * Math.min(W, H);
      i.style.cssText = 'width:' + s + 'px;height:' + s + 'px;margin:' + (-s / 2) + 'px 0 0 ' + (-s / 2) + 'px;background:radial-gradient(closest-side,' + rgba(f[2], f[3]) + ',' + rgba(f[2], f[3] * .4) + ' 70%,' + rgba(f[2], 0) + ');';
      i._t = f[0]; flare.appendChild(i);
    });
    world.appendChild(flare);
    sheen = document.createElement('div'); sheen.className = 'ak-sheen'; world.appendChild(sheen);
    initParticles();
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
        f1: .00018 + P() * .00025, f2: .00013 + P() * .0002, p1: P() * 6, p2: P() * 6, ax: 20 + P() * 50, ay: 14 + P() * 40,
        pf: .0012 + P() * .0022, pp: P() * 6, s: 10 + P() * 16, spr: sprFly[Math.floor(P() * sprFly.length)] });
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
  var ptr = { x: 0, y: 0, tx: 0, ty: 0 }, pan = 0, run = false, raf = 0;
  root.addEventListener('pointermove', function (e) {
    if (!AK.pointer) return;
    ptr.tx = (e.clientX / W - .5) * 2; ptr.ty = (e.clientY / H - .5) * 2;
  }, { passive: true });
  root.addEventListener('pointerleave', function () { ptr.tx = ptr.ty = 0; });

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var t = now - tStart; nowT = t;
    var p = drawWheel();
    var pn = items.length > 1 ? p / (items.length - 1) - .5 : 0;
    pan += (pn - pan) * .06;
    var k = touch ? .035 : .06;
    ptr.x += (ptr.tx - ptr.x) * k; ptr.y += (ptr.ty - ptr.y) * k;
    var dr = reduce ? 0 : AK.drift;
    var dx = (Math.sin(t * .00011) * 10 + Math.sin(t * .00023 + 1) * 5) * dr - ptr.x * 18 * AK.pointer;
    var dy = (Math.sin(t * .00009 + 2) * 7 + Math.cos(t * .00019) * 4) * dr - ptr.y * 12 * AK.pointer;
    // Einblenden: die Kamera sinkt ein Stück in den Wald (leichter Zoom)
    var ip = reduce ? 1 : clamp(t / (AK.introMs * 1.6), 0, 1), ie = 1 - Math.pow(1 - ip, 3);
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i], z = 1 + (1 - ie) * .06 * L.d;
      var x = L.ox + dx * L.d, y = L.oy + dy * L.d - pan * 2 * L.pan + (1 - ie) * 40 * L.d;
      L.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + z.toFixed(4) + ')';
    }
    for (var s = 0; s < sprites.length; s++) {
      var S = sprites[s], rot = reduce ? 0 : Math.sin(t * S.f + S.ph) * S.amp + Math.sin(t * S.f * 2.3 + S.ph * 2) * S.amp * .35;
      var sx = S.x + dx * 1.35, sy = S.y + dy * 1.35 - pan * 2 * PANS[3] * H * AK.scrollPan * 1.3 + (1 - ie) * 90;
      var tf = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0) translate(' + (S.w * S.ax) + 'px,' + (S.h * S.ay) + 'px) rotate(' + rot.toFixed(2) + 'deg) translate(' + (-S.w * S.ax) + 'px,' + (-S.h * S.ay) + 'px)';
      S.el.style.transform = tf;
      // Schatten: Licht kommt von oben rechts, also fällt er nach unten links auf den Wald dahinter
      S.sh.style.transform = 'translate3d(' + (sx - W * .035 - dx * .4).toFixed(1) + 'px,' + (sy + H * .03 - dy * .4).toFixed(1) + 'px,0) translate(' + (S.w * S.ax) + 'px,' + (S.h * S.ay) + 'px) rotate(' + (rot * 1.3).toFixed(2) + 'deg) scale(1.04) translate(' + (-S.w * S.ax) + 'px,' + (-S.h * S.ay) + 'px)';
    }
    if (rays) rays.style.transform = 'translate3d(' + (dx * .25).toFixed(1) + 'px,' + (dy * .15).toFixed(1) + 'px,0)';
    if (flare) {
      var fx0 = W * .7 + dx * .3, fy0 = -H * .06, fcx = W * .5 - dx * 1.2, fcy = H * .55 - dy * 1.2;
      for (var f = 0; f < flare.children.length; f++) {
        var c = flare.children[f], tt = c._t;
        c.style.transform = 'translate3d(' + (fx0 + (fcx - fx0) * tt * 1.4).toFixed(1) + 'px,' + (fy0 + (fcy - fy0) * tt * 1.4).toFixed(1) + 'px,0)';
      }
    }
    if (sheen) sheen.style.transform = 'translate3d(' + (Math.sin(t * .00007) * W * .12 + dx * 2).toFixed(1) + 'px,' + (pan * -H * .1 + dy).toFixed(1) + 'px,0)';
    drawFx(t);
  }

  function drawFx(t) {
    if (!fxX) return;
    fxX.clearRect(0, 0, W, H);
    fxX.globalCompositeOperation = 'lighter';
    for (var i = 0; i < flies.length; i++) {
      var F = flies[i], x, y, a;
      var wx = Math.sin(t * F.f1 + F.p1) * F.ax + Math.sin(t * F.f2 * 2.1 + F.p2) * F.ax * .4;
      var wy = Math.cos(t * F.f2 + F.p2) * F.ay + Math.sin(t * F.f1 * 1.7 + F.p1) * F.ay * .5;
      var q = reduce ? 1 : clamp((t - F.d) / F.dur, 0, 1), e = q < 1 ? 1 - Math.pow(1 - q, 3) : 1;
      // Einflug auf einem Bogen, dann frei schwebend
      var bx = F.sx + (F.hx - F.sx) * e + Math.sin(e * Math.PI) * (F.hy - F.sy) * .25, by = F.sy + (F.hy - F.sy) * e - Math.sin(e * Math.PI) * (F.hx - F.sx) * .25;
      x = bx + wx * e; y = by + wy * e;
      var pulse = .5 + .5 * Math.sin(t * F.pf + F.pp); pulse = pulse * pulse;
      a = (reduce ? .7 : (.25 + .75 * pulse)) * (q < 1 ? .6 + .4 * e : 1);
      var s = F.s * (.75 + .5 * pulse);
      fxX.globalAlpha = a; fxX.drawImage(F.spr, x - s, y - s, s * 2, s * 2);
    }
    if (!reduce) {
      for (var k = sparks.length - 1; k >= 0; k--) {
        var P = sparks[k];
        var age = t - P.t0;
        if (age > P.life) { if (sparks.length > AK.glitter) sparks.splice(k, 1); else sparks[k] = newSpark(null, false); continue; }
        var u = age / P.life, tw = Math.sin(u * Math.PI); tw = tw * tw * tw;
        var ss = P.s * (.4 + tw);
        fxX.globalAlpha = tw * .9;
        fxX.save(); fxX.translate(P.x, P.y + age * P.vy * 10); fxX.rotate(P.rot + u * .6);
        fxX.drawImage(P.spr, -ss, -ss, ss * 2, ss * 2); fxX.restore();
      }
    }
    fxX.globalAlpha = 1; fxX.globalCompositeOperation = 'source-over';
  }

  function start() { if (run) return; run = true; raf = requestAnimationFrame(frame); }
  function stop() { run = false; cancelAnimationFrame(raf); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });

  // Grösse: nur bei neuer Breite neu malen (Safari-Leisten ändern nur die Höhe)
  var lastW = 0, rsT = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rsT);
    rsT = setTimeout(function () {
      if (Math.abs(root.clientWidth - lastW) > 20) { lastW = root.clientWidth; paintScene(); }
      measureWheel();
    }, 180);
  });

  // ---------- Start ----------
  function boot() {
    var cover = document.createElement('div'); cover.className = 'ak-cover'; root.appendChild(cover);
    paintScene(); lastW = W;           // teuer: einmal beim Laden, solange die Seite noch perlweiss ist
    setupWheel();
    drawWheel();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        tStart = performance.now();
        html.classList.add('ak-on');
        // Inhalt gestaffelt (Bewegungssystem: ui 420 ms Abstand)
        var kids = root.querySelectorAll('.ak-inner > *');
        for (var i = 0; i < kids.length; i++) kids[i].style.transitionDelay = (450 + i * 140) + 'ms';
        start();
        setTimeout(function () { cover.remove(); for (var j = 0; j < kids.length; j++) kids[j].style.transitionDelay = ''; }, AK.introMs + 1400);
      });
    });
  }
  if (document.fonts && document.fonts.ready) {
    var done = false, b = function () { if (!done) { done = true; boot(); } };
    document.fonts.ready.then(b); setTimeout(b, 1200);
  } else boot();
})();
