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
   und a.hp-intro-open (gleiches Aussehen wie im Designer). Farben: CSS-Variablen --hp-side-bg, --hp-side-fg.
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
    ldStripW:   0.038,  // Ladeanimation (Hugo 23.11.): Karten starten weiter weg, also kleiner
    ldStripH:   0.046,
    // Desktop
    desk:       992,    // ab dieser Breite (px) und mit Maus: Bilder nebeneinander
    deskOpen:   0.52,   // Breite des geöffneten Bildes samt Text (Anteil)
    deskSide:   0.2,    // Breite der Textspalte (Anteil)
    deskStiff:  150,    // Feder beim Aufschieben
    deskDamp:   0.6,    // kleiner = mehr Nachwippen
    deskTitle:  0.9,    // der längste Titel füllt so viel der Bildbreite
    infoMs:     1500    // About: Dauer (Mario: 1.5 s, Kurve 0.6, 0, 0.1, 1)
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
    '[data-hp].is-desk .hp-title { right: auto; margin-left: 0; margin-right: 0; padding-left: 0; padding-right: 0; transform: none; max-width: none; }',
    '[data-hp].is-desk .hp-side { display: block; position: absolute; top: 0; bottom: 0; right: 0; width: 0; overflow: hidden; z-index: 2; background: var(--hp-side-bg, #000); color: var(--hp-side-fg, #fff); }',
    '[data-hp] .hp-side-in { position: absolute; top: 0; bottom: 0; left: 0; box-sizing: border-box; padding: 6vh 2.2vw 7vh; display: flex; flex-direction: column; justify-content: flex-end; gap: 2.2vh; }',
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
    /* Logo und About erst, wenn das Bild angedockt ist */
    'html.hp-ldpre [data-hp] .hp-brand, html.hp-ldpre [data-hp] .hp-about-btn { opacity: 0 !important; pointer-events: none; }',
    'html.hp-on:not(.hp-ldpre) [data-hp] .hp-brand, html.hp-on:not(.hp-ldpre) [data-hp] .hp-about-btn { transition: color .25s ease, opacity .9s ease; }',
    '@media (prefers-reduced-motion: reduce) { [data-hp] .hp-info-panel, [data-hp] .hp-stage, [data-hp] .hp-info-title { transition-duration: .01s !important; } }'
  ].join('\n');

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  // Andocken wie ein Magnet (Hugo 23.11.): das Bild wird langsamer, fast bis zum Stillstand, und wird dann zum Rand
  // hin angezogen – zuletzt immer schneller, bis es einrastet
  // Hugo 23.11.: Heranzoomen kubisch (langsam an, schnell, langsam aus), knapp vor dem Ziel übernimmt weich ein Magnet:
  // das Bild wird langsamer, ohne anzuhalten, und dann immer schneller zum Rand gezogen, bis es einrastet
  function magnetPull(x) { var x0 = 0.62; return x > x0 ? Math.pow((x - x0) / (1 - x0), 5) : 0; }   // Hugo 23.11.: Magnet episch, aber ohne fast anzuhalten
  function easeMagnet(x) {
    var k = 0.84, a = 0.98, t = Math.min(1, x / a);   // a nahe 1: bremst nicht ganz aus, bevor der Magnet zieht
    // Hugo 23.11.: der schnelle Teil schneller, das Abdämpfen etwas stärker: Anlauf und Bremsung mit Potenz 4
    // (stetig angesetzt, Spitzentempo ein Drittel höher als kubisch, bremst kräftiger und läuft länger sanft aus)
    var c = t < 0.5 ? 0.5 * Math.pow(2 * t, 4) : 1 - 0.5 * Math.pow(2 - 2 * t, 4);
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
  var easeInfo = bezier(0.6, 0, 0.1, 1);   // Marios About-Kurve

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
    var hov = -1, deskMoving = false;
    var introOn = !reduce, introT0 = 0, introP = 0, LD = null;
    function wrap(x) { return ((x % n) + n) % n; }
    function rel(j) { var d = wrap(j - F); return d > n / 2 ? d - n : d; }
    function current() { return wrap(Math.round(F)); }

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
        'uniform vec2 uRes; uniform float uDpr; uniform vec4 uP[' + NP + ']; uniform float uAge[' + NW + ']; uniform float uHue[' + NW + ']; uniform vec4 uB[' + NW + ']; uniform float uT; uniform float uEdgeT; uniform float uSeed;',
        'float h2(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }',
        'float n2(vec2 x) { vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);',
        '  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }',      // Punkte der Fingerbahn: x, y, eigenes Alter, aktiv
        // Abstand zum Bahnabschnitt a–b, Wellenfront dort minus gelaufene Strecke (mit weicher Einblendung neuer Punkte)
        'float segF(vec2 fc, vec4 a, vec4 b, float mx, float sp, out vec2 dv, out float d) {',
        '  vec2 ab = b.xy - a.xy; float l2 = dot(ab, ab);',
        '  float t = l2 > 0.01 ? clamp(dot(fc - a.xy, ab) / l2, 0.0, 1.0) : 0.0;',
        '  float z = max(mix(a.z, b.z, t), 0.0); dv = fc - (a.xy + ab * t); d = length(dv);',
        '  return d - z * mx * 0.15 * sp + (1.0 - smoothstep(0.0, 0.12, z)) * mx * 0.035; }',
        'uniform sampler2D uImg; uniform float uHas; uniform vec4 uRect; uniform vec4 uCrop;',   // Bildlage (px, y oben) · Ausschnitt (uv)
        'void main() {',
        '  vec2 fc = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;',   // in CSS-Pixeln, gerechnet in voller Bildschirmschärfe
        '  float mx = max(uRes.x, uRes.y);',
        '  vec2 ed = min(fc, uRes - fc); float e = -18.0 * log(exp(-ed.x / 18.0) + exp(-ed.y / 18.0));',   // weich gerundet: keine Diagonalen in den Ecken
        // Hugo 23.11.: EINE Welle in der Form der Fingerbewegung. Jeder Punkt der Bahn startet zu seiner Zeit;
        // die Wellenfront ist dort, wo die Welle zuerst ankommt (kleinster Abstand minus gelaufene Strecke).
        // Zähflüssiger als Wasser: langsam, ein einziger weicher Berg mit Tal, lange gedämpft.
        // Hugo 23.11.: mehrere Wellen gleichzeitig (schnell hintereinander verschwindet die erste nicht)
        '  vec2 q = fc / mx * 2.6;',   // gröber: breitere, ruhigere Sonnenbewegung
        '  vec2 wq = vec2(n2(q * 0.9 + vec2(uT * 0.11, -uT * 0.07)), n2(q + vec2(-uT * 0.09, uT * 0.13) + 5.2));',
        '  float sv = n2(q * 1.4 + wq * 2.2 + vec2(0.0, uT * 0.05));',
        '  vec2 off = vec2(0.0); float ring = 0.0, ph = 0.0, edge = 0.0, rs = 0.0, halo = 0.0, fa = 0.0, org = 0.0; vec3 rbA = vec3(0.0);',
        '  for (int k = 0; k < ' + NW + '; k++) {',
        '    float age = uAge[k]; if (age < 0.0) continue;',
        // schwache Handys: Pixel weit weg von dieser Welle rechnen die Bahn gar nicht erst durch
        '    if (length(fc - uB[k].xy) - uB[k].z - age * mx * 0.15 * uB[k].w > mx * 0.62) continue;',
        // Hugo 23.11.: keine Striche beim Auslösen — die Bahn ist eine durchgehende Linie (Abschnitte zwischen den Punkten),
        // nicht einzelne Kreise; Alter und Einblendung laufen entlang des Abschnitts weich mit.
        // Weiches Minimum in einem Durchgang (laufend neu gewichtet), damit es auch in voller Schärfe flüssig bleibt.
        '    float w = mx * min(0.019 + 0.02 * age, 0.062), sw = 1.0 / (w * 0.5);',   // Hugo 23.11.: am Finger wieder grösser, beim Auslaufen kompakt (früher 0.016 + 0.028 · Alter, max. 0.085)
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
        '    float env = exp(-x * x) * smoothstep(0.0, 0.35, age);',
        '    float amp = exp(-age * 0.45);',
        // Hugo 23.11.: keine Streifen in der Welle — die Verschiebung wächst mit der Wellenbreite, so dass sich das Foto
        // nie überschlägt (vorher wurde es in der Mitte der schmalen Welle über sich selbst gezogen)
        '    off += dir * (-x * env * amp * smoothstep(0.0, w, sd)) * w * 0.7;',
        '    float r = env * amp; ring = 1.0 - (1.0 - ring) * (1.0 - r); rs += r; ph += r * x;',
        '    rbA += r * (0.5 + 0.5 * cos(6.2832 * (sv * 1.6 + x * 0.06 + uHue[k] * 0.15 + vec3(0.0, 0.33, 0.67))));',
        // Hugo 23.11.: am Bildschirmrand stärker; hat die Welle den Rand erreicht, leuchtet er nach und verblasst nach rund 4 s
        '    edge = max(edge, exp(-max(x, 0.0) * max(x, 0.0)) * exp(-max(-x, 0.0) * 0.12) * smoothstep(0.0, 0.35, age) * exp(-age * 0.3) * (1.0 - smoothstep(3.6, 5.6, age)) * exp(-max(e, 0.0) * max(e, 0.0) / 560.0));',
        '    float on = smoothstep(0.0, 0.35, age) * amp;',
        '    halo = 1.0 - (1.0 - halo) * (1.0 - exp(-x * x / 9.0) * on);',
        '    vec4 p0 = uP[k * ' + PW + ']; if (p0.w > 0.0) { vec2 d0 = (fc - p0.xy) / (mx * 0.22); org = max(org, exp(-dot(d0, d0)) * on); }',
        '    float fs = uHue[k] * 17.0;',
        '    float xo = max(x, 0.0);',
        '    vec2 dn = dot(dir, dir) > 1e-5 ? normalize(dir) : vec2(1.0, 0.0);',
        '    float ra = xo * 0.22 * sin(uT * 0.6 + fs);',
        '    vec2 cs = vec2(dn.x * cos(ra) - dn.y * sin(ra), dn.x * sin(ra) + dn.y * cos(ra)) * 3.4;',   // mehr Flares rundherum (vorher 2.2)
        '    float fl = pow(n2(cs + vec2(fs, uT * 0.3)), 2.8);',
        '    float ln = 0.5 + fl * (4.2 + 2.6 * n2(cs * 1.7 + vec2(uT * 0.8, fs)));',   // Hugo 23.11.: kleinere Flares an der Welle
        '    fa = max(fa, 1.05 * (1.0 + 0.8 * exp(-age * 1.2)) * fl * smoothstep(-0.3, 0.5, x) * exp(-xo * xo / ln) * on * smoothstep(0.05, 0.25, age) * smoothstep(w * 0.3, w * 1.1, sd));',   // Hugo 23.11.: schon die erste Welle trägt Flares, sie reiten auf der Front (kein Stern am Startpunkt)
        '  }',
        '  ph = rs > 0.0001 ? ph / rs : 0.0;',
        '  vec3 rb = rs > 0.0001 ? rbA / rs : vec3(0.5);',
        '  rb = mix(vec3(dot(rb, vec3(0.333))), rb, 0.85);',   // Hugo 23.11.: wieder etwas kräftiger
        // Andocken nach dem Laden (Hugo 23.11.): sobald das Bild andockt, leuchtet der ganze Rand bunt auf (so lange wie
        // bei der Fingerwelle) und das Andocken lässt weiche Solar Flares aus dem Rand schiessen. Die Flares bewegen sich
        // langsam und organisch; kommen sich zwei nahe, weichen sie einander wie Magnete aus (berechnet in draw()).
        '  vec3 eacc = vec3(0.0); float fI = 0.0;',
        '  if (uEdgeT >= 0.0) {',
        '    float et = uEdgeT;',
        '    float fade = 1.0 - smoothstep(5.0, 7.0, et);',   // Hugo 23.11.: Farbe hält länger
        '    float flash = 1.2 * exp(-et * 2.6) + 0.6 * exp(-et * 0.18);',   // Hugo 23.11.: grosse bunte Welle beim Andocken
        '    float band = exp(-max(e, 0.0) * max(e, 0.0) / 560.0);',
        '    vec2 ca = normalize(fc - uRes * 0.5 + vec2(0.001)); float ang = atan(ca.y, ca.x) / 6.2832;',
        '    vec3 erb = 0.5 + 0.5 * cos(6.2832 * (ang * 2.0 + uT * 0.06 + vec3(0.0, 0.33, 0.67)));',
        '    float egm = smoothstep(0.3, 0.7, n2(ca * 3.0 + vec2(uT * 0.08, 5.0)));',
        '    vec3 ecol = mix(erb, vec3(1.0, 0.8, 0.48), 0.25 + 0.4 * egm);',
        // Hugo 23.11.: kein gleichmässiger Bilderrahmen – das Bunte am Rand ist mal stärker, mal kaum da, und wandert
        '    float patch = 0.2 + 1.0 * smoothstep(0.3, 0.75, n2(ca * 2.6 + vec2(uT * 0.13, -uT * 0.09) + 7.0));',
        '    float bw = 0.7 + 0.6 * n2(ca * 4.0 + vec2(-uT * 0.1, 2.0));',
        '    band = exp(-max(e, 0.0) * max(e, 0.0) / (950.0 * bw * bw)) + 0.5 * exp(-max(e, 0.0) / (mx * 0.08)) * exp(-et * 1.5);',
        '    eacc = ecol * band * flash * 0.8 * mix(1.0, patch, smoothstep(0.2, 1.2, et));',   // erst rundherum, dann ungleich
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
        // Andocken bringt das Bild zum Wabbern (Hugo 23.11.): vom Rand laufen weiche Wellen nach innen, unter den Flares
        // stärker; Verschiebung klein genug, dass sich das Foto nie überschlägt
        '    vec2 wxy = vec2(exp(-ed.x / 18.0) * sign(uRes.x * 0.5 - fc.x), exp(-ed.y / 18.0) * sign(uRes.y * 0.5 - fc.y));',
        '    vec2 nin = wxy / max(length(wxy), 1e-4);',
        '    float wa = (exp(-max(e, 0.0) / (mx * 0.12)) * (0.6 * exp(-et * 1.2) + 0.4 * exp(-et * 0.35)) * 0.4 + min(fI, 1.2) * 0.9) * fade;',
        '    float wph = max(e, 0.0) * 0.07 - et * 3.2 + 2.0 * n2(ca * 4.0 + vec2(et * 0.3, 1.0));',
        '    off += (nin * sin(wph) + vec2(-nin.y, nin.x) * 0.5 * cos(wph * 0.7 + 1.3)) * wa * mx * 0.009 * smoothstep(0.0, 0.25, et);',
        '  }',
        '  vec3 col = vec3(0.0), base = vec3(0.0); float al = 0.0, here = 0.0;',
        '  if (uHas > 0.5) {',
        '    vec2 sp = fc + off;',
        '    vec2 u = (sp - uRect.xy) / uRect.zw;',
        '    vec2 bu = min(u, 1.0 - u) * uRect.zw;',
        '    float inside = smoothstep(0.0, 6.0, min(bu.x, bu.y));',
        '    vec2 iu = uCrop.xy + clamp(u, 0.0, 1.0) * uCrop.zw;',
        '    vec2 ca = off * 0.08 / uRect.zw * uCrop.zw;',                                 // nur ein Hauch Farbtrennung (keine Farbkanten)
        '    vec3 img = vec3(texture2D(uImg, iu + ca).r, texture2D(uImg, iu).g, texture2D(uImg, iu - ca).b);',
        '    float u0 = (fc.x - uRect.x) / uRect.z, v0 = (fc.y - uRect.y) / uRect.w;',
        '    vec2 bh = min(vec2(u0, v0), 1.0 - vec2(u0, v0)) * uRect.zw;',
        '    here = smoothstep(0.0, 6.0, min(bh.x, bh.y)) * inside; base = img;',
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
        '  vec3 gc = mix(rim, vec3(1.0), 0.1) * glow + sun * halo * 0.5 + vec3(1.0, 0.86, 0.62) * fa * (0.6 + 0.5 * fm);',
        '  gc += (h2(fc * 1.37) - 0.5) / 255.0;',                                       // gegen Farbstufen im Verlauf
        // Hugo 23.11.: kein milchiger Schleier — das Licht fällt AUF das Foto (Dunkles bleibt dunkel, Helles leuchtet farbig),
        // statt halbdurchsichtig darüber zu liegen
        '  if (uHas > 0.5 && here > 0.0) {',
        '    float L = dot(gc, vec3(0.333)), lum = dot(base, vec3(0.3, 0.59, 0.11));',
        // Hugo 23.11.: auf Weiss kein heller Rand mehr (Helles wird nur leicht eingefärbt, nicht aufgehellt);
        // auf Dunklem leuchten Licht und Flares dafür stärker, damit man sie überall sieht
        '    float dk = 1.0 - lum;',
        '    vec3 lit = base * (1.0 + L * 1.3 * dk) + (gc - L) * (0.32 + 0.45 * lum) + gc * 0.24 * dk + vec3(1.0, 0.8, 0.5) * fa * 0.4 * dk;',
        '    float ea = clamp(max(eacc.r, max(eacc.g, eacc.b)), 0.0, 1.0);',
        '    lit = lit * mix(vec3(1.0), eacc / max(ea, 0.001), ea * 0.6) + eacc * (0.45 + 0.7 * dk);',   // auf Dunklem deutlicher      // Andock-Licht: färbt auch Weiss golden
        '    float cov = clamp(max(max(al, L * 6.0), ea * 6.0), 0.0, 1.0) * here;',
        '    col = lit * cov; al = cov;',
        '  } else {',
        '    col = col + gc * (1.0 - al * 0.4) + eacc;',
        '    al = max(al, max(max(gc.r, max(gc.g, gc.b)) * 0.55, max(eacc.r, max(eacc.g, eacc.b))));',
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
      var U = {}; ['uRes', 'uDpr', 'uP', 'uAge', 'uHue', 'uB', 'uT', 'uEdgeT', 'uSeed', 'uImg', 'uHas', 'uRect', 'uCrop'].forEach(function (k) { U[k] = c.getUniformLocation(p, k); });
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
      function objPos(im) {
        var op = (getComputedStyle(im).objectPosition || '50% 50%').split(' ');
        function pc(v) { return /%$/.test(v) ? parseFloat(v) / 100 : 0.5; }
        return [pc(op[0]), pc(op[1] || op[0])];
      }
      var waves = [], buf = new Float32Array(NP * 4), ages = new Float32Array(NW), hues = new Float32Array(NW), bnd = new Float32Array(NW * 4), raf = 0, LIFE = 6.5, edgeT0 = 0, edgeSeed = 0, gImg = null, slowEma = 16, lastT = 0, slowN = 0;
      // Schärfe nach Gerät: schwache Handys (wenig Kerne/Speicher) starten gröber; jedes Gerät regelt bei Ruckeln selbst nach
      var weak = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 3);
      var dprCap = weak ? 1 : 2;
      function add(x, y) {
        var wv = waves[waves.length - 1]; if (!wv) return;
        // Hugo 23.11.: die Welle folgt dem Finger ohne Verzögerung — der letzte Punkt ("Spitze") sitzt immer genau unter
        // dem Finger und wird erst festgelegt, wenn der Finger ein Stück weiter ist; ist die Bahn voll, wird sie
        // ausgedünnt statt angehalten, so geht auch ein langer Zug bis zum Schluss mit
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
        if (!raf) raf = requestAnimationFrame(draw);
      }
      function draw(now) {
        raf = 0;
        waves = waves.filter(function (wv) { return now - wv.t0 < LIFE * 1000; });
        // immer im gerade gezeigten Bild (auch nach dem Wischen): Leinwand dorthin, dessen Foto als Textur
        var cs = slides[current()];
        if (cs) { if (cs.img !== gImg) { gImg = cs.img; } var md0 = cs.media; if (md0 && cv.previousSibling !== md0) md0.parentNode.insertBefore(cv, md0.nextSibling); }
        if (!cv.parentNode) stage.appendChild(cv);
        var sr = cv.getBoundingClientRect();
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
        for (var k = 0; k < NW; k++) {
          var wv = waves[k];
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
          bnd[k * 4] = cx - sr.left; bnd[k * 4 + 1] = cy - sr.top; bnd[k * 4 + 2] = rr; bnd[k * 4 + 3] = (wv && wv.sp2) || 1;   // Tempo der Welle (Andocken: schneller)
          for (var j = 0; j < PW; j++) {
            var i = k * PW + j, q = wv && wv.pts[j];
            if (q) { buf[i * 4] = q.x - sr.left; buf[i * 4 + 1] = q.y - sr.top; buf[i * 4 + 2] = (now - q.t) / 1000; buf[i * 4 + 3] = 1; }
            else buf[i * 4 + 3] = 0;
          }
        }
        var im = gImg; texFor(im);
        if (texOk && im) {
          var r = im.getBoundingClientRect();
          // object-fit: cover (mit object-position) → sichtbarer Ausschnitt des Bilds
          var iw = im.naturalWidth || 1, ih = im.naturalHeight || 1, ra = r.width / r.height, ia = iw / ih;
          var cw = 1, chh = 1; if (ia > ra) cw = ra / ia; else chh = ia / ra;
          var op = objPos(im);
          c.uniform4f(U.uRect, r.left - sr.left, r.top - sr.top, r.width, r.height);
          c.uniform4f(U.uCrop, (1 - cw) * op[0], (1 - chh) * op[1], cw, chh);
          c.uniform1f(U.uHas, 1);
        } else c.uniform1f(U.uHas, 0);
        c.uniform2f(U.uRes, w, h); c.uniform1f(U.uDpr, pw / w); c.uniform4fv(U.uP, buf); c.uniform1fv(U.uAge, ages); c.uniform1fv(U.uHue, hues); c.uniform4fv(U.uB, bnd); c.uniform1f(U.uT, (now / 1000) % 1000);
        var et = edgeT0 ? (now - edgeT0) / 1000 : -1; if (et > 7.2) { edgeT0 = 0; et = -1; } c.uniform1f(U.uEdgeT, et); c.uniform1f(U.uSeed, edgeSeed);
        c.clearColor(0, 0, 0, 0); c.clear(c.COLOR_BUFFER_BIT);
        if (waves.length || edgeT0) { c.drawArrays(c.TRIANGLE_STRIP, 0, 4); raf = requestAnimationFrame(draw); }
      }
      function ok() { return !desk && !root.classList.contains('is-info'); }
      // Andocken nach dem Laden (Hugo 23.11.): Licht mit grossen Flares läuft den Rand entlang (keine Welle aus der Mitte)
      function dock() {
        var cs = slides[current()]; if (!cs) return;
        gImg = cs.img; texFor(gImg);
        var md = cs.media; if (md && cv.previousSibling !== md) md.parentNode.insertBefore(cv, md.nextSibling);
        edgeT0 = performance.now(); edgeSeed = Math.floor(Math.random() * 97);
        // Hugo 23.11. (wie die Fingerwelle im Video): das Andocken löst echte Wellen aus, die rundherum am Rand beginnen
        // und nach innen durchs Bild laufen – mit Prisma-Regenbogen, Verzerrung und Solar Flares, die darauf surfen.
        // Zwei Wellen kurz nacheinander; die Bahn läuft einmal um den Rand, leicht unregelmässig (organisch).
        var r = stage.getBoundingClientRect();
        function ring(delay, inset) {
          var now = performance.now() + delay, per = 2 * (r.width + r.height), N = PW - 1, pts = [];
          var off = Math.random() * per;
          for (var i = 0; i < N; i++) {
            var d = (off + per * i / N) % per, x, y, w2 = r.width, h2 = r.height;
            if (d < w2) { x = d; y = 0; } else if (d < w2 + h2) { x = w2; y = d - w2; }
            else if (d < 2 * w2 + h2) { x = w2 - (d - w2 - h2); y = h2; } else { x = 0; y = h2 - (d - 2 * w2 - h2); }
            // knapp innerhalb des Rands, nicht überall gleich weit
            var ins = inset * (0.6 + 0.8 * Math.random());
            x = Math.min(w2 - ins, Math.max(ins, x)); y = Math.min(h2 - ins, Math.max(ins, y));
            pts.push({ x: r.left + x, y: r.top + y, t: now - Math.random() * 140 });
          }
          pts.push({ x: pts[0].x, y: pts[0].y, t: pts[0].t });   // Bahn schliessen
          waves.push({ t0: now, pts: pts }); if (waves.length > NW) waves.shift();
        }
        ring(0, 12);
        setTimeout(function () { ring(0, 22); if (!raf) raf = requestAnimationFrame(draw); }, 650);
        if (!raf) raf = requestAnimationFrame(draw);
      }
      cv.dock = dock;
      // eine Berührung = eine Welle (neue Berührung beginnt eine neue)
      stage.addEventListener('touchstart', function (e) {
        if (!ok() || !e.touches[0] || e.touches.length > 1) return;
        var t = e.touches[0], cs = slides[current()], im = (cs && cs.img) || imgAt(t.clientX, t.clientY);
        if (im !== gImg) { gImg = im; texFor(gImg); }
        var md = cs ? cs.media : (gImg && gImg.closest('.hp-media'));
        if (md && cv.previousSibling !== md) md.parentNode.insertBefore(cv, md.nextSibling);
        if (!cv.parentNode) stage.appendChild(cv);
        waves.push({ t0: performance.now(), pts: [] }); if (waves.length > NW) waves.shift();
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
      var P = introP;
      for (var j = 0; j < n; j++) {
        var s = slides[j], ax, ay, aw, ah, bx, by, bw, bh, k, E;
        if (desk) {
          aw = W * 0.055; ah = H * 0.2;
          var g = W * 0.008;
          k = j;
          ax = W / 2 + (j - (n - 1) / 2) * (aw + g) - aw / 2;
          bx = j * W / n; by = 0; bw = W / n; bh = H;
          E = easeDock(clamp((P - 0.25 - 0.02 * j) / 0.69, 0, 1));
        } else {
          var r = rel(j);
          aw = W * (LD ? CONFIG.ldStripW : CONFIG.stripW); ah = H * (LD ? CONFIG.ldStripH : CONFIG.stripH);
          k = r + Math.floor(n / 2);
          ax = (W - aw) / 2;
          bx = 0; by = r * H; bw = W; bh = H;
          // Ladeanimation (Hugo 23.11.): versetzt – die mittlere Karte führt, die äusseren hängen unterwegs etwas nach
          // und holen bis zum Einrasten wieder auf
          var xin = clamp((P - 0.25) / 0.75, 0, 1), xj = LD ? clamp(xin - 0.085 * Math.abs(r) * Math.sin(Math.PI * xin), 0, 1) : xin;
          E = LD ? easeMagnet(xj) : easeDock(xin);
          ay = H / 2 + r * (ah + (LD ? 0 : 4));   // Ladeanimation: Abstand siehe gapY
        }
        var ap = easeOut(clamp((P - 0.035 * k) / 0.2, 0, 1));
        var hA = ah * ap;
        var cy = desk ? H / 2 : ay;
        ay = cy - hA / 2;
        // Ladeanimation: der Abstand zwischen den Karten wächst mit ihnen mit und schliesst sich erst beim Einrasten
        var gapY = 0;
        if (LD && !desk) gapY = rel(j) * 2.5 * (lerp(hA, bh, E) / ah) * (1 - magnetPull(xj));
        rect(s, lerp(ax, bx, E), lerp(ay, by, E) + gapY, lerp(aw, bw, E), lerp(hA, bh, E));
        s.el.style.transform = 'none';
        s.el.style.zIndex = (!desk && rel(j) === 0) ? 3 : 2;
        // gleiche Bildgrösse wie danach beim Wischen, damit am Ende nichts springt
        if (s.media) { s.media.style.transformOrigin = '50% 50%'; s.media.style.transform = desk ? 'none' : 'scale(' + CONFIG.imgBase + ')'; s.media.style.width = ''; }
        setVis(s, ap > 0);
        // Ladeanimation (Hugo 23.11.): weisse Vierecke mit leuchtendem Rand, wie Türen, durch die Licht fällt;
        // beim Aufgehen kommt das Bild zum Vorschein
        // erst wenn das Bild sichtbar angedockt ist (Rand am Bildschirmrand), leuchtet der Rand auf
        if (LD && !desk && rel(j) === 0 && E > 0.993) LD.dock();
        if (s.gold) {
          var gv = 1 - smoothstep(0.02, 0.45, E), rim = 1 - smoothstep(0.6, 1, E);   // Hugo 23.11.: Bild blendet früher ein
          s.gold.style.opacity = gv.toFixed(3);
          // Hugo 23.11.: kein Blenden an den Ecken – das Leuchten ohne Ausdehnung (spread) und schwächer, so addieren
          // sich die Lichthöfe benachbarter Karten in den Ecken nicht zu hellen Punkten
          s.el.style.boxShadow = rim > 0.01 ? '0 0 ' + (5 + 12 * rim).toFixed(1) + 'px 0 rgba(255,250,238,' + (0.5 * rim).toFixed(3) + ')' : '';
        }
      }
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
        if (s.media) { s.media.style.transformOrigin = '50% 50%'; s.media.style.transform = 'scale(' + z.toFixed(4) + ')'; }
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
      raf = 0;
      var dt = last ? Math.min(0.034, (now - last) / 1000) : 0.016;
      last = now;
      var more = false;
      if (introOn) {
        if (!introT0) introT0 = now;
        introP = clamp((now - introT0) / CONFIG.introMs, 0, 1);

        if (introP >= 1) endIntro(); else more = true;
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
    }
    function kick() { if (!raf) raf = requestAnimationFrame(step); }
    function goTo(t) { C = t; kick(); }

    function endIntro() {
      introOn = false;
      if (LD) LD.dock();
      clearInline();
      root.classList.remove('hp-run');
      fitTitles();
      mbShow();
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
      hov = i;
      slides.forEach(function (s, j) {
        s.el.classList.toggle('is-open', j === i);
        if (s.sideLink) s.sideLink.tabIndex = j === i ? 0 : -1;
        s.side.setAttribute('aria-hidden', j === i ? 'false' : 'true');
      });
      kick();
    }
    root.addEventListener('pointerover', function (e) {
      if (!desk || busy() || e.pointerType === 'touch') return;
      var el = e.target.closest && e.target.closest('.hp-slide');
      if (!el) return;
      for (var j = 0; j < n; j++) if (slides[j].el === el) { setHov(j); break; }
    });
    root.addEventListener('pointerleave', function (e) { if (desk && e.pointerType !== 'touch') setHov(-1); });
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
      else setTimeout(openInfo, reduce ? 0 : 200);   // Hugo 23.11.: About öffnet 0.2 s später, damit die Welle zuerst sichtbar ist
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
        'uniform vec3 uTextLight; uniform float uTextAmt; uniform sampler2D uOcc; uniform float uOccOn; uniform float uOccLen; uniform float uOccAmt; uniform vec2 uExt; uniform float uRefr;',
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
        '  vec3 col;',
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
        // Liquid Glass: dicke, runde Glasschrift. Innen leicht milchig und vergrössernd, an den Rändern bricht
        // das Licht weich in Regenbogenfarben (jede Farbe etwas anders versetzt), oben ein weisser Glanz.
        '  } else {',
        // Prisma: jede Farbe kommt aus einem minimal anderen Winkel. In der Strahlmitte goldweiss,
        // an den Strahlrändern fächert es sich in klare Spektralfarben auf (eine Seite rot-orange, andere blau-violett).
        '    vec2 dd = fc - S; float cs = cos(0.017), sn = sin(0.017);',
        '    vec2 pR = S + vec2(dd.x * cs - dd.y * sn, dd.x * sn + dd.y * cs);',
        '    vec2 pB = S + vec2(dd.x * cs + dd.y * sn, -dd.x * sn + dd.y * cs);',
        '    float b0 = max(beamAt(fc), 0.03);',
        '    vec3 disp = clamp(vec3(beamAt(pR), b0, beamAt(pB)) / b0, 0.0, 1.6);',
        '    lit *= mix(1.0, 0.85 + 0.3 * sv, onG);',
        '    float tl = smoothstep(0.45, 1.0, lit);',
        '    vec3 tl3 = smoothstep(vec3(0.45), vec3(1.0), lit * disp);',
        '    float tm = min(tl3.r, min(tl3.g, tl3.b));',
        '    vec3 tc = vec3(1.0, 0.8, 0.62) * tm * 1.08 + (tl3 - tm) * vec3(1.0, 0.95, 1.25) * 1.35;',
        '    col = (tc * uTextAmt + causC * 0.8) * max(smoothstep(0.15, 0.5, uOn), uHero.z * exp(-hh * hh * 0.35));',
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
        'uBase', 'uTextLight', 'uTextAmt', 'uOcc', 'uOccOn', 'uOccLen', 'uOccAmt', 'uExt', 'uRefr', 'uShadowW', 'uTrailAmt', 'uTrail'].forEach(function (k) { U[k] = c.getUniformLocation(pr, k); });
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
        var w = Math.max(1, Math.round(wall.clientWidth * SUN.res)), h = Math.max(1, Math.round(wall.clientHeight * SUN.res));
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
        if (mode === 'info' && infoOpen.offsetWidth) {
          var br = infoOpen.getBoundingClientRect();
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
        c.uniform2f(U.uRes, cw, chh); c.uniform1f(U.uTime, tm); c.uniform3fv(U.uTrail, tbuf); c.uniform1f(U.uOccOn, G ? occ.on : 0);
        pass(0, cw, chh, 0, 0, 0, 1);
        pass(cw, cw, chh, 1, 0, 0, 1);
        probe(rect, sx);
        var H = gcv.height;
        wx.drawImage(gcv, 0, H - chh, cw, chh, 0, 0, cw, chh);
        lx.drawImage(gcv, cw, H - chh, cw, chh, 0, 0, cw, chh);
      }
      // «Werkstatt öffnen»: Licht an seiner Stelle messen, Schatten nur wenn ein Strahl ihn trifft
      var px = null, btnL = 0, pf = 0, heroNow = 0;
      function probe(rect, sx) {
        if (mode !== 'info' || ++pf % 5 || !infoOpen.offsetWidth) return;
        var r = infoOpen.getBoundingClientRect();
        var x0 = Math.max(0, Math.round((r.left - rect.left) * sx)), w = Math.min(cw - x0, Math.max(1, Math.round(r.width * sx)));
        var y = Math.round(chh - (r.top + r.height * 0.5 - rect.top) * sx);
        if (w < 1 || y < 0 || y >= chh) return;
        if (!px || px.length < w * 4) px = new Uint8Array(w * 4);
        c.readPixels(cw + x0, y, w, 1, c.RGBA, c.UNSIGNED_BYTE, px);
        var m = 0; for (var i = 0; i < w; i++) m = Math.max(m, px[i * 4]);
        var v = Math.min(1, m / 255 / (SUN.textLight[0] * SUN.textAmt));
        // CTA (Hugo 22.11.): Schatten folgt vor allem dem pulsierenden Strahl auf dem Button, andere Strahlen nur schwach
        v = Math.max(v * 0.08, heroNow);
        btnL += (v - btnL) * 0.35;
        infoOpen.style.setProperty('--hp-lit', btnL.toFixed(3));
        // Schatten in Strahlrichtung: weg von der Sonne, schräg über den Boden
        var Sx = rect.left + SUN.src[0] * rect.width, Sy = rect.top + SUN.src[1] * rect.height;
        var ddx = r.left + r.width * 0.5 - Sx, ddy = Math.max(1, r.top + r.height * 0.5 - Sy);
        var sk = Math.max(-65, Math.min(65, Math.atan(ddx / ddy) * 180 / Math.PI));
        infoOpen.style.setProperty('--hp-skew', sk.toFixed(1) + 'deg');
      }
      function loop(now) {
        raf = 0;
        if (mode === 'load' && !lightOn.want && lightOn.v <= 0) return;                 // Laden fertig, Licht aus
        if (mode === 'info' && ip.v >= 1 && !root.classList.contains('is-info')) { occ.on = 0; return; }   // Seite zu: nichts zeichnen
        draw(now);
        if (!reduce || trail.length || Math.abs(occ.want - occ.on) > 0.01) raf = requestAnimationFrame(loop);
      }
      // Fingerschatten: bleibt, solange der Finger auf dem Display liegt, und folgt ihm (auch beim Scrollen);
      // erst beim Loslassen verblasst er. Touch-Ereignisse statt Pointer, weil Pointer beim Scrollen abbrechen.
      var held = false;
      function addPt(x, y) {
        if (reduce || !root.classList.contains('is-info')) return;
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
        light: function (on) { if (on && !lightOn.want) lightOn.t0 = performance.now(); lightOn.want = !!on; start(); },
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

    var tClone = null, tOrig = null, infoT = 0, sunT = 0, sunL = 0, glassT = null;
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
      // Schriftzug dunkel, sobald die weisse Seite ihn erreicht hat
      if (brand) brand.classList.toggle('hp-on-white', ip.v < 1 && ip.v * W < brand.offsetLeft + brand.offsetWidth * 0.5);
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
        clearTimeout(sunT);
        sunT = setTimeout(function () { if (sun && glassT && tClone && root.classList.contains('is-info')) { sun.title(glassT); } }, CONFIG.infoMs * 0.85);
      }
      if (sun) {
        // Sonne erst, wenn der Titel eingeflogen ist (Hugo 22.11.)
        clearTimeout(sunL); sun.light(false);
        sunL = setTimeout(function () { if (root.classList.contains('is-info')) sun.light(true); }, reduce ? 0 : CONFIG.infoMs * 0.4);   // erster Strahl kurz nach dem Start
      }
      if (infoSlide && infoSlide !== s) { infoSlide.el.style.transform = ''; if (infoSlide.media) infoSlide.media.style.transform = 'scale(' + CONFIG.imgBase + ')'; iz.v = 0; ix.v = 0; iz.a = ix.a = null; }
      infoSlide = s; infoClosing = false;
      ix.a = null; ix.v = 0;
      tween(iz, 1, CONFIG.infoMs, zoomOpen);
      tween(ip, 0, CONFIG.infoMs, easeInfo);
      root.classList.add('is-info'); setDialog(info, true);
      mbPop(true);
      if (s.href) { var l = document.createElement('link'); l.rel = 'prefetch'; l.href = s.href; document.head.appendChild(l); }
    }
    function closeInfo() {
      if (!root.classList.contains('is-info')) return;
      root.classList.remove('is-info'); setDialog(info, false);
      mbPop(false);
      if (infoSlide) {
        ix.a = null; infoClosing = true;                 // von links herein, geführt von der weissen Seite
        tween(iz, 0, 1000, easeDock);
      }
      tween(ip, 1, CONFIG.infoMs, easeInfo);
      if (tClone) { tClone.style.transform = 'translate3d(0,0,0)'; tClone.classList.remove('hp-3d', 'hp-glass'); }
      clearTimeout(sunT); clearTimeout(sunL); if (sun) { sun.title(null); sun.light(false); }
      clearTimeout(infoT);
      infoT = setTimeout(function () {
        if (root.classList.contains('is-info')) return;
        if (tClone) { tClone.remove(); tClone = null; }
        if (tOrig) { tOrig.style.visibility = ''; tOrig = null; }
      }, CONFIG.infoMs + 50);
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
      aboutBtn.addEventListener('click', function (e) { e.preventDefault(); openInfo(); });
      aboutBtn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openInfo(); } });
    }

    // ---------- Wechsel Handy ↔ Desktop ----------
    function setMode() {
      var d = deskMQ.matches;
      if (d === desk) return;
      desk = d;
      root.classList.toggle('is-desk', desk);
      closeInfo(); setHov(-1);
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
      var seen = false; try { seen = sessionStorage.getItem('hp-ld') === '1'; } catch (e) {}
      if (desk || reduce || seen) { html.classList.remove('hp-ldpre'); return null; }
      try { sessionStorage.setItem('hp-ld', '1'); } catch (e) {}
      html.classList.add('hp-ldpre');
      slides.forEach(function (s) {
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
