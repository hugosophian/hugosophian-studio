/* HOCHFORMAT-HINWEIS (Hugo 26.11.2026): Handy quer → Hinweis «Handy bitte senkrecht halten».
   Linien in Hirsch-Perlmutt drehen sich vom Quer- ins Hochformat (versetzt = Twist), das Handy dreht mit.
   Das Element existiert nur im Querformat (Safari 26 färbt sonst die Leiste unten, siehe Stilanleitung). */
/* Stil: hochformat-stil.js (eigenes Website-Script, gleich laden). */
(function () {
  if (window.hsRot) return; window.hsRot = 1;
  var d = document, C = ['#96dcf5', '#c3b2fa', '#f8bed7', '#fae4b4'], mq = matchMedia('(orientation:landscape) and (pointer:coarse) and (max-height:540px)'), el, t;
  function show() {
    clearTimeout(t);
    if (!el) {
      el = d.createElement('div'); el.className = 'hs-rot'; el.setAttribute('role', 'alert');
      var h = '<b aria-hidden="true">';
      for (var k = -3; k < 4; k++) h += '<i style="--k:' + k + ';color:' + C[(k + 3) % 4] + '"></i>';
      el.innerHTML = h + '</b><p>Handy bitte senkrecht halten</p>';
      el.style.fontFamily = getComputedStyle(d.body).fontFamily;
      el.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
      d.documentElement.appendChild(el); void el.offsetWidth;
    }
    el.classList.add('on');
  }
  function hide() {
    if (!el) return;
    el.classList.remove('on');
    t = setTimeout(function () { el.remove(); el = null; }, 650);
  }
  function f() { mq.matches ? show() : hide(); }
  mq.addEventListener ? mq.addEventListener('change', f) : mq.addListener(f);
  d.body ? f() : d.addEventListener('DOMContentLoaded', f);
})();
