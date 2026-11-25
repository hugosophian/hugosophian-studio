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
      if (slides[hov] && slides[hov].sideIn.classList.contains('is-scroll')) return;   // scrollender Text: keine Sonne (die Kopie würde nicht mitscrollen)
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

