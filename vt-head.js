/* SEITENÜBERGÄNGE (View Transitions), Website-Head, Teil 1: Ablauf.
   Eine Seite meldet einen Übergang an: window.hsVT = { to: Pfad, type: 'hero' | 'fade' | 'studio', el?, sel?, back? }
   hero: el fliegt an sel auf der neuen Seite. fade: alte Seite blendet aus. studio: alte Seite gleitet nach rechts weg.
   Ohne Anmeldung: normaler Seitenwechsel. Aussehen: Teil 2 (vt-style.js). */
(function(){var d=document,R=d.documentElement,K='hs-vt';
d.head.appendChild(d.createElement('style')).textContent='@view-transition{navigation:auto}';
function path(u){try{return new URL(u,location.href).pathname.replace(/\/$/,'')||'/'}catch(e){return''}}
addEventListener('pageswap',function(e){var v=e.viewTransition;if(!v)return;var f=window.hsVT,a=e.activation;
if(!f||!a||path(a.entry.url)!==path(f.to)||(f.back&&a.navigationType!=='traverse')){v.skipTransition();return;}
if(f.el){f.el.style.viewTransitionName='hs-hero';window.__hsEl=f.el;}
sessionStorage.setItem(K,JSON.stringify({to:path(f.to),type:f.type||'fade',sel:f.sel||'',from:path(location.href),t:Date.now()}));});
addEventListener('pagereveal',function(e){var v=e.viewTransition,f=null;try{f=JSON.parse(sessionStorage.getItem(K)||'null')}catch(x){}
sessionStorage.removeItem(K);if(window.__hsEl){window.__hsEl.style.viewTransitionName='';window.__hsEl=null}if(!v)return;
if(!f||Date.now()-f.t>8000||path(location.href)!==f.to){v.skipTransition();return;}
var el=f.sel&&d.querySelector(f.sel);if(f.type==='hero'&&!el){v.skipTransition();return;}
var c='hs-vt-'+f.type;R.classList.add(c);if(el)el.style.viewTransitionName='hs-hero';
v.finished.finally(function(){if(el)el.style.viewTransitionName='';R.classList.remove(c);});
if(f.sel==='.pg-hero-media')window.hsVT={to:f.from,type:'hero',el:el,sel:'.lib-pv-media img',back:true};});
})();
