    // ---------- Ladeanimation (Hugo 23.11., vorerst nur Handy) ----------
    //   Alles schwarz, die Bilder kommen wie immer, aber als weisse Karten mit leuchtendem Rand – wie Türen, die aufgehen,
    //   und dahinter kommt das Bild zum Vorschein. Sobald das Bild angedockt ist, leuchtet der Rand bunt auf, das Bild
    //   wabbert kurz und kleine goldene Solar Flares züngeln aus dem Rand.
    //   Nur beim ersten Besuch pro Sitzung; mit «Bewegung reduzieren» ohne.
    LD = (function () {
      // Hugo 24.11.: die Ladeanimation läuft bei jedem Laden der Startseite (nicht nur beim ersten Besuch pro Sitzung)
      if (reduce || backIn) { html.classList.remove('hp-ldpre'); return null; }   // Hugo 24.11.: auch am Computer · zurück aus der Galerie: ohne (Hugo 09:29)
      html.classList.add('hp-ldpre');
      if (!desk && CONFIG.ldCards) slides.forEach(function (s) {   // Hugo 24.11.: weisse Karten nur am Handy (am Computer wieder entfernt)
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
          if (ripple && ripple.dock) ripple.dock(CONFIG.ldRim, CONFIG.ldFlares);   // Hugo 25.11.: Rand-Leuchten ruhiger, ohne Flares
          html.classList.remove('hp-ldpre');   // Logo und About blenden ein
          fitTitles(); if (desk) renderDesk(); root.classList.remove('hp-run');   // Computer: Titel gleich in der richtigen Grösse (sonst kurz 100 px)     // Hugo 24.11.: Titel erscheint mit dem Schlag, gleich in der richtigen Grösse und Lage
          root.classList.add('hp-dock-hit'); setTimeout(function () { root.classList.remove('hp-dock-hit'); }, 800);
        }
      };
    })();

