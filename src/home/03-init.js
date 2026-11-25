  function init(root) {
    if (root.__hp) return;
    root.__hp = true;
    var html = document.documentElement;
    var stage = root.querySelector('.hp-stage');
    if (!stage) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Hugo 25.11. (10:56): «Galerie öffnen» / «Werkstatt betreten» schreiben sich beim Erscheinen Buchstabe für Buchstabe
    // ein, wie der Hinweis im Hintergrund der Galerie (von unten aus der Unschärfe, links nach rechts, Pfeil zuletzt)
    var HP_PEARL = ['#96dcf5', '#c3b2fa', '#f8bed7', '#fae4b4', '#a5e8d7'];   // Hirsch-Perlmutt kräftig (Webflow-Sammlung «Hirsch-Perlmutt»)
    function goSplit(label, txt) {
      label.textContent = '';
      for (var i = 0; i < txt.length; i++) {
        var c = document.createElement('span'); c.className = 'hp-ch'; c.textContent = txt.charAt(i); label.appendChild(c);
      }
      var a = label.closest ? label.closest('a') : null; if (a) a.setAttribute('aria-label', txt);
    }
    // Hugo 11:06: erst animieren, wenn der Knopf wirklich sichtbar ist (lange Texte: erst wenn er beim Scrollen ins Bild kommt),
    // frühestens zum ursprünglichen Zeitpunkt. Bis dahin sind die Buchstaben unsichtbar (hp-go-wait).
    var goIO = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var a = e.target; if (!e.isIntersecting || !a.classList.contains('hp-go-wait')) return;
        var rest = (a.__goT || 0) - performance.now();
        goIn(a, rest > 0 ? rest : CONFIG.goScrollDelay);   // Hugo 11:09: kommt er erst beim Scrollen ins Bild, kurz danach
      });
    }, { threshold: 1 }) : null;   // ganz im Bild
    function goArm(a, wait) {
      if (!a) return;
      if (!CONFIG.goAnim || reduce || !goIO || !a.animate) { a.classList.remove('hp-go-wait'); return; }
      a.__goT = performance.now() + wait; a.classList.add('hp-go-wait');
      goIO.unobserve(a); goIO.observe(a);   // neu beobachten: ist er schon sichtbar, meldet sich der Beobachter sofort
    }
    function goIn(a, base) {
      if (a) a.classList.remove('hp-go-wait');
      if (!CONFIG.goAnim || reduce || !a || !a.animate) return;
      [].forEach.call(a.querySelectorAll('.lib-sort-label .hp-ch, .lib-sort-arrow'), function (c, i) {
        if (c.closest('.hp-go-sh')) return;
        var bl = [];   // Hugo 11:17: am Computer ohne Unschärfe (Ruckeln) · Hugo 25.11. (18:19, Video): auch am Handy – die Unschärfe auf jedem Buchstaben liess das Öffnen von About ruckeln (Bilder fielen aus, sobald «Galerie öffnen» sich einschrieb)
        try { c.animate([{ opacity: 0, transform: 'translateY(.35em)', filter: bl[0] ? bl[0].filter : 'none' }, { opacity: 1, transform: 'translateY(0)', filter: bl[1] ? bl[1].filter : 'none' }],
          { duration: MOTION.ui, delay: base + i * 18, easing: MOTION.out, fill: 'backwards' }); } catch (er) {}
        // Hugo 15:47: jeder Buchstabe schimmert beim Einschreiben kurz in Hirsch-Perlmutt und setzt sich dann in seiner Farbe
        try { var fin = getComputedStyle(c).color, pc = HP_PEARL[i % HP_PEARL.length];
          c.animate([{ color: pc, textShadow: '0 0 .5em ' + pc }, { color: pc, textShadow: '0 0 .35em ' + pc, offset: 0.35 }, { color: fin, textShadow: '0 0 0 transparent' }],
            { duration: 900, delay: base + i * 18, easing: 'ease-out', fill: 'backwards' }); } catch (er) {}
      });
    }
    var deskMQ = window.matchMedia('(min-width: ' + CONFIG.desk + 'px) and (hover: hover) and (pointer: fine)');
    var links = {};
    try { links = JSON.parse(root.getAttribute('data-hp-links') || '{}'); } catch (e) {}

    var intro = root.querySelector('.hp-intro');
    var inText = intro && intro.querySelector('.hp-intro-text');
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
      var sbox = document.createElement('div'); sbox.className = 'hp-side-box'; sbox.appendChild(txt);
      sin.appendChild(sbox);
      if (s.href) {
        // Link zur Galerie im Stil von „Alle Projekte ↓“ (wie im About am Handy), Pfeil nach rechts
        var a = document.createElement('a'); a.className = 'lib-sort hp-info-go';
        a.href = s.href; a.tabIndex = -1;
        var al = document.createElement('span'); al.className = 'lib-sort-label';
        var ar = document.createElement('span'); ar.className = 'lib-sort-arrow'; ar.setAttribute('aria-hidden', 'true'); ar.textContent = '\u2192';
        a.appendChild(al); a.appendChild(ar); goSplit(al, s.btn || 'Galerie öffnen');
        a.addEventListener('click', function (e) { if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) { e.preventDefault(); e.stopPropagation(); go(s.href); } });
        sin.appendChild(a); s.sideLink = a;
      }
      side.appendChild(sin); el.appendChild(side);
      s.side = side; s.sideIn = sin;
      return s;
    });
    var n = slides.length;
    if (!n) return;


    var desk = deskMQ.matches;
    root.classList.toggle('is-desk', desk);

