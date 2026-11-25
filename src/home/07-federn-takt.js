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
      if (typeof fitSidesSoon === 'function') fitSidesSoon();   // Spaltenbreite steht erst jetzt fest
      introOn = false;
      if (LD) LD.dock();
      clearInline();
      root.classList.remove('hp-run');
      fitTitles();
      mbShow();
      dsunWall();
    }
