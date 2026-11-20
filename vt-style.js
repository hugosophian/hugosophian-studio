/* SEITENÜBERGÄNGE, Website-Head, Teil 2: Aussehen und „zum studio“.
   hero: Bild fliegt (.9 s), Rest blendet. fade: alte Seite blendet aus. studio: alte Seite gleitet nach rechts weg,
   die Startseite kommt von links nach. Links auf die Startseite melden „studio“ selbst an. */
(function(){var d=document,E='cubic-bezier(.7,0,.2,1)',O='::view-transition-old(root)',N='::view-transition-new(root)';
d.head.appendChild(d.createElement('style')).textContent=
'::view-transition-group(hs-hero){animation-duration:.9s;animation-timing-function:'+E+'}'
+'::view-transition-old(hs-hero),::view-transition-new(hs-hero){height:100%;object-fit:cover;animation:none}'
+'::view-transition-new(hs-hero){animation:hsvi .35s ease .6s both}'
+'html.hs-vt-hero'+O+'{animation:hsvo .45s ease both}html.hs-vt-hero'+N+'{animation:hsvi .6s ease .55s both}'
+'html.hs-vt-fade'+O+'{animation:hsvo .4s ease both}html.hs-vt-fade'+N+'{animation:hsvi .3s ease .35s both}'
+'html.hs-vt-studio'+O+'{z-index:2;animation:hsso .9s '+E+' both}html.hs-vt-studio'+N+'{animation:hssi .9s '+E+' both}'
+'@keyframes hsvi{from{opacity:0}}@keyframes hsvo{to{opacity:0}}'
+'@keyframes hsso{to{transform:translateX(100%)}}@keyframes hssi{from{transform:translateX(-30%);filter:brightness(.5)}}'
+'html.hs-vt-hero [data-pg] .pg-hero,html.hs-vt-hero [data-pg] .pg-hero-img{opacity:1!important;transform:none!important;transition:none!important}'
+'html.hs-vt-out *{transition:none!important}'
+'@media (prefers-reduced-motion:reduce){::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation-duration:.01s!important;animation-delay:0s!important}}';
var H=['/lab-home'];   // Startseite(n). Zum Testen nur /lab-home, beim Umstellen '/' eintragen.
d.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');
if(!a||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
var u;try{u=new URL(a.href,location.href)}catch(x){return}
var p=u.pathname.replace(/\/$/,'')||'/';if(u.origin!==location.origin||H.indexOf(p)<0||p===(location.pathname.replace(/\/$/,'')||'/'))return;
e.preventDefault();e.stopImmediatePropagation();window.hsVT={to:p,type:'studio'};
d.documentElement.classList.add('hs-vt-out');d.documentElement.classList.remove('menu-open');location.href=u.href;},true);
addEventListener('pageshow',function(){d.documentElement.classList.remove('hs-vt-out')});
})();
