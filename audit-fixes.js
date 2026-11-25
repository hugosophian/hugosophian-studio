/* AUDIT-FIXES (Audit 25.11.2026) · alle Seiten · unsichtbar
   1. Projekt-Lightbox: für Vorleseprogramme als Fenster gekennzeichnet (role="dialog").
   2. Galerie-Seiten ohne Hauptüberschrift (H1): unsichtbare H1 mit dem Seitentitel, für Google und Vorleseprogramme. */
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
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
