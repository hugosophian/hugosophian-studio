    // ---------- About (Bereichs-Text) wie bei Mario ----------
    function setDialog(el, on) { if (!el) return; el.setAttribute('aria-hidden', on ? 'false' : 'true'); if ('inert' in el) el.inert = !on; }
    var info = document.createElement('div'); info.className = 'hp-info';
    info.setAttribute('role', 'dialog'); info.setAttribute('aria-modal', 'true');
    var infoPanel = document.createElement('div'); infoPanel.className = 'hp-info-panel';
    var infoText = inText ? inText.cloneNode(false) : document.createElement('div');
    infoText.removeAttribute('id'); if (!inText) infoText.className = 'hp-intro-text';
    var infoBtns = document.createElement('div'); infoBtns.className = 'hp-info-btns';
    var infoOpen = document.createElement('a'); infoOpen.className = 'lib-sort hp-info-go';
    var infoGoLabel = document.createElement('span'); infoGoLabel.className = 'lib-sort-label'; infoGoLabel.textContent = 'Galerie öffnen';
    var infoGoArrow = document.createElement('span'); infoGoArrow.className = 'lib-sort-arrow'; infoGoArrow.setAttribute('aria-hidden', 'true'); infoGoArrow.textContent = '\u2192';
    infoOpen.appendChild(infoGoLabel); infoOpen.appendChild(infoGoArrow);
    var infoGoSh = document.createElement('span'); infoGoSh.className = 'hp-go-sh'; infoGoSh.setAttribute('aria-hidden', 'true');
    function goShadow() { infoGoSh.innerHTML = ''; infoGoSh.appendChild(infoGoLabel.cloneNode(true)); infoGoSh.appendChild(infoGoArrow.cloneNode(true)); }
    // gleich ein echtes Ziel, damit Suchmaschinen dem Link folgen können (später je nach Bild gesetzt)
    var firstHref = slides.filter(function (x) { return x.href; })[0]; infoOpen.setAttribute('href', firstHref ? firstHref.href : '/creator');
    var infoClose = inClose ? inClose.cloneNode(true) : document.createElement('div');
    infoClose.removeAttribute('id'); if (!inClose) infoClose.textContent = 'Close';
    infoClose.setAttribute('role', 'button'); infoClose.setAttribute('tabindex', '-1'); infoClose.setAttribute('data-hp-close', '');
    infoBtns.appendChild(infoOpen); infoBtns.appendChild(infoClose);
    var infoScroll = document.createElement('div'); infoScroll.className = 'hp-info-scroll';
    infoScroll.appendChild(infoText);
    var infoFix = document.createElement('div'); infoFix.className = 'hp-info-fix'; infoFix.appendChild(infoBtns);
    var infoSbW = document.createElement('div'), infoSb = null, infoSbSt = 0; infoSbW.className = 'hp-sbar-wrap';
    var infoBg = document.createElement('div'); infoBg.className = 'hp-info-bg';
    infoPanel.appendChild(infoScroll);
    // Weisser Verlauf über «Galerie öffnen» nur, solange darunter noch Text versteckt ist (Hugo 11:26)
    function stuckCheck() { var pn = infoPanel; infoBtns.classList.toggle('is-stuck', pn.scrollHeight - pn.clientHeight - pn.scrollTop > 4); }
    infoPanel.addEventListener('scroll', stuckCheck, { passive: true });
    // ---------- About-Text Wort für Wort wie perappelgren.de (Hugo 11:40) ----------
    // Appelgren (Code nachgeschaut): jedes Wort steigt mit easeOutQuart 22 px auf und blendet ein, versetzt nach seiner
    // Reihenfolge; beim Verlassen easeInOutCubic aus und 28 px nach oben. Hier: beim Öffnen des About laufen die sichtbaren
    // Wörter zeitlich gestaffelt ein, beim Scrollen langer Texte kommen die Wörter unten genauso herein und gehen oben hinaus.
    var lines = [], words = [], linesRaf = 0, linesOrig = '', wordsT0 = 0, infoZB = 0;
    // Hugo 13:54: keine Wort-Animation mehr – der Text blendet oben und unten nur noch ins Weiss aus (Maske auf dem Feld).
    // Oben erst, wenn gescrollt ist (Länge wächst mit den ersten 24 px), unten nur, solange darunter noch Text liegt.
    // Frühere Fassung mit Appelgren-Wortbewegung: @72c1de8 (apChunks/apWord, unten noch vorhanden).
    function infoLines() {
      linesOrig = infoText.innerHTML; lines = []; words = [];
      infoText.style.paddingBottom = '';
    }
    function linesTick() {
      linesRaf = 0;
      if (!root.classList.contains('is-info')) return;
      var pn = infoPanel, st = pn.scrollTop, H2 = pn.clientHeight, cs = getComputedStyle(pn);
      var topB = parseFloat(cs.paddingTop) || 0, botB = Math.min(H2 - (parseFloat(cs.paddingBottom) || 0), infoFix.offsetTop - 12);
      var rem = Math.max(0, pn.scrollHeight - H2 - st);
      var fT = reduce ? 0 : Math.min(Math.max(0, st), 52), fB = Math.min(rem, 52);   // Hugo 14:00: oben weiter unter dem Titel; 14:07 weicher (52 px)
      // Hugo 14:07 (Video): bei schnellem Schwung lag Text kurz über dem Titel bzw. dem Knopf – die Maske sass auf dem mitlaufenden
      // Inhalt und wurde nur einmal pro Bild nachgeführt. Jetzt sitzt sie fest auf dem Feld (sein weisser Grund ist eine eigene Ebene),
      // der Rand bleibt also auch im Schwung genau stehen. Verlauf weicher (mehrere Stufen, smoothstep).
      var m = 'linear-gradient(to bottom, transparent 0, transparent ' + (topB - 2).toFixed(1) + 'px, ' + softStops(topB - 2, topB + fT, false) + ', ' + (rem > 0 ? softStops(botB - fB, botB + 1, true) + ', transparent 100%' : '#000 100%') + ')';
      if (pn.style.webkitMaskImage !== m) { pn.style.webkitMaskImage = m; pn.style.maskImage = m; }
      if (infoSb) { infoSb.set(Math.max(4, parseFloat(cs.paddingLeft) - 14), topB, Math.max(0, botB - topB), st, pn.scrollHeight, H2, st !== infoSbSt); infoSbSt = st; }
    }
    function linesKick() { if (!linesRaf) linesRaf = requestAnimationFrame(linesTick); }
    infoPanel.addEventListener('scroll', linesKick, { passive: true });
    window.addEventListener('resize', function () { if (linesOrig && root.classList.contains('is-info')) { infoText.innerHTML = linesOrig; infoLines(); wordsT0 = 0; linesKick(); } });
    window.addEventListener('resize', stuckCheck);
    info.appendChild(infoBg); info.appendChild(infoPanel); info.appendChild(infoSbW); info.appendChild(infoFix); infoSb = makeSbar(infoSbW); root.appendChild(info);
    setDialog(info, false);

    // ---------- Sonne beim About: ausgeschaltet, Code liegt in archiv/sonne-about.js (Aufräumen 25.11.2026) ----------
    var sun = null;
    if (!CONFIG.aboutSun) root.classList.add('hp-nosun');
    if (sun) {
      info.insertBefore(sun.back, infoPanel); root.appendChild(sun.glow);   // Lichtebene über Text UND Titel
      root.classList.add('hp-info-sunlit');
      infoPanel.style.background = 'transparent'; infoBg.style.display = 'none';
    }
    // Wand mit Strahlen: am Handy im About, am Computer in der Bühne (für die Sonne nach 1 s Ruhe, Hugo 24.11.)
    function sunHome() {
      if (!sun) return;
      if (desk) { if (sun.back.parentNode !== dLayer) dLayer.appendChild(sun.back); }
      else if (sun.back.parentNode !== info) info.insertBefore(sun.back, infoPanel);
    }
    sunHome();
    if (!introOn) dsunWall();   // ohne Einflug (Bewegung reduzieren): weisse Wand gleich bereit

    var tClone = null, tOrig = null, infoT = 0, sunT = 0, sunL = 0, glassT = null, ipT = 0, brandT = 0, infoFrom = null, infoDive = null, tapDive = null, titleHy = false;
    // Bild beim About, genau wie Mario am Handy (main.js, Home.hide / Home.show):
    //   Öffnen:    Bild bleibt stehen und zoomt hinein (Shader-Wert scaleImage 0 → 2 in 1 s, Kurve .72,0,.11,1),
    //              die weisse Seite schiebt sich von rechts darüber (1.5 s, .6,0,.1,1).
    //   Schliessen: Bild gleitet von links herein (x −Breite → 0 in 1.5 s, .6,0,.1,1) und zoomt dabei
    //              heraus (scaleImage → 0 in 1 s, .72,0,.11,1), die weisse Seite fährt nach rechts weg.
    //   Bildausschnitt · (1 − 0.5 · scaleImage) → Zoom = 1 / (1 − 0.5 · scaleImage)
    //   Bei Mario endet der Zoom in einer Farbfläche. Wir lassen ihn darum bis zum letzten Bild weiterlaufen,
    //   bis die weisse Seite das Bild ganz zudeckt (sonst sieht man links, wie er stehen bleibt):
    //   in der ersten Sekunde wie Mario (Kurve .72,0,.11,1), danach weich weiter bis 1.5 s.
    var infoSlide = null, iz = { v: 0, a: null }, ix = { v: 0, a: null }, infoClosing = false;
    var ip = { v: 1, a: null };   // weisse Seite: 1 = rechts draussen, 0 = ganz da (im selben Takt wie das Bild)
    var brand = root.querySelector('.hp-brand');
    // Kopie des Schriftzugs über dem Licht (nur während des Blitzes)
    var brandTop = null;
    // Solange die Kopie darüber liegt und beide weiss mit Differenz sind, ist das Original versteckt (zwei Differenz-Schriften
    // übereinander heben sich auf); schwarz liegen beide deckungsgleich übereinander
    function brandWhite(on) {
      if (!brand) return; brand.classList.toggle('hp-on-white', on);
      if (brandTop) { brandTop.classList.toggle('hp-on-white', on); brand.style.opacity = on ? '' : '0'; }
    }
    function brandTopOn() {
      if (!brand || reduce) return;
      if (!brandTop) {
        brandTop = brand.cloneNode(true); brandTop.removeAttribute('id'); brandTop.removeAttribute('href'); brandTop.setAttribute('aria-hidden', 'true');
        brandTop.classList.add('hp-brand-top'); brand.parentNode.insertBefore(brandTop, brand.nextSibling);
      }
      brandTop.classList.toggle('hp-on-white', brand.classList.contains('hp-on-white'));
      brandTop.style.transition = 'none'; brandTop.style.opacity = '1';
      brand.style.transition = 'none'; brand.style.opacity = brand.classList.contains('hp-on-white') ? '' : '0';
    }
    function brandTopFade() {   // wenn der Blitz abklingt (er löst sich in 2.4 s ins Sonnenlicht auf)
      if (!brandTop) return;
      brandTop.getBoundingClientRect();   // Startwert festhalten, sonst springt der Übergang
      brandTop.style.transition = 'opacity 1.4s ease 1.4s'; brandTop.style.opacity = '0';
    }
    function brandTopOff() {
      if (brandTop) { brandTop.remove(); brandTop = null; }
      // Hugo 24.11. (17:53): ohne Übergang zurück (vorher blendete das Original hier fast 1 s neu ein – kurz durchsichtig)
      if (brand) { brand.style.transition = 'none'; brand.style.opacity = ''; brand.getBoundingClientRect(); brand.style.transition = ''; }
    }
    // Schliessen (Hugo 24.11., 17:53): das schwarze Logo (Kopie) blendet weich aus, das weisse mit Differenz (Original) ein –
    // ein harter Wechsel fiel am iPhone schon auf das durchscheinende Bild und machte den Schriftzug kurz durchsichtig
    function brandCross() {
      if (!brand) return;
      if (!brandTop) { brandWhite(false); return; }
      brand.style.transition = 'none'; brand.style.opacity = '0'; brand.classList.remove('hp-on-white'); brand.getBoundingClientRect();
      brand.style.transition = 'opacity .5s ease'; brand.style.opacity = '1';
      brandTop.style.transition = 'opacity .5s ease'; brandTop.style.opacity = '0';
    }
    function applyPanel() {
      infoPanel.style.transform = ip.v >= 1 ? '' : 'translate3d(' + (ip.v * 100).toFixed(3) + '%,0,0)';
      // Hugo 25.11. (18:19, Video): nach «close» blitzte kurz die weisse Seite mit «Galerie öffnen» auf – geschlossen setzte der
      // weisse Grund sich auf «none» (= offen) und der Knopf auf seine Grundlage, bis 1.5 s später das ganze About unsichtbar wurde.
      // Geschlossen liegen jetzt alle Ebenen ausdrücklich rechts ausserhalb
      var tOut = infoPanel.style.transform || 'translate3d(100%,0,0)';
      infoFix.style.transform = tOut;   // fester Knopf fährt mit der Seite
      infoSbW.style.transform = tOut;
      infoBg.style.transform = tOut;
      if (sun) { sun.back.style.transform = sun.glow.style.transform = infoPanel.style.transform; sun.glow.style.visibility = ip.v < 1 ? 'visible' : ''; if (ip.v < 1) sun.start(); }
      // ohne Sonne (Mario): Schriftzug dunkel, sobald die weisse Seite ihn erreicht hat
      else if (brand) brand.classList.toggle('hp-on-white', ip.v < 1 && ip.v * W < brand.offsetLeft + brand.offsetWidth * 0.5);
    }
    function zoomOpen(t) { return 0.9 * easeDock(Math.min(1, t * CONFIG.infoMs / 1000)) + 0.1 * easeInfo(t); }
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
      // Schliessen: Bildkante klebt an der weissen Seite (2 px darunter), damit nie eine Lücke entsteht
      if (infoClosing) {
        if (ip.v >= 1 && !ip.a) { ix.v = 0; infoClosing = false; }
        else ix.v = Math.min(0, ip.v - 1 + 2 / W);
      }
      if (!iz.a && !ix.a && !infoClosing && iz.v <= 0.0001 && Math.abs(ix.v) <= 0.0001) {
        s.el.style.transform = 'translate3d(0,0,0)';
        if (s.media) s.media.style.transform = 'scale(' + CONFIG.imgBase + ')';
        infoSlide = null; root.classList.remove('hp-info-anim'); return;
      }
      root.classList.add('hp-info-anim');
      s.el.style.transform = 'translate3d(' + (ix.v * W).toFixed(1) + 'px,0,0)';
      if (s.media) { s.media.style.transformOrigin = '50% 50%'; s.media.style.transform = 'scale(' + (CONFIG.imgBase / (1 - 0.97 * iz.v)).toFixed(4) + ')'; }
    }
    // Buchstabe aus Licht: von hinten rechts, in Flugrichtung gestreckt; bunt (Regenbogen) oder perlmuttweiss (iri), am Ende
    // in seiner Farbe
    // Hugo 24.11. (14:50): der Schweif besteht aus gebrochenem Licht – ein ganzes Spektrum entlang der Streckung (Prisma),
    // nicht eine Farbe; beim Ankommen deckt die eigene Farbe (schwarz) das Licht zu
    var SPEC = 'linear-gradient(100deg, #ff2d55, #ff9500, #ffd60a, #34c759, #32ade6, #5856d6, #af52de, #ff2d55)';
    var IRI = 'linear-gradient(100deg, #fff, #ffe3f1, #fff6dc, #e2fbe9, #ddf1ff, #ece4ff, #fff)';
    // Hugo 24.11. (14:51): jeder Buchstabe kommt von der Sonne her (dort, wo die Strahlen herkommen), nicht mehr von hinten
    // rechts – Weg und Streckung zeigen für jeden Buchstaben genau zur Sonne
    function sunTf(x, y, a, k, sc) { return 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + a.toFixed(1) + 'deg) scaleX(' + k + ') rotate(' + (-a).toFixed(1) + 'deg) scale(' + sc + ')'; }
    // Hugo 24.11. (15:03): schneller ohne den Effekt zu ändern – erst alle Lagen und Farben lesen (lightRead), dann schreiben.
    // Vorher wurde pro Buchstabe abwechselnd gelesen und geschrieben, das zwang den Browser hunderte Male zum Neu-Layout
    // (Hänger beim Erscheinen des Textes)
    function lightRead(us) {
      var rr0 = root.getBoundingClientRect(), sxp = rr0.left + SUN.src[0] * rr0.width, syp = rr0.top + SUN.src[1] * rr0.height;
      return us.map(function (u) { var ub = u.getBoundingClientRect(); return { fin: getComputedStyle(u).color, vx: sxp - (ub.left + ub.width / 2), vy: syp - (ub.top + ub.height / 2) }; });
    }
    function lightFrames(u, iri, pre) {
      if (!pre) pre = lightRead([u])[0];
      var fin = pre.fin, vx = pre.vx, vy = pre.vy, va = Math.atan2(vy, vx) * 180 / Math.PI;
      var st = u.style;
      st.backgroundImage = iri ? IRI : SPEC; st.backgroundSize = '300% 100%'; st.backgroundPosition = Math.round(Math.random() * 100) + '% 0';
      st.webkitBackgroundClip = 'text'; st.backgroundClip = 'text';
      return [
        { transform: sunTf(vx * 0.92, vy * 0.92, va, 4, 0.25), opacity: 0, color: 'rgba(0,0,0,0)', offset: 0 },
        { opacity: 1, offset: 0.12 },
        { transform: sunTf(vx * 0.1, vy * 0.1, va, 2.4, 0.9), opacity: 1, color: 'rgba(0,0,0,0)', offset: 0.5 },
        { transform: sunTf(0, 0, va, 1, 1), opacity: 1, color: fin, offset: 1 }
      ];
    }
    function lightClear(u) { var st = u.style; st.backgroundImage = st.backgroundSize = st.backgroundPosition = st.webkitBackgroundClip = st.backgroundClip = ''; }
    // Text blendet fleckig ein: weiche Flecken (Maske aus Kreisen an zufälligen Stellen) wachsen versetzt, bis alles da ist
    var blRaf = 0;
    function blotchIn(el, delay, ms) {
      if (blRaf) cancelAnimationFrame(blRaf); blRaf = 0;
      function setM(m) { el.style.webkitMaskImage = m; el.style.maskImage = m; }
      if (reduce || !el) { setM(''); return; }
      var NB = 11, bs = [];
      for (var i = 0; i < NB; i++) bs.push({ x: 5 + Math.random() * 90, y: 5 + Math.random() * 90, d: Math.random() * 0.55, k: 0.7 + Math.random() * 0.6 });
      var w = Math.max(el.offsetWidth, el.offsetHeight) || 300;
      setM('linear-gradient(transparent, transparent)');
      var t0 = performance.now() + delay;
      function f(now) {
        var t = (now - t0) / ms;
        if (t >= 1) { setM(''); blRaf = 0; return; }
        if (t > 0) {
          var L = bs.map(function (b) {
            var u = clamp((t - b.d) / 0.45, 0, 1); u = u * u * (3 - 2 * u);
            var r = u * w * 0.75 * b.k;
            return 'radial-gradient(circle at ' + b.x.toFixed(1) + '% ' + b.y.toFixed(1) + '%, #000 ' + (r * 0.45).toFixed(1) + 'px, transparent ' + r.toFixed(1) + 'px)';
          });
          setM(L.join(', '));
        }
        blRaf = requestAnimationFrame(f);
      }
      blRaf = requestAnimationFrame(f);
    }
    function hyperText(el, d0x, maxT, iri) {
      if (!el || !el.animate || reduce) return;
      var nodes = [], tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nd;
      while ((nd = tw.nextNode())) nodes.push(nd);
      var units = [], chars = 0;
      nodes.forEach(function (t) { chars += t.nodeValue.replace(/\s/g, '').length; });
      var perWord = chars > 700;   // sehr lange Texte: Wort für Wort (schont das Handy)
      nodes.forEach(function (t) {
        var parts = t.nodeValue.split(/(\s+)/), frag = document.createDocumentFragment();
        parts.forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
          var ws = document.createElement('span'); ws.style.whiteSpace = 'nowrap'; ws.style.display = 'inline-block';
          if (perWord) { ws.textContent = w; units.push(ws); }
          else for (var ci = 0; ci < w.length; ci++) { var c = document.createElement('span'); c.style.display = 'inline-block'; c.textContent = w[ci]; ws.appendChild(c); units.push(c); }
          frag.appendChild(ws);
        });
        t.parentNode.replaceChild(frag, t);
      });
      var N = units.length, total = Math.min(maxT || 1700, 400 + N * 3.2), each = 700, d0 = d0x == null ? 280 : d0x;
      // Hugo 24.11. (14:44): die Buchstaben bestehen erst aus Licht – bunt (Regenbogen) – und werden beim Ankommen zu ihrer
      // Farbe; sie kommen in zufälliger Reihenfolge
      var ord = units.map(function (u, i) { return i; });
      for (var oi = ord.length - 1; oi > 0; oi--) { var oj = Math.floor(Math.random() * (oi + 1)), ot = ord[oi]; ord[oi] = ord[oj]; ord[oj] = ot; }
      var pres = lightRead(units);
      units.forEach(function (u, i) {
        try {
          u.animate(lightFrames(u, iri, pres[i]), { duration: each, delay: d0 + total * ord[i] / Math.max(1, N - 1), easing: 'cubic-bezier(.1,.8,.2,1)', fill: 'backwards' });
        } catch (er) {}
      });
      // Hugo 24.11. (16:15): der Titel bleibt in seinen Buchstaben stehen (zurücksetzen liess ihn am Ende ein zweites Mal
      // aufblitzen); nur das Licht wird danach entfernt
      setTimeout(function () { units.forEach(lightClear); }, d0 + total + each + 80);
    }
