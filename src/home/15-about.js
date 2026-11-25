    // ---------- About wie bei Mario (Stand 21.11., wieder aktiv seit 25.11.) ----------
    function openInfoPlain() {
      if (desk || busy() || Math.abs(C - F) > 0.02) return;
      var s = slides[current()];
      clearTimeout(infoT); infoFrom = null;
      if (tClone) { tClone.remove(); tClone = null; }
      if (tOrig) tOrig.style.visibility = '';
      infoText.innerHTML = s.intro; lines = []; requestAnimationFrame(function () { infoLines(); stuckCheck(); linesKick(); });
      infoOpen.setAttribute('href', s.href || '#'); requestAnimationFrame(stuckCheck); goSplit(infoGoLabel, s.btn || 'Galerie öffnen'); goArm(infoOpen, Math.round(CONFIG.infoMs * 0.45) + CONFIG.goDelay);
      warmGallery(s.href);
      infoOpen.style.display = s.href ? '' : 'none';
      infoPanel.scrollTop = 0;
      infoScroll.style.transition = 'none'; infoScroll.style.opacity = '';
      // Titel: Kopie über alles legen (genau am Platz des Originals) und nach oben rechts neben
      // „Hugo Sophian Studio“ fahren. Der Text steht ebenfalls rechts davon, unter dem Schriftzug bleibt es leer.
      var rr = root.getBoundingClientRect();
      var top = Math.max(12, W * 0.03), left = W * 0.05, gap = Math.max(14, W * 0.045), right = W * 0.05;
      if (brand) { var br = brand.getBoundingClientRect(); top = br.top - rr.top; left = br.right - rr.left + gap; }
      root.style.setProperty('--hp-info-left', left.toFixed(0) + 'px');
      root.style.setProperty('--hp-info-top', (top + H * 0.12).toFixed(0) + 'px');
      if (s.title) {
        tOrig = s.title;
        tClone = s.title.cloneNode(true);
        tClone.removeAttribute('id'); tClone.classList.add('hp-info-title'); tClone.setAttribute('aria-hidden', 'true');
        tClone.style.transition = ''; tClone.style.opacity = '';
        tClone.style.transform = 'translate3d(0,0,0)';
        root.appendChild(tClone);
        tOrig.style.visibility = 'hidden';
        var cr = tClone.getBoundingClientRect();
        var rg = document.createRange(); rg.selectNodeContents(tClone);
        var tr = rg.getBoundingClientRect();
        var sc = Math.min(1, (W - left - right) / Math.max(1, tr.width));
        var ox = tr.left - cr.left, oy = tr.top - cr.top;   // Textanfang innerhalb der Kopie
        var dx = left - (cr.left - rr.left) - sc * ox;
        var dy = top - (cr.top - rr.top) - sc * oy;
        tClone.style.transformOrigin = '0 0';
        root.style.setProperty('--hp-info-top', (top + tr.height * sc + H * 0.035).toFixed(0) + 'px');
        tClone.getBoundingClientRect();   // Startlage festhalten, damit der Übergang läuft
        tClone.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0) scale(' + sc.toFixed(4) + ')';
      }
      if (infoSlide && infoSlide !== s) { infoSlide.el.style.transform = ''; if (infoSlide.media) infoSlide.media.style.transform = 'scale(' + CONFIG.imgBase + ')'; iz.v = 0; ix.v = 0; iz.a = ix.a = null; }
      infoSlide = s; infoClosing = false;
      ix.a = null; ix.v = 0;
      // Bild zoomt hinein, die weisse Seite schiebt sich von rechts darüber (Mario: 1.5 s, .6,0,.1,1)
      tween(iz, 1, CONFIG.infoMs, zoomOpen);
      tween(ip, 0, CONFIG.infoMs, easeInfo);
      root.classList.add('is-info'); setDialog(info, true);
      mbPop(true);
      if (s.href && !s.pref) { s.pref = true; var l = document.createElement('link'); l.rel = 'prefetch'; l.href = s.href; document.head.appendChild(l); }
    }
    function closeInfoPlain() {
      if (!root.classList.contains('is-info')) return;
      root.classList.remove('is-info'); setDialog(info, false);
      mbPop(false);
      if (infoSlide) {
        ix.a = null; infoClosing = true;                 // Bild kommt von links herein, geführt von der weissen Seite
        tween(iz, 0, 1000, easeDock);
      }
      tween(ip, 1, CONFIG.infoMs, easeInfo);
      if (tClone) tClone.style.transform = 'translate3d(0,0,0)';   // Titel fährt zurück an seinen Platz
      clearTimeout(infoT);
      infoT = setTimeout(function () {
        if (root.classList.contains('is-info')) return;
        if (tClone) { tClone.remove(); tClone = null; }
        if (tOrig) { tOrig.style.visibility = ''; tOrig = null; }
      }, CONFIG.infoMs + 50);
    }
    // Hugo 11:55 (Video): nach «close» sofort weitergewischt – der zurückfliegende Titel lag über dem Titel des nächsten Bilds.
    // Wischt man, solange der Titel noch zurückfliegt, bleibt er stehen und blendet in 0.15 s aus; das Original ist sofort da.
    function titleQuick() {
      if (root.classList.contains('is-info')) return;
      // Hugo 13:11 (Video): während des Schliessens weitergewischt – das Bild klebte noch an der weissen Seite (applyInfo setzte
      // seine Lage) und sprang erst danach weiter. Jetzt löst sich das Bild sofort, die Seite gleitet allein hinaus.
      if (infoSlide) {
        var s0 = infoSlide; iz.a = ix.a = null; iz.v = 0; ix.v = 0; infoClosing = false; infoSlide = null;
        s0.el.style.transform = ''; if (s0.media) s0.media.style.transform = 'scale(' + CONFIG.imgBase + ')';
        root.classList.remove('hp-info-anim'); kick();
      }
      if (!tClone) return;
      // Hugo 12:24 (Video, hoch wischen): ausblendende Kopie und Original standen kurz doppelt da. Jetzt nie zwei Titel:
      // die Kopie ist sofort weg, das Original (fährt mit seinem Bild mit) blendet in 0.22 s ein.
      var c = tClone, o = tOrig; tClone = null; tOrig = null; clearTimeout(infoT);
      c.remove();
      if (o) { o.style.visibility = ''; if (!reduce && o.animate) try { o.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' }); } catch (er) {} }
    }
    // About ohne Animation schliessen (Rückkehr aus der Galerie)
    function infoInstantClose() {
      if (!root.classList.contains('is-info') && !infoSlide) return;
      root.classList.remove('is-info', 'hp-info-anim'); setDialog(info, false);
      clearTimeout(infoT); iz.a = ix.a = ip.a = null; iz.v = 0; ix.v = 0; ip.v = 1; infoClosing = false;
      if (infoSlide) { infoSlide.el.style.transform = 'translate3d(0,0,0)'; if (infoSlide.media) infoSlide.media.style.transform = 'scale(' + CONFIG.imgBase + ')'; infoSlide = null; }
      if (tClone) { tClone.remove(); tClone = null; }
      if (tOrig) { tOrig.style.visibility = ''; tOrig = null; }
      info.style.transition = 'none'; info.getBoundingClientRect(); info.style.transition = '';   // sofort weg, ohne 1.5 s Nachlauf
      applyPanel(); if (brand) brand.classList.remove('hp-on-white');
      mbPop(false);
      kick();
    }
    function openInfo() {
      if (!CONFIG.aboutSun) { openInfoPlain(); return; }
      if (desk || busy() || Math.abs(C - F) > 0.02) {
        // Audit 24.11.: wurde nach dem Tippen doch gewischt, das schon begonnene Eintauchen zurücknehmen (sonst blieb das Bild vergrössert)
        if (tapDive && !root.classList.contains('is-info')) { dive(tapDive, 0, 0, false); tapDive = null; }
        return;
      }
      var s = slides[current()];
      clearTimeout(infoT);
      if (tClone) { tClone.remove(); tClone = null; }
      if (tOrig) tOrig.style.visibility = '';
      infoText.innerHTML = s.intro; lines = []; requestAnimationFrame(function () { infoLines(); stuckCheck(); linesKick(); });
      infoOpen.setAttribute('href', s.href || '#'); requestAnimationFrame(stuckCheck); goSplit(infoGoLabel, s.btn || 'Galerie öffnen'); goArm(infoOpen, Math.round(CONFIG.infoMs * 0.45) + CONFIG.goDelay);
      warmGallery(s.href);
      if (sun && !reduce) { goShadow(); if (!infoGoSh.parentNode) infoOpen.appendChild(infoGoSh); }
      infoOpen.style.display = s.href ? '' : 'none';
      infoPanel.scrollTop = 0;
      infoScroll.style.transition = 'none'; infoScroll.style.opacity = '';
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
        tClone.style.transition = 'none';
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
        // Hugo 24.11. (14:43): der Titel fliegt nicht mehr hoch, er steht gleich oben und kommt wie der Text Buchstabe für
        // Buchstabe aus der Lichtgeschwindigkeit; das Original unten bleibt und wird von der Sonne zugedeckt
        tClone.style.transition = 'opacity .5s ease';
        titleHy = !reduce;   // kommt nach dem Text (unten)
        clearTimeout(sunT);
        if (sun && glassT) sun.title(glassT);   // Hugo 24.11. (13:36): Horizont gleich setzen – die Sonne ist sofort sichtbar
      }
      if (sun) {
        // Sonne erst, wenn der Titel eingeflogen ist (Hugo 22.11.)
        clearTimeout(sunL); sun.light(false);
        sun.light(true, 0);   // Hugo 24.11. (18:40): ohne Vorlauf – die Strahlen wachsen unter dem Blitz heran (vorher lagen sie schon als senkrechte Streifen über dem Foto)
      }
      // Hugo 24.11. (13:36): wie am Computer – keine Bildbewegung mehr. Die Sonne mit dem Text wird von einer Welle ab dem
      // Finger nach aussen aufgedeckt, darunter läuft die Fingerwelle weiter. «close» blendet aus.
      if (infoSlide) { infoSlide.el.style.transform = ''; if (infoSlide.media) infoSlide.media.style.transform = 'scale(' + CONFIG.imgBase + ')'; iz.v = 0; ix.v = 0; iz.a = ix.a = null; infoSlide = null; root.classList.remove('hp-info-anim'); }
      infoClosing = false;
      var wasOpen = ip.v < 1;   // schliesst noch: nicht von vorn aufdecken
      clearTimeout(ipT); ip.a = null; ip.v = 0; applyPanel();
      brandWhite(false);
      var tp = infoFrom || { x: W / 2, y: H / 2 }; infoFrom = null;
      if (tapDive !== s) dive(s, tp.x, tp.y, true); tapDive = null; infoDive = s;
      if (wasOpen) { revealStop(true); brandWhite(true); }
      else reveal(tp.x, tp.y, sun ? [info, sun.glow] : [info], function (rad, lx, ly) {
        // Schriftzug wird dunkel, sobald die Welle ihn überquert hat
        if (brand && !brand.classList.contains('hp-on-white')) {
          var bx = brand.offsetLeft + brand.offsetWidth / 2, by = brand.offsetTop + Math.min(brand.offsetHeight, 120) / 2;
          if (Math.hypot(bx - lx, by - ly) < rad) brandWhite(true);
        }
      }, tp.t);
      if (reduce) brandWhite(true);
      // Hugo 24.11. (14:27/14:34): der Text kommt wie aus der Lichtgeschwindigkeit (Star Wars) – Buchstabe für Buchstabe
      // nacheinander, jeder von hinten rechts mit Lichtschweif (in Flugrichtung gestreckt), bremst hart ab und steht
      // Hugo 24.11. (14:47): erst der Text (bunt), dann Titel und «Galerie öffnen» als Letzte, perlmuttweiss
      // Hugo 24.11. (15:04): der Text lädt wieder normal (kommt mit der Sonne), nur Titel und «Galerie öffnen» aus Licht
      // Hugo 24.11. (16:40): «Galerie öffnen» kommt nicht mehr Buchstabe für Buchstabe, sondern blendet zusammen mit dem Text ein
      if (!wasOpen) {
        blotchIn(infoText, 250, 1300);   // Hugo 24.11. (15:05): der Text blendet fleckig weich ein
        try { infoOpen.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1300, delay: 250, easing: 'ease-in-out', fill: 'backwards' }); } catch (er) {}
      }
      if (titleHy && tClone && !wasOpen) hyperText(tClone, Math.max(300, 740 - 250), 320, true);   // Titel im selben Takt wie bisher (nach 0.49 s)
      titleHy = false;
      root.classList.add('is-info'); setDialog(info, true);
      brandTopOn(); brandTopFade();
      mbPop(true);
      if (s.href && !s.pref) { s.pref = true; var l = document.createElement('link'); l.rel = 'prefetch'; l.href = s.href; document.head.appendChild(l); }   // Audit 24.11.: nur einmal pro Bereich (vorher bei jedem Öffnen ein weiteres <link>)
    }
    function closeInfo() {
      if (!CONFIG.aboutSun) { closeInfoPlain(); return; }
      if (!root.classList.contains('is-info')) return;
      root.classList.remove('is-info'); setDialog(info, false);
      brandTopOn();
      mbPop(false);
      revealStop(false);   // Maske bleibt stehen und blendet mit aus
      if (infoDive) { var id0 = infoDive; setTimeout(function () { if (!root.classList.contains('is-info')) dive(id0, 0, 0, false); }, closeHold); infoDive = null; }
      clearTimeout(ipT);
      ipT = setTimeout(function () { if (root.classList.contains('is-info')) return; if (!dsunLive) brandTopOff(); revealStop(true); if (ripple && ripple.lightOnly) ripple.lightOnly(false); ip.v = 1; applyPanel(); kick(); }, closeMs + 50);
      clearTimeout(brandT); brandT = setTimeout(function () { if (!root.classList.contains('is-info')) brandCross(); }, reduce ? 0 : closeHold + 40);   // Hugo 24.11. (17:53): früh, solange es noch hell ist, und als Überblendung
      // Hugo 24.11. (14:09): kein Zurückfliegen – der Titel verschwindet im Licht des Strahls und steht danach schon
      // unten auf der Seite (das Original kommt mit der Seite unter dem ausblendenden Licht zum Vorschein)
      if (tClone && tClone.getAnimations) tClone.getAnimations().forEach(function (an) { if (an.effect && an.effect.getKeyframes && an.effect.getKeyframes().length > 2) an.cancel(); });
      if (tClone) { tClone.style.transition = 'opacity ' + (closeHold / 1000) + 's ease'; tClone.style.opacity = '0'; }
      // Hugo 24.11. (14:12): auch der Text verschwindet im Licht des Strahls (sonst schien er beim Ausblenden noch durch)
      infoScroll.style.transition = 'opacity ' + (closeHold / 1000) + 's ease'; infoScroll.style.opacity = '0';
      if (blRaf) { cancelAnimationFrame(blRaf); blRaf = 0; } infoText.style.webkitMaskImage = infoText.style.maskImage = '';
      if (infoOpen.getAnimations) infoOpen.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); });
      clearTimeout(sunT); clearTimeout(sunL); if (sun) { sun.title(null); sun.light(false); sun.blind(); }
      if (ripple && ripple.tint) ripple.tint(0);
      closeRipple();
      clearTimeout(infoT);
      infoT = setTimeout(function () {
        if (root.classList.contains('is-info')) return;
        if (tClone) { tClone.remove(); tClone = null; }
        if (tOrig) { tOrig.style.visibility = ''; tOrig = null; }
      }, closeHold);
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
