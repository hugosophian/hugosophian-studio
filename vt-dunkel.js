/* SEITENÜBERGÄNGE, Teil 3 (Website-Head): „zum Studio“ (Hugo 21.11. 17:09).
   1) Die alte Seite klappt nach oben weg (Desktop: nach rechts) und blendet dabei aus, noch auf der alten Seite selbst.
      Erst wenn sie ganz weg ist (schwarz), wechselt es zur Startseite, die von unten hereinkommt (Teil 2).
      So passiert Safaris aufklappende Leiste erst auf Schwarz: kein Sprung, kein Streifen, keine Kanten.
      Ausgelöst von MenueWeich (mw-go, Wechsel nach 0.56 s) und von Links auf die Startseite (hs-vt-out).
   2) Vorladen: Sobald das Menü aufgeht, lädt die Startseite im Hintergrund vor (Seite, ihr Skript und die Bilder).
      (Echtes Vorab-Darstellen kann Safari noch nicht, nur Chrome.) */
(function(){var d=document,R=d.documentElement,E='cubic-bezier(.7,0,.2,1)',Z='cubic-bezier(.22,1,.36,1)';
d.head.appendChild(d.createElement('style')).textContent=
':root{--hgo:100vw 0}@media (max-width:767px){:root{--hgo:0 -100vh}}:root:is(.mw-go,.hs-vt-out){background:#000!important}'
+':root:is(.mw-go,.hs-vt-out) body{translate:var(--hgo)!important;opacity:0!important;transition:translate .55s '+E+',opacity .55s cubic-bezier(.5,0,.75,0),filter .35s '+Z+',scale .35s '+Z+'!important}';
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
