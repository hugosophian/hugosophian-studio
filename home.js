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
    // Hugo 25.11. (09:24): «zum Studio» soll immer die ganze Ladeanimation zeigen. Die alte Seite gleitet 0.8 s weg und
    // verdeckte so den Anfang der Animation → sie startet erst, wenn die alte Seite weg ist (vorher 0)
    vtDelay:    780,    // nach „zum Studio“: Animation so viel später (ms)
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
    deskTextFrom: 0.25, // Computer: Text der Spalte blendet ein, sobald sie so weit offen ist …
    deskTextSpan: 0.25, // … und ist nach diesem Stück ganz da
    warmAfter:  2200,   // Galerien so lange nach dem Einflug vorladen (ms)
    warmDelay:  1300,   // Computer: Galerie erst so lange nach dem Aufgehen der Spalte vorladen (ms), dann in einer ruhigen Lücke
    goScrollDelay: 280, // Hugo 11:09: beim Hineinscrollen schreibt sich der Knopf so viel später ein (ms)
    goDelay:    0,      // zusätzliche Verzögerung (ms). Hugo 11:06: zeitlich wieder wie ursprünglich, dafür erst wenn sichtbar (vorher 200, 350)
    infoMs:     1500,   // About: Dauer (Mario: 1.5 s, Kurve 0.6, 0, 0.1, 1)
    // Hugo 25.11.: About wieder wie am 21.11. (Mario pur: weisse Seite von rechts, Bild zoomt hinein, kein Licht), Handy und Computer.
    // true = Sonne mit Welle (Stand 24.11., siehe effekt-bibliothek/06-sonne-welle.md). Die Sonnenstrahlen sollen später woanders hin.
    aboutSun:   false,
    // Hugo 25.11.: Effekte ruhiger (vorher alles 1). Fingerwelle: das Wasser verzieht das Bild weiter wie bisher,
    // nur das Licht darauf ist zurückgenommen.
    waveLight:  0.4,    // Regenbogen-Licht auf der Welle (Ring, Halo)
    waveEdge:   0.2,    // Leuchten, wenn die Welle den Bildschirmrand erreicht (lief bis 5 s nach)
    // Hugo 25.11. (08:10): langsam wischen = schmale, ruhige Welle; schnell = kräftige. Jeder Punkt der Fingerbahn merkt
    // sich das Tempo dort, die Welle ist entlang der Bahn gemischt. Tempo in px pro ms (Finger/Maus):
    waveSlow:   0.08,   // bis hier ruhigste Welle
    waveFast:   1.2,    // ab hier volle Stärke (wie bisher)
    waveCalm:   0.3,    // Stärke der ruhigsten Welle (1 = wie bisher)
    // Hugo 25.11. (09:21): am Computer werden die Wellen erst später stark – auch etwas mehr Bewegung bleibt noch ruhig,
    // die kräftigen setzen erst bei schneller Maus ein (Maus-Tempo ist höher als Finger-Tempo)
    // Hugo 09:45: noch später stark, und bei ganz schneller Maus etwas stärker als die bisherige Grenze
    waveSlowDesk: 0.3,  // Computer: bis hier ruhigste Welle (px/ms) (vorher 0.2)
    waveFastDesk: 4.5,  // Computer: hier volle Stärke wie bisher (vorher 3.0)
    waveCurveDesk: 2.2, // Computer: >1 = Stärke steigt erst spät steil an (vorher 1.8)
    waveTopDesk:  8.0,  // Computer: bei diesem Tempo die Extra-Stärke ganz
    waveBoostDesk: 0.2, // Computer: so viel stärker als die bisherige Grenze (0.2 = +20 % Stärke)
    waveFlares: 0,      // Solar Flares auf der Fingerwelle (0 = keine)
    ldRim:      0.35,   // Ladeanimation: buntes Rand-Leuchten beim Andocken
    ldFlares:   0,      // Ladeanimation: Flares und Flare-Fäden beim Andocken
    // Computer (Hugo 24.11.): Maus ruht so lange auf dem geöffneten Bereich → alles ausser Text und «Galerie öffnen»
    // blendet aus und die Sonne vom Handy-About geht an. Maus ausserhalb des Bereichs → alles zurück, Sonne weg.
    deskSunIdle: 1000,  // ms ohne Mausbewegung
    deskSunFade: 900,   // ms Aus- und Einblenden
    deskSunRes:  0.5,   // Auflösung der Sonne am Computer (Anteil der CSS-Pixel; Strahlen sind weich)
    deskSunOval: 60,    // px Rand der ovalen Zone um den Text: Maus ausserhalb → alles zurück (Hugo 24.11., 13:36)
    diveZoom:   1.6,    // Hugo 24.11. (13:50/14:27): das Bild zoomt beim Übergang hinein, als würde man eintauchen – früher und stärker
    diveZoomIn: 3.4,    // Hugo 24.11. (19:48/19:51): so tief taucht das Bild beim Öffnen ein (gleichmässig, schnell); danach unsichtbar zurück auf diveZoom
    diveMs:     1300,   // Dauer des Eintauchens (startet am Handy schon beim Tippen); gleichmässig ohne Abbremsen, bis das Bild ganz unter dem Licht ist
    closeBeam:  400,    // Hugo 24.11. (13:51): beim Schliessen schwingt ein Sonnenstrahl aufs Display und blendet (ms)
    closeHold:  160,    // Hugo 24.11. (14:23): so lange nach dem Start des Strahls beginnt schon das Ausblenden (die Seite taucht im Licht auf)
    shimAmt:    0.5    // Hugo 24.11. (16:09): Schimmer bei Öffnen und Schliessen = Aufprall der Ladeanimation in halber Stärke
  };

  var css = [
    'html.hp-on, html.hp-on body { height: 100%; overflow: hidden; overscroll-behavior: none; background: #000; }',
    '[data-hp] { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }',
    '[data-hp] .hp-stage { overflow: hidden; }',
    '[data-hp] .hp-slide { position: absolute; inset: 0; overflow: hidden; visibility: hidden; will-change: transform; backface-visibility: hidden; }',
    '[data-hp] .hp-slide.is-vis { visibility: visible; }',
    '[data-hp] .hp-media { position: absolute; inset: 0; will-change: transform; }',
    '[data-hp] .hp-img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; -webkit-user-drag: none; }',
    // Hugo 25.11. (11:03): Titel und Logo rasten mit dem Aufprall ein – kurz, schneller Start, weicher Auslauf, Handy und Computer gleich (vorher .8s ease .1s)
    '[data-hp] .hp-title { will-change: transform; pointer-events: none; transition: opacity .45s cubic-bezier(.22,1,.36,1); }',
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
    '[data-hp] .hp-info-go { position: relative; }',
    // Schatten von «Galerie öffnen»: Licht von hinten → Schatten fällt nach vorne auf den Boden, gespiegelt, lang
    // gezogen und zum Betrachter hin breiter; nur sichtbar, solange ein Strahl den Button trifft (--hp-lit).
    '[data-hp] .hp-go-sh { position: absolute; left: 0; right: 0; bottom: .28em; display: inherit; gap: inherit; align-items: inherit; justify-content: inherit; white-space: nowrap; pointer-events: none; color: rgb(70,50,25); opacity: calc(var(--hp-lit,0) * .42); transform-origin: 50% 100%; transform: skewX(var(--hp-skew, -40deg)) scaleY(-2.2); filter: blur(1.2px); -webkit-mask-image: linear-gradient(to top, #000 0%, rgba(0,0,0,.5) 45%, transparent 100%); mask-image: linear-gradient(to top, #000 0%, rgba(0,0,0,.5) 45%, transparent 100%); }',
    '[data-hp] .hp-go-sh * { color: inherit !important; text-shadow: none !important; }',
    '[data-hp] .hp-info-sun { position: absolute; inset: 0; width: 100%; height: 100%; display: block; transform: translate3d(100%,0,0); pointer-events: none; }',
    '[data-hp] .hp-info-scroll { display: flex; flex-direction: column; gap: 2.2vh; flex: 0 0 auto; }',
    // Hugo 24.11. (15:01): kein Ausblenden oben/unten (wirkte wie ein eigener Scroll-Bereich) – wie davor
    /* „Galerie öffnen“ im Stil von „Alle Projekte ↓“ der Library (gleiche Webflow-Klassen), Pfeil nach rechts */
    /* Schrift erbt „Alle Projekte“ in der Library vom Eltern-Element lib-top, darum hier dieselben Werte (live gemessen) */
    '[data-hp] .hp-info-go { color: inherit; text-decoration: none; align-self: flex-start; cursor: pointer; -webkit-tap-highlight-color: transparent; display: flex; align-items: center; gap: .5em; font-family: "Oswald Studio", sans-serif; font-size: .8rem; font-weight: 500; letter-spacing: .12em; line-height: 1.5; text-transform: uppercase; }',
    '[data-hp] .hp-info-go .lib-sort-label { font: inherit; letter-spacing: inherit; }',
    '[data-hp] .hp-info-go .hp-ch { display: inline-block; white-space: pre; }',
    /* Hugo 11:17: Ruckeln beim Einblenden am Computer – Text der Spalte auf eigener Grafik-Ebene, damit er beim Ein-/Ausblenden nicht jedes Bild neu gezeichnet wird */
    '[data-hp] .hp-side-in { will-change: opacity; }',
    '[data-hp] .hp-go-wait .hp-ch, [data-hp] .hp-go-wait > .lib-sort-arrow { opacity: 0; }',
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
    /* Hugo 11:17: «Galerie öffnen» bleibt bei langen Texten sichtbar – klebt über dem Close-Knopf auf einem weich auslaufenden
       Streifen in der Farbe der Seite und rastet am Ende des Texts an seinem Platz ein. bottom negativ: der Klebe-Bereich endet
       schon am Innenabstand unten des Panels (5vh + 9rem), -4.4rem setzt den Knopf 4.6rem über dessen Unterkante */
    '[data-hp] .hp-info-btns { position: sticky; bottom: -4.4rem; z-index: 2; padding: 2.8rem 0 .6rem; margin-top: -2.8rem;',   /* Hugo 11:22: Weiss beginnt höher (vorher 1.4rem) */
    '  background: linear-gradient(to bottom, transparent, var(--hp-info-bg, #fff) 55%); box-shadow: 0 3rem 0 0 var(--hp-info-bg, #fff), 0 6rem 0 0 var(--hp-info-bg, #fff), 0 9rem 0 0 var(--hp-info-bg, #fff), 0 12rem 0 0 var(--hp-info-bg, #fff); }',   /* Streifen reicht bis unten: kein Text zwischen Knopf und Close */
    '[data-hp] .hp-title.hp-info-title { z-index: 7; pointer-events: none; opacity: 1; transition: transform 1.5s cubic-bezier(.6,0,.1,1), opacity .5s ease; will-change: transform; }',
    '[data-hp] .hp-about-btn { transition: opacity .5s ease; }',
    '[data-hp].is-info .hp-about-btn { opacity: 0; pointer-events: none; }',
    /* „Hugo Sophian Studio“ bleibt beim About oben links stehen und wird dunkel, sobald die weisse Seite darunter ist */
    '[data-hp].is-info .hp-brand, [data-hp].hp-info-anim .hp-brand { z-index: 8; }',
    '[data-hp] .hp-brand { transition: color .25s ease; }',
    '[data-hp] .hp-brand.hp-on-white { color: var(--hp-info-fg, #000) !important; mix-blend-mode: normal !important; }',
    // Hugo 24.11. (17:35/17:48): im Blitz verschwand «Hugo Sophian Studio» unter dem Licht und tauchte wieder auf. Eine Kopie
    // liegt während des Blitzes darüber und blendet weich aus, wenn er abklingt – darunter wird das Original von den
    // Strahlen beleuchtet. Der Farbwechsel geschieht im Weiss des Blitzes ohne Übergang (dort sehen beide gleich aus)
    '[data-hp] .hp-brand.hp-brand-top { z-index: 10 !important; pointer-events: none !important; }',
    '[data-hp].is-info .hp-brand:not(.hp-brand-top), [data-hp].hp-dsun-live .hp-brand:not(.hp-brand-top) { transition: none !important; }',
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
    // Hugo 25.11. (10:57): am Computer wie am Handy – Titel blendet zusammen mit dem Logo weich ein (vorher sofort mit dem Schlag da: zu früh)
    /* Logo und About erst, wenn das Bild angedockt ist */
    'html.hp-ldpre [data-hp] .hp-brand, html.hp-ldpre [data-hp] .hp-about-btn { opacity: 0 !important; pointer-events: none; }',
    'html.hp-on:not(.hp-ldpre) [data-hp] .hp-brand, html.hp-on:not(.hp-ldpre) [data-hp] .hp-about-btn { transition: color .25s ease, opacity .45s cubic-bezier(.22,1,.36,1); }',   // vorher .9s ease
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
    // Ohne Sonne (aboutSun false): About blendet nicht aus, die weisse Seite fährt wie bei Mario nach rechts weg
    '[data-hp].hp-nosun:not(.is-desk) .hp-info { opacity: 1; transition: visibility 0s linear 1.5s; }',
    '[data-hp].hp-nosun.is-info:not(.is-desk) .hp-info { transition: visibility 0s; }',
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
  var easeInfo = bezier(0.6, 0, 0.1, 1);   // Marios About-Kurve (wieder gebraucht seit 25.11.)
  // Hugo 24.11. (18:35): Eintauchen mit Schwung – eine Feder: nimmt Fahrt auf, schiesst leicht über das Ziel hinaus und
  // federt zurück (z = Dämpfung: 0.7 ≈ 5 % über das Ziel, 1 = ohne Nachfedern); endet genau auf 1
  function springEase(z, w) {
    var wd = w * Math.sqrt(Math.max(1e-4, 1 - z * z));
    function x(t) { return z >= 0.999 ? 1 - Math.exp(-w * t) * (1 + w * t) : 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z / Math.sqrt(1 - z * z) * Math.sin(wd * t)); }
    var e1 = 1 - x(1);
    return function (t) { return x(t) + e1 * t * t * t; };
  }
  // Öffnen (Hugo 24.11., 19:55): weich anziehen, im sichtbaren Teil immer schneller; abgebremst wird erst, wenn das Bild schon
  // unter dem Licht verschwindet (dieselbe Kurve als Browser-Animation und für die Rechnung)
  var DIVE_EASE = [0.45, 0, 0.25, 1], easeDive = bezier(DIVE_EASE[0], DIVE_EASE[1], DIVE_EASE[2], DIVE_EASE[3]);
  var easeDiveOut = springEase(0.75, 11);  // Schliessen (Handy: Bild hat Reserve, ein Hauch unter 1 ist unsichtbar)
  var easeDiveOutD = springEase(1, 9);     // Schliessen am Computer: ohne Nachfedern (sonst sähe man den Bildrand)
  // Ladeanimation (Hugo 24.11.): wie easeDock, nur das Abbremsen läuft schneller ab (Zeit ab der Mitte weich gerafft,
  // Tempo bleibt stetig)
  function easeDockF(t, ez, b) { var w = t <= 0.45 ? t : t + (b == null ? 1.2 : b) * (t - 0.45) * (t - 0.45) / 1.1; return (ez || easeDock)(Math.min(1, w)); }
  var easeDockM = bezier(0.66, 0, 0.09, 1);   // Hugo 24.11.: zieht am Anfang mehr an   // Hugo 24.11.: Handy – in der Mitte schneller (Ende und Magnet-Einsatz gleich)

  function init(root) {
    if (root.__hp) return;
    root.__hp = true;
    var html = document.documentElement;
    var stage = root.querySelector('.hp-stage');
    if (!stage) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Hugo 25.11. (10:56): «Galerie öffnen» / «Werkstatt betreten» schreiben sich beim Erscheinen Buchstabe für Buchstabe
    // ein, wie der Hinweis im Hintergrund der Galerie (von unten aus der Unschärfe, links nach rechts, Pfeil zuletzt)
    function goSplit(label, txt) {
      label.textContent = '';
      for (var i = 0; i < txt.length; i++) {
        var c = document.createElement('span'); c.className = 'hp-ch'; c.textContent = txt.charAt(i); label.appendChild(c);
      }
      var a = label.closest ? label.closest('a') : null; if (a) a.setAttribute('aria-label', txt);
    }
    // Hugo 11:06: erst animieren, wenn der Knopf wirklich sichtbar ist (lange Texte: erst wenn er beim Scrollen ins Bild kommt),
    // frühestens zum ursprünglichen Zeitpunkt. Bis dahin sind die Buchstaben unsichtbar (hp-go-wait).
    var goIO = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var a = e.target; if (!e.isIntersecting || !a.classList.contains('hp-go-wait')) return;
        var rest = (a.__goT || 0) - performance.now();
        goIn(a, rest > 0 ? rest : CONFIG.goScrollDelay);   // Hugo 11:09: kommt er erst beim Scrollen ins Bild, kurz danach
      });
    }, { threshold: 1 }) : null;   // ganz im Bild
    function goArm(a, wait) {
      if (!a) return;
      if (reduce || !goIO || !a.animate) { a.classList.remove('hp-go-wait'); return; }
      a.__goT = performance.now() + wait; a.classList.add('hp-go-wait');
      goIO.unobserve(a); goIO.observe(a);   // neu beobachten: ist er schon sichtbar, meldet sich der Beobachter sofort
    }
    function goIn(a, base) {
      if (a) a.classList.remove('hp-go-wait');
      if (reduce || !a || !a.animate) return;
      [].forEach.call(a.querySelectorAll('.lib-sort-label .hp-ch, .lib-sort-arrow'), function (c, i) {
        if (c.closest('.hp-go-sh')) return;
        var bl = desk ? [] : [{ filter: 'blur(4px)' }, { filter: 'blur(0px)' }];   // Hugo 11:17: am Computer ohne Unschärfe (Ruckeln)
        try { c.animate([{ opacity: 0, transform: 'translateY(.35em)', filter: bl[0] ? bl[0].filter : 'none' }, { opacity: 1, transform: 'translateY(0)', filter: bl[1] ? bl[1].filter : 'none' }],
          { duration: 420, delay: base + i * 18, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }); } catch (er) {}
      });
    }
    var deskMQ = window.matchMedia('(min-width: ' + CONFIG.desk + 'px) and (hover: hover) and (pointer: fine)');
    var links = {};
    try { links = JSON.parse(root.getAttribute('data-hp-links') || '{}'); } catch (e) {}

    var intro = root.querySelector('.hp-intro');
    var inText = intro && intro.querySelector('.hp-intro-text');
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
        var al = document.createElement('span'); al.className = 'lib-sort-label';
        var ar = document.createElement('span'); ar.className = 'lib-sort-arrow'; ar.setAttribute('aria-hidden', 'true'); ar.textContent = '\u2192';
        a.appendChild(al); a.appendChild(ar); goSplit(al, s.btn || 'Galerie öffnen');
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
      // Hugo 25.11.: zurück aus einer Galerie (Bereichsname unten links) → beim Bild dieses Bereichs starten
      // Hugo 09:47: nur über den Bereichsnamen in der Galerie (dann ist auch hp-backin gesetzt). «studio» im Menü und alles
      // andere starten immer mit dem normalen Aufbau (Alchemist zuerst).
      try { var ret = sessionStorage.getItem('hp-return'); sessionStorage.removeItem('hp-return'); if (ret && (sessionStorage.getItem('hp-backin') || html.classList.contains('hp-backin'))) keys.push(ret); } catch (e) {}
      function hpath(h) { try { return new URL(h, location.href).pathname.replace(/\/$/, '').toLowerCase(); } catch (e) { return ''; } }
      for (var q = 0; q < keys.length; q++) {
        var key = String(keys[q]).trim().toLowerCase();
        if (!key) continue;
        for (var i = 0; i < n; i++) {
          if (slides[i].name.toLowerCase() === key || slides[i].label.toLowerCase() === key || (key.charAt(0) === '/' && slides[i].href && hpath(slides[i].href) === key.replace(/\/$/, ''))) { F = C = i; return; }
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
        'uniform float uRim; uniform float uSoft; uniform float uEdgeOff; uniform float uTint; uniform float uDA; uniform float uDF; uniform float uFade; uniform float uWL; uniform float uWE; uniform float uWF; uniform vec2 uRes; uniform float uDpr; uniform vec4 uP[' + NP + ']; uniform float uAge[' + NW + ']; uniform float uHue[' + NW + ']; uniform vec4 uB[' + NW + ']; uniform float uT; uniform float uEdgeT; uniform float uSeed; uniform float uKeep; uniform float uImp; uniform float uDesk;',
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
        '  float tr = sp > 0.0 ? z * mx * 0.15 * sp * mix(0.45, 1.3, clamp(mix(a.w, b.w, t), 0.0, 1.35)) : min(uRes.x, uRes.y) * (-sp) * mix(a.w, b.w, t) * (1.0 - exp(-z * 2.6));',   // Hugo 25.11. (08:26): ruhige Welle läuft weniger weit, kräftige weiter   // Andocken: Reichweite nach der schmalen Seite, die Seiten treffen sich nie
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
        '    if (length(fc - uB[k].xy) - uB[k].z - age * mx * 0.15 * abs(uB[k].w) * (uB[k].w > 0.0 ? 1.6 : 1.0) > mx * 0.62) continue;',
        // Hugo 23.11.: keine Striche beim Auslösen — die Bahn ist eine durchgehende Linie (Abschnitte zwischen den Punkten),
        // nicht einzelne Kreise; Alter und Einblendung laufen entlang des Abschnitts weich mit.
        // Weiches Minimum in einem Durchgang (laufend neu gewichtet), damit es auch in voller Schärfe flüssig bleibt.
        '    float w = mx * min(0.019 + 0.02 * age, 0.062) * (uB[k].w < 0.0 ? 1.25 : 1.0), sw = 1.0 / (w * 0.5);',   // Hugo 24.11. (14:00): Sonnenwelle breiter   // Andocken: breiter   // Andocken: breiter   // Hugo 23.11.: am Finger wieder grösser, beim Auslaufen kompakt (früher 0.016 + 0.028 · Alter, max. 0.085)
        '    float best = 1e9, ws = 0.0, sf = 0.0, sd = 0.0, sm = 0.0, sa = 0.0; vec2 dir = vec2(0.0);',
        '    for (int j = 0; j < ' + (PW - 1) + '; j++) {',
        '      vec4 pa = uP[k * ' + PW + ' + j]; if (pa.w <= 0.0) continue;',
        '      vec4 pb = uP[k * ' + PW + ' + j + 1]; if (pb.w <= 0.0) pb = pa;',
        '      vec2 dv; float d; float f = segF(fc, pa, pb, mx, uB[k].w, dv, d);',
        '      vec2 un = d > 0.5 ? dv / d : vec2(0.0); float mg = 0.5 * (pa.w + pb.w), za = 0.5 * (max(pa.z, 0.0) + max(pb.z, 0.0));',   // Hugo 25.11.: Stärke (Fingertempo) und Alter an dieser Stelle der Bahn
        '      if (f < best) { float sc = best > 1e8 ? 0.0 : exp((f - best) * sw); ws = ws * sc + 1.0; sf = sf * sc + f; sd = sd * sc + d; sm = sm * sc + mg; sa = sa * sc + za; dir = dir * sc + un; best = f; }',
        '      else { float q = exp((best - f) * sw); ws += q; sf += q * f; sd += q * d; sm += q * mg; sa += q * za; dir += q * un; }',
        '    }',
        '    if (ws <= 0.0) continue;',
        '    best = sf / ws; dir /= ws; sd /= ws; sm /= ws; sa /= ws;',
        // Hugo 25.11. (08:10): Fingerwelle je nach Tempo – langsam schmal und ruhig, schnell breit und kräftig (Andocken unverändert)
        // Hugo 25.11. (08:26): langsam deutlich kleiner, schnell grösser als bisher
        // Hugo 25.11. (08:49): wie ein Finger durchs Wasser – am Finger spitz und schmal, dahinter breitet sich die Welle aus.
        // Breite, Einblenden und Abklingen nach dem Alter der jeweiligen Stelle der Bahn (vorher: Alter der ganzen Welle)
        '    bool fW = uB[k].w > 0.0;',
        '    float gk = fW ? clamp(sm, 0.05, 1.35) : 1.0, gA = fW ? mix(0.2, 1.2, gk) : 1.0;',
        '    float wk = fW ? mx * min(0.006 + 0.032 * sa, 0.072) * mix(0.32, 1.35, gk) : w;',
        '    float gD = fW ? mix(0.12, 1.25, gk * gk) : 1.0;',   // Verzerrung des Bildes: kleine Welle deutlich weniger als die stärkste
        '    float x = best / wk;',
        // Andock-Welle (uB.w < 0): setzt sofort mit voller Kraft ein und klingt schneller ab (Hugo 23.11.: Snap, Wow)
        '    bool dockW = uB[k].w < 0.0;',
        // Hugo 24.11. (10:13): die Fingerwelle wischt den Andock-Effekt entlang ihres Weges weg (Fingerwellen kommen in der
        // Liste zuerst, die Andock-Welle zuletzt – so ist «wipe» hier schon bekannt)
        '    if (!dockW) wipe = max(wipe, (1.0 - smoothstep(-1.2, 0.3, x)) * smoothstep(0.0, 0.15, age));',
        '    float kD = dockW ? (1.0 - wipe) * uKeep * uDA : 1.0;',   // Rand und Welle des Andockens: uDA
        '    float env = exp(-x * x) * (dockW ? smoothstep(0.0, mix(0.03, 0.6, uSoft), age) : smoothstep(0.0, 0.14, sa)) * kD;',   // Schimmer (Hugo 24.11., 18:19): ohne Aufprall, weich
        '    float amp = dockW ? exp(-age * 0.6) : exp(-sa * 0.45);',   // Andocken: wirkt länger nach
        // Hugo 23.11.: keine Streifen in der Welle — die Verschiebung wächst mit der Wellenbreite, so dass sich das Foto
        // nie überschlägt (vorher wurde es in der Mitte der schmalen Welle über sich selbst gezogen)
        '    off += dir * (-x * env * amp * smoothstep(0.0, wk, sd)) * wk * 0.7 * gD * (uB[k].w > 0.0 ? 1.0 : 2.0 * (1.0 + 0.6 * uSoft));',   // Hugo 24.11. (18:26): Schimmer – Bild bewegt sich etwas mehr   // Hugo 24.11. (14:08): Sonnenwelle verzieht das Bild stärker   // Andocken: kräftiger
        '    float r = env * amp * gA; ring = 1.0 - (1.0 - ring) * (1.0 - min(r, 1.0)); rs += r; ph += r * x;',
        '    rbA += r * (0.5 + 0.5 * cos(6.2832 * (sv * 1.6 + x * 0.06 + uHue[k] * 0.15 + vec3(0.0, 0.33, 0.67))));',
        // Hugo 23.11.: am Bildschirmrand stärker; hat die Welle den Rand erreicht, leuchtet er nach und verblasst nach rund 4 s
        '    edge = max(edge, exp(-max(x, 0.0) * max(x, 0.0)) * exp(-max(-x, 0.0) * 0.12) * smoothstep(0.0, 0.35, age) * exp(-age * 0.3) * (1.0 - smoothstep(3.6, 5.6, age)) * exp(-max(e, 0.0) * max(e, 0.0) / 560.0) * (uB[k].w > 0.0 ? gA : 0.35) * kD);',   // Andock-Welle: Rand leuchtet nur leicht mit,
        '    float on = smoothstep(0.0, dockW ? 0.03 : 0.35, age) * (dockW ? exp(-age * 0.4) * (1.0 - smoothstep(3.2, 6.2, age)) : amp) * kD;',   // Hugo 24.11.: blendet weich bis ganz aus, bevor die Welle endet   // Flares gleiten am Rand langsam nach
        '    halo = 1.0 - (1.0 - halo) * (1.0 - exp(-x * x / 9.0) * on * gA);',
        '    vec4 p0 = uP[k * ' + PW + ']; if (p0.w > 0.0) { vec2 d0 = (fc - p0.xy) / (mx * 0.22); org = max(org, exp(-dot(d0, d0)) * on); }',   // Hugo 24.11. (14:27): Start der Sonnenwelle nicht so wuchtig
        '    float fs = uHue[k] * 17.0;',
        '    float xo = max(x, 0.0);',
        '    vec2 dn = dot(dir, dir) > 1e-5 ? normalize(dir) : vec2(1.0, 0.0);',
        // Hugo 24.11.: Andock-Flares mit eigener Richtung – jede Stelle der Front neigt ihre Flares anders (langsam
        // wanderndes Feld); so laufen sie schräg, kreuzen sich und fliessen weiter ineinander, statt alle zur Mitte zu zeigen
        '    float lean = (n2(dn * 1.7 + vec2(fs + 3.0, uT * 0.07)) - 0.5) * 2.6;',
        // Hugo 24.11.: magnetisches Spiel ohne Mittelpunkt – eine Flare biegt weg von der stärkeren Nachbarin (die
        // stärkere drückt die schwächere zur Seite, sie verschmelzen und laufen in neuer Richtung weiter); je weiter
        // ins Bild, desto mehr drehen sie seitlich ab, so sammeln sie sich nie in einem Punkt in der Mitte
        '    vec2 dnL = vec2(dn.x * 0.97 + dn.y * 0.25, -dn.x * 0.25 + dn.y * 0.97), dnR = vec2(dn.x * 0.97 - dn.y * 0.25, dn.x * 0.25 + dn.y * 0.97);',
        '    float push = dockW ? n2(dnR * 1.7 + vec2(fs, uT * 0.3)) - n2(dnL * 1.7 + vec2(fs, uT * 0.3)) : 0.0;',
        '    float ra = dockW ? min(xo, 5.0) * (0.42 * lean - 1.1 * push + 0.22 * sin(uT * 0.9 + fs + dn.x * 3.0)) : xo * 0.22 * sin(uT * 0.6 + fs);',
        '    vec2 cs = vec2(dn.x * cos(ra) - dn.y * sin(ra), dn.x * sin(ra) + dn.y * cos(ra)) * 3.4;',   // mehr Flares rundherum (vorher 2.2)
        // Andocken (Hugo 23.11.): weniger Flares, dafür kräftiger und weissgolden
        '    float fl = dockW ? pow(n2(cs * 0.6 + vec2(fs, uT * 0.3)), 5.0) * 1.7 : pow(n2(cs + vec2(fs, uT * 0.3)), 2.8);',   // Hugo 24.11.: schlanke, klare Zungen statt verschwommen
        '    float ln = (0.5 + fl * (4.2 + 2.6 * n2(cs * 1.7 + vec2(uT * 0.8, fs)))) * (dockW ? 1.35 : 1.0);',   // Hugo 24.11.: Andocken – weniger, dafür grösser   // Hugo 23.11.: kleinere Flares an der Welle
        '    float fv = 1.05 * (1.0 + 0.8 * exp(-age * 1.2)) * fl * smoothstep(-0.3, 0.5, x) * exp(-xo * xo / ln) * on * smoothstep(dockW ? 0.0 : 0.05, dockW ? mix(0.06, 0.6, uSoft) : 0.25, age) * smoothstep(wk * 0.3, wk * 1.1, sd) * gA',
        '      * (dockW ? 1.0 - smoothstep(0.1, 0.24, xo * w / min(uRes.x, uRes.y)) : 1.0);',   // Hugo 24.11.: die kleinen Flares bleiben am Rand; die grossen sind die Flare-Fäden (siehe unten)
        '    if (dockW) faD = max(faD, fv * uDF / max(uDA, 0.01) * (1.0 - 0.6 * uSoft)); else fa = max(fa, fv);',   // Flares des Andockens: uDF (Hugo 24.11., 15:16: Flares ja, Rand wenig)   // Hugo 23.11.: schon die erste Welle trägt Flares, sie reiten auf der Front (kein Stern am Startpunkt)
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
        '    float flash = uSoft > 0.5 ? smoothstep(0.0, 0.8, et) * 0.75 * exp(-et * 0.3) : 1.9 * uImp * exp(-et * 3.2) + 0.75 * exp(-et * 0.3);',   // Hugo 24.11. (18:19): Schimmer = Ladeanimation ohne den Aufprall – das Nachleuchten blendet weich ein   // uImp: Computer minimal schwächerer Aufprall (Hugo 24.11.)   // Hugo 24.11.: Aufleuchten etwas höher, Nachleuchten mehr   // Hugo 23.11.: Andocken wieder wichtiger – kräftiger Schlag   // Hugo 23.11.: grosse bunte Welle beim Andocken
        '    float band = exp(-max(e, 0.0) * max(e, 0.0) / 560.0);',
        '    vec2 ca = normalize(fc - uRes * 0.5 + vec2(0.001)); float ang = atan(ca.y, ca.x) / 6.2832;',
        '    vec3 erb = 0.5 + 0.5 * cos(6.2832 * (ang * 2.0 + uT * 0.06 + vec3(0.0, 0.33, 0.67)));',
        '    float egm = smoothstep(0.3, 0.7, n2(ca * 3.0 + vec2(uT * 0.08, 5.0)));',
        '    vec3 ecol = mix(erb, vec3(1.0, 0.8, 0.48), 0.15 + 0.3 * egm);',   // satter bunt
        // Hugo 23.11.: kein gleichmässiger Bilderrahmen – das Bunte am Rand ist mal stärker, mal kaum da, und wandert
        '    float patch = 0.08 + 1.1 * smoothstep(0.42, 0.8, n2(ca * 3.2 + vec2(uT * 0.13, -uT * 0.09) + 7.0));',   // einzelne Stellen statt Rahmen
        '    float bw = mix(0.7 + 0.6 * n2(ca * 4.0 + vec2(-uT * 0.1, 2.0)), 0.35 + 1.4 * n2(ca * 5.0 + vec2(-uT * 0.1, 2.0)), uDesk);',   // Computer: Breite stark wechselnd
        '    band = exp(-max(e, 0.0) * max(e, 0.0) / (950.0 * bw * bw)) + 0.5 * exp(-max(e, 0.0) / (mx * 0.08)) * exp(-et * 1.5);',
        '    eacc = ecol * band * flash * 0.85 * (1.0 + 0.7 * uSoft) * mix(1.0, patch, max(smoothstep(0.15, 0.7, et), 0.8 * uDesk));',   // Computer: von Anfang an ungleich (kein Rahmen)   // Hugo 24.11.: beim Aufprall rundherum kräftig bunt, danach ungleich   // von Anfang an ungleich
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
        '      float kSo = 1.0 - uSoft; vB *= kSo; vC *= kSo;',   // Hugo 24.11. (18:22): Schimmer – nur eine Schar Flare-Fäden (sonst manchmal fünf auf einmal)
        '      float sv = vA + vB + vC; sv = 1.1 * (1.0 - exp(-sv / 1.1));',   // Hugo 24.11.: beim Verschmelzen heller Strang, keine weisse Fläche   // wo sie sich treffen: weich verschmelzen statt aufaddieren
        '      float wfc = 0.04 + 0.13 * (1.0 - exp(-et * 1.8)), dw = (ee / mnS - wfc) / 0.07;',
        '      float sb = max(1.0 - smoothstep(0.03, 0.3, ee / mnS), 0.85 * exp(-dw * dw));',
        '      faD += sv * (1.0 - 0.7 * sb) * 1.3;',
        '      eacc += mix(ecol, vec3(1.0, 0.82, 0.55), 0.3) * sv * sb * 0.6 + (tA + (tB + tC * 0.75) * kSo) * 0.6 * (1.0 - sb);',
        '    }',
        // Andocken bringt das Bild zum Wabbern (Hugo 23.11.): vom Rand laufen weiche Wellen nach innen, unter den Flares
        // stärker; Verschiebung klein genug, dass sich das Foto nie überschlägt
        '    float kE = (1.0 - wipe) * uKeep; faD *= kE * uDF; eacc *= kE * uDA * uRim; fI *= kE * uDF;',   // Hugo 24.11. (14:29): beim Schliessen nur der Rand (uDA), keine Flares (uDF)   // weggewischt bzw. nach dem ersten Wischen ganz aus
        '    vec2 wxy = vec2(exp(-ed.x / 18.0) * sign(uRes.x * 0.5 - fc.x), exp(-ed.y / 18.0) * sign(uRes.y * 0.5 - fc.y));',
        '    vec2 nin = wxy / max(length(wxy), 1e-4);',
        '    float wa = (exp(-max(e, 0.0) / (mx * 0.12)) * (0.6 * exp(-et * 1.2) + 0.4 * exp(-et * 0.35)) * 0.4 + min(fI, 1.2) * 0.9) * fade * kE;',
        '    float wph = max(e, 0.0) * 0.07 - et * 3.2 + 2.0 * n2(ca * 4.0 + vec2(et * 0.3, 1.0));',
        '    off += (nin * sin(wph) + vec2(-nin.y, nin.x) * 0.5 * cos(wph * 0.7 + 1.3)) * wa * mx * 0.009 * smoothstep(0.0, mix(0.25, 0.8, uSoft), et) * (1.0 + 0.6 * uSoft);',
        '  }',
        '  vec3 col = vec3(0.0), base = vec3(0.0); float al = 0.0, here = 0.0, alD = 0.0;',
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
        '    al = smoothstep(0.15, 1.0, length(off)) * here; col = img * al; alD = al;',
        '  }',
        '  float fm = smoothstep(0.35, 0.85, sv);',                                    // breite Sonnenzellen
        '  edge *= (1.0 - uEdgeOff) * uWE;',
        '  fa *= uWF; halo *= uWL; ring *= uWL;',   // Hugo 25.11.: Licht der Fingerwelle zurückgenommen   // Hugo 24.11. (15:39): beim Öffnen leuchtet die Welle am Bildschirmrand nicht auf (nicht im Blitz sichtbar)
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
        '  gc += (h2(fc * 1.37) - 0.5) / 255.0;',
        // Hugo 24.11. (16:41): kein Ausblenden am Rand mehr (sah aus wie ein unsichtbarer Rahmen); der helle Strich oben am
        // iPhone kam von der Schimmerwelle, die knapp am Rand lag – sie startet jetzt ausserhalb des Bildschirms (siehe dock)
                                      // gegen Farbstufen im Verlauf
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
        // Hugo 24.11. (15:19): über der weissen Sonne wäre addiertes Licht unsichtbar (Weiss + Licht = Weiss) – die Welle
        // verschwand darum abrupt, sobald das Foto weg war. Hier als Farbe auf Weiss (Prisma), sie klingt weich in der Sonne aus
        '    if (uTint > 0.0) { float mR = max(cR.r, max(cR.g, cR.b)); vec3 tc = mR > 1e-3 ? cR / mR : vec3(1.0); tc = clamp(mix(vec3(dot(tc, vec3(0.333))), tc, 1.1), 0.0, 1.0) * 0.95; float ta = clamp(mR * 0.3, 0.0, 0.22); cR = mix(cR, tc * ta, uTint); aR = mix(aR, ta, uTint); }',
        '    vec3 cD = al > 1e-4 ? col * (alD / al) : vec3(0.0);',   // Hugo 24.11. (15:16): über der Sonne nur das verschobene Foto der Welle zeigen (sonst stand am Rand ein dunkler Rahmen)
        '    col = mix(cR, cD, uFade); al = mix(aR, alD, uFade);',
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
      var U = {}; ['uRim', 'uSoft', 'uEdgeOff', 'uTint', 'uDA', 'uDF', 'uFade', 'uWL', 'uWE', 'uWF', 'uRes', 'uDpr', 'uP', 'uAge', 'uHue', 'uB', 'uT', 'uEdgeT', 'uSeed', 'uKeep', 'uImp', 'uDesk', 'uImg', 'uHas', 'uRect', 'uCrop'].forEach(function (k) { U[k] = c.getUniformLocation(p, k); });
      c.enable(c.BLEND); c.blendFunc(c.ONE, c.ONE_MINUS_SRC_ALPHA);
      var tex = c.createTexture(); c.bindTexture(c.TEXTURE_2D, tex);
      c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MIN_FILTER, c.LINEAR); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MAG_FILTER, c.LINEAR);
      c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_S, c.CLAMP_TO_EDGE); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_T, c.CLAMP_TO_EDGE);
      c.uniform1i(U.uImg, 0);
      var cache = {};   // Bilder für den Effekt (eigene Kopien mit CORS; klappt das nicht, gibt es nur den Regenbogen)
      // Computer: Leinwand über der ganzen Bühne (über den Bildern, unter Titeln und Textspalte)
      function sm01(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
      function deskCanvas() {
        if (cv.parentNode !== stage) stage.appendChild(cv);
        cv.style.zIndex = '4';
      }
      var comp = document.createElement('canvas'), cctx = comp.getContext('2d'), compSig = '', compOk = false, compCrop = null;
      function srcOf(img) { return img && (img.currentSrc || img.src); }
      function loadAll() {
        slides.forEach(function (sl) {
          var src = srcOf(sl.img); if (!src || cache[src]) return;
          var e = cache[src] = { im: new Image(), ok: false };
          e.im.crossOrigin = 'anonymous'; e.im.onload = function () {
            // verkleinerte Kopie (höchstens 1400 px): das Neuzeichnen beim Eintauchen und Zurückzoomen geht so viel schneller
            try { var nw = e.im.naturalWidth, nh = e.im.naturalHeight, k = Math.min(1, 1400 / Math.max(nw, nh)); if (k < 1) { var sc0 = document.createElement('canvas'); sc0.width = Math.round(nw * k); sc0.height = Math.round(nh * k); sc0.getContext('2d').drawImage(e.im, 0, 0, sc0.width, sc0.height); e.sm = sc0; } } catch (er) {}
            e.ok = true; compSig = '';
          }; e.im.src = src;
        });
      }
      // alle sichtbaren Spalten (object-fit: cover, wie im Browser) in ein Bild zeichnen und als Textur hochladen;
      // neu nur, wenn sich etwas bewegt hat (Aufprall, Hover am Rand)
      function compTex(sr) {
        // Hugo 24.11. (15:37): beim Eintauchen folgt die Textur dem gezoomten Bild (eingefroren zeigte die Welle das Bild in
        // alter Grösse über dem gezoomten – doppeltes Bild).
        // Audit 24.11. (Akku): dafür wird das Bild nicht mehr in jedem Bild neu gezeichnet und hochgeladen, sondern einmal
        // ungezoomt (in höherer Auflösung, gleich scharf) – den Zoom übernimmt die Grafikkarte über den Ausschnitt (uCrop)
        if (!cctx) return false;
        loadAll();
        var dvS = null, nVis = 0;
        if (!desk) slides.forEach(function (sl) { if (sl.vis) { nVis++; if (sl.dv && sl.dv.k > 1.0001 && sl.media) dvS = sl; } });
        if (nVis !== 1) dvS = null;   // nur wenn das eintauchende Bild allein zu sehen ist (sonst wie bisher)
        var dk = 1, qx = 0, qy = 0;
        if (dvS) {
          var mr = dvS.media.getBoundingClientRect();
          dk = dvS.dv.k; qx = mr.left + mr.width / 2 + dk * dvS.dv.px; qy = mr.top + mr.height / 2 + dk * dvS.dv.py;   // Zoom-Mittelpunkt
          compCrop = [(qx - sr.left) / sr.width * (1 - 1 / dk), (qy - sr.top) / sr.height * (1 - 1 / dk), 1 / dk, 1 / dk];
        } else compCrop = null;
        var sc = desk ? 1 : Math.min(1.5, window.devicePixelRatio || 1) * (dvS ? CONFIG.diveZoom : 1), cw2 = Math.round(sr.width * sc), ch2 = Math.round(sr.height * sc);
        var parts = [], sig = cw2 + 'x' + ch2;
        slides.forEach(function (sl) {
          if (!desk && !sl.vis) return;
          var e = cache[srcOf(sl.img)]; if (!e || !e.ok) { sig += '|-'; return; }
          var ir = sl.img.getBoundingClientRect(), er = sl.el.getBoundingClientRect(), z = parseFloat(sl.el.style.zIndex) || 0;
          if (sl === dvS) ir = { left: qx + (ir.left - qx) / dk, top: qy + (ir.top - qy) / dk, width: ir.width / dk, height: ir.height / dk };   // wie ohne Zoom
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
          var srcI = p.e.sm || p.e.im, iw = p.e.sm ? p.e.sm.width : (p.e.im.naturalWidth || 1), ih = p.e.sm ? p.e.sm.height : (p.e.im.naturalHeight || 1), ra = p.ir.width / Math.max(1, p.ir.height), ia = iw / ih;
          var sw = iw, sh = ih; if (ia > ra) sw = ih * ra; else sh = iw / ra;
          var op = objPos(p.im), sx = (iw - sw) * op[0], sy = (ih - sh) * op[1];
          cctx.save();
          // Hugo 24.11.: Ausschnitt auf ganze Pixel runden und an den Bühnenrändern bis zur Kante ziehen – sonst bleibt am
          // unteren Rand eine halbe schwarze Zeile, die der Effekt als dunkle farbige Linie zeigt
          var cx0 = (p.er.left - sr.left) * sc, cy0 = (p.er.top - sr.top) * sc, cx1 = cx0 + p.er.width * sc, cy1 = cy0 + p.er.height * sc;
          cx0 = cx0 < 2 ? 0 : Math.floor(cx0); cy0 = cy0 < 2 ? 0 : Math.floor(cy0);
          cx1 = cx1 > cw2 - 2 ? cw2 : Math.ceil(cx1); cy1 = cy1 > ch2 - 2 ? ch2 : Math.ceil(cy1);
          cctx.beginPath(); cctx.rect(cx0, cy0, cx1 - cx0, cy1 - cy0); cctx.clip();
          cctx.drawImage(srcI, sx, sy, sw, sh, (p.ir.left - sr.left) * sc, (p.ir.top - sr.top) * sc, p.ir.width * sc, p.ir.height * sc);
          // Hugo 24.11. (13:11): die Textspalte ist durchsichtig über der weissen Wand – für die Welle ist sie darum weiss
          // (sonst zieht die Welle Schwarz in die Spalte)
          if (p.sd) { cctx.fillStyle = '#fff'; cctx.fillRect((p.sd.left - sr.left) * sc, (p.sd.top - sr.top) * sc, p.sd.width * sc, p.sd.height * sc); }
          cctx.restore();
        });
        try { c.bindTexture(c.TEXTURE_2D, tex); c.texImage2D(c.TEXTURE_2D, 0, c.RGB, c.RGB, c.UNSIGNED_BYTE, comp); compOk = parts.length > 0; }
        catch (er) { compOk = false; }
        return compOk;
      }
      function objPos(im) {
        var op = (getComputedStyle(im).objectPosition || '50% 50%').split(' ');
        function pc(v) { return /%$/.test(v) ? parseFloat(v) / 100 : 0.5; }
        return [pc(op[0]), pc(op[1] || op[0])];
      }
      var waves = [], buf = new Float32Array(NP * 4), ages = new Float32Array(NW), hues = new Float32Array(NW), bnd = new Float32Array(NW * 4), raf = 0, regAt = -1, LIFE = 6.5, edgeT0 = 0, edgeSeed = 0, killT0 = 0, slowEma = 16, lastT = 0;
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
        // Hugo 25.11. (08:10): Tempo des Fingers (geglättet) → Stärke dieses Punkts (m): langsam ruhig, schnell kräftig
        if (wv.px != null) {
          var dtm = Math.max(4, now - wv.pt), v = Math.hypot(x - wv.px, y - wv.py) / dtm;
          wv.v = wv.v == null ? v : wv.v * 0.65 + v * 0.35;
        }
        wv.px = x; wv.py = y; wv.pt = now;
        var sk = desk ? Math.pow(sm01(CONFIG.waveSlowDesk, CONFIG.waveFastDesk, wv.v || 0), CONFIG.waveCurveDesk) : sm01(CONFIG.waveSlow, CONFIG.waveFast, wv.v || 0);
        var mStr = CONFIG.waveCalm + (1 - CONFIG.waveCalm) * sk;
        if (desk) mStr += CONFIG.waveBoostDesk * sm01(CONFIG.waveFastDesk, CONFIG.waveTopDesk, wv.v || 0);   // ganz schnell: über die Grenze
        if (wv.v != null && !wv.vk) { wv.vk = true; if (pts[0]) pts[0].m = mStr; }   // der erste Punkt kannte das Tempo noch nicht
        if (!last) { pts.push({ x: x, y: y, t: now, m: mStr }); wv.sp = 14; }
        else {
          var fixed = last.tip ? pts[pts.length - 2] : last;
          if (last.tip && Math.hypot(fixed.x - x, fixed.y - y) < wv.sp) { last.x = x; last.y = y; last.t = now; last.m = mStr; }
          else {
            if (last.tip) last.tip = false;
            if (pts.length >= PW) {
              var keep = [pts[0]];
              for (var m = 1; m < pts.length - 1; m++) if (m % 2 === 0) keep.push(pts[m]);
              keep.push(pts[pts.length - 1]); wv.pts = pts = keep; wv.sp *= 2;
            }
            pts.push({ x: x, y: y, t: now, tip: true, m: mStr });
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
        // Hugo 24.11. (15:20): während die Sonne einblendet, liegt die Welle normal (mit Foto) UNTER ihr und blendet mit dem
        // Bild aus – keine Foto-Fetzen auf dem Weiss mehr. Danach liegt sie darüber und erscheint weich als Prisma-Licht.
        var lf = lightFade(now);
        if (lightMode) { if (cv.parentNode !== root) root.appendChild(cv); cv.style.zIndex = shimOn ? '9' : '2'; }   // Hugo 24.11. (15:41): die Tippwelle bleibt immer unter der Sonne – sie verschwindet weich mit dem Einblenden und ist danach nicht mehr zu sehen
        else if (desk) deskCanvas(); else if (cv.parentNode) cv.parentNode.removeChild(cv);
        var sr = refRect();
        var w = Math.max(1, Math.round(sr.width)), h = Math.max(1, Math.round(sr.height));
        // volle Bildschirmschärfe (Hugo 23.11.: vorher halbe Auflösung → das verschobene Foto wirkte unscharf und durchsichtig)
        // passt sich an: wird ein Gerät zu langsam, rechnet die Welle etwas gröber (flüssig geht vor)
        if (lastT && now - lastT < 200) {
          slowEma = slowEma * 0.85 + (now - lastT) * 0.15;
          if (slowEma > 21 && dprCap > 0.6) { dprCap = Math.max(0.6, dprCap - (dprCap > 1 ? 0.5 : 0.2)); slowEma = 16; }
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
        if ((!lightMode || lf > 0.001) && compTex(sr)) {   // Licht-Modus: die Welle zeigt nur Licht, keine Bildtextur nötig (weniger Rechenarbeit)
          c.uniform4f(U.uRect, 0, 0, w, h); if (compCrop) c.uniform4f(U.uCrop, compCrop[0], compCrop[1], compCrop[2], compCrop[3]); else c.uniform4f(U.uCrop, 0, 0, 1, 1); c.uniform1f(U.uHas, 1);
        } else c.uniform1f(U.uHas, 0);
        c.uniform2f(U.uRes, w, h); c.uniform1f(U.uDpr, pw / w); c.uniform4fv(U.uP, buf); c.uniform1fv(U.uAge, ages); c.uniform1fv(U.uHue, hues); c.uniform4fv(U.uB, bnd); c.uniform1f(U.uT, (now / 1000) % 1000);
        var et = edgeT0 ? (now - edgeT0) / 1000 : -1; if (et > 7.2) { edgeT0 = 0; et = -1; } c.uniform1f(U.uEdgeT, et); c.uniform1f(U.uSeed, edgeSeed);
        // nach dem ersten Wischen klingt der ganze Andock-Effekt in 1.5–3 s aus (auch was nicht überstrichen wurde)
        c.uniform1f(U.uImp, desk ? 0.8 : 1); c.uniform1f(U.uSoft, dockSoft); c.uniform1f(U.uDesk, desk ? 1 : 0); c.uniform1f(U.uFade, lightMode && lf <= 0.001 ? 0 : 1); c.uniform1f(U.uTint, lightMode && shimOn ? 1 : 0); c.uniform1f(U.uDA, dockAmt); c.uniform1f(U.uDF, dockFl); c.uniform1f(U.uWL, CONFIG.waveLight); c.uniform1f(U.uWE, CONFIG.waveEdge); c.uniform1f(U.uWF, CONFIG.waveFlares); c.uniform1f(U.uEdgeOff, edgeOffV(now)); c.uniform1f(U.uRim, dockRim);   // Hugo 24.11. (15:25): Prisma zart und klingt bald aus
        c.uniform1f(U.uKeep, killT0 ? 1 - sm01(1.5, 3.0, (now - killT0) / 1000) : 1); if (!edgeT0) killT0 = 0;
        c.clearColor(0, 0, 0, 0); c.clear(c.COLOR_BUFFER_BIT);
        var on = waves.length || edgeT0;
        if (pendingOff && !on) lightOff();
        if (on) c.drawArrays(c.TRIANGLE_STRIP, 0, 4);
        if (!desk) showFx(sr, pw, ph, on && !lightMode);
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
        if (!mWave || !wv || wv.sp2 < 0 || now - mWave > 350) { noEdge = false; if (pendingOff) lightOff(); waves.push({ t0: now, pts: [] }); if (waves.length > NW) dropOld(); if (edgeT0 && !killT0) killT0 = now; }
        mWave = now; add(e.clientX, e.clientY);
      });
      // Andocken nach dem Laden (Hugo 23.11.): Licht mit grossen Flares läuft den Rand entlang (keine Welle aus der Mitte)
      var dockAmt = 1, dockFl = 1, dockRim = 1, dockSoft = 0;
      function dock(amt, fl, clr, rim, soft) {
        dockAmt = amt == null ? 1 : amt; dockFl = fl == null ? dockAmt : fl; dockRim = rim == null ? 1 : rim; dockSoft = soft ? 1 : 0; killT0 = 0;
        // Hugo 24.11. (14:35): beim Schliessen die alten Wellen (Tippen, Sonnenwelle) weg – sie lagen unter dem Licht und
        // wischten das Leuchten des Rands noch bis zu 6.5 s weg (darum kam es verzögert, wenn man früh schloss)
        if (fl === 0 || clr) waves = [];
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
        if (dockFl > 0) ring(0, 6, 0.2);   // Hugo 23.11.: nur eine Explosion nach innen
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
      var lightMode = false, lightT0 = 0, shimOn = false;
      // Hugo 24.11. (15:48): nach dem Blitz beim Öffnen derselbe Schimmer wie nach dem close (Andocken mit Flares, schwacher
      // Rand), hier über der Sonne als Farbe auf Weiss; die Tippwelle selbst bleibt darunter (kein Ring)
      // Hugo 24.11. (15:54): statt den Rand aufleuchten zu lassen, läuft der Schimmer als Bewegung von der Lichtquelle
      // (Tippstelle bzw. Maus) bis an den Rand, wie eine Fingerwelle mit Flares – ohne Leuchten am Rand
      // Hugo 24.11. (16:00): wie die Welle eines Fingers – eine kurze, leicht gewundene Bahn (organische Form statt Kreis),
      // Punkt für Punkt nacheinander gezogen, im Tempo der Fingerwelle
      // close (Hugo 24.11., 16:01): dieselbe organische Fingerwelle auf der zurückkommenden Seite, ohne Rand-Leuchten
      // Hugo 24.11. (16:02): Öffnen und Schliessen – nur der Schimmer mit Solar Flares (wie nach dem close), kein Kreis,
      // kein Leuchten am Rand
      // Hugo 24.11. (16:15): ohne Rand-Leuchten (am iPhone sah man oben eine Lichtlinie)
      cv.flareShimmer = function (over) { if (!over) lightOff(); else shimOn = true; dock(CONFIG.shimAmt, CONFIG.shimAmt, true, 1, true); noEdge = true; };   // Hugo 24.11. (16:09/18:19): genau die Ladeanimation, halb so stark, ohne den Aufprall
      var noEdge = false;   // close-Welle: kein Nachleuchten am Rand (Hugo 24.11., 16:01)
      function edgeOffV(now) { return noEdge ? 1 : lightMode && !pendingOff ? smoothstep(0, 0.25, (now - lightT0) / 1000) : 0; }
      cv.tint = function (v) { if (!v) shimOn = false; if (!raf) req(); };
      // Hugo 24.11. (15:12): weicher – das Foto in der Welle blendet über die Dauer des Übergangs aus (vorher auf einen Schlag),
      // und die Welle liegt über dem Licht der Blendung (sonst verschwand sie abrupt im Weiss)
      function lightFade(now) { return lightMode ? 1 - smoothstep(0, CONFIG.deskSunFade / 1000, (now - lightT0) / 1000) : 1; }
      // Hugo 24.11. (15:19): nach dem close nicht sofort zurückschalten – der Wechsel vom Licht zur Bild-Darstellung machte das
      // Bild mitten im Schimmer kurz dunkler (und die Textur musste neu geladen werden, Ruckler). Erst wenn nichts mehr läuft
      // oder eine neue Welle beginnt
      var pendingOff = false;
      function lightOff() { pendingOff = false; lightMode = false; shimOn = false; if (cv.parentNode === root) { cv.parentNode.removeChild(cv); cv.style.zIndex = ''; } }
      cv.lightOnly = function (on) { if (on) { pendingOff = false; if (!lightMode) lightT0 = performance.now(); lightMode = true; } else if (lightMode) pendingOff = true; if (!raf) req(); };
      cv.dropTap = function () { var now = performance.now(); waves = waves.filter(function (q) { return q.sp2 || now - q.t0 > 800 || q.pts.length > 3; }); };
      try { loadAll(); } catch (e) {}   // Hugo 24.11.: Bilder für den Effekt schon beim Laden holen (nicht erst beim Aufprall – sonst Ruckler)
      // eine Berührung = eine Welle (neue Berührung beginnt eine neue)
      stage.addEventListener('touchstart', function (e) {
        if (!ok() || !e.touches[0] || e.touches.length > 1) return;
        var t = e.touches[0];
        noEdge = false;
        if (pendingOff) lightOff();
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
            // Hugo 25.11. (08:26): Magnet am Computer stärker – bremst schon bei 71 % ab, der Magnet zieht den Rest kräftiger und schneller
            E = 0.71 * easeDockF(Math.min(1, xM / 0.98), easeDockM, 1.4) + 0.29 * Math.pow(clamp((xL - 0.65) / 0.23, 0, 1), 6.2);   // Hugo 24.11.: weiter weg (79 %), Zug nimmt schneller Schwung auf   // Hugo 24.11.: mehr Schwung beim Zug (Potenz 6.2, etwas kürzer)   // Hugo 24.11.: Übergang Abbremsen → Magnet minimal länger; Magnet setzt weicher ein (Potenz 5 statt 6.5)   // Hugo 24.11.: Magnet am Computer stärker (bremst bei 78 % statt 84 %)
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
          var tfs = (Math.round(iw * CONFIG.deskTitle * 100 / maxTw * 2) / 2).toFixed(1) + 'px';   // halbe Pixel: weniger Neu-Setzen der Schrift pro Bild
          if (s.title.style.fontSize !== tfs) s.title.style.fontSize = tfs;
        }
        s.side.style.width = Math.max(0, sw).toFixed(2) + 'px';
        s.sideIn.style.width = SW.toFixed(2) + 'px';
        var sop = clamp((s.o - CONFIG.deskTextFrom) / CONFIG.deskTextSpan, 0, 1);   // Hugo 11:00: Text blendet schneller ein (vorher ab 45 % offen, über 40 %)
        var sos = sop.toFixed(3); if (s.sideIn.style.opacity !== sos) s.sideIn.style.opacity = sos;
        if (s.sideLink) { if (sop > 0.02 && !s.goShown) { s.goShown = true; goArm(s.sideLink, 60 + CONFIG.goDelay); } else if (sop <= 0) s.goShown = false; }   // Spalte geht auf: Knopf schreibt sich ein
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

    // Hugo 11:17: Übergang zur Galerie schneller – nach dem Einflug die Galerien still im Hintergrund vorladen
    // (Computer: alle drei nacheinander; Handy: die des gezeigten Bereichs), jeweils in einer ruhigen Lücke
    var warmAllDone = false;
    function warmAfterIntro() {
      if (warmAllDone) return; warmAllDone = true;
      setTimeout(function () {
        var list = desk ? slides.map(function (s) { return s.href; }) : [slides[current()] && slides[current()].href];
        (function next(i) { if (i >= list.length) return; idle(function () { warmGallery(list[i]); setTimeout(function () { next(i + 1); }, 900); }); })(0);
      }, CONFIG.warmAfter);
    }
    function endIntro() {
      warmAfterIntro();
      introOn = false;
      if (LD) LD.dock();
      clearInline();
      root.classList.remove('hp-run');
      fitTitles();
      mbShow();
      dsunWall();
    }
    // ---------- Zurück aus der Galerie (Hugo 25.11., 09:29) ----------
    // Die Galerie schaltet ab wie ein Röhren-TV und der Lichtpunkt geht dort aus. Hier keine Ladeanimation: Die Seite
    // bleibt schwarz, bis die Bilder bereit sind, dann blenden sie ein, beim Bild des Bereichs (hp-return).
    // Computer: die Bilder gleiten stufenweise von links nach rechts weich seitlich herein. Handy: aus dem Schwarz faden.
    // Seiten-Head: html.hp-backin versteckt [data-hp], bis dieser Code übernimmt.
    var backIn = false;
    try { backIn = html.classList.contains('hp-backin') || !!sessionStorage.getItem('hp-backin'); sessionStorage.removeItem('hp-backin'); } catch (e) {}
    function backFade() {
      var go = function () {
        if (go.done) return; go.done = true;
        html.classList.remove('hp-backin');
        var free = function () { backHold = false; dsunWall(); };
        if (reduce || !root.animate) { free(); return; }
        setTimeout(free, desk ? 80 + slides.length * 140 + 1100 : 1000);
        // Hugo 09:42: jedes Bild bleibt in seiner eigenen Spalte (vorher glitt Creator kurz über Alchemist). Die Spalte
        // selbst bewegt sich nicht und schneidet ab (clip-path), nur ihr Inhalt gleitet darin seitlich herein.
        if (desk) slides.forEach(function (s, i) {
          var o = { duration: 1000, delay: 80 + i * 140, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' };
          s.el.animate([{ opacity: 0, clipPath: 'inset(0)' }, { opacity: 1, clipPath: 'inset(0)' }], o);
          [].forEach.call(s.el.children, function (c) { c.animate([{ translate: '-26px 0', scale: '1.22' }, { translate: '0 0', scale: '1' }], o); });   // etwas grösser am Start, damit rechts keine schwarze Lücke entsteht
        });
        else root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: 'cubic-bezier(.33,0,.2,1)' });
      };
      var imgs = slides.map(function (s) { return s.img; }).filter(Boolean);
      Promise.all(imgs.map(function (im) { return im.decode ? im.decode().catch(function () {}) : Promise.resolve(); })).then(go);
      setTimeout(go, 1200);
    }
    function startIntro() {
      // Hugo 09:36 (Video): startIntro läuft zweimal → das Einblenden begann zweimal (Bild kurz da, wieder schwarz, nochmal). Nur einmal.
      if (backIn) { backIn = false; introOn = false; backHold = true; endIntro(); render(); backFade(); return; }   // zurück aus der Galerie: einblenden statt Ladeanimation
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
    // Hugo 24.11.: Auf dem Weg zu einer Galerie (Creator, Singer, Model) schaltet die Seite ab wie ein alter Röhrenfernseher.
    // Das Bild klappt zu einer hellen Linie zusammen (Blitz am Horizont), die Linie schlägt immer schneller zu einem
    // Lichtpunkt zusammen. Der Punkt bleibt stehen, bis die Galerie da ist; dort fällt er in sich zusammen und explodiert
    // (galerie.js). Alle anderen Ziele (Alchemist → Werkstatt) wie bisher mit Überblenden.
    var CRT = {
      paths:    ['/creator', '/singer', '/model-2027'],   // Seiten mit galerie.js
      squashMs: 220,    // Bild klappt zur Linie zusammen, wird dabei heller
      lineMs:   440     // Linie schlägt zum Punkt zusammen: holt kurz Schwung nach aussen, dann immer schneller zur Mitte
    };
    // Hugo 25.11.: Linie spitz zulaufend (links und rechts wie eine Nadel), schillernd (Iridescence), zieht schwungvoll zur
    // Mitte bis zum Knall. Lichtpunkt und Knall auf der Galerie-Seite schillern in denselben Farben (galerie.js).
    // Form (Hugo 25.11., 06:45): an den Enden eine feine Nadel, zur Mitte hin wächst ein geschwungener Rücken zum Kreis.
    // Gezeichnet in 1000 × 20 und auf die Bildschirmbreite gezogen (preserveAspectRatio none).
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
    var crtFx = null;
    function crtReset() {
      if (crtFx) { crtFx.remove(); crtFx = null; }
      document.documentElement.classList.remove('hp-crt-on');
      var b = document.body;
      if (b.getAnimations) b.getAnimations().forEach(function (an) { if (an.id === 'hp-crt') an.cancel(); });
      ['transform-origin', 'visibility', 'opacity'].forEach(function (p) { b.style.removeProperty(p); });
    }
    // Zurück aus der Galerie (Seite aus dem Speicher): Röhren-TV zurücksetzen und das About sofort schliessen,
    // damit man beim Bild des Bereichs landet (Hugo 25.11., 07:20), nicht im About
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      try { sessionStorage.removeItem('hp-return'); } catch (er) {}   // nur für ein frisches Laden gedacht
      var back = !!crtFx; crtReset(); if (back) infoInstantClose();
    });
    // Hugo 25.11. (Video 06:04): Am iPhone blieb das Bild als dicker Streifen stehen, die Linie kam nie. Ursache: Die Schritte
    // liefen pro Bild im Haupt-Thread (dort rechnet auch die Sonne) und filter: brightness auf der ganzen Seite ist teuer.
    // Jetzt laufen alle Teile als Web-Animationen (Grafikchip, auch wenn der Haupt-Thread voll ist). Heller wird es über
    // eine weisse Fläche mit Mischmodus «screen», die genau mit dem Bild zusammenklappt.
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
    // Galerie vorladen (Hugo 25.11.: «muss die Galerie im Voraus laden»): sobald ein Bereich geöffnet wird,
    // holt die Homepage die Galerie-Seite, ihr Skript und alle Titelbilder in derselben Grösse wie dort.
    // Beim Tippen auf «Galerie öffnen» ist dann alles im Speicher, der Lichtpunkt steht nur noch kurz.
    var warmed = {};
    function warmGallery(href) {
      if (!href || href === '#') return;
      var to = ''; try { to = new URL(href, location.href).pathname.replace(/\/$/, '') || '/'; } catch (er) { return; }
      if (CRT.paths.indexOf(to) < 0 || warmed[to]) return;
      warmed[to] = true;
      try { var l = document.createElement('link'); l.rel = 'prefetch'; l.href = href; document.head.appendChild(l); } catch (er) {}
      fetch(href, { credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (t) { idle(function () {   // Lesen ebenfalls in einer ruhigen Lücke
        var x = new DOMParser().parseFromString(t, 'text/html');
        [].forEach.call(x.querySelectorAll('script[src*="galerie"]'), function (sc) { fetch(sc.src, { mode: 'no-cors' }).catch(function () {}); });
        // Audit 25.11.: nur die Bilder dieses Bereichs (die Seite enthält auch die der anderen, galerie.js blendet sie aus)
        var sec = x.querySelector('[data-lib]'), fold = sec && sec.getAttribute('data-lib-folder');
        [].filter.call(x.querySelectorAll('[data-lib] img.lib-img'), function (im) {
          if (!fold) return true;
          var a = im.closest('a[href]'), pth = '';
          try { pth = new URL(a.getAttribute('href'), location.href).pathname; } catch (er) {}
          return pth.indexOf(fold) === 0;
        }).slice(0, 40).forEach(function (im) {
          var p = new Image();
          p.sizes = '(max-width: 767px) 60vw, 30vw';   // gleiche Bildgrösse wie in galerie.js (SIZES), damit der Speicher trifft
          if (im.getAttribute('srcset')) p.srcset = im.getAttribute('srcset');
          p.src = im.getAttribute('src');
        });
      }); }).catch(function () {});
    }
    function go(href) {
      if (!href) return;
      var to = ''; try { to = new URL(href, location.href).pathname; } catch (er) {}
      if (!to) return;
      var clean = to.replace(/\/$/, '') || '/';
      if (CRT.paths.indexOf(clean) > -1) { try { sessionStorage.setItem('hp-return', clean); } catch (er) {} }
      if (!reduce && CRT.paths.indexOf(clean) > -1) {
        // Seite schon jetzt laden, damit der Punkt nicht lange steht
        try { var l = document.createElement('link'); l.rel = 'prefetch'; l.href = href; document.head.appendChild(l); } catch (er) {}
        crtOff(function () {
          window.hsVT = { to: to, type: 'crt' };
          location.href = href;
        });
        return;
      }
      window.hsVT = { to: to, type: 'fade' };
      location.href = href;
    }

    // ---------- Desktop: Maus ----------
    var warmT = 0;
    function idle(fn) { if (window.requestIdleCallback) requestIdleCallback(fn, { timeout: 1200 }); else setTimeout(fn, 60); }
    function setHov(i) {
      if (i === hov) return;
      dsunStop();
      hov = i;
      // Hugo 11:08: kurzes Ruckeln beim Aufgehen am Computer – das Vorladen der Galerie (Seite holen, lesen, bis 40 Bilder)
      // lief genau während Spalte und Text aufgingen. Jetzt erst, wenn die Spalte offen ist und der Browser Luft hat.
      clearTimeout(warmT);
      if (i >= 0 && slides[i]) { var wh = slides[i].href; warmT = setTimeout(function () { idle(function () { if (hov >= 0 && slides[hov] && slides[hov].href === wh) warmGallery(wh); }); }, CONFIG.warmDelay); }
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
    var sunBtn = null, dsunOn = false, dsunLive = false, dsunT = 0, dsunEnd = 0, dsunX = -1, dsunY = -1, dOval = null, dIn = false, dSide = null, dDive = null, gClipT = 0;
    root.style.setProperty('--hp-dsun-fade', (CONFIG.deskSunFade / 1000) + 's');
    var closeHold = reduce ? 0 : CONFIG.closeHold;
    root.style.setProperty('--hp-dsun-beam', (closeHold / 1000) + 's');
    var closeMs = closeHold + CONFIG.deskSunFade;   // Schliessen: Strahl, Ausblenden beginnt schon im Licht
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
      setTimeout(function () { if (root.classList.contains('is-info') || dsunOn) return; ripple.flareShimmer(false); }, CONFIG.closeBeam * 0.6);   // Audit 24.11.: nicht, wenn schon wieder geöffnet   // Hugo 24.11. (15:12): Flares wieder an, Rand schwach   // Hugo 24.11. (14:29): nur der Rand leuchtet leicht auf   // Hugo 24.11. (14:23): sobald der Strahl darüber geht   // Hugo 24.11. (14:22): später – das Aufleuchten klingt in ~0.5 s ab und lag sonst noch unter dem Licht   // Hugo 24.11. (14:08): rundherum wie beim Andocken, schwächer
    }
    function revealStop(clear) {
      clearTimeout(shimT);
      if (rv.raf) clearTimeout(rv.raf); rv.raf = 0;
      if (clear) { rv.els.forEach(function (e) { setMask(e, ''); }); rv.els = []; }
    }
    // Hugo 24.11. (14:58): Öffnen wieder wie früher – alles blendet aus, nur die letzte Welle (vom Tippen bzw. der Maus) läuft
    // als Licht weiter über die Sonne, bis sie ausgelaufen ist. Die Sonne blendet ein (keine aufdeckende Welle mehr).
    var shimT = 0;
    function reveal(x, y, els, onPass, tb) {
      revealStop(true);
      rv.els = els;
      if (ripple && ripple.lightOnly) { ripple.lightOnly(true); ripple.tint(1); }
      if (reduce) { if (onPass) onPass(1e6, 0, 0); return; }
      // Hugo 24.11. (14:59): wie beim close – ein Sonnenstrahl schwingt aufs Display und blendet (Lichtebene liegt sofort über
      // allem), darunter blendet die Sonne ein
      if (sun) sun.blind(true);
      // Hugo 24.11. (18:40): am Handy blendet About erst ein, wenn der Strahl schon hell ist – vorher schien die weisse Sonne
      // durch das Foto, bevor der Blitz es verdeckte (wirkte, als würde das Bild schon ausblenden)
      var rvD = desk ? (CONFIG.closeHold || 0) : CONFIG.closeBeam * 0.85;
      clearTimeout(shimT); if (ripple && ripple.flareShimmer) shimT = setTimeout(function () { if (dsunOn || root.classList.contains('is-info')) ripple.flareShimmer(true); }, rvD + CONFIG.deskSunFade);
      els.forEach(function (e) { if (sun && e === sun.glow) return; try { e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CONFIG.deskSunFade, delay: rvD, easing: 'ease', fill: 'backwards' }); } catch (er) {} });
      if (onPass) rv.raf = setTimeout(function () { onPass(1e6, 0, 0); }, CONFIG.deskSunFade * 0.5);
    }
    // Eintauchen (Hugo 24.11., 13:50): das Bild zoomt zur Stelle von Maus bzw. Finger hin, während die Welle die Sonne
    // aufdeckt; zurück zoomt es im Takt des Ausblendens heraus. Die Stelle bleibt dabei stehen.
    function dive(s, x, y, on) {
      if (!s || !s.media || reduce) return;
      var m = s.media, base = desk ? 1 : CONFIG.imgBase;
      if (on) {
        var r = m.getBoundingClientRect();
        if (!s.dv) s.dv = { k: 1, raf: 0 };
        if (s.dv.k <= 1.0001) { s.dv.px = x - (r.left + r.width / 2); s.dv.py = y - (r.top + r.height / 2); }
      }
      if (!s.dv) return;
      var d = s.dv;
      if (d.raf) cancelAnimationFrame(d.raf); d.raf = 0;
      clearTimeout(d.rt);
      function tf(k) { return 'translate(' + d.px.toFixed(1) + 'px,' + d.py.toFixed(1) + 'px) scale(' + k.toFixed(4) + ') translate(' + (-d.px).toFixed(1) + 'px,' + (-d.py).toFixed(1) + 'px) scale(' + base + ')'; }
      function apply() { m.style.transformOrigin = '50% 50%'; m.style.transform = tf(d.k); }
      // laufende Eintauch-Animation an ihrer aktuellen Stelle festhalten (sonst springt das Bild)
      if (d.an) { apply(); try { d.an.cancel(); } catch (er) {} d.an = null; }
      var from = d.k, to = on ? (desk ? CONFIG.diveZoom : CONFIG.diveZoomIn) : 1, t0 = performance.now(), ms = on ? CONFIG.diveMs : CONFIG.deskSunFade, ez = on ? easeDive : desk ? easeDiveOutD : easeDiveOut;
      s.dive = true;
      // Hugo 24.11. (19:51): das Hineinzoomen läuft als Browser-Animation auf der Grafikkarte (gleichmässig) – es ruckelt nicht
      // mehr, wenn beim Öffnen gleichzeitig Text, Titel und Sonne aufgebaut werden. d.k wird nur noch mitgezählt.
      if (on && m.animate) {
        m.style.transformOrigin = '50% 50%';
        try { d.an = m.animate([{ transform: tf(from) }, { transform: tf(to) }], { duration: ms, easing: 'cubic-bezier(' + DIVE_EASE.join(',') + ')', fill: 'forwards' }); } catch (er) { d.an = null; }
      }
      function f(now) {
        var t = clamp((now - t0) / ms, 0, 1);
        d.k = from + (to - from) * ez(t);
        if (!d.an) apply();
        if (t < 1) { d.raf = requestAnimationFrame(f); return; }
        d.raf = 0;
        if (d.an) { apply(); try { d.an.cancel(); } catch (er) {} d.an = null; }
        // Hugo 24.11. (19:48): am Handy taucht das Bild tiefer ein als es offen bleibt; ganz verdeckt von der Sonne springt es
        // unsichtbar auf die normale Tiefe zurück – so bleibt das Herauszoomen beim Schliessen genau wie bisher
        if (on && to !== CONFIG.diveZoom) d.rt = setTimeout(function () { if (s.dv === d && !d.raf && root.classList.contains('is-info')) { d.k = CONFIG.diveZoom; apply(); } }, 600);
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
    // Hugo 25.11. (09:33): beim Einblenden aus der Galerie leuchtete diese weisse Wand zwischen den noch durchsichtigen
    // Bildern auf → sie startet erst, wenn alle Bilder da sind (backHold)
    var backHold = false;
    function dsunWall() { if (sun && desk && !introOn && !dsunLive && !backHold) { sunHome(); sun.start(); } }
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
      [].forEach.call(cl.querySelectorAll('.hp-go-wait'), function (x) { x.classList.remove('hp-go-wait'); });   // Kopie: Buchstaben sichtbar
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
      var gClip = 'inset(' + (g.top - rr.top).toFixed(1) + 'px ' + (rr.right - g.right).toFixed(1) + 'px ' + (rr.bottom - g.bottom).toFixed(1) + 'px ' + (g.left - rr.left).toFixed(1) + 'px)';
      sun.glow.style.clipPath = ''; sun.noGlow(null);   // während des Strahls über allem
      clearTimeout(gClipT); gClipT = setTimeout(function () { if (dsunOn) { sun.glow.style.clipPath = gClip; sun.noGlow(g); } }, reduce ? 0 : CONFIG.closeBeam + 1300);
      // ovale Zone um den Text (Hugo 24.11., 13:36)
      var cx = (tb.left + tb.right) / 2, cy = (tb.top + tb.bottom) / 2;
      dOval = { cx: cx, cy: cy, rx: (tb.right - tb.left) * 0.71 + CONFIG.deskSunOval, ry: (tb.bottom - tb.top) * 0.71 + CONFIG.deskSunOval, sx: dsunX, sy: dsunY };
      dIn = inOval(dsunX, dsunY);
      sun.horizon(0, H * 0.22);   // Boden wie am Handy knapp unter dem oberen Fünftel
      root.classList.add('hp-dsun-live', 'hp-dsun');
      brandTopOn(); brandTopFade();
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
      if (dDive) { var dd0 = dDive; setTimeout(function () { if (dDive !== dd0) dive(dd0, 0, 0, false); }, closeHold); dDive = null; }   // nicht herauszoomen, wenn die Sonne inzwischen wieder auf demselben Bild ist
      root.classList.remove('hp-dsun');
      brandTopOn();
      if (sun) { sun.light(false); sun.blind(); }
      if (ripple && ripple.tint) ripple.tint(0);
      closeRipple();
      clearTimeout(dsunEnd);
      dsunEnd = setTimeout(function () {
        if (dsunOn) return;
        revealStop(true);
        dsunLive = false; root.classList.remove('hp-dsun-live'); if (ripple && ripple.lightOnly) ripple.lightOnly(false);
        if (!root.classList.contains('is-info')) brandTopOff();
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
      else {
        var tx = e ? e.clientX : W / 2, ty = e ? e.clientY : H / 2, tb0 = 0;
        if (!reduce && Math.abs(C - F) <= 0.02) { if (CONFIG.aboutSun) { tapDive = slides[current()]; dive(tapDive, tx, ty, true); } if (ripple && ripple.dropTap) ripple.dropTap(); }   // Bild taucht gleich mit ein; Hugo 24.11. (16:02): kein Kreis beim Tippen
        setTimeout(function () { infoFrom = { x: tx, y: ty, t: tb0 }; openInfo(); }, (reduce || !CONFIG.aboutSun) ? 0 : 200);
      }   // Hugo 23.11.: About öffnet 0.2 s später, damit die Welle zuerst sichtbar ist; die Sonne kommt von dieser Stelle
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
      shadowW: 0.05,             // Fingerschatten: Breite als Anteil der Höhe
      trailLife: 0.9,            // s
      trailAmt: 0.75,
      res: 1                     // Auflösung (1 = CSS-Pixel)
    };
    // Hugo 23.11.: About und Ladeanimation haben je ihre eigene Sonne (eigene Werte, eigene Leinwand), gleiche Bauart
    function makeSun(SUN) {
      var gcv = document.createElement('canvas');
      var c = null;
      try { c = gcv.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true }); } catch (e) {}
      if (!c) return null;
      function mk(cls) { var v = document.createElement('canvas'); v.className = 'hp-info-sun ' + cls; v.setAttribute('aria-hidden', 'true'); return v; }
      var back = document.createElement('div'); back.className = 'hp-info-sun hp-sun-back'; back.setAttribute('aria-hidden', 'true');
      var wall = document.createElement('canvas'); wall.className = 'hp-sun-wall';
      back.appendChild(wall);
      var glow = mk('hp-sun-light');
      var wx = wall.getContext('2d'), lx = glow.getContext('2d');
      if (!wx || !lx) return null;
      var NT = 10;
      var VS = 'attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }';
      var FS = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' + [
        'uniform vec2 uRes; uniform float uOffX; uniform float uMode; uniform float uHor; uniform float uOn; uniform vec3 uHero; uniform float uTime; uniform vec2 uSrc; uniform vec2 uRays; uniform vec2 uDrift; uniform vec2 uEdge;',
        'uniform float uReach; uniform float uStrength; uniform float uAmb; uniform vec3 uShade; uniform vec3 uShadeLow; uniform vec3 uLit; uniform vec3 uBase;',
        'uniform vec3 uTextLight; uniform float uTextAmt; uniform float uWallGlow; uniform vec4 uNoG; uniform vec4 uBl;',
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
        '  vec2 fc = gl_FragCoord.xy - vec2(uOffX, 0.0);',
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
        '  float lit = beam * (1.0 - sh * uTrailAmt);',
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
        '    gl = tc * uTextAmt * max(smoothstep(0.15, 0.5, uOn), uHero.z * exp(-hh * hh * 0.35));',
        '  }',
        '  if (uMode < 0.5) {',
        '    float L = clamp(uAmb + lit, 0.0, 1.0);',
        '    float sh2 = onG * smoothstep(0.0, 0.6, uOn);',
        '    float amp = mix(0.8, 1.6, dw);',
        '    L *= mix(1.0, 1.0 - amp * (0.2 - 0.2 * sv + 0.08 * fil), sh2);',
        '    col = mix(shade, uLit, L) + vec3(0.05, 0.03, 0.0) * clamp(lit - 0.8, 0.0, 1.0) * grd;',
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
        '    float B = clamp(uBl.x * (0.9 + 0.3 * fil * (1.0 - uMode)) + uBl.w * beamB * 0.9, 0.0, 1.0);',   // Hugo 24.11. (18:45): auf der Lichtebene (über dem Foto) ohne Sonnenoberflächen-Muster – sonst Bodenwellen und senkrechte Streifen über dem Bild
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
      var U = {}; ['uRes', 'uOffX', 'uMode', 'uOn', 'uHero', 'uHor', 'uTime', 'uSrc', 'uRays', 'uDrift', 'uEdge', 'uReach', 'uStrength', 'uAmb', 'uShade', 'uShadeLow', 'uLit',
        'uBase', 'uTextLight', 'uTextAmt', 'uWallGlow', 'uNoG', 'uBl', 'uShadowW', 'uTrailAmt', 'uTrail'].forEach(function (k) { U[k] = c.getUniformLocation(pr, k); });
      c.uniform2fv(U.uSrc, SUN.src); c.uniform2fv(U.uRays, SUN.rays); c.uniform2fv(U.uDrift, SUN.drift); c.uniform2fv(U.uEdge, SUN.edge);
      c.uniform1f(U.uReach, SUN.reach); c.uniform1f(U.uStrength, SUN.strength); c.uniform1f(U.uAmb, SUN.ambient);
      c.uniform3fv(U.uShade, SUN.shade); c.uniform3fv(U.uShadeLow, SUN.shadeLow); c.uniform3fv(U.uLit, SUN.lit); c.uniform3fv(U.uBase, SUN.base || [1, 1, 1]);
      c.uniform3fv(U.uTextLight, SUN.textLight); c.uniform1f(U.uTextAmt, SUN.textAmt);
      c.uniform1f(U.uShadowW, SUN.shadowW); c.uniform1f(U.uTrailAmt, SUN.trailAmt);
      var trail = [], tbuf = new Float32Array(NT * 3), raf = 0, t0 = performance.now() - 40000, cw = 0, chh = 0;
      // G = Lage des Titels { bx, by, bw, bh } (CSS-Pixel): knapp darunter liegt der Horizont
      var G = null, lastT = 0;
      function size() {
        var rs = SUN.res * (desk ? CONFIG.deskSunRes : 0.75);   // Handy: 0.75 (Hugo 24.11., 14:43: weniger Rechenarbeit)   // Computer: halbe Auflösung (die ganze Bildschirmfläche ruckelte beim Übergang)
        var w = Math.max(1, Math.round(wall.clientWidth * rs)), h = Math.max(1, Math.round(wall.clientHeight * rs));
        if (w !== cw || h !== chh) {
          cw = wall.width = glow.width = w; chh = wall.height = glow.height = h;
        }
        var GW = 2 * cw, GH = chh;
        if (gcv.width !== GW || gcv.height !== GH) { gcv.width = GW; gcv.height = GH; }
      }
      function pass(x, w, h, md) {
        c.viewport(x, 0, w, h); c.uniform1f(U.uOffX, x); c.uniform1f(U.uMode, md);
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
        var dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
        c.uniform1f(U.uHor, G ? chh - (G.by + G.bh * 0.62) * sx : chh * 0.78);   // Horizont knapp unter dem Titel
        // Licht erst, wenn der Titel angekommen ist: in 1.8 s weich einstrahlen; beim Schliessen rasch weg
        if (lightOn.want) lightOn.v = reduce ? 1 : Math.min(1, (now - lightOn.t0) / 3200);   // 2.6 s, Strahl für Strahl
        else lightOn.v = Math.max(0, lightOn.v - dt / 1.2);                                   // während die Seite wegfährt
        var lo = lightOn.v; c.uniform1f(U.uOn, lo * lo * (3 - 2 * lo));
        // Erster Strahl (Hugo 22.11.): kommt zuerst und fällt auf «Galerie öffnen», damit man den Schatten gleich sieht
        var hero = 0, ha = 0, hw = 0.05;
        var hb = sunBtn || infoOpen;
        if (hb.offsetWidth) {
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
          var ko = 1;
          // Hugo 24.11. (15:41): der Blitz löst sich langsamer und weicher ins Sonnenlicht auf (2.4 s, sanfte Kurve)
          if (blOpen) { var kt = clamp((bt - CONFIG.closeBeam / 1000 - 0.1) / 2.4, 0, 1); ko = 1 - kt * kt * (3 - 2 * kt); ko *= ko; amt = Math.min(amt, 0.92) * ko; if (kt >= 1) { blT0 = 0; blOpen = false; } }   // Hugo 24.11. (15:37): auch der Strahl selbst klingt weich ab (verschwand vorher auf einmal)
          c.uniform4f(U.uBl, Math.max(0, amt), angC + 0.8 * (1 - bo), 0.05 + 0.3 * (1 - Math.pow(1 - sw, 3)), (1 - Math.pow(1 - Math.min(1, bt / 0.3), 3)) * ko);
        } else c.uniform4f(U.uBl, 0, 0, 1, 0);
        if (noG) c.uniform4f(U.uNoG, (noG.left - rect.left) * sx, chh - (noG.bottom - rect.top) * sx, (noG.right - rect.left) * sx, chh - (noG.top - rect.top) * sx);
        else c.uniform4f(U.uNoG, -1, -1, -1, -1);
        c.uniform2f(U.uRes, cw, chh); c.uniform1f(U.uTime, tm); c.uniform3fv(U.uTrail, tbuf);
        pass(0, cw, chh, 0);
        pass(cw, cw, chh, 1);
        probe(rect, sx);
        var H = gcv.height;
        wx.drawImage(gcv, 0, H - chh, cw, chh, 0, 0, cw, chh);
        lx.drawImage(gcv, cw, H - chh, cw, chh, 0, 0, cw, chh);
      }
      // «Werkstatt öffnen»: Licht an seiner Stelle messen, Schatten nur wenn ein Strahl ihn trifft
      var btnL = 0, pf = 0, heroNow = 0, noG = null, blT0 = 0, blOpen = false;
      function probe(rect, sx) {
        var hb = sunBtn || infoOpen;
        if (++pf % 5 || !hb.offsetWidth) return;
        var r = hb.getBoundingClientRect();
        var x0 = Math.max(0, Math.round((r.left - rect.left) * sx)), w = Math.min(cw - x0, Math.max(1, Math.round(r.width * sx)));
        var y = Math.round(chh - (r.top + r.height * 0.5 - rect.top) * sx);
        if (w < 1 || y < 0 || y >= chh) return;
        // CTA (Hugo 22.11.): Schatten folgt dem pulsierenden Strahl auf dem Button (Hugo 24.11., 14:43: Licht wird nicht mehr
        // ausgelesen – das hielt die Grafikkarte an)
        btnL += (heroNow - btnL) * 0.35;
        hb.style.setProperty('--hp-lit', btnL.toFixed(3));
        // Schatten in Strahlrichtung: weg von der Sonne, schräg über den Boden
        var Sx = rect.left + SUN.src[0] * rect.width, Sy = rect.top + SUN.src[1] * rect.height;
        var ddx = r.left + r.width * 0.5 - Sx, ddy = Math.max(1, r.top + r.height * 0.5 - Sy);
        var sk = Math.max(-65, Math.min(65, Math.atan(ddx / ddy) * 180 / Math.PI));
        hb.style.setProperty('--hp-skew', sk.toFixed(1) + 'deg');
      }
      var lastDraw = 0;
      function loop(now) {
        raf = 0;
        if (ip.v >= 1 && !root.classList.contains('is-info') && !dsunLive) return;   // Seite zu: nichts zeichnen
        // Audit 24.11. (Akku): steht alles (Licht ganz an, kein Strahl, kein Finger- oder Mausschatten), rechnet die Sonne
        // nur noch jedes zweite Bild – die Strahlen wandern so langsam, dass man keinen Unterschied sieht
        var calm = !reduce && lightOn.want && lightOn.v >= 1 && !blT0 && !trail.length;
        if (!calm || now - lastDraw > 24) { lastDraw = now; draw(now); }
        if (!reduce || trail.length) raf = requestAnimationFrame(loop);
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
          start();
        },
        noGlow: function (r) { noG = r; },   // Computer: Feld (CSS-Pixel), in dem die Lichtebene darüber das Licht übernimmt
        light: function (on, lead) { if (on && !lightOn.want) lightOn.t0 = performance.now() - (lead || 0); if (on && !blOpen) blT0 = 0; lightOn.want = !!on; start(); },
        blind: function (open) { if (!reduce) { blT0 = performance.now(); blOpen = !!open; start(); } },   // open: Hugo 24.11. (14:59) auch beim Öffnen, Blendung klingt danach ab   // Schliessen: Strahl mit Schwung, Blendung   // lead: so viele ms ist das Einstrahlen schon weiter
        // Laden: Boden (Sonnenoberfläche) beginnt knapp unter dem Schriftzug
        horizon: function (top, bottom) { G = { bx: 0, by: top, bw: 1, bh: (bottom - top) / 0.62 }; start(); }
      };
    }
    var sun = CONFIG.aboutSun ? makeSun(SUN) : null;
    if (!CONFIG.aboutSun) root.classList.add('hp-nosun');
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

    var tClone = null, tOrig = null, infoT = 0, sunT = 0, sunL = 0, glassT = null, ipT = 0, brandT = 0, infoFrom = null, infoDive = null, tapDive = null, titleHy = false;
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
    // Kopie des Schriftzugs über dem Licht (nur während des Blitzes)
    var brandTop = null;
    // Solange die Kopie darüber liegt und beide weiss mit Differenz sind, ist das Original versteckt (zwei Differenz-Schriften
    // übereinander heben sich auf); schwarz liegen beide deckungsgleich übereinander
    function brandWhite(on) {
      if (!brand) return; brand.classList.toggle('hp-on-white', on);
      if (brandTop) { brandTop.classList.toggle('hp-on-white', on); brand.style.opacity = on ? '' : '0'; }
    }
    function brandTopOn() {
      if (!brand || reduce) return;
      if (!brandTop) {
        brandTop = brand.cloneNode(true); brandTop.removeAttribute('id'); brandTop.removeAttribute('href'); brandTop.setAttribute('aria-hidden', 'true');
        brandTop.classList.add('hp-brand-top'); brand.parentNode.insertBefore(brandTop, brand.nextSibling);
      }
      brandTop.classList.toggle('hp-on-white', brand.classList.contains('hp-on-white'));
      brandTop.style.transition = 'none'; brandTop.style.opacity = '1';
      brand.style.transition = 'none'; brand.style.opacity = brand.classList.contains('hp-on-white') ? '' : '0';
    }
    function brandTopFade() {   // wenn der Blitz abklingt (er löst sich in 2.4 s ins Sonnenlicht auf)
      if (!brandTop) return;
      brandTop.getBoundingClientRect();   // Startwert festhalten, sonst springt der Übergang
      brandTop.style.transition = 'opacity 1.4s ease 1.4s'; brandTop.style.opacity = '0';
    }
    function brandTopOff() {
      if (brandTop) { brandTop.remove(); brandTop = null; }
      // Hugo 24.11. (17:53): ohne Übergang zurück (vorher blendete das Original hier fast 1 s neu ein – kurz durchsichtig)
      if (brand) { brand.style.transition = 'none'; brand.style.opacity = ''; brand.getBoundingClientRect(); brand.style.transition = ''; }
    }
    // Schliessen (Hugo 24.11., 17:53): das schwarze Logo (Kopie) blendet weich aus, das weisse mit Differenz (Original) ein –
    // ein harter Wechsel fiel am iPhone schon auf das durchscheinende Bild und machte den Schriftzug kurz durchsichtig
    function brandCross() {
      if (!brand) return;
      if (!brandTop) { brandWhite(false); return; }
      brand.style.transition = 'none'; brand.style.opacity = '0'; brand.classList.remove('hp-on-white'); brand.getBoundingClientRect();
      brand.style.transition = 'opacity .5s ease'; brand.style.opacity = '1';
      brandTop.style.transition = 'opacity .5s ease'; brandTop.style.opacity = '0';
    }
    function applyPanel() {
      infoPanel.style.transform = ip.v >= 1 ? '' : 'translate3d(' + (ip.v * 100).toFixed(3) + '%,0,0)';
      if (sun) { sun.back.style.transform = sun.glow.style.transform = infoPanel.style.transform; sun.glow.style.visibility = ip.v < 1 ? 'visible' : ''; if (ip.v < 1) sun.start(); }
      // ohne Sonne (Mario): Schriftzug dunkel, sobald die weisse Seite ihn erreicht hat
      else if (brand) brand.classList.toggle('hp-on-white', ip.v < 1 && ip.v * W < brand.offsetLeft + brand.offsetWidth * 0.5);
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
    // Buchstabe aus Licht: von hinten rechts, in Flugrichtung gestreckt; bunt (Regenbogen) oder perlmuttweiss (iri), am Ende
    // in seiner Farbe
    // Hugo 24.11. (14:50): der Schweif besteht aus gebrochenem Licht – ein ganzes Spektrum entlang der Streckung (Prisma),
    // nicht eine Farbe; beim Ankommen deckt die eigene Farbe (schwarz) das Licht zu
    var SPEC = 'linear-gradient(100deg, #ff2d55, #ff9500, #ffd60a, #34c759, #32ade6, #5856d6, #af52de, #ff2d55)';
    var IRI = 'linear-gradient(100deg, #fff, #ffe3f1, #fff6dc, #e2fbe9, #ddf1ff, #ece4ff, #fff)';
    // Hugo 24.11. (14:51): jeder Buchstabe kommt von der Sonne her (dort, wo die Strahlen herkommen), nicht mehr von hinten
    // rechts – Weg und Streckung zeigen für jeden Buchstaben genau zur Sonne
    function sunTf(x, y, a, k, sc) { return 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + a.toFixed(1) + 'deg) scaleX(' + k + ') rotate(' + (-a).toFixed(1) + 'deg) scale(' + sc + ')'; }
    // Hugo 24.11. (15:03): schneller ohne den Effekt zu ändern – erst alle Lagen und Farben lesen (lightRead), dann schreiben.
    // Vorher wurde pro Buchstabe abwechselnd gelesen und geschrieben, das zwang den Browser hunderte Male zum Neu-Layout
    // (Hänger beim Erscheinen des Textes)
    function lightRead(us) {
      var rr0 = root.getBoundingClientRect(), sxp = rr0.left + SUN.src[0] * rr0.width, syp = rr0.top + SUN.src[1] * rr0.height;
      return us.map(function (u) { var ub = u.getBoundingClientRect(); return { fin: getComputedStyle(u).color, vx: sxp - (ub.left + ub.width / 2), vy: syp - (ub.top + ub.height / 2) }; });
    }
    function lightFrames(u, iri, pre) {
      if (!pre) pre = lightRead([u])[0];
      var fin = pre.fin, vx = pre.vx, vy = pre.vy, va = Math.atan2(vy, vx) * 180 / Math.PI;
      var st = u.style;
      st.backgroundImage = iri ? IRI : SPEC; st.backgroundSize = '300% 100%'; st.backgroundPosition = Math.round(Math.random() * 100) + '% 0';
      st.webkitBackgroundClip = 'text'; st.backgroundClip = 'text';
      return [
        { transform: sunTf(vx * 0.92, vy * 0.92, va, 4, 0.25), opacity: 0, color: 'rgba(0,0,0,0)', offset: 0 },
        { opacity: 1, offset: 0.12 },
        { transform: sunTf(vx * 0.1, vy * 0.1, va, 2.4, 0.9), opacity: 1, color: 'rgba(0,0,0,0)', offset: 0.5 },
        { transform: sunTf(0, 0, va, 1, 1), opacity: 1, color: fin, offset: 1 }
      ];
    }
    function lightClear(u) { var st = u.style; st.backgroundImage = st.backgroundSize = st.backgroundPosition = st.webkitBackgroundClip = st.backgroundClip = ''; }
    // Text blendet fleckig ein: weiche Flecken (Maske aus Kreisen an zufälligen Stellen) wachsen versetzt, bis alles da ist
    var blRaf = 0;
    function blotchIn(el, delay, ms) {
      if (blRaf) cancelAnimationFrame(blRaf); blRaf = 0;
      function setM(m) { el.style.webkitMaskImage = m; el.style.maskImage = m; }
      if (reduce || !el) { setM(''); return; }
      var NB = 11, bs = [];
      for (var i = 0; i < NB; i++) bs.push({ x: 5 + Math.random() * 90, y: 5 + Math.random() * 90, d: Math.random() * 0.55, k: 0.7 + Math.random() * 0.6 });
      var w = Math.max(el.offsetWidth, el.offsetHeight) || 300;
      setM('linear-gradient(transparent, transparent)');
      var t0 = performance.now() + delay;
      function f(now) {
        var t = (now - t0) / ms;
        if (t >= 1) { setM(''); blRaf = 0; return; }
        if (t > 0) {
          var L = bs.map(function (b) {
            var u = clamp((t - b.d) / 0.45, 0, 1); u = u * u * (3 - 2 * u);
            var r = u * w * 0.75 * b.k;
            return 'radial-gradient(circle at ' + b.x.toFixed(1) + '% ' + b.y.toFixed(1) + '%, #000 ' + (r * 0.45).toFixed(1) + 'px, transparent ' + r.toFixed(1) + 'px)';
          });
          setM(L.join(', '));
        }
        blRaf = requestAnimationFrame(f);
      }
      blRaf = requestAnimationFrame(f);
    }
    function hyperText(el, d0x, maxT, iri) {
      if (!el || !el.animate || reduce) return;
      var nodes = [], tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nd;
      while ((nd = tw.nextNode())) nodes.push(nd);
      var units = [], chars = 0;
      nodes.forEach(function (t) { chars += t.nodeValue.replace(/\s/g, '').length; });
      var perWord = chars > 700;   // sehr lange Texte: Wort für Wort (schont das Handy)
      nodes.forEach(function (t) {
        var parts = t.nodeValue.split(/(\s+)/), frag = document.createDocumentFragment();
        parts.forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
          var ws = document.createElement('span'); ws.style.whiteSpace = 'nowrap'; ws.style.display = 'inline-block';
          if (perWord) { ws.textContent = w; units.push(ws); }
          else for (var ci = 0; ci < w.length; ci++) { var c = document.createElement('span'); c.style.display = 'inline-block'; c.textContent = w[ci]; ws.appendChild(c); units.push(c); }
          frag.appendChild(ws);
        });
        t.parentNode.replaceChild(frag, t);
      });
      var N = units.length, total = Math.min(maxT || 1700, 400 + N * 3.2), each = 700, d0 = d0x == null ? 280 : d0x;
      // Hugo 24.11. (14:44): die Buchstaben bestehen erst aus Licht – bunt (Regenbogen) – und werden beim Ankommen zu ihrer
      // Farbe; sie kommen in zufälliger Reihenfolge
      var ord = units.map(function (u, i) { return i; });
      for (var oi = ord.length - 1; oi > 0; oi--) { var oj = Math.floor(Math.random() * (oi + 1)), ot = ord[oi]; ord[oi] = ord[oj]; ord[oj] = ot; }
      var pres = lightRead(units);
      units.forEach(function (u, i) {
        try {
          u.animate(lightFrames(u, iri, pres[i]), { duration: each, delay: d0 + total * ord[i] / Math.max(1, N - 1), easing: 'cubic-bezier(.1,.8,.2,1)', fill: 'backwards' });
        } catch (er) {}
      });
      // Hugo 24.11. (16:15): der Titel bleibt in seinen Buchstaben stehen (zurücksetzen liess ihn am Ende ein zweites Mal
      // aufblitzen); nur das Licht wird danach entfernt
      setTimeout(function () { units.forEach(lightClear); }, d0 + total + each + 80);
    }
    // ---------- About wie bei Mario (Stand 21.11., wieder aktiv seit 25.11.) ----------
    function openInfoPlain() {
      if (desk || busy() || Math.abs(C - F) > 0.02) return;
      var s = slides[current()];
      clearTimeout(infoT); infoFrom = null;
      if (tClone) { tClone.remove(); tClone = null; }
      if (tOrig) tOrig.style.visibility = '';
      infoText.innerHTML = s.intro;
      infoOpen.setAttribute('href', s.href || '#'); goSplit(infoGoLabel, s.btn || 'Galerie öffnen'); goArm(infoOpen, Math.round(CONFIG.infoMs * 0.45) + CONFIG.goDelay);
      warmGallery(s.href);
      infoOpen.style.display = s.href ? '' : 'none';
      infoPanel.scrollTop = 0;
      infoScroll.style.transition = 'none'; infoScroll.style.opacity = '';
      // Titel: Kopie über alles legen (genau am Platz des Originals) und nach oben rechts neben
      // „Hugo Sophian Studio“ fahren. Der Text steht ebenfalls rechts davon, unter dem Schriftzug bleibt es leer.
      var rr = root.getBoundingClientRect();
      var top = Math.max(12, W * 0.03), left = W * 0.05, gap = Math.max(14, W * 0.045), right = W * 0.05;
      if (brand) { var br = brand.getBoundingClientRect(); top = br.top - rr.top; left = br.right - rr.left + gap; }
      root.style.setProperty('--hp-info-left', left.toFixed(0) + 'px');
      root.style.setProperty('--hp-info-top', (top + H * 0.12).toFixed(0) + 'px');
      if (s.title) {
        tOrig = s.title;
        tClone = s.title.cloneNode(true);
        tClone.removeAttribute('id'); tClone.classList.add('hp-info-title'); tClone.setAttribute('aria-hidden', 'true');
        tClone.style.transition = ''; tClone.style.opacity = '';
        tClone.style.transform = 'translate3d(0,0,0)';
        root.appendChild(tClone);
        tOrig.style.visibility = 'hidden';
        var cr = tClone.getBoundingClientRect();
        var rg = document.createRange(); rg.selectNodeContents(tClone);
        var tr = rg.getBoundingClientRect();
        var sc = Math.min(1, (W - left - right) / Math.max(1, tr.width));
        var ox = tr.left - cr.left, oy = tr.top - cr.top;   // Textanfang innerhalb der Kopie
        var dx = left - (cr.left - rr.left) - sc * ox;
        var dy = top - (cr.top - rr.top) - sc * oy;
        tClone.style.transformOrigin = '0 0';
        root.style.setProperty('--hp-info-top', (top + tr.height * sc + H * 0.035).toFixed(0) + 'px');
        tClone.getBoundingClientRect();   // Startlage festhalten, damit der Übergang läuft
        tClone.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0) scale(' + sc.toFixed(4) + ')';
      }
      if (infoSlide && infoSlide !== s) { infoSlide.el.style.transform = ''; if (infoSlide.media) infoSlide.media.style.transform = 'scale(' + CONFIG.imgBase + ')'; iz.v = 0; ix.v = 0; iz.a = ix.a = null; }
      infoSlide = s; infoClosing = false;
      ix.a = null; ix.v = 0;
      // Bild zoomt hinein, die weisse Seite schiebt sich von rechts darüber (Mario: 1.5 s, .6,0,.1,1)
      tween(iz, 1, CONFIG.infoMs, zoomOpen);
      tween(ip, 0, CONFIG.infoMs, easeInfo);
      root.classList.add('is-info'); setDialog(info, true);
      mbPop(true);
      if (s.href && !s.pref) { s.pref = true; var l = document.createElement('link'); l.rel = 'prefetch'; l.href = s.href; document.head.appendChild(l); }
    }
    function closeInfoPlain() {
      if (!root.classList.contains('is-info')) return;
      root.classList.remove('is-info'); setDialog(info, false);
      mbPop(false);
      if (infoSlide) {
        ix.a = null; infoClosing = true;                 // Bild kommt von links herein, geführt von der weissen Seite
        tween(iz, 0, 1000, easeDock);
      }
      tween(ip, 1, CONFIG.infoMs, easeInfo);
      if (tClone) tClone.style.transform = 'translate3d(0,0,0)';   // Titel fährt zurück an seinen Platz
      clearTimeout(infoT);
      infoT = setTimeout(function () {
        if (root.classList.contains('is-info')) return;
        if (tClone) { tClone.remove(); tClone = null; }
        if (tOrig) { tOrig.style.visibility = ''; tOrig = null; }
      }, CONFIG.infoMs + 50);
    }
    // About ohne Animation schliessen (Rückkehr aus der Galerie)
    function infoInstantClose() {
      if (!root.classList.contains('is-info') && !infoSlide) return;
      root.classList.remove('is-info', 'hp-info-anim'); setDialog(info, false);
      clearTimeout(infoT); iz.a = ix.a = ip.a = null; iz.v = 0; ix.v = 0; ip.v = 1; infoClosing = false;
      if (infoSlide) { infoSlide.el.style.transform = 'translate3d(0,0,0)'; if (infoSlide.media) infoSlide.media.style.transform = 'scale(' + CONFIG.imgBase + ')'; infoSlide = null; }
      if (tClone) { tClone.remove(); tClone = null; }
      if (tOrig) { tOrig.style.visibility = ''; tOrig = null; }
      info.style.transition = 'none'; info.getBoundingClientRect(); info.style.transition = '';   // sofort weg, ohne 1.5 s Nachlauf
      applyPanel(); if (brand) brand.classList.remove('hp-on-white');
      mbPop(false);
      kick();
    }
    function openInfo() {
      if (!CONFIG.aboutSun) { openInfoPlain(); return; }
      if (desk || busy() || Math.abs(C - F) > 0.02) {
        // Audit 24.11.: wurde nach dem Tippen doch gewischt, das schon begonnene Eintauchen zurücknehmen (sonst blieb das Bild vergrössert)
        if (tapDive && !root.classList.contains('is-info')) { dive(tapDive, 0, 0, false); tapDive = null; }
        return;
      }
      var s = slides[current()];
      clearTimeout(infoT);
      if (tClone) { tClone.remove(); tClone = null; }
      if (tOrig) tOrig.style.visibility = '';
      infoText.innerHTML = s.intro;
      infoOpen.setAttribute('href', s.href || '#'); goSplit(infoGoLabel, s.btn || 'Galerie öffnen'); goArm(infoOpen, Math.round(CONFIG.infoMs * 0.45) + CONFIG.goDelay);
      warmGallery(s.href);
      if (sun && !reduce) { goShadow(); if (!infoGoSh.parentNode) infoOpen.appendChild(infoGoSh); }
      infoOpen.style.display = s.href ? '' : 'none';
      infoPanel.scrollTop = 0;
      infoScroll.style.transition = 'none'; infoScroll.style.opacity = '';
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
        tClone.style.transition = 'none';
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
        // Hugo 24.11. (14:43): der Titel fliegt nicht mehr hoch, er steht gleich oben und kommt wie der Text Buchstabe für
        // Buchstabe aus der Lichtgeschwindigkeit; das Original unten bleibt und wird von der Sonne zugedeckt
        tClone.style.transition = 'opacity .5s ease';
        titleHy = !reduce;   // kommt nach dem Text (unten)
        clearTimeout(sunT);
        if (sun && glassT) sun.title(glassT);   // Hugo 24.11. (13:36): Horizont gleich setzen – die Sonne ist sofort sichtbar
      }
      if (sun) {
        // Sonne erst, wenn der Titel eingeflogen ist (Hugo 22.11.)
        clearTimeout(sunL); sun.light(false);
        sun.light(true, 0);   // Hugo 24.11. (18:40): ohne Vorlauf – die Strahlen wachsen unter dem Blitz heran (vorher lagen sie schon als senkrechte Streifen über dem Foto)
      }
      // Hugo 24.11. (13:36): wie am Computer – keine Bildbewegung mehr. Die Sonne mit dem Text wird von einer Welle ab dem
      // Finger nach aussen aufgedeckt, darunter läuft die Fingerwelle weiter. «close» blendet aus.
      if (infoSlide) { infoSlide.el.style.transform = ''; if (infoSlide.media) infoSlide.media.style.transform = 'scale(' + CONFIG.imgBase + ')'; iz.v = 0; ix.v = 0; iz.a = ix.a = null; infoSlide = null; root.classList.remove('hp-info-anim'); }
      infoClosing = false;
      var wasOpen = ip.v < 1;   // schliesst noch: nicht von vorn aufdecken
      clearTimeout(ipT); ip.a = null; ip.v = 0; applyPanel();
      brandWhite(false);
      var tp = infoFrom || { x: W / 2, y: H / 2 }; infoFrom = null;
      if (tapDive !== s) dive(s, tp.x, tp.y, true); tapDive = null; infoDive = s;
      if (wasOpen) { revealStop(true); brandWhite(true); }
      else reveal(tp.x, tp.y, sun ? [info, sun.glow] : [info], function (rad, lx, ly) {
        // Schriftzug wird dunkel, sobald die Welle ihn überquert hat
        if (brand && !brand.classList.contains('hp-on-white')) {
          var bx = brand.offsetLeft + brand.offsetWidth / 2, by = brand.offsetTop + Math.min(brand.offsetHeight, 120) / 2;
          if (Math.hypot(bx - lx, by - ly) < rad) brandWhite(true);
        }
      }, tp.t);
      if (reduce) brandWhite(true);
      // Hugo 24.11. (14:27/14:34): der Text kommt wie aus der Lichtgeschwindigkeit (Star Wars) – Buchstabe für Buchstabe
      // nacheinander, jeder von hinten rechts mit Lichtschweif (in Flugrichtung gestreckt), bremst hart ab und steht
      // Hugo 24.11. (14:47): erst der Text (bunt), dann Titel und «Galerie öffnen» als Letzte, perlmuttweiss
      // Hugo 24.11. (15:04): der Text lädt wieder normal (kommt mit der Sonne), nur Titel und «Galerie öffnen» aus Licht
      // Hugo 24.11. (16:40): «Galerie öffnen» kommt nicht mehr Buchstabe für Buchstabe, sondern blendet zusammen mit dem Text ein
      if (!wasOpen) {
        blotchIn(infoText, 250, 1300);   // Hugo 24.11. (15:05): der Text blendet fleckig weich ein
        try { infoOpen.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1300, delay: 250, easing: 'ease-in-out', fill: 'backwards' }); } catch (er) {}
      }
      if (titleHy && tClone && !wasOpen) hyperText(tClone, Math.max(300, 740 - 250), 320, true);   // Titel im selben Takt wie bisher (nach 0.49 s)
      titleHy = false;
      root.classList.add('is-info'); setDialog(info, true);
      brandTopOn(); brandTopFade();
      mbPop(true);
      if (s.href && !s.pref) { s.pref = true; var l = document.createElement('link'); l.rel = 'prefetch'; l.href = s.href; document.head.appendChild(l); }   // Audit 24.11.: nur einmal pro Bereich (vorher bei jedem Öffnen ein weiteres <link>)
    }
    function closeInfo() {
      if (!CONFIG.aboutSun) { closeInfoPlain(); return; }
      if (!root.classList.contains('is-info')) return;
      root.classList.remove('is-info'); setDialog(info, false);
      brandTopOn();
      mbPop(false);
      revealStop(false);   // Maske bleibt stehen und blendet mit aus
      if (infoDive) { var id0 = infoDive; setTimeout(function () { if (!root.classList.contains('is-info')) dive(id0, 0, 0, false); }, closeHold); infoDive = null; }
      clearTimeout(ipT);
      ipT = setTimeout(function () { if (root.classList.contains('is-info')) return; if (!dsunLive) brandTopOff(); revealStop(true); if (ripple && ripple.lightOnly) ripple.lightOnly(false); ip.v = 1; applyPanel(); kick(); }, closeMs + 50);
      clearTimeout(brandT); brandT = setTimeout(function () { if (!root.classList.contains('is-info')) brandCross(); }, reduce ? 0 : closeHold + 40);   // Hugo 24.11. (17:53): früh, solange es noch hell ist, und als Überblendung
      // Hugo 24.11. (14:09): kein Zurückfliegen – der Titel verschwindet im Licht des Strahls und steht danach schon
      // unten auf der Seite (das Original kommt mit der Seite unter dem ausblendenden Licht zum Vorschein)
      if (tClone && tClone.getAnimations) tClone.getAnimations().forEach(function (an) { if (an.effect && an.effect.getKeyframes && an.effect.getKeyframes().length > 2) an.cancel(); });
      if (tClone) { tClone.style.transition = 'opacity ' + (closeHold / 1000) + 's ease'; tClone.style.opacity = '0'; }
      // Hugo 24.11. (14:12): auch der Text verschwindet im Licht des Strahls (sonst schien er beim Ausblenden noch durch)
      infoScroll.style.transition = 'opacity ' + (closeHold / 1000) + 's ease'; infoScroll.style.opacity = '0';
      if (blRaf) { cancelAnimationFrame(blRaf); blRaf = 0; } infoText.style.webkitMaskImage = infoText.style.maskImage = '';
      if (infoOpen.getAnimations) infoOpen.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); });
      clearTimeout(sunT); clearTimeout(sunL); if (sun) { sun.title(null); sun.light(false); sun.blind(); }
      if (ripple && ripple.tint) ripple.tint(0);
      closeRipple();
      clearTimeout(infoT);
      infoT = setTimeout(function () {
        if (root.classList.contains('is-info')) return;
        if (tClone) { tClone.remove(); tClone = null; }
        if (tOrig) { tOrig.style.visibility = ''; tOrig = null; }
      }, closeHold);
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
      if (reduce || backIn) { html.classList.remove('hp-ldpre'); return null; }   // Hugo 24.11.: auch am Computer · zurück aus der Galerie: ohne (Hugo 09:29)
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
          if (ripple && ripple.dock) ripple.dock(CONFIG.ldRim, CONFIG.ldFlares);   // Hugo 25.11.: Rand-Leuchten ruhiger, ohne Flares
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
