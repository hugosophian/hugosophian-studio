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
   Ein Titelbild pro Projekt, jedes genau einmal.
   Hugo 25.11. (07:23, Ziehen ruckelt, Explosion nicht verlässlich bei Creator): Alles wird auf EINE Zeichenfläche (Canvas)
   gemalt, mit eigenem Takt. Die Karten aus dem Designer bleiben unsichtbar im Dokument (Tastatur, Daten für die Vorschau).
   Werte zum Anpassen: CONFIG.
   ============================================================ */
(function () {
  'use strict';

  var CONFIG = {
    // Fläche
    // Hugo 25.11. (07:00): Bilder ohne weissen Rahmen (die Vorschau geht weiterhin weiss aus dem Bild auf) und näher zusammen
    size:      { desktop: [0.5, 0.85], mobile: [0.48, 0.78] },   // Kartengrösse: Anteil der Grösse aus dem Designer (lib-img 30vh / 46vw)
    cell:      { desktop: 1.4, mobile: 1.32 },   // Hugo 25.11. (07:03): wieder etwas mehr Abstand (vorher 1.18 / 1.12)   // Rasterabstand als Vielfaches der mittleren Kartenbreite (kleiner = dichter, mehr Überlappen)
    // Hugo 25.11. (07:44): breite Bilder etwas kleiner, schmale (hochkant) etwas grösser – alle haben im Designer die
    // gleiche Höhe, darum wirken breite riesig und schmale winzig. Grösse × (Breite/Höhe) hoch −aspectEven,
    // begrenzt auf aspectRange. 0 = wie vorher. Beispiel 0.35: 3:2 quer → 87 %, 16:9 → 82 %, 2:3 hoch → 115 %, 9:16 → 122 %.
    aspectEven:  0.35,
    aspectRange: [0.8, 1.25],
    jitter:    0.5,     // wie weit eine Karte von ihrem Rasterplatz abweicht (Anteil vom Raster)
    holes:     0.08,    // Anteil leerer Rasterplätze
    // Wenige Projekte (Singer 2, Model 5): mehr Luft und mehr leere Plätze, damit es nicht wie eine Tapete aussieht.
    // Bei fewFrom Projekten und weniger wächst das Raster um bis zu fewCell und die Lücken um bis zu fewHoles.
    fewFrom:   7, fewCell: 0.3, fewHoles: 0.25, fewJitter: 0.3,
    depth:     [0.62, 1.24],
    // Hugo 25.11. (07:47): Nachbarn dürfen nicht auf derselben Ebene liegen, sonst wirkt der Parallax flach.
    // Die Tiefen kommen aus depthLevels festen Ebenen, etwa gleich oft benutzt. Karten näher als depthNear × Raster
    // bekommen möglichst weit auseinanderliegende Ebenen. depthJitter: kleine Abweichung innerhalb der Ebene.
    depthLevels: 7, depthNear: 2, depthJitter: 0.2,   // Tempo beim Ziehen pro Karte (Tiefe): grössere Zahl = bewegt sich mehr und liegt vorne. Hugo 25.11.: hinten halb so schnell wie vorne
    randomLayout: true, // Hugo 25.11. (07:41): bei jedem Laden und jedem Umsortieren eine neue zufällige Anordnung (false = immer gleich, aus seed)
    seed:      7,       // nur bei randomLayout: false – anderer Wert = andere feste Anordnung
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
    waitMax:    1600,   // höchstens so lange auf die Bilder warten (Hugo 11:17: vorher 2500 – späte Bilder werden nachgemalt)
    decodeMax:  600,    // höchstens so lange zusätzlich auf das Entpacken warten (vorher 900)
    sphereMs:   260,    // Lichtkugel füllt den Bildschirm
    hint:       'Zoom & dr\u00fcck auf die Bilder',   // Hugo 10:22: Hinweis ganz hinten, steht still ('' = keiner)
    hintZoom:   'Dr\u00fcck ins Schwarze',   // Hugo 10:48: so lange gezoomt ist, schreibt sich der Hinweis Buchstabe für Buchstabe hierzu um
    needleMs:   680,    // Hugo 09:57: Linie wie beim Fernseher. Hugo 10:03: blendet ab dem Knall von der Mitte nach aussen aus. Hugo 10:07: minimal länger (vorher 520)
    fadeMs:     700,    // Licht blendet aus (Hugo 25.11. 07:05: wie am Anfang – vor dem Licht sieht man die Bilder herausschiessen)
    flyMs:      [1000, 1500],   // Flugdauer der Bilder
    flyDelay:   100,    // zufällige Verzögerung bis
    spin:       70,     // Drehung beim Start (Grad, ±)
    debris:     6,      // Bilder, die quer durchs Blickfeld an der Kamera vorbeifliegen und verblassen
    menuDelay:  300,    // Menü-Knopf kommt so lange nach dem Knall (ms). Hugo 09:54: wieder wie vorher (1000 war zu spät)
    shakePx:    12,     // Erschütterung beim Knall
    shakeMs:    380,
    maxStep:    34,     // Hugo 25.11. (07:23): eigene Uhr – stockt das Handy, läuft die Explosion langsamer statt Bilder zu überspringen (ms pro Bild höchstens)
    follow:     0.38,
    peek:       0.25,    // Hugo 10:39: so viel (Anteil der Bildbreite) ragen die äussersten Bilder beim Start über den Rand (0 = aus)
    peekMax:    1.5,    // höchstens so stark wird die Fläche dafür auseinandergezogen
    homeEase:   0.075,  // Hugo 10:33: Zurückgleiten auf 100 % nach Tippen neben ein Bild (Anteil pro Bild bei 60 fps, kleiner = weicher)
    // Hugo 25.11. (08:26): Zoom, um an hintere Bilder heranzugehen und wieder heraus. Zwei Finger (Handy), Trackpad-Pinch
    // oder Ctrl + Mausrad (Computer), Tasten + und −. Vordere Bilder wachsen schneller als hintere (Tiefe zoomt mit).
    zoomMin:    0.45,   // ganz heraus
    zoomMax:    2.6,    // ganz hinein
    zoomKey:    1.35,   // Schritt pro Tastendruck
    // Hugo 25.11. (08:32): beim Reinzoomen Tiefenunschärfe – das angezoomte Bild bleibt scharf, die anderen werden je nach
    // Abstand ihrer Parallax-Ebene unscharf (wie bei einer Kamera). 0 = aus, grösser = schneller unscharf.
    dof:        2.4,    // Computer
    dofTouch:   3.3,    // Handy (Hugo 08:48: etwas stärker)
    // Hugo 25.11. (08:48): die Schärfe folgt weich – am Computer der Maus, am Handy einem kleinen Feld in der Bildschirmmitte.
    // Das Feld tastet mehrere Punkte ab und mittelt die Tiefe, darum gleitet die Schärfe von Bild zu Bild statt zu springen.
    focusField: 34,     // px Radius des Felds am Computer
    focusFieldTouch: 70,// px Radius des Felds am Handy
    focusEase:  0.09,   // wie weich die Schärfe wandert (Anteil pro Bild bei 60 fps)
    // Hugo 25.11. (08:52, Foto): unscharfe Bilder VOR dem scharfen werden durchsichtig, damit man das hintere sieht
    seeThrough: 0.75,   // so viel durchsichtiger werden sie höchstens (0 = gar nicht, 1 = ganz unsichtbar)
    // Hugo 25.11. (08:48): beim Zoomen rastet die Ausgangsgrösse (100 %, alles scharf) weich ein – man spürt sie, bleibt aber
    // nicht hängen. snapZone: so nah an 100 % schnappt sie beim Loslassen ganz ein (Anteil, logarithmisch).
    // Hugo 25.11. (09:21): Einrasten bei 100 % wieder weg – die Schärfe folgt ohnehin immer einem Bild
    snapPull:   0,      // 0 = kein Einrasten, 1 = steht kurz still (vorher 0.55)
    snapWidth:  0.09,
    snapZone:   0,      // vorher 0.13
    // Hugo 25.11. (08:36): am Computer löst schon die Maus den Parallax leicht aus (Bildmitte = ruhig, am Rand am meisten)
    mouseParallax: 26,  // px: so weit verschieben sich vorderste und hinterste Bilder gegeneinander (je Richtung)
    mouseEase:  0.07,   // Weichheit (Anteil pro Bild bei 60 fps)   // Hugo 25.11. (07:23): Fläche folgt dem Finger weich nach (Anteil pro Bild bei 60 fps; 1 = hart, kleiner = weicher)
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
    /* Hugo 25.11. (07:23): Bilder, Lichtkugel und Trümmer werden auf EINE Zeichenfläche (Canvas) gemalt, mit eigener Uhr.
       Die Karten aus dem Designer bleiben im Dokument (Tastatur, Vorschau-Daten), werden aber nicht mehr gezeigt. */
    '[data-lib] .gx-canvas { position: absolute; left: 0; top: 0; z-index: 1; pointer-events: none; transition: opacity .65s ease, filter .65s ease; }',
    '[data-lib] .lib-wheel { position: absolute; inset: 0; z-index: 0; opacity: 0; clip-path: inset(50%); pointer-events: none; }',
    '[data-lib] .lib-wheel .lib-item { position: absolute; left: 0; top: 0; visibility: visible !important; opacity: 1 !important; }',   /* erreichbar für die Tastatur, aber weggeschnitten */
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
    /* Hugo 25.11. (10:22): Hinweis ganz hinten (hinter den Bildern), gleiche Schrift wie Bereichsname und Filter, steht still */
    /* Hugo 10:30: am Handy nicht mittig (Webflow-Klasse des Bereichsnamens gab Breite/Ausrichtung mit) → alles fest: so breit wie die
       Zeichenfläche (setzt der Code), Text mittig; padding-left gleicht den Buchstabenabstand nach dem letzten Zeichen aus */
    '[data-lib] .gx-hint { position: absolute !important; left: 0 !important; right: auto !important; bottom: auto !important; top: 50%; width: 100%; max-width: none !important;',
    '  transform: translateY(-50%) !important; margin: 0 !important; padding: 0 0 0 .12em !important; text-align: center !important; display: block !important; float: none !important;',
    '  white-space: nowrap; pointer-events: none; color: #fff;',
    '  font-size: .8rem !important; font-weight: 500 !important; letter-spacing: .12em !important; line-height: 1.5 !important; text-transform: uppercase !important; opacity: 0; transition: opacity 1.2s ease .5s; }',
    '@media (max-width: 767px) { [data-lib] .gx-hint { font-size: 3.2vw !important; } }',
    '[data-lib].is-in .gx-hint { opacity: .6; }',
    '[data-lib] .gx-hint { min-height: 1.5em; }',
    '[data-lib] .gx-hint-l { position: absolute; left: 0; top: 0; width: 100%; text-align: center; padding-left: .12em; box-sizing: border-box; }',
    '[data-lib] .gx-hint-l > span { display: inline-block; white-space: pre; transition: opacity .42s ease, filter .42s ease, transform .42s cubic-bezier(.22,1,.36,1); }',
    '[data-lib] .gx-hint-l.is-out > span { opacity: 0; filter: blur(4px); transform: translateY(-.35em); }',
    '[data-lib] .gx-hint-l.is-pre > span { opacity: 0; filter: blur(4px); transform: translateY(.35em); transition: none; }',
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
    '[data-lib].is-pv-dim .gx-canvas { opacity: .25; }',
    '@media (hover: hover) and (pointer: fine) { [data-lib].is-pv-dim .gx-canvas { filter: blur(8px); } }',
    '[data-lib].is-pv-dim .lib-bottom { opacity: 0; }',
    '.lib-fly { position: fixed; left: 0; top: 0; z-index: 60; pointer-events: none; transform-origin: 0 0; will-change: transform; overflow: hidden; }',
    '.lib-fly img { display: block; width: 100%; height: 100%; object-fit: cover; }',
    /* Menü-Knopf (wie library.js) */
    'html.lib-on.mh-js .menu-toggle-wrap.mh-on.mh-on { translate: 0 var(--mh-drop); transition: opacity var(--menu-dur) var(--menu-ease-out), visibility 0s, translate var(--mh-down) var(--mh-ease-down); }',
    'html.lib-on.mh-js .menu-toggle-wrap.mh-on.mh-on.lib-mb-small { scale: .55; }',
    'html.lib-on.mh-js .menu-toggle-wrap.mh-on.mh-on.lib-mb { translate: 0 0; scale: 1; will-change: translate, scale; transition: opacity var(--menu-dur) var(--menu-ease-out), visibility 0s, translate var(--hp-mb-up, .85s) var(--hp-mb-ease, cubic-bezier(.3, 1.9, .5, 1)), scale var(--hp-mb-up2, .85s) var(--hp-mb-ease2, cubic-bezier(.3, 1.9, .5, 1)); }',
    '@media (prefers-reduced-motion: reduce) { [data-lib] .gx-canvas { transition-duration: .01s; } .gx-dot { animation: none; } }'
  ].join('\n');

  // ---------- kleine Helfer ----------
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function mod(a, n) { return ((a % n) + n) % n; }
  function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInCubic(t) { return t * t * t; }
  function bezier(x1, y1, x2, y2) {
    function A(p1, p2) { return 1 - 3 * p2 + 3 * p1; }
    function B(p1, p2) { return 3 * p2 - 6 * p1; }
    function C(p1) { return 3 * p1; }
    function f(t, p1, p2) { return ((A(p1, p2) * t + B(p1, p2)) * t + C(p1)) * t; }
    function d(t, p1, p2) { return 3 * A(p1, p2) * t * t + 2 * B(p1, p2) * t + C(p1); }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x, i;
      for (i = 0; i < 8; i++) { var dx = f(t, x1, x2) - x, dd = d(t, x1, x2); if (Math.abs(dx) < 1e-5 || !dd) break; t -= dx / dd; }
      if (Math.abs(f(t, x1, x2) - x) > 1e-4) { var lo = 0, hi = 1; t = x; for (i = 0; i < 30; i++) { var v = f(t, x1, x2); if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; } }
      return f(t, y1, y2);
    };
  }
  // gleiche Kurven wie vorher in den Web-Animationen
  var EXPOf = bezier(.16, 1, .3, 1), OUT3 = bezier(.33, 1, .68, 1), EASEOUT = bezier(0, 0, .58, 1);
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

    var cv = document.createElement('canvas'); cv.className = 'gx-canvas'; cv.setAttribute('aria-hidden', 'true');
    var ctx = cv.getContext('2d');
    var wheel = document.createElement('div'); wheel.className = 'lib-wheel';
    // Hinweis ganz hinten: vor der Zeichenfläche ins Dokument, damit die Bilder darüber liegen
    var hint = null, hintNow = '';
    // Hinweis als einzelne Buchstaben, damit er sich Buchstabe für Buchstabe umschreiben kann (Hugo 10:48)
    function hintLayer(txt, pre) {
      var l = document.createElement('div'); l.className = 'gx-hint-l' + (pre ? ' is-pre' : '');
      for (var i = 0; i < txt.length; i++) { var c = document.createElement('span'); c.textContent = txt.charAt(i); l.appendChild(c); }
      return l;
    }
    function setHint(txt) {
      if (!hint || !txt || txt === hintNow) return;
      hintNow = txt;
      var olds = [].slice.call(hint.querySelectorAll('.gx-hint-l:not(.is-out)'));
      olds.forEach(function (o) {
        [].forEach.call(o.children, function (c, i) { c.style.transitionDelay = (i * 14) + 'ms'; });
        o.classList.add('is-out'); setTimeout(function () { o.remove(); }, 420 + o.children.length * 14 + 60);
      });
      var nl = hintLayer(txt, true); hint.appendChild(nl);
      [].forEach.call(nl.children, function (c, i) { c.style.transitionDelay = (120 + i * 18) + 'ms'; });
      void nl.offsetWidth; nl.classList.remove('is-pre');
    }
    if (CONFIG.hint) {
      var hintSrc = root.querySelector('.lib-bottom .ps-label');
      hint = document.createElement('div'); hint.setAttribute('aria-hidden', 'true');
      hint.className = (hintSrc ? hintSrc.className + ' ' : '') + 'gx-hint';
      hint.appendChild(hintLayer(CONFIG.hint, false)); hintNow = CONFIG.hint;
      if (hintSrc) hint.style.fontFamily = getComputedStyle(hintSrc).fontFamily;
      stage.appendChild(hint);
    }
    stage.appendChild(cv); stage.appendChild(wheel);
    var DPR = 1;
    // Zeichenfläche in Gerätepixeln (iPhone 3×). Riesige Bildschirme werden begrenzt (höchstens ~9 Mio. Pixel).
    function sizeCanvas() {
      DPR = Math.min(window.devicePixelRatio || 1, 3);
      var px = VW * VH;
      if (px * DPR * DPR > 9e6) DPR = Math.sqrt(9e6 / px);
      var w = Math.round(VW * DPR), h = Math.round(VH * DPR);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
      if (hint) { hint.style.width = VW + 'px'; hint.style.top = (VH / 2) + 'px'; }   // gleiche Mitte wie die Bilder
    }

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
    // Audit 25.11.: Bilder, die erst nach dem Knall fertig laden (langsames Netz, über waitMax), wurden nie gezeigt.
    // Jetzt wird die Karte gemalt, sobald ihr Bild da ist.
    all.forEach(function (p) {
      p.img.addEventListener('load', function () {
        for (var i = 0; i < slots.length; i++) if (slots[i].p === p) {
          var sl = slots[i];
          if (!sl.bmp) { bitmap(sl); if (mode === 'idle' || mode === 'pv') redraw(); }
          return;
        }
      });
    });

    var projects = all.slice();   // aktuelle Auswahl (Sortierung)
    // Zufall pro Laden bzw. Umsortieren. Beim Drehen des Handys bleibt die Anordnung (gleicher Wert, nur neu eingepasst).
    function newSeed() { return CONFIG.randomLayout ? (Math.random() * 4294967296) >>> 0 : CONFIG.seed; }
    var layoutSeed = newSeed();
    var slots = [];               // Karten auf der Fläche
    var clones = [];
    var VW = 1, VH = 1, WW = 1, WH = 1, PAD = 0, BX0 = 0, BX1 = 0, BY0 = 0, BY1 = 0;
    var cam = { x: 0, y: 0 }, tgt = { x: 0, y: 0 }, vel = { x: 0, y: 0 };
    var Z = 1, tZ = 1, zr = 0;   // Zoom gezeigt / Ziel / roh (logarithmisch, vor dem Einrasten)
    var dF = 1, tdF = 1;  // Tiefe, auf die scharf gestellt ist (gezeigt / Ziel)
    var mo = { x: 0, y: 0 }, tmo = { x: 0, y: 0 };   // Maus-Parallax (gezeigt / Ziel)   // cam = gezeigt, tgt = wo Finger/Schwung hinwollen
    var drawOrder = [], focusSlot = null;
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
    // Tiefen so verteilen, dass nahe Karten klar verschiedene Ebenen haben (Hugo 07:47, Video 07:46: Garten, Person,
    // Schuh und Velo glitten gleich schnell wie ein einziges Bild). Erst grob in zufälliger Reihenfolge, dann in
    // mehreren Durchgängen nachbessern: jede Karte auf die Ebene, die am wenigsten mit ihren Nachbarn kollidiert.
    // Strafe pro Nachbar: je näher und je ähnlicher die Ebene, desto grösser. Dazu leichter Zug zu gleich vielen Karten pro Ebene.
    function spreadDepth(R, cell) {
      var L = Math.max(2, CONFIG.depthLevels), D0 = CONFIG.depth[0], D1 = CONFIG.depth[1], near = cell * CONFIG.depthNear;
      var used = [], fair = slots.length / L, i, j;
      for (i = 0; i < L; i++) used.push(0);
      var seq = slots.slice();
      for (i = seq.length - 1; i > 0; i--) { j = Math.floor(R() * (i + 1)); var t = seq[i]; seq[i] = seq[j]; seq[j] = t; }
      function penalty(sl, lv, list) {
        var pen = 0;
        for (var q = 0; q < list.length; q++) {
          var o = list[q]; if (o === sl || o.lv < 0) continue;
          var dx = o.x - sl.x, dy = o.y - sl.y, dd = Math.sqrt(dx * dx + dy * dy);
          if (dd < near) { var w = 1 - dd / near, df = Math.abs(o.lv - lv); pen += w * w / (1 + df * df * 1.5); }
        }
        return pen + 0.15 * Math.max(0, used[lv] - fair + 1);
      }
      function pick(sl, off) {
        var best = sl.lv >= 0 ? sl.lv : 0, bp = Infinity;
        for (var k = 0; k < L; k++) { var lv = (k + off) % L, pen = penalty(sl, lv, slots); if (pen < bp - 1e-9) { bp = pen; best = lv; } }
        return best;
      }
      slots.forEach(function (sl) { sl.lv = -1; });
      seq.forEach(function (sl) { sl.lv = pick(sl, Math.floor(R() * L)); used[sl.lv]++; });
      for (var pass = 0; pass < 8; pass++) {
        var changed = 0;
        seq.forEach(function (sl) {
          var cur = sl.lv; used[cur]--;
          var nb = pick(sl, 0); sl.lv = nb; used[nb]++;
          if (nb !== cur) changed++;
        });
        if (!changed) break;
      }
      slots.forEach(function (sl) { sl.d = D0 + (D1 - D0) * clamp((sl.lv + (R() - .5) * CONFIG.depthJitter) / (L - 1), 0, 1); });
    }
    function aspectF(p) {
      var ar = p.w && p.h ? p.w / p.h : 1;
      return clamp(Math.pow(ar, -CONFIG.aspectEven), CONFIG.aspectRange[0], CONFIG.aspectRange[1]);
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
      all.forEach(function (p) { p.used = false; });
      slots = []; drawOrder = []; focusSlot = null; resizePending = false;
      sizeCanvas();
      if (!projects.length) return;
      var sz = mob ? CONFIG.size.mobile : CONFIG.size.desktop;
      var avgW = 0, maxD = 0;
      projects.forEach(function (p) { p.af = aspectF(p); avgW += p.w * p.af; maxD = Math.max(maxD, Math.hypot(p.w, p.h)); });
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
      var R = rng(layoutSeed + strSeed(location.pathname + (current || '') + (mob ? 'm' : 'd')));
      var list = order(n, R), k = 0;
      for (var r = 0; r < rows; r++) {
        var inRow = Math.min(cols, n - r * cols), rowOff = (cols - inRow) * cell / 2;   // letzte Reihe mittig
        for (var c = 0; c < inRow; c++) {
          var p = list[k++], el = p.el;
          var s = (sz[0] + R() * (sz[1] - sz[0])) * p.af;
          var d = CONFIG.depth[0] + R() * (CONFIG.depth[1] - CONFIG.depth[0]);
          slots.push({
            p: p, el: el, a: el.querySelector('a.lib-card') || el.querySelector('a'), img: el.querySelector('img'),
            s: s, d: d, w: p.w, h: p.h,
            // Weltlage relativ zur Mitte; Reihen leicht versetzt, damit kein Raster sichtbar ist
            x: rowOff + c * cell + cell / 2 + (rows > 1 ? (r % 2 - .5) * cell * .35 : 0) + (R() - .5) * cell * jit - WW / 2,
            y: r * rowH + rowH / 2 + (R() - .5) * rowH * jit - WH / 2,
            rot: (R() - .5) * 2 * CONFIG.spin, dl: R() * CONFIG.flyDelay,
            dur: CONFIG.flyMs[0] + R() * (CONFIG.flyMs[1] - CONFIG.flyMs[0]), s0: .03 + R() * .05,
            hide: false, bmp: null
          });
        }
      }
      // Hugo 25.11. (10:39): die äussersten Bilder ragen beim Start etwas über den Bildschirmrand hinaus, damit man aufs
      // Ziehen kommt (Handy und Computer). Reicht die Fläche nicht so weit, wird sie gleichmässig etwas auseinandergezogen
      // (nur grösser, nie kleiner), getrennt für links/rechts und oben/unten.
      if (CONFIG.peek > 0 && slots.length > 4) {   // sehr wenige Bilder (z. B. Singer mit 2): bleiben ganz sichtbar
        var spread = function (ax, half) {
          var f = 1;
          [-1, 1].forEach(function (side) {
            var best = null, bestE = -1e9;
            slots.forEach(function (sl) { var v = sl[ax] * side, h = (ax === 'x' ? sl.w : sl.h) * sl.s / 2; if (v + h > bestE) { bestE = v + h; best = { v: v, h: h }; } });
            if (best && best.v > 1) f = Math.max(f, (half + CONFIG.peek * best.h * 2 - best.h) / best.v);   // so weit, dass peek × Bildbreite draussen liegt
          });
          f = Math.min(f, CONFIG.peekMax);
          if (f > 1) slots.forEach(function (sl) { sl[ax] *= f; });
        };
        spread('x', VW / 2); spread('y', VH / 2);
      }
      spreadDepth(R, cell);
      cam.x = cam.y = tgt.x = tgt.y = 0; Z = tZ = 1; zr = 0; dF = tdF = 1;
      drawOrder = slots.slice().sort(function (a, b) { return a.d - b.d; });   // hinten zuerst, vorne zuletzt
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
    // Zoom je Karte: vorne (grosse Tiefe) wächst stärker als hinten – wie eine Kamera, die in den Raum fährt
    function zf(sl) { return Z === 1 ? 1 : Math.pow(Z, sl.d); }
    function pos(sl) {
      var z = zf(sl);
      var md = (sl.d - 0.93) * 2.2;   // vorne gegen die Maus, hinten mit ihr
      return { x: VW / 2 + (sl.x + cam.x * sl.d) * z + mo.x * md, y: VH / 2 + (sl.y + cam.y * sl.d) * z + mo.y * md };
    }
    // Zoomen um einen Punkt (Finger-Mitte, Maus): der Punkt bleibt unter dem Finger stehen
    // weiches Einrasten bei 100 %: um den Punkt herum wird der Zoom gebremst (die Kurve ist dort flacher), aber nie angehalten
    function snapMap(r) { var B = CONFIG.snapWidth; return r - CONFIG.snapPull * B * Math.tanh(r / B); }
    function zoomRaw(px, py, nr) {
      glide = false;   // neues Zoomen übernimmt sofort
      var lo = Math.log(CONFIG.zoomMin), hi = Math.log(CONFIG.zoomMax);
      zr = clamp(nr, lo - 0.02, hi + 0.02);
      var nz = clamp(Math.exp(snapMap(zr)), CONFIG.zoomMin, CONFIG.zoomMax);
      var o = cv.getBoundingClientRect(), ax = px - o.left - VW / 2, ay = py - o.top - VH / 2;
      tgt.x += ax * (1 / nz - 1 / tZ); tgt.y += ay * (1 / nz - 1 / tZ);
      tZ = nz;
      kick();
    }
    function zoomAt(px, py, nz) { zoomRaw(px, py, Math.log(Math.max(1e-3, nz))); }
    // nach dem Zoomen: nah an 100 %? dann weich ganz einrasten (um die Bildschirmmitte)
    var snapT = 0;
    function settleZoom(delay) {
      clearTimeout(snapT);
      snapT = setTimeout(function () {
        if (mode !== 'idle' || pinch) return;
        if (zr !== 0 && Math.abs(zr) < CONFIG.snapZone) { var o = cv.getBoundingClientRect(); zoomRaw(o.left + VW / 2, o.top + VH / 2, 0); }
      }, delay || 0);
    }
    // Schärfe: welches Bild liegt im Feld (am Computer um die Maus, am Handy in der Mitte)? Mehrere Punkte, gewichtet gemittelt
    var mouseIn = false, mX = 0, mY = 0;
    function frontAt(x, y) {
      for (var i = drawOrder.length - 1; i >= 0; i--) {
        var sl = drawOrder[i]; if (sl.hide || !sl.bmp) continue;
        var f = pos(sl), z = zf(sl);
        if (Math.abs(x - f.x) <= sl.w * sl.s * z / 2 && Math.abs(y - f.y) <= sl.h * sl.s * z / 2) return sl;
      }
      return null;
    }
    function focusDepth() {
      var px = VW / 2, py = VH / 2, R = mouse ? CONFIG.focusField : CONFIG.focusFieldTouch;
      if (mouse && mouseIn) { var o = cv.getBoundingClientRect(); px = mX - o.left; py = mY - o.top; }
      var sum = 0, ws = 0;
      for (var gy = -2; gy <= 2; gy++) for (var gx = -2; gx <= 2; gx++) {
        var hit = frontAt(px + gx * R / 2, py + gy * R / 2); if (!hit) continue;
        var w = Math.exp(-(gx * gx + gy * gy) / 4); sum += hit.d * w; ws += w;
      }
      return ws > 0 ? sum / ws : null;
    }
    // Rand: ausserhalb von BX0…BX1 / BY0…BY1 bremst das Ziehen (Gummiband), danach federt die Fläche zurück
    function outX(v) { return v > BX1 ? v - BX1 : v < BX0 ? v - BX0 : 0; }
    function outY(v) { return v > BY1 ? v - BY1 : v < BY0 ? v - BY0 : 0; }
    function outside() { return Math.abs(outX(tgt.x)) > .3 || Math.abs(outY(tgt.y)) > .3; }

    // ---------- Bilder vorbereiten ----------
    // Jede Karte wird einmal in genau ihrer Grösse (Gerätepixel) gemalt. Beim Ziehen wird nur noch dieses fertige Bild
    // verschoben: kein Verkleinern pro Bild, nichts muss neu auf den Grafikchip.
    function bitmap(sl) {
      var W = Math.max(1, Math.round(sl.w * sl.s * DPR)), H = Math.max(1, Math.round(sl.h * sl.s * DPR));
      var old = sl.p.bmp;
      if (old && old.width === W && old.height === H) { sl.bmp = old; sl.crop = sl.p.crop; return; }
      var img = sl.img;
      if (!img || !img.naturalWidth) { sl.bmp = null; return; }
      var src = img, sw = img.naturalWidth, sh = img.naturalHeight;
      try {
        while (sw > W * 2.2 && sh > H * 2.2) {   // grosse Bilder in Stufen halbieren (sauberer als ein grosser Schritt)
          var t = document.createElement('canvas'); t.width = Math.ceil(sw / 2); t.height = Math.ceil(sh / 2);
          var tc = t.getContext('2d'); tc.imageSmoothingQuality = 'high'; tc.drawImage(src, 0, 0, t.width, t.height);
          src = t; sw = t.width; sh = t.height;
        }
        var c = document.createElement('canvas'); c.width = W; c.height = H;
        var g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
        var ar = W / H, sx = 0, sy = 0, cw = sw, ch = sh;
        if (sw / sh > ar) { cw = sh * ar; sx = (sw - cw) / 2; } else { ch = sw / ar; sy = (sh - ch) / 2; }
        g.drawImage(src, sx, sy, cw, ch, 0, 0, W, H);
        sl.bmp = sl.p.bmp = c;
        var nW = img.naturalWidth, nH = img.naturalHeight;   // Ausschnitt im Originalbild (für scharfes Reinzoomen)
        sl.crop = sl.p.crop = nW / nH > ar ? [(nW - nH * ar) / 2, 0, nH * ar, nH] : [0, (nH - nW / ar) / 2, nW, nW / ar];
      } catch (e) { sl.bmp = null; }
    }
    function bitmaps() { slots.forEach(bitmap); }
    // Unschärfe-Stufen einer Karte (erst beim ersten Reinzoomen gebaut): stark verkleinert, beim Malen wieder vergrössert –
    // das ergibt eine weiche Unschärfe mit weichen Rändern und kostet fast nichts. Stufe 1 leicht, Stufe 2 stark.
    function blurLv(sl, lv) {
      var key = lv === 1 ? 'b1' : 'b2';
      if (sl[key] !== undefined) return sl[key];
      var b = sl.bmp; if (!b) return null;
      var f = lv === 1 ? 7 : 18, pad = 3, w = Math.max(2, Math.round(b.width / f)), h = Math.max(2, Math.round(b.height / f));
      try {
        var src = b, sw = b.width, sh = b.height;
        while (sw / 2 > w * 1.6) { var t = document.createElement('canvas'); t.width = Math.ceil(sw / 2); t.height = Math.ceil(sh / 2); t.getContext('2d').drawImage(src, 0, 0, t.width, t.height); src = t; sw = t.width; sh = t.height; }
        var c = document.createElement('canvas'); c.width = w + 2 * pad; c.height = h + 2 * pad;
        var g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
        g.filter = 'blur(' + (lv === 1 ? 0.8 : 1.2) + 'px)';   // wo vorhanden noch weicher (sonst ohne)
        g.drawImage(src, pad, pad, w, h);
        sl[key] = { c: c, pad: pad, w: w, h: h };
      } catch (e) { sl[key] = null; }
      return sl[key];
    }
    function drawLv(q, L, T, w, h, a) {
      var kx = w / q.w, ky = h / q.h;
      ctx.globalAlpha = a;
      ctx.drawImage(q.c, L - q.pad * kx, T - q.pad * ky, w + 2 * q.pad * kx, h + 2 * q.pad * ky);
    }

    // ---------- Malen ----------
    var SNAP = 1;
    function drawCard(sl, x, y, sc, rot, a, bl) {
      var b = sl.bmp; if (!b || a <= 0) return;
      ctx.globalAlpha = a > 1 ? 1 : a;
      var X = x * DPR, Y = y * DPR;
      if (!rot) {
        var w = b.width * sc, h = b.height * sc, L = X - w / 2, T = Y - h / 2;
        if (L > cv.width || T > cv.height || L + w < 0 || T + h < 0) return;   // ausserhalb: nicht malen
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (sc === 1 && SNAP) { L = Math.round(L); T = Math.round(T); }   // ruhend gestochen scharf
        // Tiefenunschärfe (bl 0…2): Stufen weich übereinander geblendet
        if (bl > 0.02) {
          var q1 = blurLv(sl, 1), q2 = bl > 1 ? blurLv(sl, 2) : null;
          if (q1 && (bl <= 1 || q2)) {
            var A = a > 1 ? 1 : a;
            if (bl <= 1) { drawLv(q1, L, T, w, h, A); a = A * (1 - bl); ctx.globalAlpha = a; if (a < 0.02) { ctx.globalAlpha = 1; return; } }
            else { drawLv(q2, L, T, w, h, A); drawLv(q1, L, T, w, h, A * Math.max(0, 2 - bl)); ctx.globalAlpha = 1; return; }
          }
        }
        // reingezoomt: direkt aus dem Originalbild malen, sonst würde das kleine Kartenbild unscharf vergrössert
        if (sc > 1.12 && sl.crop && sl.img && sl.img.complete && sl.img.naturalWidth) { var q = sl.crop; ctx.drawImage(sl.img, q[0], q[1], q[2], q[3], L, T, w, h); }
        else ctx.drawImage(b, L, T, w, h);
        ctx.globalAlpha = 1;
      } else {
        var r = rot * Math.PI / 180, co = Math.cos(r) * sc, si = Math.sin(r) * sc;
        ctx.setTransform(co, si, -si, co, X, Y);
        ctx.drawImage(b, -b.width / 2, -b.height / 2);
      }
    }
    function clear() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.clearRect(0, 0, cv.width, cv.height); }
    function paintIdle() {
      clear();
      SNAP = DPR >= 2 ? 1 : 0;
      for (var i = 0; i < drawOrder.length; i++) {
        var sl = drawOrder[i]; if (sl.hide) continue;
        var dof = mouse ? CONFIG.dof : CONFIG.dofTouch;
        var f = pos(sl), bl = Z > 1.01 && dof ? Math.min(2, Math.abs(sl.d - dF) * (Z - 1) * dof) : 0;
        var front = clamp((sl.d - dF - 0.02) / 0.1, 0, 1);   // liegt vor der scharfen Ebene (weich übergeblendet)
        var al = 1 - CONFIG.seeThrough * front * Math.min(1, bl / 1.1);
        drawCard(sl, f.x, f.y, zf(sl), 0, al, bl);
      }
      if (focusSlot && !focusSlot.hide) {   // Tastatur: feiner Rahmen um die gewählte Karte
        var q = pos(focusSlot), fz = zf(focusSlot), hw = focusSlot.w * focusSlot.s * fz / 2 + 4, hh = focusSlot.h * focusSlot.s * fz / 2 + 4;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
        ctx.strokeRect(q.x - hw, q.y - hh, hw * 2, hh * 2);
      }
      ctx.globalAlpha = 1;
    }
    // Lage einer Karte auf dem Bildschirm als Rechteck (für die Vorschau)
    function slotRect(sl) {
      var o = cv.getBoundingClientRect(), f = pos(sl), z = zf(sl), w = sl.w * sl.s * z, h = sl.h * sl.s * z;
      return { left: o.left + f.x - w / 2, top: o.top + f.y - h / 2, width: w, height: h };
    }

    // ---------- Schleife ----------
    // Ein Takt für alles. Explosion und Sortieren laufen auf einer eigenen Uhr: pro gezeichnetem Bild höchstens
    // CONFIG.maxStep ms weiter. Stockt das Handy kurz, wird die Bewegung langsamer, aber es fehlt nie ein Stück.
    var bt = 0, bangEnd = 0, gt = 0, bangFirst = false;
    function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    function frame(now) {
      raf = 0;
      var dms = last ? now - last : 16.67; last = now;
      var dtf = Math.min(3, dms / 16.67), more = false;

      if (mode === 'bang') {
        if (bangFirst) { bangFirst = false; bt = 0; } else bt += Math.min(dms, CONFIG.maxStep);
        paintBang(bt);
        if (bt >= bangEnd) { endBang(); return; }
        more = true;
      } else if (mode === 'gather') {
        gt += Math.min(dms, CONFIG.maxStep);
        var tg = clamp(gt / CONFIG.gatherMs, 0, 1);
        paintGather(tg);
        if (tg >= 1) { gatherDone(); return; }
        more = true;
      } else if (mode === 'idle') {
        if (!drag) inertia(dtf);
        // Fläche folgt dem Ziel weich (Fingerereignisse kommen am iPhone nicht im Bildtakt: ohne das stockt es)
        var k = 1 - Math.pow(1 - CONFIG.follow, dtf), ox = tgt.x - cam.x, oy = tgt.y - cam.y;
        // Hugo 10:38 (Video): nur der Zoom gleitet langsam zurück, Ziehen bleibt normal (vorher war beides gebremst)
        var kz = glide ? 1 - Math.pow(1 - CONFIG.homeEase, dtf) : k;
        var km = 1 - Math.pow(1 - CONFIG.mouseEase, dtf), kf = 1 - Math.pow(1 - CONFIG.focusEase, dtf);
        if (Z > 1.01 || tZ > 1.01) { var fd = focusDepth(); if (fd != null) tdF = fd; }
        var gap = Math.abs(ox) > .02 || Math.abs(oy) > .02 || Math.abs(tZ - Z) > 1e-4 || Math.abs(tdF - dF) > 1e-3 || Math.abs(tmo.x - mo.x) > .03 || Math.abs(tmo.y - mo.y) > .03;
        if (gap) { cam.x += ox * k; cam.y += oy * k; Z += (tZ - Z) * kz; if (glide && Math.abs(tZ - Z) < 1e-3) glide = false; dF += (tdF - dF) * kf; mo.x += (tmo.x - mo.x) * km; mo.y += (tmo.y - mo.y) * km; }
        else { cam.x = tgt.x; cam.y = tgt.y; Z = tZ; dF = tdF; mo.x = tmo.x; mo.y = tmo.y; glide = false; }
        if (hint && CONFIG.hintZoom) setHint(Math.abs(tZ - 1) > 0.04 ? CONFIG.hintZoom : CONFIG.hint);   // gezoomt: «Drück ins Schwarze»
        if (gap || dirty) { paintIdle(); dirty = false; }
        more = !!drag || Math.abs(vel.x) > .05 || Math.abs(vel.y) > .05 || (!drag && outside()) || gap;
      } else if (dirty) {   // Vorschau offen: nur neu malen, wenn sich etwas ändert (Karte aus-/eingeblendet)
        paintIdle(); dirty = false;
      }
      if (more) raf = requestAnimationFrame(frame);
    }
    var dirty = false;
    function redraw() { dirty = true; kick(); }
    function inertia(dtf) {
      tgt.x += vel.x * dtf; tgt.y += vel.y * dtf;
      var fr = Math.pow(CONFIG.friction, dtf); vel.x *= fr; vel.y *= fr;
      // am Rand: Schwung stark bremsen und weich zurückfedern
      var ox = outX(tgt.x), oy = outY(tgt.y), k = 1 - Math.pow(1 - 0.16, dtf), kb = Math.pow(0.6, dtf);
      if (ox) { tgt.x -= ox * k; if (vel.x * ox > 0) vel.x *= kb; }
      if (oy) { tgt.y -= oy * k; if (vel.y * oy > 0) vel.y *= kb; }
      if (Math.abs(vel.x) < .05) vel.x = 0; if (Math.abs(vel.y) < .05) vel.y = 0;
    }

    // ---------- Urknall ----------
    // Lichtkugel, Erschütterung, Flug der Karten und Trümmer: alles auf der Zeichenfläche, Bild für Bild aus der eigenen Uhr.
    // Hugo 25.11. (09:50): der weisse Blitz war zu stark («kann Menschen stören»). Gleich wuchtig (gleiche Grösse und Zeit),
    // aber nur ein kleiner heller Kern, darum herum durchscheinende Regenbogen-Ringe in den Farben von Nadel und Punkt.
    // Vorher: [0,'#fff'],[.70,'#fff'],[.79,'#ffd6f3'],[.83,'#ff8fe0'],[.87,'#b9a0ff'],[.91,'#8fdcff'],[.94,'#9cf7cf'],[.97,'#fff09a'],[1,transparent]
    // (09:50 Regenbogen-Ringe, verworfen 09:54: zu kreisförmig)
    var shk = [], fin = [];
    function bang() {
      if (dot) { dot.remove(); dot = null; }
      vel.x = vel.y = 0;
      if (reduce || !slots.length) {
        mode = 'idle'; paintIdle(); root.classList.add('is-in'); mbShow(); return;
      }
      var i, longest = 0;
      shk = [];
      for (i = 0; i <= 8; i++) { var a = (1 - i / 8) * CONFIG.shakePx; shk.push(i === 8 ? [0, 0] : [(Math.random() - .5) * 2 * a, (Math.random() - .5) * 2 * a]); }
      slots.forEach(function (sl) { sl.fin = pos(sl); longest = Math.max(longest, sl.dur + sl.dl); });
      debrisEls.forEach(function (d) { longest = Math.max(longest, d.dur + d.dl); });
      bangEnd = Math.max(longest, CONFIG.sphereMs + CONFIG.fadeMs) + 20;
      mode = 'bang'; bangFirst = true;
      clearTimeout(bangT);
      bangT = setTimeout(function () { root.classList.add('is-in'); }, 300);
      setTimeout(mbShow, CONFIG.menuDelay);
      kick();
    }
    function endBang() {
      debrisEls = [];
      mode = 'idle'; dirty = true; paintIdle();
      settle();
    }
    // Audit 25.11.: was während Explosion oder Vorschau verlangt wurde, jetzt nachholen
    //  – Umsortieren mitten in der Explosion: erst fertig fliegen lassen, dann zurück in den Punkt (vorher sprangen die Karten)
    //  – Handy gedreht: neu einpassen (vorher blieb die Fläche im alten Format, verzerrt und halb leer)
    var filterPending = false, resizePending = false;
    function settle() {
      if (mode !== 'idle') return;
      if (filterPending) { filterPending = false; applyFilter(); return; }
      if (resizePending) { resizePending = false; refit(); }
    }
    function refit() {
      if (Math.abs(window.innerWidth - VW) < 2 && Math.abs(window.innerHeight - VH) < 120) return;
      build(); bitmaps(); dirty = true; paintIdle(); kick();
    }
    // Hugo 25.11. (09:54): nicht kreisförmig mit Ringen, sondern weiche Akzente wie bei Nadel und Punkt – bezaubernd.
    // Ein weicher, nicht ganz weisser Lichtschein (kleiner heller Kern) und darüber schillernde Farbwolken (Pink, Blau,
    // Mint, Gelb, Violett), die sich langsam drehen und mit dem Licht aufblühen, plus ein schillernder Streifen am
    // Horizont wie die Nadel. Gleiche Zeiten wie vorher (sphereMs, fadeMs).
    var NEEDLE_S = null, NEEDLE_T = null;
    // Nadel wie beim Fernseher (home.js crtOff), einmal in Bildschirmbreite gemalt, mit Leuchten
    function needleStrip(W2) {
      if (NEEDLE_S && NEEDLE_S.width === Math.round(W2)) return NEEDLE_S;
      var c = document.createElement('canvas'), H = Math.round(90 * DPR); c.width = Math.round(W2); c.height = H;
      var x = c.getContext('2d'), sx = c.width / 1000, sy = 36 * DPR / 20;
      x.setTransform(sx, 0, 0, sy, 0, H / 2 - 10 * sy);
      var ng = x.createLinearGradient(0, 0, 1000, 0);
      [[0, '#ff6ad5'], [.12, '#c774e8'], [.22, '#ad8cff'], [.32, '#8795e8'], [.42, '#94d0ff'], [.5, '#ffffff'], [.58, '#94d0ff'], [.68, '#8ff7c8'], [.78, '#fff38a'], [.88, '#ffb86b'], [1, '#ff6ad5']]
        .forEach(function (q) { ng.addColorStop(q[0], q[1]); });
      x.shadowColor = 'rgba(190,170,255,.75)'; x.shadowBlur = 16 * DPR; x.fillStyle = ng; x.fill(new Path2D(NEEDLE_D));
      x.shadowColor = 'rgba(255,255,255,.9)'; x.shadowBlur = 4 * DPR; x.fillStyle = '#fff'; x.fill(new Path2D(CORE_D));
      NEEDLE_S = c; return c;
    }
    function needleTmp(ns) {
      if (!NEEDLE_T || NEEDLE_T.width !== ns.width || NEEDLE_T.height !== ns.height) { NEEDLE_T = document.createElement('canvas'); NEEDLE_T.width = ns.width; NEEDLE_T.height = ns.height; }
      return NEEDLE_T;
    }
    var GLOW = [[255, 106, 213], [148, 208, 255], [143, 247, 200], [255, 243, 138], [173, 140, 255]];
    function paintSphere(t) {
      var cx = VW / 2 * DPR, cy = VH / 2 * DPR, R0 = Math.hypot(VW, VH) * 0.75 * DPR, sc, op;
      if (t < CONFIG.sphereMs) { sc = OUT3(t / CONFIG.sphereMs); op = 1; }
      else { sc = 1; op = 1 - EASEOUT(clamp((t - CONFIG.sphereMs) / CONFIG.fadeMs, 0, 1)); }
      if (op <= 0 || sc <= 0) return;
      var r = Math.max(1, R0 * sc), g, i;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = op;
      // weicher Lichtschein
      g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.05, 'rgba(255,250,255,.78)'); g.addColorStop(.16, 'rgba(244,236,255,.4)');
      g.addColorStop(.36, 'rgba(225,215,255,.13)'); g.addColorStop(.65, 'rgba(225,215,255,.04)'); g.addColorStop(1, 'rgba(225,215,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
      // schillernde Farbwolken (screen: hellen auf, ohne weiss zu werden)
      ctx.globalCompositeOperation = 'screen';
      var rot = t / 1000 * 0.9, bloom = 0.35 + 0.65 * sc;
      for (i = 0; i < GLOW.length; i++) {
        var a = rot + i * Math.PI * 2 / GLOW.length + (i % 2 ? 0.35 : 0), d = r * (0.22 + 0.1 * (i % 3)) * bloom;
        var bx = cx + Math.cos(a) * d, by = cy + Math.sin(a) * d * 0.8, br = r * (0.3 + 0.06 * (i % 2)), c = GLOW[i];
        g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0, 'rgba(' + c + ',.78)'); g.addColorStop(.4, 'rgba(' + c + ',.4)'); g.addColorStop(1, 'rgba(' + c + ',0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      }
      // Hugo 09:57: die Linie genau wie beim Fernseher (gleiche Nadel-Form und Farben, Schein drumherum).
      // Hugo 10:03: beim Knall steht sie ganz da (die Spitzen sieht man kurz, das wirkt stärker), dann blendet sie
      // von der Mitte nach aussen aus – die Spitzen gehen zuletzt.
      var L = t / CONFIG.needleMs;
      if (L < 1) {
        var W2 = VW * DPR, la = L < 0.05 ? L / 0.05 : 1, wx = 1 + 0.05 * OUT3(L);
        var hole = Math.pow(clamp((L - 0.045) / 0.955, 0, 1), 0.85) * 1.15;   // ausgeblendeter Bereich, wächst von der Mitte nach aussen
        ctx.globalCompositeOperation = 'screen';
        // Schein (wie .hp-crt-streak)
        ctx.globalAlpha = la * 0.85 * Math.pow(1 - L, 1.6);
        ctx.setTransform(wx, 0, 0, 0.06 * (1 + 0.8 * (1 - L)), cx, cy);
        g = ctx.createRadialGradient(0, 0, 0, 0, 0, W2 * 0.8);
        g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.18, 'rgba(225,205,255,.5)'); g.addColorStop(.45, 'rgba(140,200,255,.14)'); g.addColorStop(.7, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(-W2 * 0.8, -W2 * 0.8, W2 * 1.6, W2 * 1.6);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // Nadel: einmal vorbereitet (mit Leuchten), pro Bild die Mitte herausgeschnitten
        var ns = needleStrip(W2), nt = needleTmp(ns), nc = nt.getContext('2d');
        nc.globalCompositeOperation = 'copy'; nc.drawImage(ns, 0, 0);
        if (hole > 0) {
          var hg = nc.createLinearGradient(0, 0, ns.width, 0), a0 = hole * 0.5, a1 = (hole + 0.35) * 0.5, st = [];
          st.push([0.5 - a1, 0], [0.5 - a0, 1], [0.5 + a0, 1], [0.5 + a1, 0]);
          st.forEach(function (q) { hg.addColorStop(clamp(q[0], 0, 1), 'rgba(0,0,0,' + q[1] + ')'); });
          nc.globalCompositeOperation = 'destination-out'; nc.fillStyle = hg; nc.fillRect(0, 0, ns.width, ns.height);
        }
        nc.globalCompositeOperation = 'source-over';
        var th = ns.height * (1.3 - 0.7 * OUT3(Math.min(1, L * 1.6)));   // dick aufleuchten, dann dünner
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = la;
        ctx.drawImage(nt, cx - W2 * wx / 2, cy - th / 2, W2 * wx, th);
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    function paintBang(t) {
      clear(); SNAP = 0;
      paintSphere(t);
      // Erschütterung (nur die Karten, wie vorher)
      var sx = 0, sy = 0;
      if (t < CONFIG.shakeMs) {
        var q = t / CONFIG.shakeMs * 8, i0 = Math.floor(q), fq = q - i0, A = shk[i0], B = shk[Math.min(8, i0 + 1)];
        sx = A[0] + (B[0] - A[0]) * fq; sy = A[1] + (B[1] - A[1]) * fq;
      }
      var cx = VW / 2, cy = VH / 2;
      for (var i = 0; i < drawOrder.length; i++) {
        var sl = drawOrder[i], u = (t - sl.dl) / sl.dur;
        if (u <= 0) continue;
        var e = EXPOf(Math.min(1, u)), f = sl.fin, s0 = sl.s0 / sl.s;
        drawCard(sl, cx + (f.x - cx) * e + sx, cy + (f.y - cy) * e + sy, s0 + (1 - s0) * e, sl.rot * (1 - e), e / .02);
      }
      // Trümmer: grosse Bilder quer durchs Blickfeld, an der Kamera vorbei, verblassen
      debrisEls.forEach(function (d) {
        var u = (t - d.dl) / d.dur; if (u <= 0 || u >= 1) return;
        var p = OUT3(u), sc = .05 + 2.6 * p, op = p < .06 ? p / .06 : p < .45 ? 1 : 1 - (p - .45) / .55;
        if (op <= 0) return;
        var r = d.rot * p * Math.PI / 180, co = Math.cos(r) * sc * DPR, si = Math.sin(r) * sc * DPR;
        ctx.globalAlpha = op;
        ctx.setTransform(co, si, -si, co, (d.x0 + d.tx * p) * DPR, (d.y0 + d.ty * p) * DPR);
        try { ctx.drawImage(d.img, 0, 0, d.w, d.h); } catch (er) {}
      });
      ctx.globalAlpha = 1;
    }
    function paintGather(tg) {
      clear(); SNAP = 0;
      var eg = easeInCubic(tg), cx = VW / 2, cy = VH / 2, a = 1 - clamp((tg - .7) / .3, 0, 1);
      for (var i = 0; i < drawOrder.length; i++) {
        var sl = drawOrder[i], f = sl.from; if (!f) continue;
        drawCard(sl, f.x + (cx - f.x) * eg, f.y + (cy - f.y) * eg, (sl.fromS || 1) * (1 - .96 * eg), sl.rot * eg * .5, a);
      }
      ctx.globalAlpha = 1;
    }
    // Trümmer vorbereiten (Bild, Richtung, Tempo)
    var debrisEls = [];
    function makeDebris() {
      debrisEls = [];
      if (reduce || !projects.length) return;
      var VWn = VW, VHn = VH, cx = VWn / 2, cy = VHn / 2, m = Math.min(VWn, VHn);
      var Rr = rng(Date.now() & 4095), n = Math.min(CONFIG.debris, Math.max(2, projects.length * 2));
      for (var i = 0; i < n; i++) {
        var p = projects[i % projects.length], im = p.img;
        if (!im || !im.naturalWidth) continue;
        var ar = im.naturalWidth / im.naturalHeight;
        var w = m * (.22 + Rr() * .16), h = w / ar;
        var ang = (i + Rr() * .7) / n * Math.PI * 2;   // Richtungen rundherum verteilt
        debrisEls.push({ img: im, w: w, h: h, x0: cx - w / 2, y0: cy - h / 2, tx: Math.cos(ang) * VWn * 1.15, ty: Math.sin(ang) * VHn * 1.15,
          rot: (Rr() - .5) * 120, dur: 560 + Rr() * 300, dl: Rr() * 60 });
      }
    }
    // Vor dem Knall (während der Lichtpunkt leuchtet): Bilder entpacken, Karten fertig malen und einmal praktisch
    // unsichtbar auf die Fläche legen, damit alles schon auf dem Grafikchip liegt. Dann Knall.
    function prepare(then) {
      var done = false, warmed = false;
      function go() { if (!done) { done = true; then(); } }
      function warm() {
        if (warmed) return; warmed = true;
        bitmaps(); makeDebris();
        if (reduce) { go(); return; }
        clear(); ctx.globalAlpha = 0.004;
        slots.forEach(function (sl) { if (sl.bmp) ctx.drawImage(sl.bmp, 0, 0); });
        debrisEls.forEach(function (d) { try { ctx.drawImage(d.img, 0, 0, d.w * DPR, d.h * DPR); } catch (e) {} });
        var g = ctx.createRadialGradient(0, 0, 0, 0, 0, 10); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 10, 10);
        ctx.globalAlpha = 1;
        requestAnimationFrame(function () { requestAnimationFrame(function () { clear(); setTimeout(go, 40); }); });
      }
      var imgs = slots.map(function (sl) { return sl.img; });
      projects.slice(0, CONFIG.debris).forEach(function (p) { imgs.push(p.img); });
      Promise.all(imgs.map(function (im) { return im && im.decode ? im.decode().catch(function () {}) : null; })).then(warm);
      setTimeout(warm, reduce ? 0 : CONFIG.decodeMax);
    }

    // ---------- Ziehen, Tippen ----------
    var drag = null, down = null;
    // Zwei Finger: zoomen (Abstand) und zugleich verschieben (Mitte)
    var ptrs = {}, pinch = null;
    function nPtr() { return Object.keys(ptrs).length; }
    function pinchGeo() {
      var k = Object.keys(ptrs), a = ptrs[k[0]], b = ptrs[k[1]];
      return { d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    function forget(e) {
      if (!ptrs[e.pointerId]) return;
      delete ptrs[e.pointerId];
      if (pinch && nPtr() < 2) { pinch = null; down = null; drag = null; root.classList.remove('is-dragging'); kick(); settleZoom(60); }
    }
    root.addEventListener('pointerdown', function (e) {
      if (mode === 'load' || mode === 'gather' || mode === 'bang' || root.classList.contains('is-pv')) return;
      if (e.target.closest('.lib-top, .lib-pv, .ps-label')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.pointerType !== 'mouse') {
        ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
        if (nPtr() >= 2) {
          if (!pinch && mode === 'idle') {
            var g0 = pinchGeo(); pinch = { d0: g0.d, r0: zr, x: g0.x, y: g0.y };
            down = null; drag = null; root.classList.remove('is-dragging'); vel.x = vel.y = 0;
            tgt.x = cam.x; tgt.y = cam.y; tZ = Z; glide = false;
          }
          return;
        }
      }
      down = { x: e.clientX, y: e.clientY, id: e.pointerId, touch: e.pointerType !== 'mouse', lx: e.clientX, ly: e.clientY, t: performance.now(), moved: false };
      vel.x = vel.y = 0;
      tgt.x = cam.x; tgt.y = cam.y;   // fängt die Fläche dort, wo man sie sieht
    });
    window.addEventListener('pointermove', function (e) {
      if (ptrs[e.pointerId]) { ptrs[e.pointerId].x = e.clientX; ptrs[e.pointerId].y = e.clientY; }
      if (pinch) {
        if (nPtr() < 2) return;
        var g = pinchGeo();
        tgt.x += (g.x - pinch.x) / tZ; tgt.y += (g.y - pinch.y) / tZ;   // mit zwei Fingern verschieben
        pinch.x = g.x; pinch.y = g.y;
        zoomRaw(g.x, g.y, pinch.r0 + Math.log(g.d / pinch.d0));
        return;
      }
      if (!down || e.pointerId !== down.id) return;
      if (!down.moved) {
        if (Math.abs(e.clientX - down.x) < CONFIG.tapSlop && Math.abs(e.clientY - down.y) < CONFIG.tapSlop) return;
        down.moved = true; drag = down; root.classList.add('is-dragging');
        down.lx = e.clientX; down.ly = e.clientY; down.t = performance.now();
        return;
      }
      var now = performance.now(), k = down.touch ? CONFIG.speedTouch : CONFIG.speedMouse;
      var dx = (e.clientX - down.lx) * k / tZ, dy = (e.clientY - down.ly) * k / tZ, dt = Math.max(1, now - down.t);   // reingezoomt: Finger und Bild bleiben beisammen
      // ausserhalb des Rands nur noch gebremst (Gummiband)
      tgt.x += dx * (outX(tgt.x + dx) * dx > 0 ? .35 : 1); tgt.y += dy * (outY(tgt.y + dy) * dy > 0 ? .35 : 1);
      vel.x = .7 * (dx / dt * 16.67) + .3 * vel.x; vel.y = .7 * (dy / dt * 16.67) + .3 * vel.y;
      down.lx = e.clientX; down.ly = e.clientY; down.t = now;
      kick();
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
    window.addEventListener('pointerup', function (e) { forget(e); release(e, false); });
    window.addEventListener('pointercancel', function (e) { forget(e); release(e, true); });
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
    function slotAt(x, y) {   // vorderste Karte unter dem Finger
      var o = cv.getBoundingClientRect(); x -= o.left; y -= o.top;
      for (var i = drawOrder.length - 1; i >= 0; i--) {
        var sl = drawOrder[i]; if (sl.hide || !sl.bmp) continue;
        var f = pos(sl), z = zf(sl);
        if (Math.abs(x - f.x) <= sl.w * sl.s * z / 2 && Math.abs(y - f.y) <= sl.h * sl.s * z / 2) return sl;
      }
      return null;
    }
    // Tastatur: Fokus auf einer Karte holt sie in die Mitte und zeigt einen feinen Rahmen
    wheel.addEventListener('focusin', function (e) {
      var a = e.target.closest && e.target.closest('a.lib-card'); if (!a) return;
      var sl = slots.filter(function (q) { return q.a === a; })[0]; if (!sl) return;
      focusSlot = sl;
      if (mode === 'idle') { vel.x = vel.y = 0; tgt.x = clamp(-sl.x / sl.d, BX0, BX1); tgt.y = clamp(-sl.y / sl.d, BY0, BY1); }
      redraw();
    });
    wheel.addEventListener('focusout', function () { focusSlot = null; redraw(); });
    // Hugo 10:33: neben ein Bild tippen → Zoom gleitet weich zurück auf die normale Entfernung (100 %), um die Bildschirmmitte
    var glide = false;
    function tap(x, y) {
      var sl = slotAt(x, y);
      if (sl) { openPreview(sl); return; }
      if (Math.abs(zr) > 0.01 || Math.abs(tZ - 1) > 0.01) { var o = cv.getBoundingClientRect(); zoomRaw(o.left + VW / 2, o.top + VH / 2, 0); glide = true; kick(); }
    }

    // Trackpad und Mausrad: Fläche verschieben
    root.addEventListener('wheel', function (e) {
      if (e.target.closest && e.target.closest('.lib-pv-panel, .lib-sort-list')) return;
      e.preventDefault();
      if (mode !== 'idle' || root.classList.contains('is-pv')) return;
      var k = e.deltaMode === 1 ? 32 : 1;
      vel.x = vel.y = 0;
      if (e.ctrlKey || e.metaKey) { zoomRaw(e.clientX, e.clientY, zr - e.deltaY * k * 0.01); settleZoom(260); return; }   // Trackpad-Pinch (Chrome, Firefox) und Ctrl + Mausrad
      tgt.x = clamp(tgt.x - e.deltaX * k / tZ, BX0 - 60, BX1 + 60); tgt.y = clamp(tgt.y - e.deltaY * k / tZ, BY0 - 60, BY1 + 60);
      kick();
    }, { passive: false });

    // Maus-Parallax (nur Computer)
    if (mouse) {
      root.addEventListener('mousemove', function (e) {
        mouseIn = true; mX = e.clientX; mY = e.clientY;
        var mp = CONFIG.mouseParallax;
        tmo.x = -((e.clientX / window.innerWidth) - 0.5) * 2 * mp;
        tmo.y = -((e.clientY / window.innerHeight) - 0.5) * 2 * mp * 0.7;
        if (mode === 'idle') kick();
      });
      root.addEventListener('mouseleave', function () { mouseIn = false; tmo.x = tmo.y = 0; if (mode === 'idle') kick(); });
    }

    // Safari am Mac: Trackpad-Pinch kommt als «gesture» (nur Computer; am iPhone zoomen die zwei Finger oben)
    if (mouse) {
      var gz0 = 1;
      root.addEventListener('gesturestart', function (e) { e.preventDefault(); gz0 = zr; }, { passive: false });
      root.addEventListener('gesturechange', function (e) {
        e.preventDefault();
        if (mode !== 'idle' || root.classList.contains('is-pv')) return;
        zoomRaw(e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2, gz0 + Math.log(Math.max(0.01, e.scale)));
      }, { passive: false });
      root.addEventListener('gestureend', function (e) { e.preventDefault(); settleZoom(60); }, { passive: false });
    }

    // Tastatur
    document.addEventListener('keydown', function (e) {
      if (html.classList.contains('menu-open')) return;
      if (root.classList.contains('is-pv')) { if (e.key === 'Escape') { e.preventDefault(); closePreview(); } return; }
      if (top && top.classList.contains('is-open') && e.key === 'Escape') { setOpen(false); return; }
      if (mode !== 'idle') return;
      var s = 16, hit = true;
      if (e.key === 'ArrowLeft') vel.x = s; else if (e.key === 'ArrowRight') vel.x = -s;
      else if (e.key === 'ArrowUp') vel.y = s; else if (e.key === 'ArrowDown') vel.y = -s;
      else if (e.key === '+' || e.key === '=') { zoomRaw(window.innerWidth / 2, window.innerHeight / 2, zr + Math.log(CONFIG.zoomKey)); settleZoom(200); }
      else if (e.key === '-' || e.key === '_') { zoomRaw(window.innerWidth / 2, window.innerHeight / 2, zr - Math.log(CONFIG.zoomKey)); settleZoom(200); }
      else hit = false;
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
      if (mode === 'bang' || mode === 'pv') { filterPending = true; return; }
      vel.x = vel.y = 0; drag = null; down = null;
      if (reduce) { select(); layoutSeed = newSeed(); build(); bitmaps(); bang(); return; }
      // alle sichtbaren Karten fallen zurück in den Punkt
      mode = 'gather'; gt = 0;
      slots.forEach(function (sl) { sl.from = pos(sl); sl.fromS = zf(sl); });
      kick();
    }
    function gatherDone() {
      clear();
      showDot();
      if (dot) { dot.style.animation = 'none'; dot.style.transform = 'scale(1.3)'; }
      select(); layoutSeed = newSeed(); build();
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
      var a = slotRect(sl), cardR = a;   // Karten ohne Rahmen: Bild = Karte
      var D = CONFIG.pvMs;
      target.style.width = b.width + 'px'; target.style.height = b.height + 'px'; target.style.maxWidth = 'none';
      target.classList.add('is-wait');
      mode = 'pv'; pvState = 'opening';
      cam.x = tgt.x; cam.y = tgt.y;
      sl.hide = true; dirty = true; paintIdle();
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
        settle();
      }
      if (!sl || !target) { finish(); return; }
      pvPanel.scrollTop = 0;
      var panelR = { left: 0, top: 0, width: pvPanel.offsetWidth, height: pvPanel.offsetHeight };
      var b = mediaRect(sl);
      var a = slotRect(sl), cardR = a;
      var from = getComputedStyle(pvFrame).transform;
      frameTo([{ transform: from && from !== 'none' ? from : box(panelR), easing: EASE }, { transform: box(cardR) }], CONFIG.pvCloseMs, function () {
        sl.hide = false; paintIdle();
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

    // ---------- Röhren-TV (gleich wie home.js crtOff) ----------
    // Hugo 25.11. (09:21/09:29): zurück zur Homepage schaltet auch die Galerie ab wie ein Röhrenfernseher, der Punkt geht
    // hier aus; die Homepage blendet danach beim Bild des Bereichs ein (Computer stufenweise seitlich, Handy aus dem Schwarz).
  var CRT = { squashMs: 220, lineMs: 440 };   // gleiche Werte wie home.js
    var NEEDLE_D = 'M0 10 C 260 9.7, 400 8.6, 455 5.2 C 478 1.2, 522 1.2, 545 5.2 C 600 8.6, 740 9.7, 1000 10 C 740 10.3, 600 11.4, 545 14.8 C 522 18.8, 478 18.8, 455 14.8 C 400 11.4, 260 10.3, 0 10 Z';
    var CORE_D = 'M40 10 C 300 9.85, 420 9.2, 465 7.4 C 484 5.6, 516 5.6, 535 7.4 C 580 9.2, 700 9.85, 960 10 C 700 10.15, 580 10.8, 535 12.6 C 516 14.4, 484 14.4, 465 12.6 C 420 10.8, 300 10.15, 40 10 Z';
    var NEEDLE_SVG = '<svg viewBox="0 0 1000 20" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="hpCrtIri" x1="0" x2="1" y1="0" y2="0">'
      + '<stop offset="0" stop-color="#ff6ad5"/><stop offset=".12" stop-color="#c774e8"/><stop offset=".22" stop-color="#ad8cff"/><stop offset=".32" stop-color="#8795e8"/>'
      + '<stop offset=".42" stop-color="#94d0ff"/><stop offset=".5" stop-color="#ffffff"/><stop offset=".58" stop-color="#94d0ff"/><stop offset=".68" stop-color="#8ff7c8"/>'
      + '<stop offset=".78" stop-color="#fff38a"/><stop offset=".88" stop-color="#ffb86b"/><stop offset="1" stop-color="#ff6ad5"/></linearGradient></defs>'
      + '<path d="' + NEEDLE_D + '" fill="url(#hpCrtIri)"/><path d="' + CORE_D + '" fill="#fff"/></svg>';
    var crtCss = [
      '.hp-crt { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; }',
      '.hp-crt > i { position: absolute; display: block; opacity: 0; }',
      '.hp-crt-line { left: 0; top: 50%; width: 100%; height: 18px; margin-top: -9px; filter: drop-shadow(0 0 4px rgba(255,255,255,.9)) drop-shadow(0 0 16px rgba(190,170,255,.7)); }',
      '.hp-crt-line svg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible; }',
      '.hp-crt-streak { left: -30vw; top: 50%; width: 160vw; height: 90px; margin-top: -45px; background: radial-gradient(ellipse at center, rgba(255,255,255,.9) 0, rgba(225,205,255,.5) 18%, rgba(140,200,255,.14) 45%, rgba(0,0,0,0) 70%); }',
      '.hp-crt-dot { left: 50%; top: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; background: #fff;',
      '  box-shadow: 0 0 6px 2px #fff, 0 0 16px 5px rgba(255,110,220,.55), 0 0 30px 10px rgba(120,210,255,.45), 0 0 56px 18px rgba(255,230,120,.22); }',
      '.hp-crt-dot.is-hold { opacity: 1; animation: hpCrtPulse 1.1s ease-in-out infinite, hpCrtHue 2.4s linear infinite; }',
      '@keyframes hpCrtPulse { 50% { transform: scale(.82); } }',
      '@keyframes hpCrtHue { to { filter: hue-rotate(360deg); } }',
      '.hp-crt-wash { left: 0; top: 0; width: 100%; height: 100%; background: #fff; mix-blend-mode: screen; }',
      'html.hp-crt-on .menu-toggle-wrap { opacity: 0 !important; transition: opacity .15s !important; }',
      'html.hp-crt-on, html.hp-crt-on body { background: #000 !important; }'
    ].join('\n');
    var crtCss = [
      '.hp-crt { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; }',
      '.hp-crt > i { position: absolute; display: block; opacity: 0; }',
      '.hp-crt-line { left: 0; top: 50%; width: 100%; height: 18px; margin-top: -9px; filter: drop-shadow(0 0 4px rgba(255,255,255,.9)) drop-shadow(0 0 16px rgba(190,170,255,.7)); }',
      '.hp-crt-line svg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible; }',
      '.hp-crt-streak { left: -30vw; top: 50%; width: 160vw; height: 90px; margin-top: -45px; background: radial-gradient(ellipse at center, rgba(255,255,255,.9) 0, rgba(225,205,255,.5) 18%, rgba(140,200,255,.14) 45%, rgba(0,0,0,0) 70%); }',
      '.hp-crt-dot { left: 50%; top: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; background: #fff;',
      '  box-shadow: 0 0 6px 2px #fff, 0 0 16px 5px rgba(255,110,220,.55), 0 0 30px 10px rgba(120,210,255,.45), 0 0 56px 18px rgba(255,230,120,.22); }',
      '.hp-crt-dot.is-hold { opacity: 1; animation: hpCrtPulse 1.1s ease-in-out infinite, hpCrtHue 2.4s linear infinite; }',
      '@keyframes hpCrtPulse { 50% { transform: scale(.82); } }',
      '@keyframes hpCrtHue { to { filter: hue-rotate(360deg); } }',
      '.hp-crt-wash { left: 0; top: 0; width: 100%; height: 100%; background: #fff; mix-blend-mode: screen; }',
      'html.hp-crt-on .menu-toggle-wrap, html.hp-crt-on .menu-panel { opacity: 0 !important; transition: opacity .15s !important; }',
      'html.hp-crt-on, html.hp-crt-on body { background: #000 !important; }',
      'html.hp-crt-on body { filter: none !important; scale: none !important; transition: none !important; }'
    ].join('\n');
    var crtFx = null;
    function crtReset() {
      if (crtFx) { crtFx.remove(); crtFx = null; }
      document.documentElement.classList.remove('hp-crt-on');
      var b = document.body;
      if (b.getAnimations) b.getAnimations().forEach(function (an) { if (an.id === 'hp-crt') an.cancel(); });
      ['transform-origin', 'visibility', 'opacity'].forEach(function (p) { b.style.removeProperty(p); });
    }
    // Zurück auf die Projektseite (aus dem Speicher): Fernseher wieder an
    window.addEventListener('pageshow', function (e) { if (e.persisted) crtReset(); });
    function crtOff(done) {
      if (crtFx) return;
      if (!document.getElementById('hp-crt-css')) {
        var st = document.createElement('style'); st.id = 'hp-crt-css'; st.textContent = crtCss; document.head.appendChild(st);
      }
      var R = document.documentElement, b = document.body, A = CRT.squashMs, L = CRT.lineMs;
      crtFx = document.createElement('div'); crtFx.className = 'hp-crt'; crtFx.setAttribute('aria-hidden', 'true');
      crtFx.innerHTML = '<i class="hp-crt-wash"></i><i class="hp-crt-streak"></i><i class="hp-crt-line">' + NEEDLE_SVG + '</i><i class="hp-crt-dot"></i>';
      R.appendChild(crtFx);
      R.classList.add('hp-crt-on');
      var wash = crtFx.children[0], streak = crtFx.children[1], line = crtFx.children[2], dotEl = crtFx.children[3];
      var IN = 'cubic-bezier(.55,0,.9,.4)', IN4 = 'cubic-bezier(.75,0,.95,.35)', o = { fill: 'both' };
      b.style.setProperty('transform-origin', '50% ' + (window.scrollY + window.innerHeight / 2) + 'px', 'important');
      // 1) Bild klappt senkrecht zusammen und wird heller
      // Hugo 25.11. (06:44): am Ende blendet die Seite ganz aus. Vorher blieb die zusammengeklappte Seite als dünne Linie stehen,
      // weil visibility: hidden am body die Bilder mit visibility: visible (.hp-slide.is-vis) nicht versteckt; opacity schon.
      var sq = b.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(1.04, .02)', opacity: 1, offset: .8 }, { transform: 'scale(1.05, .004)', opacity: 0 }], { duration: A, easing: IN, fill: 'forwards', id: 'hp-crt' });
      wash.animate([{ transform: 'scaleY(1)', opacity: 0 }, { transform: 'scaleY(.02)', opacity: .9, offset: .8 }, { transform: 'scaleY(.004)', opacity: 0 }], { duration: A, easing: IN, fill: 'forwards' });   // blendet selbst aus (blieb sonst als 3-px-Strich stehen)
      streak.animate([{ opacity: 0 }, { opacity: 0, offset: .65 }, { opacity: 1 }], { duration: A, fill: 'forwards' });
      // 2) Blitz am Horizont: die Nadel leuchtet dick auf, holt kurz Schwung nach aussen und schlägt dann immer schneller
      //    zur Mitte zusammen. Die Farben drängen sich dabei zusammen (Schillern).
      var SNAP = 'cubic-bezier(.62,0,.98,.55)';
      line.animate([
        { opacity: 0, transform: 'scaleX(1) scaleY(2.6)', easing: 'ease-out' },
        { opacity: 1, transform: 'scaleX(1) scaleY(2.6)', offset: .02, easing: 'cubic-bezier(.2,.7,.3,1)' },
        { opacity: 1, transform: 'scaleX(1.06) scaleY(1)', offset: .2, easing: SNAP },
        { opacity: 1, transform: 'scaleX(.03) scaleY(.8)', offset: .94 },
        { opacity: 0, transform: 'scaleX(.002) scaleY(.6)' }   // verschwindet ganz im Punkt
      ], { duration: L, delay: A, fill: 'both' });
      streak.animate([
        { opacity: 1, transform: 'scaleX(1) scaleY(1.8)', easing: 'ease-out' },
        { opacity: .85, transform: 'scaleX(1.05) scaleY(1)', offset: .2, easing: SNAP },
        { opacity: .4, transform: 'scaleX(.04) scaleY(.8)', offset: .9 },
        { opacity: 0, transform: 'scaleX(.02) scaleY(.6)' }
      ], { duration: L, delay: A, fill: 'forwards' });
      // Der Kreis in der Mitte gehört zur Nadel (ihr Rücken läuft in ihn hinein). Er bleibt stehen, während die Nadel in ihn
      // hineinzieht, blitzt beim Ankommen kurz auf und bleibt als Lichtpunkt.
      dotEl.animate([{ opacity: 0, transform: 'scale(1.5)' }, { opacity: 1, transform: 'scale(1.5)', offset: .03 }, { opacity: 1, transform: 'scale(1)', offset: .3 }, { opacity: 1, transform: 'scale(1)', offset: .8 }, { opacity: 1, transform: 'scale(2.1)', offset: .9 }, { opacity: 1, transform: 'scale(1)' }], { duration: L + 120, delay: A, fill: 'both' });
      sq.onfinish = function () { if (crtFx) { b.style.setProperty('opacity', '0', 'important'); wash.style.display = 'none'; } };
      setTimeout(function () {
        if (!crtFx) return;
        // 3) Lichtpunkt bleibt, pulsiert und schillert, bis die Galerie da ist
        line.style.display = streak.style.display = 'none';
        dotEl.getAnimations().forEach(function (an) { an.cancel(); });
        dotEl.classList.add('is-hold');
        done();
      }, A + L + 120);
    }


    // ---------- Bereichsname = zurück zur Homepage ----------
    // Hugo 25.11.: immer zur Homepage auf das Bild dieses Bereichs (sessionStorage hp-return), mit Röhren-TV (siehe oben).
    var backEl = root.querySelector('.lib-bottom .ps-label'), leaving = false;
    window.addEventListener('pageshow', function (e) { if (e.persisted) { crtReset(); leaving = false; } });
    if (backEl) {
      backEl.setAttribute('role', 'link'); backEl.setAttribute('tabindex', '0'); backEl.setAttribute('aria-label', 'Zurück zur Startseite');
      var goBack = function (e) {
        if (e) e.preventDefault();
        if (leaving) return; leaving = true;
        try { sessionStorage.setItem('hp-return', location.pathname); } catch (er) {}
        try { sessionStorage.setItem('hp-backin', '1'); } catch (er) {}
        if (reduce) { location.href = '/'; return; }
        // Hugo 09:29: nur das Fernseher-Schliessen, dann geht der Punkt hier aus; die Homepage blendet danach ein
        crtOff(function () {
          var d = crtFx && crtFx.children[3], leave = function () { if (leave.done) return; leave.done = true; location.href = '/'; };   // ohne Seitenübergang: Safari startete das Einblenden danach neu (Video 09:33)
          if (!d || !d.animate) { leave(); return; }
          d.classList.remove('is-hold');
          // Hugo 09:33: der Punkt springt nicht nochmal, er geht einfach aus – kurz und knapp
          var a = d.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.55)', opacity: 0 }], { duration: 200, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
          a.onfinish = leave; setTimeout(leave, 400);
        });
      };
      // Homepage im Voraus holen, damit sie schnell da ist
      setTimeout(function () { try { var l = document.createElement('link'); l.rel = 'prefetch'; l.href = '/'; document.head.appendChild(l); } catch (er) {} }, 3000);
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
        if (!started) return;
        if (mode !== 'idle') { resizePending = true; return; }   // nach Explosion / Vorschau nachholen (settle)
        refit();
      }, 120);
    });
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      // Zurück aus der Projektseite: Vorschau bleibt offen, das Bild fliegt dorthin zurück
      if (dot) { dot.remove(); dot = null; }
      if (mode === 'idle' || mode === 'pv') { dirty = true; paintIdle(); }
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
