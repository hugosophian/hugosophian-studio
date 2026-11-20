/* ============================================================
   HOMEPAGE  ·  hugosophian.studio
   Läuft auf einer Seite mit einem Abschnitt [data-hp].
   Vorbild: marioroudil.com (Vollbild-Bilder senkrecht, Titel-Wechsel, About von der Seite).

   Handy und Tablet (schmaler als CONFIG.desk):
     Einflug: alle Bilder erscheinen als schmale Säule in der Mitte und ziehen sich dann auf
     Vollbild auf. Danach senkrecht wischen, ein Bild pro Geste. Die Kante des neuen Bildes ist
     wie ein Glaselement: runde Ecken, leicht eingezogen, ein Glasrand, der das Bild darunter
     verschwimmen lässt, und ein federndes Nachwippen.
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
    parallax:   0.32,   // wie weit das alte Bild nach oben mitläuft (Anteil der Bildschirmhöhe)
    imgLag:     0.45,   // das neue Bild läuft in seinem Rahmen langsamer mit (0 = fest, 1 = gleich schnell)
    oldScale:   0.06,   // das alte Bild zoomt beim Wegfahren leicht heran
    stiffness:  130,    // Feder beim Einrasten (grösser = schneller)
    damping:    0.55,   // kleiner = mehr Nachwippen
    flick:      0.22,   // wie stark ein schneller Wisch zählt (Sekunden Schwung)
    wheelIdle:  120,    // ms nach Mausrad/Trackpad, dann einrasten
    wheelStep:  700,    // Mausrad-Weg (px) für ein ganzes Bild
    edgeGuard:  40,     // px am Rand, in denen Safaris Zurück-Wischen gesperrt ist
    // Glas-Kante beim Wechsel
    glassRadius: 34,    // px Rundung der Ecken in der Mitte des Wechsels
    glassInset:  0.06,  // so viel schmaler wird das neue Bild unterwegs (Anteil)
    glassStretch: 0.018,// Dehnung pro Bild/Sekunde Tempo
    glassMax:    0.07,  // höchstens so viel Dehnung
    jelly:       0.9,   // Nachfedern beim Ankommen: das Bild dehnt sich statt das nächste zu zeigen
    lens:        1,     // Stärke des Glasrands (0 = aus)
    // Einflug
    introMs:    2000,   // Dauer
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
    pause:      2000    // Menü-Knopf kommt nach so vielen ms Ruhe
  };

  var css = [
    'html.hp-on, html.hp-on body { height: 100%; overflow: hidden; overscroll-behavior: none; }',
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
    /* Glasrand an der Kante des neuen Bildes */
    '[data-hp] .hp-lens { position: absolute; left: 0; right: 0; top: 0; height: 12vh; z-index: 4; pointer-events: none; opacity: 0; will-change: transform, opacity;',
    '  -webkit-backdrop-filter: blur(14px) saturate(1.9) brightness(1.12); backdrop-filter: blur(14px) saturate(1.9) brightness(1.12);',
    '  background: linear-gradient(to bottom, rgba(255,255,255,.22), rgba(255,255,255,.06) 30%, rgba(255,255,255,0) 70%);',
    '  box-shadow: inset 0 1.5px 0 rgba(255,255,255,.65), inset 0 6px 14px -6px rgba(255,255,255,.35);',
    '  -webkit-mask-image: linear-gradient(to bottom, #000 35%, transparent); mask-image: linear-gradient(to bottom, #000 35%, transparent); }',
    /* Intro (Handy) */
    '[data-hp] .hp-intro { visibility: hidden; opacity: 0; transition: opacity .5s ease, visibility 0s linear .5s; }',
    '[data-hp].is-intro .hp-intro { visibility: visible; opacity: 1; transition-delay: 0s; }',
    '[data-hp] .hp-intro-panel > * { opacity: 0; transform: translateY(1.2em); transition: opacity .4s ease, transform .6s cubic-bezier(.2,.7,.2,1); }',
    '[data-hp].is-intro .hp-intro-panel > * { opacity: 1; transform: none; }',
    '[data-hp].is-intro .hp-intro-panel > :nth-child(2) { transition-delay: .06s; }',
    '[data-hp].is-intro .hp-intro-panel > :nth-child(3) { transition-delay: .12s; }',
    '[data-hp].is-intro .hp-intro-panel > :nth-child(4) { transition-delay: .18s; }',
    '[data-hp].is-intro .hp-stage { filter: blur(8px) brightness(.55); }',
    /* About: Bild schrumpft zum Streifen links, Text kommt von rechts */
    '[data-hp] .hp-about { visibility: hidden; transition: visibility 0s linear .9s; }',
    '[data-hp].is-about .hp-about { visibility: visible; transition-delay: 0s; }',
    '[data-hp] .hp-about-panel { transform: translateX(101%); transition: transform .9s cubic-bezier(.7,0,.2,1); }',
    '[data-hp].is-about .hp-about-panel { transform: none; }',
    '[data-hp] .hp-about-panel > * { opacity: 0; transition: opacity .3s ease; }',
    '[data-hp].is-about .hp-about-panel > * { opacity: 1; transition: opacity .6s ease .55s; }',
    '[data-hp] .hp-stage { clip-path: inset(0 0 0 0); transition: clip-path .9s cubic-bezier(.7,0,.2,1), filter .5s ease; }',
    '[data-hp].is-about .hp-stage { clip-path: inset(0 calc(100% - var(--hp-strip, 22vw)) 0 0); }',
    '[data-hp] .hp-about-btn, [data-hp] .hp-brand { transition: opacity .4s ease, color .6s ease; }',
    '[data-hp].is-about .hp-about-btn { opacity: 0; pointer-events: none; }',
    /* Desktop: nebeneinander */
    '[data-hp] .hp-side { display: none; }',
    '[data-hp].is-desk .hp-slide { inset: 0 auto 0 0; visibility: visible; will-change: left, width; }',
    '[data-hp].is-desk .hp-media { right: auto; transform: none; }',
    '[data-hp].is-desk .hp-title { right: auto; margin-left: 0; margin-right: 0; padding-left: 0; padding-right: 0; transform: none; max-width: none; }',
    '[data-hp].is-desk .hp-lens { display: none; }',
    '[data-hp].is-desk .hp-side { display: block; position: absolute; top: 0; bottom: 0; right: 0; width: 0; overflow: hidden; z-index: 2; background: var(--hp-side-bg, #000); color: var(--hp-side-fg, #fff); }',
    '[data-hp] .hp-side-in { position: absolute; top: 0; bottom: 0; left: 0; box-sizing: border-box; padding: 6vh 2.2vw 7vh; display: flex; flex-direction: column; justify-content: flex-end; gap: 3vh; }',
    '[data-hp] .hp-side-in .hp-intro-text { margin: 0; max-width: none; }',
    '[data-hp] .hp-side-in a { align-self: flex-start; }',
    /* Menü-Knopf: diese Seite steuert ihn selbst (Klasse lib-mb, Werte aus dem Website-Footer) */
    'html.hp-on.mh-js .menu-toggle-wrap.mh-on.mh-on { translate: 0 var(--mh-drop); transition: opacity var(--menu-dur) var(--menu-ease-out), visibility 0s, translate var(--mh-down) var(--mh-ease-down); }',
    'html.hp-on.mh-js .menu-toggle-wrap.mh-on.mh-on.lib-mb { translate: 0 0; transition: opacity var(--menu-dur) var(--menu-ease-out), visibility 0s, translate var(--mh-up) var(--mh-ease-up); }',
    '@media (prefers-reduced-motion: reduce) { [data-hp] .hp-about-panel, [data-hp] .hp-stage { transition-duration: .01s !important; } }'
  ].join('\n');

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutExpo(t) { return t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2; }

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

    var lens = document.createElement('div'); lens.className = 'hp-lens'; stage.appendChild(lens);

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

    var F = 0, V = 0, T = 0, W = 1, H = 1, mode = 'idle', raf = 0, last = 0;
    var hov = -1, deskMoving = false;
    var introOn = !reduce, introT0 = 0, introP = 0;
    function wrap(x) { return ((x % n) + n) % n; }
    function rel(j, f) { var d = wrap(j - (f === undefined ? F : f)); return d > n / 2 ? d - n : d; }
    var dir = 0;
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
      lens.style.opacity = 0;
    }

    // ---------- Zeichnen ----------
    function render() {
      W = stage.clientWidth || window.innerWidth;
      H = stage.clientHeight || window.innerHeight;
      if (introOn) renderIntro();
      else if (desk) renderDesk();
      else renderMob();
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
          E = easeInOutExpo(clamp((P - 0.4 - 0.025 * j) / 0.55, 0, 1));
        } else {
          var r = rel(j);
          aw = W * CONFIG.stripW; ah = H * CONFIG.stripH;
          k = r + Math.floor(n / 2);
          ax = (W - aw) / 2;
          bx = 0; by = r * H; bw = W; bh = H;
          E = easeInOutExpo(clamp((P - 0.38) / 0.62, 0, 1));
          ay = H / 2 + r * (ah + 4);
        }
        var ap = easeOut(clamp((P - 0.05 * k) / 0.3, 0, 1));
        var hA = ah * ap;
        var cy = desk ? H / 2 : ay;
        ay = cy - hA / 2;
        rect(s, lerp(ax, bx, E), lerp(ay, by, E), lerp(aw, bw, E), lerp(hA, bh, E));
        s.el.style.transform = 'none';
        s.el.style.zIndex = (!desk && rel(j) === 0) ? 3 : 2;
        if (s.media) { s.media.style.transform = 'none'; s.media.style.width = ''; }
        setVis(s, ap > 0);
      }
    }

    // Handy: senkrechter Wechsel mit Glas-Kante
    function renderMob() {
      var vel = mode === 'drag' ? dragV : V;
      // Überschwingen über das Ziel hinaus: nicht das nächste Bild zeigen, sondern das angekommene Bild federn lassen
      var f = F, jel = 0;
      if (mode === 'spring' && dir && (F - T) * dir > 0) { jel = Math.abs(F - T) * CONFIG.jelly; f = T; }
      var stretch = Math.min(CONFIG.glassMax, Math.abs(vel) * CONFIG.glassStretch);
      var lensOn = false;
      for (var j = 0; j < n; j++) {
        var s = slides[j], r = rel(j, f), y, my, sc = 1, sy = 1, sx = 1, rad = 0, z, vis;
        if (r > 0 && r < 1) {                 // kommt von unten herein, liegt oben
          var bump = Math.sin(Math.PI * r);
          y = r * H; my = -y * (1 - CONFIG.imgLag); z = 3; vis = true;
          sx = 1 - CONFIG.glassInset * bump; rad = CONFIG.glassRadius * bump; sy = 1 + stretch;
          lens.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0) scale(' + sx.toFixed(4) + ',1)';
          lens.style.borderRadius = rad.toFixed(1) + 'px ' + rad.toFixed(1) + 'px 0 0';
          lens.style.opacity = (CONFIG.lens * Math.pow(bump, 0.6)).toFixed(3);
          lensOn = true;
        } else if (r <= 0 && r > -1) {        // aktuelles Bild, läuft langsam nach oben weg
          y = r * H * CONFIG.parallax; my = 0; sc = 1 - r * CONFIG.oldScale; z = 2; vis = true;
        } else { vis = false; }
        setVis(s, vis);
        if (!vis) continue;
        s.el.style.zIndex = z;
        s.el.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)' + (sx !== 1 ? ' scale(' + sx.toFixed(4) + ',1)' : '');
        s.el.style.clipPath = rad > 0.5 ? 'inset(0 round ' + rad.toFixed(1) + 'px ' + rad.toFixed(1) + 'px 0 0)' : '';
        if (r === 0 && jel) { sy = 1 + jel; }
        if (s.media) {
          s.media.style.transformOrigin = z === 3 ? '50% 0' : r === 0 && jel ? (dir > 0 ? '50% 0' : '50% 100%') : '50% 50%';
          s.media.style.transform = 'translate3d(0,' + my.toFixed(2) + 'px,0) scale(' + sc.toFixed(4) + ',' + (sc * sy).toFixed(4) + ')';
        }
        if (s.title) s.title.style.transform = 'translate3d(0,' + (-y).toFixed(2) + 'px,0)' + (sx !== 1 ? ' scale(' + (1 / sx).toFixed(4) + ',1)' : '');
      }
      if (!lensOn) lens.style.opacity = 0;
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
      } else if (mode === 'spring') {
        var k2 = CONFIG.stiffness, c2 = 2 * Math.sqrt(k2) * CONFIG.damping;
        V += (k2 * (T - F) - c2 * V) * dt;
        F += V * dt;
        if (Math.abs(T - F) < 0.0005 && Math.abs(V) < 0.005) { F = T; V = 0; mode = 'idle'; }
        more = mode === 'spring';
      } else if (mode === 'drag') { more = true; dragV *= Math.pow(0.02, dt); }
      render();
      if (more) kick(); else last = 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(step); }
    function goTo(t) { dir = t > F ? 1 : t < F ? -1 : 0; T = t; mode = 'spring'; kick(); }

    function endIntro() {
      introOn = false;
      clearInline();
      root.classList.remove('hp-run');
      fitTitles();
      if (desk) mbShow(); else mbWait();
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

    // ---------- Menü-Knopf ----------
    var mbTimer = 0, mbPending = false, held = false;
    function mbWrap() { return document.querySelector('.menu-toggle-wrap'); }
    function mbShow() { clearTimeout(mbTimer); mbPending = false; var w = mbWrap(); if (w) w.classList.add('lib-mb'); }
    function mbHide() { clearTimeout(mbTimer); var w = mbWrap(); if (w) w.classList.remove('lib-mb'); }
    function mbWait() { clearTimeout(mbTimer); mbPending = true; if (!held) mbTimer = setTimeout(mbShow, CONFIG.pause); }
    function activity() { if (busy() || desk) return; mbHide(); mbWait(); }
    window.addEventListener('pointerdown', function () { held = true; clearTimeout(mbTimer); }, true);
    window.addEventListener('pointerup', function () { held = false; if (mbPending) mbWait(); }, true);
    window.addEventListener('pointercancel', function () { held = false; if (mbPending) mbWait(); }, true);
    window.addEventListener('keydown', function (e) { if (e.key === 'Tab') mbShow(); });

    function busy() { return introOn || root.classList.contains('is-intro') || root.classList.contains('is-about'); }

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
    var down = null, moved = false, samples = [], dragV = 0;
    root.addEventListener('pointerdown', function (e) {
      if (desk || busy() || e.target.closest('.hp-about-btn, a, button, [role="button"]')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY, f0: F, id: e.pointerId };
      moved = false; samples = [{ t: performance.now(), y: e.clientY }];
    });
    window.addEventListener('pointermove', function (e) {
      if (!down || e.pointerId !== down.id) return;
      var dy = e.clientY - down.y;
      if (!moved) {
        if (Math.abs(dy) < 6 && Math.abs(e.clientX - down.x) < 6) return;
        moved = true; mode = 'drag'; down.y = e.clientY; down.f0 = F; dy = 0;
        root.classList.add('is-dragging'); activity();
      }
      var now = performance.now();
      samples.push({ t: now, y: e.clientY });
      while (samples.length > 2 && now - samples[0].t > 90) samples.shift();
      var s0 = samples[0];
      if (now > s0.t) dragV = -(e.clientY - s0.y) / H / ((now - s0.t) / 1000);
      var nf = down.f0 - dy / H;
      nf = Math.max(Math.round(down.f0) - 1, Math.min(Math.round(down.f0) + 1, nf));
      F = nf; kick();
    });
    function release(e, cancel) {
      if (!down || (e && e.pointerId !== down.id)) return;
      root.classList.remove('is-dragging');
      if (moved || cancel) {
        var s0 = samples[0], s1 = samples[samples.length - 1];
        var vy = s1.t > s0.t ? (s1.y - s0.y) / ((s1.t - s0.t) / 1000) : 0;
        if (performance.now() - s1.t > 80) vy = 0;
        V = -vy / H;
        var base = Math.round(down.f0), proj = F + V * CONFIG.flick;
        var t = proj - base > 0.25 ? base + 1 : proj - base < -0.25 ? base - 1 : base;
        goTo(t); activity();
      } else {
        openIntro();
      }
      down = null;
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

    // Mausrad und Trackpad: ein Bild pro Geste (nur senkrechte Ansicht)
    var wheelT = 0, wheelBase = null, wheelLast = 0;
    root.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (desk || busy()) return;
      var d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (e.deltaMode === 1) d *= 32;
      if (!d) return;
      if (wheelBase === null) wheelBase = Math.round(F);
      var now = performance.now();
      if (wheelLast && now > wheelLast) dragV = (d / CONFIG.wheelStep) / ((now - wheelLast) / 1000) * 0.5;
      wheelLast = now;
      mode = 'drag';
      F = Math.max(wheelBase - 1, Math.min(wheelBase + 1, F + d / CONFIG.wheelStep));
      kick(); activity();
      clearTimeout(wheelT);
      wheelT = setTimeout(function () {
        var t = F - wheelBase > 0.15 ? wheelBase + 1 : F - wheelBase < -0.15 ? wheelBase - 1 : wheelBase;
        V = dragV * 0.5; wheelBase = null; wheelLast = 0; goTo(t);
      }, CONFIG.wheelIdle);
    }, { passive: false });

    // Tastatur
    document.addEventListener('keydown', function (e) {
      if (html.classList.contains('menu-open')) return;
      if (e.key === 'Escape') { if (root.classList.contains('is-intro')) closeIntro(); else if (root.classList.contains('is-about')) closeAbout(); else if (desk) setHov(-1); return; }
      if (busy()) return;
      if (desk) {
        if (e.key === 'ArrowRight') { e.preventDefault(); setHov(hov < 0 ? 0 : Math.min(n - 1, hov + 1)); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); setHov(hov < 0 ? n - 1 : Math.max(0, hov - 1)); }
        else if (e.key === 'Enter' && hov >= 0 && document.activeElement === document.body) go(slides[hov].href);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goTo(Math.round(T === F ? F : T) + 1); activity(); }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goTo(Math.round(T === F ? F : T) - 1); activity(); }
      else if (e.key === 'Enter' && document.activeElement === document.body) openIntro();
    });

    // ---------- Intro (Handy) ----------
    var openedAt = 0;
    function setDialog(el, on) { if (!el) return; el.setAttribute('aria-hidden', on ? 'false' : 'true'); if ('inert' in el) el.inert = !on; }
    if (intro) { intro.setAttribute('role', 'dialog'); intro.setAttribute('aria-modal', 'true'); setDialog(intro, false); }
    function openIntro() {
      if (!intro || desk || mode === 'spring' && Math.abs(T - F) > 0.02) return;
      var s = slides[current()];
      if (inTitle) inTitle.textContent = s.label;
      if (inText) inText.innerHTML = s.intro;
      if (inOpen) { inOpen.setAttribute('href', s.href || '#'); if (s.btn) inOpen.textContent = s.btn; }
      root.classList.add('is-intro'); setDialog(intro, true); openedAt = performance.now();
      mbShow();
      if (s.href) { var l = document.createElement('link'); l.rel = 'prefetch'; l.href = s.href; document.head.appendChild(l); }
      if (inClose) setTimeout(function () { inClose.focus({ preventScroll: true }); }, 400);
    }
    function closeIntro() { root.classList.remove('is-intro'); setDialog(intro, false); activity(); }
    if (intro) intro.addEventListener('click', function (e) {
      if (performance.now() - openedAt < 450) return;
      if (e.target.closest('.hp-intro-close') || !e.target.closest('.hp-intro-panel')) { e.preventDefault(); closeIntro(); }
    });

    // ---------- About ----------
    var aboutBtn = root.querySelector('.hp-about-btn');
    var about = root.querySelector('.hp-about');
    var aboutClose = about && about.querySelector('.hp-about-close');
    if (about) { about.setAttribute('role', 'dialog'); setDialog(about, false); }
    var aboutPanel = about && about.querySelector('.hp-about-panel');
    function openAbout() {
      if (!about) return;
      closeIntro(); setHov(-1);
      if (aboutPanel) root.style.setProperty('--hp-strip', Math.max(0, aboutPanel.offsetLeft) + 'px');
      root.classList.add('is-about'); setDialog(about, true); mbShow();
    }
    function closeAbout() { root.classList.remove('is-about'); setDialog(about, false); activity(); }
    [aboutBtn, aboutClose].forEach(function (b) {
      if (!b) return;
      b.setAttribute('role', 'button'); b.setAttribute('tabindex', '0');
      function act(e) { e.preventDefault(); if (b === aboutBtn) openAbout(); else closeAbout(); }
      b.addEventListener('click', act);
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') act(e); });
    });
    // „Galerie öffnen“: Übergang anmelden (alte Seite blendet aus, Library startet schwarz) und selbst navigieren
    if (inOpen) inOpen.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
      if (!inOpen.href || inOpen.getAttribute('href') === '#') { e.preventDefault(); return; }
      e.preventDefault(); e.stopImmediatePropagation();
      go(inOpen.href);
    });
    if (inClose) { inClose.setAttribute('role', 'button'); inClose.setAttribute('tabindex', '0'); inClose.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeIntro(); } }); }

    // ---------- Wechsel Handy ↔ Desktop ----------
    function setMode() {
      var d = deskMQ.matches;
      if (d === desk) return;
      desk = d;
      root.classList.toggle('is-desk', desk);
      closeIntro(); setHov(-1);
      slides.forEach(function (s) { s.o = 0; s.ov = 0; });
      F = T = Math.round(F); V = 0; mode = 'idle';
      clearInline();
      slides.forEach(function (s) { if (s.title) s.title.style.fontSize = ''; });
      fitTitles(); render();
      if (desk) mbShow(); else mbWait();
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
    if (!introOn) { if (desk) mbShow(); else mbWait(); }
    window.addEventListener('resize', function () { fitTitles(); render(); });
    window.addEventListener('pageshow', function (e) { if (e.persisted) { render(); if (!busy() && !desk) mbWait(); } });
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
