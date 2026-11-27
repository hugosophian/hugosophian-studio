/* ALCHEMIST KURZ · /alchemist-kurz · hugosophian.studio
   Kurze Version der Alchemisten-Seite (Hugo 26./27.11.2026). Alles wird hier mit Canvas gemalt, keine Bilder
   (fester Zufall, darum bei jedem Besuch gleich).

   EINE SZENE: ein einziges hohes Bild, alles im Zeichenstil seiner El-Dorado-Referenzen –
   Formen, die dicht und bunt ineinander fliessen, dunkle Konturen, Farben in Zonen. Eigene Motive, nichts aus den
   Vorlagen kopiert, keine Tempel. Von oben nach unten: heller Himmel mit geschwungenen Schnecken-Wolken, Sonne und
   Berge im Hintergrund → das Blätterdach des Urwalds schliesst sich → darunter öffnet sich im Bogen die Lichtung:
   helle Wiese, goldener See, ferner Wald, links und rechts Urwald. Die Kamera macht einen grossen Schwung direkt von
   oben nach unten (langsam los, schnell durch die Mitte, weich landen). Nichts wird überblendet: unten steht dasselbe
   Bild still, und nur der Text der kurzen Website blendet darüber ein (dunkle Schrift auf Himmel und Wiese).

   VON HAND: Ausserhalb des Rads lässt sich die ganze Szene gemütlich verschieben – seitlich in
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
       .ak-inner > .ak-head (.ak-kicker, h1.ak-title, .ak-lead: hält nur noch seinen Platz, sichtbar ist der Slogan im offenen Menü, siehe leadToMenu)
                 > .ak-wheel [data-ak-wheel] > .ak-item [data-ak-item] (.ak-item-name, .ak-item-price, .ak-item-info)
                 > .ak-caption [data-ak-caption]   (Kasten im Aussehen der Glas-Knöpfe; der Text steht fest oben und schreibt sich um, wenn das Rad steht)
                 > .ak-contact (a.grey …, ausgeblendet) > a.ak-long (wandert als Knopf ins Menü, siehe linkToMenu)
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
    rowDeg: 21,           // Grad pro Zeile auf dem Zylinder (Apple ~ 20)
    drift: 1,             // ruhige Eigenbewegung der Kamera (0 = aus)
    pointer: 1,           // Maus / Finger bewegt die Ebenen (0 = aus)
    scrollPan: 1,         // Scrollen im Rad schiebt den Wald (0 = aus)
    freePan: 1,           // die Szene lässt sich von Hand wieder nach oben in den Himmel schieben (0 = aus). Seitlich nicht: das ist seit 27.11., 15:33 ganz weg
    panSoft: 420,         // so weich zieht die Kamera dem Finger nach (Millisekunden; grösser = weicher)
    sway: 1,              // Wedel am Rand und Ranken wiegen sich im Wind (0 = aus)
    fireflies: 9,         // Glühwürmchen (nur ein paar, klein, ruhig; Handy etwas weniger)
    glitter: 22,          // Glitzer-Funken
    introMs: 1500,        // Einblenden ohne Flug (Bewegungssystem: page)
    flyInMs: [2200, 4200] // Glühwürmchen fliegen so lange ein (von – bis)
  };
  var EASE_OUT = 'cubic-bezier(.22,1,.36,1)';
  var PEARL_STRONG = ['#96dcf5', '#c3b2fa', '#f8bed7', '#fae4b4'];

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(hover: none)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  // ---------- Leistung auf einfachen Geräten («schnell laden, sehr smooth auf simplen Geräten») ----------
  // 1. Geräte mit wenig Arbeitsspeicher (meldet nur Chrome/Android) malen von Anfang an gröber: TIER 1 = bis 4 GB, TIER 2 = bis 2 GB (dort wiegt sich nichts).
  // 2. Ein Wächter misst im Betrieb, wie lange die Bilder brauchen. Ruckelt es, fällt Schmuck weg, in drei Stufen (lv), nie zurück:
  //    Stufe 1: Sonnen-Wellen, Schwenken der Lichtstrahlen, Schimmer, Fahrtwind · Stufe 2: Wiegen der Pflanzen, Schwenken des Sonnenfelds,
  //    Lichtflecken, Linsen-Glanz, Titel-Schimmer · Stufe 3: Lichtstrahlen, Glühwürmchen, Schwenken der Sonnenstrahlen, Schweben des Blicks, Ziehen der Wolken.
  //    Das Bild selbst, der Flug, das Rad und der Parallax bleiben immer.
  var MEM = navigator.deviceMemory || 0, TIER = MEM && MEM <= 2 ? 2 : MEM && MEM <= 4 ? 1 : 0, SWAY = 1, lv = 0, pw = { n: 0, slow: 0, quick: 0, bad: 0, t: 0, t0: 0, fast: 0 }, fN = 0;
  function setLevel(n) {
    n = Math.min(3, n); if (n <= lv) return; lv = n;
    for (var i = 1; i <= 3; i++) root.classList.toggle('ak-l' + i, lv >= i);
    // <test>
    if (location.hash === '#ak-test') window.__akLevel = lv;
    // </test>
  }
  function watch(raw, now) {   // raw = Zeit seit dem letzten Bild
    if (lv >= 3 || reduce) return;
    if (raw > 250 || now < pw.t) { pw.n = pw.slow = pw.quick = 0; return; }   // Seite war im Hintergrund, ein einzelner Hänger, oder Schonfrist (Start, Landung, kurz nach einer Stufe): nicht werten
    if (!pw.n) pw.t0 = now - raw;
    // Hat das Gerät schon einmal flüssig 60 Bilder pro Sekunde gezeigt (pw.fast), gilt das als Ziel. Sonst ist der Bildschirm wohl auf 30 begrenzt
    // (Stromsparmodus des iPhones): dann zählt erst, was schlechter als 30 ist – dort brächte Weglassen nichts.
    pw.n++; if (raw > (pw.fast ? 25 : 36)) pw.slow++; if (raw < 21) pw.quick++;
    if (now - pw.t0 < 1300 || pw.n < 10) return;      // alle 1.3 Sekunden urteilen
    if (pw.quick >= pw.n * .7) pw.fast = 1;
    if (pw.slow >= pw.n * .3) { if (++pw.bad >= 2 || fl) { setLevel(lv + 1); pw.bad = 0; pw.t = now + 900; } } else pw.bad = 0;   // zweimal hintereinander schlecht (im Flug einmal): eine Stufe hinunter
    pw.n = pw.slow = pw.quick = 0;
  }
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
    /* Schmetterlinge: der Rahmen wandert langsam auf einer kleinen Bahn, das Bild darin schlägt mit den Flügeln */
    '.ak-fly { position: absolute; will-change: transform; animation: akRoam 20s ease-in-out infinite; }',
    '.ak-flap { display: block; will-change: transform; animation: akFlap .4s ease-in-out infinite; }',
    '@keyframes akRoam { 0%, 100% { transform: translate3d(0,0,0) rotate(-10deg); } 22% { transform: translate3d(var(--x1), var(--y1), 0) rotate(14deg); } 48% { transform: translate3d(var(--x2), var(--y2), 0) rotate(-6deg); } 74% { transform: translate3d(var(--x3), var(--y3), 0) rotate(12deg); } }',
    '@keyframes akFlap { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(.24); } }',
    '.ak-far .ak-fly, .ak-far .ak-flap, .ak-l2 .ak-fly, .ak-l2 .ak-flap { animation-play-state: paused; }',
    /* Stufen für einfache Geräte (siehe setLevel): Schmuck fällt weg, das Bild bleibt */
    '.ak-l1 .ak-sunwave, .ak-l1 .ak-sheen { display: none; }',
    '.ak-l1 .ak-rays canvas { transform: none !important; }',
    '.ak-l2 .ak-sway { animation-play-state: paused; }',
    '.ak-l2 .ak-dapple, .ak-l2 .ak-flare { display: none; }',
    'html.ak-on [data-ak].ak-l2 .ak-title { animation: none; }',
    '.ak-l3 .ak-rays, .ak-l3 .ak-fx { display: none; }',
    /* Lesbarkeit: die kleinen Texte tragen einen feinen hellen Schein (der Titel nicht: er hat den Perlmutt-Verlauf) */
    /* ein einziges weiches Feld hinter der Mitte des Rads und der Beschreibung; fertig gemaltes Bild ohne Kanten */
    /* Licht: fertig gemalte Bilder mit normaler Deckkraft. Kein Mischmodus, keine Masken – die bremsten das Handy bei der Landung */
    '.ak-rays { left: 0; top: 0; will-change: transform; }',
    '.ak-rays canvas { position: absolute; left: 0; top: 0; will-change: opacity, transform; }',
    /* die Lichtstrahlen atmen und schwenken ruhig um die Sonne, die beiden Bilder gegeneinander */
    '@keyframes akRayA { 0%, 100% { opacity: 1; transform: rotate(-3deg); } 35% { opacity: .5; } 50% { transform: rotate(3deg); } 70% { opacity: .85; } }',
    '@keyframes akRayB { 0%, 100% { opacity: .55; transform: rotate(2.6deg); } 40% { opacity: 1; } 50% { transform: rotate(-2.6deg); } 75% { opacity: .65; } }',
    /* blasse Ornamente wachsen von der Sonne nach vorn und verblassen: Sonnenstrahlung */
    '.ak-sunwave { position: absolute; opacity: 0; will-change: transform, opacity; animation: akWave 13s linear infinite; }',
    '@keyframes akWave { 0% { transform: scale(.52) rotate(0deg); opacity: 0; } 14% { opacity: .5; } 62% { opacity: .2; } 100% { transform: scale(2.5) rotate(16deg); opacity: 0; } }',
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
    /* Einrasten: An der Zeile selbst rastet der Browser ein, darum bleibt sie unbewegt. Gedreht und verschoben (Zylinder) wird nur der Text
       darin (ak-turn). Vorher bewegte sich die Zeile mit, die Rastpunkte wanderten, und das Rad blieb am iPhone manchmal versetzt stehen. */
    '[data-ak-item] { scroll-snap-align: center; scroll-snap-stop: normal; cursor: pointer; user-select: none; -webkit-user-select: none; white-space: nowrap; }',
    '[data-ak-item] .ak-turn { will-change: transform, opacity; backface-visibility: hidden; }',
    '[data-ak-item] .ak-item-price, [data-ak-item] .ak-item-info { display: none !important; }',
    /* Die gewählte Zeile steht in einer Kapsel, so breit wie der Text. Beim Scrollen wächst und schrumpft sie von einer Textlänge zur
       nächsten (drawWheel). Sie sieht aus wie der Menü-Knopf der Site (Klasse GREY): Glas-Grau, innen weisser Rand mit weichem Schein,
       aussen schwarze Linie. Die Farben kommen aus denselben Webflow-Variablen. So ist sie über Wiese und Urwald gleich gut lesbar. */
    '.ak-band { position: absolute; z-index: 0; left: 50%; pointer-events: none; transform: translateX(-50%); box-sizing: border-box; border: 1px solid var(--farbe--weiss, #fff); border-radius: 999px;',
    '  background: var(--farbe--glas, rgba(168,168,168,.5)); outline: 1px solid var(--farbe--schwarz, #000); outline-offset: 0; box-shadow: inset 0 0 5px 0 #fff; }',
    /* Beschreibung: Der Kasten (Aussehen in der Webflow-Klasse ak-caption) bleibt stehen, und der Text steht fest an der oberen Kante.
       Der Text liegt unsichtbar im Layout (ak-cap-l: so bestimmt der Browser Umbruch und Platz jedes Buchstabens) und wird auf eine eigene
       Zeichenfläche gemalt (ak-cap-cv, siehe «Beschreibung im Kasten»). */
    '[data-ak-caption] { position: relative; }',
    '[data-ak-caption] .ak-cap-in { display: block; width: 100%; }',
    '[data-ak-caption] .ak-cap-l { display: block; visibility: hidden; }',
    '[data-ak-caption] .ak-w { white-space: nowrap; }',
    '.ak-cap-cv { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; }',
    '.ak-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }',
    '[data-ak-caption] .ak-cap-price { display: block; font-weight: 500; margin-bottom: .25em; letter-spacing: .04em; }',
    /* Titel: dunkler Verlauf mit wanderndem Glanz. Alle Schriften bleiben dunkel, auch über dem Urwald (Hugo 27.11., 19:11: «wieder ins Schwarz, ohne Animation») */
    '[data-ak] .ak-title { background: linear-gradient(100deg, #2a2442 0%, #2a2442 38%, #6e64a5 46%, #a68bd8 50%, #6e64a5 54%, #2a2442 62%, #2a2442 100%);',
    '  background-size: 260% 100%; background-position: 100% 0; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }',
    'html.ak-on [data-ak] .ak-title { animation: akTitle 7s ' + EASE_OUT + ' 2.6s infinite; }',
    /* Gewählte Zeile: schwarze Schrift mit weissem Schein wie im Menü-Knopf (sie steht auf dem Glas der Kapsel) */
    '[data-ak] [data-ak-item] { transition: color .25s ease, text-shadow .25s ease; }',
    '[data-ak] [data-ak-item].is-sel { color: var(--farbe--schwarz, #000); text-shadow: 0 0 1px #fff, 0 0 4px #fff, 0 0 1rem #fff; }',
    /* Slogan: steht nur noch im offenen Menü, genau an seinem Platz unter dem Titel und ohne Kasten (leadToMenu). Auf der Seite bleibt sein Platz frei */
    '[data-ak] .ak-lead.ak-moved { visibility: hidden; }',
    '.menu-panel > .ak-menu-lead { position: absolute; margin: 0; max-width: none; pointer-events: none; }',
    /* Noch einmal fliegen (replay): Antippen des Titels. Text und Menü-Knopf blenden weich aus, das Perlweiss vom Laden blendet ein, dann beginnt der Flug */
    'html.ak-on [data-ak] .ak-head { cursor: pointer; }',
    'html.ak-re [data-ak] .ak-inner { pointer-events: none; }',
    'html.ak-re [data-ak] .ak-inner > * { opacity: 0; transition: opacity 450ms ease; }',
    'html.ak-re .menu-toggle-wrap { opacity: 0 !important; transition: opacity 450ms ease !important; }',
    '.ak-cover.is-re { opacity: 0; transition: opacity 600ms ease; }',
    '.ak-cover.is-re.is-in { opacity: 1; }',
    '@keyframes akTitle { 0% { background-position: 100% 0; } 40%, 100% { background-position: 0% 0; } }',
    /* Handy: Die Grössen der Texte stehen in den Webflow-Klassen als min(…vw, …svh): sie richten sich nach der Breite und werden auf niedrigen
       Bildschirmen kleiner, damit oben nichts abgeschnitten wird und unten nichts unter dem Menü-Knopf liegt.
       Sehr alte Browser kennen svh nicht und würden die Werte verwerfen. Für sie stehen hier die Werte nur nach der Breite. */
    '@supports not (height: 1svh) { @media (max-width: 479px) { [data-ak] .ak-inner { padding-top: 14vw; padding-bottom: 30vw; } [data-ak] .ak-kicker { font-size: 3.6vw; }',
    '  [data-ak] .ak-title { margin-top: 1vw; font-size: 15vw; } [data-ak] .ak-lead { margin-top: 3vw; font-size: 4.2vw; } [data-ak] .ak-wheel { height: 60vw; margin-top: 6vw; }',
    '  [data-ak] .ak-item { height: 12vw; font-size: 5.4vw; } [data-ak] .ak-caption { width: 88vw; min-height: 26.2vw; margin-top: 4vw; padding: 3vw; border-radius: 6vw; font-size: 4.2vw; } } }',
    '@media (prefers-reduced-motion: reduce) { .ak-rays canvas, .ak-dapple canvas, .ak-sway, .ak-sunwave, .ak-fly, .ak-flap, html.ak-on [data-ak] .ak-title { animation: none !important; } }'
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
  // weitere Blüten, frei erfunden («die Blumen gefallen mir besonders, da kannst du kreativ weiter erfinden»)
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
  // noch mehr Arten («noch diversere Blumen», angeregt von Urwaldpflanzen – Hummerschere, Fackelingwer, Protea,
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
  // weitere Blüten («noch weitere spannende Blumen»). Sie wachsen nur an neuen Stellen, damit das Bisherige bleibt.
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
  // Schatten im Gegenlicht: Die Sonne steht hinten in der Mitte, also fallen die Schatten nach vorn und fächern nach aussen.
  // sx, sy = Punkt am Horizont unter der Sonne; (px, py) = Fuss; w = Breite am Fuss; len = Länge. Weich durch drei Lagen.
  function shadow(x, px, py, w, len, sx, sy) {
    var dx = (px - sx) * .5, dy = Math.max(8, py - sy), d = Math.sqrt(dx * dx + dy * dy), ux = dx / d, uy = dy / d, nx = -uy, ny = ux, k, g, a;
    for (k = 0; k < 3; k++) {
      a = w * (.55 + k * .22);
      g = x.createLinearGradient(px, py, px + ux * len, py + uy * len); g.addColorStop(0, 'rgba(24,84,60,.15)'); g.addColorStop(.55, 'rgba(24,84,60,.07)'); g.addColorStop(1, 'rgba(24,84,60,0)');
      x.beginPath(); x.moveTo(px + nx * a, py + ny * a); x.lineTo(px + ux * len + nx * a * 2.1, py + uy * len + ny * a * 2.1); x.lineTo(px + ux * len - nx * a * 2.1, py + uy * len - ny * a * 2.1); x.lineTo(px - nx * a, py - ny * a); x.closePath();
      x.fillStyle = g; x.fill();
    }
  }
  // Grandidier-Baobab, im Stil der Zeichnungen und in eigener Form: hoher, fast gerader, glatter rötlicher Stamm,
  // oben wenige waagrechte Äste und eine flache Krone. Die Blätter sind Zeichen in der Art der Wolken: runde Blöcke mit heller Kontur,
  // innen wiederholt sich die Form. Daran hängen Lianen mit Blüten. hz = Dunst der Ferne (0 … 1): je weiter weg, desto heller.
  function baobab(x, px, py, h, lw, hz, sunX) {
    function C(c) { return hz ? mix(c, '#bfe4f4', hz) : c; }
    var w = h * .19, th = h * .76, tc = C(pick(['#c8684a', '#d07a52', '#bf5f5a', '#c9705f'])), L = C(INK), ends = [], n = 5, s = h * .115,
        lv = pick([['#8fe3b4', '#1f9a72'], ['#86dfd0', '#168f8c'], ['#b4e58a', '#3f9e3a'], ['#7fdcc0', '#1a8f7c']]), i, t, a, bl, bx, ex, ey, yy,   // bläuliches Grün wie beim echten Baum
        look = function (sz) { return { n: 0, lw: Math.max(1, sz * .035), line: L, rim: C(mix(lv[0], '#ffffff', .4)), inF: 'rgba(255,255,255,.14)', c0: C(lv[0]), c2: C(lv[1]) }; }, o;
    function trunk() {   // unten leicht ausgestellt, dann fast zylindrisch, oben eine sanfte Schulter
      x.beginPath(); x.moveTo(px - w * .64, py);
      x.bezierCurveTo(px - w * .5, py - th * .1, px - w * .5, py - th * .3, px - w * .48, py - th * .72);
      x.bezierCurveTo(px - w * .47, py - th * .92, px - w * .34, py - th * .97, px - w * .28, py - th);
      x.lineTo(px + w * .28, py - th);
      x.bezierCurveTo(px + w * .34, py - th * .97, px + w * .47, py - th * .92, px + w * .48, py - th * .72);
      x.bezierCurveTo(px + w * .5, py - th * .3, px + w * .5, py - th * .1, px + w * .64, py);
      x.closePath();
    }
    for (i = 0; i < n; i++) {   // kurze Äste, flach ausgebreitet
      t = i / (n - 1) - .5; a = -Math.PI / 2 + t * 2.5 + rr(-.08, .08); bl = h * (.12 + Math.abs(t) * .2); bx = px + t * w * .5; ex = bx + Math.cos(a) * bl; ey = py - th + Math.sin(a) * bl * .62 - h * .03;
      x.beginPath(); x.moveTo(bx, py - th + w * .1); x.quadraticCurveTo(bx + Math.cos(a) * bl * .35, py - th - bl * .3, ex, ey); ol(x, w * .2 + lw * 2, L); ol(x, w * .2, tc);
      ends.push([ex, ey]);
    }
    trunk(); x.fillStyle = tc; x.fill();
    x.save(); trunk(); x.clip();
    if (sunX != null) {   // Gegenlicht: die Seite zur Sonne ist hell, die abgewandte dunkler
      var sd = sunX > px ? 1 : -1;
      x.fillStyle = C(mix(tc, '#fff0c0', .5)); x.fillRect(sd > 0 ? px + w * .2 : px - w * .7, py - th, w * .5, th);
      x.fillStyle = C(mix(tc, INK, .2)); x.fillRect(sd > 0 ? px - w * .7 : px + w * .34, py - th, w * .36, th);
    }
    for (i = 1; i <= 7; i++) { yy = py - th * i / 8; x.beginPath(); x.moveTo(px - w, yy + w * .08); x.quadraticCurveTo(px, yy - w * .14, px + w, yy + w * .08); ol(x, lw * 1.6, i % 2 ? mix(tc, '#ffffff', .26) : mix(tc, INK, .16)); }
    x.restore(); trunk(); ol(x, lw, L);
    [0, n - 1].forEach(function (i) {   // Lianen hängen aussen von der Krone, mit Blättchen und einer Blüte
      var e = ends[i], len = h * rr(.26, .46), ph = R() * 6, pts = [], q, c = C(pick(P_FLOWER));
      for (q = 0; q <= 8; q++) pts.push([e[0] + Math.sin(q * .8 + ph) * h * .02 * q / 8, e[1] + len * q / 8]);
      polyline(x, pts); ol(x, lw * 2.4, L); ol(x, lw * 1.1, C('#3fae6a'));
      for (q = 2; q <= 8; q += 2) { x.beginPath(); x.arc(pts[q][0] + (q % 4 ? 1 : -1) * h * .018, pts[q][1], h * (q === 8 ? .022 : .015), 0, 7); x.fillStyle = q === 8 ? c : C('#4fae3f'); x.fill(); ol(x, lw * .5, L); }
    });
    [0, n - 1].forEach(function (i) { o = look(s * .8); o.n = 2; glyphCloud(x, ends[i][0], ends[i][1] + s * .25, s * .8, o); });   // kleine Blattzeichen an den äusseren Ästen
    o = look(s); o.n = 4 + Math.floor(R() * 2); glyphCloud(x, px, py - th - h * .05, s, o);   // flache Krone
  }
  // hängende Liane mit Blattpaaren und kleinen Blüten, am Ende eine grosse Blüte («Lianen, die runter hängen und sich bewegen, mit Blumen»)
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

  // Wolke im Stil der El-Dorado-Zeichnungen (eigene Formen): runde Blöcke neben- und übereinander, jede Form
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
  // Sonne (eigene Gestaltung; noch mehr Ornamente, gern nach heiliger Geometrie und Goldenem Schnitt):
  // Die Ringe verkleinern sich nach innen im Goldenen Schnitt (jeder Radius = der vorige durch √φ), die Zahlen der Teile stammen
  // aus der Fibonacci-Reihe (8, 13, 21, 34), und in der Mitte liegt die «Saat des Lebens» aus sieben Kreisen.
  function sunBody(x, cx, cy, r, lw) {   // Kern der Sonne: steht still und liegt über den Strahlen
    var L = '#a8431a', A = 1.22, q = Math.sqrt(PHI), R1 = A / q, R2 = A / PHI, R3 = R2 / q, R4 = R2 / PHI, R5 = R4 / q, rho = r * R5 / 2 * .97, i, a;
    function at(ang, fn) { x.save(); x.translate(cx, cy); x.rotate(ang); fn(); x.restore(); }
    function ring(rad, col) { x.beginPath(); x.arc(cx, cy, r * rad, 0, 7); x.fillStyle = col; x.fill(); ol(x, lw, L); }
    ring(A, '#e85a2a');
    for (i = 0; i < 21; i++) at(i / 21 * 6.2832, function () { stone(x, r * (A + R1) / 2, 0, r * .2, r * .27, i % 3 === 0 ? '#1fa36a' : i % 3 === 1 ? '#f7c948' : '#f59a3a', { lw: lw * .7, line: L, kind: i % 3 ? 9 : 1, c2: i % 3 ? '#2bb6a0' : '#ffd75e', r: .42, j: 0 }); });   // Kranz aus 21 Steinen
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
  // Pfauenauge (Farben und Stil des Pfaus, eigene Form): smaragdgrünes Oval, darin Gold, Türkis und ein tiefblauer Kern
  function peye(x, px, py, s, lw, line) {
    x.beginPath(); x.ellipse(px, py, s * .62, s * .44, 0, 0, 7); x.fillStyle = '#1fa36a'; x.fill(); if (lw) ol(x, lw, line);
    x.beginPath(); x.ellipse(px + s * .08, py, s * .42, s * .3, 0, 0, 7); x.fillStyle = '#f2c040'; x.fill();
    x.beginPath(); x.arc(px + s * .14, py, s * .21, 0, 7); x.fillStyle = '#1fc0b0'; x.fill();
    x.beginPath(); x.arc(px + s * .18, py, s * .1, 0, 7); x.fillStyle = '#2a2f9a'; x.fill();
  }
  // Strahlen der Sonne: 13 Flammen, dazwischen 13 Pfauenfedern mit Auge. b = Biegung (−1 … 1): die Strahlen sind gebogen und schwenken
  // ruhig von einer Richtung in die andere. Wird im Takt in ein kleines eigenes Bild gemalt.
  function sunRays(x, cx, cy, r, lw, b, b2) {
    var L = '#a8431a', i, a, Ln, w, by;
    function blade(Ln, w, by, tip, col, line) {
      x.beginPath(); x.moveTo(0, -w * .2);
      x.bezierCurveTo(Ln * .28, -w * 1.05 + by * .08, Ln * (.74 + .22 * tip), -w * (.8 + .3 * tip) + by * (.58 + .32 * tip), Ln, by);
      x.bezierCurveTo(Ln * (.72 + .23 * tip), w * (.62 + .36 * tip) + by * (.62 + .3 * tip), Ln * .28, w * .95 + by * .1, 0, w * .2);
      x.closePath(); x.fillStyle = col; x.fill(); ol(x, lw * .8, line);
    }
    for (i = 0; i < 26; i++) {
      a = i / 26 * 6.2832 - Math.PI / 2;
      x.save(); x.translate(cx + Math.cos(a) * r * 1.13, cy + Math.sin(a) * r * 1.13); x.rotate(a);
      if (i % 2 === 0) {
        Ln = r * .84; by = b * Ln * .42; blade(Ln, r * .15, by, 0, i % 4 ? '#ffd75e' : '#f7c948', L);
        x.beginPath(); x.moveTo(Ln * .14, by * .02); x.bezierCurveTo(Ln * .3, by * .09, Ln * .55, by * .36, Ln * .68, by * .55); ol(x, lw * .6, '#f59a3a');
      } else {
        Ln = r * .62; by = b2 * Ln * .5; blade(Ln, r * .17, by, 1, '#1fa36a', '#0e5c48');
        x.beginPath(); x.moveTo(Ln * .1, by * .01); x.bezierCurveTo(Ln * .25, by * .07, Ln * .45, by * .25, Ln * .56, by * .42); ol(x, lw * .5, '#8fe0b0');
        peye(x, Ln * .7, by * .6, r * .2, 0);
      }
      x.restore();
    }
  }
  // Feld um die Sonne: 144 Steine und Ringe, jeder 137.5° (Goldener Winkel) weiter und etwas weiter aussen – wie die Kerne einer
  // Sonnenblume. So entstehen von selbst die Spiralarme, die weit in den Himmel laufen, kleiner und blasser werden. Dazu Perlenkreise
  // in Abständen des Goldenen Schnitts (55, 89 und 144 Perlen).
  function sunField(x, cx, cy, r, lw, d0, d1) {   // d0 … d1: nur die Zeichen in diesem Ring (in Sonnenradien), ohne Angabe alle
    var N = 144, n, t, a, d, sz, k, i, m;
    d0 = (d0 || 0) * r; d1 = (d1 || 99) * r;
    for (k = 2; k <= 4; k++) {
      d = r * 1.22 * Math.pow(PHI, k); m = [55, 89, 144][k - 2];
      if (d >= d0 && d < d1) for (i = 0; i < m; i++) { a = i / m * 6.2832; x.beginPath(); x.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * (.04 - (k - 2) * .008), 0, 7); x.fillStyle = 'rgba(255,206,100,' + (.75 - (k - 2) * .22) + ')'; x.fill(); }
    }
    for (n = N; n >= 1; n--) {
      t = n / N; a = n * GA; d = r * (2.2 + 6.4 * Math.pow(t, .7)); sz = r * (.3 - .19 * t);
      if (d < d0 || d >= d1) continue;
      x.save(); x.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d); x.rotate(a); x.globalAlpha = 1 - t * .8;
      if (n % 6 === 0) peye(x, 0, 0, sz * .95, lw * (.7 - t * .3), 'rgba(14,92,72,.7)');   // jedes sechste Zeichen ist ein Pfauenauge
      else if (n % 3 === 0) {
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
      camRef = 0, camT = 0, cam = 0, QF = 1, BAO = [],
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
    LT.rowY = LT.band + rh / 2;   // Mitte der gewählten Zeile
    LT.btnHW = clamp(Math.max(cw, lg ? Math.min(lg.offsetWidth, W * .56) : 0) / 2, W * .16, W * .3);   // halbe Breite von Knöpfen und Link: so viel bleibt unten frei
    if (!(LT.band - LT.lead > 50 && LT.band < H * .7)) { LT.lead = H * .27; LT.band = H * .43; }
    if (!(LT.capB > LT.band)) LT.capB = LT.band + H * .2;
    LT.capT = cap && topOf(cap) > LT.band ? topOf(cap) : LT.capB - H * .1;   // Oberkante des Kastens mit der Beschreibung
    if (!(LT.contact > LT.capB - 4 && LT.contact < H)) LT.contact = Math.min(H * .9, LT.capB + H * .04);
    if (!(LT.longB > LT.contact && LT.longB < H * 1.05)) LT.longB = Math.min(H * .96, LT.contact + H * .14);
  }
  // Wie weit reicht ein Teil wirklich? Es wird einmal ganz klein gemalt und ausgemessen. So ist das Bild eines wiegenden Teils nur so
  // gross wie sein Inhalt und nicht so gross wie der Platz, der ihm zusteht (spart rund ein Viertel des Bildspeichers).
  var PRB = null;
  function extent(x0, y0, bw, bh, fn, seed) {
    var k = Math.min(1, 96 / Math.max(bw, bh)), w = Math.max(2, Math.ceil(bw * k)), h = Math.max(2, Math.ceil(bh * k)), l = w, t = h, r = -1, b = -1, d, i, j, m;
    try {
      if (!PRB) { PRB = document.createElement('canvas'); PRB.x = PRB.getContext('2d', { willReadFrequently: true }); }
      PRB.width = w; PRB.height = h; PRB.x.setTransform(k, 0, 0, k, -x0 * k, -y0 * k); R = rng(seed); fn(PRB.x);
      d = PRB.x.getImageData(0, 0, w, h).data;
      for (j = 0; j < h; j++) for (i = 0; i < w; i++) if (d[(j * w + i) * 4 + 3]) { if (i < l) l = i; if (i > r) r = i; if (j < t) t = j; if (j > b) b = j; }
    } catch (e) { r = -1; }
    if (r < 0) return [x0, y0, bw, bh];
    m = 2 / k + 4;   // Rand: zwei Messpunkte und etwas Luft
    l = Math.max(x0, Math.floor(x0 + l / k - m)); t = Math.max(y0, Math.floor(y0 + t / k - m));
    return [l, t, Math.min(x0 + bw, Math.ceil(x0 + (r + 1) / k + m)) - l, Math.min(y0 + bh, Math.ceil(y0 + (b + 1) / k + m)) - t];
  }
  // Ein Streifen = eine Tiefen-Ebene. y = 0 ist die Oberkante des Schlussbilds, der Weg der Kamera liegt bei y < 0.
  // Gemalt wird in Kacheln; jedes Teil (add) kennt seine Höhe und wird nur in den Kacheln gemalt, die es berührt.
  function strip(i, f, d, pk, dprFin, dprFly, fx) {   // f = Tempo nach oben/unten; fx bestimmt nur noch den Malrand (siehe XR)
    fx = fx || f;
    var mg = .08, cut = Math.floor(XR * fx / 4) * 4, mx = W * mg + XR * fx, pan = pk * H * AK.scrollPan, w = W + mx * 2, fh = H * (1 + mg * 2) + pan * 2 + HX, tf = Math.round(camT * f);   // mx und w bleiben, wie sie waren: so liegt jedes Teil am alten Platz. cut = Rand, der nie ins Bild kommt und nicht gemalt wird (Vielfaches von 4: scharf bei jeder Auflösung)
    var el = document.createElement('div'); el.className = 'ak-layer'; el.style.width = w + 'px'; el.style.height = (fh + tf) + 'px';
    var S = { el: el, f: f, d: d, w: w, fh: fh, tf: tf, ox: -mx, oy: -H * mg - pan - tf, pan: pan, vy: H * mg + pan, items: [], tiles: [], sw: [], post: [] };
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
        var dq = a < 0 ? dprFly : dprFin, kx = w / Math.round(w * dq), c = canvas(w - cut * 2, hi - lo, dq), x = c.x;   // kx: Breite eines Bildpunkts wie beim ganzen Streifen, so liegt alles haargenau am alten Platz
        c.c.style.cssText = 'position:absolute;left:' + (cut * dq * kx) + 'px;top:' + (lo + tf) + 'px;width:' + (c.c.width * kx) + 'px;height:' + (hi - lo) + 'px';
        x.translate(-cut, -lo);
        for (n = 0; n < todo.length; n++) { R = rng(todo[n][3]); x.save(); todo[n][2](x); x.restore(); }
        paper(x, 0, lo, w, hi - lo, i > 0 && i < 5 ? 1 : .45);   // Himmel und Berge bleiben glatter
        el.appendChild(c.c); S.tiles.push([c.c, lo]);
      }
      S.sw.forEach(function (q) {
        var b = extent(q[0] - q[6], q[1] - (q[3] ? 4 : q[2]), q[6] * 2, q[2] * 2, q[4], q[5]), c = canvas(b[2], b[3], Math.min(dprFin, 1.5)), P = rng(q[5] + 1);
        R = rng(q[5]); c.x.translate(-b[0], -b[1]); q[4](c.x); paper(c.x, b[0], b[1], b[2], b[3], 1);
        c.c.className = 'ak-sway'; c.c.style.cssText = 'left:' + b[0] + 'px;top:' + (b[1] + tf) + 'px;width:' + b[2] + 'px;height:' + b[3] + 'px;transform-origin:' + (q[0] - b[0]) + 'px ' + (q[1] - b[1]) + 'px'   // dreht um seinen Fuss (hängend: um den Ansatz)
          + ';--a:' + ((q[3] ? 1.2 : 1.6) + P() * 1.7).toFixed(2) + 'deg;animation-duration:' + (3.6 + P() * 3.4).toFixed(2) + 's;animation-delay:' + (-P() * 9).toFixed(2) + 's';
        el.appendChild(c.c);
        sways.push(c.c);
      });
      S.post.forEach(function (f) { f(el, tf); });   // eigene Elemente auf der Ebene (Schmetterlinge)
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
    });   // Feld, Strahlen und Kern der Sonne sind eigene Bilder darüber (sunParts)
    // kleine Wolken, die im Bild stehen bleiben (die grossen ziehen als einzelne Teile vorbei)
    [[.8, -.2, .07], [.24, -.34, .06]].forEach(function (c) {
      var s = U * c[2], py = vy + H * c[1];
      S.add(py - s * 1.6, py + s * .4, function (x) { glyphCloud(x, S.X(c[0]), py, s, cloudLook(s)); });
    });
    var m1 = function (px) { var d = clamp(Math.abs(px - sx) / (w * .44), 0, 1); return .1 + .9 * d * d * (3 - 2 * d); },
        m2 = function (px) { var d = clamp(Math.abs(px - sx) / (w * .38), 0, 1); return .07 + .93 * d * d * (3 - 2 * d); },
        hf1 = peaksFn(0, w, mob ? 4 : 7, U * (mob ? .4 : .46), m1), hf2 = peaksFn(0, w, mob ? 5 : 9, U * .2, m2);
    // Jede Bergtiefe liegt auf einer eigenen Ebene mit eigenem Tempo (Parallax zwischen den Bergen). Gemalt wird
    // genau wie vorher (gleiche Zufallszahlen); unter jeder Kette füllt ihre unterste Farbe bis zum Rand, damit im Flug nichts durchscheint.
    var TA = onto(SA, S), TN = onto(SN, S), TH = onto(SH, S), sd = AK.seed * 7919 + 5;
    TA.add(base - U * .5, base + 8, function (x) { strata(x, 0, w, base, hf1, 6, ['#f6f3ff', '#e2defc', '#d2cdfa', '#c2c0f6', '#b3b6f3', '#a6aef0'], { lw: lw * .8, line: 'rgba(96,100,205,.6)', wob: U * .006 }); }, sd + 4 * 31);
    SA.fill(base + TA.ay + 4, '#a6aef0');
    TN.add(base - U * .24, base + 8, function (x) { strata(x, 0, w, base, hf2, 6, ['#f0f4ff', '#b9aaf6', '#9c88ee', '#826fe3', '#6b5ed6', '#5955c8'], { lw: lw, line: '#3c3f9e', wob: U * .004 }); }, sd + 5 * 31);
    SN.fill(base + TN.ay + 4, 'linear-gradient(to bottom,#5955c8 0,#7f8be6 ' + Math.round(H * .05) + 'px,#98a2f2 ' + Math.round(H * .12) + 'px)');   // läuft in die Farbe der Hügel aus (Dunst zwischen den Ketten)
    TH.add(base - U * .03, bot + 6, function (x) { hills(x, 0, w, base + U * .012, bot, 11, ['#98a2f2', '#84a2ea', '#6ba6d8', '#52aac0', '#3fa8a6', '#33a28e', '#2f9a78', '#2f9464', '#3a9a52', '#4aa348', '#5aac44'], { lw: lw, line: 'rgba(24,48,120,.55)', amp: U * .012, fq: .02 }); }, sd + 6 * 31);
    SH.fill(bot + TH.ay, '#5aac44');
  }

  // Sonne in Teilen, alle auf der Himmelsebene und hinter den Bergen:
  //   Feld: die Ornamente, die von der Sonne nach aussen laufen, in drei Ringen. Sie machen das Schwenken der Strahlen mit, genau gleich
  //         langsam, jeder Ring etwas später als der innere. Unter dem Horizont sind sie verdeckt und werden nicht gemalt.
  //   Wellen: drei Kränze blasser Ornamente wachsen langsam nach vorn und verblassen (so strahlt die Sonne)
  //   Strahlen: werden im Takt gemalt, gebogen, und schwenken ruhig von einer Seite zur anderen
  //   Kern: steht still
  var sunRC = null;
  function sunParts(S) {
    var sx = S.X(SUN[0]), sy = S.vy + H * SUN[1] + S.tf, r = SR, lw = LW0 * .7 * 1.3, dp = Math.min(DPR, 2), hw = r * 2.5, k, c, i, a, n, fld = [];
    [[0, 3.9, 4.25, Math.min(DPR, 1.5)], [3.9, 6, 6.35, Math.min(DPR, 1.25)], [6, 99, 8.95, 1]].forEach(function (q) {
      var x0 = Math.max(0, sx - r * q[2]), x1 = Math.min(S.w, sx + r * q[2]), y0 = sy - r * q[2], y1 = sy + r * Math.min(q[2], 3.9), c = canvas(x1 - x0, y1 - y0, q[3]);
      c.x.translate(sx - x0, sy - y0); sunField(c.x, 0, 0, r, LW0 * .7 * 1.2, q[0], q[1]); paper(c.x, x0 - sx, y0 - sy, x1 - x0, y1 - y0, .45);
      c.c.style.cssText = 'position:absolute;left:' + x0 + 'px;top:' + y0 + 'px;width:' + (x1 - x0) + 'px;height:' + (y1 - y0) + 'px;transform-origin:' + (sx - x0) + 'px ' + (sy - y0) + 'px;will-change:transform';
      S.el.appendChild(c.c); fld.push(c.c);
    });
    for (k = 0; k < 3; k++) {
      c = canvas(hw * 2, hw * 2, dp); n = 13;
      for (i = 0; i < n; i++) {
        a = (i + k / 3) / n * 6.2832;
        c.x.save(); c.x.translate(hw + Math.cos(a) * r * 2, hw + Math.sin(a) * r * 2); c.x.rotate(a);
        if (i % 3 === 0) peye(c.x, 0, 0, r * .3, lw * .5, 'rgba(14,92,72,.5)');
        else stone(c.x, 0, 0, r * .3, r * .22, i % 3 === 1 ? '#ffe9a0' : '#ffcf8a', { lw: lw * .5, line: 'rgba(190,110,40,.55)', kind: 1, c2: '#ffffff', r: .42, j: 0 });
        c.x.restore();
      }
      c.c.className = 'ak-sunwave';
      c.c.style.cssText = 'left:' + (sx - hw) + 'px;top:' + (sy - hw) + 'px;width:' + hw * 2 + 'px;height:' + hw * 2 + 'px;animation-delay:' + (-k * 4.33) + 's';
      S.el.appendChild(c.c);
    }
    hw = r * 2.25; c = canvas(hw * 2, hw * 2, dp);
    c.c.style.cssText = 'position:absolute;left:' + (sx - hw) + 'px;top:' + (sy - hw) + 'px;width:' + hw * 2 + 'px;height:' + hw * 2 + 'px';
    S.el.appendChild(c.c); sunRC = { x: c.x, hw: hw, r: r, lw: lw, n: 0, ph: 0, f: fld };
    sunRays(c.x, hw, hw, r, lw, 0, 0);
    hw = r * 1.3; c = canvas(hw * 2, hw * 2, dp); sunBody(c.x, hw, hw, r, lw); paper(c.x, 0, 0, hw * 2, hw * 2, .45);
    c.c.style.cssText = 'position:absolute;left:' + (sx - hw) + 'px;top:' + (sy - hw) + 'px;width:' + hw * 2 + 'px;height:' + hw * 2 + 'px';
    S.el.appendChild(c.c);
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
      flow(x, cx - U * .04, cx + U * .04, yH + U * .004, ySh + U * .012, { n: 5, th: U * .008, amp: U * .002, pal: ['#fff8cc', '#ffe98a', '#fff2a8'], edge: '#fff2a8', inner: '#ffffff', lw: lw * .4, fq: 2 });   // heller Kern der Spiegelung: führt von der Sonne zum Rad
      x.restore();
      x.beginPath(); x.moveTo(-14, yH); x.lineTo(w + 14, yH); ol(x, lw, '#0a3f5a');
    });
    S.add(ySh - U * .03, bot + 4, function (x) {
      var q, g = x.createLinearGradient(0, ySh, 0, vy + H * (SHO + .235));
      g.addColorStop(0, '#eef9b4'); g.addColorStop(1, '#c9ec84');
      x.beginPath(); x.moveTo(-14, bot + 14); for (q = -14; q <= w + 14; q += 10) x.lineTo(q, shore(q)); x.lineTo(w + 14, bot + 14); x.closePath();
      x.fillStyle = g; x.fill(); ol(x, lw, 'rgba(40,120,80,.6)'); x.clip();
      flow(x, -30, w + 30, ySh + U * .012, vy + H * (SHO + .255), { n: mob ? 12 : 18, th: U * .012, grow: 1.8, amp: U * .006, pow: 1.3, pal: ['#f4fbc0', '#e2f4a0', '#d6f08e', '#c9ec84'], plain: 1 });
      for (q = 0; q < (mob ? 46 : 110); q++) {   // Tiefe: ganz hinten winzige Blüten, nur an den Seiten (die Mitte gehört dem Text)
        var fx = rr(0, w), fy = shore(fx) + U * rr(.012, .1), ft = (fy - ySh) / (U * .1);
        if (Math.abs(fx - cx) < W * (mob ? .3 : .16)) continue;
        x.beginPath(); x.arc(fx, fy, U * (.003 + .004 * ft), 0, 7); x.fillStyle = pick(P_FLOWER); x.globalAlpha = .55 + .35 * ft; x.fill();
      }
      x.globalAlpha = 1;
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
    // Drei Grandidier-Baobabs, nicht mehr («2 oder 3, etwas besser anreihen»): vorn links und rechts je ein grosser, gleich
    // hoch und auf gleicher Linie wie ein Tor zur Sonne; links dahinter ein kleinerer, der die Reihe in die Tiefe führt (heller im Dunst).
    // [Platz in der Breite, Fuss unter dem Ufer (Anteil der Höhe), Höhe, Dunst, Nummer für den Zufall]
    BAO = [];
    (mob ? [[.3, .014, .1, .24, 1], [.17, .045, .165, .1, 2], [.83, .045, .165, .1, 3]]
         : [[.405, .014, .115, .24, 1], [.345, .05, .2, .1, 3], [.655, .05, .2, .1, 4]]).forEach(function (b, n) {
      var px = S.X(b[0]), py = ySh + H * b[1], h = H * b[2];
      BAO.push([b[0], SHO + b[1], h]);   // für die Fortsetzung der Schatten auf der nahen Wiese
      S.insert(mk + n, py - h * 1.25, py + h * 1.2, function (x) { shadow(x, px, py - 2, h * .11, h * 1.15, cx, yH); baobab(x, px, py, h, lw, b[3], cx); }, AK.seed * 7919 + 100003 + 700001 + b[4] * 31);
    });
  }

  // Urwald in zwei Teilen, damit er Tiefe bekommt:
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
  // ---------- Einfache Exoten ----------
  // Nach echten Urwaldpflanzen, frei und flächig gezeichnet: wenige klare Formen, kräftige Kontur, kaum Kleinteile.
  // Breite Blätter: Monstera, Strahlenpalme (Licuala), Pfeilblatt (Alocasia), Korbmarante (Calathea), Buntwurz (Caladium).
  // Blüten: Frangipani (Plumeria), Ruhmeskrone (Gloriosa), Kannenpflanze (Nepenthes). Hängend: Jadewein, Medinilla.
  function stemTo(x, r, col, lw) { x.beginPath(); x.moveTo(rr(-.2, .2) * r, r * .86); x.quadraticCurveTo(r * .08, r * .46, 0, r * .08); ol(x, lw * 3.1); ol(x, lw * 1.5, col); }
  function monstera(x, px, py, r, col, lw, a) {   // breites Herzblatt mit tiefen Schlitzen und Löchern
    var WL = [.92, .97, .86, .64], h = r * .29, c2 = mix(col, '#ffffff', .42), dk = mix(col, INK, .8), holes = [R() < .7, R() < .6, R() < .4], i, yA, w;
    function half() {   // rechte Hälfte: von der Bucht unten aussen herum zur Spitze
      x.moveTo(0, r * .1); x.bezierCurveTo(r * .3, r * .5, r * .9, r * .44, r * .92, r * .06);
      for (i = 0; i < 4; i++) {
        yA = r * .06 - i * h; w = WL[i] * r;
        x.quadraticCurveTo(w * 1.08, yA - h * .45, w * .92, yA - h * .8);
        x.lineTo(w * .32, yA - h * .9); x.lineTo((i < 3 ? WL[i + 1] : .42) * r, yA - h);
      }
      x.quadraticCurveTo(r * .3, -r * 1.32, 0, -r * 1.45);
    }
    x.save(); x.translate(px, py); x.rotate(a == null ? rr(-.75, .75) : a);
    stemTo(x, r, mix(col, INK, .3), lw);
    [1, -1].forEach(function (sg) {
      x.save(); x.scale(sg, 1);
      x.beginPath(); half(); x.closePath(); x.fillStyle = sg > 0 ? col : mix(col, '#ffffff', .1); x.fill();
      x.beginPath(); half(); ol(x, lw);
      for (i = 0; i < 4; i++) { yA = r * .06 - i * h; x.beginPath(); x.moveTo(0, yA - h * .1); x.quadraticCurveTo(WL[i] * r * .4, yA - h * .3, WL[i] * r * .78, yA - h * .42); ol(x, lw * .6, c2); }
      for (i = 0; i < 3; i++) if (holes[(i + (sg > 0 ? 0 : 1)) % 3]) { x.beginPath(); x.ellipse(r * .3, r * .06 - i * h - h * .68, r * .085, r * .04, -.5, 0, 7); x.fillStyle = dk; x.fill(); }
      x.restore();
    });
    x.beginPath(); x.moveTo(0, r * .1); x.lineTo(0, -r * 1.36); ol(x, lw * .9, c2);
    x.restore();
  }
  function fanPalm(x, px, py, r, col, lw, a) {   // runder gefalteter Fächer mit gezacktem Rand
    var n = 13, i, g, rad, a0 = -Math.PI * 1.12, sw = Math.PI * 1.24, c2 = mix(col, '#ffffff', .34), c3 = mix(col, INK, .3);
    x.save(); x.translate(px, py); x.rotate(a == null ? rr(-.7, .7) : a);
    stemTo(x, r, c3, lw);
    x.beginPath(); x.moveTo(0, 0);
    for (i = 0; i <= n * 2; i++) { g = a0 + sw * i / (n * 2); rad = r * (i % 2 ? 1 : .86); x.lineTo(Math.cos(g) * rad, Math.sin(g) * rad); }
    x.closePath(); x.fillStyle = col; x.fill(); ol(x, lw);
    for (i = 1; i < n * 2; i++) { g = a0 + sw * i / (n * 2); rad = r * (i % 2 ? .93 : .8); x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(g) * rad, Math.sin(g) * rad); ol(x, lw * .55, i % 2 ? c2 : c3); }
    x.restore();
  }
  function alocasia(x, px, py, r, col, lw, a) {   // Pfeilblatt mit hellen, kräftigen Adern
    var dk = mix(col, INK, .34), v = mix(col, '#ffffff', .74), i;
    x.save(); x.translate(px, py); x.rotate(a == null ? rr(-.8, .8) : a);
    stemTo(x, r, dk, lw);
    x.beginPath(); x.moveTo(0, -r * 1.4);
    x.bezierCurveTo(r * .34, -r * 1.05, r * .74, -r * .5, r * .64, r * .08); x.quadraticCurveTo(r * .62, r * .46, r * .46, r * .56); x.quadraticCurveTo(r * .2, r * .44, 0, r * .12);
    x.quadraticCurveTo(-r * .2, r * .44, -r * .46, r * .56); x.quadraticCurveTo(-r * .62, r * .46, -r * .64, r * .08); x.bezierCurveTo(-r * .74, -r * .5, -r * .34, -r * 1.05, 0, -r * 1.4);
    x.closePath(); x.fillStyle = dk; x.fill(); ol(x, lw);
    x.beginPath(); x.moveTo(0, r * .1); x.lineTo(0, -r * 1.28); ol(x, lw * 1.5, v);
    for (i = 0; i < 4; i++) [1, -1].forEach(function (sg) { var y = -i * r * .33; x.beginPath(); x.moveTo(0, y); x.quadraticCurveTo(sg * r * .3, y - r * .08, sg * r * (.56 - i * .11), y - r * .3); ol(x, lw * 1.05, v); });
    [1, -1].forEach(function (sg) { x.beginPath(); x.moveTo(0, r * .1); x.quadraticCurveTo(sg * r * .22, r * .3, sg * r * .4, r * .46); ol(x, lw * 1.05, v); });
    x.restore();
  }
  function calathea(x, px, py, r, col, lw, a) {   // rundes Blatt mit hellen Streifen
    var v = mix(col, '#ffffff', .6), i;
    x.save(); x.translate(px, py); x.rotate(a == null ? rr(-.8, .8) : a);
    stemTo(x, r, mix(col, INK, .3), lw);
    x.beginPath(); x.ellipse(0, -r * .7, r * .68, r * .86, 0, 0, 7); x.fillStyle = col; x.fill();
    x.save(); x.clip();
    for (i = 0; i < 6; i++) [1, -1].forEach(function (sg) { var y = r * .06 - i * r * .28; x.beginPath(); x.moveTo(0, y); x.quadraticCurveTo(sg * r * .38, y - r * .1, sg * r * .82, y - r * .44); ol(x, r * .075, v); });
    x.restore();
    x.beginPath(); x.ellipse(0, -r * .7, r * .68, r * .86, 0, 0, 7); ol(x, lw);
    x.beginPath(); x.moveTo(0, r * .14); x.lineTo(0, -r * 1.48); ol(x, lw * .9, mix(col, INK, .3));
    x.restore();
  }
  function caladium(x, px, py, r, cols, lw, a) {   // Herzblatt: innen rosa oder hell, grüner Rand, farbige Adern
    var i;
    function heart(k) { x.beginPath(); x.moveTo(0, r * .14 * k); x.bezierCurveTo(-r * .55 * k, r * .6 * k, -r * 1.05 * k, -r * .15 * k, 0, -r * 1.2 * k); x.bezierCurveTo(r * 1.05 * k, -r * .15 * k, r * .55 * k, r * .6 * k, 0, r * .14 * k); x.closePath(); }
    x.save(); x.translate(px, py); x.rotate(a == null ? rr(-.8, .8) : a);
    stemTo(x, r, mix(cols[0], INK, .3), lw);
    heart(1); x.fillStyle = cols[0]; x.fill(); ol(x, lw);
    x.save(); x.translate(0, -r * .12); heart(.64); x.fillStyle = cols[1]; x.fill(); x.restore();
    x.beginPath(); x.moveTo(0, r * .1); x.lineTo(0, -r * 1.02); ol(x, lw * .9, cols[2]);
    for (i = 0; i < 3; i++) [1, -1].forEach(function (sg) { var y = -r * .1 - i * r * .26; x.beginPath(); x.moveTo(0, y); x.quadraticCurveTo(sg * r * .22, y - r * .06, sg * r * (.44 - i * .1), y - r * .22); ol(x, lw * .7, cols[2]); });
    x.restore();
  }
  function plumeria(x, cx, cy, r, cols, lw) {   // Frangipani: fünf runde Blätter wie ein Windrad, innen gelb
    var a0 = R() * 6, i;
    for (i = 0; i < 5; i++) {
      x.save(); x.translate(cx, cy); x.rotate(a0 + i / 5 * 6.2832);
      x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(r * .1, -r * .56, r * .76, -r * .62, r, -r * .12); x.bezierCurveTo(r * .9, r * .3, r * .4, r * .32, 0, 0); x.closePath(); x.fillStyle = cols[0]; x.fill(); ol(x, lw * .85);
      x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(r * .08, -r * .24, r * .38, -r * .28, r * .5, -r * .07); x.bezierCurveTo(r * .42, r * .13, r * .16, r * .13, 0, 0); x.closePath(); x.fillStyle = cols[1]; x.fill();
      x.restore();
    }
    x.beginPath(); x.arc(cx, cy, r * .08, 0, 7); x.fillStyle = '#f59a3a'; x.fill(); ol(x, lw * .5);
  }
  function flameLily(x, cx, cy, r, cols, lw) {   // Ruhmeskrone: sechs schmale Blätter stehen wie eine Flamme nach oben, Staubfäden hängen nach unten
    var t = rr(-.3, .3), i, a;
    for (i = 0; i < 6; i++) {
      a = Math.PI / 2 + t + (i - 2.5) * .42;
      x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * r * .56, cy + Math.sin(a) * r * .56); ol(x, lw * 1.9); ol(x, lw * .8, '#8fc93a');
      x.beginPath(); x.ellipse(cx + Math.cos(a) * r * .6, cy + Math.sin(a) * r * .6, r * .08, r * .04, a + 1.57, 0, 7); x.fillStyle = cols[1]; x.fill(); ol(x, lw * .45);
    }
    for (i = 0; i < 6; i++) {
      a = -Math.PI / 2 + t + (i - 2.5) * .36;
      stripe(x, cx, cy, a, r, r * .15, (i - 2.5) * .11, cols[0], lw * .85, 0, .12);
      x.save(); x.translate(cx, cy); x.rotate(a); x.beginPath(); x.moveTo(0, -r * .02); x.quadraticCurveTo(r * .2, -r * .085, r * .44, (i - 2.5) * r * .02); x.quadraticCurveTo(r * .2, r * .085, 0, r * .02); x.closePath(); x.fillStyle = cols[1]; x.fill(); x.restore();   // gelber Grund, ohne Kontur
    }
    x.beginPath(); x.arc(cx, cy, r * .08, 0, 7); x.fillStyle = '#8fc93a'; x.fill(); ol(x, lw * .6);
  }
  function pitcher(x, px, py, r, cols, lw) {   // Kannenpflanze: Kanne mit Deckel, hängt an einer Ranke
    var sd = R() < .5 ? 1 : -1, bw = r * .34, i;
    x.beginPath(); x.moveTo(px - sd * r * .55, py - r * 1.05); x.quadraticCurveTo(px + sd * r * .2, py - r * 1.2, px + sd * bw * .2, py - r * .6); ol(x, lw * 2.6); ol(x, lw * 1.2, '#3fae6a');
    x.beginPath(); x.ellipse(px + sd * bw * .55, py - r * .74, bw * .82, bw * .36, -sd * .55, 0, 7); x.fillStyle = cols[1]; x.fill(); ol(x, lw * .8);
    x.beginPath(); x.moveTo(px - bw, py - r * .55); x.bezierCurveTo(px - bw * .8, py - r * .1, px - bw * 1.5, py + r * .55, px, py + r * .6); x.bezierCurveTo(px + bw * 1.5, py + r * .55, px + bw * .8, py - r * .1, px + bw, py - r * .55); x.closePath(); x.fillStyle = cols[0]; x.fill(); ol(x, lw * .9);
    for (i = 0; i < 5; i++) { x.beginPath(); x.arc(px + rr(-.75, .75) * bw, py + rr(-.2, .42) * r, r * rr(.03, .055), 0, 7); x.fillStyle = cols[1]; x.fill(); }
    x.beginPath(); x.ellipse(px, py - r * .55, bw, bw * .3, 0, 0, 7); x.fillStyle = mix(cols[1], INK, .55); x.fill(); ol(x, lw * .8);
  }
  function jadeVine(x, px, y0, len, lw, k) {   // Jadewein: hängende Kette aus türkisen Krallenblüten, zur Spitze hin kleiner
    var n = Math.max(4, Math.min(11, Math.round(len / (U * .055)))), col = pick(['#2fd0c0', '#4fe0c8', '#1fc0b0', '#58c8f0']), sw = rr(-.08, .08) * len, s0 = Math.min(U * .04, len * .09) * (k || 1), i, t, s;
    x.beginPath(); x.moveTo(px, y0); x.quadraticCurveTo(px + sw, y0 + len * .5, px, y0 + len * .94); ol(x, lw * 2.6); ol(x, lw * 1.2, '#7a3fc0');
    for (i = 0; i < n; i++) {
      t = (i + .6) / n; s = s0 * (1.15 - t * .6);
      [-1, 1].forEach(function (sd) {
        x.save(); x.translate(px + 2 * t * (1 - t) * sw, y0 + len * (.1 + .86 * t)); x.scale(sd, 1); x.rotate(.35);
        x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(s * 1.1, -s * .55, s * 2.1, s * .3, s * 1.5, s * 1.5); x.bezierCurveTo(s * 1.5, s * .75, s * .8, s * .38, 0, s * .34); x.closePath();
        x.fillStyle = sd > 0 ? col : mix(col, '#ffffff', .28); x.fill(); ol(x, lw * .7);
        x.restore();
      });
    }
  }
  function medinilla(x, px, y0, len, lw, k) {   // Medinilla: grosse rosa Hochblätter, darunter eine Traube aus Perlen
    var col = pick(['#ff7ab8', '#ff9ac0', '#f06aa8', '#ffb0d0']), c2 = mix(col, '#b8288a', .55), s = Math.min(len * .34, U * .1) * (k || 1), rows = [3, 4, 3, 2, 1], i, k, n;
    x.beginPath(); x.moveTo(px, y0); x.lineTo(px, y0 + len * .62); ol(x, lw * 2.6); ol(x, lw * 1.2, '#b8288a');
    for (k = 0; k < 2; k++) [-1, 1].forEach(function (sd) { stripe(x, px, y0 + len * (.2 + k * .2), Math.PI / 2 - sd * (1.05 - k * .12), s * (1.25 - k * .22), s * .5, sd * .16, k ? mix(col, '#ffffff', .2) : col, lw * .8, c2, .9); });
    for (i = 0; i < rows.length; i++) for (n = rows[i], k = 0; k < n; k++) {
      x.beginPath(); x.arc(px + (k - (n - 1) / 2) * s * .21, y0 + len * .62 + i * s * .19, s * .11, 0, 7); x.fillStyle = (i + k) % 2 ? c2 : mix(col, '#ffffff', .3); x.fill(); ol(x, lw * .55);
    }
  }
  // ---------- Tiere, im selben Zeichenstil und in eigener Form: Chamäleon und Schmetterling ----------
  function chameleon(x, px, py, s, cols, lw, dir) {   // cols: Körper, Zeichnung, Auge. Sitzt auf einem Ast, der Schwanz rollt sich darunter ein
    var c0 = cols[0], c1 = mix(c0, '#ffffff', .32), dk = mix(c0, INK, .38), pts = [], i, t, a, u;
    function body() {
      x.beginPath(); x.moveTo(-.6 * s, .06 * s); x.bezierCurveTo(-.52 * s, -.36 * s, .02 * s, -.5 * s, .3 * s, -.26 * s);
      x.lineTo(.42 * s, -.5 * s); x.quadraticCurveTo(.56 * s, -.42 * s, .64 * s, -.28 * s); x.quadraticCurveTo(.8 * s, -.2 * s, .84 * s, -.1 * s);   // Helm, Stirn, Schnauze
      x.quadraticCurveTo(.82 * s, 0, .72 * s, .02 * s); x.quadraticCurveTo(.55 * s, .1 * s, .4 * s, .1 * s); x.bezierCurveTo(.1 * s, .26 * s, -.35 * s, .24 * s, -.6 * s, .06 * s); x.closePath();
    }
    x.save(); x.translate(px, py); x.scale(dir || 1, 1);
    x.beginPath(); x.moveTo(-s * 1.5, s * .37); x.quadraticCurveTo(-s * .2, s * .27, s * 1.15, s * .35); ol(x, s * .1 + lw * 2); ol(x, s * .1, '#8a5a4a');   // Ast
    for (i = 0; i <= 26; i++) { t = i / 26; a = -Math.PI / 2 - t * 7.6; pts.push([-s * .62 + Math.cos(a) * s * .22 * (1 - .7 * t), s * .26 + Math.sin(a) * s * .22 * (1 - .7 * t)]); }
    polyline(x, pts); ol(x, s * .085 + lw * 2); ol(x, s * .085, c0);   // Schwanz
    [[-.3, .14, -.34], [.24, .12, .3]].forEach(function (q) {   // Beine greifen den Ast
      x.beginPath(); x.moveTo(q[0] * s, q[1] * s); x.quadraticCurveTo((q[0] + (q[2] - q[0]) * .2) * s, s * .27, q[2] * s, s * .31); ol(x, s * .075 + lw * 2); ol(x, s * .075, dk);
      x.beginPath(); x.arc(q[2] * s, s * .33, s * .05, 0, 7); x.fillStyle = dk; x.fill(); ol(x, lw * .7);
    });
    body(); x.fillStyle = c0; x.fill();
    x.save(); body(); x.clip();
    x.beginPath(); x.ellipse(-.05 * s, .22 * s, .6 * s, .14 * s, 0, 0, 7); x.fillStyle = c1; x.fill();   // heller Bauch
    for (i = 0; i < 4; i++) { x.beginPath(); x.moveTo((-.4 + i * .19) * s, -.5 * s); x.quadraticCurveTo((-.34 + i * .19) * s, -.1 * s, (-.44 + i * .19) * s, .3 * s); ol(x, s * .05, i % 2 ? cols[1] : dk); }   // Bänder
    x.restore();
    body(); ol(x, lw);
    for (i = 0; i < 5; i++) {   // Perlen auf dem Rücken
      t = .22 + i * .15; u = 1 - t;
      x.beginPath(); x.arc((u * u * u * -.6 + 3 * u * u * t * -.52 + 3 * u * t * t * .02 + t * t * t * .3) * s, (u * u * u * .06 + 3 * u * u * t * -.36 + 3 * u * t * t * -.5 + t * t * t * -.26) * s - s * .01, s * .032, 0, 7);
      x.fillStyle = cols[1]; x.fill(); ol(x, lw * .55);
    }
    disc(x, .6 * s, -.2 * s, s * .12, [cols[1], '#fff6e4', cols[2], INK], lw * .8);   // Auge: Ringe wie bei den Blüten
    x.beginPath(); x.moveTo(.83 * s, -.07 * s); x.quadraticCurveTo(.72 * s, -.02 * s, .58 * s, -.05 * s); ol(x, lw * .8);   // Maul
    x.restore();
  }
  function butterfly(x, cx, cy, s, cols, lw) {   // von oben, Flügel offen. cols: Flügel, Zeichnung, Körper
    var c0 = cols[0], c1 = cols[1];
    function up(k) { x.beginPath(); x.moveTo(.05 * s, -.08 * s); x.bezierCurveTo(.3 * s * k, -.78 * s * k, 1.02 * s * k, -.72 * s * k, .96 * s * k, -.2 * s * k); x.bezierCurveTo(.9 * s * k, .06 * s, .4 * s * k, .04 * s, .05 * s, 0); x.closePath(); }
    function low(k) { x.beginPath(); x.moveTo(.05 * s, 0); x.bezierCurveTo(.45 * s * k, .02 * s, .82 * s * k, .2 * s * k, .64 * s * k, .56 * s * k); x.bezierCurveTo(.46 * s * k, .8 * s * k, .12 * s, .5 * s * k, .05 * s, .12 * s); x.closePath(); }
    x.save(); x.translate(cx, cy);
    [1, -1].forEach(function (sg) {
      x.save(); x.scale(sg, 1);
      low(1); x.fillStyle = mix(c0, '#ffffff', .18); x.fill(); ol(x, lw);
      low(.62); x.fillStyle = c1; x.fill(); ol(x, lw * .6);
      up(1); x.fillStyle = c0; x.fill(); ol(x, lw);
      up(.62); x.fillStyle = c1; x.fill(); ol(x, lw * .6);
      x.beginPath(); x.arc(.74 * s, -.42 * s, .07 * s, 0, 7); x.fillStyle = '#fff6e4'; x.fill(); ol(x, lw * .5);
      x.beginPath(); x.arc(.5 * s, .46 * s, .05 * s, 0, 7); x.fillStyle = '#fff6e4'; x.fill(); ol(x, lw * .5);
      x.beginPath(); x.moveTo(.02 * s, -.3 * s); x.quadraticCurveTo(.12 * s, -.62 * s, .26 * s, -.7 * s); ol(x, lw * .8);   // Fühler
      x.beginPath(); x.arc(.27 * s, -.71 * s, .03 * s, 0, 7); x.fillStyle = INK; x.fill();
      x.restore();
    });
    x.beginPath(); x.ellipse(0, .02 * s, .07 * s, .34 * s, 0, 0, 7); x.fillStyle = cols[2]; x.fill(); ol(x, lw * .8);
    x.restore();
  }
  // Mehr breite Blätter, mehr einfache Exoten: Ein Teil der Wedel-Fächer wird zu breiten Blättern, ein Teil der feinteiligen Blüten zu
  // einfachen, klaren (Hugos Lieblinge aus seinen sieben Bildern und die neuen Arten). Eigener Zufall: Plätze, Grössen und alle
  // übrigen Pflanzen bleiben, wie sie sind.
  var BROAD = [40, 40, 40, 41, 41, 42, 42, 43, 44], EXO = [45, 45, 46, 46, 47, 48, 49, 29, 29, 16, 14, 14, 23, 31, 20, 3], FINE = [10, 11, 13, 19, 21, 22, 30];
  function exotic(list, salt, pB, pE) {
    var Q = rng(AK.seed * 131 + salt), i, k, q;
    for (i = 0; i < list.length; i++) {
      k = list[i][2]; q = Q();
      if (k === 0 || k === 1 || k === 9 || k === 2) { if (q < pB * (k === 2 ? .6 : 1)) list[i][2] = BROAD[Math.floor(Q() * BROAD.length)]; }
      else if (FINE.indexOf(k) >= 0 && q < pE) list[i][2] = EXO[Math.floor(Q() * EXO.length)];
    }
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
    exotic(list, 7, .6, .5);
    list.forEach(function (p) { plant(S, p[0], p[1], p[2], lw, u * p[3]); });
    for (y = y0; y < y1; y += u * rr(.14, .26) * (calm(y) ? cz[2] * 1.5 : 1)) [0, 1].forEach(function (sd) {
      var e = sd ? eR : eL, ex = e(y), d = (e(y + 6) - e(y - 6)) / 12, a, c = calm(y);
      if (ex < -10 || ex > w + 10 || eR(y) - eL(y) < 6) return;
      a = (sd ? Math.atan2(d, -1) : Math.atan2(-d, 1)) + (sd ? 1 : -1) * (c ? .95 : .45) / (1 + d * d * 4);
      plant(S, ex + (sd ? 1 : -1) * u * .04, y, R() < (cz && y > cz[1] ? .25 : .55) ? 9 : pick(FLOWERS), lw, u * pick([.7, .85, 1, 1.2]) * (c ? cz[2] : 1), a,
        !!(o.sway && SWAY && y > o.sway[0] && ne++ % o.sway[1] === 0));   // im Schlussbild wiegt sich ein Teil der Randpflanzen
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
      else if (k === 40) monstera(x, px, py, u * rr(.17, .27), pick(z), lw);
      else if (k === 41) fanPalm(x, px, py, u * rr(.2, .31), pick(z), lw);
      else if (k === 42) alocasia(x, px, py, u * rr(.16, .25), pick(z), lw);
      else if (k === 43) calathea(x, px, py, u * rr(.16, .25), pick(z), lw);
      else if (k === 44) caladium(x, px, py, u * rr(.15, .23), [pick(Z_GREEN), pick(['#ff9ac0', '#ffd0e0', '#fff3f0', '#ff7ab8']), pick(['#e0409a', '#d0379a', '#2f9a4a'])], lw);
      else if (k === 45) plumeria(x, px, py, u * rr(.1, .17), [pick(['#fffaf0', '#ffe0ec', '#ffb8d4', '#fff3c4', '#ffd0a8']), '#ffd75e'], lw);
      else if (k === 46) flameLily(x, px, py + u * .06, u * rr(.16, .25), [pick(['#e0402a', '#d0379a', '#ff5a4a', '#f07a2a']), '#ffd75e'], lw);
      else if (k === 47) pitcher(x, px, py, u * rr(.16, .24), [pick(['#8fc93a', '#b4e06a', '#6fbf3a', '#d8e87a']), pick(['#c8324a', '#e0402a', '#b8288a'])], lw);
      else if (k === 48) jadeVine(x, px, py - u * .42, u * rr(.5, .8), lw);
      else if (k === 49) medinilla(x, px, py - u * .4, u * rr(.5, .72), lw);
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
    // Öffnung der Lichtung, wie ein Fenster durch den Urwald: oben ein spitzer Bogen, neben dem Text ein schmaler Rahmen,
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
      // Gegenlicht: Die Schatten der Baobabs laufen auf der nahen Wiese weiter, und der Rand des Urwalds wirft einen weichen Schatten in die Lichtung
      BAO.forEach(function (b) { shadow(x, S.X(b[0]), vy + H * b[1] - 2, b[2] * .11, b[2] * 1.15, cx, vy + H * HOR); });
      [wL, wR].forEach(function (e) {
        for (k = 0; k < 3; k++) {
          x.beginPath(); x.moveTo(e(vy + H * yMd - 20), vy + H * yMd - 20); for (py = vy + H * yMd - 10; py <= bot + 10; py += 10) x.lineTo(e(py), py);
          x.lineJoin = 'round'; x.strokeStyle = 'rgba(20,80,58,.06)'; x.lineWidth = U * (.26 - k * .08); x.stroke();
        }
      });
    });
    // hinten: Grund, Bänder, Lianen
    ground(TB, yCb, bot, eLb, eRb, { ground: '#161a48', size: size, topFn: topB, crowns: 1,
      lianas: [{ x0: 2, x1: cx - HW - U * .05, yEnd: end }, { x0: cx + HW + U * .05, x1: w - 2, yEnd: end },
        { x0: cx - HW * .92, x1: cx + HW * .92, yEnd: function (px) { return Math.min(archYb(px) + U * rr(.02, .16), vy + H * .04); }, bead: 1 }] });
    // davor: Pflanzen und Blüten
    plants(S, yC, bot, eL, eR, { size: size, dens: 1.15, topFn: topFn, calm: [vy - H * (mob ? .22 : .03), yU + H * .03, mob ? .3 : .75], sway: [vy - H * .06, mob ? 4 : 1] });   // am Handy steht der Titel ganz oben: auch dort bleiben die Randpflanzen klein
    // Lianen und Ranken hängen vom Bogen in die Lichtung und wiegen sich; viele tragen Blüten.
    // Über dem Titel bleiben sie kurz, aussen neben dem Text dürfen sie lang herunterhängen.
    for (i = 0; i < (mob ? 8 : 18); i++) (function (i) {
      var out = i % 3 !== 2, sd = i % 2 ? 1 : -1, px = cx + sd * HW * (out ? rr(mob ? .95 : .84, 1.05) : rr(.08, .8)), y0 = archY(px) - U * .04,
          len = out ? Math.min(U * rr(.45, 1.15), vy + LT.band + H * rr(0, .1) - y0) : Math.min(U * rr(.25, .6), vy + Math.max(0, LT.lead - H * (mob ? .26 : .2)) - y0), amp = U * rr(.014, .03), fl = R() < .68, r0 = Math.max(7, Math.min(len * .05, U * .034)), fn;
      if (len < U * .12) return;
      fn = fl ? function (x) { flowerVine(x, px, y0, len, amp, lw * .9); }
        : i % 3 === 0 ? function (x) { jadeVine(x, px, y0, len, lw * .9, .62); }       // statt schlichter Ranken auch Jadewein und Medinilla, schmal: der Text bleibt frei
        : i % 3 === 1 ? function (x) { medinilla(x, px, y0, len, lw * .9, .62); }
        : function (x) { vine(x, px, y0, len, pick(Z_GREEN), lw * .9, P_ACC); };
      if (SWAY && y0 + len > vy - H * .1) S.sway(px, y0, (len + r0 * 4 + 16) / 2, 1, fn, amp + r0 * 3.6 + 16); else S.add(y0 - 4, y0 + len + r0 * 4 + 12, fn);
    })(i);
    // vorn: einzelne grosse Pflanzen dicht vor der Kamera. Sie liegen nur über dem dichten Urwald, nie frei vor Himmel oder Lichtung
    var nf = Math.round(w * H * .6 / Math.pow(U * size * 1.3, 2) / .42), fl2 = [];
    for (i = 0; i < nf; i++) fl2.push([rr(-10, w + 10), vy + H * rr(-1.3, -.7), pick([0, 1, 9, 7, 3, 10, 13, 14, 16, 12]), rr(1.1, 1.6)]);
    fl2.sort(function (a, b) { return a[1] - b[1]; });
    exotic(fl2, 11, .6, .5);
    fl2.forEach(function (q) { plant(TF, q[0], q[1], q[2], lw * 1.15, U * size * q[3]); });

    // ---- unten links und rechts auffüllen ----
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
    exotic(lst, 13, .55, .5);
    lst.forEach(function (q) { plant(S, q[0], q[1], q[2], lw, uF * q[3]); });
    for (yy = tS; yy < bot; yy += uF * rr(.07, .12)) [0, 1].forEach(function (sd) {   // an der neuen Kante: kleine Wedel und Blüten wachsen in die Öffnung, einige wiegen sich
      var e = sd ? wR : wL, ex = e(yy), d = (e(yy + 6) - e(yy - 6)) / 12, low = yy > t3,
          a = (sd ? Math.atan2(d, -1) : Math.atan2(-d, 1)) + (sd ? 1 : -1) * (low ? .6 : .95) / (1 + d * d * 4);
      if (ex < -10 || ex > w + 10) return;
      plant(S, ex + (sd ? 1 : -1) * uF * .05, yy, R() < .5 ? 9 : pick(FLOWERS2), lw, uF * (low ? .5 : .3) * rr(.8, 1.2), a, !!(SWAY && ke++ % (mob ? 5 : 3) === 0));
    });
    // einige der neuen Blüten auch oben im dichten Urwald (dort, wo die Kamera durchfliegt; das Schlussbild bleibt, wie es ist)
    nF = Math.round((w + 20) * (vy - H * .3 - yC) / (uF * uF * .085) * .16);
    for (i = 0, lst = []; i < nF; i++) { px = rr(-10, w + 10); py = rr(yC + uF * .3, vy - H * .3); if (py > topFn(px) + uF * .2 && (px < eL(py) - uF * .1 || px > eR(py) + uF * .1)) lst.push([px, py, pick([27, 28, 29, 30, 31, 32, 33]), pick([.8, 1, 1.2])]); }
    lst.sort(function (a, b) { return a[1] - b[1]; });
    lst.forEach(function (q) { plant(S, q[0], q[1], q[2], lw, uF * q[3]); });

    // Gegenlicht am Rahmen: Die Pflanzen an der Öffnung fängt warmes Licht, nach aussen wird der Urwald dunkler und kühler. So führt der
    // Blick zur Mitte (Sonne, Titel, Rad). Nur über Gemaltes (source-atop); die wiegenden Teile bleiben davor als dunklere Umrisse.
    S.add(vy - H * .14, bot + 4, function (x) {
      var y, ky, dW = U * .16;
      x.globalCompositeOperation = 'source-atop';
      for (y = vy - H * .14; y < bot + 4; y += 10) {
        ky = sm(vy - H * .14, vy + H * .04, y);
        [0, 1].forEach(function (sd) {
          var e = sd ? wR(y) : wL(y), far = sd ? w + 14 : -14, span = Math.abs(far - e), g; if (span < 4) return;
          g = x.createLinearGradient(e, 0, far, 0);
          g.addColorStop(0, 'rgba(255,238,170,' + (.34 * ky).toFixed(3) + ')'); g.addColorStop(Math.min(.45, dW / span), 'rgba(255,238,170,0)');
          g.addColorStop(Math.min(.5, dW * 1.2 / span), 'rgba(22,18,74,0)'); g.addColorStop(1, 'rgba(22,18,74,' + (.36 * ky).toFixed(3) + ')');
          x.fillStyle = g; x.fillRect(Math.min(e, far), y, span, 10.5);
        });
      }
    });
    // Tiere: ein Chamäleon auf einem Ast neben dem Rad (es schaut zur Mitte), Schmetterlinge am Rand der Lichtung. Eigene Zufallszahlen.
    R = rng(AK.seed + 67);
    (function () {
      var cs = Math.min(U * .105, W * .11), px = S.X(mob ? .115 : .322), py = vy + Math.min(LT.rowY + (LT.rowY - LT.band) * 4.2, LT.capT - cs - .03 * H * AK.scrollPan),   // Ast und Schwanz bleiben über dem Kasten der Beschreibung, auch wenn das Rad das Bild am weitesten nach unten schiebt
          cc = [pick(['#3fae6a', '#2f9a4a', '#2bb6a0', '#6fbf3a']), pick(['#ffd75e', '#f59a3a', '#ff7ab8']), pick(['#e0409a', '#3560c0', '#9b6ff0'])],
          fn = function (x) { chameleon(x, px, py, cs, cc, lw * .9, 1); };
      if (SWAY) S.sway(px, py + cs * .34, cs * 1.6, 0, fn, cs * 1.6); else S.add(py - cs * 1.6, py + cs * 1.6, fn);
    })();
    S.post.push(function (el, tf) {
      var P = rng(AK.seed + 71);
      (mob ? [[.1, .3], [.91, .47], [.13, .77]] : [[.31, .28], [.69, .4], [.33, .66], [.67, .76]]).forEach(function (d, n) {
        var bs = U * (.034 + P() * .012), c = canvas(bs * 2.4, bs * 2.1, Math.min(DPR, 2)), wrap = document.createElement('div'), rv = U * (.05 + P() * .05), k, css = '';
        R = rng(AK.seed * 53 + n * 17 + 9); butterfly(c.x, bs * 1.2, bs * 1.05, bs, [pick(P_FLOWER), pick(P_ACC), pick(Z_PURP)], LW0 * .8);
        c.c.className = 'ak-flap'; c.c.style.cssText = 'width:' + bs * 2.4 + 'px;height:' + bs * 2.1 + 'px;animation-duration:' + (.34 + P() * .18).toFixed(2) + 's';
        for (k = 1; k <= 3; k++) css += '--x' + k + ':' + (rv * .6 * (P() * 2 - 1)).toFixed(0) + 'px;--y' + k + ':' + (rv * (P() * 2 - 1.2)).toFixed(0) + 'px;';
        wrap.className = 'ak-fly';
        wrap.style.cssText = 'left:' + (S.X(d[0]) - bs * 1.2) + 'px;top:' + (vy + H * d[1] + tf - bs) + 'px;' + css + 'animation-duration:' + (15 + P() * 10).toFixed(1) + 's;animation-delay:' + (-P() * 12).toFixed(1) + 's';
        wrap.appendChild(c.c); el.appendChild(wrap);
      });
    });
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
    SR = clamp(gap * .3, 22, U * .115); SUN[1] = HOR - SR * .78 / H;   // die Sonne geht hinter den Bergen auf: ihr unterer Rand ist verdeckt, die Strahlen bleiben unter dem Slogan
    ZP = [R() * 6, R() * 6, R() * 6];
    XR = W * (mob ? .09 : .05);   // Mass aus der Zeit, als sich die Szene seitlich verschieben liess: die Ebenen sind in diesen Koordinaten gemalt. Es bleibt, damit jedes Teil an seinem Platz bleibt
    camRef = Math.round(H * AK.flightH); camT = camRef; cam = tgY = fly ? camT : 0;   // immer das ganze Bild: man kann von Hand wieder nach oben
    if (world) world.remove();
    world = document.createElement('div'); world.className = 'ak-world'; world.setAttribute('aria-hidden', 'true');
    root.insertBefore(world, root.firstChild);
    sprites = []; fliers = []; sways = []; farOn = null; sunRC = null; sunT0 = '';
    var big = W > 1100, q = big ? Math.min(DPR, 1.5) : DPR, qs = Math.min(DPR, big ? 1.25 : 1.5), qf = Math.min(DPR, big ? 1 : 1.25);   // Schärfe nach Bedarf: vorn scharf, Himmel und Hintergrund weicher (Speicher)
    if (TIER === 1) { q = Math.min(q, 1.5); qs = Math.min(qs, 1.25); qf = 1; } else if (TIER === 2) { q = Math.min(q, 1.25); qs = 1; qf = 1; }   // wenig Arbeitsspeicher: gröber malen
    QF = qs; SWAY = AK.sway && TIER < 2;
    var S0 = strip(0, .14, .18, .006, qs, qs), S1 = strip(1, .5, .38, .016, q, QF), SB = strip(2, .86, .54, .025, qs, qf), S2 = strip(3, 1, .62, .03, q, QF), SF = strip(4, 1.2, .76, .038, qf, qf),
        SA = strip(5, .16, .215, .008, qs, qs, .2), SN = strip(6, .19, .255, .01, qs, qs, .27), SH = strip(7, .215, .3, .013, qs, qs, .36);   // ferne Berge, nahe Berge, Hügel: je eigenes Tempo.
    // Nach oben/unten nur wenig verschieden (der Weg der Kamera ist lang, und oben am Himmel sollen die Berge wie bisher zu sehen sein), seitlich deutlicher
    SB.path = U * .024;   // die Bänder und Lianen wandern immer leicht auf einer kleinen Bahn
    strips = [S0, SA, SN, SH, S1, SB, S2, SF];
    sceneFar(S0, SA, SN, SH); sceneMid(S1); sceneMain(S2, SB, SF);
    S0.build(); sunParts(S0); world.appendChild(S0.el);
    SA.build(); world.appendChild(SA.el); SN.build(); world.appendChild(SN.el); SH.build(); world.appendChild(SH.el);
    R = rng(AK.seed + 3);
    // weniger Wolken
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
    // dazu fächern Strahlen nach links und rechts; eigener Zufall, die bisherigen Strahlen bleiben gleich
    var PR = rng(AK.seed + 91);
    [-112, -95, -78, 78, 95, 112].forEach(function (dg, n) { beam(rc[n % 2].x, (.05 + PR() * .08) * Math.max(W, 500), H * .72, (dg + PR() * 8 - 4) * Math.PI / 180, .13 + PR() * .14); });
    rc.forEach(function (c, i) {
      c.c.style.cssText = 'width:' + rw + 'px;height:' + rh + 'px;left:' + (-W * .15) + 'px;transform-origin:' + (gsx + W * .15) + 'px ' + gsy + 'px;' + (reduce ? '' : 'animation:' + (i ? 'akRayB 19s' : 'akRayA 15s') + ' ease-in-out infinite;');
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
    var fxc = canvas(W, H, 1);   // weiche Lichtpunkte: gröber genügt, und das Bild wird laufend neu gemalt fxC = fxc.c; fxX = fxc.x; fxC.className = 'ak-fx'; fxC.style.width = W + 'px'; fxC.style.height = H + 'px'; world.appendChild(fxC);
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
    band = document.createElement('div'); band.className = 'ak-band'; band.setAttribute('aria-hidden', 'true');
    wrap.appendChild(band);
    wheel.setAttribute('tabindex', '0'); wheel.setAttribute('role', 'listbox'); wheel.setAttribute('aria-label', 'Übersicht');
    items.forEach(function (it, i) {
      it._n = it.querySelector('.ak-item-name') || it.firstElementChild || it; if (it._n !== it) it._n.classList.add('ak-turn');   // der Text, der sich dreht
      it.setAttribute('role', 'option'); it.id = it.id || 'ak-opt-' + i;
      it.addEventListener('click', function () { go(i); });
    });
    wheel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { go(Math.min(items.length - 1, cur + 1)); e.preventDefault(); }
      if (e.key === 'ArrowUp') { go(Math.max(0, cur - 1)); e.preventDefault(); }
    });
    wheel.addEventListener('scroll', function () { lastScroll = performance.now(); }, { passive: true });
    wheel.addEventListener('touchstart', function () { holding = 1; capRel = 0; capPr = capPN = -1; }, { passive: true });
    ['touchend', 'touchcancel'].forEach(function (ev) { wheel.addEventListener(ev, function (e) { if (!e.touches || !e.touches.length) { holding = 0; lastScroll = capRel = performance.now(); capHi.length = 0; capPr = capPN = -1; } }, { passive: true }); });
    measureWheel();
  }
  function measureWheel() {
    if (!items.length) return;
    rowH = items[0].getBoundingClientRect().height || items[0].offsetHeight || 40;   // genaue Höhe (auch Bruchteile), damit Zeile und Raster übereinstimmen
    var h = wheel.clientHeight, pad = Math.max(0, (h - rowH) / 2);
    wheel.firstChild.style.height = wheel.lastChild.style.height = pad + 'px';
    band.style.top = (wheel.offsetTop + pad + rowH * .06) + 'px'; band.style.height = rowH * .88 + 'px';
    TW = items.map(function (it) {   // Breite der Kapsel je Zeile: Textlänge plus Luft links und rechts
      var nm = it.querySelector('.ak-item-name') || it.firstElementChild, tw = nm ? nm.offsetWidth : 0;
      return clamp((tw > 8 && tw < it.offsetWidth - 4 ? tw : it.offsetWidth * .6) + rowH * 1.05, rowH * 2.2, Math.min(wheel.clientWidth, W * .94));
    });
    wP = NaN;   // neu zeichnen
  }
  function go(i) { capGo = i; capGoT = performance.now(); wheel.scrollTo({ top: i * rowH, behavior: reduce ? 'auto' : 'smooth' }); }   // capGo: das Ziel steht fest, die Beschreibung wechselt sofort (capTick)
  var lastScroll = 0, wheelPos = 0, holding = 0;
  // Sicherheitsnetz fürs Einrasten: Steht das Rad still (kein Finger, 160 ms keine Bewegung) und liegt nicht genau auf einer Zeile, gleitet es zur nächsten.
  function settle(now) {
    if (!items.length || holding || now - lastScroll < 160) return;
    var t = clamp(Math.round(wheel.scrollTop / rowH), 0, items.length - 1) * rowH;
    if (Math.abs(wheel.scrollTop - t) > 1.5) { lastScroll = now + 400; capGo = Math.round(t / rowH); capGoT = now; wheel.scrollTo({ top: t, behavior: reduce ? 'auto' : 'smooth' }); }
  }
  var wP = NaN, wR = 0, TW = [];
  function drawWheel() {
    if (!items.length) return 0;
    var p = wheel.scrollTop / rowH, rad = AK.rowDeg * Math.PI / 180, Rcyl = rowH / rad;
    if (p === wP && rowH === wR) return p;   // steht das Rad, gibt es nichts zu tun
    wP = p; wR = rowH;
    if (TW.length) {   // Kapsel: gleitet von der Breite der einen Zeile zur Breite der nächsten
      var i0 = clamp(Math.floor(p), 0, items.length - 1), i1 = Math.min(items.length - 1, i0 + 1), f = clamp(p - i0, 0, 1); f = f * f * (3 - 2 * f);
      band.style.width = (TW[i0] + (TW[i1] - TW[i0]) * f).toFixed(1) + 'px';
    }
    for (var i = 0; i < items.length; i++) {
      var d = i - p, th = d * rad, a = Math.abs(th);
      var it = items[i];
      if (a > 1.6) { if (it._v !== 0) { it._n.style.opacity = 0; it._v = 0; } continue; }
      var y = Rcyl * Math.sin(th) - d * rowH;   // Ausgleich: im Fluss liegen die Zeilen gerade untereinander
      it._n.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0) scale(' + (1 - a * .06).toFixed(4) + ',' + Math.max(.05, Math.cos(th)).toFixed(4) + ')';   // Zylinder: Zeilen werden zum Rand flacher
      it._n.style.opacity = Math.max(0, Math.cos(th) * (1 - a * .18)).toFixed(3);
      it._v = 1;
    }
    var n = clamp(Math.round(p), 0, items.length - 1);
    if (n !== cur) select(n, cur !== -1);
    return p;
  }
  // ---------- Beschreibung im Kasten ----------
  // Hugo 27.11. (19:21–20:13): Der Text steht fest an der oberen Kante. Gewechselt wird, sobald klar ist, auf welcher Zeile das Rad landet
  // (capTick) – nicht erst, wenn es steht («fühlt sich an wie ein Lag», 20:13): beim Tippen auf eine Zeile sofort, nach dem Wischen kurz nach
  // dem Loslassen. Bis dahin bleibt der alte Text unverändert stehen. Dann blendet er als Ganzes rasch aus – ohne dunkle Unschärfe («schwarzer
  // Schatten beim Wechsel», 20:13) – und der neue schreibt sich hinein wie «Galerie öffnen» auf der Homepage und der Hinweis in der Galerie
  // (home.js goIn, galerie.js setHint): Buchstabe für Buchstabe von unten aus der Unschärfe, in fliessendem Hirsch-Perlmutt, das sich in 0.9 s
  // sanft schwarz setzt (18 ms je Buchstabe versetzt, die Zeilen nebeneinander, jede 70 ms später).
  //
  // Warum Ebenen auf einer Zeichenfläche und nicht wie dort einzelne Buchstaben im Dokument: Die erste Fassung animierte Farbe und Schein von
  // rund 70 Buchstaben einzeln. Auf Hugos iPhone malte Safari den Text dabei nur rund 12-mal pro Sekunde neu (Video 19:37), es ruckelte.
  // Jetzt wird jeder Buchstabe beim Wechsel einmal in drei Fassungen vorgemalt (unscharf in Perlmutt, scharf in Perlmutt mit Schein, schwarz mit
  // weissem Schein). Der alte Text ist ein Abbild der Zeichenfläche, so wie sie im Moment des Wechsels aussah – auch mitten in einem laufenden
  // Umschreiben, das dadurch weich abgelöst wird. Im Takt werden diese fertigen Bilder nur noch mit wechselnder Deckkraft übereinander gelegt –
  // das kostet fast nichts. Wo jeder Buchstabe steht, sagt weiter der Browser: Der Text liegt unsichtbar im Layout (capBuild).
  var PEARL = ['#96dcf5', '#c3b2fa', '#f8bed7', '#fae4b4', '#a5e8d7'], capIn = null, capSr = null, capCv = null, capX = null, capW = 0, capH = 0, capD = 1,
      capShown = -1, capT = null, capA = null, capM = null, capBad = 0, capOff = 0, capSn = null, capSnX = null;
  function capCanvas() {   // Zeichenfläche so gross wie der Kasten, in Gerätepixeln (bis 3-fach: die Schrift soll so scharf sein wie daneben)
    var w = cap.clientWidth, h = cap.clientHeight;
    if (capCv && w === capW && h === capH) return;
    if (!capCv) { capCv = document.createElement('canvas'); capCv.className = 'ak-cap-cv'; capCv.setAttribute('aria-hidden', 'true'); cap.appendChild(capCv); capX = capCv.getContext('2d'); }
    capD = Math.min(window.devicePixelRatio || 1, 3); capW = w; capH = h;
    capCv.width = Math.max(2, Math.round(w * capD)); capCv.height = Math.max(2, Math.round(h * capD)); capX.setTransform(capD, 0, 0, capD, 0, 0);
  }
  function capSnap() {   // Abbild der Zeichenfläche: der alte Text, genau wie er gerade dasteht
    if (!capSn) { capSn = document.createElement('canvas'); capSnX = capSn.getContext('2d'); }
    if (capSn.width !== capCv.width || capSn.height !== capCv.height) { capSn.width = capCv.width; capSn.height = capCv.height; } else capSnX.clearRect(0, 0, capSn.width, capSn.height);
    capSnX.drawImage(capCv, 0, 0);
  }
  function capDom(n) {   // der Text als unsichtbare Zeile(n) im Layout: Wörter bleiben zusammen, jeder Buchstabe ist ein eigenes Stück zum Ausmessen
    var price = items[n].querySelector('.ak-item-price'), info = items[n].querySelector('.ak-item-info'), l = document.createElement('span'), ch = [];
    l.className = 'ak-cap-l'; l.setAttribute('aria-hidden', 'true');
    function words(txt, into) {
      txt.split(/\s+/).forEach(function (w, k) {
        if (!w) return;
        if (k) into.appendChild(document.createTextNode(' '));
        var ws = document.createElement('span'); ws.className = 'ak-w';
        for (var q = 0; q < w.length; q++) { var c = document.createElement('span'); c.textContent = w.charAt(q); ws.appendChild(c); ch.push(c); }
        into.appendChild(ws);
      });
    }
    var pt = price ? price.textContent.trim() : '', it = info ? info.textContent.trim() : '';
    if (pt) { var ps = document.createElement('span'); ps.className = 'ak-cap-price'; words(pt, ps); l.appendChild(ps); }
    words(it, l);
    return { el: l, ch: ch, txt: (pt ? pt + '. ' : '') + it };
  }
  // Unschärfe: Gemalt wird nur der weiche Schatten eines Buchstabens, der Buchstabe selbst liegt weit ausserhalb des Bildes. Ob ein Browser das
  // so malt, wird einmal ausprobiert (CAPSH). Wenn nicht, wird der Buchstabe stattdessen sehr grob gemalt und beim Auflegen vergrössert: auch unscharf.
  var CAPSH = (function () {
    try {
      var c = document.createElement('canvas'); c.width = c.height = 8; var g = c.getContext('2d'), d, i, a = 0;
      g.beginPath(); g.rect(0, 0, 8, 8); g.clip(); g.font = 'bold 24px sans-serif'; g.shadowColor = '#000'; g.shadowBlur = 2; g.shadowOffsetX = 3000; g.fillText('MMM', -3020, 12);
      d = g.getImageData(0, 0, 8, 8).data; for (i = 3; i < d.length; i += 4) a += d[i];
      return a > 200;
    } catch (e) { return false; }
  })();
  function capSoft(g, s, x, y, col, blur, k) {
    if (!CAPSH) { g.fillStyle = col; g.fillText(s, x, y); return; }
    g.shadowColor = col; g.shadowBlur = blur * k; g.shadowOffsetX = 3000 * k; g.fillStyle = '#000'; g.fillText(s, x - 3000, y);
    g.shadowOffsetX = 0; g.shadowBlur = 0; g.shadowColor = 'transparent';
  }
  function capAtlas(T, dpr, pad, paint) {   // alle Buchstaben eines Textes in einer Fassung, jeder in seinem eigenen Feld mit Rand für Schein und Unschärfe
    var x = 0, y = 0, rh = 0, mw = Math.floor(2400 / dpr), cells = [], Wd = 2;
    T.q.forEach(function (l) {
      var cw = Math.ceil((l.w + pad * 2) / 2) * 2, ch = Math.ceil((l.h + pad * 2) / 2) * 2;
      if (x + cw > mw) { x = 0; y += rh; rh = 0; }
      cells.push([x, y, cw, ch]); x += cw; if (x > Wd) Wd = x; if (ch > rh) rh = ch;
    });
    var c = canvas(Wd, y + rh, dpr), g = c.x; g.textBaseline = 'alphabetic';
    T.q.forEach(function (l, i) {
      var q = cells[i]; g.save(); g.beginPath(); g.rect(q[0], q[1], q[2], q[3]); g.clip(); g.font = T.fonts[l.f].f;
      paint(g, l, q[0] + pad + l.x - l.dx, q[1] + pad + l.y - l.dy + l.by, i, dpr); g.restore();
    });
    return { c: c.c, cells: cells, pad: pad, k: c.c.width / Wd };
  }
  function capFree(T) { if (T) ['F', 'B', 'S', 'G'].forEach(function (k) { if (T[k]) { (T[k].c || T[k]).width = 0; T[k] = null; } }); }
  function capBuild(n) {   // Text n ins Layout legen, jeden Buchstaben ausmessen und die Ruhe-Fassung (schwarz mit weissem Schein) vormalen
    var L = capDom(n), old = capIn.querySelector('.ak-cap-l'); if (old) old.remove();
    capIn.appendChild(L.el); capSr.textContent = L.txt;
    var b = cap.getBoundingClientRect(), ox = b.left + cap.clientLeft, oy = b.top + cap.clientTop, T = { q: [], fonts: [] }, lines = [], fi = {}, cnt = [],
        cs = getComputedStyle(cap), col = cs.color, small = [], big = [];
    (cs.textShadow && cs.textShadow !== 'none' ? cs.textShadow.split(/,(?![^(]*\))/) : []).forEach(function (sh) {   // Schein aus der Webflow-Klasse: kleine Radien je Buchstabe, grosse als eine weiche Ebene
      var c = sh.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}/i), px = sh.match(/-?[\d.]+px/g);
      if (c && px && px.length > 2) (parseFloat(px[2]) <= 6 ? small : big).push([c[0], parseFloat(px[2])]);
    });
    L.ch.forEach(function (c) {
      var r = c.getBoundingClientRect(); if (!r.width) return;
      var host = c.parentNode.parentNode, key = host.className === 'ak-cap-price' ? 1 : 0, li, ly = r.top - oy;
      if (fi[key] == null) {
        var hs = getComputedStyle(host), fs = parseFloat(hs.fontSize) || 15, f = hs.fontStyle + ' ' + hs.fontWeight + ' ' + fs + 'px ' + hs.fontFamily;
        capX.font = f; var m = capX.measureText('H');
        fi[key] = T.fonts.length; T.fonts.push({ f: f, fs: fs, up: hs.textTransform === 'uppercase', as: m.fontBoundingBoxAscent || 0, de: m.fontBoundingBoxDescent || 0 });
      }
      for (li = 0; li < lines.length; li++) if (Math.abs(lines[li] - ly) < 4) break;
      if (li === lines.length) { lines.push(ly); cnt.push(0); }
      var F = T.fonts[fi[key]], x = r.left - ox;
      T.q.push({ s: F.up ? c.textContent.toUpperCase() : c.textContent, x: x, y: ly, w: r.width, h: r.height, f: fi[key], line: li, k: cnt[li]++, em: F.fs,
        dx: Math.floor(x * capD) / capD, dy: Math.floor(ly * capD) / capD,   // auf ganze Gerätepixel gelegt: so bleibt die fertige Schrift scharf
        by: F.as > 0 ? (r.height - F.as - F.de) / 2 + F.as : r.height * .805 });   // Grundlinie im Feld des Buchstabens
    });
    T.F = capAtlas(T, capD, 8, function (g, l, x, y, i, k) {   // Ruhe-Fassung: erst der feine helle Schein (heller Buchstabe mit Schatten), darüber der Buchstabe in seiner Farbe
      small.forEach(function (sh) { g.shadowColor = sh[0]; g.shadowBlur = sh[1] * k; g.fillStyle = sh[0]; g.fillText(l.s, x, y); });
      g.shadowBlur = 0; g.shadowColor = 'transparent'; g.fillStyle = col; g.fillText(l.s, x, y);
    });
    var G = canvas(capW, capH, Math.min(capD, 1.5)); G.x.textBaseline = 'alphabetic';   // der grosse weiche Schein als eine Ebene für den ganzen Text
    if (CAPSH) T.q.forEach(function (l) { G.x.font = T.fonts[l.f].f; big.forEach(function (sh) { capSoft(G.x, l.s, l.x, l.y + l.by, sh[0], sh[1], G.c._dpr); }); });
    T.G = G.c;
    return T;
  }
  function sm(v) { return v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v); }   // sanft anlaufen, sanft enden
  function capPearl(l) {   // Perlmutt fliesst von Buchstabe zu Buchstabe weich durch die fünf Farben (vorher sprang die Farbe bei jedem Buchstaben)
    var f = l.k * .5 + l.line * 1.7, a = Math.floor(f);
    return mix(PEARL[a % PEARL.length], PEARL[(a + 1) % PEARL.length], f - a);
  }
  function capBlit(A, i, l, a, dy) {
    if (a <= .004) return;
    var q = A.cells[i], k = A.k; capX.globalAlpha = a > 1 ? 1 : a;
    capX.drawImage(A.c, q[0] * k, q[1] * k, q[2] * k, q[3] * k, l.dx - A.pad, l.dy - A.pad + (dy || 0), q[2], q[3]);
  }
  function capDraw(now) {
    var A = capA, T = capT, X = capX, i, l, t, x, e, sh, cf, p, dy;
    if (!X || !T) return;
    X.globalAlpha = 1; X.clearRect(0, 0, capW, capH);
    if (!A) { X.drawImage(T.G, 0, 0, capW, capH); for (i = 0; i < T.q.length; i++) capBlit(T.F, i, T.q[i], 1); X.globalAlpha = 1; return; }
    t = now - A.t0;
    X.globalAlpha = 1 - sm(t / 200); if (X.globalAlpha > .004) X.drawImage(capSn, 0, 0, capW, capH);   // der alte Text samt Schein blendet als Ganzes rasch aus – ohne dunkle Unschärfe
    X.globalAlpha = sm((t - 600) / Math.max(1, A.dur - 600)); if (X.globalAlpha > .004) X.drawImage(T.G, 0, 0, capW, capH);   // der grosse weiche Schein des neuen Textes
    // Weiche Übergänge (Hugo 27.11., 20:05): Keine Ebene blendet aus, bevor die nächste ganz da ist. Alle Kurven beginnen und enden sanft (sm).
    for (i = 0; i < T.q.length; i++) {   // neuer Text: von unten aus der Unschärfe, Perlmutt, dann langsam schwarz
      l = T.q[i]; x = t - 60 - l.line * 70 - l.k * 18; if (x <= 0) continue;
      if (x >= 1300) { capBlit(T.F, i, l, 1); continue; }
      p = Math.min(1, x / 480); e = 1 - Math.pow(1 - p, 3); sh = sm((x - 60) / 420); cf = sm((x - 380) / 900);
      dy = .35 * l.em * (1 - e);
      capBlit(T.B, i, l, e * (1 - sm((x - 200) / 380)) * 1.2, dy);   // unscharf: bleibt, bis der scharfe Buchstabe da ist
      capBlit(T.S, i, l, e * sh * (1 - sm((cf - .7) / .3)), dy);     // Perlmutt: liegt unter dem schwarzen Buchstaben und geht erst ganz am Schluss
      capBlit(T.F, i, l, sh * cf, dy);                                // Schwarz legt sich langsam darüber: die Farbe mischt sich, statt umzuspringen
    }
    X.globalAlpha = 1;
    if (t >= A.dur) { capA = null; T.B.c.width = T.S.c.width = 0; T.B = T.S = null; capDraw(now); }   // fertig: Hilfsbilder freigeben, Ruhebild malen
  }
  function showCap(n, anim) {
    if (!capIn) {   // für Vorlese-Programme steht der ganze Text unsichtbar daneben
      capIn = document.createElement('div'); capIn.className = 'ak-cap-in'; capSr = document.createElement('span'); capSr.className = 'ak-sr';
      cap.textContent = ''; cap.appendChild(capSr); cap.appendChild(capIn);
    }
    var resized = cap.clientWidth !== capW || cap.clientHeight !== capH, O = capT, fx = anim && O && capCv && !resized && !reduce && lv < 2 && !capOff;
    // <test>
    if (window.__akCapLog) window.__akCapLog.push([Math.round(performance.now()), n, capGo >= 0 ? 'ziel' : capPr === n ? 'schaetzung' : 'netz', +(wheel.scrollTop / rowH).toFixed(2), capMiss]);
    // </test>
    if (fx) capSnap();   // vor allem anderen: So sieht der Kasten jetzt aus (auch mitten in einem laufenden Umschreiben) – das blendet gleich aus
    capA = null; capCanvas();
    capShown = n; capT = capBuild(n); capFree(O);
    if (cap.clientWidth !== capW || cap.clientHeight !== capH) { capFree(capT); capCanvas(); capT = capBuild(n); fx = false; }   // der neue Text hat den Kasten vergrössert: Zeichenfläche anpassen, ohne Animation
    if (!fx) { capDraw(0); return; }
    var T = capT, dur = 0;
    var bd = CAPSH ? Math.min(capD, 1.5) : .3;
    T.B = capAtlas(T, bd, 12, function (g, l, x, y, i, k) { var pc = capPearl(l); capSoft(g, l.s, x, y, pc, 4.5, k); capSoft(g, l.s, x, y, pc, 4.5, k); });
    T.S = capAtlas(T, capD, 12, function (g, l, x, y, i, k) { var pc = capPearl(l); g.shadowColor = pc; g.shadowBlur = .45 * l.em * k; g.fillStyle = pc; g.fillText(l.s, x, y); g.shadowBlur = 0; g.shadowColor = 'transparent'; });   // gleiche Auflösung wie die schwarze Fassung: sie liegen deckungsgleich übereinander
    T.q.forEach(function (l) { dur = Math.max(dur, 60 + l.line * 70 + l.k * 18 + 1300); });
    capA = { t0: performance.now(), dur: dur };
    capM = { t: capA.t0, d: dur, n: 0, slow: 0 }; pw.t = Math.max(pw.t, capA.t0 + dur + 100);   // der Wächter der Szene wertet diese Zeit nicht; das Umschreiben prüft sich selbst (capWatch)
  }
  function capRedraw() {   // neue Grösse: Text neu ausmessen und ruhig hinmalen
    if (!capIn || capShown < 0) return;
    capA = null;
    capFree(capT); capT = null; capW = 0; capCanvas(); capT = capBuild(capShown); capDraw(0);
  }
  function capWatch(raw, now) {   // ruckelt das Umschreiben zweimal hintereinander (jedes vierte Bild zu langsam), wechselt der Text auf diesem Gerät künftig ohne Animation
    if (!capM) return;
    if (now - capM.t < capM.d) { capM.n++; if (raw > 34) capM.slow++; return; }
    capBad = capM.n < capM.d * .02 || capM.slow >= capM.n * .25 ? capBad + 1 : 0; if (capBad >= 2) capOff = 1;
    capM = null;
  }
  // Im Takt: umschreiben, sobald klar ist, wo das Rad landet (Hugo 27.11., 20:13: «direkt beim Einrasten oder eher sobald losgelassen wird und
  // klar steht, wo es einrastet – es fühlt sich jetzt noch an wie ein Lag»). Drei Wege, vom schnellsten zum sichersten:
  // 1. Ziel bekannt (capGo): Tipp auf eine Zeile, Pfeiltaste oder Nachgleiten – der Text wechselt sofort, während das Rad noch hinfährt.
  // 2. Nach dem Wischen (capGuess): Das losgelassene Rad läuft aus. Aus den letzten Bildern wird geschätzt, wo es stehen bleibt (wie schnell es
  //    gerade ist und wie stark es bremst). Zeigt die Schätzung einige Bilder lang auf dieselbe Zeile (drei, bei längerem Restweg mehr), wechselt
  //    der Text – meist ein bis zwei Zehntelsekunden nach dem Loslassen. Lag die Schätzung zweimal daneben (der Text musste nachkorrigiert
  //    werden), bleibt dieser Weg bis zum nächsten Laden aus.
  // 3. Sicherheitsnetz: Das Rad ist langsam (unter 1.2 Zeilen pro Sekunde), nah an der Zeile (unter 0.3 Zeilen) und die Auswahl seit 90 ms
  //    dieselbe. Das gilt auch für Mausrad und Trackpad.
  var capST = 0, capSN = 0, capVel = 0, capCN = -1, capCT = 0, capGo = -1, capGoT = 0, capRel = 0, capHi = [], capPN = -1, capPC = 0, capPr = -1, capMiss = 0, capGR = 0;
  function capGuess(now, st) {   // Zeile, auf der das losgelassene Rad stehen bleiben wird; -1 = noch unklar
    capHi.push([now, st]); if (capHi.length > 7) capHi.shift();
    var n = capHi.length, a = capHi[0], b = capHi[n - 1], m = capHi[n >> 1], last = items.length - 1, p = st / rowH, vA, vB, sp, q, tau, est;
    capGR = 0; if (n < 3 || b[0] - a[0] < 20) return -1;
    vB = (b[1] - m[1]) / Math.max(1, b[0] - m[0]); sp = Math.abs(vB) * 1000 / rowH;   // Tempo in Zeilen pro Sekunde
    if (sp < .5 && Math.abs(b[1] - a[1]) / (b[0] - a[0]) * 1000 < rowH * .5) return clamp(Math.round(p), 0, last);   // steht praktisch: die nächste Zeile
    if (n < 5) return -1;
    vA = (m[1] - a[1]) / Math.max(1, m[0] - a[0]);
    if (vA * vB < 0) return -1;   // Richtung wechselt gerade
    q = vA ? vB / vA : 9;
    if (q > .05 && q < .85) {   // bremst deutlich aus (Schwung nach dem Wischen): heutige Stelle plus die Strecke, die beim Auslaufen noch kommt
      tau = -(b[0] - a[0]) / 2 / Math.log(q);
      est = st + vB * Math.exp(-(b[0] - m[0]) / 2 / tau) * tau;
      capGR = Math.abs(est - st) / rowH;   // so viele Zeilen läuft das Rad noch
      if (capGR > 4 || Math.abs(est / rowH - Math.round(est / rowH)) > .38) return -1;   // noch zu weit weg oder zu nah an der Grenze zwischen zwei Zeilen: lieber noch ein Bild warten
      return clamp(Math.round(est / rowH), 0, last);
    }
    if (q >= .93 && sp < 3.5) return clamp(vB > 0 ? Math.ceil(p - .1) : Math.floor(p + .1), 0, last);   // gleitet gleichmässig oder zieht an: Das ist das Einrasten selbst, es endet auf der nächsten Zeile voraus
    return -1;
  }
  function capTick(now) {
    if (capA) capDraw(now);
    if (!cap || cur < 0) return;
    var st = wheel.scrollTop, dt = now - capSN, mv = st !== capST, n;
    capVel = dt > 0 && dt < 100 ? capVel * .5 + Math.abs(st - capST) / dt * .5 : 0; capST = st; capSN = now;   // Tempo des Rads in px je ms, geglättet
    if (cur !== capCN) { capCN = cur; capCT = now; }
    if (holding) { capGo = -1; return; }
    if (capGo >= 0) {   // 1. Ziel bekannt
      if (mv) capGoT = now;
      if (now - capGoT < 250) { if (capGo !== capShown) showCap(capGo, true); return; }
      capGo = -1;   // angekommen (oder unterwegs angehalten): ab hier gilt wieder, wo das Rad wirklich steht
    }
    if (capRel) {   // 2. nach dem Wischen
      if (now - capRel > 1500) { capRel = 0; capPr = -1; }
      else if (capMiss < 2) {
        n = capGuess(now, st);
        if (n !== capPN) { capPN = n; capPC = 0; }
        if (n >= 0 && ++capPC >= (capPr < 0 ? 3 : 6) + Math.round(capGR * 2) && n !== capShown) {   // je weiter der Weg noch ist, desto länger muss die Schätzung dieselbe bleiben
          if (capPr >= 0) capMiss++;   // die erste Schätzung lag daneben
          capPr = n; showCap(n, true); return;
        }
      }
    }
    // 3. Sicherheitsnetz. Hat die Schätzung schon gewechselt, zählt hier erst der wirkliche Stillstand – sonst spränge der Text zurück, solange das Rad noch nah an der alten Zeile anfährt.
    if (cur === capShown || now - capCT < 90 || capVel * 1000 > rowH * (capPr < 0 ? 1.2 : .15) || Math.abs(st - cur * rowH) > rowH * .3) return;
    if (capPr >= 0) { capMiss++; capPr = -1; }   // die Schätzung lag daneben
    showCap(cur, true);
  }
  function select(n, spark) {
    var prev = cur; cur = n;
    items.forEach(function (it, i) { it.setAttribute('aria-selected', i === n ? 'true' : 'false'); it.classList.toggle('is-sel', i === n); });   // is-sel: schwarze Schrift mit weissem Schein, wie im Menü-Knopf
    wheel.setAttribute('aria-activedescendant', items[n].id);
    if (!cap) return;
    if (prev === -1) showCap(n, false);   // danach wechselt der Text in capTick
  }

  // ---------- Takt ----------
  var ptr = { x: 0, y: 0, tx: 0, ty: 0 }, pan = 0, run = false, raf = 0, tBoot = 0, lastT = 0, shown = false, flown = false, fl = null, cover = null, litOn = null, fxClean = 0, wind = [],
      drag = null, dragged = 0, tgY = 0, XR = 0, sunT0 = '', tFz = -1, sways = [], farOn = null, reOn = 0, covT = 0, dn = [0, 0, 0];
  // Maus und Finger schieben die Ebenen leicht, je nachdem, wo sie gerade sind – genau wie in der allerersten Fassung («das war top»).
  // Am Computer folgt das Bild der Maus, am Handy dem Finger, solange er aufliegt; danach gleitet es zurück in die Mitte.
  function aim(e) { if (AK.pointer) { ptr.tx = (e.clientX / W - .5) * 2; ptr.ty = (e.clientY / H - .5) * 2; } }
  function rest(e) { if (e.pointerType !== 'mouse') ptr.tx = ptr.ty = 0; }
  root.addEventListener('pointermove', aim, { passive: true });
  root.addEventListener('pointerleave', function () { ptr.tx = ptr.ty = 0; });
  root.addEventListener('pointerup', rest); root.addEventListener('pointercancel', rest);

  // Kamera von Hand: ausserhalb des Rads lässt sich die Szene gemütlich wieder nach oben bis in den Himmel schieben.
  // Das Rad scrollt weiter die Services, mit Parallax dort, wo die Kamera gerade steht.
  // Seitlich verschieben lässt sich die Szene nicht mehr (ganz weg, wie am Anfang): seitlich gibt es nur den leichten Parallax von Maus und Finger (oben).
  function inWheel(e) { return e.target && e.target.closest && e.target.closest('[data-ak-wheel]'); }
  root.addEventListener('pointerdown', function (e) {
    dn = [e.clientX, e.clientY, e.timeStamp];
    if (e.pointerType !== 'mouse') aim(e);   // Finger: schon beim Auflegen, nicht erst beim Bewegen
    if (fl) { fl.rate = 9; return; }   // Antippen während des Flugs: schnell zu Ende fliegen
    if (!AK.freePan || !shown || reOn || e.button > 0 || inWheel(e)) return;
    drag = { id: e.pointerId, y: e.clientY, cy: tgY, on: 0, py: e.clientY, pt: e.timeStamp, vy: 0 };
  }, true);
  window.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var my = e.clientY - drag.y, d = Math.max(1, e.timeStamp - drag.pt);
    if (!drag.on) {
      if (Math.abs(my) < 8) return;
      drag.on = 1; root.classList.add('ak-drag');
      try { window.getSelection().removeAllRanges(); } catch (er) {}
    }
    drag.vy = drag.vy * .6 + (e.clientY - drag.py) / d * .4; drag.py = e.clientY; drag.pt = e.timeStamp;
    tgY = clamp(drag.cy + my * 1.4, 0, camT);   // das Bild folgt dem Finger, dezent: nach unten ziehen = zurück nach oben
  }, { passive: true });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.on) {   // beim Loslassen gleitet die Kamera noch ein Stück weiter
      if (e.type === 'pointerup' && e.timeStamp - drag.pt < 90) tgY = clamp(tgY + drag.vy * 380, 0, camT);
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
    tgY = clamp(tgY - e.deltaY * k * 1.1, 0, camT);
  }, { passive: false });

  // Handy: kein «Zurück» durch Wischen vom Bildschirmrand.
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
    var t = now - tBoot, raw = now - lastT, dt = Math.min(64, raw), vel = 0, i; lastT = now; fN++;
    watch(raw, now); capWatch(raw, now);
    if (fl) {
      var c0 = cam; fl.u = Math.min(1, fl.u + Math.min(64, now - fl.last) / fl.D * fl.rate); fl.last = now;
      cam = camT * (1 - swing(fl.u)); vel = cam - c0;
      if (!shown && fl.u >= 1) reveal();   // erst wenn die Kamera steht: das Einblenden kostete auf Hugos iPhone eine Zehntelsekunde (Video 16:00) – im Stand sieht man sie nicht
      if (fl.u >= 1) {
        fl = null; cam = tgY = 0;
        setTimeout(function () { fliers = fliers.filter(function (F) { if (F.leaf && F.el.parentNode) F.el.parentNode.removeChild(F.el); return !F.leaf; }); }, 3200);   // die grossen Wedel gehörten nur zum Flug (weg, sobald alles ruhig steht)
      }
    } else if (AK.freePan) {   // von Hand: die Kamera zieht gemütlich nach
      var kk = 1 - Math.exp(-dt / AK.panSoft);
      cam += (tgY - cam) * kk;
      if (Math.abs(tgY - cam) < .05) cam = tgY;
    }
    var lit = !fl && shown && !reOn && cam < H * .45 && now - tStart > 420;   // das Licht kommt kurz nach dem Text: nicht alles im selben Bild
    if (lit !== litOn && world) { litOn = lit; world.classList.toggle('ak-lit', lit); }
    var p = drawWheel(); settle(now); capTick(now);
    var pn = items.length > 1 ? p / (items.length - 1) - .5 : 0;
    pan += (pn - pan) * .06;
    var pk = touch ? .035 : .06;   // am Handy folgt das Bild dem Finger noch etwas weicher (wie am Anfang)
    ptr.x += (ptr.tx - ptr.x) * pk; ptr.y += (ptr.ty - ptr.y) * pk;
    if (lv >= 3 && tFz < 0) tFz = t;
    var td = tFz < 0 ? t : tFz;   // Stufe 3: Schweben, Wolken und Bänder bleiben stehen, wo sie gerade sind (nur Finger, Maus und Rad bewegen das Bild noch)
    var dr = reduce ? 0 : AK.drift;   // der Blick schwebt leicht von selbst, genau wie am Anfang
    var dx = (Math.sin(td * .00011) * 10 + Math.sin(td * .00023 + 1) * 5) * dr - ptr.x * 18 * AK.pointer;
    var dy = (Math.sin(td * .00009 + 2) * 7 + Math.cos(td * .00019) * 4) * dr - ptr.y * 12 * AK.pointer;
    // ohne Flug: beim Einblenden sinkt die Kamera ein Stück ins Bild (leichter Zoom)
    var ip = flown || reduce || !shown ? (shown || flown ? 1 : 0) : clamp((now - tStart) / (AK.introMs * 1.6), 0, 1), ie = 1 - Math.pow(1 - ip, 3);
    for (i = 0; i < strips.length; i++) {
      var L = strips[i], z = 1 + (1 - ie) * .06 * L.d, lx = L.ox + dx * L.d, ly = L.oy + cam * L.f + dy * L.d - pan * 2 * L.pan + (1 - ie) * 40 * L.d;
      if (L.path && !reduce) { lx += Math.sin(td * .00052) * L.path; ly += Math.sin(td * .00037 + 1.3) * L.path * .75; }   // Bänder und Lianen: immer leicht unterwegs auf einer kleinen Bahn
      var tr = 'translate3d(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px,0) scale(' + z.toFixed(4) + ')';
      if (tr !== L.tr) { L.tr = tr; L.el.style.transform = tr; }   // nur schreiben, wenn sich etwas geändert hat
    }
    for (i = 0; i < fliers.length; i++) {
      var F = fliers[i], fy = F.y + cam * F.f, on = fy > -F.h && fy < H ? 1 : 0;
      if (on) {
        var fxp = F.x;
        if (F.vx) { var spn = W + F.w + XR * F.f * 2 + 40, off = F.w + XR * F.f + 20; fxp = ((F.x + off + td * F.vx) % spn + spn) % spn - off; }   // zieht langsam und kommt auf der anderen Seite wieder
        var ft = 'translate3d(' + (fxp + dx * F.f * .6).toFixed(1) + 'px,' + fy.toFixed(1) + 'px,0)';
        if (ft !== F.tr) { F.tr = ft; F.el.style.transform = ft; }
      }
      if (on !== F.on) { F.on = on; F.el.style.visibility = on ? 'visible' : 'hidden'; }
    }
    var far = cam > H * 1.2;   // weit oben sieht man die wiegenden Pflanzen nicht: Animation anhalten
    if (far !== farOn && world) { farOn = far; world.classList.toggle('ak-far', far); }
    for (i = 0; i < sprites.length; i++) {
      var S = sprites[i], rot = reduce ? 0 : Math.sin(td * S.f + S.ph) * S.amp + Math.sin(td * S.f * 2.3 + S.ph * 2) * S.amp * .35;
      var sx = S.x + dx * 1.35, sy = S.y + cam * 1.25 + dy * 1.35 - pan * H * AK.scrollPan * .13 + (1 - ie) * 90;
      var piv = 'translate(' + (S.w * S.ax) + 'px,' + (S.h * S.ay) + 'px) rotate(', back = ' translate(' + (-S.w * S.ax) + 'px,' + (-S.h * S.ay) + 'px)';
      S.el.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0) ' + piv + rot.toFixed(2) + 'deg)' + back;
      // Schatten: die Sonne steht hinten in der Mitte, also fällt er nach vorn und etwas nach aussen
      S.sh.style.transform = 'translate3d(' + (sx + (S.ax ? 1 : -1) * W * .02 - dx * .4).toFixed(1) + 'px,' + (sy + H * .028 - dy * .4).toFixed(1) + 'px,0) ' + piv + (rot * 1.3).toFixed(2) + 'deg) scale(1.04)' + back;
    }
    // Glanz und Strahlen bleiben bei der Sonne, die Lichtflecken auf der Wiese
    var L0 = strips[0], sdx = L0 ? dx * L0.d : 0, sdy = L0 ? cam * L0.f + dy * L0.d - pan * 2 * L0.pan : 0, sunT = 'translate3d(' + sdx.toFixed(1) + 'px,' + sdy.toFixed(1) + 'px,0)';
    if (sunT !== sunT0) { sunT0 = sunT; if (glow) glow.style.transform = sunT; if (rays) rays.style.transform = sunT; }
    if (dapple) dapple.style.transform = 'translate3d(0,' + cam.toFixed(1) + 'px,0)';
    if (lit && flare) {
      var fx0 = W * SUN[0] + sdx, fy0 = H * SUN[1] + sdy, fcx = W * .28 - dx * 1.2, fcy = H * .88 - dy * 1.2;
      for (i = 0; i < flare.children.length; i++) {
        var c = flare.children[i], tt = c._t;
        c.style.transform = 'translate3d(' + (fx0 + (fcx - fx0) * tt * 1.4).toFixed(1) + 'px,' + (fy0 + (fcy - fy0) * tt * 1.4).toFixed(1) + 'px,0)';
      }
    }
    if (lit && sheen) sheen.style.transform = 'translate3d(' + (Math.sin(t * .00007) * W * .12 + dx * 2).toFixed(1) + 'px,' + (pan * -H * .1 + dy).toFixed(1) + 'px,0)';
    if (sunRC && !reduce && !fl) {   // Sonne: Strahlen gebogen, schwenken ruhig hin und her (eine Runde in 11 s), das Feld darum macht mit. Im Flug ruht alles
      sunRC.ph += dt;
      var sp = sunRC.ph * .00057, se = Math.min(1, sunRC.ph / 2600); se = se * se * (3 - 2 * se);   // setzt nach der Landung weich ein
      if (lv < 2 && fN & 1) for (i = 0; i < 3; i++) sunRC.f[i].style.transform = 'rotate(' + ([4.5, 4, 3.5][i] * se * Math.sin(sp - [.9, 1.5, 2.1][i])).toFixed(3) + 'deg)';   // jeder Ring etwas später: die Bewegung läuft nach aussen
      if (lv < 3 && sunRC.n++ % 3 === 0) {   // die Strahlen werden neu gemalt, jedes dritte Bild genügt
        sunRC.x.clearRect(0, 0, sunRC.hw * 2, sunRC.hw * 2);
        sunRays(sunRC.x, sunRC.hw, sunRC.hw, sunRC.r, sunRC.lw, se * Math.sin(sp), se * Math.sin(sp - .7));   // die Federn folgen den Flammen etwas später
      }
    }
    drawFx(now, vel);
  }

  function drawFx(now, vel) {
    if (!fxX) return;
    var t = now - tStart, i, sp = Math.abs(vel), near = shown && cam < H * 1.25; nowT = t;
    if (lv >= 3) return;
    var wnd = sp > 1.5 && lv < 1;
    if (!wnd && !near) { if (!fxClean) { fxX.clearRect(0, 0, W, H); fxClean = 1; } return; }   // weit oben und ohne Fahrtwind gibt es nichts zu malen
    if (!wnd && sp < .3 && fN % (lv ? 3 : 2)) return;   // steht die Kamera, genügt jedes zweite Bild: die Glühwürmchen schweben langsam
    fxClean = 0;
    fxX.clearRect(0, 0, W, H);
    fxX.globalCompositeOperation = 'lighter';
    if (wnd) {   // Fahrtwind: helle Striche, je schneller desto länger
      var wa = clamp((sp - 1.5) / 20, 0, 1), span = H + 400;
      fxX.lineCap = 'round'; fxX.strokeStyle = '#ffffff';
      for (i = 0; i < wind.length; i++) {
        var q = wind[i], y = ((q[1] + cam * q[2]) % span + span) % span - 200, len = clamp(sp * q[2] * 2.4, 3, 180);
        fxX.globalAlpha = wa * q[3]; fxX.lineWidth = 1 + q[2] * .8; fxX.beginPath(); fxX.moveTo(q[0], y); fxX.lineTo(q[0], y + len); fxX.stroke();
      }
    }
    if (near) {   // Glühwürmchen und Glitzer wohnen in der Lichtung und bleiben dort, wenn die Kamera wandert
      fxX.save(); fxX.translate(0, cam * 1.1);
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
    for (i = 0; i < kids.length; i++) kids[i].style.transitionDelay = ((flown ? 0 : 450) + i * 150) + 'ms';
    pw.t = tStart + 1600; pw.n = pw.slow = 0;   // Wächter: das Einblenden selbst nicht werten
    clearTimeout(covT);
    covT = setTimeout(function () { if (cover && cover.parentNode) cover.parentNode.removeChild(cover); for (var j = 0; j < kids.length; j++) kids[j].style.transitionDelay = ''; }, AK.introMs + 1400);
  }
  // Noch einmal fliegen: Ein Tipp auf den Titel (Velo Atelier, Alchemist, Slogan) spielt den Flug vom Laden wieder ab.
  // Weich: Text und Menü-Knopf blenden aus, das Perlweiss vom Laden blendet ein, dahinter springt die Kamera nach oben, dann beginnt der Flug
  // wie beim ersten Mal. Das Bild wird nicht neu gemalt; nur die grossen Wedel, die dicht an der Kamera vorbeiziehen, kommen wieder dazu.
  function replay() {
    if (reOn || fl || !shown || reduce || !(AK.flightMs > 0) || !world || performance.now() - tStart < 1800) return;   // nicht gleich nach der Landung: wer den Flug mit Tippen abkürzt, soll ihn nicht versehentlich neu starten
    reOn = 1; drag = null; clearTimeout(covT);
    if (cover && cover.parentNode) cover.parentNode.removeChild(cover);
    cover = document.createElement('div'); cover.className = 'ak-cover is-re'; root.appendChild(cover);
    html.classList.add('ak-re');
    void cover.offsetWidth;   // Ausgangslage zeichnen, dann einblenden
    cover.classList.add('is-in');
    setTimeout(function () {
      shown = false; flown = true; cam = tgY = camT; ptr.tx = ptr.ty = 0;
      html.classList.remove('ak-on'); html.classList.remove('ak-re');
      var r0 = R; R = rng(AK.seed * 31); flyLeaves(); R = r0;
      var n = performance.now(); pw.t = n + 900; pw.n = pw.slow = 0;
      fl = { u: 0, last: n, D: AK.flightMs, rate: 1 };
      requestAnimationFrame(function () { requestAnimationFrame(function () { cover.className = 'ak-cover is-off'; reOn = 0; }); });
    }, 720);
  }
  // «Ausführliche Website»: Der Link steht in Webflow auf der Seite (Text und Ziel sind dort änderbar) und wandert als Knopf ins Menü,
  // links über «Studio». Auf der Seite selbst steht er nicht mehr. Gibt es das Menü nicht, bleibt er als Link stehen.
  function linkToMenu() {
    var a = root.querySelector('.ak-long'), list = document.querySelector('[data-menu-panel] .menu-list:not(.is-contact)');
    if (!a || !list) return;
    a.className = 'grey is-menu'; list.appendChild(a);
  }
  // Slogan: Er steht im offenen Menü, genau dort, wo er auf der Seite unter dem Titel stand, als reine Schrift ohne Kasten (Hugo 27.11., 19:14).
  // Das Element bleibt in Webflow auf der Seite (Text und Aussehen dort änderbar: Klasse ak-lead) und hält unsichtbar seinen Platz frei; so bleibt
  // das Bild, wie es ist. Ins Menü kommt eine Kopie. Das Menü hängt neben dem body, erbt also nichts von der Seite: Lage und Schrift werden
  // darum vom Original abgelesen (placeLead) – beim Start, bei neuer Grösse und beim Öffnen des Menüs. Ohne Menü bleibt der Slogan auf der Seite.
  var mLead = null, oLead = null;
  function leadToMenu() {
    var panel = document.querySelector('[data-menu-panel]'); oLead = root.querySelector('.ak-lead');
    if (!oLead || !panel) return;
    mLead = oLead.cloneNode(true); mLead.removeAttribute('id'); mLead.classList.add('ak-menu-lead');
    panel.insertBefore(mLead, panel.firstChild); oLead.classList.add('ak-moved');
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-menu-open]')) placeLead(); }, true);
    document.addEventListener('keydown', function (e) { if (e.target.closest && e.target.closest('[data-menu-open]')) placeLead(); }, true);
    placeLead();
  }
  function placeLead() {
    if (!mLead) return;
    var x = 0, y = 0, el = oLead, cs = getComputedStyle(oLead), st = mLead.style;
    while (el) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }   // Lage im Layout: unabhängig davon, dass die Seite hinter dem offenen Menü vergrössert ist
    st.left = x + 'px'; st.top = (y - window.scrollY) + 'px'; st.width = oLead.offsetWidth + 'px';
    ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'wordSpacing', 'textTransform', 'textAlign', 'color'].forEach(function (k) { st[k] = cs[k]; });
  }
  // Grösse: nur bei neuer Breite neu malen (Safari-Leisten ändern nur die Höhe); dann ohne Flug
  var lastW = 0, rsT = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rsT);
    rsT = setTimeout(function () {
      W = root.clientWidth; measureWheel(); placeLead(); capRedraw();
      if (Math.abs(W - lastW) > 20) { lastW = W; fl = null; paintScene(false); litOn = null; reveal(); measureWheel(); }
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
    linkToMenu(); leadToMenu();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { capRedraw(); });   // kam die Schrift erst nach dem Start, wird der Text im Kasten noch einmal mit ihr gemalt
    var head = root.querySelector('.ak-head');
    if (head) head.addEventListener('click', function (e) { if (Math.abs(e.clientX - dn[0]) < 10 && Math.abs(e.clientY - dn[1]) < 10 && e.timeStamp - dn[2] < 450) replay(); });   // nur ein kurzer Tipp an Ort und Stelle: kein Wischen über den Titel, kein aufgelegter Finger (der schiebt das Bild)
    setupWheel(); drawWheel();            // zuerst das Rad: das Bild richtet sich nach dem Platz des Textes
    paintScene(fly); lastW = W;           // teuer: einmal beim Laden, solange die Seite noch perlweiss ist
    var pms = performance.now() - t0, mp = 0, cs = world.querySelectorAll('canvas'), ci;
    for (ci = 0; ci < cs.length; ci++) mp += cs[ci].width * cs[ci].height / 1e6;
    if (TIER === 2) setLevel(2);
    else if (pms / mp > 55) setLevel(2);   // braucht das Gerät fürs Malen sehr lange, beginnt es gleich ohne den teuren Schmuck (Richtwert: 4–7 ms je Megapixel auf schnellen Geräten)
    else if (pms / mp > 28) setLevel(1);
    // <test>
    if (location.hash === '#ak-test') { window.__akPaintMs = Math.round(pms); window.__akMP = Math.round(mp * 10) / 10; window.__akLevel = lv; window.__akSetLevel = setLevel; }
    // </test>
    measureWheel();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        tBoot = performance.now(); pw.t = tBoot + 700;
        if (fly) { flown = true; fl = { u: 0, last: tBoot, D: AK.flightMs, rate: 1 }; cover.classList.add('is-off'); }
        else reveal();
        start();
      });
    });
    // <test> Haken für die Prüfskripte (nur mit #ak-test; tools/build.sh lässt alles zwischen den Markierungen in der ausgelieferten Datei weg)
    if (location.hash === '#ak-test') {   // nur für Tests: Standbild bei Fortschritt u; Kamera von Hand an eine Stelle setzen
      window.__akSeek = function (u) { stop(); run = true; flown = true; fl = null; cam = tgY = camT * (1 - swing(u)); if (u >= .92) { reveal(); tStart = Math.min(tStart, performance.now() - 1000); } raf = 0; frameOnce(); };
      window.__akSunStill = function () { sunRC = null; };   // Messung: Strahlen der Sonne nicht mehr neu malen
      window.__akDraw = function (x, k, px, py, u, seed) { R = rng(seed || k * 7 + 1); plant({ add: function (a, b, fn) { fn(x); } }, px, py, k, LW0, u); };   // eine Pflanze einzeln malen (Musterblatt)
      window.__akPan = function (fy) { stop(); run = true; flown = true; fl = null; reveal(); tStart = Math.min(tStart, performance.now() - 1000); cam = tgY = clamp(fy, 0, 1) * camT; raf = 0; frameOnce(); return [sways.length, fliers.length]; };
    }
    // </test>
  }
  function frameOnce() { var r = requestAnimationFrame; window.requestAnimationFrame = function () { return 0; }; frame(performance.now()); window.requestAnimationFrame = r; }
  if (document.fonts && document.fonts.ready) {
    var done = false, b = function () { if (!done) { done = true; boot(); } };
    document.fonts.ready.then(b); setTimeout(b, 1200);
  } else boot();
})();
