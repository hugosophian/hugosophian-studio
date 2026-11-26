/* HOCHFORMAT-HINWEIS · Stil (Hugo 26.11.2026). Gehört zu hochformat.js. */
(function () {
  var d = document;
  if (d.getElementById('hs-rot-css')) return;
  var s = d.createElement('style'); s.id = 'hs-rot-css';
  s.textContent =
    '.hs-rot{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6vh;' +
    'background:radial-gradient(90% 120% at 50% 42%,#fff 0%,#eceff7 100%);opacity:0;transition:opacity .6s cubic-bezier(.22,1,.36,1);touch-action:none;-webkit-user-select:none;user-select:none}' +
    '.hs-rot.on{opacity:1}' +
    '.hs-rot b{position:relative;width:20vh;height:38vh;border:1.5px solid rgba(110,100,165,.55);border-radius:3.6vh;perspective:50vh;animation:hsP 3.8s cubic-bezier(.6,0,.1,1) infinite}' +
    '.hs-rot i{position:absolute;left:50%;top:50%;width:2px;height:27vh;margin:-13.5vh 0 0 -1px;border-radius:2px;background:currentColor;box-shadow:0 0 1vh currentColor;' +
    'transform:translateX(calc(var(--k)*1.9vh));animation:hsL 3.8s cubic-bezier(.6,0,.1,1) infinite;animation-delay:calc(var(--k)*45ms - 160ms)}' +
    '.hs-rot p{margin:0;font-weight:400;font-size:max(15px,4.6vh);line-height:1.2;letter-spacing:.02em;color:#000;transform:translateY(2.5vh);transition:transform .9s cubic-bezier(.22,1,.36,1)}' +
    '.hs-rot.on p{transform:none}' +
    '@keyframes hsP{0%{transform:rotate(-90deg);opacity:0}8%{opacity:1}12%{transform:rotate(-90deg)}48%{transform:rotate(0)}86%{opacity:1}100%{transform:rotate(0);opacity:0}}' +
    '@keyframes hsL{0%,12%{transform:translateX(calc(var(--k)*1.9vh))}' +
    '30%{transform:translateX(calc(var(--k)*.5vh)) rotate(calc(var(--k)*13deg)) rotateX(calc(var(--k)*22deg))}' +
    '52%,100%{transform:translateX(calc(var(--k)*1.9vh))}}' +
    '@media (prefers-reduced-motion:reduce){.hs-rot b,.hs-rot i{animation:none}}';
  (d.head || d.documentElement).appendChild(s);
})();
