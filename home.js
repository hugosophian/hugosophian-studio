/* ============================================================
   HOMEPAGE  ·  hugosophian.studio
   Läuft auf einer Seite mit einem Abschnitt [data-hp].
   Vorbild: marioroudil.com (Vollbild-Bilder senkrecht, Titel-Wechsel, About von der Seite).

   Handy und Tablet (schmaler als CONFIG.desk):
     Einflug: alle Bilder erscheinen als schmale Säule in der Mitte und ziehen sich dann auf
     Vollbild auf. Danach senkrecht wischen wie bei Mario: durchgehender Bilderstreifen, der dem
     Finger weich nachläuft. Je schneller, desto stärker zoomt das Bild in seinem Rahmen (Verziehen).
     Tippen zeigt den Intro-Text mit „Galerie öffnen“.
   Desktop (ab CONFIG.desk breit, mit Maus):
     Feste Seite, alle Bilder nebeneinander. Fährt die Maus auf ein Bild, schiebt es die anderen
     zur Seite und öffnet daneben den Text. Die Titel wachsen und schrumpfen mit der Bildbreite.
     Klick auf ein Bild öffnet die Galerie.

   Aufbau im Designer (Klassen):
     section.hp [data-hp] [data-mh-manual]
       .hp-brand                 „Hugo Sophian Studio“ oben links (senkrecht, nur Designer)
       .hp-about-btn             Knopf „About“ oben rechts
       .hp-stage
         Collection List „Homepage Card“ (Sortierung: order) → .hp-slide [data-name = Feld Name]
           .hp-media > img.hp-img (card image)
           .hp-title (Feld Titel)
           .hp-data (unsichtbar): .hp-d-intro (Intro), .hp-d-btn (Knopf), a.hp-d-link (Link to Page)
       .hp-intro                 Intro-Ebene: .hp-intro-panel > .hp-intro-title, .hp-intro-text,
                                 a.hp-intro-open, .hp-intro-close
       .hp-about                 About-Panel: .hp-about-panel > .hp-about-title, .hp-about-text, .hp-about-close
   Die Textspalte am Desktop (.hp-side) baut dieses Script selbst, mit Kopien von .hp-intro-text
   und a.hp-intro-open (gleiches Aussehen wie im Designer). Farben: CSS-Variablen --hp-side-bg (Standard weiss), --hp-side-fg (Standard schwarz).
   Optional am Abschnitt: data-hp-links='{"kunst":"/lab-creator"}' (Name → anderer Link, zum Testen)
   ============================================================ */
(function () {
  'use strict';

  var CONFIG = {
    // Senkrecht (Handy)
    // Senkrecht (Handy) – nachgebaut nach marioroudil.com (main.js, Klasse Slider + WebGL-Shader):
    //   Die Bilder liegen als durchgehender Streifen untereinander. Der Finger bewegt das Ziel
    //   (mal speed), die Anzeige läuft dem Ziel mit einer Glättung pro Bild hinterher (ease).
    //   Der Abstand zwischen Ziel und Anzeige ist das Tempo: Daraus zoomt das Bild in seinem Rahmen
    //   (Mario: progress = 0.25 · Abstand / Bildschirmhöhe, Bildausschnitt · (1 − 0.5 · progress)).
    //   Schnell ziehen = grosser Abstand = starkes Verziehen, langsam = wenig. Loslassen rastet auf das nächste Bild ein.
    speed:      3,      // Mario am Handy: 3 (Finger-Weg mal 3), Desktop 1.5
    ease:       0.15,   // Mario: 0.15 pro Bild (60 fps), kleiner = träger und mehr Verziehen
    zoom:       0.25,   // Mario: 0.25 (Stärke des Verziehens)
    zoomMax:    0.24,   // Begrenzung, damit beim Herauszoomen nie ein Rand sichtbar wird
    imgBase:    1.12,   // Bild im Rahmen leicht grösser, als Reserve fürs Herauszoomen (= 1 / (1 − zoomMax / 2))
    wheelIdle:  160,    // ms nach Mausrad/Trackpad, dann einrasten
    edgeGuard:  40,     // px am Rand, in denen Safaris Zurück-Wischen gesperrt ist
    // Einflug
    introMs:    3000,   // Dauer (Aufziehen wie Mario: 2.25 s mit Kurve 0.72, 0, 0.11, 1)
    introWait:  1500,   // höchstens so lange auf die Bilder warten (ms)
    vtDelay:    0,      // nach „zum Studio“: Animation so viel später (ms); 0 = sofort, die alte Seite ist dann schon weg (Hugo 17:12)
    stripW:     0.07,   // Säule: Breite (Anteil Bildschirm)
    stripH:     0.085,  // Säule: Höhe pro Bild (Anteil Bildschirm)
    ldCards:    true,   // Hugo 24.11.: true = weisse Karten mit Magnet (Handy), false = Einflug wie am Computer
    ldStripW:   0.065,  // Ladeanimation: Startgrösse der Karten (Hugo 24.11.: näher, vorher 0.038 × 0.046)
    ldStripH:   0.079,
    // Desktop
    desk:       992,    // ab dieser Breite (px) und mit Maus: Bilder nebeneinander
    deskOpen:   0.52,   // Breite des geöffneten Bildes samt Text (Anteil)
    deskSide:   0.2,    // Breite der Textspalte (Anteil)
    deskStiff:  150,    // Feder beim Aufschieben
    deskDamp:   0.6,    // kleiner = mehr Nachwippen
    deskTitle:  0.9,    // der längste Titel füllt so viel der Bildbreite
    infoMs:     1500,   // About: Dauer (Mario: 1.5 s, Kurve 0.6, 0, 0.1, 1)
    // Computer (Hugo 24.11.): Maus ruht so lange auf dem geöffneten Bereich → alles ausser Text und «Galerie öffnen»
    // blendet aus und die Sonne vom Handy-About geht an. Maus ausserhalb des Bereichs → alles zurück, Sonne weg.
    deskSunIdle: 1000,  // ms ohne Mausbewegung
    deskSunFade: 900,   // ms Aus- und Einblenden
    deskSunRes:  0.5,   // Auflösung der Sonne am Computer (Anteil der CSS-Pixel; Strahlen sind weich)
    deskSunOval: 60,    // px Rand der ovalen Zone um den Text: Maus ausserhalb → alles zurück (Hugo 24.11., 13:36)
    revealSp:   6,      // Tempo der Welle, die die Sonne aufdeckt (wie die Fingerwelle, hier 6-mal schneller)
    diveZoom:   1.3,    // Hugo 24.11. (13:50): das Bild zoomt beim Übergang hinein, als würde man eintauchen (Mario: viel stärker)
    diveMs:     1500,   // Dauer des Eintauchens (Kurve wie Marios About); zurück im Takt des Ausblendens
    closeBeam:  400,    // Hugo 24.11. (13:51): beim Schliessen schwingt ein Sonnenstrahl aufs Display und blendet (ms), dann blendet alles aus
    titleSuck:  1200,   // Hugo 24.11. (13:53): Titel wird beim Öffnen wie von einem Sog nach oben gezogen (ms)
    revealRing: 2.2,    // Hugo 24.11. (14:00): Breite der Sonnenwelle (mal normale Wellenbreite)
    revealWarp: 1.7,    // wie stark die Sonnenwelle das Bild verzieht (mal Fingerwelle)
    closeDock:  0.45    // Hugo 24.11. (14:08): beim Schliessen löst der Strahl das Andocken aus (rundherum), hier schwächer (Anteil)
  };

  var css = [
    'html.hp-on, html.hp-on body { height: 100%; overflow: hidden; overscroll-behavior: none; background: #000; }',
    '[data-hp] { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }',
    '[data-hp] .hp-stage { overflow: hidden; }',
    '[data-hp] .hp-slide { position: absolute; inset: 0; overflow: hidden; visibility: hidden; will-change: transform; backface-visibility: hidden; }',
    '[data-hp] .hp-slide.is-vis { visibility: visible; }',
    '[data-hp] .hp-media { position: absolute; inset: 0; will-change: transform; }',
    '[data-hp] .hp-img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; -webkit-user-drag: none; }',
    '[data-hp] .hp-title { will-change: transform; pointer-events: none; transition: opacity .8s ease .1s; }',
    '[data-hp].hp-run .hp-title { opacity: 0; transition: none; }',
    '[data-hp] .hp-data { display: none !important; }',
    '[data-hp].is-mouse .hp-stage { cursor: pointer; }',
    /* About wie bei Mario: Bilder gleiten nach links weg, weisse Seite mit Text kommt von rechts,
       der Bereichstitel fährt nach oben. Alte Ebenen .hp-intro und .hp-about werden nicht mehr gebraucht. */
    '[data-hp] .hp-intro, [data-hp] .hp-about { display: none !important; }',
    '[data-hp] .hp-info { position: absolute; inset: 0; z-index: 6; pointer-events: none; overflow: hidden; visibility: hidden; transition: visibility 0s linear 1.5s; }',
    '[data-hp].is-info .hp-info { pointer-events: auto; visibility: visible; transition-delay: 0s; }',
    /* Text im About scrollt (Finger, Mausrad); unten Platz, damit er über den Close-Knopf hinaus geschoben werden kann */
    '[data-hp].is-info, [data-hp].is-info .hp-info { touch-action: pan-y; }',
    '[data-hp] .hp-info-panel { position: absolute; inset: 0; box-sizing: border-box; padding: var(--hp-info-top, 30vh) 5vw calc(5vh + 9rem + env(safe-area-inset-bottom, 0px)) var(--hp-info-left, 5vw); background: var(--hp-info-bg, #fff); color: var(--hp-info-fg, #000); transform: translate3d(100%,0,0); display: flex; flex-direction: column; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; touch-action: pan-y; }',
    /* Text und Knöpfe; der ganze weisse Bereich scrollt, der Text läuft dabei unter dem Titel durch */
    '[data-hp] .hp-sun-light { z-index: 8; mix-blend-mode: screen; visibility: hidden; }',
    '[data-hp] .hp-sun-back canvas { position: absolute; display: block; pointer-events: none; }',
    '[data-hp] .hp-sun-back .hp-sun-wall { left: 0; top: 0; width: 100%; height: 100%; }',
    '[data-hp] .hp-sun-back .hp-sun-glass { display: none; }',
    '[data-hp] .hp-info-go { position: relative; }',
    // Schatten von «Galerie öffnen»: Licht von hinten → Schatten fällt nach vorne auf den Boden, gespiegelt, lang
    // gezogen und zum Betrachter hin breiter; nur sichtbar, solange ein Strahl den Button trifft (--hp-lit).
    '[data-hp] .hp-go-sh { position: absolute; left: 0; right: 0; bottom: .28em; display: inherit; gap: inherit; align-items: inherit; justify-content: inherit; white-space: nowrap; pointer-events: none; color: rgb(70,50,25); opacity: calc(var(--hp-lit,0) * .42); transform-origin: 50% 100%; transform: skewX(var(--hp-skew, -40deg)) scaleY(-2.2); filter: blur(1.2px); -webkit-mask-image: linear-gradient(to top, #000 0%, rgba(0,0,0,.5) 45%, transparent 100%); mask-image: linear-gradient(to top, #000 0%, rgba(0,0,0,.5) 45%, transparent 100%); }',
    '[data-hp] .hp-go-sh * { color: inherit !important; text-shadow: none !important; }',
    '[data-hp] .hp-info-sun { position: absolute; inset: 0; width: 100%; height: 100%; display: block; transform: translate3d(100%,0,0); pointer-events: none; }',
    '[data-hp] .hp-info-scroll { display: flex; flex-direction: column; gap: 2.2vh; flex: 0 0 auto; }',
    /* „Galerie öffnen“ im Stil von „Alle Projekte ↓“ der Library (gleiche Webflow-Klassen), Pfeil nach rechts */
    /* Schrift erbt „Alle Projekte“ in der Library vom Eltern-Element lib-top, darum hier dieselben Werte (live gemessen) */
    '[data-hp] .hp-info-go { color: inherit; text-decoration: none; align-self: flex-start; cursor: pointer; -webkit-tap-highlight-color: transparent; display: flex; align-items: center; gap: .5em; font-family: "Oswald Studio", sans-serif; font-size: .8rem; font-weight: 500; letter-spacing: .12em; line-height: 1.5; text-transform: uppercase; }',
    '[data-hp] .hp-info-go .lib-sort-label { font: inherit; letter-spacing: inherit; }',
    '[data-hp] .hp-info-go .lib-sort-arrow { font-size: 1.1em; line-height: 1; font-weight: inherit; letter-spacing: inherit; }',
    '[data-hp] .hp-info-go .lib-sort-label, [data-hp] .hp-info-go .lib-sort-arrow { color: inherit; }',
    '[data-hp] .hp-info-go .lib-sort-arrow { transition: transform .45s cubic-bezier(.3,1.7,.55,1); }',
    /* Hover nur mit echter Maus: am iPhone würde der erste Tipp sonst nur den Hover auslösen statt den Link */
    '@media (hover: hover) and (pointer: fine) { [data-hp] .hp-info-go:hover .lib-sort-arrow { transform: translateX(.35em); } }',
    '[data-hp] .hp-info-go:focus-visible .lib-sort-arrow { transform: translateX(.35em); }',
    /* grössere Tippfläche, ohne dass sich das Aussehen ändert */
    '[data-hp] .hp-info-go { position: relative; touch-action: manipulation; }',
    '[data-hp] .hp-info-go::after { content: ""; position: absolute; inset: -14px -16px; }',
    '[data-hp] .hp-info-panel .hp-intro-text { color: inherit; margin: 0; max-width: none; opacity: 1; transform: none; }',
    '[data-hp] .hp-info-btns { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }',
    '[data-hp] .hp-title.hp-info-title { z-index: 7; pointer-events: none; opacity: 1; transition: transform 1.5s cubic-bezier(.6,0,.1,1), opacity .5s ease; will-change: transform; }',
    '[data-hp] .hp-title.hp-info-title.hp-glass { opacity: 0; transition: transform 1.5s cubic-bezier(.6,0,.1,1), opacity .9s ease; }',
    '[data-hp] .hp-about-btn { transition: opacity .5s ease; }',
    '[data-hp].is-info .hp-about-btn { opacity: 0; pointer-events: none; }',
    /* „Hugo Sophian Studio“ bleibt beim About oben links stehen und wird dunkel, sobald die weisse Seite darunter ist */
    '[data-hp].is-info .hp-brand, [data-hp].hp-info-anim .hp-brand { z-index: 8; }',
    '[data-hp] .hp-brand { transition: color .25s ease; }',
    '[data-hp] .hp-brand.hp-on-white { color: var(--hp-info-fg, #000) !important; mix-blend-mode: normal !important; }',
    '[data-hp].is-desk .hp-about-btn { display: none; }',
    /* Desktop: nebeneinander, Textspalte neben dem geöffneten Bild (nur Text und Link zur Galerie) */
    '[data-hp] .hp-side { display: none; }',
    '[data-hp].is-desk .hp-slide { inset: 0 auto 0 0; visibility: visible; will-change: left, width; }',
    '[data-hp].is-desk .hp-media { right: auto; transform: none; }',
    '[data-hp].is-desk .hp-title { right: auto; margin-left: 0; margin-right: 0; padding-left: 0; padding-right: 0; transform: none; max-width: none; z-index: 5; }',   // über der Andock-Leinwand (z 4)
    '[data-hp].is-desk .hp-side { display: block; position: absolute; top: 0; bottom: 0; right: 0; width: 0; overflow: hidden; z-index: 5; background: var(--hp-side-bg, #fff); color: var(--hp-side-fg, #000); }',   // Hugo 24.11. (13:04): weiss mit schwarzem Text
    '[data-hp] .hp-side-in { position: absolute; top: 0; bottom: 0; left: 0; box-sizing: border-box; padding: 6vh 2.2vw 7vh; display: flex; flex-direction: column; justify-content: center; gap: 2.2vh; }',   // Hugo 24.11.: Text in der Spalte mittig (vorher unten)
    '[data-hp] .hp-side-in .hp-intro-text { margin: 0; max-width: none; color: inherit; opacity: 1; transform: none; }',
    /* Während About auf- und zugeht: Grund hinter dem Bild weiss statt schwarz.
       html und body bleiben schwarz, damit Safari oben und unten schwarz bleibt. */
    '[data-hp].hp-info-anim .hp-stage { background: var(--hp-info-bg, #fff); }',
    '[data-hp] .hp-info-btns [data-hp-close] { display: none !important; }',
    /* Menü-Knopf: diese Seite steuert ihn selbst (Klasse lib-mb, Werte aus dem Website-Footer) */
    'html.hp-on.mh-js .menu-toggle-wrap.mh-on.mh-on { translate: 0 var(--mh-drop); transition: opacity var(--menu-dur) var(--menu-ease-out), visibility 0s, translate var(--mh-down) var(--mh-ease-down); }',
    /* Close-Knopf beim About: bouncet von unten hoch wie die anderen Menü-Knöpfe, nur mit mehr Bounce */
    /* Klein (55 %) nur im versteckten Zustand vor dem Hochbouncen; beim Wegfallen bleibt er gross */
    'html.hp-on.mh-js .menu-toggle-wrap.mh-on.mh-on.hp-mb-small { scale: .55; }',
    'html.hp-on.mh-js .menu-toggle-wrap.mh-on.mh-on.lib-mb { translate: 0 0; scale: 1; transition: opacity var(--menu-dur) var(--menu-ease-out), visibility 0s, translate var(--hp-mb-up, 1.3s) var(--hp-mb-ease, cubic-bezier(.3, 1.9, .5, 1)), scale var(--hp-mb-up2, 1.3s) var(--hp-mb-ease2, cubic-bezier(.3, 1.9, .5, 1)); will-change: translate, scale; }',
    /* Ladeanimation (Hugo 23.11., erst Handy): die Bilder kommen als weisse Karten mit leuchtendem Rand */
    'html.hp-on, html.hp-on body { transition: background-color .8s ease; }',
    '[data-hp] .hp-gold { position: absolute; inset: 0; z-index: 1; pointer-events: none; background: #fff; }',
    /* Hugo 23.11.: wuchtiges Andocken – das Bild schlägt ein: kurzer Stoss nach vorn, federt zurück */
    '@keyframes hp-dock-hit { 0% { transform: scale(1); } 12% { transform: scale(1.04); } 38% { transform: scale(0.99); } 65% { transform: scale(1.005); } 100% { transform: scale(1); } }',
    /* Hugo 24.11.: nur das Foto stösst vor und zurück – Licht, Farben und Flares darüber bleiben ruhig stehen */
    '[data-hp].hp-dock-hit .hp-slide .hp-img { animation: hp-dock-hit .75s cubic-bezier(.2,.7,.3,1) both; transform-origin: 50% 50%; }',
    // Hugo 24.11.: am Computer schlägt das Bild etwas schwächer ein (2.5 % statt 4 %)
    '@keyframes hp-dock-hit-d { 0% { transform: scale(1); } 12% { transform: scale(1.025); } 38% { transform: scale(0.994); } 65% { transform: scale(1.003); } 100% { transform: scale(1); } }',
    '[data-hp].is-desk.hp-dock-hit .hp-slide .hp-img { animation-name: hp-dock-hit-d; }',
    '[data-hp].is-desk.hp-dock-hit .hp-title { transition: none; }',   // Hugo 24.11.: Titel am Computer sofort mit dem Schlag da
    /* Logo und About erst, wenn das Bild angedockt ist */
    'html.hp-ldpre [data-hp] .hp-brand, html.hp-ldpre [data-hp] .hp-about-btn { opacity: 0 !important; pointer-events: none; }',
    'html.hp-on:not(.hp-ldpre) [data-hp] .hp-brand, html.hp-on:not(.hp-ldpre) [data-hp] .hp-about-btn { transition: color .25s ease, opacity .9s ease; }',
    /* Sonne (Hugo 24.11., 13:36): Computer nach 1 s Mausruhe, Handy beim Antippen. Die Sonnenwand liegt als eigene Ebene
       über der Seite und wird von einer Welle ab Maus bzw. Finger nach aussen aufgedeckt (Maske im Takt der Welle, wie das
       Wegwischen der Ladeanimation). Darunter läuft alles weiter (Welle, Verzerrung), bis die Welle es zugedeckt hat.
       Zurück: die Ebene blendet aus. */
    '[data-hp] .hp-dsun-layer { position: absolute; inset: 0; z-index: 6; pointer-events: none; visibility: hidden; opacity: 0; transition: opacity var(--hp-dsun-fade, .9s) ease var(--hp-dsun-beam, .4s), visibility 0s linear calc(var(--hp-dsun-fade, .9s) + var(--hp-dsun-beam, .4s)); }',
    '[data-hp].hp-dsun .hp-dsun-layer { visibility: visible; opacity: 1; transition: none; }',
    '[data-hp] .hp-dsun-layer > .hp-sun-back { transform: none; }',
    // Computer: der Text liegt als Kopie genau über dem Original, bleibt also stehen, während die Sonne kommt
    '[data-hp] .hp-dsun-text { position: absolute; inset: 0; z-index: 7; pointer-events: none; display: none; color: var(--hp-side-fg, #000); }',
    '[data-hp].hp-dsun-live .hp-dsun-text { display: block; }',
    '[data-hp] .hp-dsun-text .hp-info-go { pointer-events: auto; }',
    '[data-hp].is-desk.hp-dsun-live > .hp-sun-light { visibility: visible; transform: none; }',
    '[data-hp].is-desk > .hp-sun-light { opacity: 0; transition: opacity var(--hp-dsun-fade, .9s) ease var(--hp-dsun-beam, .4s); }',
    '[data-hp].is-desk.hp-dsun > .hp-sun-light { opacity: 1; transition: none; }',
    // Handy: das About kommt mit derselben Welle, «close» blendet es aus
    '[data-hp]:not(.is-desk) .hp-info { opacity: 0; transition: opacity var(--hp-dsun-fade, .9s) ease var(--hp-dsun-beam, .4s), visibility 0s linear calc(var(--hp-dsun-fade, .9s) + var(--hp-dsun-beam, .4s)); }',
    '[data-hp].is-info:not(.is-desk) .hp-info { opacity: 1; transition: visibility 0s; }',
    '[data-hp]:not(.is-desk) > .hp-sun-light { opacity: 0; transition: opacity var(--hp-dsun-fade, .9s) ease var(--hp-dsun-beam, .4s); }',
    '[data-hp].is-info:not(.is-desk) > .hp-sun-light { opacity: 1; transition: none; }',
    '@media (prefers-reduced-motion: reduce) { [data-hp] .hp-info-panel, [data-hp] .hp-stage, [data-hp] .hp-info-title { transition-duration: .01s !important; } }'
  ].join('\n');

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  // Andocken wie ein Magnet (Hugo 23.11.): das Bild wird langsamer, fast bis zum Stillstand, und wird dann zum Rand
  // hin angezogen – zuletzt immer schneller, bis es einrastet
  // Hugo 23.11.: Heranzoomen kubisch (langsam an, schnell, langsam aus), knapp vor dem Ziel übernimmt weich ein Magnet:
  // das Bild wird langsamer, ohne anzuhalten, und dann immer schneller zum Rand gezogen, bis es einrastet
  function magnetPull(x) { var x0 = 0.59; return x > x0 ? Math.pow(Math.min(1, (x - x0) / 0.25), 6.5) : 0; }   // Hugo 24.11.: setzt dort ein, wo die (schneller abbremsende) Annäherung endet – kein Warten vor dem Magnet; Kurve wie gehabt   // Hugo 23.11.: Magnet episch, aber ohne fast anzuhalten
  function easeMagnet(x) {
    var k = 0.84, a = 0.98, t = Math.min(1, x / a);   // a nahe 1: bremst nicht ganz aus, bevor der Magnet zieht
    // Hugo 24.11.: bis der Magnet zieht, dieselbe schwungvolle Kurve wie am Computer (easeDock); Magnet unverändert
    var c = easeDockF(t, easeDockM, 1.2);   // Hugo 24.11.: Abbremsen wieder kürzer (zuletzt 1.08)
    return k * c + (1 - k) * magnetPull(x);
  }
  function smoothstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  // Kurve wie Marios Einflug: cubic-bezier(.72, 0, .11, 1) – langsamer Anlauf, sehr weiches Andocken
  function bezier(x1, y1, x2, y2) {
    function a(p1, p2) { return 1 - 3 * p2 + 3 * p1; }
    function b(p1, p2) { return 3 * p2 - 6 * p1; }
    function c(p1) { return 3 * p1; }
    function f(t, p1, p2) { return ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t; }
    function d(t, p1, p2) { return 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1); }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 8; i++) { var dx = f(t, x1, x2) - x, dd = d(t, x1, x2); if (Math.abs(dx) < 1e-5 || !dd) break; t -= dx / dd; }
      if (Math.abs(f(t, x1, x2) - x) > 1e-4) { var lo = 0, hi = 1; t = x; for (i = 0; i < 30; i++) { var v = f(t, x1, x2); if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; } }
      return f(t, y1, y2);
    };
  }
  var easeDock = bezier(0.72, 0, 0.11, 1);
  // Ladeanimation (Hugo 24.11.): wie easeDock, nur das Abbremsen läuft schneller ab (Zeit ab der Mitte weich gerafft,
  // Tempo bleibt stetig)
  function easeDockF(t, ez, b) { var w = t <= 0.45 ? t : t + (b == null ? 1.2 : b) * (t - 0.45) * (t - 0.45) / 1.1; return (ez || easeDock)(Math.min(1, w)); }
  var easeDockM = bezier(0.66, 0, 0.09, 1);   // Hugo 24.11.: zieht am Anfang mehr an   // Hugo 24.11.: Handy – in der Mitte schneller (Ende und Magnet-Einsatz gleich)
  var easeInfo = bezier(0.6, 0, 0.1, 1);   // Marios About-Kurve
  // Sog (Hugo 24.11., 13:53): erst ein Hauch Bewegung, dann zieht es immer stärker, rastet oben ein und federt kaum nach
  function suckF(t) {
    var e = 0.8;
    if (t < e) { var u = t / e; return 0.1 * (1 - (1 - u) * (1 - u)) + 0.9 * u * u * u * u; }
    var v = (t - e) / (1 - e); return 1 + 0.035 * Math.sin(Math.PI * v) * (1 - v);
  }
  var suckEase = (function () {
    var f = suckF;
    try {
      if (window.CSS && CSS.supports('transition-timing-function', 'linear(0, 1)')) {
        var pts = []; for (var i = 0; i <= 60; i++) pts.push(f(i / 60).toFixed(4));
        return 'linear(' + pts.join(', ') + ')';
      }
    } catch (e) {}
    return 'cubic-bezier(.8, 0, .25, 1)';
  })();

  function init(root) {
    if (root.__hp) return;
    root.__hp = true;
    var html = document.documentElement;
    var stage = root.querySelector('.hp-stage');
    if (!stage) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var deskMQ = window.matchMedia('(min-width: ' + CONFIG.desk + 'px) and (hover: hover) and (pointer: fine)');
    var links = {};
    try { links = JSON.parse(root.getAttribute('data-hp-links') || '{}'); } catch (e) {}

    var intro = root.querySelector('.hp-intro');
    var inTitle = intro && intro.querySelector('.hp-intro-title');
    var inText = intro && intro.querySelector('.hp-intro-text');
    var inOpen = intro && intro.querySelector('.hp-intro-open');
    var inClose = intro && intro.querySelector('.hp-intro-close');

    var slides = [].slice.call(root.querySelectorAll('.hp-slide')).map(function (el, i) {
      function q(s) { return el.querySelector(s); }
      var link = q('a.hp-d-link'), name = el.getAttribute('data-name') || '';
      var title = q('.hp-title');
      var col = el.getAttribute('data-color') || '';
      if (title && col) title.style.color = col.replace(/,\s*[\d.]+\s*\)\s*$/, ', 1)');
      var img = q('.hp-img');
      if (img) { img.loading = 'eager'; img.setAttribute('draggable', 'false'); }
      stage.appendChild(el);
      var s = {
        el: el, i: i, media: q('.hp-media'), title: title, img: img,
        name: name, label: title ? title.textContent.trim() : name,
        intro: q('.hp-d-intro') ? q('.hp-d-intro').innerHTML : '',
        btn: q('.hp-d-btn') ? q('.hp-d-btn').textContent.trim() : '',
        href: links[name] || (link ? link.getAttribute('href') : ''),
        o: 0, ov: 0, tw: 0
      };
      // Textspalte für den Desktop
      var side = document.createElement('div'); side.className = 'hp-side'; side.setAttribute('aria-hidden', 'true');
      var sin = document.createElement('div'); sin.className = 'hp-side-in';
      var txt = inText ? inText.cloneNode(false) : document.createElement('div');
      txt.removeAttribute('id'); txt.innerHTML = s.intro;
      sin.appendChild(txt);
      if (s.href) {
        // Link zur Galerie im Stil von „Alle Projekte ↓“ (wie im About am Handy), Pfeil nach rechts
        var a = document.createElement('a'); a.className = 'lib-sort hp-info-go';
        a.href = s.href; a.tabIndex = -1;
        var al = document.createElement('span'); al.className = 'lib-sort-label'; al.textContent = s.btn || 'Galerie öffnen';
        var ar = document.createElement('span'); ar.className = 'lib-sort-arrow'; ar.setAttribute('aria-hidden', 'true'); ar.textContent = '\u2192';
        a.appendChild(al); a.appendChild(ar);
        a.addEventListener('click', function (e) { if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) { e.preventDefault(); e.stopPropagation(); go(s.href); } });
        sin.appendChild(a); s.sideLink = a;
      }
      side.appendChild(sin); el.appendChild(side);
      s.side = side; s.sideIn = sin;
      return s;
    });
    var n = slides.length;
    if (!n) return;


    var desk = deskMQ.matches;
    root.classList.toggle('is-desk', desk);

    // ---------- Titelgrössen ----------
    var fit = root.hasAttribute('data-hp-fit');
    function measure(t) {
      var r = document.createRange(); r.selectNodeContents(t);
      return r.getBoundingClientRect().width;
    }
    // Handy: alle gleich gross, der längste füllt die Breite
    function fitTitles() {
      slides.forEach(function (s) { if (s.title) { s.title.style.fontSize = ''; s.title.style.whiteSpace = 'nowrap'; } });
      if (desk) {
        // Desktop: Breite jedes Titels bei 100px messen, Grösse folgt dann der Bildbreite
        slides.forEach(function (s) { if (s.title) { s.title.style.fontSize = '100px'; s.tw = measure(s.title); } });
        return;
      }
      if (!fit) return;
      var best = Infinity;
      slides.forEach(function (s) {
        var t = s.title; if (!t) return;
        var cs = getComputedStyle(t), fs = parseFloat(cs.fontSize);
        var avail = t.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        var w = measure(t);
        if (w > 0 && avail > 0) best = Math.min(best, fs * avail / w);
      });
      if (best < Infinity) slides.forEach(function (s) { if (s.title) s.title.style.fontSize = best.toFixed(2) + 'px'; });
    }

    var F = 0, C = 0, W = 1, H = 1, raf = 0, last = 0;   // F = angezeigt, C = Ziel (in Bildern)
    // Hugo 24.11.: Start-Karte über den Link wählen – z. B. hugosophian.studio/?model oder /?creator (auch ?start=model
    // oder #model). Passt auf den CMS-Namen (mechanic, kunst, musik, persona) oder den Titel (Alchemist, Creator, Singer, Model).
    // Diese Karte fliegt in der Mitte ein und ist danach das erste Bild; ohne Angabe wie bisher die erste Karte.
    (function () {
      var keys = [];
      try {
        var sp = new URLSearchParams(location.search);
        if (sp.get('start')) keys.push(sp.get('start'));
        sp.forEach(function (v, k) { if (k !== 'start') keys.push(k); });
      } catch (e) {}
      if (location.hash.length > 1) keys.push(decodeURIComponent(location.hash.slice(1)));
      for (var q = 0; q < keys.length; q++) {
        var key = String(keys[q]).trim().toLowerCase();
        if (!key) continue;
        for (var i = 0; i < n; i++) {
          if (slides[i].name.toLowerCase() === key || slides[i].label.toLowerCase() === key) { F = C = i; return; }
        }
      }
    })();
    var hov = -1, deskMoving = false;
    var introOn = !reduce, introT0 = 0, introP = 0, LD = null, introHit = false;
    function wrap(x) { return ((x % n) + n) % n; }
    function rel(j) { var d = wrap(j - F); return d > n / 2 ? d - n : d; }
    function current() { return wrap(Math.round(F)); }

    var tickNow = -1;   // Zeitstempel des laufenden Takts (während step()/Effekt), sonst -1 (z. B. bei Fingerbewegung)
    function setVis(s, on) { if (on !== !!s.vis) { s.el.classList.toggle('is-vis', on); s.vis = on; } }
    function rect(s, x, y, w, h) {
      var st = s.el.style;
      st.left = x.toFixed(2) + 'px'; st.top = y.toFixed(2) + 'px';
      st.width = Math.max(0, w).toFixed(2) + 'px'; st.height = Math.max(0, h).toFixed(2) + 'px';
    }
    function clearInline() {
      slides.forEach(function (s) {
        var st = s.el.style;
        st.left = st.top = st.width = st.height = st.transform = st.clipPath = st.zIndex = '';
        if (s.media) { s.media.style.transform = ''; s.media.style.width = ''; }
        if (s.title) { s.title.style.transform = ''; s.title.style.left = ''; s.title.style.width = ''; }
        s.side.style.width = '';
      });
    }

    // ---------- Wasserwellen bei Berührung (Hugo 23.11.) ----------
    // Wie ein Stein im Wasser: wo der Finger aufsetzt, beginnt eine kleine Ringwelle, entlang der Fingerbahn
    // folgen weitere (zuerst berührt = zuerst los). Die Welle verzerrt das Bild darunter wirklich (es wird in
    // WebGL nachgezeichnet und an der Welle verschoben), um die Welle schimmert ein feiner Regenbogen.
    // Erreicht sie den Bildschirmrand, leuchten die Farben dort leicht auf, laufen am Rand weiter und erlöschen.
    // Ausserhalb der Wellen ist die Leinwand durchsichtig, man sieht das normale Bild.
    var ripple = (function () {
      if (reduce) return null;
      var cv = document.createElement('canvas'), c = null;
      cv.className = 'hp-ripple'; cv.setAttribute('aria-hidden', 'true');
      // liegt im berührten Bild, direkt über dem Foto und unter der Überschrift; wird mit dem Bild beschnitten
      cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
      try { c = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false }); } catch (e) {}
      if (!c) return null;
      var NW = 3, PW = 16, NP = NW * PW;   // bis zu 3 Wellen mit je 16 Bahnpunkten
      var FS = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' + [
        'uniform float uDA; uniform float uFade; uniform vec2 uRes; uniform float uDpr; uniform vec4 uP[' + NP + ']; uniform float uAge[' + NW + ']; uniform float uHue[' + NW + ']; uniform vec4 uB[' + NW + ']; uniform float uT; uniform float uEdgeT; uniform float uSeed; uniform float uKeep; uniform float uImp; uniform float uDesk;',
        'float h2(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }',
        'float n2(vec2 x) { vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);',
        '  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }',      // Punkte der Fingerbahn: x, y, eigenes Alter, aktiv
        // Abstand zum Bahnabschnitt a–b, Wellenfront dort minus gelaufene Strecke (mit weicher Einblendung neuer Punkte)
        // Hugo 24.11.: Flare-Fäden als Stromlinien einer weichen, fast geraden Strömung (kein Winkel um die Mitte → kein Wirbelpunkt).
        // Zwei Scharen schiessen von gegenüberliegenden Seiten über die Mitte bis auf die Gegenseite, gleiten ineinander,
        // werden unterwegs schwächer und nehmen die Randfarbe ihres Ursprungs mit; die Welle läuft weich die Fäden entlang
        'float flPsi(vec2 fc, vec2 res, float t, vec2 d, float sw, float sd) {',
        '  float mn = min(res.x, res.y); vec2 q = fc / mn, c = (fc - res * 0.5) / mn;',
        '  float ra = 0.75 * (n2(q * 0.7 + vec2(sd * 1.3, t * 0.02)) - 0.5); c = mat2(cos(ra), sin(ra), -sin(ra), cos(ra)) * c;',   // Hugo 24.11.: fächert auf
        '  c -= d * 0.45 * smoothstep(2.0, 6.0, uEdgeT);',   // Hugo 24.11.: beim Verglimmen weiterziehen statt stehen
        '  float s = dot(c, d);',
        '  vec2 pp = vec2(-d.y, d.x); float smx = 0.5 * (abs(d.x) * res.x + abs(d.y) * res.y) / mn;',
        '  float ps = dot(c, pp) * 4.5 + sw * s * s * 0.0 + 0.9 * n2(q * 1.8 + vec2(t * 0.07, -t * 0.05) + sd) + 0.45 * n2(q * 4.0 + vec2(-t * 0.1, s * 2.5 - t * 0.45));',
        // Hugo 24.11. (Skizze): am Ursprung starten sie als gebogene Korona-Schlaufen (Füsse am Rand), die aufgehen
        // organischer (Skizze): weicher S-Peitschenschwung, der langsam die Fäden entlangläuft
        '  ps += 0.55 * sw * sin(s * 2.4 - t * 0.55 + sd * 3.0) * smoothstep(-smx, -smx + 0.5, s);',
        '  float op = exp(-max(uEdgeT, 0.0) * 1.1);',
        '  for (int k = 0; k < 2; k++) {',
        '    float fk = float(k), hk = h2(vec2(sd + fk * 3.1, 2.7)), rk = 0.12 + 0.08 * h2(vec2(sd, fk + 5.0));',
        '    vec2 c0 = -d * (smx - 0.14) + pp * ((hk - 0.5) * 1.5);',
        '    vec2 dc = c - c0; float da = dot(dc, d) / rk, db = dot(dc, pp) / (rk * 1.9);',   // flacher Bogen
        '    ps += (fk < 0.5 ? 1.0 : -1.0) * (0.45 + 0.9 * op) * exp(-da * da - db * db);',
        '  }',
        '  return ps;',
        '}',
        // Anziehung (Hugo 24.11.): in der Nähe eines leuchtenden Fadens der anderen Schar biegen die Linien zu ihm hin,
        // laufen ein Stück mit ihm zusammen und lösen sich wieder – weich, ohne Ruck
        // Hugo 24.11. (8:50): zwei direkt benachbarte Fäden leuchten nie gleichzeitig – nur der stärkere. So verteilen sie
        // sich übers Bild und ballen sich nicht (seltene chaotische Ausreisser)
        'float flLit(float id, float sd) {',
        '  float h = h2(vec2(id, sd * 1.7));',
        '  if (h < 0.78 || h2(vec2(id - 1.0, sd * 1.7)) > h || h2(vec2(id + 1.0, sd * 1.7)) > h) return 0.0;',
        '  return h;',
        '}',
        // Faltschutz: die Anziehung wird nur dort gedrosselt, wo sich ein Faden sonst zurückfalten würde (Zickzack)
        'vec3 flNoFold(vec3 P, vec3 F, float att) {',
        '  vec2 gP = vec2(P.y - P.x, P.z - P.x), gF = vec2(F.y - F.x, F.z - F.x);',
        '  float dpf = dot(gF, gP), a = att;',
        '  if (dpf < 0.0) a = min(att, 0.6 * dot(gP, gP) / max(-dpf, 1e-7));',
        '  return P + a * F;',
        '}',
        'float flPull(float pa, float sd) {',
        '  float id = floor(pa + 0.5), dl = pa - id;',
        '  float k = 1.0 - 4.0 * dl * dl;',   // läuft zur Grenze hin sauber auf 0 aus (keine Nahtlinien)
        '  float hl = flLit(id, sd);',
        '  return (hl > 0.0 ? smoothstep(0.78, 1.0, hl) : 0.0) * dl * exp(-dl * dl / 0.16) * k * k;',
        '}',
        // Hugo 24.11. (Video 8:21): Kollision statt Kreuzen. Für einen Faden wird geprüft, ob er auf dem Weg vom Ursprung
        // bis hier einen Faden der anderen Schar überquert hat. War jener stärker, endet er dort (der Stärkere nimmt ihn mit),
        // nur seine Spitze wird seitlich weggepeitscht und verglimmt. War jener schwächer, leuchtet er danach kräftiger weiter.
        // Y = (psi der anderen Schar hier, psi am eigenen Ursprung, |grad psi|, Seed); D = (Richtung der anderen Schar, Zeit)
        // Hugo 24.11. (8:33): alle Übergänge weich gewichtet statt hart abgeschnitten (sonst sichtbare Lichtkanten,
        // wo ein Strahl über dem anderen liegt): kp = wie viel vom Faden bleibt, bo = Verstärkung, dp/pw = für die abgeworfene Spitze
        'void flX(float str, vec4 Y, vec3 D, vec2 c, float et, vec2 fc, vec2 dx, float sn, out float dp, out float kp, out float bo, out float pw) {',
        '  dp = 0.0; kp = 1.0; bo = 0.0; pw = 0.0;',
        '  if (Y.w < -0.5) return;',
        '  float mn = min(uRes.x, uRes.y), lo = min(Y.x, Y.y), hi = max(Y.x, Y.y), k0 = floor(lo) + 1.0;',
        '  float smy = 0.5 * (abs(D.x) * uRes.x + abs(D.y) * uRes.y) / mn, sy = dot(c, D.xy);',
        '  float mg = mn * (0.04 + 0.13 * (1.0 - exp(-et * 1.8)));',
        '  for (int k = 0; k < 8; k++) {',
        '    float iy = k0 + float(k);',
        '    if (iy >= hi) break;',
        '    float hy = flLit(iy, Y.w);',
        '    if (hy < 0.78) continue;',
        '    float hry = h2(vec2(iy + 11.0, Y.w)), sty = smoothstep(0.78, 1.0, hy);',
        '    float sfy = -smy + 2.0 * smy * (0.4 + 0.9 * hry * (0.5 + 0.5 * sty)) * (1.0 - exp(-et * 1.3));',
        '    float dd = abs(Y.x - iy) / max(Y.z, 1e-4);',
        '    vec2 cp = fc - dx * dd / max(sn, 0.3);',
        '    vec2 ins = min(cp, uRes - cp);',
        '    float w = (1.0 - smoothstep(sfy - 0.05, sfy + 0.15, sy)) * smoothstep(mg, mg + mn * 0.06, min(ins.x, ins.y));',
        '    if (w < 0.001) continue;',
        '    if (sty > str + 0.04) {',
        '      kp = min(kp, mix(1.0, 0.5 * (1.0 - smoothstep(0.0, 0.035, dd / mn)), w));',   // danach: rasch weg (ab der Hälfte)
        '      if (w * dd > pw * dp) { dp = dd; pw = w; }',
        '    } else bo = max(bo, w * smoothstep(0.0, mn * 0.04, dd));',
        '  }',
        // Hugo 24.11. (9:23): schon beim Heranlaufen an einen stärkeren Faden geht der schwächere weich in ihn über
        // (auf der Mittellinie genau halb) – sonst wird sein breiter Schein dort hart abgeschnitten (durchsichtig, Kanten)
        '  float sgn = Y.x >= Y.y ? 1.0 : -1.0, ia = sgn > 0.0 ? floor(Y.x) + 1.0 : ceil(Y.x) - 1.0;',
        '  float ha = flLit(ia, Y.w);',
        '  if (ha >= 0.78 && smoothstep(0.78, 1.0, ha) > str + 0.04) {',
        '    float sfa = -smy + 2.0 * smy * (0.4 + 0.9 * h2(vec2(ia + 11.0, Y.w)) * (0.5 + 0.5 * smoothstep(0.78, 1.0, ha))) * (1.0 - exp(-et * 1.3));',
        '    vec2 ins2 = min(fc, uRes - fc);',
        '    float wa = (1.0 - smoothstep(sfa - 0.05, sfa + 0.15, sy)) * smoothstep(mg, mg + mn * 0.06, min(ins2.x, ins2.y));',
        '    float da = abs(ia - Y.x) / max(Y.z, 1e-4);',
        '    kp = min(kp, mix(1.0, 0.5 + 0.5 * smoothstep(0.0, 0.08, da / mn), wa));',
        '  }',
        '}',
        'vec2 flO(vec2 fc, vec2 d) {',
        '  float mn = min(uRes.x, uRes.y); vec2 c = (fc - uRes * 0.5) / mn;',
        '  float s = dot(c, d), smx = 0.5 * (abs(d.x) * uRes.x + abs(d.y) * uRes.y) / mn;',
        '  return fc - d * (s + smx) * mn;',
        '}',
        // Hugo 24.11.: jeder Pixel prüft den eigenen und die beiden Nachbar-Fäden – sonst wird der Lichtsaum an der Grenze
        // zwischen zwei Fäden hart abgeschnitten (sichtbarer Rand neben den Flares)
        'float flFam(vec2 fc, vec2 res, float t, float et, float ee, float sd, float an, vec3 P, float rp, vec4 Y1, vec3 D1, float n1, vec4 Y2, vec3 D2, float n2s, out vec3 tint) {',
        '  tint = vec3(0.0);',
        '  float mn = min(res.x, res.y); vec2 d = vec2(cos(an), sin(an)), c = (fc - res * 0.5) / mn;',
        '  float ps = P.x; vec2 gp = vec2(P.y - ps, P.z - ps) / 1.5;',
        '  float gl = max(length(gp), 1e-4), id0 = floor(ps + 0.5);',
        '  float s = dot(c, d), smx = 0.5 * (abs(d.x) * res.x + abs(d.y) * res.y) / mn;',
        '  float u = clamp((s + smx) / (2.0 * smx), 0.0, 1.0);',                                   // 0 = Ursprung, 1 = Gegenseite
        '  float wfn = 0.04 + 0.13 * (1.0 - exp(-et * 1.8));',   // Lage der Flare-Welle (Abstand vom Rand)
        '  float tl = -smx - 0.3 + (2.0 * smx + 0.3) * smoothstep(2.2, 6.0, et);',   // Ende: Schwanz löst sich vom Ursprung her auf
        '  float base = smoothstep(wfn - 0.05, wfn + 0.03, ee / mn) * smoothstep(tl, tl + 0.35, s)',
        '             * smoothstep(0.0, 0.12, et) * (1.0 - smoothstep(3.6, 6.2, et)) * mix(1.0, 0.28, smoothstep(0.05, 1.0, u));',
        '  float sv = 0.0;',
        '  if (base < 0.002) return 0.0;',
        '  for (int n = -1; n <= 1; n++) {',
        '    float id = id0 + float(n);',
        '    float hs = h2(vec2(id, sd * 1.7)), hr = h2(vec2(id + 11.0, sd));',
        '    if (flLit(id, sd) < 0.78) continue;',
        '    float str = smoothstep(0.78, 1.0, hs);',
        '    float sf = -smx + 2.0 * smx * (0.4 + 0.9 * hr * (0.5 + 0.5 * str)) * (1.0 - exp(-et * 1.3));',   // Spitze: schnell, dann langsamer
        '    float sd2 = abs(ps - id) / gl;',
        '    float swd = mn * (0.011 + 0.009 * str) * (1.2 - 0.3 * u), sw2 = swd * 1.45;',
        // Saum läuft weit genug aus, bevor er weggelassen wird (Hugo 24.11.: sonst sichtbarer Beleuchtungsrand)
        '    float thin = 0.0, fib = 0.0;',
        '    if (sd2 < sw2 * 14.0) {',
        // Hugo 24.11. (9:04): dicker, der weiche Schein wirkt weiter in die Umgebung
        '      thin = exp(-sd2 * sd2 / (swd * swd)) + 0.38 * exp(-sd2 * sd2 / (swd * swd * 14.0));',
        '      fib = 0.42 * exp(-sd2 * sd2 / (sw2 * sw2 * 16.0));',
        '      for (int j = -1; j <= 1; j++) {',
        '        float fj = float(j), of = fj * (0.06 + 0.06 * n2(vec2(s * 3.0 - t * 0.3, id * 2.0 + fj * 5.0)));',
        '        float dj = abs(ps - id - of) / gl;',
        '        fib += (fj == 0.0 ? 0.4 : 0.3) * exp(-dj * dj / (sw2 * sw2 * 0.6));',
        '      }',
        '      fib *= 0.75 + 0.35 * sin(s * 8.0 - t * 2.0 + id * 1.7);',
        '    }',
        '    float flick = 0.8 + 0.2 * n2(vec2(s * 6.0 - t * 1.5, id * 3.0));',
        '    float dp1, kp1, bo1, pw1, dp2, kp2, bo2, pw2;',
        '    flX(str, Y1, D1, c, et, fc, d, n1, dp1, kp1, bo1, pw1); flX(str, Y2, D2, c, et, fc, d, n2s, dp2, kp2, bo2, pw2);',
        '    bool f1 = pw1 * dp1 >= pw2 * dp2;',
        '    float dp = f1 ? dp1 : dp2, pw = f1 ? pw1 : pw2, sn = f1 ? n1 : n2s, keep = min(kp1, kp2), tip = 0.0;',
        '    if (dp > 0.0) {',
        '      float ds = dp / mn / max(sn, 0.3);',                                  // Weg seit dem Zusammenstoss
        // Hugo 24.11. (8:32/8:40): das abgeworfene Stück ist nicht mehr magnetisch (ungezogenes psi) – es rollt sich als
        // Korona-Bogen ein und verglimmt mit weichem Schweif ins Nichts; prallt nirgends mehr an
        '      float L = max(sf - s + ds, 0.01);',                                    // Länge seit dem Zusammenstoss
        '      float sg = hr > 0.5 ? 1.0 : -1.0, cur = sg * (0.06 + 7.0 * ds * ds);',   // Bogen: biegt zur Spitze hin stärker ab
        '      float td = (rp - id - cur) / gl;',
        '      float tail = smoothstep(0.0, 0.7 * L, ds);',                           // Schweif läuft zum Ursprung hin ins Nichts
        '      tip = tail * (1.0 - smoothstep(sf - 0.06, sf + 0.02, s)) * exp(-L / 0.32) * exp(-td * td / (swd * swd * 1.8)) * 0.85 * pw;',
        '    }',
        '    float boo = 1.0 + 0.4 * max(bo1, bo2);',                                 // der Stärkere nimmt den Schwung mit
        '    sv += ((0.6 * thin + 0.6 * fib) * keep * boo * (1.0 - smoothstep(sf - 0.3, sf, s)) + tip) * flick * (0.5 + 0.55 * str);',
        '  }',
        '  sv *= base;',
        '  vec2 o = c - d * (s + smx); o = normalize(o * mn + vec2(0.001));',                  // Ursprung am Rand
        '  vec3 oc = 0.5 + 0.5 * cos(6.2832 * (atan(o.y, o.x) / 6.2832 * 2.0 + t * 0.06 + vec3(0.0, 0.33, 0.67)));',
        '  tint = mix(oc, vec3(1.0, 0.82, 0.55), 0.25) * sv * (1.0 - smoothstep(0.1, 0.95, u));',   // trägt die Ursprungsfarbe mit
        '  return sv;',
        '}',
        'float segF(vec2 fc, vec4 a, vec4 b, float mx, float sp, out vec2 dv, out float d) {',
        '  vec2 ab = b.xy - a.xy; float l2 = dot(ab, ab);',
        '  float t = l2 > 0.01 ? clamp(dot(fc - a.xy, ab) / l2, 0.0, 1.0) : 0.0;',
        '  float z = max(mix(a.z, b.z, t), 0.0); dv = fc - (a.xy + ab * t); d = length(dv);',
        // sp > 0: Fingerwelle (gleichmässig); sp < 0: Andock-Welle – schiesst schnell aus dem Rand und wird rasch langsamer,
        // jede Stelle reicht unterschiedlich weit (Punkt.w), so läuft nie ein Viereck zur Mitte
        '  float tr = sp > 0.0 ? z * mx * 0.15 * sp : min(uRes.x, uRes.y) * (-sp) * mix(a.w, b.w, t) * (1.0 - exp(-z * 2.6));',   // Andocken: Reichweite nach der schmalen Seite, die Seiten treffen sich nie
        '  return d - tr + (1.0 - smoothstep(0.0, 0.12, z)) * mx * 0.035; }',
        'uniform sampler2D uImg; uniform float uHas; uniform vec4 uRect; uniform vec4 uCrop;',   // Bildlage (px, y oben) · Ausschnitt (uv)
        'void main() {',
        '  vec2 fc = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;',   // in CSS-Pixeln, gerechnet in voller Bildschirmschärfe
        '  float mx = max(uRes.x, uRes.y);',
        '  vec2 ed = min(fc, uRes - fc); float eR = mix(18.0, 90.0, uDesk); float e = -eR * log(exp(-ed.x / eR) + exp(-ed.y / eR));',   // Computer: Ecken viel runder (Hugo 24.11.: sonst Viereck-Rahmen)   // weich gerundet: keine Diagonalen in den Ecken
        // Hugo 23.11.: EINE Welle in der Form der Fingerbewegung. Jeder Punkt der Bahn startet zu seiner Zeit;
        // die Wellenfront ist dort, wo die Welle zuerst ankommt (kleinster Abstand minus gelaufene Strecke).
        // Zähflüssiger als Wasser: langsam, ein einziger weicher Berg mit Tal, lange gedämpft.
        // Hugo 23.11.: mehrere Wellen gleichzeitig (schnell hintereinander verschwindet die erste nicht)
        '  vec2 q = fc / mx * 2.6;',   // gröber: breitere, ruhigere Sonnenbewegung
        '  vec2 wq = vec2(n2(q * 0.9 + vec2(uT * 0.11, -uT * 0.07)), n2(q + vec2(-uT * 0.09, uT * 0.13) + 5.2));',
        '  float sv = n2(q * 1.4 + wq * 2.2 + vec2(0.0, uT * 0.05));',
        '  vec2 off = vec2(0.0); float ring = 0.0, ph = 0.0, edge = 0.0, rs = 0.0, halo = 0.0, fa = 0.0, faD = 0.0, org = 0.0, wipe = 0.0; vec3 rbA = vec3(0.0);',
        '  for (int k = 0; k < ' + NW + '; k++) {',
        '    float age = uAge[k]; if (age < 0.0) continue;',
        // schwache Handys: Pixel weit weg von dieser Welle rechnen die Bahn gar nicht erst durch
        '    if (length(fc - uB[k].xy) - uB[k].z - age * mx * 0.15 * abs(uB[k].w) > mx * 0.62) continue;',
        // Hugo 23.11.: keine Striche beim Auslösen — die Bahn ist eine durchgehende Linie (Abschnitte zwischen den Punkten),
        // nicht einzelne Kreise; Alter und Einblendung laufen entlang des Abschnitts weich mit.
        // Weiches Minimum in einem Durchgang (laufend neu gewichtet), damit es auch in voller Schärfe flüssig bleibt.
        '    float w = mx * min(0.019 + 0.02 * age, 0.062) * (uB[k].w < 0.0 ? 1.25 : 1.0) * (uB[k].w > 2.0 ? ' + CONFIG.revealRing.toFixed(2) + ' : 1.0), sw = 1.0 / (w * 0.5);',   // Hugo 24.11. (14:00): Sonnenwelle breiter   // Andocken: breiter   // Andocken: breiter   // Hugo 23.11.: am Finger wieder grösser, beim Auslaufen kompakt (früher 0.016 + 0.028 · Alter, max. 0.085)
        '    float best = 1e9, ws = 0.0, sf = 0.0, sd = 0.0; vec2 dir = vec2(0.0);',
        '    for (int j = 0; j < ' + (PW - 1) + '; j++) {',
        '      vec4 pa = uP[k * ' + PW + ' + j]; if (pa.w <= 0.0) continue;',
        '      vec4 pb = uP[k * ' + PW + ' + j + 1]; if (pb.w <= 0.0) pb = pa;',
        '      vec2 dv; float d; float f = segF(fc, pa, pb, mx, uB[k].w, dv, d);',
        '      vec2 un = d > 0.5 ? dv / d : vec2(0.0);',
        '      if (f < best) { float sc = best > 1e8 ? 0.0 : exp((f - best) * sw); ws = ws * sc + 1.0; sf = sf * sc + f; sd = sd * sc + d; dir = dir * sc + un; best = f; }',
        '      else { float q = exp((best - f) * sw); ws += q; sf += q * f; sd += q * d; dir += q * un; }',
        '    }',
        '    if (ws <= 0.0) continue;',
        '    best = sf / ws; dir /= ws; sd /= ws;',
        '    float x = best / w;',
        // Andock-Welle (uB.w < 0): setzt sofort mit voller Kraft ein und klingt schneller ab (Hugo 23.11.: Snap, Wow)
        '    bool dockW = uB[k].w < 0.0;',
        // Hugo 24.11. (10:13): die Fingerwelle wischt den Andock-Effekt entlang ihres Weges weg (Fingerwellen kommen in der
        // Liste zuerst, die Andock-Welle zuletzt – so ist «wipe» hier schon bekannt)
        '    if (!dockW) wipe = max(wipe, (1.0 - smoothstep(-1.2, 0.3, x)) * smoothstep(0.0, 0.15, age));',
        '    float kD = dockW ? (1.0 - wipe) * uKeep * uDA : 1.0;',
        '    float env = exp(-x * x) * smoothstep(0.0, dockW ? 0.03 : 0.35, age) * kD;',
        '    float amp = exp(-age * (dockW ? 0.6 : 0.45));',   // Andocken: wirkt länger nach
        // Hugo 23.11.: keine Streifen in der Welle — die Verschiebung wächst mit der Wellenbreite, so dass sich das Foto
        // nie überschlägt (vorher wurde es in der Mitte der schmalen Welle über sich selbst gezogen)
        '    off += dir * (-x * env * amp * smoothstep(0.0, w, sd)) * w * 0.7 * (uB[k].w > 2.0 ? ' + CONFIG.revealWarp.toFixed(2) + ' : uB[k].w > 0.0 ? 1.0 : 2.0);',   // Hugo 24.11. (14:08): Sonnenwelle verzieht das Bild stärker   // Andocken: kräftiger
        '    float r = env * amp; ring = 1.0 - (1.0 - ring) * (1.0 - r); rs += r; ph += r * x;',
        '    rbA += r * (0.5 + 0.5 * cos(6.2832 * (sv * 1.6 + x * 0.06 + uHue[k] * 0.15 + vec3(0.0, 0.33, 0.67))));',
        // Hugo 23.11.: am Bildschirmrand stärker; hat die Welle den Rand erreicht, leuchtet er nach und verblasst nach rund 4 s
        '    edge = max(edge, exp(-max(x, 0.0) * max(x, 0.0)) * exp(-max(-x, 0.0) * 0.12) * smoothstep(0.0, 0.35, age) * exp(-age * 0.3) * (1.0 - smoothstep(3.6, 5.6, age)) * exp(-max(e, 0.0) * max(e, 0.0) / 560.0) * (uB[k].w > 0.0 ? 1.0 : 0.35) * kD);',   // Andock-Welle: Rand leuchtet nur leicht mit,
        '    float on = smoothstep(0.0, dockW ? 0.03 : 0.35, age) * (dockW ? exp(-age * 0.4) * (1.0 - smoothstep(3.2, 6.2, age)) : amp) * kD;',   // Hugo 24.11.: blendet weich bis ganz aus, bevor die Welle endet   // Flares gleiten am Rand langsam nach
        '    halo = 1.0 - (1.0 - halo) * (1.0 - exp(-x * x / 9.0) * on);',
        '    vec4 p0 = uP[k * ' + PW + ']; if (p0.w > 0.0) { vec2 d0 = (fc - p0.xy) / (mx * 0.22); org = max(org, exp(-dot(d0, d0)) * on); }',
        '    float fs = uHue[k] * 17.0;',
        '    float xo = max(x, 0.0);',
        '    vec2 dn = dot(dir, dir) > 1e-5 ? normalize(dir) : vec2(1.0, 0.0);',
        // Hugo 24.11.: Andock-Flares mit eigener Richtung – jede Stelle der Front neigt ihre Flares anders (langsam
        // wanderndes Feld); so laufen sie schräg, kreuzen sich und fliessen weiter ineinander, statt alle zur Mitte zu zeigen
        // Hugo 24.11. (14:00): an der schnellen Sonnenwelle (Tempo > 2) Flares ungleichmässig wie beim Andocken – sonst wirkten
        // die gleichmässigen Zacken wie eine Motorsäge
        '    bool irr = dockW || uB[k].w > 2.0, brst = !dockW && uB[k].w > 2.0;',
        // Hugo 24.11. (14:03): die Sonnenwelle dreht sich nicht – ihr Muster hängt nur an der Richtung, die Flares schiessen
        // gerade nach aussen wie bei der Flare-Explosion der Ladeanimation
        '    float tq = brst ? 0.0 : uT;',
        '    float lean = (n2(dn * 1.7 + vec2(fs + 3.0, tq * 0.07)) - 0.5) * 2.6;',
        // Hugo 24.11.: magnetisches Spiel ohne Mittelpunkt – eine Flare biegt weg von der stärkeren Nachbarin (die
        // stärkere drückt die schwächere zur Seite, sie verschmelzen und laufen in neuer Richtung weiter); je weiter
        // ins Bild, desto mehr drehen sie seitlich ab, so sammeln sie sich nie in einem Punkt in der Mitte
        '    vec2 dnL = vec2(dn.x * 0.97 + dn.y * 0.25, -dn.x * 0.25 + dn.y * 0.97), dnR = vec2(dn.x * 0.97 - dn.y * 0.25, dn.x * 0.25 + dn.y * 0.97);',
        '    float push = dockW ? n2(dnR * 1.7 + vec2(fs, uT * 0.3)) - n2(dnL * 1.7 + vec2(fs, uT * 0.3)) : 0.0;',
        '    float ra = brst ? min(xo, 5.0) * 0.3 * lean : irr ? min(xo, 5.0) * (0.42 * lean - 1.1 * push + 0.22 * sin(uT * 0.9 + fs + dn.x * 3.0)) : xo * 0.22 * sin(uT * 0.6 + fs);',
        '    vec2 cs = vec2(dn.x * cos(ra) - dn.y * sin(ra), dn.x * sin(ra) + dn.y * cos(ra)) * 3.4;',   // mehr Flares rundherum (vorher 2.2)
        // Andocken (Hugo 23.11.): weniger Flares, dafür kräftiger und weissgolden
        '    float fl = irr ? pow(n2(cs * 0.6 + vec2(fs, tq * 0.3 + age * (brst ? 0.25 : 0.0))), 5.0) * 1.7 : pow(n2(cs + vec2(fs, uT * 0.3)), 2.8);',   // Hugo 24.11.: schlanke, klare Zungen statt verschwommen
        '    float ln = (0.5 + fl * (4.2 + 2.6 * n2(cs * 1.7 + vec2(tq * 0.8 + age * (brst ? 0.6 : 0.0), fs)))) * (irr ? 1.35 : 1.0) * (brst ? 1.4 : 1.0);',   // Hugo 24.11.: Andocken – weniger, dafür grösser   // Hugo 23.11.: kleinere Flares an der Welle
        '    float fv = 1.05 * (1.0 + 0.8 * exp(-age * 1.2)) * fl * smoothstep(-0.3, 0.5, x) * exp(-xo * xo / ln) * on * smoothstep(dockW ? 0.0 : 0.05, dockW ? 0.06 : 0.25, age) * smoothstep(w * 0.3, w * 1.1, sd)',
        '      * (dockW ? 1.0 - smoothstep(0.1, 0.24, xo * w / min(uRes.x, uRes.y)) : 1.0);',   // Hugo 24.11.: die kleinen Flares bleiben am Rand; die grossen sind die Flare-Fäden (siehe unten)
        '    if (dockW) faD = max(faD, fv); else fa = max(fa, fv);',   // Hugo 23.11.: schon die erste Welle trägt Flares, sie reiten auf der Front (kein Stern am Startpunkt)
        '  }',
        '  ph = rs > 0.0001 ? ph / rs : 0.0;',
        '  vec3 rb = rs > 0.0001 ? rbA / rs : vec3(0.5);',
        '  rb = mix(vec3(dot(rb, vec3(0.333))), rb, 0.85);',   // Hugo 23.11.: wieder etwas kräftiger
        // Andocken nach dem Laden (Hugo 23.11.): sobald das Bild andockt, leuchtet der ganze Rand bunt auf (so lange wie
        // bei der Fingerwelle); aus der Andock-Welle steigen die Flare-Fäden auf (flPsi/flFam, alles hier im Shader).
        '  vec3 eacc = vec3(0.0); float fI = 0.0;',
        '  if (uEdgeT >= 0.0) {',
        '    float et = uEdgeT;',
        '    float fade = 1.0 - smoothstep(3.6, 5.6, et);',   // Hugo 23.11.: kurzer Höhepunkt, dann klärt sich das Bild
        '    float flash = 1.9 * uImp * exp(-et * 3.2) + 0.75 * exp(-et * 0.3);',   // uImp: Computer minimal schwächerer Aufprall (Hugo 24.11.)   // Hugo 24.11.: Aufleuchten etwas höher, Nachleuchten mehr   // Hugo 23.11.: Andocken wieder wichtiger – kräftiger Schlag   // Hugo 23.11.: grosse bunte Welle beim Andocken
        '    float band = exp(-max(e, 0.0) * max(e, 0.0) / 560.0);',
        '    vec2 ca = normalize(fc - uRes * 0.5 + vec2(0.001)); float ang = atan(ca.y, ca.x) / 6.2832;',
        '    vec3 erb = 0.5 + 0.5 * cos(6.2832 * (ang * 2.0 + uT * 0.06 + vec3(0.0, 0.33, 0.67)));',
        '    float egm = smoothstep(0.3, 0.7, n2(ca * 3.0 + vec2(uT * 0.08, 5.0)));',
        '    vec3 ecol = mix(erb, vec3(1.0, 0.8, 0.48), 0.15 + 0.3 * egm);',   // satter bunt
        // Hugo 23.11.: kein gleichmässiger Bilderrahmen – das Bunte am Rand ist mal stärker, mal kaum da, und wandert
        '    float patch = 0.08 + 1.1 * smoothstep(0.42, 0.8, n2(ca * 3.2 + vec2(uT * 0.13, -uT * 0.09) + 7.0));',   // einzelne Stellen statt Rahmen
        '    float bw = mix(0.7 + 0.6 * n2(ca * 4.0 + vec2(-uT * 0.1, 2.0)), 0.35 + 1.4 * n2(ca * 5.0 + vec2(-uT * 0.1, 2.0)), uDesk);',   // Computer: Breite stark wechselnd
        '    band = exp(-max(e, 0.0) * max(e, 0.0) / (950.0 * bw * bw)) + 0.5 * exp(-max(e, 0.0) / (mx * 0.08)) * exp(-et * 1.5);',
        '    eacc = ecol * band * flash * 0.85 * mix(1.0, patch, max(smoothstep(0.15, 0.7, et), 0.8 * uDesk));',   // Computer: von Anfang an ungleich (kein Rahmen)   // Hugo 24.11.: beim Aufprall rundherum kräftig bunt, danach ungleich   // von Anfang an ungleich
        // Flares wie bei der Fingerwelle (Hugo 23.11.): weiche goldene Zungen, rundherum ungleich verteilt, ihre Länge flackert
        // lebendig; sie wachsen beim Andocken aus dem Rand und ziehen sich wieder zurück
        '    float ra = 0.22 * sin(uT * 0.6);',
        '    vec2 cs = vec2(ca.x * cos(ra) - ca.y * sin(ra), ca.x * sin(ra) + ca.y * cos(ra)) * 3.4;',
        '    float efl = pow(n2(cs + vec2(uSeed, uT * 0.3)), 2.8);',
        '    float eln = 0.5 + efl * (4.2 + 2.6 * n2(cs * 1.7 + vec2(uT * 0.8, uSeed)));',
        '    float exo = max(e, 0.0) / (mx * 0.024);',
        '    float egr = smoothstep(0.05, 0.7, et) * (1.0 - smoothstep(4.0, 6.2, et));',
        '    float efa = efl * exp(-exo * exo / eln) * egr;',
        '    float efm = smoothstep(0.35, 0.85, n2(fc / mx * 2.6 + vec2(uT * 0.05, 3.0)));',
        '    eacc += vec3(1.0, 0.86, 0.62) * efa * (0.6 + 0.5 * efm) * 0.35; fI = efa * 0.3;',   // die Flares kommen jetzt v. a. von den Wellen
        '    eacc *= fade;',
        // Flare-Fäden: zwei Scharen aus gegenüberliegenden Seiten, kreuzen weich die Mitte, vermischen sich und verglimmen
        '    {',
        '      float mnS = min(uRes.x, uRes.y), sw = mod(uSeed, 2.0) < 1.0 ? 1.0 : -1.0, ee = max(e, 0.0);',
        '      float a0 = 6.2832 * h2(vec2(uSeed, 4.1));',
        '      vec3 tA, tB; float sA = uSeed, sB = uSeed + 7.3, tB0 = uT * 1.07 + 5.0;',
        '      vec2 dA = vec2(cos(a0), sin(a0)), dB = vec2(cos(a0 + 3.1416 + 0.35 * sw), sin(a0 + 3.1416 + 0.35 * sw));',
        '      vec2 o1 = vec2(1.5, 0.0), o2 = vec2(0.0, 1.5);',
        '      vec3 PA = vec3(flPsi(fc, uRes, uT, dA, sw, sA), flPsi(fc + o1, uRes, uT, dA, sw, sA), flPsi(fc + o2, uRes, uT, dA, sw, sA));',
        '      vec3 PB = vec3(flPsi(fc, uRes, tB0, dB, -sw, sB), flPsi(fc + o1, uRes, tB0, dB, -sw, sB), flPsi(fc + o2, uRes, tB0, dB, -sw, sB));',
        '      float att = 3.0 * smoothstep(0.2, 1.2, et);',   // Anziehung wächst, sobald sie unterwegs sind
        '      vec3 QA = flNoFold(PA, vec3(flPull(PB.x, sB), flPull(PB.y, sB), flPull(PB.z, sB)), att);',
        '      vec3 QB = flNoFold(PB, vec3(flPull(PA.x, sA), flPull(PA.y, sA), flPull(PA.z, sA)), att);',
        '      float vA = 0.0, vB = 0.0;',
        '      vec3 tC; float sC = uSeed + 13.1, tC0 = uT * 0.93 + 9.0, aC = a0 + 1.5708 * sw + 0.3;',
        '      vec2 dC = vec2(cos(aC), sin(aC));',
        '      vec3 PC = vec3(flPsi(fc, uRes, tC0, dC, sw, sC), flPsi(fc + o1, uRes, tC0, dC, sw, sC), flPsi(fc + o2, uRes, tC0, dC, sw, sC));',
        '      float PC0 = PC.x;',
        '      PC = flNoFold(PC, vec3(flPull(PA.x, sA), flPull(PA.y, sA), flPull(PA.z, sA)), att * 0.8);',
        '      float aB = a0 + 3.1416 + 0.35 * sw, nAC = abs(sin(aC - a0)), nBC = abs(sin(aC - aB));',
        '      float gA = length(vec2(QA.y - QA.x, QA.z - QA.x)) / 1.5, gB = length(vec2(QB.y - QB.x, QB.z - QB.x)) / 1.5, gC = length(vec2(PC.y - PC.x, PC.z - PC.x)) / 1.5;',
        '      vec2 oA = flO(fc, dA), oB = flO(fc, dB), oC = flO(fc, dC);',
        '      vec4 off4 = vec4(0.0, 0.0, 1.0, -1.0); vec3 off3 = vec3(1.0, 0.0, 0.0);',
        '      vA = flFam(fc, uRes, uT, et, ee, sA, a0, QA, PA.x, vec4(PC.x, flPsi(oA, uRes, tC0, dC, sw, sC), gC, sC), vec3(dC, 0.0), nAC, off4, off3, 1.0, tA);',
        '      vB = flFam(fc, uRes, tB0, et, ee, sB, aB, QB, PB.x, vec4(PC.x, flPsi(oB, uRes, tC0, dC, sw, sC), gC, sC), vec3(dC, 0.0), nBC, off4, off3, 1.0, tB);',
        '      float vC = 0.75 * flFam(fc, uRes, tC0, et, ee, sC, aC, PC, PC0, vec4(QA.x, flPsi(oC, uRes, uT, dA, sw, sA), gA, sA), vec3(dA, 0.0), nAC,',
        '                                 vec4(QB.x, flPsi(oC, uRes, tB0, dB, -sw, sB), gB, sB), vec3(dB, 0.0), nBC, tC);',
        '      float sv = vA + vB + vC; sv = 1.1 * (1.0 - exp(-sv / 1.1));',   // Hugo 24.11.: beim Verschmelzen heller Strang, keine weisse Fläche   // wo sie sich treffen: weich verschmelzen statt aufaddieren
        '      float wfc = 0.04 + 0.13 * (1.0 - exp(-et * 1.8)), dw = (ee / mnS - wfc) / 0.07;',
        '      float sb = max(1.0 - smoothstep(0.03, 0.3, ee / mnS), 0.85 * exp(-dw * dw));',
        '      faD += sv * (1.0 - 0.7 * sb) * 1.3;',
        '      eacc += mix(ecol, vec3(1.0, 0.82, 0.55), 0.3) * sv * sb * 0.6 + (tA + tB + tC * 0.75) * 0.6 * (1.0 - sb);',
        '    }',
        // Andocken bringt das Bild zum Wabbern (Hugo 23.11.): vom Rand laufen weiche Wellen nach innen, unter den Flares
        // stärker; Verschiebung klein genug, dass sich das Foto nie überschlägt
        '    float kE = (1.0 - wipe) * uKeep * uDA; faD *= kE; eacc *= kE; fI *= kE;',   // weggewischt bzw. nach dem ersten Wischen ganz aus
        '    vec2 wxy = vec2(exp(-ed.x / 18.0) * sign(uRes.x * 0.5 - fc.x), exp(-ed.y / 18.0) * sign(uRes.y * 0.5 - fc.y));',
        '    vec2 nin = wxy / max(length(wxy), 1e-4);',
        '    float wa = (exp(-max(e, 0.0) / (mx * 0.12)) * (0.6 * exp(-et * 1.2) + 0.4 * exp(-et * 0.35)) * 0.4 + min(fI, 1.2) * 0.9) * fade * kE;',
        '    float wph = max(e, 0.0) * 0.07 - et * 3.2 + 2.0 * n2(ca * 4.0 + vec2(et * 0.3, 1.0));',
        '    off += (nin * sin(wph) + vec2(-nin.y, nin.x) * 0.5 * cos(wph * 0.7 + 1.3)) * wa * mx * 0.009 * smoothstep(0.0, 0.25, et);',
        '  }',
        '  vec3 col = vec3(0.0), base = vec3(0.0); float al = 0.0, here = 0.0;',
        '  if (uHas > 0.5) {',
        // Hugo 24.11.: zum Bildschirmrand hin wird die Verschiebung nach aussen weich begrenzt (nie über die Kante) –
        // sonst Spiegelmuster/ausgefranste Kanten am Rand. Nach innen bleibt sie unverändert.
        '    vec2 dE = max(min(fc, uRes - fc), 0.0), sgE = sign(fc - uRes * 0.5 + 0.001);',
        '    vec2 aO = max(off * sgE, 0.0);',   // Anteil nach aussen
        '    vec2 offE = off - sgE * (aO - aO * dE / (dE + aO + 1e-3));',
        // Computer (Hugo 24.11.): beim starken Andocken wurde die oberste Bildzeile nach unten gezogen – dort klingt die
        // Verschiebung nach aussen jetzt sanft über eine breitere Zone aus (höchstens doppelt gedehnt, ganz am Rand gar nicht)
        '    vec2 rmp = smoothstep(vec2(0.0), max(aO * 3.0, vec2(1.0)), dE);',
        '    offE = mix(offE, off - sgE * aO * (1.0 - rmp), uDesk);',
        '    vec2 sp = fc + offE;',
        '    vec2 u = (sp - uRect.xy) / uRect.zw;',
        // Hugo 24.11.: Leinwand = ganzer Bildschirm – was die Welle über den Rand hinaus holt, wird gespiegelt statt
        // ausgeblendet (sonst ausgefranste Kanten mit dem unverzerrten Bild darunter)
        '    u = 1.0 - abs(1.0 - abs(u));',
        '    float inside = 1.0;',
        '    vec2 iu = uCrop.xy + clamp(u, 0.0, 1.0) * uCrop.zw;',
        '    vec2 ca = off * 0.08 / uRect.zw * uCrop.zw;',                                 // nur ein Hauch Farbtrennung (keine Farbkanten)
        '    vec2 iuA = 1.0 - abs(1.0 - abs(iu + ca)), iuB = 1.0 - abs(1.0 - abs(iu - ca));',
        '    vec3 img = vec3(texture2D(uImg, iuA).r, texture2D(uImg, iu).g, texture2D(uImg, iuB).b);',
        '    float u0 = (fc.x - uRect.x) / uRect.z, v0 = (fc.y - uRect.y) / uRect.w;',
        '    vec2 bh = min(vec2(u0, v0), 1.0 - vec2(u0, v0)) * uRect.zw;',
        '    here = step(0.0, min(bh.x, bh.y)) * inside; base = img;',   // Hugo 24.11.: kein Ausblenden am Bildschirmrand mehr (sonst dunkler Rahmen mit dem unverzerrten Foto)
        // deckend, wo sich das Bild verschiebt; weich aus, wo es fast stillsteht (kein halbdurchsichtiges Doppelbild)
        '    al = smoothstep(0.15, 1.0, length(off)) * here; col = img * al;',
        '  }',
        '  float fm = smoothstep(0.35, 0.85, sv);',                                    // breite Sonnenzellen
        '  float glow = clamp(ring * 1.0 + edge * 1.9, 0.0, 1.0);',   // ein weiches Band statt heller Linien an Vorder- und Hinterkante
        '  vec3 fc2 = 0.5 + 0.5 * cos(6.2832 * (sv * 1.6 + vec3(0.0, 0.33, 0.67)));',
        '  fc2 = mix(vec3(dot(fc2, vec3(0.333))), fc2, 0.6);',
        '  float fil = pow(1.0 - abs(2.0 * sv - 1.0), 6.0), cw = pow(1.0 - abs(2.0 * sv - 1.0), 3.0);',
        '  vec3 sun = vec3(1.0, 0.9, 0.72) * (0.55 * fm + 0.45 * fil) + vec3(1.0, 0.8, 0.5) * fil * 0.35;',
        '  float mixr = clamp(0.25 * smoothstep(0.45, 0.8, n2(q * 0.5 + vec2(uT * 0.06, 3.0))) + 0.75 * org, 0.0, 1.0);',
        '  vec3 cr = 0.5 + 0.5 * cos(6.2832 * ((sv - 0.5) * 1.8 + uT * 0.03 + vec3(0.0, 0.33, 0.67)));',
        '  sun = mix(sun, cr * (0.5 * fm + 0.6 * cw), mixr * cw);',
        // Hugo 23.11.: am Rand goldenes Licht wie die Sonnenstrahlen, das sich weich mit dem Regenbogen mischt
        '  float gm = smoothstep(0.25, 0.75, n2(q * 0.7 + vec2(uT * 0.05, -uT * 0.04) + 9.0));',
        '  vec3 rim = mix(rb, vec3(1.0, 0.8, 0.48), 0.2 + 0.4 * gm);',
        '  vec3 gc = mix(rim, vec3(1.0), 0.1) * glow + sun * halo * 0.5 + vec3(1.0, 0.86, 0.62) * fa * (0.6 + 0.5 * fm) + vec3(1.0, 0.9, 0.72) * faD * 0.5;',
        '  gc += (h2(fc * 1.37) - 0.5) / 255.0;',                                       // gegen Farbstufen im Verlauf
        // Hugo 23.11.: kein milchiger Schleier — das Licht fällt AUF das Foto (Dunkles bleibt dunkel, Helles leuchtet farbig),
        // statt halbdurchsichtig darüber zu liegen
        '  if (uHas > 0.5 && here > 0.0) {',
        '    float L = dot(gc, vec3(0.333)), lum = dot(base, vec3(0.3, 0.59, 0.11));',
        // Hugo 23.11.: auf Weiss kein heller Rand mehr (Helles wird nur leicht eingefärbt, nicht aufgehellt);
        // auf Dunklem leuchten Licht und Flares dafür stärker, damit man sie überall sieht
        '    float dk = 1.0 - lum;',
        '    vec3 lit = base * (1.0 + L * 1.3 * dk) + (gc - L) * (0.32 + 0.45 * lum) + gc * 0.24 * dk + vec3(1.0, 0.8, 0.5) * fa * 0.4 * dk;',
        // Andock-Flares sichtbar auch auf Hellem: weissgoldenes Licht, das Helles leicht golden färbt und Dunkles aufhellt
        '    float fdv = clamp(faD, 0.0, 1.2);',
        // Hugo 24.11. (9:01): auf hellen Flächen (Hand, Haut) färbt das Licht mehr und hellt weniger auf – Zeichnung bleibt
        '    lit = mix(lit, lit * vec3(1.0, 0.88, 0.64), fdv * 0.6 * lum) + vec3(1.0, 0.93, 0.8) * fdv * (0.08 + 0.72 * dk * dk + 0.2 * dk);',
        '    float ea = clamp(max(eacc.r, max(eacc.g, eacc.b)), 0.0, 1.0);',
        '    lit = lit * mix(vec3(1.0), eacc / max(ea, 0.001), ea * (0.75 + 0.15 * lum)) + eacc * (0.1 + 0.73 * dk);',   // färbt mehr, hellt weniger auf (nicht weiss)      // Andock-Licht: färbt auch Weiss golden
        // Hugo 24.11.: kein weisser Blitz – der Aufprall zeigt sich im kräftigen bunten Aufleuchten am Rand
        '    float cov = clamp(max(max(al, L * 6.0), ea * 6.0), 0.0, 1.0) * here;',
        '    col = lit * cov; al = cov;',
        '  } else {',
        '    col = col + gc * (1.0 - al * 0.4) + eacc;',
        '    al = max(al, max(max(gc.r, max(gc.g, gc.b)) * 0.55, max(eacc.r, max(eacc.g, eacc.b))));',
        '  }',
        // Computer, Sonne nach 1 s Ruhe (Hugo 24.11.): ohne Foto bleibt nur das Licht der Welle (Regenbogen, Flares)
        '  if (uFade < 0.999) {',
        '    vec3 cR = gc + eacc; float aR = max(max(gc.r, max(gc.g, gc.b)) * 0.55, max(eacc.r, max(eacc.g, eacc.b)));',
        '    col = mix(cR, col, uFade); al = mix(aR, al, uFade);',
        '  }',
        '  gl_FragColor = vec4(col, al);',
        '}'].join('\n');
      var VS = 'attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }';
      function sh(t, src) { var x = c.createShader(t); c.shaderSource(x, src); c.compileShader(x); return c.getShaderParameter(x, c.COMPILE_STATUS) ? x : null; }
      var vs = sh(c.VERTEX_SHADER, VS), fs = sh(c.FRAGMENT_SHADER, FS);
      if (!vs || !fs) return null;
      var p = c.createProgram(); c.attachShader(p, vs); c.attachShader(p, fs); c.linkProgram(p);
      if (!c.getProgramParameter(p, c.LINK_STATUS)) return null;
      c.useProgram(p);
      var b = c.createBuffer(); c.bindBuffer(c.ARRAY_BUFFER, b); c.bufferData(c.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), c.STATIC_DRAW);
      var al = c.getAttribLocation(p, 'aPos'); c.enableVertexAttribArray(al); c.vertexAttribPointer(al, 2, c.FLOAT, false, 0, 0);
      var U = {}; ['uDA', 'uFade', 'uRes', 'uDpr', 'uP', 'uAge', 'uHue', 'uB', 'uT', 'uEdgeT', 'uSeed', 'uKeep', 'uImp', 'uDesk', 'uImg', 'uHas', 'uRect', 'uCrop'].forEach(function (k) { U[k] = c.getUniformLocation(p, k); });
      c.enable(c.BLEND); c.blendFunc(c.ONE, c.ONE_MINUS_SRC_ALPHA);
      var tex = c.createTexture(); c.bindTexture(c.TEXTURE_2D, tex);
      c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MIN_FILTER, c.LINEAR); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MAG_FILTER, c.LINEAR);
      c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_S, c.CLAMP_TO_EDGE); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_T, c.CLAMP_TO_EDGE);
      c.uniform1i(U.uImg, 0);
      // Bild der aktuellen Seite als Textur (eigene Kopie mit CORS; klappt das nicht, gibt es nur den Regenbogen)
      var cache = {}, texSrc = '', texOk = false;
      function texFor(img) {
        var src = img && (img.currentSrc || img.src);
        if (!src) { texOk = false; return; }
        if (src === texSrc) return;
        var e = cache[src];
        if (!e) {
          e = cache[src] = { im: new Image(), ok: false };
          e.im.crossOrigin = 'anonymous';
          e.im.onload = function () { e.ok = true; };
          e.im.src = src;
        }
        if (!e.ok) { texOk = false; return; }
        try { c.bindTexture(c.TEXTURE_2D, tex); c.texImage2D(c.TEXTURE_2D, 0, c.RGB, c.RGB, c.UNSIGNED_BYTE, e.im); texSrc = src; texOk = true; }
        catch (er) { texOk = false; texSrc = src; }
      }
      // das Bild, das unter dem Finger wirklich zu sehen ist (nicht einfach das nächstgelegene)
      function imgAt(x, y) {
        var els = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [];
        for (var k = 0; k < els.length; k++) {
          var sl = els[k].closest && els[k].closest('.hp-slide');
          if (sl) for (var j = 0; j < slides.length; j++) if (slides[j].el === sl) return slides[j].img;
        }
        return null;
      }
      // Computer: Leinwand über der ganzen Bühne (über den Bildern, unter Titeln und Textspalte)
      function sm01(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
      function deskCanvas() {
        if (cv.parentNode !== stage) stage.appendChild(cv);
        cv.style.zIndex = '4';
      }
      var comp = document.createElement('canvas'), cctx = comp.getContext('2d'), compSig = '', compOk = false;
      function srcOf(img) { return img && (img.currentSrc || img.src); }
      function loadAll() {
        slides.forEach(function (sl) {
          var src = srcOf(sl.img); if (!src || cache[src]) return;
          var e = cache[src] = { im: new Image(), ok: false };
          e.im.crossOrigin = 'anonymous'; e.im.onload = function () { e.ok = true; compSig = ''; }; e.im.src = src;
        });
      }
      // alle sichtbaren Spalten (object-fit: cover, wie im Browser) in ein Bild zeichnen und als Textur hochladen;
      // neu nur, wenn sich etwas bewegt hat (Aufprall, Hover am Rand)
      function compTex(sr) {
        if (!cctx) return false;
        loadAll();
        var sc = desk ? 1 : Math.min(1.5, window.devicePixelRatio || 1), cw2 = Math.round(sr.width * sc), ch2 = Math.round(sr.height * sc);
        var parts = [], sig = cw2 + 'x' + ch2;
        slides.forEach(function (sl) {
          if (!desk && !sl.vis) return;
          var e = cache[srcOf(sl.img)]; if (!e || !e.ok) { sig += '|-'; return; }
          var ir = sl.img.getBoundingClientRect(), er = sl.el.getBoundingClientRect(), z = parseFloat(sl.el.style.zIndex) || 0;
          var sdr = desk && sl.side && sl.side.offsetWidth > 0 ? sl.side.getBoundingClientRect() : null;   // Textspalte (Computer): weiss
          parts.push({ e: e, im: sl.img, ir: ir, er: er, z: z, i: parts.length, sd: sdr });
          sig += '|' + [ir.left, ir.top, ir.width, ir.height, er.left, er.top, er.width, er.height].map(function (v) { return Math.round(v); }).join(',') + ',' + z + (sdr ? ',' + Math.round(sdr.left) + ',' + Math.round(sdr.width) : '');
        });
        // Hugo 24.11.: in der Reihenfolge wie auf dem Bildschirm übereinanderlegen (hintere Karten zuerst) – sonst lag beim
        // Andocken die Nachbarkarte, die hinter dem Bild ein paar Pixel übersteht, im Effekt obenauf (Linie oben/unten)
        parts.sort(function (a, b) { return a.z - b.z || a.i - b.i; });
        if (sig === compSig) return compOk;
        compSig = sig;
        if (comp.width !== cw2 || comp.height !== ch2) { comp.width = cw2; comp.height = ch2; }
        cctx.fillStyle = '#000'; cctx.fillRect(0, 0, cw2, ch2);
        parts.forEach(function (p) {
          var iw = p.e.im.naturalWidth || 1, ih = p.e.im.naturalHeight || 1, ra = p.ir.width / Math.max(1, p.ir.height), ia = iw / ih;
          var sw = iw, sh = ih; if (ia > ra) sw = ih * ra; else sh = iw / ra;
          var op = objPos(p.im), sx = (iw - sw) * op[0], sy = (ih - sh) * op[1];
          cctx.save();
          // Hugo 24.11.: Ausschnitt auf ganze Pixel runden und an den Bühnenrändern bis zur Kante ziehen – sonst bleibt am
          // unteren Rand eine halbe schwarze Zeile, die der Effekt als dunkle farbige Linie zeigt
          var cx0 = (p.er.left - sr.left) * sc, cy0 = (p.er.top - sr.top) * sc, cx1 = cx0 + p.er.width * sc, cy1 = cy0 + p.er.height * sc;
          cx0 = cx0 < 2 ? 0 : Math.floor(cx0); cy0 = cy0 < 2 ? 0 : Math.floor(cy0);
          cx1 = cx1 > cw2 - 2 ? cw2 : Math.ceil(cx1); cy1 = cy1 > ch2 - 2 ? ch2 : Math.ceil(cy1);
          cctx.beginPath(); cctx.rect(cx0, cy0, cx1 - cx0, cy1 - cy0); cctx.clip();
          cctx.drawImage(p.e.im, sx, sy, sw, sh, (p.ir.left - sr.left) * sc, (p.ir.top - sr.top) * sc, p.ir.width * sc, p.ir.height * sc);
          // Hugo 24.11. (13:11): die Textspalte ist durchsichtig über der weissen Wand – für die Welle ist sie darum weiss
          // (sonst zieht die Welle Schwarz in die Spalte)
          if (p.sd) { cctx.fillStyle = '#fff'; cctx.fillRect((p.sd.left - sr.left) * sc, (p.sd.top - sr.top) * sc, p.sd.width * sc, p.sd.height * sc); }
          cctx.restore();
        });
        try { c.bindTexture(c.TEXTURE_2D, tex); c.texImage2D(c.TEXTURE_2D, 0, c.RGB, c.RGB, c.UNSIGNED_BYTE, comp); compOk = parts.length > 0; texSrc = ''; }
        catch (er) { compOk = false; }
        return compOk;
      }
      function objPos(im) {
        var op = (getComputedStyle(im).objectPosition || '50% 50%').split(' ');
        function pc(v) { return /%$/.test(v) ? parseFloat(v) / 100 : 0.5; }
        return [pc(op[0]), pc(op[1] || op[0])];
      }
      var waves = [], buf = new Float32Array(NP * 4), ages = new Float32Array(NW), hues = new Float32Array(NW), bnd = new Float32Array(NW * 4), raf = 0, regAt = -1, LIFE = 6.5, edgeT0 = 0, edgeSeed = 0, killT0 = 0, lockS = null, gImg = null, slowEma = 16, lastT = 0, slowN = 0;
      // Schärfe nach Gerät: schwache Handys (wenig Kerne/Speicher) starten gröber; jedes Gerät regelt bei Ruckeln selbst nach
      var weak = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 3);
      var dprCap = weak ? 1 : (desk ? 1 : 2);   // Hugo 24.11.: Computer rechnet die ganze Bildschirmfläche – startet mit 1 (sonst ruckelt der Aufprall)
      function add(x, y) {
        var wv = waves[waves.length - 1]; if (!wv) return;
        // Hugo 23.11.: die Welle folgt dem Finger ohne Verzögerung — der letzte Punkt ("Spitze") sitzt immer genau unter
        // dem Finger und wird erst festgelegt, wenn der Finger ein Stück weiter ist; ist die Bahn voll, wird sie
        // ausgedünnt statt angehalten, so geht auch ein langer Zug bis zum Schluss mit
        // Hugo 24.11.: Punkte relativ zur Leinwand (zum Bild) – beim Wischen fährt die Welle mit ihrem Bild mit
        var cr = refRect(); x -= cr.left; y -= cr.top;
        var now = performance.now(), pts = wv.pts, last = pts[pts.length - 1];
        if (!last) { pts.push({ x: x, y: y, t: now }); wv.sp = 14; }
        else {
          var fixed = last.tip ? pts[pts.length - 2] : last;
          if (last.tip && Math.hypot(fixed.x - x, fixed.y - y) < wv.sp) { last.x = x; last.y = y; last.t = now; }
          else {
            if (last.tip) last.tip = false;
            if (pts.length >= PW) {
              var keep = [pts[0]];
              for (var m = 1; m < pts.length - 1; m++) if (m % 2 === 0) keep.push(pts[m]);
              keep.push(pts[pts.length - 1]); wv.pts = pts = keep; wv.sp *= 2;
            }
            pts.push({ x: x, y: y, t: now, tip: true });
          }
        }
        if (!raf) req();
      }
      function draw(now) {
        raf = 0; tickNow = now;
        waves = waves.filter(function (wv) { return now - wv.t0 < LIFE * 1000; });
        // Hugo 24.11.: der Effekt steht fest auf dem Bildschirm, die Bilder wischen darunter durch. Gerechnet wird über die
        // ganze Bühne mit allen sichtbaren Bildern als Textur; Computer: Leinwand liegt über der Bühne. Handy: die
        // Leinwand ist unsichtbar, jedes sichtbare Bild zeigt seinen Ausschnitt davon (unter seinem Titel)
        if (desk) deskCanvas(); else if (cv.parentNode) cv.parentNode.removeChild(cv);
        var sr = refRect();
        var w = Math.max(1, Math.round(sr.width)), h = Math.max(1, Math.round(sr.height));
        // volle Bildschirmschärfe (Hugo 23.11.: vorher halbe Auflösung → das verschobene Foto wirkte unscharf und durchsichtig)
        // passt sich an: wird ein Gerät zu langsam, rechnet die Welle etwas gröber (flüssig geht vor)
        if (lastT && now - lastT < 200) {
          slowEma = slowEma * 0.85 + (now - lastT) * 0.15;
          if (slowEma > 21 && dprCap > 0.6) { dprCap = Math.max(0.6, dprCap - (dprCap > 1 ? 0.5 : 0.2)); slowEma = 16; slowN++; }
        }
        lastT = now;
        var dpr = Math.min(window.devicePixelRatio || 1, dprCap), pw = Math.round(w * dpr), ph = Math.round(h * dpr);
        if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; c.viewport(0, 0, pw, ph); }
        var ord = waves.filter(function (q) { return !(q.sp2 < 0); }).concat(waves.filter(function (q) { return q.sp2 < 0; }));
        for (var k = 0; k < NW; k++) {
          var wv = ord[k];
          ages[k] = wv ? (now - wv.t0) / 1000 : -1;
          // Farbe je nach Auslösung (Hugo 23.11.): Tippen → Ort, Ziehen → Richtung und Länge der Bahn
          if (wv && wv.pts.length) {
            var a0 = wv.pts[0], a1 = wv.pts[wv.pts.length - 1], dl = Math.hypot(a1.x - a0.x, a1.y - a0.y);
            hues[k] = dl < 20 ? (a0.x / Math.max(1, sr.width) * 0.6 + a0.y / Math.max(1, sr.height) * 0.4)
                              : (Math.atan2(a1.y - a0.y, a1.x - a0.x) / 6.2832 + dl / Math.max(1, sr.height) * 0.5);
          }
          // Umkreis der Fingerbahn (für das Überspringen ferner Pixel)
          var cx = 0, cy = 0, rr = 0, np = wv ? wv.pts.length : 0;
          for (var j0 = 0; j0 < np; j0++) { cx += wv.pts[j0].x; cy += wv.pts[j0].y; }
          if (np) { cx /= np; cy /= np; for (j0 = 0; j0 < np; j0++) rr = Math.max(rr, Math.hypot(wv.pts[j0].x - cx, wv.pts[j0].y - cy)); }
          bnd[k * 4] = cx; bnd[k * 4 + 1] = cy; bnd[k * 4 + 2] = rr; bnd[k * 4 + 3] = (wv && wv.sp2) || 1;   // < 0: Andock-Welle (Reichweite)   // Tempo der Welle (Andocken: schneller)
          for (var j = 0; j < PW; j++) {
            var i = k * PW + j, q = wv && wv.pts[j];
            if (q) { buf[i * 4] = q.x; buf[i * 4 + 1] = q.y; buf[i * 4 + 2] = (now - q.t) / 1000; buf[i * 4 + 3] = q.m || 1; }
            else buf[i * 4 + 3] = 0;
          }
        }
        // Textur = alle sichtbaren Bilder zusammen, wie sie gerade auf dem Bildschirm stehen
        if (compTex(sr)) {
          c.uniform4f(U.uRect, 0, 0, w, h); c.uniform4f(U.uCrop, 0, 0, 1, 1); c.uniform1f(U.uHas, 1);
        } else c.uniform1f(U.uHas, 0);
        c.uniform2f(U.uRes, w, h); c.uniform1f(U.uDpr, pw / w); c.uniform4fv(U.uP, buf); c.uniform1fv(U.uAge, ages); c.uniform1fv(U.uHue, hues); c.uniform4fv(U.uB, bnd); c.uniform1f(U.uT, (now / 1000) % 1000);
        var et = edgeT0 ? (now - edgeT0) / 1000 : -1; if (et > 7.2) { edgeT0 = 0; et = -1; } c.uniform1f(U.uEdgeT, et); c.uniform1f(U.uSeed, edgeSeed);
        // nach dem ersten Wischen klingt der ganze Andock-Effekt in 1.5–3 s aus (auch was nicht überstrichen wurde)
        c.uniform1f(U.uImp, desk ? 0.8 : 1); c.uniform1f(U.uDesk, desk ? 1 : 0); c.uniform1f(U.uFade, 1); c.uniform1f(U.uDA, dockAmt);
        c.uniform1f(U.uKeep, killT0 ? 1 - sm01(1.5, 3.0, (now - killT0) / 1000) : 1); if (!edgeT0) killT0 = 0;
        c.clearColor(0, 0, 0, 0); c.clear(c.COLOR_BUFFER_BIT);
        var on = waves.length || edgeT0;
        if (on) c.drawArrays(c.TRIANGLE_STRIP, 0, 4);
        if (!desk) showFx(sr, pw, ph, on);
        if (on) req();
        tickNow = -1;
      }
      // Handy: jedes sichtbare Bild zeigt seinen Ausschnitt der Bildschirm-Leinwand (gegen seine Verschiebung gehalten,
      // wie der Titel) – so steht der Effekt still, auch während man wischt
      function showFx(sr, pw, ph, on) {
        slides.forEach(function (sl) {
          var vis = on && sl.vis;
          if (!sl.fx) {
            if (!vis) return;
            var f = document.createElement('canvas'); f.className = 'hp-fx'; f.setAttribute('aria-hidden', 'true');
            f.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;';
            if (sl.media && sl.media.nextSibling) sl.el.insertBefore(f, sl.media.nextSibling); else sl.el.appendChild(f);
            sl.fx = f; sl.fxc = f.getContext('2d');
          }
          var f2 = sl.fx;
          if (!vis) { if (f2.style.display !== 'none') { f2.style.display = 'none'; } return; }
          f2.style.display = '';
          var er = sl.el.getBoundingClientRect();
          f2.style.width = sr.width + 'px'; f2.style.height = sr.height + 'px';
          f2.style.transform = 'translate3d(' + (sr.left - er.left).toFixed(2) + 'px,' + (sr.top - er.top).toFixed(2) + 'px,0)';
          if (f2.width !== pw || f2.height !== ph) { f2.width = pw; f2.height = ph; }
          sl.fxc.clearRect(0, 0, pw, ph);
          sl.fxc.drawImage(cv, 0, 0);
        });
      }
      function refRect() { return desk ? cv.getBoundingClientRect() : stage.getBoundingClientRect(); }
      function ok() { return !desk && !root.classList.contains('is-info'); }
      function dropOld() { for (var q = 0; q < waves.length; q++) if (!(waves[q].sp2 < 0)) { waves.splice(q, 1); return; } waves.shift(); }
      // Computer (Hugo 24.11.): die Maus zieht immer eine Welle wie der Finger am Handy und wischt den Andock-Effekt weg
      var mWave = 0;
      var lmx = -1, lmy = -1;
      stage.addEventListener('mousemove', function (e) {
        // nur echte Mausbewegung (der Browser meldet auch «Bewegung», wenn sich unter der ruhenden Maus etwas verschiebt)
        if (lmx < 0) { lmx = e.clientX; lmy = e.clientY; return; }
        if (Math.hypot(e.clientX - lmx, e.clientY - lmy) < 3) return;
        lmx = e.clientX; lmy = e.clientY;
        // Hugo 24.11.: die Maus zieht am Computer immer eine Welle wie der Finger am Handy (Text liegt darüber, bleibt ruhig)
        if (!desk || busy() || root.classList.contains('is-info') || dsunOn) return;   // bei der Sonne keine neuen Wellen (die laufende läuft zu Ende)
        var now = performance.now(), wv = waves[waves.length - 1];
        if (!mWave || !wv || wv.sp2 < 0 || now - mWave > 350) { waves.push({ t0: now, pts: [] }); if (waves.length > NW) dropOld(); if (edgeT0 && !killT0) killT0 = now; }
        mWave = now; add(e.clientX, e.clientY);
      });
      // Andocken nach dem Laden (Hugo 23.11.): Licht mit grossen Flares läuft den Rand entlang (keine Welle aus der Mitte)
      var dockAmt = 1;
      function dock(amt) {
        dockAmt = amt == null ? 1 : amt; killT0 = 0;
        var cs = slides[current()]; if (!cs) return;
        if (desk) deskCanvas();
        compSig = '';
        edgeT0 = performance.now(); edgeSeed = Math.floor(Math.random() * 97);
        // Hugo 23.11. (wie die Fingerwelle im Video): das Andocken löst echte Wellen aus, die rundherum am Rand beginnen
        // und nach innen durchs Bild laufen – mit Prisma-Regenbogen, Verzerrung und Solar Flares, die darauf surfen.
        // Eine Welle; die Bahn läuft einmal um den Rand, unregelmässig (organisch).
        var r = stage.getBoundingClientRect();
        function ring(delay, inset, reach) {
          var now = performance.now() + delay, N = PW - 1, pts = [];
          // Hugo 23.11.: keine viereckige Form – die Bahn ist eine weich gerundete, unregelmässige Form (Superellipse
          // mit Rauschen), die sich nur an den Seiten an den Rand schmiegt und die Ecken weit abrundet
          var off = Math.random() * 6.2832, w2 = r.width, h2 = r.height, ph1 = Math.random() * 6.28, ph2 = Math.random() * 6.28;
          for (var i = 0; i < N; i++) {
            var th = off + 6.2832 * i / N, c = Math.cos(th), sn = Math.sin(th), n = 2.6;
            var ex = Math.sign(c) * Math.pow(Math.abs(c), 2 / n), ey = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
            var k = 1 - 0.03 * (1 + Math.sin(th * 3 + ph1)) - 0.02 * (1 + Math.sin(th * 5 + ph2)) - Math.pow(Math.random(), 2) * 0.03;
            var x = w2 / 2 + ex * (w2 / 2 + inset) * k, y = h2 / 2 + ey * (h2 / 2 + inset) * k;
            pts.push({ x: x, y: y, t: now - Math.random() * 220, m: 0.15 + 1.1 * Math.pow(Math.random(), 1.6) });   // nicht so tief, dass sich die Seiten in der Mitte treffen
          }
          pts.push({ x: pts[0].x, y: pts[0].y, t: pts[0].t, m: pts[0].m });   // Bahn schliessen
          waves.push({ t0: now, pts: pts, sp2: -reach }); if (waves.length > NW) waves.shift();
        }
        ring(0, 6, 0.2);   // Hugo 23.11.: nur eine Explosion nach innen
        if (!raf) req();
      }
      // Hugo 24.11.: Reihenfolge im Takt – der Effekt läuft immer nach step() (siehe kick). Hat er sich in diesem Takt
      // schon angemeldet (vor der Bühne) oder ausserhalb eines Takts (Fingerbewegung), meldet er sich hinter ihr neu an;
      // eine Anmeldung aus einem früheren Takt läuft ohnehin nach step()
      function req() { raf = requestAnimationFrame(draw); regAt = tickNow; }
      cv.order = function () {
        if (!raf || (tickNow >= 0 && regAt !== tickNow)) return;
        cancelAnimationFrame(raf); req();
      };
      cv.dock = dock;
      // Hugo 24.11. (13:37): Welle, die die Sonne aufdeckt – ein Punkt, läuft als Ring schnell nach aussen
      cv.burst = function (x, y, sp) {
        var now = performance.now();
        waves.push({ t0: now, pts: [], sp2: sp }); if (waves.length > NW) dropOld();
        if (edgeT0 && !killT0) killT0 = now;
        add(x, y); var wv = waves[waves.length - 1]; if (wv && wv.pts[0]) wv.pts[0].t = now;
        if (!raf) req();
      };
      try { loadAll(); } catch (e) {}   // Hugo 24.11.: Bilder für den Effekt schon beim Laden holen (nicht erst beim Aufprall – sonst Ruckler)
      // eine Berührung = eine Welle (neue Berührung beginnt eine neue)
      stage.addEventListener('touchstart', function (e) {
        if (!ok() || !e.touches[0] || e.touches.length > 1) return;
        var t = e.touches[0];
        waves.push({ t0: performance.now(), pts: [] }); if (waves.length > NW) dropOld();
        if (edgeT0 && !killT0) killT0 = performance.now();
        add(t.clientX, t.clientY);
      }, { passive: true });
      stage.addEventListener('touchmove', function (e) { if (ok() && e.touches[0] && waves.length) add(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
      return cv;
    })();

    // ---------- Zeichnen ----------
    function render(dt) {
      W = stage.clientWidth || window.innerWidth;
      H = stage.clientHeight || window.innerHeight;
      if (introOn) renderIntro();
      else if (desk) renderDesk();
      else { renderMob(dt || 0); applyInfo(); }
    }

    // Einflug: kleine Vorschau (Säule bzw. Reihe) → Vollbild
    function renderIntro() {
      var P = introP, minE = 1, LC = LD && CONFIG.ldCards;   // LC: weisse Karten mit Magnet (Handy)
      for (var j = 0; j < n; j++) {
        var s = slides[j], ax, ay, aw, ah, bx, by, bw, bh, k, E;
        if (desk) {
          aw = W * 0.055; ah = H * 0.2;
          var g = W * 0.008;
          k = j;
          ax = W / 2 + (j - (n - 1) / 2) * (aw + g) - aw / 2;
          bx = j * W / n; by = 0; bw = W / n; bh = H;
          var xD = clamp((P - 0.25 - 0.02 * j) / 0.69, 0, 1);
          if (LD) {
            // Hugo 24.11.: am Computer gleich snappig wie am Handy – dieselbe Kurve und dasselbe Tempo; die Bilder bremsen
            // weiter weg ab (84 % wie am Handy) und warten aufeinander, dann zieht der Magnet alle gemeinsam an
            var xM = clamp((P - 0.25 - 0.02 * j) / 0.61, 0, 1), xL = clamp((P - 0.25 - 0.02 * (n - 1)) / 0.61, 0, 1);
            E = 0.79 * easeDockF(Math.min(1, xM / 0.98), easeDockM, 1.4) + 0.21 * Math.pow(clamp((xL - 0.64) / 0.25, 0, 1), 5.4);   // Hugo 24.11.: weiter weg (79 %), Zug nimmt schneller Schwung auf   // Hugo 24.11.: mehr Schwung beim Zug (Potenz 6.2, etwas kürzer)   // Hugo 24.11.: Übergang Abbremsen → Magnet minimal länger; Magnet setzt weicher ein (Potenz 5 statt 6.5)   // Hugo 24.11.: Magnet am Computer stärker (bremst bei 78 % statt 84 %)
          } else E = easeDock(xD);
          minE = Math.min(minE, E);
        } else {
          var r = rel(j);
          aw = W * (LC ? CONFIG.ldStripW : CONFIG.stripW); ah = H * (LC ? CONFIG.ldStripH : CONFIG.stripH);
          k = r + Math.floor(n / 2);
          ax = (W - aw) / 2;
          bx = 0; by = r * H; bw = W; bh = H;
          // Ladeanimation (Hugo 23.11.): versetzt – die mittlere Karte führt, die äusseren hängen unterwegs etwas nach
          // und holen bis zum Einrasten wieder auf
          var x0i = LC ? 0.21 : 0.25;   // Hugo 24.11.: wartet etwas auf das Erscheinen der anderen Karten (vorher 0.17, dann 0.24)   // Ladeanimation: die kleine Säule steht kürzer (mehr Spannung)
          var xin = clamp((P - x0i) / (LC ? 0.61 : 1 - x0i), 0, 1), xj = LC ? clamp(xin - 0.085 * Math.abs(r) * Math.sin(Math.PI * xin), 0, 1) : xin;
          E = LC ? easeMagnet(xj) : easeDock(xin);
          ay = H / 2 + r * (ah + (LC ? 0 : 4));   // Ladeanimation: Abstand siehe gapY
        }
        var ap = easeOut(clamp((P - 0.035 * k) / 0.2, 0, 1));   // Hugo 24.11.: Karten erscheinen am Handy so weich wie am Computer
        var hA = ah * ap;
        var cy = desk ? H / 2 : ay;
        ay = cy - hA / 2;
        // Ladeanimation: der Abstand zwischen den Karten wächst mit ihnen mit und schliesst sich erst beim Einrasten
        var gapY = 0;
        if (LC && !desk) gapY = rel(j) * 2.5 * (lerp(hA, bh, E) / ah) * (1 - magnetPull(xj));
        rect(s, lerp(ax, bx, E), lerp(ay, by, E) + gapY, lerp(aw, bw, E), lerp(hA, bh, E));
        s.el.style.transform = 'none';
        s.el.style.zIndex = desk ? (n - j + 1) : (rel(j) === 0 ? 3 : Math.abs(rel(j)) === 1 ? 2 : 1);   // äussere Karten liegen hinter inneren (Handy und Computer)
        // gleiche Bildgrösse wie danach beim Wischen, damit am Ende nichts springt
        if (s.media) { s.media.style.transformOrigin = '50% 50%'; s.media.style.transform = desk ? 'none' : 'scale(' + CONFIG.imgBase + ')'; s.media.style.width = ''; }
        setVis(s, ap > 0);
        // Ladeanimation (Hugo 23.11.): weisse Vierecke mit leuchtendem Rand, wie Türen, durch die Licht fällt;
        // beim Aufgehen kommt das Bild zum Vorschein
        // erst wenn das Bild sichtbar angedockt ist (Rand am Bildschirmrand), leuchtet der Rand auf
        if (LD && !desk && rel(j) === 0 && E > 0.978) { LD.dock(); introHit = true; }   // einen Hauch vor dem Kontakt: Knall und Aufprall gleichzeitig
        // Hugo 24.11.: Lichtschein am Rand, während die Karten aufgehen, auch am Computer (dort ohne weisse Karten)
        if (LD && desk) {
          // Hugo 24.11. (10:10): halb so stark, bleibt bis kurz vor dem Ziel sichtbar und wird dabei kleiner; verschwindet erst beim Andocken
          var visD = 1 - smoothstep(0.0, 0.94, E), sizeD = 4 + 13 * (1 - E);   // Hugo 24.11. (10:12): am Anfang sichtbar, bis zum Magnet erloschen
          s.el.style.boxShadow = visD > 0.01 ? '0 0 ' + sizeD.toFixed(1) + 'px 0 rgba(255,250,238,' + (0.25 * visD).toFixed(3) + ')' : '';
        }
        if (s.gold) {
          var gv = desk ? 1 - smoothstep(0.035 + 0.015 * k, 0.07 + 0.015 * k, P) : 1 - smoothstep(0.035 + 0.015 * k, 0.07 + 0.015 * k, P), rim = 1 - smoothstep(0.6, 1, E);   // Hugo 24.11.: Weiss nur kurz – die Bilder sind schon da, bevor die Karten herangezogen werden
          s.gold.style.opacity = gv.toFixed(3);
          // Hugo 23.11.: kein Blenden an den Ecken – das Leuchten ohne Ausdehnung (spread) und schwächer, so addieren
          // sich die Lichthöfe benachbarter Karten in den Ecken nicht zu hellen Punkten
          s.el.style.boxShadow = rim > 0.01 ? '0 0 ' + (5 + 12 * rim).toFixed(1) + 'px 0 rgba(255,250,238,' + (0.5 * rim).toFixed(3) + ')' : '';
        }
      }
      if (LD && desk && minE > 0.978) { LD.dock(); introHit = true; }   // Computer: Knall, sobald auch die äussersten Karten einrasten
    }

    // Handy: durchgehender Streifen, Bild zoomt nach Tempo (wie Mario). Ohne Bewegungsunschärfe (Hugo 23.11.)
    function renderMob(dt) {
      var p = clamp(CONFIG.zoom * (F - C), -CONFIG.zoomMax, CONFIG.zoomMax);
      var z = CONFIG.imgBase / (1 - 0.5 * p);
      for (var j = 0; j < n; j++) {
        var s = slides[j], r = rel(j);
        if (r <= -1 || r >= 1) { setVis(s, false); continue; }
        var y = r * H;
        setVis(s, true);
        s.el.style.zIndex = r > 0 ? 3 : 2;
        s.el.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)';
        s.el.style.clipPath = '';
        if (s.media && !s.dive) { s.media.style.transformOrigin = '50% 50%'; s.media.style.transform = 'scale(' + z.toFixed(4) + ')'; }
        if (s.title) s.title.style.transform = 'translate3d(0,' + (-y).toFixed(2) + 'px,0)';
      }
    }

    // Desktop: nebeneinander, das Bild unter der Maus schiebt die anderen weg
    function renderDesk() {
      var G = (CONFIG.deskOpen * n - 1) / (1 - CONFIG.deskOpen);
      var sum = 0, gs = [];
      for (var j = 0; j < n; j++) { gs[j] = Math.max(0.25, 1 + G * slides[j].o); sum += gs[j]; }
      var maxTw = 0;
      slides.forEach(function (s) { maxTw = Math.max(maxTw, s.tw); });
      var x = 0, SW = W * CONFIG.deskSide;
      for (j = 0; j < n; j++) {
        var s = slides[j], w = W * gs[j] / sum;
        var sw = Math.min(SW * clamp(s.o, 0, 1.15), w * 0.62);
        var iw = w - sw;
        var st = s.el.style;
        st.left = x.toFixed(2) + 'px'; st.width = w.toFixed(2) + 'px'; st.top = ''; st.height = '';
        st.transform = 'none'; st.zIndex = ''; st.clipPath = '';
        if (s.media) s.media.style.width = iw.toFixed(2) + 'px';
        if (s.title && maxTw > 0) {
          s.title.style.left = '0px'; s.title.style.width = iw.toFixed(2) + 'px';
          s.title.style.fontSize = (iw * CONFIG.deskTitle * 100 / maxTw).toFixed(2) + 'px';
        }
        s.side.style.width = Math.max(0, sw).toFixed(2) + 'px';
        s.sideIn.style.width = SW.toFixed(2) + 'px';
        s.sideIn.style.opacity = clamp((s.o - 0.45) / 0.4, 0, 1).toFixed(3);
        setVis(s, true);
        x += w;
      }
    }

    // ---------- Federn und Takt ----------
    function step(now) {
      raf = 0; tickNow = now;
      var dt = last ? Math.min(0.034, (now - last) / 1000) : 0.016;
      last = now;
      var more = false;
      if (introOn) {
        if (!introT0) introT0 = now;
        introP = clamp((now - introT0) / CONFIG.introMs, 0, 1);

        // Hugo 24.11.: der Einflug endet im Moment des Andockens – Bild steht sofort an seinem Platz, der Titel bewegt sich nicht mehr
        if (introHit || introP >= ((LD && !desk && CONFIG.ldCards) ? 0.95 : 1)) endIntro(); else more = true;   // Handy: Heranzoomen ist bei 0.85 fertig
      } else if (desk) {
        deskMoving = false;
        var k = CONFIG.deskStiff, c = 2 * Math.sqrt(k) * CONFIG.deskDamp;
        slides.forEach(function (s, i) {
          var t = i === hov ? 1 : 0;
          s.ov += (k * (t - s.o) - c * s.ov) * dt; s.o += s.ov * dt;
          if (Math.abs(t - s.o) < 0.0008 && Math.abs(s.ov) < 0.004) { s.o = t; s.ov = 0; } else deskMoving = true;
        });
        more = deskMoving;
      } else {
        // Anzeige läuft dem Ziel nach (Mario: lastY = lerp(lastY, currentY, 0.15) pro Bild)
        var a = 1 - Math.pow(1 - CONFIG.ease, dt * 60);
        F += (C - F) * a;
        if (Math.abs(C - F) < 0.0004) { F = C; if (!down && !busy()) mbShow(); }
        else more = true;
        if (down && moved) more = true;
      }
      if (tick(iz, now)) more = true;
      if (tick(ix, now)) more = true;
      if (tick(ip, now)) more = true;
      applyPanel();
      if (infoClosing) more = true;
      render(dt);
      if (more) kick(); else last = 0;
      tickNow = -1;
    }
    // Hugo 24.11.: wird die Bühne für den nächsten Takt angemeldet, reiht sich der Effekt dahinter ein – so zeichnet er
    // im selben Takt immer erst NACH dem Verschieben der Bilder (sonst beim Wischen Streifen ohne Effekt)
    function kick() { if (!raf) { raf = requestAnimationFrame(step); if (ripple && ripple.order) ripple.order(); } }
    function goTo(t) { C = t; kick(); }

    function endIntro() {
      introOn = false;
      if (LD) LD.dock();
      clearInline();
      root.classList.remove('hp-run');
      fitTitles();
      mbShow();
      dsunWall();
    }
    function startIntro() {
      if (!introOn) { render(); return; }
      root.classList.add('hp-run');
      var imgs = slides.map(function (s) { return s.img; }).filter(Boolean);
      var done = false;
      function go2() {
        if (done) return; done = true;
        // Kommt man über „zum Studio“ (Seite gleitet nach oben weg), setzt die Animation leicht versetzt ein
        var d = document.documentElement.classList.contains('hs-vt-studio') ? CONFIG.vtDelay : 0;
        setTimeout(function () {
          if (LD) LD.ready(function () { introT0 = 0; kick(); });   // Ladeanimation: erst wenn der Schriftzug lange genug leuchtete
          else { introT0 = 0; kick(); }
        }, d);
      }
      Promise.all(imgs.map(function (im) {
        return im.decode ? im.decode().catch(function () {}) : Promise.resolve();
      })).then(go2);
      setTimeout(go2, CONFIG.introWait);
      render();
    }

    // ---------- Menü-Knopf: weg, solange sich etwas bewegt; da, sobald alles steht ----------
    function mbWrap() { return document.querySelector('.menu-toggle-wrap'); }
    function mbShow() {}   // Homepage: kein Menü-Knopf (nur als Close beim About, siehe mbPop)
    function mbHide() { var w = mbWrap(); if (w) w.classList.remove('lib-mb'); }
    function activity() { if (busy() || desk) return; mbHide(); }

    function busy() { return introOn || root.classList.contains('is-info'); }

    // ---------- Zur Galerie ----------
    function go(href) {
      if (!href) return;
      var to = ''; try { to = new URL(href, location.href).pathname; } catch (er) {}
      if (!to) return;
      window.hsVT = { to: to, type: 'fade' };
      location.href = href;
    }

    // ---------- Desktop: Maus ----------
    function setHov(i) {
      if (i === hov) return;
      dsunStop();
      hov = i;
      slides.forEach(function (s, j) {
        s.el.classList.toggle('is-open', j === i);
        if (s.sideLink) s.sideLink.tabIndex = j === i ? 0 : -1;
        s.side.setAttribute('aria-hidden', j === i ? 'false' : 'true');
      });
      kick();
      dsunArm();   // Hugo 24.11.: ab jetzt zählt die Ruhezeit für die Sonne
    }
    // Hugo 24.11.: Spalten öffnen erst, wenn die Maus wirklich bewegt wird – nicht schon, weil sie beim Laden auf einem
    // Bild liegt (der Browser meldet sonst «darüber», sobald sich die Spalten unter der ruhenden Maus aufbauen)
    var ax0 = -1, ay0 = -1;
    root.addEventListener('pointermove', function (e) {
      if (!desk || busy() || e.pointerType === 'touch') return;
      dsunMove(e.clientX, e.clientY);
      if (dsunOn) return;   // bei der Sonne bleibt der Bereich offen, bis die Maus die Zone verlässt
      if (ax0 < 0) { ax0 = e.clientX; ay0 = e.clientY; return; }
      if (Math.hypot(e.clientX - ax0, e.clientY - ay0) < 3) return;
      ax0 = e.clientX; ay0 = e.clientY;
      var el = e.target.closest && e.target.closest('.hp-slide');
      if (!el) return;
      for (var j = 0; j < n; j++) if (slides[j].el === el) { setHov(j); break; }
    });
    root.addEventListener('pointerleave', function (e) { if (desk && e.pointerType !== 'touch') { setHov(-1); dsunStop(); } });

    // ---------- Sonne mit Welle (Hugo 24.11., 13:36) ----------
    // Computer: ist ein Bereich offen und die Maus ruht 1 s, deckt eine Welle ab der Maus die Sonne nach aussen auf. Der
    // Text bleibt stehen (Kopie darüber). Um den Text liegt eine ovale Zone: verlässt die Maus sie, blendet die Sonne aus
    // und die Seite ist wieder da. Handy: dieselbe Welle beim Antippen (About), «close» blendet aus.
    var sunBtn = null, dsunOn = false, dsunLive = false, dsunT = 0, dsunEnd = 0, dsunX = -1, dsunY = -1, dOval = null, dIn = false, dSide = null, dDive = null;
    root.style.setProperty('--hp-dsun-fade', (CONFIG.deskSunFade / 1000) + 's');
    root.style.setProperty('--hp-dsun-beam', (reduce ? 0 : CONFIG.closeBeam / 1000) + 's');
    var closeMs = (reduce ? 0 : CONFIG.closeBeam) + CONFIG.deskSunFade;   // Schliessen: Strahl, dann Ausblenden
    var dLayer = document.createElement('div'); dLayer.className = 'hp-dsun-layer'; dLayer.setAttribute('aria-hidden', 'true');
    var dText = document.createElement('div'); dText.className = 'hp-dsun-text';
    root.appendChild(dLayer); root.appendChild(dText);

    // Welle und Maske: aufgedeckt ist, was die Wellenfront schon hinter sich hat (Front = 0.15 · max(B, H) · Tempo · Zeit,
    // wie im Wellen-Shader); die Front selbst läuft darunter auf der Seite sichtbar nach aussen
    var rv = { raf: 0, els: [] };
    function setMask(el, m) { el.style.webkitMaskImage = m; el.style.maskImage = m; }
    // Schliessen (Hugo 24.11., 14:00): wo der Strahl auftrifft (Bildmitte), bleibt eine Welle mit Schimmer auf der Seite
    function closeRipple() {
      if (!ripple || reduce) return;
      setTimeout(function () { ripple.dock(CONFIG.closeDock); }, CONFIG.closeBeam);   // Hugo 24.11. (14:08): rundherum wie beim Andocken, schwächer
    }
    function revealStop(clear) {
      if (rv.raf) cancelAnimationFrame(rv.raf); rv.raf = 0;
      if (clear) { rv.els.forEach(function (e) { setMask(e, ''); }); rv.els = []; }
    }
    function reveal(x, y, els, onPass) {
      revealStop(true);
      rv.els = els;
      if (!ripple || reduce) return;
      var rr = root.getBoundingClientRect(), lx = x - rr.left, ly = y - rr.top;
      var mx = Math.max(stage.clientWidth || W, stage.clientHeight || H);
      var far = Math.max(Math.hypot(lx, ly), Math.hypot(rr.width - lx, ly), Math.hypot(lx, rr.height - ly), Math.hypot(rr.width - lx, rr.height - ly));
      // Hugo 24.11. (14:03): der Rand geht wie eine Wolke auf (wie die Flare-Explosion beim Laden): um den Kreis liegen
      // weiche Bäusche, ungleich gross, die mitwachsen und leicht atmen, an festen Stellen (nichts dreht sich)
      var NP = 13, pf = [];
      for (var pi = 0; pi < NP; pi++) { var hh = Math.sin((pi + 1) * 12.9898 + x * 0.013 + y * 0.007) * 43758.5453; hh -= Math.floor(hh); pf.push({ a: (pi + 0.35 * hh) / NP * 6.2832, k: 0.6 + 0.8 * hh, ph: hh * 6.2832 }); }
      function m(a, b, z) {
        var L = ['radial-gradient(circle at ' + lx.toFixed(1) + 'px ' + ly.toFixed(1) + 'px, #000 ' + a.toFixed(1) + 'px, transparent ' + b.toFixed(1) + 'px)'];
        if (a > 4) for (var q = 0; q < NP; q++) {
          var P = pf[q], rp = (a * 0.2 + 18) * P.k * (1 + 0.12 * Math.sin(z * 2.2 + P.ph)), d0 = a * 0.97;
          var px = lx + Math.cos(P.a) * d0, py = ly + Math.sin(P.a) * d0;
          L.push('radial-gradient(circle at ' + px.toFixed(1) + 'px ' + py.toFixed(1) + 'px, #000 ' + (rp * 0.3).toFixed(1) + 'px, transparent ' + rp.toFixed(1) + 'px)');
        }
        return L.join(', ');
      }
      els.forEach(function (e) { setMask(e, m(0, 0.5, 0)); });
      ripple.burst(x, y, CONFIG.revealSp);
      var t0 = performance.now();
      function tick(now) {
        var z = (now - t0) / 1000, w = mx * Math.min(0.019 + 0.02 * z, 0.062) * CONFIG.revealRing;
        var rf = 0.15 * mx * CONFIG.revealSp * z - (1 - smoothstep(0, 0.12, z)) * mx * 0.035;
        var a = Math.max(0, rf - 1.4 * w), b = Math.max(a + 0.5, rf - 0.2 * w);
        if (onPass) onPass(a, lx, ly);
        if (a > far + 40) { revealStop(true); return; }
        els.forEach(function (e) { setMask(e, m(a, b, z)); });
        rv.raf = requestAnimationFrame(tick);
      }
      rv.raf = requestAnimationFrame(tick);
    }

    // Eintauchen (Hugo 24.11., 13:50): das Bild zoomt zur Stelle von Maus bzw. Finger hin, während die Welle die Sonne
    // aufdeckt; zurück zoomt es im Takt des Ausblendens heraus. Die Stelle bleibt dabei stehen.
    var easeOutCss = bezier(0.25, 0.1, 0.25, 1);
    function dive(s, x, y, on) {
      if (!s || !s.media || reduce) return;
      var m = s.media, base = desk ? 1 : CONFIG.imgBase;
      if (on) {
        var r = m.getBoundingClientRect();
        if (!s.dv) s.dv = { k: 1, raf: 0 };
        if (s.dv.k <= 1.0001) { s.dv.px = x - (r.left + r.width / 2); s.dv.py = y - (r.top + r.height / 2); }
      }
      if (!s.dv) return;
      var d = s.dv, from = d.k, to = on ? CONFIG.diveZoom : 1, t0 = performance.now(), ms = on ? CONFIG.diveMs : CONFIG.deskSunFade, ez = on ? easeDock : easeOutCss;
      s.dive = true; if (d.raf) cancelAnimationFrame(d.raf);
      function f(now) {
        var t = clamp((now - t0) / ms, 0, 1);
        d.k = from + (to - from) * ez(t);
        m.style.transformOrigin = '50% 50%';
        m.style.transform = 'translate(' + d.px.toFixed(1) + 'px,' + d.py.toFixed(1) + 'px) scale(' + d.k.toFixed(4) + ') translate(' + (-d.px).toFixed(1) + 'px,' + (-d.py).toFixed(1) + 'px) scale(' + base + ')';
        if (t < 1) { d.raf = requestAnimationFrame(f); return; }
        d.raf = 0;
        if (!on) { s.dive = false; s.dv = null; m.style.transform = desk ? '' : 'scale(' + base + ')'; }
      }
      d.raf = requestAnimationFrame(f);
    }
    function inHov(x, y) {
      if (hov < 0) return false;
      var r = slides[hov].el.getBoundingClientRect();
      return x >= r.left && x < r.right && y >= r.top && y < r.bottom;
    }
    function inOval(x, y) {
      if (!dOval) return true;
      var dx = (x - dOval.cx) / dOval.rx, dy = (y - dOval.cy) / dOval.ry;
      return dx * dx + dy * dy <= 1;
    }
    // Sonnenwand schon einmal zeichnen (Grösse steht, kein Ruckler beim ersten Mal)
    function dsunWall() { if (sun && desk && !introOn && !dsunLive) { sunHome(); sun.start(); } }
    var dsunRz = 0;
    window.addEventListener('resize', function () { clearTimeout(dsunRz); dsunRz = setTimeout(dsunWall, 120); });
    function dsunArm() {
      clearTimeout(dsunT);
      if (!sun || !desk || busy() || hov < 0 || dsunOn) return;
      dsunT = setTimeout(dsunStart, CONFIG.deskSunIdle);
    }
    function dsunMove(x, y) {
      dsunX = x; dsunY = y;
      if (dsunOn) {
        if (inOval(x, y)) dIn = true;
        else if (dIn || Math.hypot(x - dOval.sx, y - dOval.sy) > CONFIG.deskSunOval) { dsunStop(); dsunArm(); }
        return;
      }
      dsunArm();
    }
    function dsunStart() {
      if (dsunOn || !sun || !desk || busy() || hov < 0 || !inHov(dsunX, dsunY)) return;
      var s = slides[hov];
      if (s.o < 0.98) { dsunArm(); return; }   // Spalte geht noch auf
      var wasLive = dsunLive;   // Sonne blendet noch aus: nicht von vorn aufdecken, sondern einfach wieder da
      dsunOn = dsunLive = true; clearTimeout(dsunEnd);
      if (dSide) { dSide.style.visibility = ''; dSide = null; }
      sunHome();
      // Text als Kopie genau über das Original legen
      var rr = root.getBoundingClientRect(), r = s.sideIn.getBoundingClientRect();
      dText.innerHTML = '';
      var cl = s.sideIn.cloneNode(true);
      cl.style.left = (r.left - rr.left).toFixed(2) + 'px'; cl.style.top = (r.top - rr.top).toFixed(2) + 'px';
      cl.style.width = r.width.toFixed(2) + 'px'; cl.style.height = r.height.toFixed(2) + 'px'; cl.style.bottom = 'auto'; cl.style.opacity = '1';
      dText.appendChild(cl);
      s.sideIn.style.visibility = 'hidden'; dSide = s.sideIn;   // Original verstecken (doppelt übereinander wirkte die Schrift fett)
      sunBtn = cl.querySelector('.hp-info-go');
      if (sunBtn) {
        sunBtn.tabIndex = 0;
        sunBtn.addEventListener('click', function (e) { if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) { e.preventDefault(); e.stopPropagation(); go(s.href); } });
        if (!reduce) {
          var sh = document.createElement('span'); sh.className = 'hp-go-sh'; sh.setAttribute('aria-hidden', 'true');
          [].forEach.call(sunBtn.querySelectorAll('.lib-sort-label, .lib-sort-arrow'), function (x) { sh.appendChild(x.cloneNode(true)); });
          sunBtn.appendChild(sh);
        }
      }
      // Feld um den Text: dort leuchtet die Lichtebene (goldene Schrift), ausserhalb steckt das Licht in der Wand
      var tb = null;
      [].forEach.call(cl.children, function (k) {
        var q = k.getBoundingClientRect(); if (!q.width) return;
        tb = tb ? { left: Math.min(tb.left, q.left), top: Math.min(tb.top, q.top), right: Math.max(tb.right, q.right), bottom: Math.max(tb.bottom, q.bottom) } : { left: q.left, top: q.top, right: q.right, bottom: q.bottom };
      });
      if (!tb) tb = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      var g = { left: tb.left - 24, top: tb.top - 24, right: tb.right + 24, bottom: tb.bottom + 24 };
      sun.noGlow(g);
      sun.glow.style.clipPath = 'inset(' + (g.top - rr.top).toFixed(1) + 'px ' + (rr.right - g.right).toFixed(1) + 'px ' + (rr.bottom - g.bottom).toFixed(1) + 'px ' + (g.left - rr.left).toFixed(1) + 'px)';
      // ovale Zone um den Text (Hugo 24.11., 13:36)
      var cx = (tb.left + tb.right) / 2, cy = (tb.top + tb.bottom) / 2;
      dOval = { cx: cx, cy: cy, rx: (tb.right - tb.left) * 0.71 + CONFIG.deskSunOval, ry: (tb.bottom - tb.top) * 0.71 + CONFIG.deskSunOval, sx: dsunX, sy: dsunY };
      dIn = inOval(dsunX, dsunY);
      sun.horizon(0, H * 0.22);   // Boden wie am Handy knapp unter dem oberen Fünftel
      root.classList.add('hp-dsun-live', 'hp-dsun');
      sun.start();
      sun.light(true, reduce ? 0 : 800);
      if (wasLive) revealStop(true); else reveal(dsunX, dsunY, [dLayer, sun.glow]);
      dDive = s; dive(s, dsunX, dsunY, true);
    }
    function dsunStop() {
      clearTimeout(dsunT);
      if (!dsunOn) return;
      dsunOn = false; dOval = null;
      revealStop(false);   // Maske bleibt, wo sie ist, und blendet mit aus
      if (dDive) { var dd0 = dDive; setTimeout(function () { dive(dd0, 0, 0, false); }, reduce ? 0 : CONFIG.closeBeam); dDive = null; }
      root.classList.remove('hp-dsun');
      if (sun) { sun.light(false); sun.blind(); }
      closeRipple();
      clearTimeout(dsunEnd);
      dsunEnd = setTimeout(function () {
        if (dsunOn) return;
        revealStop(true);
        dsunLive = false; root.classList.remove('hp-dsun-live');
        dText.innerHTML = ''; sunBtn = null;
        if (dSide) { dSide.style.visibility = ''; dSide = null; }
        if (sun) { sun.noGlow(null); sun.glow.style.clipPath = ''; }
      }, closeMs + 50);
    }
    root.addEventListener('click', function (e) {
      if (!desk || busy()) return;
      var el = e.target.closest('.hp-slide');
      if (!el || e.target.closest('a')) return;
      for (var j = 0; j < n; j++) if (slides[j].el === el) {
        if (hov !== j) setHov(j); else go(slides[j].href);
        break;
      }
    });

    // ---------- Handy: Finger und Maus (senkrecht) ----------
    var down = null, moved = false;
    root.addEventListener('pointerdown', function (e) {
      if (desk || busy() || e.target.closest('.hp-about-btn, a, button, [role="button"]')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY, c0: C, id: e.pointerId, sp: e.pointerType === 'touch' ? CONFIG.speed : CONFIG.speed / 2 };
      moved = false;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down || e.pointerId !== down.id) return;
      var dy = e.clientY - down.y;
      if (!moved) {
        if (Math.abs(dy) < 6 && Math.abs(e.clientX - down.x) < 6) return;
        moved = true; down.y = e.clientY; down.c0 = C; dy = 0;
        root.classList.add('is-dragging'); activity();
      }
      C = down.c0 - dy * down.sp / H;
      kick();
    });
    function release(e, cancel) {
      if (!down || (e && e.pointerId !== down.id)) return;
      root.classList.remove('is-dragging');
      var wasMoved = moved;
      down = null;
      if (wasMoved || cancel) { goTo(Math.round(C)); activity(); }   // aufs nächstgelegene Bild einrasten
      else { var tx = e ? e.clientX : W / 2, ty = e ? e.clientY : H / 2; setTimeout(function () { infoFrom = { x: tx, y: ty }; openInfo(); }, reduce ? 0 : 200); }   // Hugo 23.11.: About öffnet 0.2 s später, damit die Welle zuerst sichtbar ist; die Sonne kommt von dieser Stelle
    }
    window.addEventListener('pointerup', function (e) { release(e, false); });
    window.addEventListener('pointercancel', function (e) { release(e, true); });
    root.addEventListener('dragstart', function (e) { e.preventDefault(); });
    root.addEventListener('touchstart', function (e) {
      if (desk || e.touches.length !== 1 || busy()) return;
      if (e.target.closest('a, button, [role="button"], .hp-about-btn')) return;
      var x = e.touches[0].clientX;
      if (x < CONFIG.edgeGuard || x > window.innerWidth - CONFIG.edgeGuard) e.preventDefault();
    }, { passive: false });

    // Mausrad und Trackpad (nur senkrechte Ansicht): Ziel verschieben, nach kurzer Ruhe einrasten
    var wheelT = 0;
    root.addEventListener('wheel', function (e) {
      if (root.classList.contains('is-info') && e.target.closest && e.target.closest('.hp-info-panel')) return;   // About-Text scrollt selbst
      e.preventDefault();
      if (desk || busy()) return;
      var d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (e.deltaMode === 1) d *= 32;
      if (!d) return;
      C += d / H;
      kick(); activity();
      clearTimeout(wheelT);
      wheelT = setTimeout(function () { goTo(Math.round(C)); }, CONFIG.wheelIdle);
    }, { passive: false });

    // Tastatur
    document.addEventListener('keydown', function (e) {
      if (html.classList.contains('menu-open')) return;
      if (e.key === 'Escape') { if (root.classList.contains('is-info')) closeInfo(); else if (desk) setHov(-1); return; }
      if (busy()) return;
      if (desk) {
        if (e.key === 'ArrowRight') { e.preventDefault(); setHov(hov < 0 ? 0 : Math.min(n - 1, hov + 1)); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); setHov(hov < 0 ? n - 1 : Math.max(0, hov - 1)); }
        else if (e.key === 'Enter' && hov >= 0 && document.activeElement === document.body) go(slides[hov].href);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goTo(Math.round(C) + 1); activity(); }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goTo(Math.round(C) - 1); activity(); }
      else if (e.key === 'Enter' && document.activeElement === document.body) openInfo();
    });

    // ---------- About (Bereichs-Text) wie bei Mario ----------
    function setDialog(el, on) { if (!el) return; el.setAttribute('aria-hidden', on ? 'false' : 'true'); if ('inert' in el) el.inert = !on; }
    var info = document.createElement('div'); info.className = 'hp-info';
    info.setAttribute('role', 'dialog'); info.setAttribute('aria-modal', 'true');
    var infoPanel = document.createElement('div'); infoPanel.className = 'hp-info-panel';
    var infoText = inText ? inText.cloneNode(false) : document.createElement('div');
    infoText.removeAttribute('id'); if (!inText) infoText.className = 'hp-intro-text';
    var infoBtns = document.createElement('div'); infoBtns.className = 'hp-info-btns';
    var infoOpen = document.createElement('a'); infoOpen.className = 'lib-sort hp-info-go';
    var infoGoLabel = document.createElement('span'); infoGoLabel.className = 'lib-sort-label'; infoGoLabel.textContent = 'Galerie öffnen';
    var infoGoArrow = document.createElement('span'); infoGoArrow.className = 'lib-sort-arrow'; infoGoArrow.setAttribute('aria-hidden', 'true'); infoGoArrow.textContent = '\u2192';
    infoOpen.appendChild(infoGoLabel); infoOpen.appendChild(infoGoArrow);
    var infoGoSh = document.createElement('span'); infoGoSh.className = 'hp-go-sh'; infoGoSh.setAttribute('aria-hidden', 'true');
    function goShadow() { infoGoSh.innerHTML = ''; infoGoSh.appendChild(infoGoLabel.cloneNode(true)); infoGoSh.appendChild(infoGoArrow.cloneNode(true)); }
    // gleich ein echtes Ziel, damit Suchmaschinen dem Link folgen können (später je nach Bild gesetzt)
    var firstHref = slides.filter(function (x) { return x.href; })[0]; infoOpen.setAttribute('href', firstHref ? firstHref.href : '/creator');
    var infoClose = inClose ? inClose.cloneNode(true) : document.createElement('div');
    infoClose.removeAttribute('id'); if (!inClose) infoClose.textContent = 'Close';
    infoClose.setAttribute('role', 'button'); infoClose.setAttribute('tabindex', '-1'); infoClose.setAttribute('data-hp-close', '');
    infoBtns.appendChild(infoOpen); infoBtns.appendChild(infoClose);
    var infoScroll = document.createElement('div'); infoScroll.className = 'hp-info-scroll';
    infoScroll.appendChild(infoText); infoScroll.appendChild(infoBtns);
    infoPanel.appendChild(infoScroll);
    info.appendChild(infoPanel); root.appendChild(info);
    setDialog(info, false);

    // ---------- Sonnenstrahlen hinter und über dem About-Text (Hugo 22.11.) ----------
    // Wie Morgensonne durch Dunst (Hugos Bild): Licht fällt von oben durch eine Wolkendecke in Strahlen auf
    // die weisse Wand. Der Titel steht leicht gedreht im Raum, hat Tiefe und wirft lange Schattenstreifen,
    // zwischen den Buchstaben strahlt das Licht durch. Wo ein Strahl über den Text läuft, leuchtet er warm auf.
    //   Ebene 1 (unter dem Text): Wand mit Strahlen, Wolkenschatten und Titelschatten
    //   Ebene 2 (über dem Text, mix-blend-mode: screen): nur das Licht. Auf Weiss ändert es nichts,
    //   schwarze Schrift wird dort goldbraun angestrahlt.
    // Gerechnet wird beides in einem WebGL-Bild (links Wand, rechts Licht) und auf zwei Leinwände kopiert.
    var SUN = {
      src: [0.86, -0.3],         // Sonne oben rechts (Hugo 22.11.: weiter links, etwas höher als ursprünglich)
      rays: [8, 19],             // Strahldichte (grobe / feine Strahlen); Hugo 22.11.: weniger Strahlen
      drift: [0.16, -0.24],      // wie schnell die Strahlen wandern
      edge: [0.37, 0.82],         // Schärfe der Strahlen
      reach: 2.6,                // wie weit die Strahlen nach unten reichen
      strength: 1.2,
      ambient: 0.2,              // so viel Licht liegt auch im Schatten
      shade: [0.8, 0.81, 0.835], // Schatten auf der Wand: kühl
      shadeLow: [0.8, 0.81, 0.835],
      lit: [1.0, 0.985, 0.95],   // Sonne auf der Wand: warmes Weiss
      textLight: [1.0, 0.74, 0.36], // so leuchtet angestrahlte schwarze Schrift (warmes Gold)
      textAmt: 0.62,
      occLen: 0.9,               // Länge des Glasschattens (Anteil Höhe)
      occAmt: 0.75,              // der Titel ist die Wolke: Licht kommt nur an den Rändern und durch die Lücken
      refr: 0.02,                // Lichtbrechung im Glas (Anteil Höhe)
      depth: 0.3,                // Tiefe des Glastitels (Anteil Schrifthöhe)
      shadowW: 0.05,             // Fingerschatten: Breite als Anteil der Höhe
      trailLife: 0.9,            // s
      trailAmt: 0.75,
      res: 1                     // Auflösung (1 = CSS-Pixel; scharf genug für die Glaskanten)
    };
    // Hugo 23.11.: About und Ladeanimation haben je ihre eigene Sonne (eigene Werte, eigene Leinwand), gleiche Bauart
    function makeSun(SUN, mode) {
      var gcv = document.createElement('canvas');
      var c = null;
      try { c = gcv.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true }); } catch (e) {}
      if (!c) return null;
      function mk(cls) { var v = document.createElement('canvas'); v.className = 'hp-info-sun ' + cls; v.setAttribute('aria-hidden', 'true'); return v; }
      var back = document.createElement('div'); back.className = 'hp-info-sun hp-sun-back'; back.setAttribute('aria-hidden', 'true');
      var wall = document.createElement('canvas'); wall.className = 'hp-sun-wall';
      var glass = document.createElement('canvas'); glass.className = 'hp-sun-glass';
      back.appendChild(wall); back.appendChild(glass);
      var glow = mk('hp-sun-light');
      var wx = wall.getContext('2d'), lx = glow.getContext('2d'), gx2 = glass.getContext('2d');
      if (!wx || !lx || !gx2) return null;
      var NT = 10;
      var VS = 'attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }';
      var FS = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' + [
        'uniform vec2 uRes; uniform float uOffX; uniform float uMode; uniform vec2 uOrig; uniform float uScale; uniform vec4 uMB; uniform float uLodB; uniform float uHor; uniform float uOn; uniform vec3 uHero; uniform float uTime; uniform vec2 uSrc; uniform vec2 uRays; uniform vec2 uDrift; uniform vec2 uEdge;',
        'uniform float uReach; uniform float uStrength; uniform float uAmb; uniform vec3 uShade; uniform vec3 uShadeLow; uniform vec3 uLit; uniform vec3 uBase;',
        'uniform vec3 uTextLight; uniform float uTextAmt; uniform float uWallGlow; uniform vec4 uNoG; uniform vec4 uBl; uniform sampler2D uOcc; uniform float uOccOn; uniform float uOccLen; uniform float uOccAmt; uniform vec2 uExt; uniform float uRefr;',
        'uniform float uShadowW; uniform float uTrailAmt; uniform vec3 uTrail[' + NT + '];',
        'float h1(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }',
        'float n1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }',
        'float h2(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }',
        'float n2(vec2 x) { vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);',
        '  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }',
        'vec2 S;',
        'float beamAt(vec2 p) {',
        '  vec2 d = p - S; float ang = atan(d.x, -d.y); float dist = length(d) / uRes.y; float t = uTime;',
        '  float r = 0.6 * n1(ang * uRays.x + t * uDrift.x) + 0.4 * n1(ang * uRays.y + t * uDrift.y + 7.0);',
        '  r *= 0.75 + 0.5 * n1(t * 0.35 + ang * 4.0);',
        '  r = smoothstep(uEdge.x, uEdge.y, r);',
        '  r *= 0.72 + 0.28 * n2(vec2(ang * 22.0, dist * 3.0 - t * 0.35));',
        '  float fall = exp(-max(dist - 0.65, 0.0) / uReach);',
        '  float hd = (ang - uHero.x) / uHero.y; r = max(r, uHero.z * exp(-hd * hd) * (0.82 + 0.18 * n1(t * 0.6)));',
        '  return clamp((r * fall + exp(-dist * 2.2) * 0.35) * uStrength, 0.0, 1.0);',
        '}',
        'float rayR(vec2 p) {',
        '  vec2 d = p - S; float ang = atan(d.x, -d.y); float t = uTime;',
        '  float r = 0.6 * n1(ang * uRays.x + t * uDrift.x) + 0.4 * n1(ang * uRays.y + t * uDrift.y + 7.0);',
        '  r *= 0.75 + 0.5 * n1(t * 0.35 + ang * 4.0);',
        '  float hd = (ang - uHero.x) / uHero.y;',
        '  return max(smoothstep(uEdge.x - 0.1, uEdge.y - 0.05, r), uHero.z * exp(-hd * hd));',
        '}',
        'void main() {',
        '  vec2 fc = uOrig + (gl_FragCoord.xy - vec2(uOffX, 0.0)) / uScale;',
        '  S = vec2(uSrc.x * uRes.x, uRes.y * (1.0 - uSrc.y));',
        '  vec2 d = fc - S; float ang = atan(d.x, -d.y); float dist = length(d) / uRes.y;',
        '  float t = uTime;',
        // Tal: unterhalb des Horizonts (knapp unter dem Titel) ist Boden. Jeder Strahl trifft ihn an einer eigenen Stelle
        // (je nach Strahl näher oder ferner): dort endet er und hinterlässt einen hellen, flachen Lichtfleck, nah gross, fern schmal.
        '  float beam = beamAt(fc);',
        // Einstrahlen: jeder Strahl hat seinen eigenen Moment (aus seinem Winkel), erst ein paar, dann alle.
        // Beim Schliessen läuft es rückwärts: die zuletzt gekommenen gehen zuerst.
        '  float dly = n1(ang * 7.0 + 3.7) * 0.7;',
        '  float hh = (ang - uHero.x) / uHero.y;',
        '  float rf = max(smoothstep(0.2 + dly * 0.8, 0.5 + dly * 0.8, uOn), uHero.z * exp(-hh * hh * 0.5));',
        '  float hitY = uHor * (0.03 + 0.85 * pow(n1(ang * 6.5 + 11.0 + t * 0.015), 1.7));',
        '  float grd = 1.0 - smoothstep(uHor - 0.02 * uRes.y, uHor + 0.02 * uRes.y, fc.y);',
        '  float air = smoothstep(hitY - 0.01 * uRes.y, hitY + 0.05 * uRes.y, fc.y);',
        '  float dT = 1.0 - hitY / max(uHor, 1.0);',
        '  float pH = mix(0.014, 0.075, dT) * uRes.y;',
        '  float pool = exp(-pow((fc.y - hitY) / pH, 2.0));',
        '  float ray = rayR(fc);',
        '  beam = beam * mix(1.0, 0.5 + 0.5 * air, grd) + ray * pool * grd * (1.0 + 0.6 * dT);',
        // Glas im Weg der Sonne: lässt Licht durch (heller Schatten), bündelt es an den Kanten (Kaustik)
        '  float occ = 0.0, caus = 0.0;',
        '  if (uOccOn > 0.0) {',
        '    vec2 dv = S - fc; float dl = length(dv); vec2 dir = dv / max(dl, 0.001); float L = min(uOccLen * uRes.y, dl); float j = 0.5;',
        '    for (int i = 0; i < 30; i++) {',
        '      float k = (float(i) + j) / 30.0; vec2 p = fc + dir * (k * L);',
        '      vec4 m = texture2D(uOcc, (p - uMB.xy) / uMB.zw, uLodB + 1.5 + k * L / uRes.y * 14.0); float w = pow(1.0 - k, 1.4);',
        '      occ = max(occ, m.r); caus = max(caus, m.g * w);',
        '    }',
        '    occ *= uOccOn * uOccAmt; caus *= uOccOn;',
        '  }',
        '  float sh = 0.0;',
        '  for (int i = 0; i < ' + NT + '; i++) {',
        '    vec3 p = uTrail[i]; if (p.z <= 0.0) continue;',
        '    vec2 pd = p.xy - S; float pa = atan(pd.x, -pd.y); float pdist = length(pd) / uRes.y;',
        '    float w = uShadowW / max(pdist, 0.05);',
        '    float behind = smoothstep(-0.02, 0.04, dist - pdist) * exp(-max(dist - pdist, 0.0) * 1.2);',
        '    float da = (ang - pa) / w;',
        '    sh = max(sh, p.z * behind * exp(-da * da));',
        '  }',
        // Bewegung am Boden wie auf der Sonnenoberfläche: im Licht wabert ein fliessendes, verwirbeltes Muster,
        // perspektivisch auf den Boden gelegt (hinten klein, vorne gross), mit feinen hellen Fäden dazwischen.
        '  float yh = max(uHor - fc.y, 2.0) / uRes.y;',
        '  float yc = max(yh, 0.07);',
        '  vec2 gp = vec2((fc.x - 0.5 * uRes.x) / uRes.y / yc, 1.0 / yc) * 0.55;',
        '  vec2 wq = vec2(n2(gp * 1.7 + vec2(t * 0.11, -t * 0.07)), n2(gp * 1.9 + vec2(-t * 0.09, t * 0.13) + 5.2));',
        '  float sv = n2(gp * 2.6 + wq * 2.2 + vec2(0.0, t * 0.05));',
        '  float fil = pow(1.0 - abs(2.0 * sv - 1.0), 7.0);',
        '  float dw = smoothstep(0.04, 0.55, yh);',
        '  float onG = grd * smoothstep(0.03, 0.35, beam) * smoothstep(0.02, 0.1, yh) * mix(0.35, 1.0, dw);',
        '  beam *= rf;',
        '  float lit = beam * (1.0 - occ) * (1.0 - sh * uTrailAmt);',
        '  vec3 rainbow = 0.5 + 0.5 * cos(6.2831 * (ang * 2.5 + dist * 1.5 - t * 0.04 + vec3(0.0, 0.33, 0.67)));',
        '  vec3 causC = caus * beam * (vec3(1.0, 0.88, 0.66) * 0.16 + (rainbow - 0.5) * 0.05);',
        '  vec3 shade = mix(uShade, uShadeLow, grd * (0.5 + 0.5 * (1.0 - fc.y / max(uHor, 1.0))));',
        '  vec3 col, gl = vec3(0.0);',
        '  bool inG = fc.x > uNoG.x && fc.x < uNoG.z && fc.y > uNoG.y && fc.y < uNoG.w;',
        '  if (uMode > 0.5 || (uWallGlow > 0.5 && !inG)) {',
        '    vec2 dd = fc - S; float cs = cos(0.017), sn = sin(0.017);',
        '    vec2 pR = S + vec2(dd.x * cs - dd.y * sn, dd.x * sn + dd.y * cs);',
        '    vec2 pB = S + vec2(dd.x * cs + dd.y * sn, -dd.x * sn + dd.y * cs);',
        '    float b0 = max(beamAt(fc), 0.03);',
        '    vec3 disp = clamp(vec3(beamAt(pR), b0, beamAt(pB)) / b0, 0.0, 1.6);',
        '    float lit2 = lit * mix(1.0, 0.85 + 0.3 * sv, onG);',
        '    float tl = smoothstep(0.45, 1.0, lit2);',
        '    vec3 tl3 = smoothstep(vec3(0.45), vec3(1.0), lit2 * disp);',
        '    float tm = min(tl3.r, min(tl3.g, tl3.b));',
        '    vec3 tc = vec3(1.0, 0.8, 0.62) * tm * 1.08 + (tl3 - tm) * vec3(1.0, 0.95, 1.25) * 1.35;',
        '    gl = (tc * uTextAmt + causC * 0.8) * max(smoothstep(0.15, 0.5, uOn), uHero.z * exp(-hh * hh * 0.35));',
        '  }',
        '  if (uMode < 0.5) {',
        '    float L = clamp(uAmb + lit, 0.0, 1.0);',
        '    float sh2 = onG * smoothstep(0.0, 0.6, uOn);',
        '    float amp = mix(0.8, 1.6, dw);',
        '    L *= mix(1.0, 1.0 - amp * (0.2 - 0.2 * sv + 0.08 * fil), sh2);',
        '    col = mix(shade, uLit, L) + causC + vec3(0.05, 0.03, 0.0) * clamp(lit - 0.8, 0.0, 1.0) * grd;',
        '    col += vec3(1.0, 0.85, 0.55) * fil * sh2 * 0.1 * amp;',
        '    float cw = pow(1.0 - abs(2.0 * sv - 1.0), 3.0);',
        '    vec3 cr = 0.5 + 0.5 * cos(6.2832 * ((sv - 0.5) * 4.0 + t * 0.02 + vec3(0.0, 0.33, 0.67)));',
        '    col += (cr - 0.5) * cw * sh2 * 0.13 * amp;',
        '    float wf = max(smoothstep(0.25, 0.75, uOn), uHero.z * exp(-hh * hh * 0.35));',
        '    col = mix(uBase, col, wf);',
        '    if (uWallGlow > 0.5 && !inG) col = 1.0 - (1.0 - col) * (1.0 - clamp(gl, 0.0, 1.0));',
        '  } else col = gl;',
        // Schliessen (Hugo 24.11., 13:51): ein breiter Sonnenstrahl schwingt aufs Display und blendet. Ganz wenig Regenbogen
        // an seinen Rändern, die Sonnenoberfläche schimmert leicht im Licht, schwache Linsenreflexe auf der Achse Sonne → Mitte.
        // uBl = (Blendung, Winkel des Strahls, Breite, Stärke)
        '  if (uBl.x > 0.0 || uBl.w > 0.0) {',
        '    float bd = (ang - uBl.y) / uBl.z, bb = exp(-bd * bd);',
        '    float beamB = bb * (0.75 + 0.25 * exp(-max(dist - 0.3, 0.0)));',
        '    vec3 rbw = 0.5 + 0.5 * cos(6.2832 * (bd * 0.22 + vec3(0.0, 0.33, 0.67)));',
        '    float edgeB = bb * (1.0 - exp(-bd * bd * 3.0));',
        '    vec2 ax = 0.5 * uRes - S; vec3 ghc = vec3(0.0);',
        '    for (int i = 0; i < 3; i++) {',
        '      float k = 0.75 + 0.5 * float(i); float R = uRes.y * (0.045 + 0.035 * float(i));',
        '      float rr = length(fc - (S + ax * k)) / R;',
        '      ghc += (0.55 + 0.45 * cos(6.2832 * (rr * 0.7 + float(i) * 0.2 + vec3(0.0, 0.33, 0.67)))) * exp(-pow((rr - 1.0) * 3.5, 2.0)) * 0.05;',
        '    }',
        '    float B = clamp(uBl.x * (0.9 + 0.1 * fil * 3.0) + uBl.w * beamB * 0.9, 0.0, 1.0);',
        '    col = mix(col, vec3(1.0, 0.975, 0.92), B);',
        '    col += ((rbw - 0.5) * edgeB * 0.09 + ghc) * uBl.w * (1.0 - 0.6 * uBl.x);',
        '  }',
        '  col += (h2(fc + fract(t)) - 0.5) / 255.0;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'].join('\n');
      function sh(type, src) { var s = c.createShader(type); c.shaderSource(s, src); c.compileShader(s); return c.getShaderParameter(s, c.COMPILE_STATUS) ? s : null; }
      var vs = sh(c.VERTEX_SHADER, VS), fs = sh(c.FRAGMENT_SHADER, FS);
      if (!vs || !fs) return null;
      var pr = c.createProgram(); c.attachShader(pr, vs); c.attachShader(pr, fs); c.linkProgram(pr);
      if (!c.getProgramParameter(pr, c.LINK_STATUS)) return null;
      c.useProgram(pr);
      var b = c.createBuffer(); c.bindBuffer(c.ARRAY_BUFFER, b); c.bufferData(c.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), c.STATIC_DRAW);
      var loc = c.getAttribLocation(pr, 'aPos'); c.enableVertexAttribArray(loc); c.vertexAttribPointer(loc, 2, c.FLOAT, false, 0, 0);
      var U = {}; ['uRes', 'uOffX', 'uMode', 'uOn', 'uHero', 'uOrig', 'uScale', 'uMB', 'uLodB', 'uHor', 'uTime', 'uSrc', 'uRays', 'uDrift', 'uEdge', 'uReach', 'uStrength', 'uAmb', 'uShade', 'uShadeLow', 'uLit',
        'uBase', 'uTextLight', 'uTextAmt', 'uWallGlow', 'uNoG', 'uBl', 'uOcc', 'uOccOn', 'uOccLen', 'uOccAmt', 'uExt', 'uRefr', 'uShadowW', 'uTrailAmt', 'uTrail'].forEach(function (k) { U[k] = c.getUniformLocation(pr, k); });
      c.uniform2fv(U.uSrc, SUN.src); c.uniform2fv(U.uRays, SUN.rays); c.uniform2fv(U.uDrift, SUN.drift); c.uniform2fv(U.uEdge, SUN.edge);
      c.uniform1f(U.uReach, SUN.reach); c.uniform1f(U.uStrength, SUN.strength); c.uniform1f(U.uAmb, SUN.ambient);
      c.uniform3fv(U.uShade, SUN.shade); c.uniform3fv(U.uShadeLow, SUN.shadeLow); c.uniform3fv(U.uLit, SUN.lit); c.uniform3fv(U.uBase, SUN.base || [1, 1, 1]);
      c.uniform3fv(U.uTextLight, SUN.textLight); c.uniform1f(U.uTextAmt, SUN.textAmt);
      c.uniform1f(U.uOccLen, SUN.occLen); c.uniform1f(U.uOccAmt, SUN.occAmt); c.uniform1f(U.uRefr, SUN.refr); c.uniform2f(U.uExt, 0, 0);
      c.uniform1f(U.uShadowW, SUN.shadowW); c.uniform1f(U.uTrailAmt, SUN.trailAmt);
      // Maske des Titels (weiss auf schwarz) als Textur
      var mcv = document.createElement('canvas'), mx = mcv.getContext('2d');
      var tex = c.createTexture(); c.activeTexture(c.TEXTURE0); c.bindTexture(c.TEXTURE_2D, tex);
      c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MIN_FILTER, c.LINEAR); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MAG_FILTER, c.LINEAR);
      c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_S, c.CLAMP_TO_EDGE); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_T, c.CLAMP_TO_EDGE);
      c.texImage2D(c.TEXTURE_2D, 0, c.RGBA, 1, 1, 0, c.RGBA, c.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      c.uniform1i(U.uOcc, 0);
      var occ = { on: 0, t: 0, want: 0, el: null }, pw = 1, ph = 1;
      function pot(v) { var p = 1; while (p < v) p *= 2; return p; }
      var trail = [], tbuf = new Float32Array(NT * 3), raf = 0, t0 = performance.now() - 40000, cw = 0, chh = 0;
      // mode: 'info' = About, 'load' = Ladeanimation der Startseite
      // Glas-Ausschnitt: der Titelbereich wird extra in voller Retina-Auflösung gerechnet (scharfe Glaskanten),
      // der Rest des Lichts reicht in CSS-Pixeln. G = { bx, by, bw, bh (CSS-Pixel), PW, PH (Bildpunkte) }
      var G = null, srcT = null;
      function size() {
        var rs = SUN.res * (desk ? CONFIG.deskSunRes : 1);   // Computer: halbe Auflösung (die ganze Bildschirmfläche ruckelte beim Übergang)
        var w = Math.max(1, Math.round(wall.clientWidth * rs)), h = Math.max(1, Math.round(wall.clientHeight * rs));
        if (w !== cw || h !== chh) {
          cw = wall.width = glow.width = w; chh = wall.height = glow.height = h;

        }
        var GW = 2 * cw, GH = chh;
        if (gcv.width !== GW || gcv.height !== GH) { gcv.width = GW; gcv.height = GH; }
      }
      // Glastitel in die Maske zeichnen, genau so verzerrt wie die gedrehte Schrift auf dem Bildschirm:
      // Schrift flach zeichnen, dann in senkrechten Streifen an die perspektivischen Stellen (T.map) setzen.
      // Die Maske deckt nur den Titelbereich ab, dafür fein. Daraus pro Bildpunkt:
      // R = Glasdicke (gerundet), G = Kante, B/A = Neigung der Oberfläche (für Brechung, Farben, Glanz).
      var tcv = document.createElement('canvas'), tx = tcv.getContext('2d');
      function mask(T) {
        occ.el = T;
        var rect = wall.getBoundingClientRect(), sx = cw / Math.max(1, rect.width);
        if (!T.txt || T.tw < 2) return;
        var cs = [T.map(T.ox, T.oy), T.map(T.ox + T.tw, T.oy), T.map(T.ox, T.oy + T.th), T.map(T.ox + T.tw, T.oy + T.th)];
        var x0 = Math.min(cs[0][0], cs[2][0]), x1 = Math.max(cs[1][0], cs[3][0]), y0 = Math.min(cs[0][1], cs[1][1]), y1 = Math.max(cs[2][1], cs[3][1]);
        var mc = T.map3(T.ox + T.tw * 0.6, T.oy + T.th * 0.5, 0), mb = T.map3(T.ox + T.tw * 0.6, T.oy + T.th * 0.5, -SUN.depth * T.th);
        var ex = mb[0] - mc[0], ey = mb[1] - mc[1];   // Seitenwände: so weit liegt die Rückseite versetzt
        var mg = (y1 - y0) * 0.25 + Math.sqrt(ex * ex + ey * ey);
        var bx = Math.floor(x0 - mg), by = Math.floor(y0 - mg), bw = Math.ceil(x1 - x0 + 2 * mg), bh = Math.ceil(y1 - y0 + 2 * mg);
        var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        pw = Math.min(1024, pot(bw * dpr)); ph = Math.min(512, pot(bh * dpr));
        mcv.width = pw; mcv.height = ph;
        var mxs = pw / bw, mys = ph / bh;
        mx.setTransform(1, 0, 0, 1, 0, 0); mx.fillStyle = '#000'; mx.fillRect(0, 0, pw, ph);
        var k = Math.min(4, Math.max(0.2, (y1 - y0) * mys * 1.5 / T.th));
        var tw = Math.max(2, Math.round(T.tw * k)), th = Math.max(2, Math.round(T.th * k));
        tcv.width = tw; tcv.height = th;
        var fs = 100; tx.font = T.font.replace('{s}', fs + 'px'); tx.textBaseline = 'alphabetic';
        var m = tx.measureText(T.txt), asc = m.fontBoundingBoxAscent || fs * 0.92, dsc = m.fontBoundingBoxDescent || fs * 0.24;
        tx.setTransform(tw / Math.max(1, m.width), 0, 0, th / (asc + dsc), 0, 0);
        tx.fillStyle = '#fff'; tx.fillText(T.txt, 0, asc);
        var N = 120;
        for (var i = 0; i < N; i++) {
          var a = T.map(T.ox + T.tw * i / N, T.oy), b = T.map(T.ox + T.tw * (i + 1) / N, T.oy), cB = T.map(T.ox + T.tw * i / N, T.oy + T.th);
          mx.drawImage(tcv, tw * i / N, 0, tw / N + 0.5, th, (a[0] - bx) * mxs, (a[1] - by) * mys, (b[0] - a[0]) * mxs + 0.6, (cB[1] - a[1]) * mys);
        }
        upload(mx.getImageData(0, 0, pw, ph).data, mxs, mys, (cs[2][1] - cs[0][1]) * mys);
        c.uniform4f(U.uMB, bx * sx, chh - (by + bh) * sx, bw * sx, bh * sx);
        c.uniform2f(U.uExt, ex * sx, -ey * sx);
        G = { bx: bx, by: by, bw: bw, bh: bh, PW: Math.round(bw * dpr), PH: Math.round(bh * dpr), sx: sx };
        glass.width = G.PW; glass.height = G.PH;
        glass.style.left = bx + 'px'; glass.style.top = by + 'px'; glass.style.width = bw + 'px'; glass.style.height = bh + 'px';
      }
      // Kastenfilter mit laufender Summe (schnell, egal wie gross der Radius)
      function box(a, b, w, h, r, horiz) {
        var len = horiz ? w : h, lines = horiz ? h : w, st = horiz ? 1 : w, ls = horiz ? w : 1;
        for (var L = 0; L < lines; L++) {
          var base = L * ls, sum = 0, cnt = 0, i;
          for (i = 0; i <= r && i < len; i++) { sum += a[base + i * st]; cnt++; }
          for (i = 0; i < len; i++) {
            b[base + i * st] = sum / cnt;
            var add = i + r + 1, rem = i - r;
            if (add < len) { sum += a[base + add * st]; cnt++; }
            if (rem >= 0) { sum -= a[base + rem * st]; cnt--; }
          }
        }
      }
      function upload(src, mxs, mys, letterH) {
        var w = pw, h = ph, n = w * h, out = new Uint8Array(n * 4);
        var a = new Float32Array(n), b = new Float32Array(n), x, y, i;
        for (i = 0; i < n; i++) a[i] = src[i * 4] / 255;
        // dicke, runde Glaskanten: Breite etwa 9 % der Schrifthöhe
        var r = Math.max(1, Math.round(letterH * 0.014));   // kleine Rundung: flache Flächen, weiche Ecken
        for (var pass = 0; pass < 3; pass++) { box(a, b, w, h, r, true); box(b, a, w, h, r, false); }
        var gmax = 1e-6, gx = new Float32Array(n), gy = new Float32Array(n);
        for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) {
          i = y * w + x; gx[i] = (a[i + 1] - a[i - 1]) * 0.5 * mxs; gy[i] = (a[i - w] - a[i + w]) * 0.5 * mys;   // je CSS-Pixel, y nach oben
          var gm = Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i]); if (gm > gmax) gmax = gm;
        }
        for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
          i = y * w + x; var o4 = ((h - 1 - y) * w + x) * 4;     // Zeilen umdrehen (WebGL zählt von unten)
          var nx = -gx[i] / gmax, ny = -gy[i] / gmax;
          out[o4] = Math.round(a[i] * 255); out[o4 + 1] = Math.round(Math.min(1, Math.sqrt(nx * nx + ny * ny) * 1.3) * 255);
          out[o4 + 2] = Math.round((nx * 0.5 + 0.5) * 255); out[o4 + 3] = Math.round((ny * 0.5 + 0.5) * 255);
        }
        c.bindTexture(c.TEXTURE_2D, tex); c.pixelStorei(c.UNPACK_FLIP_Y_WEBGL, false); c.pixelStorei(c.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        c.texImage2D(c.TEXTURE_2D, 0, c.RGBA, w, h, 0, c.RGBA, c.UNSIGNED_BYTE, out);
        c.generateMipmap(c.TEXTURE_2D); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MIN_FILTER, c.LINEAR_MIPMAP_LINEAR);
      }
      function pass(x, w, h, mode, ox, oy, scl) {
        c.viewport(x, 0, w, h); c.uniform1f(U.uOffX, x); c.uniform1f(U.uMode, mode);
        c.uniform2f(U.uOrig, ox, oy); c.uniform1f(U.uScale, scl); c.uniform1f(U.uLodB, Math.log(scl) / Math.LN2);   // gleiche Unschärfe wie die Wand
        c.drawArrays(c.TRIANGLE_STRIP, 0, 4);
      }
      function draw(now) {
        size();
        var tm = reduce ? 40.0 : (now - t0) / 1000;
        var rect = wall.getBoundingClientRect(), sx = cw / Math.max(1, rect.width);
        if (held && trail.length) trail[trail.length - 1].t = now;   // Finger liegt noch: Schatten bleibt
        trail = trail.filter(function (p) { return now - p.t < SUN.trailLife * 1000; });
        for (var i = 0; i < NT; i++) {
          var p = trail[trail.length - 1 - i];
          if (p) {
            var life = 1 - (now - p.t) / (SUN.trailLife * 1000);
            tbuf[i * 3] = (p.x - rect.left) * sx; tbuf[i * 3 + 1] = chh - (p.y - rect.top) * sx; tbuf[i * 3 + 2] = life * life;
          } else tbuf[i * 3 + 2] = 0;
        }
        // Glas weich ein- und ausblenden
        var dt = Math.min(0.05, (now - (occ.t || now)) / 1000); occ.t = now;
        occ.on += (occ.want - occ.on) * (reduce ? 1 : Math.min(1, dt * 3.5));
        var e = G && srcT ? occ.on * occ.on * (3 - 2 * occ.on) : 0;
        c.uniform2f(U.uSrc, SUN.src[0] + ((srcT ? srcT[0] : 0) - SUN.src[0]) * e, SUN.src[1] + ((srcT ? srcT[1] : 0) - SUN.src[1]) * e);
        c.uniform1f(U.uHor, G ? chh - (G.by + G.bh * 0.62) * sx : chh * 0.78);   // Horizont knapp unter dem Titel
        // Licht erst, wenn der Titel angekommen ist: in 1.8 s weich einstrahlen; beim Schliessen rasch weg
        if (lightOn.want) lightOn.v = reduce ? 1 : Math.min(1, (now - lightOn.t0) / (mode === 'load' ? 2200 : 3200));   // 2.6 s, Strahl für Strahl
        else lightOn.v = Math.max(0, lightOn.v - dt / 1.2);                                   // während die Seite wegfährt
        var lo = lightOn.v; c.uniform1f(U.uOn, lo * lo * (3 - 2 * lo));
        // Erster Strahl (Hugo 22.11.): kommt zuerst und fällt auf «Galerie öffnen», damit man den Schatten gleich sieht
        var hero = 0, ha = 0, hw = 0.05;
        var hb = sunBtn || infoOpen;
        if (mode === 'info' && hb.offsetWidth) {
          var br = hb.getBoundingClientRect();
          var Sx = SUN.src[0] * rect.width, Sy = SUN.src[1] * rect.height;   // Sonne in CSS-Pixeln der Leinwand (y nach unten)
          var bxx = br.left - rect.left + br.width * 0.45, byy = br.top - rect.top + br.height * 0.5;
          ha = Math.atan2(bxx - Sx, byy - Sy) + Math.sin(tm * 0.21) * 0.012;
          hw = Math.max(0.02, br.width * 0.42 / Math.max(1, Math.hypot(bxx - Sx, byy - Sy)));
          // setzt erst nach 0.7 s an und kommt in 1.8 s weich mit den anderen Strahlen (Hugo 22.11.)
          hero = lightOn.want ? (reduce ? 1 : Math.max(0, Math.min(1, (now - lightOn.t0 - 700) / 1800))) : lo;
          hero = hero * hero * hero * (hero * (hero * 6 - 15) + 10);
          // Hugo 22.11.: wie ein CTA – der Strahl auf dem Button geht in ruhigem Takt weich an und aus (ca. 6.5 s)
          if (lightOn.want && !reduce) {
            var since = (now - lightOn.t0) / 1000 - 2.5;
            if (since > 0) { var ph = 0.5 + 0.5 * Math.cos(since * 6.2832 / 6.5); hero *= ph * ph * (3 - 2 * ph); }
          }
        }
        c.uniform3f(U.uHero, ha, hw, hero); heroNow = hero;
        c.uniform1f(U.uWallGlow, desk ? 1 : 0);
        if (blT0) {
          var bt = (now - blT0) / 1000, sw = Math.min(1, bt / (CONFIG.closeBeam / 1000 + 0.05)), x1 = sw - 1;
          var bo = 1 + 2.4 * x1 * x1 * x1 + 1.4 * x1 * x1;   // mit Schwung, leicht über das Ziel hinaus
          var Sx2 = SUN.src[0] * rect.width, Sy2 = SUN.src[1] * rect.height;
          var angC = Math.atan2(rect.width * 0.5 - Sx2, rect.height * 0.5 - Sy2);
          var amt = smoothstep(0.05, CONFIG.closeBeam / 1000 + 0.1, bt) * 0.92 - smoothstep(CONFIG.closeBeam / 1000 + 0.15, CONFIG.closeBeam / 1000 + 0.9, bt) * 0.3;
          c.uniform4f(U.uBl, Math.max(0, amt), angC + 0.8 * (1 - bo), 0.05 + 0.3 * (1 - Math.pow(1 - sw, 3)), 1 - Math.pow(1 - Math.min(1, bt / 0.3), 3));
        } else c.uniform4f(U.uBl, 0, 0, 1, 0);
        if (noG) c.uniform4f(U.uNoG, (noG.left - rect.left) * sx, chh - (noG.bottom - rect.top) * sx, (noG.right - rect.left) * sx, chh - (noG.top - rect.top) * sx);
        else c.uniform4f(U.uNoG, -1, -1, -1, -1);
        c.uniform2f(U.uRes, cw, chh); c.uniform1f(U.uTime, tm); c.uniform3fv(U.uTrail, tbuf); c.uniform1f(U.uOccOn, G ? occ.on : 0);
        pass(0, cw, chh, 0, 0, 0, 1);
        pass(cw, cw, chh, 1, 0, 0, 1);
        probe(rect, sx);
        var H = gcv.height;
        wx.drawImage(gcv, 0, H - chh, cw, chh, 0, 0, cw, chh);
        lx.drawImage(gcv, cw, H - chh, cw, chh, 0, 0, cw, chh);
      }
      // «Werkstatt öffnen»: Licht an seiner Stelle messen, Schatten nur wenn ein Strahl ihn trifft
      var px = null, btnL = 0, pf = 0, heroNow = 0, noG = null, blT0 = 0;
      function probe(rect, sx) {
        var hb = sunBtn || infoOpen;
        if (mode !== 'info' || ++pf % 5 || !hb.offsetWidth) return;
        var r = hb.getBoundingClientRect();
        var x0 = Math.max(0, Math.round((r.left - rect.left) * sx)), w = Math.min(cw - x0, Math.max(1, Math.round(r.width * sx)));
        var y = Math.round(chh - (r.top + r.height * 0.5 - rect.top) * sx);
        if (w < 1 || y < 0 || y >= chh) return;
        var v = 0;
        if (!sunBtn) {   // Computer: ohne Auslesen (hält die Grafikkarte an, Ruckler beim Übergang); der pulsierende Strahl reicht
          if (!px || px.length < w * 4) px = new Uint8Array(w * 4);
          c.readPixels(cw + x0, y, w, 1, c.RGBA, c.UNSIGNED_BYTE, px);
          var m = 0; for (var i = 0; i < w; i++) m = Math.max(m, px[i * 4]);
          v = Math.min(1, m / 255 / (SUN.textLight[0] * SUN.textAmt));
        }
        // CTA (Hugo 22.11.): Schatten folgt vor allem dem pulsierenden Strahl auf dem Button, andere Strahlen nur schwach
        v = Math.max(v * 0.08, heroNow);
        btnL += (v - btnL) * 0.35;
        hb.style.setProperty('--hp-lit', btnL.toFixed(3));
        // Schatten in Strahlrichtung: weg von der Sonne, schräg über den Boden
        var Sx = rect.left + SUN.src[0] * rect.width, Sy = rect.top + SUN.src[1] * rect.height;
        var ddx = r.left + r.width * 0.5 - Sx, ddy = Math.max(1, r.top + r.height * 0.5 - Sy);
        var sk = Math.max(-65, Math.min(65, Math.atan(ddx / ddy) * 180 / Math.PI));
        hb.style.setProperty('--hp-skew', sk.toFixed(1) + 'deg');
      }
      function loop(now) {
        raf = 0;
        if (mode === 'load' && !lightOn.want && lightOn.v <= 0) return;                 // Laden fertig, Licht aus
        if (mode === 'info' && ip.v >= 1 && !root.classList.contains('is-info') && !dsunLive) { occ.on = 0; return; }   // Seite zu: nichts zeichnen
        draw(now);
        if (!reduce || trail.length || Math.abs(occ.want - occ.on) > 0.01) raf = requestAnimationFrame(loop);
      }
      // Fingerschatten: bleibt, solange der Finger auf dem Display liegt, und folgt ihm (auch beim Scrollen);
      // erst beim Loslassen verblasst er. Touch-Ereignisse statt Pointer, weil Pointer beim Scrollen abbrechen.
      var held = false;
      function addPt(x, y) {
        if (reduce || !(root.classList.contains('is-info') || dsunOn)) return;   // Computer: Mausschatten auch bei der Sonne nach 1 s Ruhe
        var now = performance.now(), last = trail[trail.length - 1];
        if (last && Math.abs(last.x - x) + Math.abs(last.y - y) < 8 && now - last.t < 50) { last.t = now; return; }
        trail.push({ x: x, y: y, t: now });
        if (trail.length > 30) trail.shift();
        if (!raf) raf = requestAnimationFrame(loop);
      }
      function tStart(e) { if (!e.touches || !e.touches[0]) return; held = true; addPt(e.touches[0].clientX, e.touches[0].clientY); }
      function tMove(e) { if (!e.touches || !e.touches[0]) return; held = true; addPt(e.touches[0].clientX, e.touches[0].clientY); }
      function tEnd(e) { if (e.touches && e.touches.length) return; held = false; var l = trail[trail.length - 1]; if (l) l.t = performance.now(); }
      window.addEventListener('touchstart', tStart, { passive: true });
      window.addEventListener('touchmove', tMove, { passive: true });
      window.addEventListener('touchend', tEnd, { passive: true });
      window.addEventListener('touchcancel', tEnd, { passive: true });
      window.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') addPt(e.clientX, e.clientY); }, { passive: true });
      var lightOn = { v: 0, want: false, t0: 0 };
      function start() { if (!raf) { draw(performance.now()); raf = requestAnimationFrame(loop); } }
      return {
        back: back, wall: wall, glow: glow, start: start,
        // Titel nur noch für die Lage des Horizonts (knapp darunter beginnt das Tal), er wirft keinen Schatten mehr
        // Titel nur für den Horizont: Lage aus der Geometrie, ohne Pixelarbeit (die Maske hat beim Andocken
        // für einige Bilder alles angehalten, Hugos Video 22.11.)
        title: function (T) {
          if (T) { var a = T.map(T.ox, T.oy), b = T.map(T.ox + T.tw, T.oy + T.th); G = { bx: a[0], by: a[1], bw: b[0] - a[0], bh: b[1] - a[1] }; }
          occ.want = 0; start();
        },
        noGlow: function (r) { noG = r; },   // Computer: Feld (CSS-Pixel), in dem die Lichtebene darüber das Licht übernimmt
        light: function (on, lead) { if (on && !lightOn.want) lightOn.t0 = performance.now() - (lead || 0); if (on) blT0 = 0; lightOn.want = !!on; start(); },
        blind: function () { if (!reduce) { blT0 = performance.now(); start(); } },   // Schliessen: Strahl mit Schwung, Blendung   // lead: so viele ms ist das Einstrahlen schon weiter
        // Laden: Boden (Sonnenoberfläche) beginnt knapp unter dem Schriftzug
        horizon: function (top, bottom) { G = { bx: 0, by: top, bw: 1, bh: (bottom - top) / 0.62 }; start(); },
        // Lichtbild der Schrift (zweite Hälfte der Rechenleinwand): Quelle und Ausschnitt für drawImage
        lightSrc: function () { return [gcv, cw, gcv.height - chh, cw, chh]; },
        // Licht an einer Stelle (CSS-Pixel): 0 … 1, so stark wie angestrahlte Schrift dort leuchten würde
        lightAt: function (x, y) {
          var rect = wall.getBoundingClientRect(), sx = cw / Math.max(1, rect.width);
          var px0 = Math.round((x - rect.left) * sx), py0 = Math.round(chh - (y - rect.top) * sx);
          if (px0 < 0 || px0 >= cw || py0 < 0 || py0 >= chh) return 0;
          if (!px) px = new Uint8Array(4);
          c.readPixels(cw + px0, py0, 1, 1, c.RGBA, c.UNSIGNED_BYTE, px);
          return Math.min(1, px[0] / 255 / (SUN.textLight[0] * SUN.textAmt));
        },
        // Ladeanimation fertig: Leinwand und Speicher freigeben
        destroy: function () { lightOn.want = false; lightOn.v = 0; if (raf) cancelAnimationFrame(raf); raf = 0; var lx2 = c.getExtension('WEBGL_lose_context'); if (lx2) lx2.loseContext(); }
      };
    }
    var sun = makeSun(SUN, 'info');
    if (sun) {
      info.insertBefore(sun.back, infoPanel); root.appendChild(sun.glow);   // Lichtebene über Text UND Titel
      root.classList.add('hp-info-sunlit');
      infoPanel.style.background = 'transparent';
    }
    // Wand mit Strahlen: am Handy im About, am Computer in der Bühne (für die Sonne nach 1 s Ruhe, Hugo 24.11.)
    function sunHome() {
      if (!sun) return;
      if (desk) { if (sun.back.parentNode !== dLayer) dLayer.appendChild(sun.back); }
      else if (sun.back.parentNode !== info) info.insertBefore(sun.back, infoPanel);
    }
    sunHome();
    if (!introOn) dsunWall();   // ohne Einflug (Bewegung reduzieren): weisse Wand gleich bereit

    var tClone = null, tOrig = null, infoT = 0, sunT = 0, sunL = 0, glassT = null, ipT = 0, brandT = 0, infoFrom = null, infoDive = null;
    // Bild beim About, genau wie Mario am Handy (main.js, Home.hide / Home.show):
    //   Öffnen:    Bild bleibt stehen und zoomt hinein (Shader-Wert scaleImage 0 → 2 in 1 s, Kurve .72,0,.11,1),
    //              die weisse Seite schiebt sich von rechts darüber (1.5 s, .6,0,.1,1).
    //   Schliessen: Bild gleitet von links herein (x −Breite → 0 in 1.5 s, .6,0,.1,1) und zoomt dabei
    //              heraus (scaleImage → 0 in 1 s, .72,0,.11,1), die weisse Seite fährt nach rechts weg.
    //   Bildausschnitt · (1 − 0.5 · scaleImage) → Zoom = 1 / (1 − 0.5 · scaleImage)
    //   Bei Mario endet der Zoom in einer Farbfläche. Wir lassen ihn darum bis zum letzten Bild weiterlaufen,
    //   bis die weisse Seite das Bild ganz zudeckt (sonst sieht man links, wie er stehen bleibt):
    //   in der ersten Sekunde wie Mario (Kurve .72,0,.11,1), danach weich weiter bis 1.5 s.
    var infoSlide = null, iz = { v: 0, a: null }, ix = { v: 0, a: null }, infoClosing = false;
    var ip = { v: 1, a: null };   // weisse Seite: 1 = rechts draussen, 0 = ganz da (im selben Takt wie das Bild)
    var brand = root.querySelector('.hp-brand');
    function applyPanel() {
      infoPanel.style.transform = ip.v >= 1 ? '' : 'translate3d(' + (ip.v * 100).toFixed(3) + '%,0,0)';
      if (sun) { sun.back.style.transform = sun.glow.style.transform = infoPanel.style.transform; sun.glow.style.visibility = ip.v < 1 ? 'visible' : ''; if (ip.v < 1) sun.start(); }
    }
    function zoomOpen(t) { return 0.9 * easeDock(Math.min(1, t * CONFIG.infoMs / 1000)) + 0.1 * easeInfo(t); }
    function tween(o, to, ms, ease, from) { o.a = { from: from === undefined ? o.v : from, to: to, t0: performance.now(), ms: ms, ease: ease }; if (from !== undefined) o.v = from; kick(); }
    function tick(o, now) {
      if (!o.a) return false;
      var t = clamp((now - o.a.t0) / o.a.ms, 0, 1);
      o.v = o.a.from + (o.a.to - o.a.from) * o.a.ease(t);
      if (t >= 1) { o.a = null; return false; }
      return true;
    }
    function applyInfo() {
      var s = infoSlide; if (!s) return;
      // Schliessen: Bildkante klebt an der weissen Seite (2 px darunter), damit nie eine Lücke entsteht
      if (infoClosing) {
        if (ip.v >= 1 && !ip.a) { ix.v = 0; infoClosing = false; }
        else ix.v = Math.min(0, ip.v - 1 + 2 / W);
      }
      if (!iz.a && !ix.a && !infoClosing && iz.v <= 0.0001 && Math.abs(ix.v) <= 0.0001) {
        s.el.style.transform = 'translate3d(0,0,0)';
        if (s.media) s.media.style.transform = 'scale(' + CONFIG.imgBase + ')';
        infoSlide = null; root.classList.remove('hp-info-anim'); return;
      }
      root.classList.add('hp-info-anim');
      s.el.style.transform = 'translate3d(' + (ix.v * W).toFixed(1) + 'px,0,0)';
      if (s.media) { s.media.style.transformOrigin = '50% 50%'; s.media.style.transform = 'scale(' + (CONFIG.imgBase / (1 - 0.97 * iz.v)).toFixed(4) + ')'; }
    }
    function openInfo() {
      if (desk || busy() || Math.abs(C - F) > 0.02) return;
      var s = slides[current()];
      clearTimeout(infoT);
      if (tClone) { tClone.remove(); tClone = null; }
      if (tOrig) tOrig.style.visibility = '';
      infoText.innerHTML = s.intro;
      infoOpen.setAttribute('href', s.href || '#'); infoGoLabel.textContent = s.btn || 'Galerie öffnen';
      if (sun && !reduce) { goShadow(); if (!infoGoSh.parentNode) infoOpen.appendChild(infoGoSh); }
      infoOpen.style.display = s.href ? '' : 'none';
      infoPanel.scrollTop = 0;
      // Titel: Kopie über alles legen (genau am Platz des Originals) und nach oben rechts neben
      // „Hugo Sophian Studio“ fahren. Der Text steht ebenfalls rechts davon, unter dem Schriftzug bleibt es leer.
      var rr = root.getBoundingClientRect();
      var top = Math.max(12, W * 0.03), left = W * 0.05, gap = Math.max(14, W * 0.045), right = W * 0.05;
      if (brand) {
        var br = brand.getBoundingClientRect();
        top = br.top - rr.top; left = br.right - rr.left + gap;
      }
      root.style.setProperty('--hp-info-left', left.toFixed(0) + 'px');
      root.style.setProperty('--hp-info-top', (top + H * 0.12).toFixed(0) + 'px');
      if (s.title) {
        tOrig = s.title;
        tClone = s.title.cloneNode(true);
        tClone.removeAttribute('id'); tClone.classList.add('hp-info-title'); tClone.setAttribute('aria-hidden', 'true');
        tClone.style.transform = 'translate3d(0,0,0)';
        root.appendChild(tClone);
        tOrig.style.visibility = 'hidden';
        var cr = tClone.getBoundingClientRect();
        var rg = document.createRange(); rg.selectNodeContents(tClone);
        var tr = rg.getBoundingClientRect();
        var sc = Math.min(1, (W - left - right) / Math.max(1, tr.width));
        var ox = tr.left - cr.left, oy = tr.top - cr.top;   // Textanfang innerhalb der Kopie
        var t3 = '', map0 = null, minX = ox, minY = oy, maxY = oy + tr.height;
        // Der Titel bleibt, wie er einfliegt. Für das Licht ist er der Hügel, hinter dem die Sonne steht.
        if (sun && !reduce) map0 = function (lx, ly) { return [lx, ly]; };
        var dx = left - (cr.left - rr.left) - sc * minX;
        var dy = top - (cr.top - rr.top) - sc * minY;
        tClone.style.transformOrigin = '0 0';
        tClone.style.transition = 'transform ' + (CONFIG.titleSuck / 1000) + 's ' + suckEase + ', opacity .5s ease';   // Hugo 24.11. (13:53): wie ein Sog nach oben
        root.style.setProperty('--hp-info-top', (top + (maxY - minY) * sc + H * 0.035).toFixed(0) + 'px');
        tClone.getBoundingClientRect();   // Startlage festhalten, damit der Übergang läuft
        if (map0) {
          var bx = cr.left - rr.left + dx, by = cr.top - rr.top + dy, scc = sc;
          var map3 = function (lx, ly, lz) { var p = map0(lx, ly, lz); return [bx + scc * p[0], by + scc * p[1]]; };
          var csT = getComputedStyle(tClone), txT = (tClone.textContent || '').trim();
          if (csT.textTransform === 'uppercase') txT = txT.toUpperCase();
          glassT = { txt: txT, font: csT.fontStyle + ' ' + csT.fontWeight + ' {s} ' + csT.fontFamily, ox: ox, oy: oy, tw: tr.width, th: tr.height,
            map: function (lx, ly) { return map3(lx, ly, 0); }, map3: map3 };
        }
        tClone.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0) scale(' + sc.toFixed(4) + ')' + t3;
        // Hugo 24.11. (14:03/14:11): Warp wie beim Sprung ins Spiel (Wild Rift): kurz Anlauf (staucht sich, zieht minimal
        // zurück), dann reisst es ihn nach oben – je schneller, desto mehr wird er in die Länge gezogen, kippt nach hinten,
        // zieht eine Spur aus Farbstreifen hinter sich (Rot/Blau getrennt) und wird heller; oben schnappt er ein und blitzt kurz.
        if (tClone.animate && !reduce) {
          tClone.style.transition = 'opacity .5s ease';
          var fr = [], NF = 60, vmax = 1e-6, vs = [];
          for (var fi = 0; fi <= NF; fi++) { var ft = fi / NF; vs[fi] = Math.abs(suckF(Math.min(1, ft + 0.015)) - suckF(Math.max(0, ft - 0.015))); vmax = Math.max(vmax, vs[fi]); }
          for (fi = 0; fi <= NF; fi++) {
            var tt = fi / NF, pp = suckF(tt), vn = fi === NF || fi === 0 ? 0 : Math.pow(vs[fi] / vmax, 1.3);
            var ant = tt < 0.22 ? Math.sin(Math.PI * tt / 0.22) : 0;   // Anlauf
            var pq = pp - 0.035 * ant;
            var sp = 1 + (sc - 1) * pp, st = 1 + 1.7 * vn, sq = 1 / Math.sqrt(st), dip = 1 - 0.22 * Math.sin(Math.PI * Math.min(1, pp));
            var sqY = 1 - 0.1 * ant, sqX = 1 + 0.06 * ant;
            var flash = tt > 0.8 ? Math.sin(Math.PI * Math.min(1, (tt - 0.8) / 0.2)) : 0;
            var ch = 9 * vn, tr = 22 * vn;
            fr.push({
              transform: 'translate3d(' + (dx * pq).toFixed(1) + 'px,' + (dy * pq).toFixed(1) + 'px,0) perspective(650px) rotateX(' + (-34 * vn).toFixed(2) + 'deg) translateZ(' + (-140 * vn).toFixed(1) + 'px) scale(' + (sp * dip * sq * sqX).toFixed(4) + ',' + (sp * dip * st * sqY).toFixed(4) + ')',
              filter: 'blur(' + (1.6 * vn).toFixed(2) + 'px) brightness(' + (1 + 0.5 * vn + 0.6 * flash).toFixed(3) + ')',
              textShadow: vn > 0.02 ? '0 ' + ch.toFixed(1) + 'px 0 rgba(255,50,90,' + (0.55 * vn).toFixed(3) + '), 0 ' + (-ch).toFixed(1) + 'px 0 rgba(40,190,255,' + (0.55 * vn).toFixed(3) + '), 0 ' + tr.toFixed(1) + 'px ' + (4 * vn).toFixed(1) + 'px rgba(255,255,255,' + (0.35 * vn).toFixed(3) + '), 0 ' + (2 * tr).toFixed(1) + 'px ' + (8 * vn).toFixed(1) + 'px rgba(255,255,255,' + (0.2 * vn).toFixed(3) + '), 0 ' + (3.2 * tr).toFixed(1) + 'px ' + (14 * vn).toFixed(1) + 'px rgba(255,255,255,' + (0.1 * vn).toFixed(3) + ')' : 'none',
              offset: tt
            });
          }
          try { tClone.animate(fr, { duration: CONFIG.titleSuck, easing: 'linear' }); } catch (er) {}
        }
        clearTimeout(sunT);
        if (sun && glassT) sun.title(glassT);   // Hugo 24.11. (13:36): Horizont gleich setzen – die Sonne ist sofort sichtbar
      }
      if (sun) {
        // Sonne erst, wenn der Titel eingeflogen ist (Hugo 22.11.)
        clearTimeout(sunL); sun.light(false);
        sun.light(true, reduce ? 0 : 800);   // wie am Computer: Strahlen kommen schon mit der Welle
      }
      // Hugo 24.11. (13:36): wie am Computer – keine Bildbewegung mehr. Die Sonne mit dem Text wird von einer Welle ab dem
      // Finger nach aussen aufgedeckt, darunter läuft die Fingerwelle weiter. «close» blendet aus.
      if (infoSlide) { infoSlide.el.style.transform = ''; if (infoSlide.media) infoSlide.media.style.transform = 'scale(' + CONFIG.imgBase + ')'; iz.v = 0; ix.v = 0; iz.a = ix.a = null; infoSlide = null; root.classList.remove('hp-info-anim'); }
      infoClosing = false;
      var wasOpen = ip.v < 1;   // schliesst noch: nicht von vorn aufdecken
      clearTimeout(ipT); ip.a = null; ip.v = 0; applyPanel();
      if (brand) brand.classList.remove('hp-on-white');
      var tp = infoFrom || { x: W / 2, y: H / 2 }; infoFrom = null;
      infoDive = s; dive(s, tp.x, tp.y, true);
      if (wasOpen) { revealStop(true); if (brand) brand.classList.add('hp-on-white'); }
      else reveal(tp.x, tp.y, sun ? [info, sun.glow] : [info], function (rad, lx, ly) {
        // Schriftzug wird dunkel, sobald die Welle ihn überquert hat
        if (brand && !brand.classList.contains('hp-on-white')) {
          var bx = brand.offsetLeft + brand.offsetWidth / 2, by = brand.offsetTop + Math.min(brand.offsetHeight, 120) / 2;
          if (Math.hypot(bx - lx, by - ly) < rad) brand.classList.add('hp-on-white');
        }
      });
      if (reduce && brand) brand.classList.add('hp-on-white');
      root.classList.add('is-info'); setDialog(info, true);
      mbPop(true);
      if (s.href) { var l = document.createElement('link'); l.rel = 'prefetch'; l.href = s.href; document.head.appendChild(l); }
    }
    function closeInfo() {
      if (!root.classList.contains('is-info')) return;
      root.classList.remove('is-info'); setDialog(info, false);
      mbPop(false);
      revealStop(false);   // Maske bleibt stehen und blendet mit aus
      if (infoDive) { var id0 = infoDive; setTimeout(function () { if (!root.classList.contains('is-info')) dive(id0, 0, 0, false); }, reduce ? 0 : CONFIG.closeBeam); infoDive = null; }
      clearTimeout(ipT);
      ipT = setTimeout(function () { if (root.classList.contains('is-info')) return; revealStop(true); ip.v = 1; applyPanel(); kick(); }, closeMs + 50);
      clearTimeout(brandT); brandT = setTimeout(function () { if (brand && !root.classList.contains('is-info')) brand.classList.remove('hp-on-white'); }, closeMs - CONFIG.deskSunFade * 0.5);
      // Hugo 24.11. (14:09): kein Zurückfliegen – der Titel verschwindet im Licht des Strahls und steht danach schon
      // unten auf der Seite (das Original kommt mit der Seite unter dem ausblendenden Licht zum Vorschein)
      if (tClone && tClone.getAnimations) tClone.getAnimations().forEach(function (an) { if (an.effect && an.effect.getKeyframes && an.effect.getKeyframes().length > 2) an.cancel(); });
      if (tClone) { tClone.style.transition = 'opacity ' + ((reduce ? 0 : CONFIG.closeBeam) / 1000) + 's ease'; tClone.style.opacity = '0'; }
      clearTimeout(sunT); clearTimeout(sunL); if (sun) { sun.title(null); sun.light(false); sun.blind(); }
      closeRipple();
      clearTimeout(infoT);
      infoT = setTimeout(function () {
        if (root.classList.contains('is-info')) return;
        if (tClone) { tClone.remove(); tClone = null; }
        if (tOrig) { tOrig.style.visibility = ''; tOrig = null; }
      }, reduce ? 0 : CONFIG.closeBeam);
    }
    infoClose.addEventListener('click', function (e) { e.preventDefault(); closeInfo(); });
    infoClose.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeInfo(); } });
    // „Galerie öffnen“: Übergang anmelden (alte Seite blendet aus, Library startet schwarz) und selbst navigieren
    // Am Handy: direkt beim Loslassen des Fingers öffnen (ohne auf den Klick zu warten), wenn nicht gescrollt wurde
    var goDown = null;
    infoOpen.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') goDown = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    infoOpen.addEventListener('pointerup', function (e) {
      if (!goDown || e.pointerType !== 'touch') return;
      var moved = Math.abs(e.clientX - goDown.x) > 10 || Math.abs(e.clientY - goDown.y) > 10;
      goDown = null;
      if (moved || !root.classList.contains('is-info')) return;
      var h = infoOpen.getAttribute('href');
      if (h && h !== '#') { e.preventDefault(); go(infoOpen.href); }
    });
    infoOpen.addEventListener('pointercancel', function () { goDown = null; });
    infoOpen.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (infoOpen.getAttribute('href') && infoOpen.getAttribute('href') !== '#') go(infoOpen.href);
    });
    // ---------- Close-Knopf beim About ----------
    // Auf der Homepage gibt es keinen Menü-Knopf. Beim About wird er unten (versteckt) zu „close“
    // und bouncet gegen Ende der Animation von unten hoch, wie die anderen Menü-Knöpfe, nur mit mehr Bounce.
    // Beim Schliessen fällt er wieder nach unten weg und heisst danach wieder „menu“.
    var mbBtn = null, mbOrig = '', mbClose = '', mbT = 0;
    function mbSetup() {
      if (mbBtn) return mbBtn;
      var b = document.querySelector('.menu-toggle-wrap [data-menu-open]') || document.querySelector('.menu-toggle-wrap .is-menu');
      if (!b) return null;
      mbOrig = b.textContent.trim() || 'menu';
      mbClose = (inClose && inClose.textContent.trim()) || 'close';
      mbBtn = b;
      return b;
    }
    // Federkurve (schwingt hin und zurück) als CSS linear()-Kurve: Hochbouncen und Grösse wackeln nach
    (function () {
      // Dauer so lang, bis die Feder wirklich steht (Rest unter 0.2 %), sonst springt sie am Ende sichtbar ins Ziel
      function settle(zeta, hz) { return Math.log(500) / (zeta * 2 * Math.PI * hz); }
      function spring(zeta, hz, dur, n) {
        var w = 2 * Math.PI * hz, wd = w * Math.sqrt(1 - zeta * zeta), pts = [];
        for (var i = 0; i <= n; i++) {
          var t = dur * i / n;
          var y = 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + zeta * w / wd * Math.sin(wd * t));
          pts.push(y.toFixed(4));
        }
        pts[n] = '1';
        return 'linear(' + pts.join(', ') + ')';
      }
      try {
        if (CSS.supports('transition-timing-function', 'linear(0, 1)')) {
          var hs = document.documentElement.style;
          var z1 = 0.45, f1 = 1.3, d1 = settle(z1, f1);   // hoch: rund 20 % Überschwingen, einmal zurück
          var z2 = 0.42, f2 = 1.6, d2 = settle(z2, f2);   // Grösse: wackelt etwas schneller
          hs.setProperty('--hp-mb-ease', spring(z1, f1, d1, 90));
          hs.setProperty('--hp-mb-up', d1.toFixed(2) + 's');
          hs.setProperty('--hp-mb-ease2', spring(z2, f2, d2, 90));
          hs.setProperty('--hp-mb-up2', d2.toFixed(2) + 's');
        }
      } catch (e) {}
    })();
    function mbPop(on) {
      var b = mbSetup(), w = mbWrap(); if (!b || !w) return;
      clearTimeout(mbT);
      if (on) {
        b.textContent = mbClose;
        b.setAttribute('aria-label', 'Bereich schliessen');
        if (!w.classList.contains('lib-mb')) { w.classList.add('mh-now', 'hp-mb-small'); void w.offsetWidth; w.classList.remove('mh-now'); }
        mbT = setTimeout(function () { w.classList.remove('hp-mb-small'); w.classList.add('lib-mb'); }, CONFIG.infoMs * 0.72);
      } else {
        w.classList.remove('lib-mb');
        mbT = setTimeout(function () {
          if (root.classList.contains('is-info')) return;
          b.textContent = mbOrig;
          b.setAttribute('aria-label', 'Menü öffnen');
        }, 700);
      }
    }
    // Klick auf den Menü-Knopf bei offenem About: schliesst das About statt das Menü zu öffnen
    function mbIntercept(e) {
      if (!root.classList.contains('is-info')) return;
      var t = e.target.closest && e.target.closest('.menu-toggle-wrap');
      if (!t) return;
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault(); e.stopImmediatePropagation();
      closeInfo();
    }
    window.addEventListener('click', mbIntercept, true);
    window.addEventListener('keydown', mbIntercept, true);

    var aboutBtn = root.querySelector('.hp-about-btn');
    if (aboutBtn) {
      aboutBtn.setAttribute('role', 'button'); aboutBtn.setAttribute('tabindex', '0');
      aboutBtn.addEventListener('click', function (e) { e.preventDefault(); var q = aboutBtn.getBoundingClientRect(); infoFrom = { x: q.left + q.width / 2, y: q.top + q.height / 2 }; openInfo(); });
      aboutBtn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openInfo(); } });
    }

    // ---------- Wechsel Handy ↔ Desktop ----------
    function setMode() {
      var d = deskMQ.matches;
      if (d === desk) return;
      desk = d;
      root.classList.toggle('is-desk', desk);
      closeInfo(); setHov(-1); dsunStop(); sunHome(); dsunWall();
      slides.forEach(function (s) { s.o = 0; s.ov = 0; });
      F = C = Math.round(F);
      clearInline();
      slides.forEach(function (s) { if (s.title) s.title.style.fontSize = ''; });
      fitTitles(); render();
      mbShow();
    }
    if (deskMQ.addEventListener) deskMQ.addEventListener('change', setMode); else if (deskMQ.addListener) deskMQ.addListener(setMode);


    // ---------- Ladeanimation (Hugo 23.11., vorerst nur Handy) ----------
    //   Alles schwarz, die Bilder kommen wie immer, aber als weisse Karten mit leuchtendem Rand – wie Türen, die aufgehen,
    //   und dahinter kommt das Bild zum Vorschein. Sobald das Bild angedockt ist, leuchtet der Rand bunt auf, das Bild
    //   wabbert kurz und kleine goldene Solar Flares züngeln aus dem Rand.
    //   Nur beim ersten Besuch pro Sitzung; mit «Bewegung reduzieren» ohne.
    LD = (function () {
      // Hugo 24.11.: die Ladeanimation läuft bei jedem Laden der Startseite (nicht nur beim ersten Besuch pro Sitzung)
      if (reduce) { html.classList.remove('hp-ldpre'); return null; }   // Hugo 24.11.: auch am Computer
      html.classList.add('hp-ldpre');
      if (!desk && CONFIG.ldCards) slides.forEach(function (s) {   // Hugo 24.11.: weisse Karten nur am Handy (am Computer wieder entfernt)
        var g = document.createElement('div'); g.className = 'hp-gold'; g.setAttribute('aria-hidden', 'true');
        if (s.media && s.media.nextSibling) s.el.insertBefore(g, s.media.nextSibling); else s.el.appendChild(g);
        s.gold = g;
      });
      var docked = false;
      return {
        ready: function (cb) { cb(); },
        dock: function () {
          if (docked) return; docked = true;
          slides.forEach(function (s) { if (s.gold) { s.gold.remove(); s.gold = null; } s.el.style.boxShadow = ''; });
          if (ripple && ripple.dock) ripple.dock();
          html.classList.remove('hp-ldpre');   // Logo und About blenden ein
          fitTitles(); if (desk) renderDesk(); root.classList.remove('hp-run');   // Computer: Titel gleich in der richtigen Grösse (sonst kurz 100 px)     // Hugo 24.11.: Titel erscheint mit dem Schlag, gleich in der richtigen Grösse und Lage
          root.classList.add('hp-dock-hit'); setTimeout(function () { root.classList.remove('hp-dock-hit'); }, 800);
        }
      };
    })();

    // ---------- Start ----------
    // Barrierefreiheit (Lighthouse 21.11.): Webflow-Listenrollen passen nicht mehr, weil die Einträge umgebaut werden
    [].forEach.call(root.querySelectorAll('[role="list"],[role="listitem"]'), function (e) { e.removeAttribute('role'); });
    root.classList.toggle('is-mouse', window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    slides.forEach(function (s, i) {
      if (!s.img) return;
      s.img.sizes = '100vw';
      if (i === 0) s.img.setAttribute('fetchpriority', 'high');
    });
    fitTitles();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitTitles(); render(); });
    root.classList.add('is-ready');
    startIntro();
    if (!introOn) mbShow();
    window.addEventListener('resize', function () { fitTitles(); render(); });
    window.addEventListener('pageshow', function (e) { if (e.persisted) { render(); if (!introOn) mbShow(); } });
    fitViewport();
  }

  // Safari (Hugo 21.11. 16:05): kommt man aus einer gescrollten Seite über „zum Studio“, bleibt 100dvh manchmal
  // auf einer alten (zu kleinen) Höhe stehen, unten bleibt ein schwarzer Balken. Darum die Höhe laufend an den
  // wirklich sichtbaren Bereich binden (ein unsichtbares, festes Element über die ganze Höhe misst ihn).
  // Prüfwerte einblenden: einmal hugosophian.studio/#diag öffnen (wieder aus: #nodiag).
  function fitViewport() {
    var hp = document.querySelector('[data-hp]');
    if (!hp || !document.body) return;
    var probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:0;top:0;bottom:0;width:1px;visibility:hidden;pointer-events:none;z-index:-1';
    document.body.appendChild(probe);
    var diag = null, unit = {};
    try {
      if (location.hash === '#diag') sessionStorage.setItem('hs-diag', '1');
      if (location.hash === '#nodiag') sessionStorage.removeItem('hs-diag');
      if (sessionStorage.getItem('hs-diag')) {
        diag = document.createElement('div');
        diag.style.cssText = 'position:fixed;left:8px;top:45%;z-index:99999;background:rgba(255,0,0,.85);color:#fff;font:12px/1.35 monospace;padding:6px 8px;white-space:pre;pointer-events:none;text-transform:none';
        document.body.appendChild(diag);
        ['dvh', 'svh', 'lvh'].forEach(function (u) {
          var p = document.createElement('div');
          p.style.cssText = 'position:absolute;top:0;width:1px;visibility:hidden;height:100' + u;
          document.body.appendChild(p); unit[u] = p;
        });
      }
    } catch (e) {}
    var t0 = Date.now(), lastH = 0, nudgeT = 0;
    // Safari (Messung Hugo 16:18): Die Seite wird richtig 692 hoch, Safari zeichnet aber nur die alten 624 px
    // (Höhe mit aufgeklappter oberer Leiste), darunter bleibt es schwarz. Das korrigiert sich erst beim Scrollen,
    // und die Startseite lässt sich nicht scrollen. Darum bei jeder Höhenänderung einmal unsichtbar um 1 px
    // scrollen und gleich zurück: Safari zeichnet dann die ganze Fläche neu.
    var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    function nudge() {
      if (!touch) return;
      clearTimeout(nudgeT);
      nudgeT = setTimeout(function () {
        var de = document.documentElement, b = document.body;
        de.style.overflow = 'auto'; b.style.overflow = 'visible'; b.style.height = 'calc(100% + 2px)';
        window.scrollTo(0, 1);
        requestAnimationFrame(function () {
          window.scrollTo(0, 0);
          de.style.removeProperty('overflow'); b.style.removeProperty('overflow'); b.style.removeProperty('height');
        });
      }, 60);
    }
    function sync() {
      var h = probe.offsetHeight;
      if (h > 100 && Math.abs(hp.offsetHeight - h) > 1) {
        hp.style.height = h + 'px';
        window.dispatchEvent(new Event('resize'));
      }
      if (h > 100 && h !== lastH) { if (lastH) nudge(); lastH = h; }
      if (diag) {
        var v = window.visualViewport;
        diag.textContent = 'fix ' + h + '  hp ' + hp.offsetHeight + '\ninner ' + window.innerHeight + '  vv ' + (v ? Math.round(v.height) + '/' + Math.round(v.offsetTop) : '-') +
          '\ndvh ' + unit.dvh.offsetHeight + '  svh ' + unit.svh.offsetHeight + '  lvh ' + unit.lvh.offsetHeight +
          '\nscrY ' + window.scrollY + '  scr ' + screen.height + '  t ' + ((Date.now() - t0) / 1000).toFixed(1);
      }
    }
    sync();
    ['resize', 'orientationchange', 'pageshow', 'load', 'touchend'].forEach(function (ev) { window.addEventListener(ev, function () { sync(); setTimeout(sync, 120); }); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', sync);
    // nach dem Laden bzw. nach dem Seitenübergang (≈ 0.9 s) sicherheitshalber auch einmal
    window.addEventListener('pageshow', nudge);
    setTimeout(nudge, 400); setTimeout(nudge, 1300);
    setInterval(sync, 400);
  }

  // Stil und Seitenklasse sofort setzen (vor dem ersten Bild, auch für Seitenübergänge: schwarzer Grund)
  var styled = false;
  function style() {
    if (styled || !document.querySelector('[data-hp]')) return;
    styled = true;
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
    document.documentElement.classList.add('hp-on');
  }
  function boot() {
    style();
    [].forEach.call(document.querySelectorAll('[data-hp]'), init);
  }
  style();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
