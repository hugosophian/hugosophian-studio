/* AUDIT-FIXES · alle Seiten · hugosophian.studio
   1.0 (Audit 25.11.2026): Projekt-Lightbox als Fenster gekennzeichnet; Galerie-Seiten ohne H1 bekommen eine unsichtbare H1.
   1.1 (Hugo 25.11., 08:48):
     – «More Projects»: die Karte der Seite, auf der man gerade ist, wird ausgeblendet.
     – Alles auf Englisch: Sprache der Seite «en» (Alchemist /mechanic und /alchemist-projects bleiben «de»),
       Texte und Vorlesetexte des Menüs auf Englisch (das Menü der Projekt- und Galerie-Seiten baut der Website-Footer). */
(function () {
  function norm(p) { return (p || '/').replace(/\/+$/, '') || '/'; }
  var here = norm(location.pathname);
  var alch = here.indexOf('/mechanic') === 0 || here.indexOf('/alchemist-projects') === 0;
  if (!alch) document.documentElement.setAttribute('lang', 'en');
  var EN = { 'zurück': 'back', 'zum studio': 'studio', 'Menü': 'Menu', 'Menü schliessen': 'Close menu', 'Menü öffnen': 'Open menu' };
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
    // More Projects: nicht auf die eigene Seite verlinken (nur Projektseiten, nicht die Galerien)
    if (!s) [].forEach.call(document.querySelectorAll('.w-dyn-item a[href]'), function (a) {
      var p = ''; try { p = norm(new URL(a.getAttribute('href'), location.href).pathname); } catch (e) { return; }
      if (p === here && a.querySelector('img')) { var it = a.closest('.w-dyn-item') || a; it.style.display = 'none'; }
    });
    if (alch) return;
    [].forEach.call(document.querySelectorAll('[data-menu-panel], .menu-toggle-wrap'), function (root) {
      [root].concat([].slice.call(root.querySelectorAll('*'))).forEach(function (el) {
        var al = el.getAttribute && el.getAttribute('aria-label');
        if (al && EN[al]) el.setAttribute('aria-label', EN[al]);
        if (el.children && !el.children.length) { var t = (el.textContent || '').trim(); if (EN[t]) el.textContent = EN[t]; }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
