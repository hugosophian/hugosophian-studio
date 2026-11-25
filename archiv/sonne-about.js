// ARCHIV (25.11.2026): Sonnenstrahlen hinter und über dem About-Text – seit 25.11. ausgeschaltet (CONFIG.aboutSun false,
// Hugo: «kommt woanders hin»). Aus home.js herausgelöst, damit die Seite diesen Code nicht mehr laden muss.
// Wieder einbauen: diesen Block in home.js an die Stelle «Sonne: siehe archiv/sonne-about.js» setzen und CONFIG.aboutSun = true.

    // ---------- Sonnenstrahlen hinter und über dem About-Text (Hugo 22.11.) ----------
    // Wie Morgensonne durch Dunst (Hugos Bild): Licht fällt von oben durch eine Wolkendecke in Strahlen auf
    // die weisse Wand. Der Titel steht leicht gedreht im Raum, hat Tiefe und wirft lange Schattenstreifen,
    // zwischen den Buchstaben strahlt das Licht durch. Wo ein Strahl über den Text läuft, leuchtet er warm auf.
    //   Ebene 1 (unter dem Text): Wand mit Strahlen, Wolkenschatten und Titelschatten
    //   Ebene 2 (über dem Text, mix-blend-mode: screen): nur das Licht. Auf Weiss ändert es nichts,
    //   schwarze Schrift wird dort goldbraun angestrahlt.
    // Gerechnet wird beides in einem WebGL-Bild (links Wand, rechts Licht) und auf zwei Leinwände kopiert.
    var SUN = {
      src: [0.86, -0.3],         // Sonne oben rechts (Hugo 22.11.: weiter links, etwas höher als ursprünglich)
      rays: [8, 19],             // Strahldichte (grobe / feine Strahlen); Hugo 22.11.: weniger Strahlen
      drift: [0.16, -0.24],      // wie schnell die Strahlen wandern
      edge: [0.37, 0.82],         // Schärfe der Strahlen
      reach: 2.6,                // wie weit die Strahlen nach unten reichen
      strength: 1.2,
      ambient: 0.2,              // so viel Licht liegt auch im Schatten
      shade: [0.8, 0.81, 0.835], // Schatten auf der Wand: kühl
      shadeLow: [0.8, 0.81, 0.835],
      lit: [1.0, 0.985, 0.95],   // Sonne auf der Wand: warmes Weiss
      textLight: [1.0, 0.74, 0.36], // so leuchtet angestrahlte schwarze Schrift (warmes Gold)
      textAmt: 0.62,
      shadowW: 0.05,             // Fingerschatten: Breite als Anteil der Höhe
      trailLife: 0.9,            // s
      trailAmt: 0.75,
      res: 1                     // Auflösung (1 = CSS-Pixel)
    };
    // Hugo 23.11.: About und Ladeanimation haben je ihre eigene Sonne (eigene Werte, eigene Leinwand), gleiche Bauart
    function makeSun(SUN) {
      var gcv = document.createElement('canvas');
      var c = null;
      try { c = gcv.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true }); } catch (e) {}
      if (!c) return null;
      function mk(cls) { var v = document.createElement('canvas'); v.className = 'hp-info-sun ' + cls; v.setAttribute('aria-hidden', 'true'); return v; }
      var back = document.createElement('div'); back.className = 'hp-info-sun hp-sun-back'; back.setAttribute('aria-hidden', 'true');
      var wall = document.createElement('canvas'); wall.className = 'hp-sun-wall';
      back.appendChild(wall);
      var glow = mk('hp-sun-light');
      var wx = wall.getContext('2d'), lx = glow.getContext('2d');
      if (!wx || !lx) return null;
      var NT = 10;
      var VS = 'attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }';
      var FS = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' + [
        'uniform vec2 uRes; uniform float uOffX; uniform float uMode; uniform float uHor; uniform float uOn; uniform vec3 uHero; uniform float uTime; uniform vec2 uSrc; uniform vec2 uRays; uniform vec2 uDrift; uniform vec2 uEdge;',
        'uniform float uReach; uniform float uStrength; uniform float uAmb; uniform vec3 uShade; uniform vec3 uShadeLow; uniform vec3 uLit; uniform vec3 uBase;',
        'uniform vec3 uTextLight; uniform float uTextAmt; uniform float uWallGlow; uniform vec4 uNoG; uniform vec4 uBl;',
        'uniform float uShadowW; uniform float uTrailAmt; uniform vec3 uTrail[' + NT + '];',
        'float h1(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }',
        'float n1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }',
        'float h2(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }',
        'float n2(vec2 x) { vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);',
        '  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }',
        'vec2 S;',
        'float beamAt(vec2 p) {',
        '  vec2 d = p - S; float ang = atan(d.x, -d.y); float dist = length(d) / uRes.y; float t = uTime;',
        '  float r = 0.6 * n1(ang * uRays.x + t * uDrift.x) + 0.4 * n1(ang * uRays.y + t * uDrift.y + 7.0);',
        '  r *= 0.75 + 0.5 * n1(t * 0.35 + ang * 4.0);',
        '  r = smoothstep(uEdge.x, uEdge.y, r);',
        '  r *= 0.72 + 0.28 * n2(vec2(ang * 22.0, dist * 3.0 - t * 0.35));',
        '  float fall = exp(-max(dist - 0.65, 0.0) / uReach);',
        '  float hd = (ang - uHero.x) / uHero.y; r = max(r, uHero.z * exp(-hd * hd) * (0.82 + 0.18 * n1(t * 0.6)));',
        '  return clamp((r * fall + exp(-dist * 2.2) * 0.35) * uStrength, 0.0, 1.0);',
        '}',
        'float rayR(vec2 p) {',
        '  vec2 d = p - S; float ang = atan(d.x, -d.y); float t = uTime;',
        '  float r = 0.6 * n1(ang * uRays.x + t * uDrift.x) + 0.4 * n1(ang * uRays.y + t * uDrift.y + 7.0);',
        '  r *= 0.75 + 0.5 * n1(t * 0.35 + ang * 4.0);',
        '  float hd = (ang - uHero.x) / uHero.y;',
        '  return max(smoothstep(uEdge.x - 0.1, uEdge.y - 0.05, r), uHero.z * exp(-hd * hd));',
        '}',
        'void main() {',
        '  vec2 fc = gl_FragCoord.xy - vec2(uOffX, 0.0);',
        '  S = vec2(uSrc.x * uRes.x, uRes.y * (1.0 - uSrc.y));',
        '  vec2 d = fc - S; float ang = atan(d.x, -d.y); float dist = length(d) / uRes.y;',
        '  float t = uTime;',
        // Tal: unterhalb des Horizonts (knapp unter dem Titel) ist Boden. Jeder Strahl trifft ihn an einer eigenen Stelle
        // (je nach Strahl näher oder ferner): dort endet er und hinterlässt einen hellen, flachen Lichtfleck, nah gross, fern schmal.
        '  float beam = beamAt(fc);',
        // Einstrahlen: jeder Strahl hat seinen eigenen Moment (aus seinem Winkel), erst ein paar, dann alle.
        // Beim Schliessen läuft es rückwärts: die zuletzt gekommenen gehen zuerst.
        '  float dly = n1(ang * 7.0 + 3.7) * 0.7;',
        '  float hh = (ang - uHero.x) / uHero.y;',
        '  float rf = max(smoothstep(0.2 + dly * 0.8, 0.5 + dly * 0.8, uOn), uHero.z * exp(-hh * hh * 0.5));',
        '  float hitY = uHor * (0.03 + 0.85 * pow(n1(ang * 6.5 + 11.0 + t * 0.015), 1.7));',
        '  float grd = 1.0 - smoothstep(uHor - 0.02 * uRes.y, uHor + 0.02 * uRes.y, fc.y);',
        '  float air = smoothstep(hitY - 0.01 * uRes.y, hitY + 0.05 * uRes.y, fc.y);',
        '  float dT = 1.0 - hitY / max(uHor, 1.0);',
        '  float pH = mix(0.014, 0.075, dT) * uRes.y;',
        '  float pool = exp(-pow((fc.y - hitY) / pH, 2.0));',
        '  float ray = rayR(fc);',
        '  beam = beam * mix(1.0, 0.5 + 0.5 * air, grd) + ray * pool * grd * (1.0 + 0.6 * dT);',
        '  float sh = 0.0;',
        '  for (int i = 0; i < ' + NT + '; i++) {',
        '    vec3 p = uTrail[i]; if (p.z <= 0.0) continue;',
        '    vec2 pd = p.xy - S; float pa = atan(pd.x, -pd.y); float pdist = length(pd) / uRes.y;',
        '    float w = uShadowW / max(pdist, 0.05);',
        '    float behind = smoothstep(-0.02, 0.04, dist - pdist) * exp(-max(dist - pdist, 0.0) * 1.2);',
        '    float da = (ang - pa) / w;',
        '    sh = max(sh, p.z * behind * exp(-da * da));',
        '  }',
        // Bewegung am Boden wie auf der Sonnenoberfläche: im Licht wabert ein fliessendes, verwirbeltes Muster,
        // perspektivisch auf den Boden gelegt (hinten klein, vorne gross), mit feinen hellen Fäden dazwischen.
        '  float yh = max(uHor - fc.y, 2.0) / uRes.y;',
        '  float yc = max(yh, 0.07);',
        '  vec2 gp = vec2((fc.x - 0.5 * uRes.x) / uRes.y / yc, 1.0 / yc) * 0.55;',
        '  vec2 wq = vec2(n2(gp * 1.7 + vec2(t * 0.11, -t * 0.07)), n2(gp * 1.9 + vec2(-t * 0.09, t * 0.13) + 5.2));',
        '  float sv = n2(gp * 2.6 + wq * 2.2 + vec2(0.0, t * 0.05));',
        '  float fil = pow(1.0 - abs(2.0 * sv - 1.0), 7.0);',
        '  float dw = smoothstep(0.04, 0.55, yh);',
        '  float onG = grd * smoothstep(0.03, 0.35, beam) * smoothstep(0.02, 0.1, yh) * mix(0.35, 1.0, dw);',
        '  beam *= rf;',
        '  float lit = beam * (1.0 - sh * uTrailAmt);',
                        '  vec3 shade = mix(uShade, uShadeLow, grd * (0.5 + 0.5 * (1.0 - fc.y / max(uHor, 1.0))));',
        '  vec3 col, gl = vec3(0.0);',
        '  bool inG = fc.x > uNoG.x && fc.x < uNoG.z && fc.y > uNoG.y && fc.y < uNoG.w;',
        '  if (uMode > 0.5 || (uWallGlow > 0.5 && !inG)) {',
        '    vec2 dd = fc - S; float cs = cos(0.017), sn = sin(0.017);',
        '    vec2 pR = S + vec2(dd.x * cs - dd.y * sn, dd.x * sn + dd.y * cs);',
        '    vec2 pB = S + vec2(dd.x * cs + dd.y * sn, -dd.x * sn + dd.y * cs);',
        '    float b0 = max(beamAt(fc), 0.03);',
        '    vec3 disp = clamp(vec3(beamAt(pR), b0, beamAt(pB)) / b0, 0.0, 1.6);',
        '    float lit2 = lit * mix(1.0, 0.85 + 0.3 * sv, onG);',
        '    float tl = smoothstep(0.45, 1.0, lit2);',
        '    vec3 tl3 = smoothstep(vec3(0.45), vec3(1.0), lit2 * disp);',
        '    float tm = min(tl3.r, min(tl3.g, tl3.b));',
        '    vec3 tc = vec3(1.0, 0.8, 0.62) * tm * 1.08 + (tl3 - tm) * vec3(1.0, 0.95, 1.25) * 1.35;',
        '    gl = tc * uTextAmt * max(smoothstep(0.15, 0.5, uOn), uHero.z * exp(-hh * hh * 0.35));',
        '  }',
        '  if (uMode < 0.5) {',
        '    float L = clamp(uAmb + lit, 0.0, 1.0);',
        '    float sh2 = onG * smoothstep(0.0, 0.6, uOn);',
        '    float amp = mix(0.8, 1.6, dw);',
        '    L *= mix(1.0, 1.0 - amp * (0.2 - 0.2 * sv + 0.08 * fil), sh2);',
        '    col = mix(shade, uLit, L) + vec3(0.05, 0.03, 0.0) * clamp(lit - 0.8, 0.0, 1.0) * grd;',
        '    col += vec3(1.0, 0.85, 0.55) * fil * sh2 * 0.1 * amp;',
        '    float cw = pow(1.0 - abs(2.0 * sv - 1.0), 3.0);',
        '    vec3 cr = 0.5 + 0.5 * cos(6.2832 * ((sv - 0.5) * 4.0 + t * 0.02 + vec3(0.0, 0.33, 0.67)));',
        '    col += (cr - 0.5) * cw * sh2 * 0.13 * amp;',
        '    float wf = max(smoothstep(0.25, 0.75, uOn), uHero.z * exp(-hh * hh * 0.35));',
        '    col = mix(uBase, col, wf);',
        '    if (uWallGlow > 0.5 && !inG) col = 1.0 - (1.0 - col) * (1.0 - clamp(gl, 0.0, 1.0));',
        '  } else col = gl;',
        // Schliessen (Hugo 24.11., 13:51): ein breiter Sonnenstrahl schwingt aufs Display und blendet. Ganz wenig Regenbogen
        // an seinen Rändern, die Sonnenoberfläche schimmert leicht im Licht, schwache Linsenreflexe auf der Achse Sonne → Mitte.
        // uBl = (Blendung, Winkel des Strahls, Breite, Stärke)
        '  if (uBl.x > 0.0 || uBl.w > 0.0) {',
        '    float bd = (ang - uBl.y) / uBl.z, bb = exp(-bd * bd);',
        '    float beamB = bb * (0.75 + 0.25 * exp(-max(dist - 0.3, 0.0)));',
        '    vec3 rbw = 0.5 + 0.5 * cos(6.2832 * (bd * 0.22 + vec3(0.0, 0.33, 0.67)));',
        '    float edgeB = bb * (1.0 - exp(-bd * bd * 3.0));',
        '    vec2 ax = 0.5 * uRes - S; vec3 ghc = vec3(0.0);',
        '    for (int i = 0; i < 3; i++) {',
        '      float k = 0.75 + 0.5 * float(i); float R = uRes.y * (0.045 + 0.035 * float(i));',
        '      float rr = length(fc - (S + ax * k)) / R;',
        '      ghc += (0.55 + 0.45 * cos(6.2832 * (rr * 0.7 + float(i) * 0.2 + vec3(0.0, 0.33, 0.67)))) * exp(-pow((rr - 1.0) * 3.5, 2.0)) * 0.05;',
        '    }',
        '    float B = clamp(uBl.x * (0.9 + 0.3 * fil * (1.0 - uMode)) + uBl.w * beamB * 0.9, 0.0, 1.0);',   // Hugo 24.11. (18:45): auf der Lichtebene (über dem Foto) ohne Sonnenoberflächen-Muster – sonst Bodenwellen und senkrechte Streifen über dem Bild
        '    col = mix(col, vec3(1.0, 0.975, 0.92), B);',
        '    col += ((rbw - 0.5) * edgeB * 0.09 + ghc) * uBl.w * (1.0 - 0.6 * uBl.x);',
        '  }',
        '  col += (h2(fc + fract(t)) - 0.5) / 255.0;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'].join('\n');
      function sh(type, src) { var s = c.createShader(type); c.shaderSource(s, src); c.compileShader(s); return c.getShaderParameter(s, c.COMPILE_STATUS) ? s : null; }
      var vs = sh(c.VERTEX_SHADER, VS), fs = sh(c.FRAGMENT_SHADER, FS);
      if (!vs || !fs) return null;
      var pr = c.createProgram(); c.attachShader(pr, vs); c.attachShader(pr, fs); c.linkProgram(pr);
      if (!c.getProgramParameter(pr, c.LINK_STATUS)) return null;
      c.useProgram(pr);
      var b = c.createBuffer(); c.bindBuffer(c.ARRAY_BUFFER, b); c.bufferData(c.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), c.STATIC_DRAW);
      var loc = c.getAttribLocation(pr, 'aPos'); c.enableVertexAttribArray(loc); c.vertexAttribPointer(loc, 2, c.FLOAT, false, 0, 0);
      var U = {}; ['uRes', 'uOffX', 'uMode', 'uOn', 'uHero', 'uHor', 'uTime', 'uSrc', 'uRays', 'uDrift', 'uEdge', 'uReach', 'uStrength', 'uAmb', 'uShade', 'uShadeLow', 'uLit',
        'uBase', 'uTextLight', 'uTextAmt', 'uWallGlow', 'uNoG', 'uBl', 'uShadowW', 'uTrailAmt', 'uTrail'].forEach(function (k) { U[k] = c.getUniformLocation(pr, k); });
      c.uniform2fv(U.uSrc, SUN.src); c.uniform2fv(U.uRays, SUN.rays); c.uniform2fv(U.uDrift, SUN.drift); c.uniform2fv(U.uEdge, SUN.edge);
      c.uniform1f(U.uReach, SUN.reach); c.uniform1f(U.uStrength, SUN.strength); c.uniform1f(U.uAmb, SUN.ambient);
      c.uniform3fv(U.uShade, SUN.shade); c.uniform3fv(U.uShadeLow, SUN.shadeLow); c.uniform3fv(U.uLit, SUN.lit); c.uniform3fv(U.uBase, SUN.base || [1, 1, 1]);
      c.uniform3fv(U.uTextLight, SUN.textLight); c.uniform1f(U.uTextAmt, SUN.textAmt);
      c.uniform1f(U.uShadowW, SUN.shadowW); c.uniform1f(U.uTrailAmt, SUN.trailAmt);
      var trail = [], tbuf = new Float32Array(NT * 3), raf = 0, t0 = performance.now() - 40000, cw = 0, chh = 0;
      // G = Lage des Titels { bx, by, bw, bh } (CSS-Pixel): knapp darunter liegt der Horizont
      var G = null, lastT = 0;
      function size() {
        var rs = SUN.res * (desk ? CONFIG.deskSunRes : 0.75);   // Handy: 0.75 (Hugo 24.11., 14:43: weniger Rechenarbeit)   // Computer: halbe Auflösung (die ganze Bildschirmfläche ruckelte beim Übergang)
        var w = Math.max(1, Math.round(wall.clientWidth * rs)), h = Math.max(1, Math.round(wall.clientHeight * rs));
        if (w !== cw || h !== chh) {
          cw = wall.width = glow.width = w; chh = wall.height = glow.height = h;
        }
        var GW = 2 * cw, GH = chh;
        if (gcv.width !== GW || gcv.height !== GH) { gcv.width = GW; gcv.height = GH; }
      }
      function pass(x, w, h, md) {
        c.viewport(x, 0, w, h); c.uniform1f(U.uOffX, x); c.uniform1f(U.uMode, md);
        c.drawArrays(c.TRIANGLE_STRIP, 0, 4);
      }
      function draw(now) {
        size();
        var tm = reduce ? 40.0 : (now - t0) / 1000;
        var rect = wall.getBoundingClientRect(), sx = cw / Math.max(1, rect.width);
        if (held && trail.length) trail[trail.length - 1].t = now;   // Finger liegt noch: Schatten bleibt
        trail = trail.filter(function (p) { return now - p.t < SUN.trailLife * 1000; });
        for (var i = 0; i < NT; i++) {
          var p = trail[trail.length - 1 - i];
          if (p) {
            var life = 1 - (now - p.t) / (SUN.trailLife * 1000);
            tbuf[i * 3] = (p.x - rect.left) * sx; tbuf[i * 3 + 1] = chh - (p.y - rect.top) * sx; tbuf[i * 3 + 2] = life * life;
          } else tbuf[i * 3 + 2] = 0;
        }
        var dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
        c.uniform1f(U.uHor, G ? chh - (G.by + G.bh * 0.62) * sx : chh * 0.78);   // Horizont knapp unter dem Titel
        // Licht erst, wenn der Titel angekommen ist: in 1.8 s weich einstrahlen; beim Schliessen rasch weg
        if (lightOn.want) lightOn.v = reduce ? 1 : Math.min(1, (now - lightOn.t0) / 3200);   // 2.6 s, Strahl für Strahl
        else lightOn.v = Math.max(0, lightOn.v - dt / 1.2);                                   // während die Seite wegfährt
        var lo = lightOn.v; c.uniform1f(U.uOn, lo * lo * (3 - 2 * lo));
        // Erster Strahl (Hugo 22.11.): kommt zuerst und fällt auf «Galerie öffnen», damit man den Schatten gleich sieht
        var hero = 0, ha = 0, hw = 0.05;
        var hb = sunBtn || infoOpen;
        if (hb.offsetWidth) {
          var br = hb.getBoundingClientRect();
          var Sx = SUN.src[0] * rect.width, Sy = SUN.src[1] * rect.height;   // Sonne in CSS-Pixeln der Leinwand (y nach unten)
          var bxx = br.left - rect.left + br.width * 0.45, byy = br.top - rect.top + br.height * 0.5;
          ha = Math.atan2(bxx - Sx, byy - Sy) + Math.sin(tm * 0.21) * 0.012;
          hw = Math.max(0.02, br.width * 0.42 / Math.max(1, Math.hypot(bxx - Sx, byy - Sy)));
          // setzt erst nach 0.7 s an und kommt in 1.8 s weich mit den anderen Strahlen (Hugo 22.11.)
          hero = lightOn.want ? (reduce ? 1 : Math.max(0, Math.min(1, (now - lightOn.t0 - 700) / 1800))) : lo;
          hero = hero * hero * hero * (hero * (hero * 6 - 15) + 10);
          // Hugo 22.11.: wie ein CTA – der Strahl auf dem Button geht in ruhigem Takt weich an und aus (ca. 6.5 s)
          if (lightOn.want && !reduce) {
            var since = (now - lightOn.t0) / 1000 - 2.5;
            if (since > 0) { var ph = 0.5 + 0.5 * Math.cos(since * 6.2832 / 6.5); hero *= ph * ph * (3 - 2 * ph); }
          }
        }
        c.uniform3f(U.uHero, ha, hw, hero); heroNow = hero;
        c.uniform1f(U.uWallGlow, desk ? 1 : 0);
        if (blT0) {
          var bt = (now - blT0) / 1000, sw = Math.min(1, bt / (CONFIG.closeBeam / 1000 + 0.05)), x1 = sw - 1;
          var bo = 1 + 2.4 * x1 * x1 * x1 + 1.4 * x1 * x1;   // mit Schwung, leicht über das Ziel hinaus
          var Sx2 = SUN.src[0] * rect.width, Sy2 = SUN.src[1] * rect.height;
          var angC = Math.atan2(rect.width * 0.5 - Sx2, rect.height * 0.5 - Sy2);
          var amt = smoothstep(0.05, CONFIG.closeBeam / 1000 + 0.1, bt) * 0.92 - smoothstep(CONFIG.closeBeam / 1000 + 0.15, CONFIG.closeBeam / 1000 + 0.9, bt) * 0.3;
          var ko = 1;
          // Hugo 24.11. (15:41): der Blitz löst sich langsamer und weicher ins Sonnenlicht auf (2.4 s, sanfte Kurve)
          if (blOpen) { var kt = clamp((bt - CONFIG.closeBeam / 1000 - 0.1) / 2.4, 0, 1); ko = 1 - kt * kt * (3 - 2 * kt); ko *= ko; amt = Math.min(amt, 0.92) * ko; if (kt >= 1) { blT0 = 0; blOpen = false; } }   // Hugo 24.11. (15:37): auch der Strahl selbst klingt weich ab (verschwand vorher auf einmal)
          c.uniform4f(U.uBl, Math.max(0, amt), angC + 0.8 * (1 - bo), 0.05 + 0.3 * (1 - Math.pow(1 - sw, 3)), (1 - Math.pow(1 - Math.min(1, bt / 0.3), 3)) * ko);
        } else c.uniform4f(U.uBl, 0, 0, 1, 0);
        if (noG) c.uniform4f(U.uNoG, (noG.left - rect.left) * sx, chh - (noG.bottom - rect.top) * sx, (noG.right - rect.left) * sx, chh - (noG.top - rect.top) * sx);
        else c.uniform4f(U.uNoG, -1, -1, -1, -1);
        c.uniform2f(U.uRes, cw, chh); c.uniform1f(U.uTime, tm); c.uniform3fv(U.uTrail, tbuf);
        pass(0, cw, chh, 0);
        pass(cw, cw, chh, 1);
        probe(rect, sx);
        var H = gcv.height;
        wx.drawImage(gcv, 0, H - chh, cw, chh, 0, 0, cw, chh);
        lx.drawImage(gcv, cw, H - chh, cw, chh, 0, 0, cw, chh);
      }
      // «Werkstatt öffnen»: Licht an seiner Stelle messen, Schatten nur wenn ein Strahl ihn trifft
      var btnL = 0, pf = 0, heroNow = 0, noG = null, blT0 = 0, blOpen = false;
      function probe(rect, sx) {
        var hb = sunBtn || infoOpen;
        if (++pf % 5 || !hb.offsetWidth) return;
        var r = hb.getBoundingClientRect();
        var x0 = Math.max(0, Math.round((r.left - rect.left) * sx)), w = Math.min(cw - x0, Math.max(1, Math.round(r.width * sx)));
        var y = Math.round(chh - (r.top + r.height * 0.5 - rect.top) * sx);
        if (w < 1 || y < 0 || y >= chh) return;
        // CTA (Hugo 22.11.): Schatten folgt dem pulsierenden Strahl auf dem Button (Hugo 24.11., 14:43: Licht wird nicht mehr
        // ausgelesen – das hielt die Grafikkarte an)
        btnL += (heroNow - btnL) * 0.35;
        hb.style.setProperty('--hp-lit', btnL.toFixed(3));
        // Schatten in Strahlrichtung: weg von der Sonne, schräg über den Boden
        var Sx = rect.left + SUN.src[0] * rect.width, Sy = rect.top + SUN.src[1] * rect.height;
        var ddx = r.left + r.width * 0.5 - Sx, ddy = Math.max(1, r.top + r.height * 0.5 - Sy);
        var sk = Math.max(-65, Math.min(65, Math.atan(ddx / ddy) * 180 / Math.PI));
        hb.style.setProperty('--hp-skew', sk.toFixed(1) + 'deg');
      }
      var lastDraw = 0;
      function loop(now) {
        raf = 0;
        if (ip.v >= 1 && !root.classList.contains('is-info') && !dsunLive) return;   // Seite zu: nichts zeichnen
        // Audit 24.11. (Akku): steht alles (Licht ganz an, kein Strahl, kein Finger- oder Mausschatten), rechnet die Sonne
        // nur noch jedes zweite Bild – die Strahlen wandern so langsam, dass man keinen Unterschied sieht
        var calm = !reduce && lightOn.want && lightOn.v >= 1 && !blT0 && !trail.length;
        if (!calm || now - lastDraw > 24) { lastDraw = now; draw(now); }
        if (!reduce || trail.length) raf = requestAnimationFrame(loop);
      }
      // Fingerschatten: bleibt, solange der Finger auf dem Display liegt, und folgt ihm (auch beim Scrollen);
      // erst beim Loslassen verblasst er. Touch-Ereignisse statt Pointer, weil Pointer beim Scrollen abbrechen.
      var held = false;
      function addPt(x, y) {
        if (reduce || !(root.classList.contains('is-info') || dsunOn)) return;   // Computer: Mausschatten auch bei der Sonne nach 1 s Ruhe
        var now = performance.now(), last = trail[trail.length - 1];
        if (last && Math.abs(last.x - x) + Math.abs(last.y - y) < 8 && now - last.t < 50) { last.t = now; return; }
        trail.push({ x: x, y: y, t: now });
        if (trail.length > 30) trail.shift();
        if (!raf) raf = requestAnimationFrame(loop);
      }
      function tStart(e) { if (!e.touches || !e.touches[0]) return; held = true; addPt(e.touches[0].clientX, e.touches[0].clientY); }
      function tMove(e) { if (!e.touches || !e.touches[0]) return; held = true; addPt(e.touches[0].clientX, e.touches[0].clientY); }
      function tEnd(e) { if (e.touches && e.touches.length) return; held = false; var l = trail[trail.length - 1]; if (l) l.t = performance.now(); }
      window.addEventListener('touchstart', tStart, { passive: true });
      window.addEventListener('touchmove', tMove, { passive: true });
      window.addEventListener('touchend', tEnd, { passive: true });
      window.addEventListener('touchcancel', tEnd, { passive: true });
      window.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') addPt(e.clientX, e.clientY); }, { passive: true });
      var lightOn = { v: 0, want: false, t0: 0 };
      function start() { if (!raf) { draw(performance.now()); raf = requestAnimationFrame(loop); } }
      return {
        back: back, wall: wall, glow: glow, start: start,
        // Titel nur noch für die Lage des Horizonts (knapp darunter beginnt das Tal), er wirft keinen Schatten mehr
        // Titel nur für den Horizont: Lage aus der Geometrie, ohne Pixelarbeit (die Maske hat beim Andocken
        // für einige Bilder alles angehalten, Hugos Video 22.11.)
        title: function (T) {
          if (T) { var a = T.map(T.ox, T.oy), b = T.map(T.ox + T.tw, T.oy + T.th); G = { bx: a[0], by: a[1], bw: b[0] - a[0], bh: b[1] - a[1] }; }
          start();
        },
        noGlow: function (r) { noG = r; },   // Computer: Feld (CSS-Pixel), in dem die Lichtebene darüber das Licht übernimmt
        light: function (on, lead) { if (on && !lightOn.want) lightOn.t0 = performance.now() - (lead || 0); if (on && !blOpen) blT0 = 0; lightOn.want = !!on; start(); },
        blind: function (open) { if (!reduce) { blT0 = performance.now(); blOpen = !!open; start(); } },   // open: Hugo 24.11. (14:59) auch beim Öffnen, Blendung klingt danach ab   // Schliessen: Strahl mit Schwung, Blendung   // lead: so viele ms ist das Einstrahlen schon weiter
        // Laden: Boden (Sonnenoberfläche) beginnt knapp unter dem Schriftzug
        horizon: function (top, bottom) { G = { bx: 0, by: top, bw: 1, bh: (bottom - top) / 0.62 }; start(); }
      };
    }
