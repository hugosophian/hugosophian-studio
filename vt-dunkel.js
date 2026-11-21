/* SEITENÜBERGÄNGE, Teil 3 (Website-Head): „zum Studio“ (Hugo 21.11.).
   1) Vor dem Wechsel zur Startseite wird die alte Seite in 0.35 s ganz schwarz (gleichzeitig schliesst das Menü),
      dann blendet die Startseite ein. Ausgelöst von MenueWeich (mw-go) und von Links auf die Startseite (hs-vt-out).
      Auch die Seite selbst blendet aus: Safari (iOS 26) zeichnet feste Flächen nicht unter seine untere Leiste.
   2) Vorladen: Sobald das Menü aufgeht, lädt die Startseite im Hintergrund vor (Seite, ihr Skript und die Bilder
      in der Grösse, die sie braucht). Beim Tippen auf „zum Studio“ ist dann fast alles schon da.
      (Echtes Vorab-Darstellen kann Safari noch nicht, nur Chrome.) */
(function(){var d=document,R=d.documentElement,T='opacity .35s cubic-bezier(.3,.6,.3,1),filter .35s cubic-bezier(.22,1,.36,1),scale .35s cubic-bezier(.22,1,.36,1)';
d.head.appendChild(d.createElement('style')).textContent=
':root:is(.mw-go,.hs-vt-out){background:#000!important}:root:is(.mw-go,.hs-vt-out) body{opacity:0!important;transition:'+T+'!important}'
+':root:is(.mw-go,.hs-vt-out)::after{content:"";position:fixed;left:0;right:0;top:-50vh;bottom:-50vh;background:#000;z-index:2147483647;pointer-events:none;animation:hsdk .35s cubic-bezier(.3,.6,.3,1) both}@keyframes hsdk{from{opacity:0}}';
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
