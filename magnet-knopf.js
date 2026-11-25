/* MAGNET-KNOPF · hugosophian.studio · alle Seiten (Hugo 25.11.2026)
   Nur mit Maus/Trackpad: Menü-Knopf und Close-Knopf werden weich zur Maus gezogen.
   Kommt die Maus in die Nähe (RANGE px um den Knopf), folgt der Knopf ihr zu einem Teil (PULL),
   je näher, desto stärker. Weg mit der Maus: er gleitet weich an seinen Platz zurück.
   Bewegt wird über die CSS-Eigenschaft «translate» des Knopfs selbst (der Rahmen .menu-toggle-wrap
   nutzt translate/scale für sein Hoch- und Runterbouncen, das bleibt unberührt).
   Registriert in Webflow als Website-Script «MagnetKnopf» (Footer). */
(function () {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var SEL = '[data-menu-open],[data-menu-close]';
  // Hugo 25.11. (07:49): doppelt so stark, aber sehr weich (vorher PULL 0.4, RANGE 70, EASE 0.14)
  // Hugo 25.11. (08:12): Zug noch etwas stärker (vorher PULL 0.8, RANGE 140)
  var PULL = 0.95,    // Anteil des Mauswegs, den der Knopf mitgeht
      RANGE = 170,    // Anziehung beginnt so weit ausserhalb des Knopfs (px)
      EASE = 0.075;   // Weichheit (Anteil pro Bild bei 60 fps; kleiner = weicher)
  var mx = -1e5, my = -1e5, raf = 0, last = 0, list = [];
  function collect() {
    list = list.filter(function (o) { return o.el.isConnected; });
    [].forEach.call(document.querySelectorAll(SEL), function (el) {
      for (var i = 0; i < list.length; i++) if (list[i].el === el) return;
      // Hat der Knopf im Designer einen Übergang auf «all», würde er dem Magnet hinterherlaufen: translate davon ausnehmen
      var cs = getComputedStyle(el);
      if (/all|translate/.test(cs.transitionProperty)) {
        el.style.transitionProperty = cs.transitionProperty + ',translate'; el.style.transitionDuration = cs.transitionDuration + ',0s';
        el.style.transitionTimingFunction = cs.transitionTimingFunction + ',linear'; el.style.transitionDelay = cs.transitionDelay + ',0s';
      }
      list.push({ el: el, x: 0, y: 0 });
    });
  }
  function tick(t) {
    raf = 0;
    var dt = last ? Math.min(3, (t - last) / 16.67) : 1; last = t;
    var k = 1 - Math.pow(1 - EASE, dt), more = false;
    collect();
    list.forEach(function (o) {
      var r = o.el.getBoundingClientRect(), tx = 0, ty = 0;
      if (r.width) {
        var cx = r.left + r.width / 2 - o.x, cy = r.top + r.height / 2 - o.y, dx = mx - cx, dy = my - cy;
        var ex = Math.max(0, Math.abs(dx) - r.width / 2) / RANGE, ey = Math.max(0, Math.abs(dy) - r.height / 2) / RANGE;
        var e = Math.min(1, Math.sqrt(ex * ex + ey * ey)), f = 1 - e * e * (3 - 2 * e);   // weich auslaufend am Rand
        tx = dx * PULL * f; ty = dy * PULL * f;
      }
      o.x += (tx - o.x) * k; o.y += (ty - o.y) * k;
      if (Math.abs(tx - o.x) < .05 && Math.abs(ty - o.y) < .05) { o.x = tx; o.y = ty; } else more = true;
      o.el.style.translate = (o.x || o.y) ? o.x.toFixed(2) + 'px ' + o.y.toFixed(2) + 'px' : '';
    });
    if (more) raf = requestAnimationFrame(tick); else last = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }
  addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; kick(); }, { passive: true });
  document.addEventListener('mouseout', function (e) { if (!e.relatedTarget) { mx = my = -1e5; kick(); } });
  addEventListener('blur', function () { mx = my = -1e5; kick(); });
  addEventListener('scroll', kick, { passive: true });
})();
