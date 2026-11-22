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
    '[data-hp].hp-info-sunlit .hp-info-panel { text-shadow: -1px 2px 1px rgba(70,55,35,.12), -5px 11px 14px rgba(70,55,35,.16); }',
    '[data-hp].hp-info-sunlit.is-info .hp-on-white { text-shadow: -1px 2px 1px rgba(70,55,35,.12), -4px 9px 12px rgba(70,55,35,.15); }',
    '[data-hp] .hp-sun-light { z-index: 2; mix-blend-mode: screen; }',
    '[data-hp] .hp-sun-back canvas { position: absolute; display: block; pointer-events: none; }',
    '[data-hp] .hp-sun-back .hp-sun-wall { left: 0; top: 0; width: 100%; height: 100%; }',
    '[data-hp] .hp-sun-back .hp-sun-glass { display: none; }',
    '[data-hp] .hp-info-sunlit .hp-tilt { transform: perspective(900px) rotateX(24deg); transform-origin: 50% 100%; }',
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
    '@media (prefers-reduced-motion: reduce) { [data-hp] .hp-info-panel, [data-hp] .hp-stage, [data-hp] .hp-info-title { transition-duration: .01s !important; } }'
  ].join('\n');

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
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
    var introOn = !reduce, introT0 = 0, introP = 0;
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
          aw = W * CONFIG.stripW; ah = H * CONFIG.stripH;
          k = r + Math.floor(n / 2);
          ax = (W - aw) / 2;
          bx = 0; by = r * H; bw = W; bh = H;
          E = easeDock(clamp((P - 0.25) / 0.75, 0, 1));
          ay = H / 2 + r * (ah + 4);
        }
        var ap = easeOut(clamp((P - 0.035 * k) / 0.2, 0, 1));
        var hA = ah * ap;
        var cy = desk ? H / 2 : ay;
        ay = cy - hA / 2;
        rect(s, lerp(ax, bx, E), lerp(ay, by, E), lerp(aw, bw, E), lerp(hA, bh, E));
        s.el.style.transform = 'none';
        s.el.style.zIndex = (!desk && rel(j) === 0) ? 3 : 2;
        // gleiche Bildgrösse wie danach beim Wischen, damit am Ende nichts springt
        if (s.media) { s.media.style.transformOrigin = '50% 50%'; s.media.style.transform = desk ? 'none' : 'scale(' + CONFIG.imgBase + ')'; s.media.style.width = ''; }
        setVis(s, ap > 0);
      }
    }

    // Handy: durchgehender Streifen, Bild zoomt nach Tempo (wie Mario)
    function renderMob() {
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
        setTimeout(function () { introT0 = 0; kick(); }, d);
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
      else openInfo();
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

    // ---------- Sonnenlicht im Tal hinter dem About-Text (Hugo 22.11.) ----------
    // Eine kleine echte 3D-Szene, pro Bildpunkt gerechnet:
    //   Kamera schaut leicht von oben in ein Tal. Ganz hinten steht eine Wand (der Hügel), auf ihr der Titel.
    //   Die Sonne steht tief rechts hinter dem Hügel. Über dem Tal zieht eine Wolkenschicht mit Lücken.
    //   Für jeden Punkt im Dunst und am Boden wird zur Sonne geschaut: liegt eine Wolke oder ein Buchstabe
    //   dazwischen? So entstehen Lichtstrahlen im Dunst UND die passenden Lichtflecken am Boden, ganz von selbst.
    //   Der Text liegt im Tal am Boden: wo die Sonne ihn trifft, leuchtet er golden (zweite Ebene, screen).
    //   Finger und «Galerie öffnen» werfen ihre Schatten richtig über den Boden, weg von der Sonne.
    var SUN = {
      sun: [0.5, 0.115, -1.0],   // Richtung zur Sonne (rechts, tief, hinten). Höher = kürzere Schatten
      camH: 1.5,                 // Augenhöhe über dem Boden
      far: 8,                    // Abstand zur Hügelwand
      fov: 1.35,                 // Brennweite (grösser = enger)
      cloudH: 4.2,               // Höhe der Wolkenschicht
      cloudScale: 1.1,           // Grösse der Wolkenlücken (grösser = kleinere Lücken)
      cloudCover: 0.5,           // Bedeckung 0 … 1 (mehr = weniger, dafür schärfere Strahlen)
      cloudSoft: 0.14,
      wind: [0.05, 0.11],        // Wolkenzug
      fog: 0.075,                // Dichte des Dunsts (sichtbare Strahlen)
      fogH: 2.2,                 // Dunst nimmt nach oben ab
      steps: 16,
      titleAmt: 0.85,            // wie stark der Titel die Sonne verdeckt
      // Farben (Morgendunst auf Weiss). Für Abendlicht z. B. ground [0.42,0.38,0.36], lit [1,0.86,0.62], sky [0.55,0.5,0.5]
      ground: [0.83, 0.84, 0.865],  // Boden im Schatten: kühl
      lit: [1.0, 0.985, 0.95],      // Boden in der Sonne: warmes Weiss
      sky: [0.9, 0.905, 0.92],      // Hügel/Hintergrund
      glowC: [1.0, 0.93, 0.78],     // Schein um die Sonne
      fogC: [1.0, 0.95, 0.84],      // Farbe des Lichts im Dunst
      textLight: [1.0, 0.74, 0.36], // so leuchtet angestrahlte schwarze Schrift (warmes Gold)
      textAmt: 0.62,
      trailLife: 0.9,               // s, Fingerschatten
      res: 0.5                      // Auflösung (Licht und Dunst sind weich, halbe Auflösung reicht)
    };
    function v3n(v) { var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
    var sun = (function () {
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
      var NT = 10, LS = v3n(SUN.sun);
      var VS = 'attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }';
      var FS = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' + [
        'uniform vec2 uRes; uniform float uOffX; uniform float uMode; uniform float uTime; uniform float uLodB;',
        'uniform float uPitch; uniform float uF; uniform float uCamH; uniform float uFar; uniform vec3 uLs;',
        'uniform float uCH; uniform float uCS; uniform float uCC; uniform float uCSoft; uniform vec2 uWind;',
        'uniform float uFog; uniform float uFogH; uniform float uTA;',
        'uniform vec3 uGround; uniform vec3 uLit; uniform vec3 uSky; uniform vec3 uGlowC; uniform vec3 uFogC;',
        'uniform vec3 uTextLight; uniform float uTextAmt;',
        'uniform sampler2D uOcc; uniform float uOccOn; uniform vec4 uMB;',
        'uniform vec4 uTrail[' + NT + ']; uniform vec3 uSh;',     // Finger: Boden x, z, Stärke · Schattenrichtung x, z, Länge
        'float h2(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }',
        'float n2(vec2 x) { vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);',
        '  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }',
        'float fbm(vec2 p) { return 0.55 * n2(p) + 0.3 * n2(p * 2.07 + 3.1) + 0.15 * n2(p * 4.3 - 1.7); }',
        'float fbm2(vec2 p) { return 0.62 * n2(p) + 0.38 * n2(p * 2.07 + 3.1); }',
        'vec3 toWorld(vec3 v) { float c = cos(uPitch), s = sin(uPitch); return vec3(v.x, v.y * c + v.z * s, -v.y * s + v.z * c); }',
        'vec3 toCam(vec3 v) { float c = cos(uPitch), s = sin(uPitch); return vec3(v.x, v.y * c - v.z * s, v.y * s + v.z * c); }',
        'vec2 toScreen(vec3 P) { vec3 q = toCam(P - vec3(0.0, uCamH, 0.0)); return q.xy * uF / max(-q.z, 0.001) * uRes.y + 0.5 * uRes; }',
        // Wie viel Sonne kommt am Punkt P an? Wolken (Lücken) und Titel (an der Hügelwand)
        'float sunAt(vec3 P, float blur) {',
        '  float tc = (uCH - P.y) / uLs.y; vec2 cq = (P.xz + uLs.xz * tc) * uCS + uWind * uTime;',
        '  float T = smoothstep(uCC - uCSoft, uCC + uCSoft, blur > 1.0 ? fbm2(cq) : fbm(cq));',
        '  if (uOccOn > 0.0 && P.z > -uFar) {',
        '    float tt = (-uFar - P.z) / uLs.z; vec3 Q = P + uLs * tt;',
        '    vec2 uv = (toScreen(Q) - uMB.xy) / uMB.zw;',
        '    vec2 ins = step(vec2(0.0), uv) * step(uv, vec2(1.0));',
        '    float m = texture2D(uOcc, uv, uLodB + blur + log2(1.0 + tt * 0.1)).r * ins.x * ins.y;',
        '    T *= 1.0 - m * uTA * uOccOn;',
        '  }',
        '  return T;',
        '}',
        'void main() {',
        '  vec2 fc = gl_FragCoord.xy - vec2(uOffX, 0.0);',
        '  vec2 sc = (fc - 0.5 * uRes) / uRes.y;',
        '  vec3 rd = normalize(toWorld(vec3(sc, -uF))); vec3 ro = vec3(0.0, uCamH, 0.0);',
        '  float tg = rd.y < -0.0001 ? -uCamH / rd.y : 1e5;',               // Boden
        '  float tw = rd.z < -0.0001 ? -uFar / rd.z : 1e5;',               // Hügelwand
        '  bool hitG = tg < tw; float tE = min(min(tg, tw), uFar * 3.0);',
        '  float mu = dot(rd, uLs);',
        '  vec3 col; float lit = 0.0;',
        '  if (hitG) {',
        '    vec3 Pg = ro + rd * tg;',
        '    lit = sunAt(Pg, 0.0);',
        // Fingerschatten auf dem Boden: ein kleiner Stab, sein Schatten läuft weg von der Sonne
        '    float fs = 0.0;',
        '    for (int i = 0; i < ' + NT + '; i++) {',
        '      vec4 f = uTrail[i]; if (f.z <= 0.0) continue;',
        '      vec2 v = Pg.xz - f.xy; float al = dot(v, uSh.xy); float pe = length(v - uSh.xy * al);',
        '      float w = 0.035 * f.w;',
        '      fs = max(fs, f.z * exp(-pe * pe / (w * w)) * smoothstep(-0.01, 0.03, al) * (1.0 - smoothstep(0.0, uSh.z * f.w, al)));',
        '    }',
        '    lit *= 1.0 - 0.8 * fs;',
        '    float near = clamp(1.0 - tg / uFar, 0.0, 1.0);',
        '    col = mix(uGround * mix(1.0, 0.96, near), uLit, lit);',
        '  } else {',
        '    float g = pow(max(mu, 0.0), 6.0);',
        '    col = mix(uSky, uGlowC, g * 0.8);',
        '    lit = 0.0;',
        '  }',
        '  if (uMode > 0.5) {',
        '    gl_FragColor = vec4(uTextLight * uTextAmt * smoothstep(0.3, 0.95, lit) * (hitG ? 1.0 : 0.0), 1.0);',
        '    return;',
        '  }',
        // Dunst: entlang des Blicks Licht einsammeln, wo die Sonne hinkommt (Strahlen)
        '  float j = fract(52.9829 * fract(dot(fc, vec2(0.06711, 0.00584))));',   // feines Muster gegen Stufen
        '  float aL = 0.0, aD = 0.0, dt = tE / float(' + SUN.steps + ');',
        '  for (int i = 0; i < ' + SUN.steps + '; i++) {',
        '    float t = (float(i) + j) * dt; vec3 P = ro + rd * t;',
        '    float d = exp(-max(P.y, 0.0) / uFogH);',
        '    aL += sunAt(P, 1.5) * d * dt; aD += d * dt;',
        '  }',
        // auf Weiss: Dunst im Schatten ist leicht grau, Dunst im Licht warm weiss → die Strahlen
        '  float amt = 1.0 - exp(-aD * uFog);',
        '  float ph = 0.55 + 1.2 * pow(max(mu, 0.0), 3.0);',
        '  float lr = clamp(aL / max(aD, 0.0001) * ph, 0.0, 1.0);',
        '  vec3 fogCol = mix(uGround * 1.01, uFogC, lr);',
        '  col = mix(col, fogCol, amt);',
        '  col += (h2(fc + fract(uTime)) - 0.5) / 255.0;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'].join('\n');
      function sh(type, src) { var s = c.createShader(type); c.shaderSource(s, src); c.compileShader(s); if (!c.getShaderParameter(s, c.COMPILE_STATUS)) { if (window.console) console.warn(c.getShaderInfoLog(s)); return null; } return s; }
      var vs = sh(c.VERTEX_SHADER, VS), fs = sh(c.FRAGMENT_SHADER, FS);
      if (!vs || !fs) return null;
      var pr = c.createProgram(); c.attachShader(pr, vs); c.attachShader(pr, fs); c.linkProgram(pr);
      if (!c.getProgramParameter(pr, c.LINK_STATUS)) return null;
      c.useProgram(pr);
      var b = c.createBuffer(); c.bindBuffer(c.ARRAY_BUFFER, b); c.bufferData(c.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), c.STATIC_DRAW);
      var loc = c.getAttribLocation(pr, 'aPos'); c.enableVertexAttribArray(loc); c.vertexAttribPointer(loc, 2, c.FLOAT, false, 0, 0);
      var U = {}; ['uRes', 'uOffX', 'uMode', 'uTime', 'uLodB', 'uPitch', 'uF', 'uCamH', 'uFar', 'uLs', 'uCH', 'uCS', 'uCC', 'uCSoft', 'uWind', 'uFog', 'uFogH', 'uTA',
        'uGround', 'uLit', 'uSky', 'uGlowC', 'uFogC', 'uTextLight', 'uTextAmt', 'uOcc', 'uOccOn', 'uMB', 'uTrail', 'uSh'].forEach(function (k) { U[k] = c.getUniformLocation(pr, k); });
      c.uniform1f(U.uF, SUN.fov); c.uniform1f(U.uCamH, SUN.camH); c.uniform1f(U.uFar, SUN.far); c.uniform3fv(U.uLs, LS);
      c.uniform1f(U.uCH, SUN.cloudH); c.uniform1f(U.uCS, SUN.cloudScale); c.uniform1f(U.uCC, SUN.cloudCover); c.uniform1f(U.uCSoft, SUN.cloudSoft); c.uniform2fv(U.uWind, SUN.wind);
      c.uniform1f(U.uFog, SUN.fog); c.uniform1f(U.uFogH, SUN.fogH); c.uniform1f(U.uTA, SUN.titleAmt);
      c.uniform3fv(U.uGround, SUN.ground); c.uniform3fv(U.uLit, SUN.lit); c.uniform3fv(U.uSky, SUN.sky); c.uniform3fv(U.uGlowC, SUN.glowC); c.uniform3fv(U.uFogC, SUN.fogC);
      c.uniform3fv(U.uTextLight, SUN.textLight); c.uniform1f(U.uTextAmt, SUN.textAmt); c.uniform1f(U.uLodB, 0);
      // Schatten am Boden: weg von der Sonne; Länge für einen Stab der Höhe 1
      var shd = [-LS[0], -LS[2]], shl = Math.sqrt(shd[0] * shd[0] + shd[1] * shd[1]) || 1;
      c.uniform3f(U.uSh, shd[0] / shl, shd[1] / shl, shl / Math.max(0.05, LS[1]));
      // Maske des Titels als Textur (für seinen Schatten)
      var mcv = document.createElement('canvas'), mx = mcv.getContext('2d');
      var tex = c.createTexture(); c.activeTexture(c.TEXTURE0); c.bindTexture(c.TEXTURE_2D, tex);
      c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MIN_FILTER, c.LINEAR); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MAG_FILTER, c.LINEAR);
      c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_S, c.CLAMP_TO_EDGE); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_T, c.CLAMP_TO_EDGE);
      c.texImage2D(c.TEXTURE_2D, 0, c.RGBA, 1, 1, 0, c.RGBA, c.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      c.uniform1i(U.uOcc, 0);
      var occ = { on: 0, t: 0, want: 0, el: null }, pw = 1, ph = 1;
      function pot(v) { var p = 1; while (p < v) p *= 2; return p; }
      var trail = [], tbuf = new Float32Array(NT * 4), raf = 0, t0 = performance.now() - 40000, cw = 0, chh = 0;
      var G = null, cam = { pitch: 0.3 };
      function size() {
        var w = Math.max(1, Math.round(wall.clientWidth * SUN.res)), h = Math.max(1, Math.round(wall.clientHeight * SUN.res));
        if (w !== cw || h !== chh) {
          cw = wall.width = glow.width = w; chh = wall.height = glow.height = h;
          if (occ.el) mask(occ.el);
        }
        if (gcv.width !== 2 * cw || gcv.height !== chh) { gcv.width = 2 * cw; gcv.height = chh; }
      }
      // Kamera so neigen, dass der Fuss der Hügelwand (Horizont) knapp unter dem Titel liegt
      function aim(horFromTop) {
        var ys = 0.5 - horFromTop;   // Bildschirm-y des Horizonts, Mitte = 0, oben = +0.5
        cam.pitch = Math.atan(ys / SUN.fov) + Math.atan(SUN.camH / SUN.far);
        c.uniform1f(U.uPitch, cam.pitch);
      }
      // Bildschirmpunkt (CSS) → Punkt am Boden (x, z) und Entfernung
      function ground(px, py, rect) {
        var sx = (px - rect.left - rect.width / 2) / rect.height, sy = -(py - rect.top - rect.height / 2) / rect.height;
        var cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), l = Math.sqrt(sx * sx + sy * sy + SUN.fov * SUN.fov);
        var dx = sx / l, dy = (sy * cp - SUN.fov * sp) / l, dz = (-sy * sp - SUN.fov * cp) / l;
        if (dy > -0.0001) return null;
        var t = -SUN.camH / dy; return [dx * t, dz * t, t];
      }
      // Titel in die Maske zeichnen (für seinen Schatten), genau an seiner Stelle auf dem Bildschirm:
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
        var mg = (y1 - y0) * 0.25;
        var bx = Math.floor(x0 - mg), by = Math.floor(y0 - mg), bw = Math.ceil(x1 - x0 + 2 * mg), bh = Math.ceil(y1 - y0 + 2 * mg);
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
        G = { bx: bx, by: by, bw: bw, bh: bh, PW: Math.round(bw * dpr), PH: Math.round(bh * dpr), sx: sx };
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
      function pass(x, w, h, mode) {
        c.viewport(x, 0, w, h); c.uniform1f(U.uOffX, x); c.uniform1f(U.uMode, mode);
        c.drawArrays(c.TRIANGLE_STRIP, 0, 4);
      }
      function draw(now) {
        size();
        var tm = reduce ? 40.0 : (now - t0) / 1000;
        var rect = wall.getBoundingClientRect(), sx = cw / Math.max(1, rect.width);
        aim(G ? (G.by + G.bh * 0.68) / Math.max(1, rect.height) : 0.2);
        trail = trail.filter(function (p) { return now - p.t < SUN.trailLife * 1000; });
        for (var i = 0; i < NT; i++) {
          var p = trail[trail.length - 1 - i], g = p ? ground(p.x, p.y, rect) : null;
          if (g) {
            var life = 1 - (now - p.t) / (SUN.trailLife * 1000);
            tbuf[i * 4] = g[0]; tbuf[i * 4 + 1] = g[1]; tbuf[i * 4 + 2] = life * life; tbuf[i * 4 + 3] = 0.12 + g[2] * 0.06;   // Stabgrösse wächst mit der Entfernung (bleibt am Bildschirm gleich)
          } else tbuf[i * 4 + 2] = 0;
        }
        var dt = Math.min(0.05, (now - (occ.t || now)) / 1000); occ.t = now;
        occ.on += (occ.want - occ.on) * (reduce ? 1 : Math.min(1, dt * 3.5));
        c.uniform2f(U.uRes, cw, chh); c.uniform1f(U.uTime, tm); c.uniform4fv(U.uTrail, tbuf); c.uniform1f(U.uOccOn, G ? occ.on : 0);
        pass(0, cw, chh, 0);
        pass(cw, cw, chh, 1);
        probe(rect, sx);
        wx.drawImage(gcv, 0, 0, cw, chh, 0, 0, cw, chh);
        lx.drawImage(gcv, cw, 0, cw, chh, 0, 0, cw, chh);
      }
      // «Galerie öffnen»: Licht an seiner Stelle messen (Schatten nur in der Sonne) und Schattenrichtung
      // auf dem Boden aus der 3D-Szene: Fusspunkt und ein Punkt weiter weg von der Sonne → am Bildschirm
      var px = null, btnL = 0, pf = 0;
      function scr(x, z, rect) {
        var cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), y = -SUN.camH;
        var qy = y * cp - z * sp, qz = y * sp + z * cp;
        return [rect.left + rect.width / 2 + x * SUN.fov / -qz * rect.height, rect.top + rect.height / 2 - qy * SUN.fov / -qz * rect.height];
      }
      function probe(rect, sx) {
        if (++pf % 5 || !infoOpen.offsetWidth) return;
        var r = infoOpen.getBoundingClientRect();
        var x0 = Math.max(0, Math.round((r.left - rect.left) * sx)), w = Math.min(cw - x0, Math.max(1, Math.round(r.width * sx)));
        var y = Math.round(chh - (r.top + r.height * 0.5 - rect.top) * sx);
        if (w < 1 || y < 0 || y >= chh) return;
        if (!px || px.length < w * 4) px = new Uint8Array(w * 4);
        c.readPixels(cw + x0, y, w, 1, c.RGBA, c.UNSIGNED_BYTE, px);
        var m = 0; for (var i = 0; i < w; i++) m = Math.max(m, px[i * 4]);
        var v = Math.min(1, m / 255 / (SUN.textLight[0] * SUN.textAmt));
        btnL += (v - btnL) * 0.6;
        infoOpen.style.setProperty('--hp-lit', btnL.toFixed(3));
        var g = ground(r.left + r.width * 0.5, r.bottom, rect);
        if (g) {
          var a = scr(g[0], g[1], rect), bb = scr(g[0] - LS[0] * 0.3, g[1] - LS[2] * 0.3, rect);
          var ddx = bb[0] - a[0], ddy = Math.max(0.5, bb[1] - a[1]);
          infoOpen.style.setProperty('--hp-skew', Math.max(-70, Math.min(70, Math.atan(ddx / ddy) * 180 / Math.PI)).toFixed(1) + 'deg');
        }
      }
      function loop(now) {
        raf = 0;
        if (ip.v >= 1 && !root.classList.contains('is-info')) { occ.on = 0; return; }   // Seite zu: nichts zeichnen
        draw(now);
        if (!reduce || trail.length || Math.abs(occ.want - occ.on) > 0.01) raf = requestAnimationFrame(loop);
      }
      function point(e) {
        if (reduce || !root.classList.contains('is-info')) return;
        if (e.pointerType === 'touch' && e.type === 'pointermove' && !e.isPrimary) return;
        var now = performance.now(), last = trail[trail.length - 1];
        if (last && Math.abs(last.x - e.clientX) + Math.abs(last.y - e.clientY) < 8 && now - last.t < 50) { last.t = now; return; }
        trail.push({ x: e.clientX, y: e.clientY, t: now });
        if (trail.length > 30) trail.shift();
        if (!raf) raf = requestAnimationFrame(loop);
      }
      window.addEventListener('pointermove', point, { passive: true });
      window.addEventListener('pointerdown', point, { passive: true });
      function start() { if (!raf) { draw(performance.now()); raf = requestAnimationFrame(loop); } }
      return {
        back: back, wall: wall, glow: glow, start: start,
        title: function (T) { if (T) { size(); mask(T); occ.want = 1; } else occ.want = 0; start(); }
      };
    })();
    if (sun) {
      info.insertBefore(sun.back, infoPanel); info.appendChild(sun.glow);
      root.classList.add('hp-info-sunlit');
      if (!reduce) infoText.classList.add('hp-tilt');
      infoPanel.style.background = 'transparent';
    }

    var tClone = null, tOrig = null, infoT = 0, sunT = 0, glassT = null;
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
      if (sun) { sun.back.style.transform = sun.glow.style.transform = infoPanel.style.transform; if (ip.v < 1) sun.start(); }
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
      clearTimeout(sunT); if (sun) sun.title(null);
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
