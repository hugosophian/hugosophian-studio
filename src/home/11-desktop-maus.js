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

