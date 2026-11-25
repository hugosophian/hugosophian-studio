/* AUDIT-FIXES (Audit 25.11.2026) · alle Seiten · unsichtbar
   1. Projekt-Lightbox: für Vorleseprogramme als Fenster gekennzeichnet (role="dialog").
   2. Galerie-Seiten ohne Hauptüberschrift (H1): unsichtbare H1 mit dem Seitentitel, für Google und Vorleseprogramme.
   3. (1.2, Hugo 25.11.) «More Projects»: die Karte der Seite, auf der man gerade ist, wird ausgeblendet.
   4. (1.3, Hugo 25.11., 09:25) Menü-Link «zum studio» heisst einfach «studio».
   Sprache bleibt wie gehabt Deutsch und Englisch gemischt (Hugo 09:21: wer will, lässt übersetzen). */
(function () {
  function run() {
    [].forEach.call(document.querySelectorAll('[data-pg-lb]'), function (l) {
      l.setAttribute('role', 'dialog'); l.setAttribute('aria-modal', 'true'); l.setAttribute('aria-label', 'Image viewer');
    });
    var s = document.querySelector('[data-lib]');
    if (s && !document.querySelector('h1')) {
      var h = document.createElement('h1');
      h.textContent = (document.title || '').replace(/\s+/g, ' ').trim();
      h.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0';
      s.insertBefore(h, s.firstChild);
    }
    [].forEach.call(document.querySelectorAll('[data-menu-panel] a, .menu-panel a'), function (a) {
      if (a.children.length === 0 && a.textContent.trim().toLowerCase() === 'zum studio') a.textContent = 'studio';
    });
    if (!s) {
      var norm = function (p) { return (p || '/').replace(/\/+$/, '') || '/'; }, here = norm(location.pathname);
      [].forEach.call(document.querySelectorAll('.w-dyn-item a[href]'), function (a) {
        var p = ''; try { p = norm(new URL(a.getAttribute('href'), location.href).pathname); } catch (e) { return; }
        if (p === here && a.querySelector('img')) (a.closest('.w-dyn-item') || a).style.display = 'none';
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
