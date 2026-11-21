/* SEITENÜBERGÄNGE, Teil 3 (Website-Head): „zum Studio“ (Hugo 21.11. 16:53/16:56).
   Vor dem Wechsel zur Startseite wird die alte Seite in 0.45 s ganz schwarz (gleichzeitig schliesst das Menü),
   dann blendet die Startseite ein. Ausgelöst von MenueWeich (mw-go) und von Links auf die Startseite (hs-vt-out).
   Neben der schwarzen Fläche wird auch die Seite selbst ausgeblendet: Safari (iOS 26) zeichnet feste Elemente nicht
   unter seine untere Leiste, dort blitzte sonst beim Wechsel ein Streifen der alten Seite auf. */
(function(){var d=document,T='opacity .45s ease-in-out,filter .35s cubic-bezier(.22,1,.36,1),scale .35s cubic-bezier(.22,1,.36,1)';
d.head.appendChild(d.createElement('style')).textContent=
':root:is(.mw-go,.hs-vt-out){background:#000!important}:root:is(.mw-go,.hs-vt-out) body{opacity:0!important;transition:'+T+'!important}'
+':root:is(.mw-go,.hs-vt-out)::after{content:"";position:fixed;left:0;right:0;top:-50vh;bottom:-50vh;background:#000;z-index:2147483647;pointer-events:none;animation:hsdk .45s ease-in-out both}@keyframes hsdk{from{opacity:0}}';})();
