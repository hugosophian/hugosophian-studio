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

    var tickNow = -1, mobZ = 1;   // Zeitstempel des laufenden Takts (während step()/Effekt), sonst -1 (z. B. bei Fingerbewegung)
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

