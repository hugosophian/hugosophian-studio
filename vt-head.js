/* SEITENÜBERGÄNGE (View Transitions), Website-Head. Fliegt nur, wenn eine Seite einen Flug anmeldet (window.hsVT). */
(function(){var d=document,R=d.documentElement,K='hs-vt',s=d.createElement('style');
s.textContent='@view-transition{navigation:auto}'
+'::view-transition-group(hs-hero){animation-duration:.9s;animation-timing-function:cubic-bezier(.7,0,.2,1)}'
+'::view-transition-old(hs-hero),::view-transition-new(hs-hero){width:100%;height:100%;object-fit:cover;animation:none}'
+'::view-transition-new(hs-hero){animation:hsvi .35s ease .6s both}'
+'::view-transition-old(root){animation:hsvo .45s ease both}'
+'::view-transition-new(root){animation:hsvi .6s ease .55s both}'
+'@keyframes hsvi{from{opacity:0}}@keyframes hsvo{to{opacity:0}}'
+'html.hs-vt-in [data-pg] .pg-hero,html.hs-vt-in [data-pg] .pg-hero-img{opacity:1!important;transform:none!important;transition:none!important}'
+'@media (prefers-reduced-motion:reduce){::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation-duration:.01s!important;animation-delay:0s!important}}';
d.head.appendChild(s);
function path(u){try{return new URL(u,location.href).pathname}catch(e){return''}}
addEventListener('pageswap',function(e){var v=e.viewTransition;if(!v)return;var f=window.hsVT,a=e.activation;
if(!f||!f.el||!a||path(a.entry.url)!==f.to||(f.back&&a.navigationType!=='traverse')){v.skipTransition();return;}
f.el.style.viewTransitionName='hs-hero';window.__hsEl=f.el;
sessionStorage.setItem(K,JSON.stringify({to:f.to,sel:f.sel,from:location.pathname,t:Date.now()}));});
addEventListener('pagereveal',function(e){var v=e.viewTransition,f=null;try{f=JSON.parse(sessionStorage.getItem(K)||'null')}catch(x){}
sessionStorage.removeItem(K);if(window.__hsEl){window.__hsEl.style.viewTransitionName='';window.__hsEl=null}if(!v)return;
var el=f&&Date.now()-f.t<8000&&location.pathname===f.to&&d.querySelector(f.sel);
if(!el){v.skipTransition();return;}
R.classList.add('hs-vt-in');el.style.viewTransitionName='hs-hero';
v.finished.finally(function(){el.style.viewTransitionName='';R.classList.remove('hs-vt-in');});
if(f.sel==='.pg-hero-media')window.hsVT={to:f.from,el:el,sel:'.lib-pv-media img',back:true};});
})();
