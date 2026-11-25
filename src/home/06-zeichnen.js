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
      var z = CONFIG.imgBase / (1 - 0.5 * p); mobZ = z;
      for (var j = 0; j < n; j++) {
        var s = slides[j], r = rel(j);
        // Hugo 25.11. (18:13): oben am iPhone eine feine helle Linie – das Bild rastet nie ganz genau ein (C nähert sich nur an),
        // vom vorherigen Bild blieb darum ein Bruchteil eines Pixels sichtbar (ein Geräte-Pixel hell). Unter 1 px = unsichtbar
        if (r <= -1 + 1 / H || r >= 1 - 1 / H) { setVis(s, false); continue; }
        var y = Math.abs(r) * H < 0.75 ? 0 : r * H;   // fast eingerastet: genau auf 0 (kein Spalt am Rand)
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
        // Hugo 25.11. (19:10): keine weissen Streifen beim Auf- und Zugehen – die weisse Spalte wird erst ab einem Viertel offen sichtbar
        // (ganz weiss ab drei Vierteln); solange sie schmal ist, ist sie durchsichtig und das Bild reicht darunter
        var sq = clamp((sw / Math.max(1, SW) - 0.25) / 0.5, 0, 1), sa = sq * sq * (3 - 2 * sq); s.sideA = sa;
        var mw = iw + sw * (1 - sa);
        var st = s.el.style;
        st.left = x.toFixed(2) + 'px'; st.width = w.toFixed(2) + 'px'; st.top = ''; st.height = '';
        st.transform = 'none'; st.zIndex = ''; st.clipPath = '';
        if (s.media) s.media.style.width = mw.toFixed(2) + 'px';
        if (s.title && maxTw > 0) {
          s.title.style.left = '0px'; s.title.style.width = iw.toFixed(2) + 'px';
          var tfs = (Math.round(iw * CONFIG.deskTitle * 100 / maxTw * 2) / 2).toFixed(1) + 'px';   // halbe Pixel: weniger Neu-Setzen der Schrift pro Bild
          if (s.title.style.fontSize !== tfs) s.title.style.fontSize = tfs;
        }
        s.side.style.width = Math.max(0, sw).toFixed(2) + 'px'; var sas = sa.toFixed(3); if (s.side.style.getPropertyValue('--hp-side-a') !== sas) s.side.style.setProperty('--hp-side-a', sas);
        s.sideIn.style.width = SW.toFixed(2) + 'px';
        var sop = clamp((s.o - CONFIG.deskTextFrom) / CONFIG.deskTextSpan, 0, 1);   // Hugo 11:00: Text blendet schneller ein (vorher ab 45 % offen, über 40 %)
        var sos = sop.toFixed(3); if (s.sideIn.style.opacity !== sos) s.sideIn.style.opacity = sos;
        if (s.sideLink) { if (sop > 0.02 && !s.goShown) { s.goShown = true; goArm(s.sideLink, 60 + CONFIG.goDelay); } else if (sop <= 0) s.goShown = false; }   // Spalte geht auf: Knopf schreibt sich ein
        setVis(s, true);
        x += w;
      }
    }

