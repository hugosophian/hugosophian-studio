/* STUDIO-WEG (Website-Footer, vor MenueWeich): Menü → „zum Studio“ aus einer gescrollten Seite.
   Safari klappt beim Seitenwechsel seine obere Leiste wieder auf, die alte Seite springt dann kurz nach unten
   und unten blitzt ein schwarzer Streifen. Darum erst hinter dem ausblendenden Menü in 0.45 s weich ganz nach oben
   scrollen (Safari zeigt die Leiste dann schon vorher), dann wie gewohnt hinüber zur Startseite. */
(function(){var R=document.documentElement;
function pth(p){return p.replace(/\/$/,'')||'/'}
addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('.menu-panel a[href]');
if(!a||a.target||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button>0)return;
var u;try{u=new URL(a.href,location.href)}catch(x){return}
if(u.origin!==location.origin||pth(u.pathname)!=='/'||pth(location.pathname)==='/')return;
e.preventDefault();e.stopImmediatePropagation();
R.classList.add('mw-go');var c=document.querySelector('[data-menu-close]');if(c)c.click();
window.hsVT={to:'/',type:'studio'};
var t0=Date.now(),y0=window.scrollY,D=450,done=0;function go(){if(!done){done=1;location.href=u.href}}
if(y0<2){setTimeout(go,380);return}
// eigene, feste Dauer (Safari/Chrome brauchen fürs „smooth“-Scrollen sonst bis über 1 s)
function to(y){try{window.scrollTo({top:y,behavior:'instant'})}catch(x){window.scrollTo(0,y)}}
(function w(){var t=Math.min(1,(Date.now()-t0)/D),k=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;to(Math.round(y0*(1-k)));
if(t<1)requestAnimationFrame(w);else setTimeout(go,200)})();},true);
})();
