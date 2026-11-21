/* SEITENÜBERGÄNGE (View Transitions), Website-Head, Teil 1: Ablauf.
   Eine Seite meldet einen Übergang an: window.hsVT = { to: Pfad, type: 'hero' | 'fade' | 'studio', el?, sel?, back? }
   hero: el fliegt an sel auf der neuen Seite. fade: alte Seite blendet aus. studio: alte Seite gleitet nach rechts weg.
   Ohne Anmeldung: normaler Seitenwechsel. Aussehen: Teil 2 (vt-style.js). */
(function(){var d=document,R=d.documentElement,K='hs-vt';
d.head.appendChild(d.createElement('style')).textContent='@view-transition{navigation:auto}'
// Ankunft mit Bildflug auf einer Projektseite: Titelbild steht sofort fertig da (kein eigenes Einblenden/Hochfahren danach)
+'.hs-hero-in [data-pg] :is(.pg-hero,.pg-hero-img){opacity:1!important;transition:none!important}.hs-hero-in [data-pg] .pg-hero{transform:none!important}'
// Titelbild noch nicht geladen: neues Bild wartet, das fliegende bleibt sichtbar
+'.hs-hw::view-transition-new(hs-hero){animation-play-state:paused}::view-transition-image-pair(hs-hero){clip-path:inset(0)}';
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
if(f.sel==='.pg-hero-media'){R.classList.add('hs-hero-in');var im=el.querySelector('img'),A=el.getBoundingClientRect(),B,w;
if(im&&A.height){B=im.getBoundingClientRect();R.style.setProperty('--zh',B.height/A.height*100+'%');R.style.setProperty('--zt',(B.top-A.top)/A.height*100+'%');
if(!im.naturalWidth){R.classList.add('hs-hw');w=function(){R.classList.remove('hs-hw')};im.addEventListener('load',w);setTimeout(w,1500)}}
window.hsVT={to:f.from,type:'hero',el:el,sel:'.lib-pv-media img',back:true};}});
})();
