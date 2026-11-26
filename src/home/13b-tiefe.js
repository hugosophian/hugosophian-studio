    // ---------- Tiefe (Handy, Hugo 26.11.2026): Foto mit Tiefe, gekoppelt an die Wisch-Position ----------
    // Das Foto selbst kommt von der Seite (dieselbe Datei wie das <img>, volle Schärfe). Pro Bild liegen dazu vier kleine,
    // vorbereitete Dateien im Repo (tiefe/<name>/):
    //   maske.png      Deckkraft der vorderen Ebene (muss verlustfrei sein, sonst feine Linien an den Kanten)
    //   rand.webp      durchsichtige Auflage für die vordere Ebene: an Kanten die reine Farbe des nahen Objekts, nach aussen gezogen
    //   dahinter.webp  durchsichtige Auflage für die Ebene dahinter: wo etwas Nahes war, steht die Fläche dahinter (gespiegelt weitergeführt)
    //   netz.png       Tiefe als kleines Gitter: Rot + Grün = vorne (16 Bit), Blau = Ebene dahinter
    // Vorne = Foto unter rand, ausgeschnitten mit maske. Dahinter = Foto unter dahinter.
    // Daraus entsteht ein 3D-Netz in zwei Ebenen. Beim Wischen verschiebt sich Nahes stärker als Fernes; ganz hinten
    // (Tiefe 0) bleibt am Bildrahmen stehen. Eingerastet steht das Foto unverändert da: dann ist die Leinwand unsichtbar und
    // man sieht das <img> selbst (volle Schärfe, alle anderen Effekte arbeiten wie bisher). Sobald sich das Bild bewegt,
    // blendet die Leinwand auf den ersten Pixeln des Wegs weich ein (CONFIG.tiefe.fade) und beim Einrasten wieder aus.
    // Die Leinwand liegt im Bildrahmen (.hp-media) über dem <img>: Verschieben und Zoomen des Rahmens macht sie von selbst mit.
    // Wo die Leinwand nichts zeichnet, scheint das <img> durch. Ohne WebGL, bei «Bewegung reduzieren», am Computer, solange
    // die Dateien fehlen und wenn das Foto der Seite ein anderes Seitenverhältnis hat als die vorbereiteten Dateien (neues
    // Foto im CMS, Dateien noch nicht neu gerechnet), bleibt einfach das <img> sichtbar.
    // Filter und alle Werte: effekt-bibliothek/10-konzept-tiefen-effekt.md
    var TIEFE = (function () {
      var T = CONFIG.tiefe;
      // data-hp-tiefe am Abschnitt: anderer Ordner für die Dateien (Testseiten) oder «aus»
      if (!T || !T.on || reduce || !window.WebGLRenderingContext || !window.Promise || root.getAttribute('data-hp-tiefe') === 'aus') return null;
      var base = root.getAttribute('data-hp-tiefe') || T.base, strength = T.strength, focus = T.focus, tilt = T.tilt, hold = 0, job = false;
      var tPrev = 0, ft = [], ftLast = 0, ftOut = null;                     // Bildtakt beim Wischen (nur für die Anzeige im Test)
      var HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
      // Pro Netzpunkt: Tiefe d gegenüber dem Fixpunkt uF (0 = ganz hinten steht still, 1 = ganz vorne steht still).
      // 1. Verschieben: uK * d (auf und ab). Nur an der Bildkante, von der sich der Inhalt wegbewegt, läuft das über ein Viertel
      //    der Höhe aus: so entsteht dort keine Lücke, und das Bild muss nicht grösser werden (Hugo 26.11., 12:59: kein
      //    Heranzoomen). An der anderen Kante schiebt sich der Inhalt einfach aus dem Bild, ohne gestaucht zu werden.  2. Kippen um die Querachse durch die Bildmitte um den Winkel uT, mit Perspektive
      // (uP): Nahes wird grösser, Fernes kleiner.  uG = so viel grösser, dass am Rand nie eine Lücke entsteht.
      var VERT = 'attribute vec2 aUV;attribute vec2 aD;uniform float uLayer,uK,uF,uT,uA,uP,uZ,uG;uniform vec2 uS,uO;varying vec2 vUV;' +
        'void main(){float d=mix(aD.x,aD.y,uLayer)-uF;float sh=uK*d;sh*=sh>0.?smoothstep(0.,.25,aUV.y):smoothstep(0.,.25,1.-aUV.y);vec2 p=vec2(aUV.x,aUV.y+sh)*uS+uO;float Y=p.y-.5,Z=d*uZ,c=cos(uT),s=sin(uT);' +
        'gl_Position=vec4((p.x-.5)*2.*uG,-(Y*c-Z*s)*2.*uG,0.,1.-(Y*s+Z*c)*uP);vUV=aUV;}';
      // die Auflagen sind «vormultipliziert» hochgeladen: Foto * (1 - Deckkraft) + Auflage
      var FRAG_V = HEAD + 'uniform sampler2D uPh,uM,uR;varying vec2 vUV;void main(){float a=texture2D(uM,vUV).r;if(a<.012)discard;vec4 o=texture2D(uR,vUV);gl_FragColor=vec4((texture2D(uPh,vUV).rgb*(1.-o.a)+o.rgb)*a,a);}';
      var FRAG_H = HEAD + 'uniform sampler2D uPh,uB;varying vec2 vUV;void main(){vec4 o=texture2D(uB,vUV);gl_FragColor=vec4(texture2D(uPh,vUV).rgb*(1.-o.a)+o.rgb,1.);}';

      function folder(s) { var k = (s.label || '').toLowerCase().replace(/[^a-z]/g, ''); return T.names[k] || T.names[s.name] || ''; }
      function load(src) {
        return new Promise(function (ok, no) {
          var im = new Image(); im.crossOrigin = 'anonymous';
          im.onload = function () { (im.decode ? im.decode() : Promise.resolve()).then(function () { ok(im); }, function () { ok(im); }); };
          im.onerror = no; im.src = src;
        });
      }
      function resting() { return !desk && !down && !busy() && Math.abs(C - F) < 0.0004; }

      // Dateien holen (stört keine Animation: Laden und Entpacken laufen neben dem Hauptfaden)
      function want(s) {
        if (s.tf) return;
        var dir = folder(s), pic = s.img;
        if (!dir || !s.media || !pic) { s.tf = { st: -1 }; return; }
        if (!pic.complete || !pic.naturalWidth) {            // das Foto der Seite ist noch nicht da: danach wieder schauen
          if (!s.tfWait) { s.tfWait = true; pic.addEventListener('load', function w() { pic.removeEventListener('load', w); s.tfWait = false; plan(); }); }
          return;
        }
        var tf = s.tf = { st: 1, k: NaN }, u = base + dir + '/';
        // dieselbe Datei, die das <img> zeigt (eigene Kopie mit CORS, wie beim Andock-Effekt: kommt aus dem Speicher des Browsers)
        Promise.all([load(pic.currentSrc || pic.src), load(u + 'maske.png'), load(u + 'rand.webp'), load(u + 'dahinter.webp'), load(u + 'netz.png')]).then(
          function (im) { tf.im = im; tf.st = 2; plan(); },
          function () { tf.st = -1; });
      }

      // Netz aus der kleinen Tiefen-Datei; die vorderen Dreiecke von fern nach nah geordnet (so braucht es keinen Tiefenpuffer)
      function mesh(img) {
        var nx = img.naturalWidth, ny = img.naturalHeight, c = document.createElement('canvas'); c.width = nx; c.height = ny;
        var x = c.getContext('2d'); x.drawImage(img, 0, 0);
        var px = x.getImageData(0, 0, nx, ny).data, v = new Float32Array(nx * ny * 4), dF = new Float32Array(nx * ny), i, j, k, o;
        for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
          k = j * nx + i; o = k * 4;
          dF[k] = (px[o] * 256 + px[o + 1]) / 65535;
          v[o] = i / (nx - 1); v[o + 1] = j / (ny - 1); v[o + 2] = dF[k]; v[o + 3] = px[o + 2] / 255;
        }
        var cells = (nx - 1) * (ny - 1), back = new Uint16Array(cells * 6), tri = new Uint16Array(cells * 6), key = new Uint8Array(cells * 2), cnt = new Int32Array(257), nb = 0, nt = 0;
        function add(a, b, c2) {
          back[nb++] = a; back[nb++] = b; back[nb++] = c2;
          var lo = Math.min(dF[a], dF[b], dF[c2]), hi = Math.max(dF[a], dF[b], dF[c2]);
          if (hi - lo >= T.wall) return;                       // an Tiefensprüngen bleibt das vordere Netz offen
          var q = Math.min(255, Math.floor(hi * 255)); key[nt] = q; cnt[q + 1]++;
          tri[nt * 3] = a; tri[nt * 3 + 1] = b; tri[nt * 3 + 2] = c2; nt++;
        }
        for (j = 0; j < ny - 1; j++) for (i = 0; i < nx - 1; i++) { var a = j * nx + i, b = a + 1, d = a + nx, e = d + 1; add(a, d, b); add(b, d, e); }
        for (i = 0; i < 256; i++) cnt[i + 1] += cnt[i];
        var front = new Uint16Array(nt * 3);
        for (i = 0; i < nt; i++) { o = cnt[key[i]]++ * 3; front[o] = tri[i * 3]; front[o + 1] = tri[i * 3 + 1]; front[o + 2] = tri[i * 3 + 2]; }
        return { v: v, back: back, front: front };
      }

      function prog(gl, frag) {
        function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
        var p = gl.createProgram();
        gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, frag));
        gl.bindAttribLocation(p, 0, 'aUV'); gl.bindAttribLocation(p, 1, 'aD'); gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
        var u = {}; ['uLayer', 'uK', 'uF', 'uT', 'uA', 'uP', 'uZ', 'uG', 'uS', 'uO', 'uPh', 'uM', 'uR', 'uB'].forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
        return { p: p, u: u };
      }

      // Leinwand, Netz und Texturen eines Bilds anlegen. Nur in Ruhe (nie während des Wischens oder einer Animation)
      function build(s) {
        var tf = s.tf, im = tf.im, cv = document.createElement('canvas'), gl = null;
        cv.className = 'hp-tiefe'; cv.setAttribute('aria-hidden', 'true');
        try { gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, depth: false, stencil: false, antialias: false }); } catch (e) {}
        tf.ai = im[1].naturalWidth / im[1].naturalHeight;
        // anderes Foto im CMS als das, für das die Dateien gerechnet sind: keine Tiefe (das <img> bleibt)
        if (!gl || Math.abs(im[0].naturalWidth / im[0].naturalHeight / tf.ai - 1) > 0.012) { tf.st = -1; tf.im = null; return; }
        try {
          var m = mesh(im[4]);
          tf.pv = prog(gl, FRAG_V); tf.ph = prog(gl, FRAG_H);
          var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, m.v, gl.STATIC_DRAW);
          gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
          gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
          tf.bb = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tf.bb); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.back, gl.STATIC_DRAW); tf.nb = m.back.length;
          tf.fb = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tf.fb); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.front, gl.STATIC_DRAW); tf.nf = m.front.length;
          // das Foto: höchstens CONFIG.tiefe.maxTex Bildpunkte (mehr sieht man auf der Leinwand nicht, kostet nur Speicher)
          var pic = im[0], pw = pic.naturalWidth, phh = pic.naturalHeight, f = Math.min(1, Math.sqrt(T.maxTex / (pw * phh)), gl.getParameter(gl.MAX_TEXTURE_SIZE) / Math.max(pw, phh));
          if (f < 1) {
            var c2 = document.createElement('canvas'); c2.width = Math.round(pw * f); c2.height = Math.round(phh * f);
            var x2 = c2.getContext('2d'); x2.imageSmoothingQuality = 'high'; x2.drawImage(pic, 0, 0, c2.width, c2.height); pic = c2;
          }
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          // [Bild, Format, vormultipliziert, Farben vom Browser umrechnen (nur das Foto: so sieht es aus wie das <img>)]
          [[pic, gl.RGB, false, true], [im[1], gl.LUMINANCE, false, false], [im[2], gl.RGBA, true, false], [im[3], gl.RGBA, true, false]].forEach(function (t, i) {
            gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, t[2]); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, t[3] ? gl.BROWSER_DEFAULT_WEBGL : gl.NONE);
            gl.texImage2D(gl.TEXTURE_2D, 0, t[1], t[1], gl.UNSIGNED_BYTE, t[0]);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          });
          if (pic !== im[0]) pic.width = pic.height = 0;   // Zwischenbild gleich wieder freigeben
          gl.useProgram(tf.pv.p); gl.uniform1i(tf.pv.u.uPh, 0); gl.uniform1i(tf.pv.u.uM, 1); gl.uniform1i(tf.pv.u.uR, 2);
          gl.useProgram(tf.ph.p); gl.uniform1i(tf.ph.u.uPh, 0); gl.uniform1i(tf.ph.u.uB, 3);
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0, 0, 0, 0);
        } catch (e) { tf.st = -1; tf.im = null; return; }
        var op = (getComputedStyle(s.img || s.media).objectPosition || '50% 50%').split(' ');
        tf.pos = [/%$/.test(op[0]) ? parseFloat(op[0]) / 100 : 0.5, /%$/.test(op[1] || op[0]) ? parseFloat(op[1] || op[0]) / 100 : 0.5];
        tf.cv = cv; tf.gl = gl; tf.im = null; tf.st = 3; tf.k = NaN;
        // Safari nimmt einer Seite im Hintergrund manchmal die Grafik weg: Leinwand entfernen (das <img> ist sofort wieder zu sehen)
        // und beim nächsten ruhigen Moment einmal neu aufbauen. Passiert es wieder, bleibt dieses Bild ohne Tiefe
        cv.addEventListener('webglcontextlost', function (e) {
          e.preventDefault(); if (cv.parentNode) cv.parentNode.removeChild(cv);
          s.tfLost = (s.tfLost || 0) + 1; tf.st = -1; if (s.tfLost < 2) s.tf = null;
        });
        tf.op = 0;
        s.media.appendChild(cv);
        paint(s, rel(s.i));   // erstes Zeichnen jetzt in Ruhe (Leinwand-Speicher, Texturen): der erste Wisch ruckelt nicht
        show(s, rel(s.i));
      }
      // Deckkraft aus der Lage: eingerastet 0 (das <img> ist zu sehen), nach CONFIG.tiefe.fade Bildhöhen Weg ganz da
      function show(s, r) {
        var tf = s.tf, op = Math.round(clamp(Math.abs(r) / T.fade, 0, 1) * 50) / 50;
        if (op > 0) paint(s, r);
        if (op !== tf.op) { tf.op = op; tf.cv.style.opacity = String(op); }
      }

      // Grösse der Leinwand in Pixeln: wie der Bildrahmen, höchstens CONFIG.tiefe.maxPixels
      function size(s) {
        var w = s.media.clientWidth, h = s.media.clientHeight;
        if (!w || !h) return null;
        var pr = Math.min(window.devicePixelRatio || 1, 3), px = w * h * pr * pr;
        if (px > T.maxPixels) pr *= Math.sqrt(T.maxPixels / px);
        return [Math.max(1, Math.round(w * pr)), Math.max(1, Math.round(h * pr)), w / h];
      }
      // ein Bild zeichnen; r = Lage des Bilds zur Bildschirmmitte in Bildhöhen (0 = eingerastet)
      function paint(s, r) {
        var tf = s.tf, gl = tf.gl, cv = tf.cv, z = size(s);
        if (!z) return;
        var rc = clamp(r, -1, 1), cw = z[0], ch = z[1], k = rc * T.travel * 0.5 * strength, a = rc * tilt * Math.PI / 180;
        if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; tf.k = NaN; }
        var key = k + a * 7 + focus * 1e3;
        if (key === tf.k) return;
        tf.k = key;
        // Nur fürs Kippen: so viel grösser zeichnen, dass oben und unten keine Lücke entsteht (ohne Kippen bleibt es bei 1)
        var g = 1, ca = Math.cos(a), sa = Math.sin(a);
        [-0.5, 0.5].forEach(function (y0) { [-focus, 1 - focus].forEach(function (dd) {
          var y = y0, zz = dd * T.zDepth, yp = (y * ca - zz * sa) / (1 - (y * sa + zz * ca) * T.persp);
          g = Math.max(g, 0.5 / Math.max(0.05, yp * (y0 < 0 ? -1 : 1)), 1 - (y * sa + zz * ca) * T.persp);
        }); });
        // wie object-fit: cover des <img>
        var ab = z[2], sx = 1, sy = 1, ox = 0, oy = 0;
        if (ab < tf.ai) { sx = tf.ai / ab; ox = (1 - sx) * tf.pos[0]; } else { sy = ab / tf.ai; oy = (1 - sy) * tf.pos[1]; }
        gl.viewport(0, 0, cw, ch); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.disable(gl.BLEND); layer(gl, tf.ph, 1, tf.bb, tf.nb, k, sx, sy, ox, oy, a, g);      // Ebene dahinter
        gl.enable(gl.BLEND); layer(gl, tf.pv, 0, tf.fb, tf.nf, k, sx, sy, ox, oy, a, g);       // Foto mit weichen Kanten
      }
      function layer(gl, p, l, buf, n2, k, sx, sy, ox, oy, a, g) {
        gl.useProgram(p.p); gl.uniform1f(p.u.uLayer, l); gl.uniform1f(p.u.uK, k); gl.uniform2f(p.u.uS, sx, sy); gl.uniform2f(p.u.uO, ox, oy);
        gl.uniform1f(p.u.uF, focus); gl.uniform1f(p.u.uT, a); gl.uniform1f(p.u.uP, T.persp); gl.uniform1f(p.u.uZ, T.zDepth); gl.uniform1f(p.u.uG, g);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf); gl.drawElements(gl.TRIANGLES, n2, gl.UNSIGNED_SHORT, 0);
      }

      // in ruhigen Lücken: erst das gezeigte Bild, dann die Nachbarn, dann den Rest – immer nur eines pro Lücke
      function plan() {
        if (job || !resting()) return;
        var cur = current(), order = [cur, wrap(cur + 1), wrap(cur - 1)], i;
        for (i = 0; i < n; i++) if (order.indexOf(i) < 0) order.push(i);
        var todo = null;
        for (i = 0; i < order.length && !todo; i++) {
          var s = slides[order[i]], tf = s.tf, z;
          if (!tf) want(s);
          else if (tf.st === 2) todo = s;
          else if (tf.st === 3 && (z = size(s)) && (tf.cv.width !== z[0] || tf.cv.height !== z[1])) todo = s;   // Handy gedreht, Fenster anders
        }
        if (!todo) return;
        job = true;
        idle(function () {
          job = false;
          if (!resting() || !todo.tf) return;
          if (todo.tf.st === 2) build(todo); else if (todo.tf.st === 3) paint(todo, rel(todo.i));
          setTimeout(plan, 120);
        });
      }

      // jedes Bild nach dem Verschieben (aus render): zeichnet nur, wenn sich die Lage eines sichtbaren Bilds geändert hat
      function frame(on) {
        var tNow = performance.now(), dtS = Math.min(0.05, (tNow - tPrev) / 1000), settling = false; tPrev = tNow;
        for (var j = 0; j < n; j++) {
          var s = slides[j], tf = s.tf;
          if (!tf || tf.st !== 3) continue;
          if (!on) { if (!tf.off) { tf.off = true; tf.cv.style.display = 'none'; } continue; }
          if (tf.off) { tf.off = false; tf.cv.style.display = ''; tf.k = NaN; }
          var r = rel(j);
          if (hold && Math.abs(r) < 0.02) r = hold;           // Test: «Halten» zeigt das eingerastete Bild so, als wäre es so weit gewischt
          // Unter dem Finger folgt die Tiefe direkt. Nach dem Loslassen rastet das Bild schnell ein; die Tiefe geht dann nicht
          // im selben Ruck auf null, sondern läuft weich aus (Hugo 26.11., 13:59: «soll nicht zurückspringen»).
          if (tf.rs === undefined || down || Math.abs(r - tf.rs) > 0.9) tf.rs = r;
          else { tf.rs += (r - tf.rs) * (1 - Math.exp(-dtS / T.settle)); if (Math.abs(r - tf.rs) < 0.0015) tf.rs = r; else settling = true; }
          if (Math.abs(r) < 1 || Math.abs(tf.rs) < 1) show(s, tf.rs);
        }
        if (settling) kick();
        if (ftOut && on) {
          var now = performance.now(), mv = Math.abs(C - F) > 0.002 || down;
          if (mv) { if (ftLast) ft.push(now - ftLast); ftLast = now; }
          else { if (ft.length > 12) { ft.sort(function (x, y) { return x - y; }); var md = ft[ft.length >> 1], p9 = ft[Math.floor(ft.length * 0.95)]; ftOut.textContent = 'Bildtakt ' + md.toFixed(1) + ' ms (' + Math.round(1000 / md) + ' pro s), langsamste ' + p9.toFixed(0) + ' ms'; } ft = []; ftLast = 0; }
        }
        if (on) plan();
      }

      // Test auf der Staging-Adresse (Hugo 26.11.): Regler für Stärke, Fixpunkt und Kippen, «Halten» und der Bildtakt.
      // Hugo hat am iPhone eingestellt (250 / 0 / 0), die Werte stehen fest in CONFIG.tiefe. Die Regler erscheinen nur noch
      // mit ?tiefe-regler in der Adresse (oder data-hp-tiefe-test auf Testseiten).
      if (root.hasAttribute('data-hp-tiefe-test') || /[?&]tiefe-regler/.test(location.search)) {
        try { var sv = JSON.parse(sessionStorage.getItem('hp-tiefe2') || '{}'); if (sv.s >= 0) strength = sv.s; if (sv.f >= 0) focus = sv.f; if (sv.t > -99) tilt = sv.t; } catch (e) {}
        var sw = document.createElement('div'); sw.className = 'hp-tiefe-sw';
        var tog = document.createElement('button'); tog.type = 'button'; tog.className = 'hp-tiefe-tog'; tog.setAttribute('aria-expanded', 'false');
        var box = document.createElement('div'); box.className = 'hp-tiefe-box'; box.hidden = true;
        var label = function () { tog.textContent = 'Tiefe ' + Math.round(strength * 100) + ' | Fix ' + Math.round(focus * 100) + ' | Kippen ' + tilt.toFixed(0); };
        var redraw = function () { for (var q = 0; q < n; q++) if (slides[q].tf) slides[q].tf.k = NaN; label(); try { sessionStorage.setItem('hp-tiefe2', JSON.stringify({ s: strength, f: focus, t: tilt })); } catch (e) {} kick(); };
        [['Tiefe (%)', 0, 250, 5, function () { return strength * 100; }, function (v) { strength = v / 100; }],
         ['Fixpunkt (0 hinten, 100 vorne)', 0, 100, 5, function () { return focus * 100; }, function (v) { focus = v / 100; }],
         ['Kippen (Grad)', -15, 15, 1, function () { return tilt; }, function (v) { tilt = v; }],
         ['Halten (0 = aus)', -90, 90, 5, function () { return hold * 100; }, function (v) { hold = v / 100; }]].forEach(function (d) {
          var l = document.createElement('label'), sp = document.createElement('span'), inp = document.createElement('input');
          inp.type = 'range'; inp.min = d[1]; inp.max = d[2]; inp.step = d[3]; inp.value = d[4]();
          var txt = function () { sp.textContent = d[0] + ': ' + Math.round(d[4]()); };
          inp.addEventListener('input', function () { d[5](parseFloat(inp.value)); txt(); redraw(); });
          txt(); l.appendChild(sp); l.appendChild(inp); box.appendChild(l);
        });
        ftOut = document.createElement('div'); ftOut.className = 'hp-tiefe-ft'; ftOut.textContent = 'Bildtakt: einmal wischen'; box.appendChild(ftOut);
        tog.addEventListener('click', function () { box.hidden = !box.hidden; tog.setAttribute('aria-expanded', String(!box.hidden)); });
        // Finger auf den Reglern soll nicht wischen und keine Welle auslösen
        ['pointerdown', 'touchstart', 'touchmove', 'click'].forEach(function (ev) { sw.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
        label(); sw.appendChild(tog); sw.appendChild(box); root.appendChild(sw);
      }
      return { frame: frame };
    })();

