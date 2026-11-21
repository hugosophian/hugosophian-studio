/* SEITENÜBERGÄNGE, Website-Head, Teil 2: Aussehen und „zum studio“.
   hero: Bild fliegt (.9 s), Rest blendet. fade: alte Seite blendet aus. studio: alte Seite gleitet nach rechts weg (Handy: nach oben),
   die Startseite kommt von links nach (Handy: von unten). Links auf die Startseite melden „studio“ selbst an. */
(function(){var d=document,E='cubic-bezier(.7,0,.2,1)',V='::view-transition-',O=V+'old(root)',N=V+'new(root)';
d.head.appendChild(d.createElement('style')).textContent=
V+'group(hs-hero){animation-duration:.9s;animation-timing-function:'+E+'}'
+V+'old(hs-hero),'+V+'new(hs-hero){height:100%;object-fit:cover}'
+'@keyframes hsvz{to{height:var(--zh,100%);top:var(--zt,0%)}}'+V+'old(hs-hero){animation:hsvz .9s '+E+' both}'+V+'new(hs-hero){animation:hsvi .45s ease .35s both}'
+'.hs-vt-hero'+O+'{animation:hsvo .45s ease both}.hs-vt-hero'+N+'{animation:hsvi .6s ease .55s both}'
+'.hs-vt-fade'+O+'{animation:hsvo .8s ease-in-out both}.hs-vt-fade'+N+'{animation:hsvi .2s linear .75s both}'
+'.hs-vt-studio'+O+'{z-index:2;animation:hsso .9s '+E+' both}.hs-vt-studio'+N+'{animation:hssi .9s '+E+' both}'
+'@keyframes hsvi{from{opacity:0}}@keyframes hsvo{to{opacity:0}}'
// zum Studio (Hugo 16:34): alte Seite verschwimmt beim Hochfahren, die Farben laufen weich in die Startseite über
+'@keyframes hsso{20%{filter:blur(14px)}45%{opacity:0}to{transform:translate(var(--ho,100%));opacity:0;filter:blur(28px)}}@keyframes hssi{from{transform:translate(var(--hi,-30%));filter:brightness(.5) blur(10px)}}'
+'@media (max-width:767px){:root{--ho:0,-100%;--hi:0,12%}}'
+'.hs-vt-out *{transition:none!important}'
+'@media (prefers-reduced-motion:reduce){'+V+'group(*),'+V+'old(*),'+V+'new(*){animation:none!important}}';
var H=['/'];   // Startseite
d.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');
if(!a||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
var u;try{u=new URL(a.href,location.href)}catch(x){return}
var p=u.pathname.replace(/\/$/,'')||'/';if(u.origin!==location.origin||H.indexOf(p)<0||p===(location.pathname.replace(/\/$/,'')||'/'))return;
e.preventDefault();e.stopImmediatePropagation();window.hsVT={to:p,type:'studio'};
d.documentElement.classList.add('hs-vt-out');d.documentElement.classList.remove('menu-open');location.href=u.href;},true);
addEventListener('pageshow',function(){d.documentElement.classList.remove('hs-vt-out')});
})();
