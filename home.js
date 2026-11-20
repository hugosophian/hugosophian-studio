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
    '[data-hp] .hp-info-panel { position: absolute; inset: 0; box-sizing: border-box; padding: var(--hp-info-top, 30vh) 5vw 16vh; background: var(--hp-info-bg, #fff); color: var(--hp-info-fg, #000); transform: translate3d(100%,0,0); transition: transform 1.5s cubic-bezier(.6,0,.1,1); display: flex; flex-direction: column; gap: 4vh; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; touch-action: pan-y; }',
    '[data-hp].is-info .hp-info-panel { transform: none; }',
    '[data-hp] .hp-info-panel .hp-intro-text { color: inherit; margin: 0; max-width: none; opacity: 1; transform: none; }',
    '[data-hp] .hp-info-btns { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }',
    '[data-hp] .hp-title.hp-info-title { z-index: 7; pointer-events: none; opacity: 1; transition: transform 1.5s cubic-bezier(.6,0,.1,1); will-change: transform; }',
    '[data-hp] .hp-about-btn, [data-hp] .hp-brand { transition: opacity .5s ease; }',
    '[data-hp].is-info .hp-about-btn, [data-hp].is-info .hp-brand { opacity: 0; pointer-events: none; }',
    '[data-hp].is-desk .hp-about-btn { display: none; }',
    /* Während About auf- und zugeht: Grund hinter dem Bild weiss statt schwarz (kein dunkler Streifen an der Kante).
       html und body bleiben schwarz, damit Safari oben und unten schwarz bleibt. */
    '[data-hp].hp-info-anim .hp-stage { background: var(--hp-info-bg, #fff); }',
    /* Desktop: nebeneinander */
    '[data-hp] .hp-side { display: none; }',
    '[data-hp].is-desk .hp-slide { inset: 0 auto 0 0; visibility: visible; will-change: left, width; }',
    '[data-hp].is-desk .hp-media { right: auto; transform: none; }',
    '[data-hp].is-desk .hp-title { right: auto; margin-left: 0; margin-right: 0; padding-left: 0; padding-right: 0; transform: none; max-width: none; }',
    '[data-hp].is-desk .hp-side { display: block; position: absolute; top: 0; bottom: 0; right: 0; width: 0; overflow: hidden; z-index: 2; background: var(--hp-side-bg, #000); color: var(--hp-side-fg, #fff); }',
    '[data-hp] .hp-side-in { position: absolute; top: 0; bottom: 0; left: 0; box-sizing: border-box; padding: 6vh 2.2vw 7vh; display: flex; flex-direction: column; justify-content: flex-end; gap: 3vh; }',
    '[data-hp] .hp-side-in .hp-intro-text { margin: 0; max-width: none; }',
    '[data-hp] .hp-side-in a { align-self: flex-start; }',
    /* Menü-Knopf: diese Seite steuert ihn selbst (Klasse lib-mb, Werte aus dem Website-Footer) */
    'html.hp-on.mh-js .menu-toggle-wrap.mh-on.mh-on { translate: 0 var(--mh-drop); transition: opacity var(--menu-dur) var(--menu-ease-out), visibility 0s, translate var(--mh-down) var(--mh-ease-down); }',
    'html.hp-on.mh-js .menu-toggle-wrap.mh-on.mh-on.lib-mb { translate: 0 0; transition: opacity var(--menu-dur) var(--menu-ease-out), visibility 0s, translate var(--mh-up) var(--mh-ease-up); }',
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
        var a = inOpen ? inOpen.cloneNode(false) : document.createElement('a');
        a.removeAttribute('id'); a.href = s.href; a.textContent = s.btn || 'Galerie öffnen'; a.tabIndex = -1;
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
      function go2() { if (done) return; done = true; introT0 = 0; kick(); }
      Promise.all(imgs.map(function (im) {
        return im.decode ? im.decode().catch(function () {}) : Promise.resolve();
      })).then(go2);
      setTimeout(go2, CONFIG.introWait);
      render();
    }

    // ---------- Menü-Knopf: weg, solange sich etwas bewegt; da, sobald alles steht ----------
    function mbWrap() { return document.querySelector('.menu-toggle-wrap'); }
    function mbShow() { var w = mbWrap(); if (w) w.classList.add('lib-mb'); }
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
    var infoOpen = inOpen ? inOpen.cloneNode(true) : document.createElement('a');
    infoOpen.removeAttribute('id'); if (!inOpen) infoOpen.textContent = 'Galerie öffnen';
    var infoClose = inClose ? inClose.cloneNode(true) : document.createElement('div');
    infoClose.removeAttribute('id'); if (!inClose) infoClose.textContent = 'Close';
    infoClose.setAttribute('role', 'button'); infoClose.setAttribute('tabindex', '0');
    infoBtns.appendChild(infoOpen); infoBtns.appendChild(infoClose);
    infoPanel.appendChild(infoText); infoPanel.appendChild(infoBtns);
    info.appendChild(infoPanel); root.appendChild(info);
    setDialog(info, false);

    var tClone = null, tOrig = null, infoT = 0;
    // Bild beim About, genau wie Mario am Handy (main.js, Home.hide / Home.show):
    //   Öffnen:    Bild bleibt stehen und zoomt hinein (Shader-Wert scaleImage 0 → 2 in 1 s, Kurve .72,0,.11,1),
    //              die weisse Seite schiebt sich von rechts darüber (1.5 s, .6,0,.1,1).
    //   Schliessen: Bild gleitet von links herein (x −Breite → 0 in 1.5 s, .6,0,.1,1) und zoomt dabei
    //              heraus (scaleImage → 0 in 1 s, .72,0,.11,1), die weisse Seite fährt nach rechts weg.
    //   Bildausschnitt · (1 − 0.5 · scaleImage) → Zoom = 1 / (1 − 0.5 · scaleImage)
    var infoSlide = null, iz = { v: 0, a: null }, ix = { v: 0, a: null };
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
      if (!iz.a && !ix.a && iz.v <= 0.0001 && Math.abs(ix.v) <= 0.0001) {
        s.el.style.transform = 'translate3d(0,0,0)';
        if (s.media) s.media.style.transform = 'scale(' + CONFIG.imgBase + ')';
        infoSlide = null; root.classList.remove('hp-info-anim'); return;
      }
      root.classList.add('hp-info-anim');
      s.el.style.transform = 'translate3d(' + (ix.v * W).toFixed(1) + 'px,0,0)';
      if (s.media) { s.media.style.transformOrigin = '50% 50%'; s.media.style.transform = 'scale(' + (CONFIG.imgBase / Math.max(0.06, 1 - 0.5 * iz.v)).toFixed(4) + ')'; }
    }
    function openInfo() {
      if (desk || busy() || Math.abs(C - F) > 0.02) return;
      var s = slides[current()];
      clearTimeout(infoT);
      if (tClone) { tClone.remove(); tClone = null; }
      if (tOrig) tOrig.style.visibility = '';
      infoText.innerHTML = s.intro;
      infoOpen.setAttribute('href', s.href || '#'); if (s.btn) infoOpen.textContent = s.btn;
      infoOpen.style.display = s.href ? '' : 'none';
      infoPanel.scrollTop = 0;
      // Titel: Kopie über alles legen (genau am Platz des Originals) und nach oben fahren
      var up = 0, top = Math.max(12, W * 0.03);
      if (s.title) {
        tOrig = s.title;
        tClone = s.title.cloneNode(true);
        tClone.removeAttribute('id'); tClone.classList.add('hp-info-title'); tClone.setAttribute('aria-hidden', 'true');
        tClone.style.transform = 'translate3d(0,0,0)';
        root.appendChild(tClone);
        tOrig.style.visibility = 'hidden';
        var r = tClone.getBoundingClientRect(), rr = root.getBoundingClientRect();
        up = top - (r.top - rr.top);
        root.style.setProperty('--hp-info-top', (top + r.height + H * 0.05).toFixed(0) + 'px');
        tClone.getBoundingClientRect();   // Startlage festhalten, damit der Übergang läuft
        tClone.style.transform = 'translate3d(0,' + up.toFixed(1) + 'px,0)';
      }
      if (infoSlide && infoSlide !== s) { infoSlide.el.style.transform = ''; if (infoSlide.media) infoSlide.media.style.transform = 'scale(' + CONFIG.imgBase + ')'; iz.v = 0; ix.v = 0; iz.a = ix.a = null; }
      infoSlide = s;
      ix.a = null; ix.v = 0;
      tween(iz, 2, 1000, easeDock);
      root.classList.add('is-info'); setDialog(info, true);
      mbShow();
      if (s.href) { var l = document.createElement('link'); l.rel = 'prefetch'; l.href = s.href; document.head.appendChild(l); }
      setTimeout(function () { if (root.classList.contains('is-info')) infoClose.focus({ preventScroll: true }); }, CONFIG.infoMs * 0.6);
    }
    function closeInfo() {
      if (!root.classList.contains('is-info')) return;
      root.classList.remove('is-info'); setDialog(info, false);
      if (infoSlide) {
        tween(ix, 0, CONFIG.infoMs, easeInfo, ix.v - 1);   // von links herein (aus der aktuellen Lage)
        tween(iz, 0, 1000, easeDock);
      }
      if (tClone) tClone.style.transform = 'translate3d(0,0,0)';
      clearTimeout(infoT);
      infoT = setTimeout(function () {
        if (root.classList.contains('is-info')) return;
        if (tClone) { tClone.remove(); tClone = null; }
        if (tOrig) { tOrig.style.visibility = ''; tOrig = null; }
      }, CONFIG.infoMs + 50);
      mbShow();
    }
    infoClose.addEventListener('click', function (e) { e.preventDefault(); closeInfo(); });
    infoClose.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeInfo(); } });
    // „Galerie öffnen“: Übergang anmelden (alte Seite blendet aus, Library startet schwarz) und selbst navigieren
    infoOpen.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (infoOpen.getAttribute('href') && infoOpen.getAttribute('href') !== '#') go(infoOpen.href);
    });
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
