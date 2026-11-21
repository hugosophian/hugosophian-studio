/* SEITENÜBERGÄNGE, Teil 3 (Website-Head): „zum Studio“ (Hugo 21.11. 17:15: „wie beim Model“).
   1) Nur der sichtbare Ausschnitt der alten Seite klappt als Ganzes nach oben weg (Desktop: nach rechts), ohne
      Ausblenden, darunter ist Schwarz. Wie auf der schwarzen Model-Seite: kein Grau (der Seitengrund wird sofort schwarz, nicht über 1 s überblendet), und auf langen Seiten rutscht
      kein weiterer Inhalt von unten nach. Das passiert noch auf der alten Seite selbst; Safaris aufklappende Leiste
      kommt erst danach auf Schwarz. Dann kommt die Startseite von unten (Teil 2).
      Ausgelöst von MenueWeich (mw-go, Laden startet nach 0.25 s) und von Links auf die Startseite (hs-vt-out).
   Das Vorladen der Startseite steht in vt-vorladen.js. */
(function(){var d=document,R=d.documentElement,E='cubic-bezier(.7,0,.2,1)',Z='cubic-bezier(.22,1,.36,1)';
d.head.appendChild(d.createElement('style')).textContent=
':root{--hgo:115vw 0}@media (max-width:767px){:root{--hgo:0 -115vh}}:root:is(.mw-go,.hs-vt-out){background:#000!important;transition:none!important}'
+':root:is(.mw-go,.hs-vt-out) body{translate:var(--hgo)!important;clip-path:inset(var(--hct,0) 0 var(--hcb,0) 0)!important;transition:translate .45s '+E+',filter .35s '+Z+',scale .35s '+Z+'!important}';
// sichtbaren Ausschnitt festhalten (auch den Teil unter Safaris durchsichtiger Leiste: grosse Viewport-Höhe)
var lv=d.createElement('div');lv.style.cssText='position:absolute;top:0;width:1px;height:100lvh;visibility:hidden;pointer-events:none';
function clip(){var b=d.body;if(!b)return;if(!lv.parentNode)b.appendChild(lv);
// Menü-Zoom so einfrieren, wie er gerade ist (die Unschärfe darf weich weggehen) (sonst verrutscht der Ausschnitt während des Hochklappens)
var c=getComputedStyle(b),r=b.getBoundingClientRect(),s=r.height/b.offsetHeight||1,h=Math.max(window.innerHeight,lv.offsetHeight);
['scale','transform','transform-origin'].forEach(function(p){b.style.setProperty(p,c.getPropertyValue(p),'important')});
R.style.setProperty('--hct',Math.max(0,-r.top/s)+'px');R.style.setProperty('--hcb',Math.max(0,b.offsetHeight-(h-r.top)/s)+'px');}
addEventListener('pageshow',function(){var b=d.body;if(b)['scale','transform','transform-origin'].forEach(function(p){b.style.removeProperty(p)})});
var was=0;new MutationObserver(function(){var on=R.classList.contains('mw-go')||R.classList.contains('hs-vt-out');if(on&&!was)clip();was=on}).observe(R,{attributes:true,attributeFilter:['class']});
})();
