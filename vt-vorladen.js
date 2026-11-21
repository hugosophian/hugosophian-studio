/* STARTSEITE VORLADEN (Website-Head): Sobald das Menü aufgeht (oder man einen Link zur Startseite antippt), lädt die
   Startseite im Hintergrund vor: die Seite, ihr Skript und ihre Bilder. Beim Tippen auf „zum Studio“ ist dann fast
   alles schon da. (Echtes Vorab-Darstellen kann Safari noch nicht, nur Chrome.) */
(function(){var d=document,R=d.documentElement;
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
