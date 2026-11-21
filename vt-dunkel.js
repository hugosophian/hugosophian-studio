/* SEITENÜBERGÄNGE, Teil 3 (Website-Head): „zum Studio“ (Hugo 21.11. 17:15: „wie beim Model“).
   1) Nur der sichtbare Ausschnitt der alten Seite klappt als Ganzes nach oben weg (Desktop: nach rechts), ohne
      Ausblenden, darunter ist Schwarz. Wie auf der schwarzen Model-Seite: kein Grau, und auf langen Seiten rutscht
      kein weiterer Inhalt von unten nach. Das passiert noch auf der alten Seite selbst; Safaris aufklappende Leiste
      kommt erst danach auf Schwarz. Dann kommt die Startseite von unten (Teil 2).
      Ausgelöst von MenueWeich (mw-go, Laden startet nach 0.25 s) und von Links auf die Startseite (hs-vt-out).
   2) Vorladen: Sobald das Menü aufgeht, lädt die Startseite im Hintergrund vor (Seite, ihr Skript und die Bilder).
      (Echtes Vorab-Darstellen kann Safari noch nicht, nur Chrome.) */
(function(){var d=document,R=d.documentElement,E='cubic-bezier(.7,0,.2,1)',Z='cubic-bezier(.22,1,.36,1)';
d.head.appendChild(d.createElement('style')).textContent=
':root{--hgo:115vw 0}@media (max-width:767px){:root{--hgo:0 -115vh}}:root:is(.mw-go,.hs-vt-out){background:#000!important}'
+':root:is(.mw-go,.hs-vt-out) body{translate:var(--hgo)!important;clip-path:inset(var(--hct,0) 0 var(--hcb,0) 0)!important;transition:translate .45s '+E+',filter .35s '+Z+',scale .35s '+Z+'!important}';
// sichtbaren Ausschnitt festhalten (auch den Teil unter Safaris durchsichtiger Leiste: grosse Viewport-Höhe)
var lv=d.createElement('div');lv.style.cssText='position:absolute;top:0;width:1px;height:100lvh;visibility:hidden;pointer-events:none';
function clip(){var b=d.body;if(!b)return;if(!lv.parentNode)b.appendChild(lv);var y=window.scrollY-b.offsetTop,h=Math.max(window.innerHeight,lv.offsetHeight);
R.style.setProperty('--hct',Math.max(0,y)+'px');R.style.setProperty('--hcb',Math.max(0,b.offsetHeight-y-h)+'px');}
var was=0;new MutationObserver(function(){var on=R.classList.contains('mw-go')||R.classList.contains('hs-vt-out');if(on&&!was)clip();was=on}).observe(R,{attributes:true,attributeFilter:['class']});
var warm=0;
function pre(){if(warm||(location.pathname.replace(/\/$/,'')||'/')==='/')return;warm=1;
fetch('/',{credentials:'same-origin'}).then(function(r){return r.text()}).then(function(h){
var x=new DOMParser().parseFromString(h,'text/html');
[].slice.call(x.querySelectorAll('script[src*="home.min.js"]')).forEach(function(s){fetch(s.src,{mode:'no-cors'}).catch(function(){})});
[].slice.call(x.querySelectorAll('[data-hp] img'),0,10).forEach(function(i){var p=new Image();p.sizes='100vw';if(i.getAttribute('srcset'))p.srcset=i.getAttribute('srcset');p.src=i.getAttribute('src');});
}).catch(function(){});}
new MutationObserver(function(){if(R.classList.contains('menu-open'))pre()}).observe(R,{attributes:true,attributeFilter:['class']});
addEventListener('pointerdown',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(a&&(a.getAttribute('href')==='/'||/^https?:\/\/[^/]+\/?$/.test(a.href)&&a.origin===location.origin))pre()},true);
})();
