    // ---------- Zurück aus der Galerie (Hugo 25.11., 09:29) ----------
    // Die Galerie schaltet ab wie ein Röhren-TV und der Lichtpunkt geht dort aus. Hier keine Ladeanimation: Die Seite
    // bleibt schwarz, bis die Bilder bereit sind, dann blenden sie ein, beim Bild des Bereichs (hp-return).
    // Computer: die Bilder gleiten stufenweise von links nach rechts weich seitlich herein. Handy: aus dem Schwarz faden.
    // Seiten-Head: html.hp-backin versteckt [data-hp], bis dieser Code übernimmt.
    var backIn = false;
    try { backIn = html.classList.contains('hp-backin') || !!sessionStorage.getItem('hp-backin'); sessionStorage.removeItem('hp-backin'); } catch (e) {}
    function backFade() {
      var go = function () {
        if (go.done) return; go.done = true;
        html.classList.remove('hp-backin');
        var free = function () { backHold = false; dsunWall(); };
        if (reduce || !root.animate) { free(); return; }
        setTimeout(free, desk ? 80 + slides.length * 140 + 1100 : 1000);
        // Hugo 09:42: jedes Bild bleibt in seiner eigenen Spalte (vorher glitt Creator kurz über Alchemist). Die Spalte
        // selbst bewegt sich nicht und schneidet ab (clip-path), nur ihr Inhalt gleitet darin seitlich herein.
        if (desk) slides.forEach(function (s, i) {
          var o = { duration: 1000, delay: 80 + i * 140, easing: MOTION.out, fill: 'backwards' };
          s.el.animate([{ opacity: 0, clipPath: 'inset(0)' }, { opacity: 1, clipPath: 'inset(0)' }], o);
          [].forEach.call(s.el.children, function (c) { c.animate([{ translate: '-26px 0', scale: '1.22' }, { translate: '0 0', scale: '1' }], o); });   // etwas grösser am Start, damit rechts keine schwarze Lücke entsteht
        });
        else root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: 'cubic-bezier(.33,0,.2,1)' });
      };
      var imgs = slides.map(function (s) { return s.img; }).filter(Boolean);
      Promise.all(imgs.map(function (im) { return im.decode ? im.decode().catch(function () {}) : Promise.resolve(); })).then(go);
      setTimeout(go, 1200);
    }
    function startIntro() {
      // Hugo 09:36 (Video): startIntro läuft zweimal → das Einblenden begann zweimal (Bild kurz da, wieder schwarz, nochmal). Nur einmal.
      if (backIn) { backIn = false; introOn = false; backHold = true; endIntro(); render(); backFade(); return; }   // zurück aus der Galerie: einblenden statt Ladeanimation
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

