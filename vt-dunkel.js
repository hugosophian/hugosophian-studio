/* SEITENÜBERGÄNGE, Teil 3 (Website-Head): „zum Studio“ (Hugo 21.11. 16:49).
   Vor dem Wechsel zur Startseite wird die alte Seite in 0.3 s ganz schwarz. Der Wechsel selbst läuft dann
   von Schwarz zu Schwarz: Safaris aufklappende Leiste, Kanten und Striche der alten Seite sieht man nicht mehr.
   Ausgelöst von MenueWeich (mw-go) und von Links auf die Startseite (hs-vt-out). */
(function(){var d=document;d.head.appendChild(d.createElement('style')).textContent=
'html.mw-go::after,html.hs-vt-out::after{content:"";position:fixed;left:0;right:0;top:-50vh;bottom:-50vh;background:#000;z-index:2147483647;pointer-events:none;animation:hsdk .3s ease both}@keyframes hsdk{from{opacity:0}}';})();
