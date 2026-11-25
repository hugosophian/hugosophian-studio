  var css = [
    ':root { --hp-ease-out: ' + MOTION.out + '; --hp-ease-page: ' + MOTION.page + '; --hp-ease-away: ' + MOTION.away + '; --hp-ease-snap: ' + MOTION.snap + '; --hp-dur-quick: ' + MOTION.quick + 'ms; --hp-dur-ui: ' + MOTION.ui + 'ms; --hp-dur-glow: ' + MOTION.glow + 'ms; --hp-dur-page: ' + MOTION.pageMs + 'ms; }',
    'html.hp-on, html.hp-on body { height: 100%; overflow: hidden; overscroll-behavior: none; background: #000; }',
    '[data-hp] { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }',
    '[data-hp] .hp-stage { overflow: hidden; }',
    /* Barrierefreiheit (25.11.2026): mit der Tastatur sieht man, wo man ist (nur bei Tastatur, nicht beim Tippen/Klicken) */
    '[data-hp] a:focus-visible, [data-hp] button:focus-visible, [data-hp] [role="button"]:focus-visible, [data-hp] [tabindex]:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; border-radius: 2px; }',
    '[data-hp] .hp-slide { position: absolute; inset: 0; overflow: hidden; visibility: hidden; will-change: transform; backface-visibility: hidden; }',
    '[data-hp] .hp-slide.is-vis { visibility: visible; }',
    '[data-hp] .hp-media { position: absolute; inset: 0; will-change: transform; }',
    '[data-hp] .hp-img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; -webkit-user-drag: none; }',
    // Hugo 25.11. (11:03): Titel und Logo rasten mit dem Aufprall ein – kurz, schneller Start, weicher Auslauf, Handy und Computer gleich (vorher .8s ease .1s)
    '[data-hp] .hp-title { will-change: transform; pointer-events: none; transition: opacity .45s var(--hp-ease-out); }',
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
    '[data-hp] .hp-info-panel { position: absolute; inset: 0; box-sizing: border-box; padding: var(--hp-info-top, 30vh) 5vw calc(5vh + 7.4rem + env(safe-area-inset-bottom, 0px)) var(--hp-info-left, 5vw); background: transparent; color: var(--hp-info-fg, #000); transform: translate3d(100%,0,0); display: flex; flex-direction: column; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; touch-action: pan-y; }',
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
    /* Hugo 14:07: weisser Grund als eigene Ebene hinter dem Feld (fährt mit), damit das Feld selbst eine feste Maske tragen kann */
    '[data-hp] .hp-info-bg { position: absolute; inset: 0; background: var(--hp-info-bg, #fff); transform: translate3d(100%,0,0); pointer-events: none; }',
    '[data-hp] .hp-info-panel .hp-intro-text { color: inherit; margin: 0; max-width: none; opacity: 1; transform: none; }',
    '[data-hp] .hp-info-btns { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }',
    /* Hugo 11:17: «Galerie öffnen» bleibt bei langen Texten sichtbar – klebt über dem Close-Knopf auf einem weich auslaufenden
       Streifen in der Farbe der Seite und rastet am Ende des Texts an seinem Platz ein. bottom negativ: der Klebe-Bereich endet
       schon am Innenabstand unten des Panels (5vh + 9rem), -4.4rem setzt den Knopf 4.6rem über dessen Unterkante */
    /* Hugo 11:40: «Galerie öffnen» fest über dem Close-Knopf (scrollt nicht mit), fährt mit der weissen Seite herein */
    '[data-hp] .hp-info-fix { position: absolute; left: 0; right: 0; bottom: calc(5vh + 4.4rem + env(safe-area-inset-bottom, 0px)); z-index: 2; padding: 0 5vw 0 var(--hp-info-left, 5vw); pointer-events: none; color: var(--hp-info-fg, #000); }',
    /* Hugo 11:34 (Video perappelgren.de): Zeile für Zeile – jede Zeile blendet zum Rand hin selbst aus, beim Scrollen bleiben
       untere Zeilen leicht zurück Code: infoLines / linesTick */
    '[data-hp] .hp-info-panel .hp-w { display: inline-block; will-change: transform, opacity; }',
    '[data-hp] .hp-info-fix .hp-info-btns > * { pointer-events: auto; }',
    '[data-hp] .hp-title.hp-info-title { z-index: 7; pointer-events: none; opacity: 1; transition: transform var(--hp-dur-page) var(--hp-ease-page), opacity .5s ease; will-change: transform; }',
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
    /* Hugo 11:27: in Safari am Computer war der Text riesig (die Webflow-Variable für die Textgrösse kam dort mit dem Handy-Wert 5vw an)
       und lief aus der Spalte. Am Computer fest die Computer-Werte; ist ein Text trotzdem zu lang, verkleinert ihn der Code (fitSides). */
    '[data-hp].is-desk .hp-side-in .hp-intro-text { font-size: var(--hp-side-fs, 1.25rem) !important; line-height: var(--hp-side-lh, 1.5rem) !important; }',
    /* Hugo 12:19: fester Textbereich statt kleinerer Schrift. Der Text steht in einem Kasten (höchstens 58 % der Höhe); ist er
       länger, scrollt er darin mit dem Wort-Effekt wie im Handy-About (sideWords). Schrift bleibt immer 1.25rem. */
    '[data-hp] .hp-side-box { position: relative; flex: 0 1 auto; max-height: 58vh; overflow: hidden; }',
    '[data-hp] .hp-side-in.is-scroll .hp-side-box { overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none; pointer-events: auto; }',
    '[data-hp] .hp-side-in.is-scroll .hp-side-box::-webkit-scrollbar { display: none; }',
    '[data-hp] .hp-side-box .hp-w { display: inline-block; will-change: transform, opacity; }',
    /* Hugo 12:21: Scroll-Leiste links vom Text, schillernd wie die Horizont-Linie der Fernseher-Animation (gleiche Farben,
       feine Spitzen oben und unten, weicher Schein). Nur sichtbar, wenn der Text länger ist als sein Bereich; beim Scrollen kräftiger. */
    '[data-hp] .hp-sbar-wrap { position: absolute; inset: 0; pointer-events: none; z-index: 3; }',
    /* Hugo 12:36: schlicht wie bei Apple – schmale Pille mit runden Enden, ohne Schiene, ohne Schein, ohne ausblendende Spitzen;
       der Griff stösst oben und unten genau an das Ende des Bereichs. Farben wie die Horizont-Linie, wandern nur mit dem Scrollen. */
    '[data-hp] .hp-sbar { position: absolute; width: 3px; opacity: 0; transition: opacity .4s ease; pointer-events: none; }',
    '[data-hp] .hp-sbar.is-on { opacity: .85; }',
    '[data-hp] .hp-sbar.is-on.is-active { opacity: 1; }',
    /* Hugo 12:57: Perlmutt-Wolke (Vorschlag A, nach dem Cape des Neunfarbigen Hirschs aus Sky): perlweisser Grund mit weichen,
       blassen Farbwolken (Eis-Cyan, Flieder, Rosé, Champagner), die beim Scrollen unterschiedlich schnell wandern; feiner lila Schein. */
    /* Hugo 12:57: wie ein Buckel, der sich aus dem Weiss hebt – Licht von links oben (heller Rand), weicher Schatten rechts unten */
    '[data-hp] .hp-sbar { width: 4px; }',
    /* Hugo 13:00: wie weicher Stoff, den der Griff von unten hochdrückt – keine harte Kante; Licht auf dem Kamm, Schatten an der
       Flanke, alles läuft weich ins Weiss aus (Maske). Farben nur auf dem Buckel selbst. Der Griff ist 14 px breit und oben/unten
       6 px länger, damit das Auslaufen nicht an der sichtbaren Länge frisst. */
    /* Hugo 13:05: eine Pille, die sich unter einem feinen, seidigen Stoff bewegt. Der Stoff spannt sich über die Pille (schmaler
       heller Kamm, darunter ein breiter, sehr weicher Schattenrock links und rechts) und hat einen Seidenglanz, der beim Scrollen
       an der Pille entlangläuft. Farben nur auf dem Kamm. 22 px breit, oben/unten 8 px Auslauf. */
    '[data-hp] .hp-sbar i { position: absolute; left: -9px; width: 22px; top: 0; will-change: transform; background-color: transparent;',
    '  -webkit-mask-image: radial-gradient(ellipse 50% 50% at 50% 50%, #000 38%, transparent 100%); mask-image: radial-gradient(ellipse 50% 50% at 50% 50%, #000 38%, transparent 100%); }',   /* Hugo 12:36: alle Farben auf einmal im Griff sichtbar */
    /* Hugo 12:26: ohne weissen Kern und ohne Weiss im Verlauf */
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
    'html.hp-on:not(.hp-ldpre) [data-hp] .hp-brand, html.hp-on:not(.hp-ldpre) [data-hp] .hp-about-btn { transition: color .25s ease, opacity .45s var(--hp-ease-out); }',   // vorher .9s ease
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

