    // ---------- Wasserwellen bei Berührung (Hugo 23.11.) ----------
    // Wie ein Stein im Wasser: wo der Finger aufsetzt, beginnt eine kleine Ringwelle, entlang der Fingerbahn
    // folgen weitere (zuerst berührt = zuerst los). Die Welle verzerrt das Bild darunter wirklich (es wird in
    // WebGL nachgezeichnet und an der Welle verschoben), um die Welle schimmert ein feiner Regenbogen.
    // Erreicht sie den Bildschirmrand, leuchten die Farben dort leicht auf, laufen am Rand weiter und erlöschen.
    // Ausserhalb der Wellen ist die Leinwand durchsichtig, man sieht das normale Bild.
    var ripple = (function () {
      if (reduce) return null;
      var cv = document.createElement('canvas'), c = null;
      cv.className = 'hp-ripple'; cv.setAttribute('aria-hidden', 'true');
      // liegt im berührten Bild, direkt über dem Foto und unter der Überschrift; wird mit dem Bild beschnitten
      cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
      try { c = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false }); } catch (e) {}
      if (!c) return null;
      var NW = 6, PW = 16, NP = NW * PW;   // bis zu 6 Wellen mit je 16 Bahnpunkten (Hugo 25.11., 20:57: mit 4 Plätzen und laufender Andock-Welle warf jede neue Welle die älteste auf einen Schlag hinaus – das Bild sprang zurück)
      var FS = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' + [
        'uniform float uRim; uniform float uSoft; uniform float uEdgeOff; uniform float uTint; uniform float uDA; uniform float uDF; uniform float uFade; uniform float uWL; uniform float uWE; uniform float uWF; uniform vec2 uRes; uniform float uDpr; uniform vec4 uP[' + NP + ']; uniform float uAge[' + NW + ']; uniform float uHue[' + NW + ']; uniform vec4 uB[' + NW + ']; uniform float uT; uniform float uEdgeT; uniform float uSeed; uniform float uKeep; uniform float uImp; uniform float uDesk;',
        'float h2(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }',
        'float n2(vec2 x) { vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);',
        '  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }',      // Punkte der Fingerbahn: x, y, eigenes Alter, aktiv
        // Abstand zum Bahnabschnitt a–b, Wellenfront dort minus gelaufene Strecke (mit weicher Einblendung neuer Punkte)
        // Hugo 24.11.: Flare-Fäden als Stromlinien einer weichen, fast geraden Strömung (kein Winkel um die Mitte → kein Wirbelpunkt).
        // Zwei Scharen schiessen von gegenüberliegenden Seiten über die Mitte bis auf die Gegenseite, gleiten ineinander,
        // werden unterwegs schwächer und nehmen die Randfarbe ihres Ursprungs mit; die Welle läuft weich die Fäden entlang
        'float flPsi(vec2 fc, vec2 res, float t, vec2 d, float sw, float sd) {',
        '  float mn = min(res.x, res.y); vec2 q = fc / mn, c = (fc - res * 0.5) / mn;',
        '  float ra = 0.75 * (n2(q * 0.7 + vec2(sd * 1.3, t * 0.02)) - 0.5); c = mat2(cos(ra), sin(ra), -sin(ra), cos(ra)) * c;',   // Hugo 24.11.: fächert auf
        '  c -= d * 0.45 * smoothstep(2.0, 6.0, uEdgeT);',   // Hugo 24.11.: beim Verglimmen weiterziehen statt stehen
        '  float s = dot(c, d);',
        '  vec2 pp = vec2(-d.y, d.x); float smx = 0.5 * (abs(d.x) * res.x + abs(d.y) * res.y) / mn;',
        '  float ps = dot(c, pp) * 4.5 + sw * s * s * 0.0 + 0.9 * n2(q * 1.8 + vec2(t * 0.07, -t * 0.05) + sd) + 0.45 * n2(q * 4.0 + vec2(-t * 0.1, s * 2.5 - t * 0.45));',
        // Hugo 24.11. (Skizze): am Ursprung starten sie als gebogene Korona-Schlaufen (Füsse am Rand), die aufgehen
        // organischer (Skizze): weicher S-Peitschenschwung, der langsam die Fäden entlangläuft
        '  ps += 0.55 * sw * sin(s * 2.4 - t * 0.55 + sd * 3.0) * smoothstep(-smx, -smx + 0.5, s);',
        '  float op = exp(-max(uEdgeT, 0.0) * 1.1);',
        '  for (int k = 0; k < 2; k++) {',
        '    float fk = float(k), hk = h2(vec2(sd + fk * 3.1, 2.7)), rk = 0.12 + 0.08 * h2(vec2(sd, fk + 5.0));',
        '    vec2 c0 = -d * (smx - 0.14) + pp * ((hk - 0.5) * 1.5);',
        '    vec2 dc = c - c0; float da = dot(dc, d) / rk, db = dot(dc, pp) / (rk * 1.9);',   // flacher Bogen
        '    ps += (fk < 0.5 ? 1.0 : -1.0) * (0.45 + 0.9 * op) * exp(-da * da - db * db);',
        '  }',
        '  return ps;',
        '}',
        // Anziehung (Hugo 24.11.): in der Nähe eines leuchtenden Fadens der anderen Schar biegen die Linien zu ihm hin,
        // laufen ein Stück mit ihm zusammen und lösen sich wieder – weich, ohne Ruck
        // Hugo 24.11. (8:50): zwei direkt benachbarte Fäden leuchten nie gleichzeitig – nur der stärkere. So verteilen sie
        // sich übers Bild und ballen sich nicht (seltene chaotische Ausreisser)
        'float flLit(float id, float sd) {',
        '  float h = h2(vec2(id, sd * 1.7));',
        '  if (h < 0.78 || h2(vec2(id - 1.0, sd * 1.7)) > h || h2(vec2(id + 1.0, sd * 1.7)) > h) return 0.0;',
        '  return h;',
        '}',
        // Faltschutz: die Anziehung wird nur dort gedrosselt, wo sich ein Faden sonst zurückfalten würde (Zickzack)
        'vec3 flNoFold(vec3 P, vec3 F, float att) {',
        '  vec2 gP = vec2(P.y - P.x, P.z - P.x), gF = vec2(F.y - F.x, F.z - F.x);',
        '  float dpf = dot(gF, gP), a = att;',
        '  if (dpf < 0.0) a = min(att, 0.6 * dot(gP, gP) / max(-dpf, 1e-7));',
        '  return P + a * F;',
        '}',
        'float flPull(float pa, float sd) {',
        '  float id = floor(pa + 0.5), dl = pa - id;',
        '  float k = 1.0 - 4.0 * dl * dl;',   // läuft zur Grenze hin sauber auf 0 aus (keine Nahtlinien)
        '  float hl = flLit(id, sd);',
        '  return (hl > 0.0 ? smoothstep(0.78, 1.0, hl) : 0.0) * dl * exp(-dl * dl / 0.16) * k * k;',
        '}',
        // Hugo 24.11. (Video 8:21): Kollision statt Kreuzen. Für einen Faden wird geprüft, ob er auf dem Weg vom Ursprung
        // bis hier einen Faden der anderen Schar überquert hat. War jener stärker, endet er dort (der Stärkere nimmt ihn mit),
        // nur seine Spitze wird seitlich weggepeitscht und verglimmt. War jener schwächer, leuchtet er danach kräftiger weiter.
        // Y = (psi der anderen Schar hier, psi am eigenen Ursprung, |grad psi|, Seed); D = (Richtung der anderen Schar, Zeit)
        // Hugo 24.11. (8:33): alle Übergänge weich gewichtet statt hart abgeschnitten (sonst sichtbare Lichtkanten,
        // wo ein Strahl über dem anderen liegt): kp = wie viel vom Faden bleibt, bo = Verstärkung, dp/pw = für die abgeworfene Spitze
        'void flX(float str, vec4 Y, vec3 D, vec2 c, float et, vec2 fc, vec2 dx, float sn, out float dp, out float kp, out float bo, out float pw) {',
        '  dp = 0.0; kp = 1.0; bo = 0.0; pw = 0.0;',
        '  if (Y.w < -0.5) return;',
        '  float mn = min(uRes.x, uRes.y), lo = min(Y.x, Y.y), hi = max(Y.x, Y.y), k0 = floor(lo) + 1.0;',
        '  float smy = 0.5 * (abs(D.x) * uRes.x + abs(D.y) * uRes.y) / mn, sy = dot(c, D.xy);',
        '  float mg = mn * (0.04 + 0.13 * (1.0 - exp(-et * 1.8)));',
        '  for (int k = 0; k < 8; k++) {',
        '    float iy = k0 + float(k);',
        '    if (iy >= hi) break;',
        '    float hy = flLit(iy, Y.w);',
        '    if (hy < 0.78) continue;',
        '    float hry = h2(vec2(iy + 11.0, Y.w)), sty = smoothstep(0.78, 1.0, hy);',
        '    float sfy = -smy + 2.0 * smy * (0.4 + 0.9 * hry * (0.5 + 0.5 * sty)) * (1.0 - exp(-et * 1.3));',
        '    float dd = abs(Y.x - iy) / max(Y.z, 1e-4);',
        '    vec2 cp = fc - dx * dd / max(sn, 0.3);',
        '    vec2 ins = min(cp, uRes - cp);',
        '    float w = (1.0 - smoothstep(sfy - 0.05, sfy + 0.15, sy)) * smoothstep(mg, mg + mn * 0.06, min(ins.x, ins.y));',
        '    if (w < 0.001) continue;',
        '    if (sty > str + 0.04) {',
        '      kp = min(kp, mix(1.0, 0.5 * (1.0 - smoothstep(0.0, 0.035, dd / mn)), w));',   // danach: rasch weg (ab der Hälfte)
        '      if (w * dd > pw * dp) { dp = dd; pw = w; }',
        '    } else bo = max(bo, w * smoothstep(0.0, mn * 0.04, dd));',
        '  }',
        // Hugo 24.11. (9:23): schon beim Heranlaufen an einen stärkeren Faden geht der schwächere weich in ihn über
        // (auf der Mittellinie genau halb) – sonst wird sein breiter Schein dort hart abgeschnitten (durchsichtig, Kanten)
        '  float sgn = Y.x >= Y.y ? 1.0 : -1.0, ia = sgn > 0.0 ? floor(Y.x) + 1.0 : ceil(Y.x) - 1.0;',
        '  float ha = flLit(ia, Y.w);',
        '  if (ha >= 0.78 && smoothstep(0.78, 1.0, ha) > str + 0.04) {',
        '    float sfa = -smy + 2.0 * smy * (0.4 + 0.9 * h2(vec2(ia + 11.0, Y.w)) * (0.5 + 0.5 * smoothstep(0.78, 1.0, ha))) * (1.0 - exp(-et * 1.3));',
        '    vec2 ins2 = min(fc, uRes - fc);',
        '    float wa = (1.0 - smoothstep(sfa - 0.05, sfa + 0.15, sy)) * smoothstep(mg, mg + mn * 0.06, min(ins2.x, ins2.y));',
        '    float da = abs(ia - Y.x) / max(Y.z, 1e-4);',
        '    kp = min(kp, mix(1.0, 0.5 + 0.5 * smoothstep(0.0, 0.08, da / mn), wa));',
        '  }',
        '}',
        'vec2 flO(vec2 fc, vec2 d) {',
        '  float mn = min(uRes.x, uRes.y); vec2 c = (fc - uRes * 0.5) / mn;',
        '  float s = dot(c, d), smx = 0.5 * (abs(d.x) * uRes.x + abs(d.y) * uRes.y) / mn;',
        '  return fc - d * (s + smx) * mn;',
        '}',
        // Hugo 24.11.: jeder Pixel prüft den eigenen und die beiden Nachbar-Fäden – sonst wird der Lichtsaum an der Grenze
        // zwischen zwei Fäden hart abgeschnitten (sichtbarer Rand neben den Flares)
        'float flFam(vec2 fc, vec2 res, float t, float et, float ee, float sd, float an, vec3 P, float rp, vec4 Y1, vec3 D1, float n1, vec4 Y2, vec3 D2, float n2s, out vec3 tint) {',
        '  tint = vec3(0.0);',
        '  float mn = min(res.x, res.y); vec2 d = vec2(cos(an), sin(an)), c = (fc - res * 0.5) / mn;',
        '  float ps = P.x; vec2 gp = vec2(P.y - ps, P.z - ps) / 1.5;',
        '  float gl = max(length(gp), 1e-4), id0 = floor(ps + 0.5);',
        '  float s = dot(c, d), smx = 0.5 * (abs(d.x) * res.x + abs(d.y) * res.y) / mn;',
        '  float u = clamp((s + smx) / (2.0 * smx), 0.0, 1.0);',                                   // 0 = Ursprung, 1 = Gegenseite
        '  float wfn = 0.04 + 0.13 * (1.0 - exp(-et * 1.8));',   // Lage der Flare-Welle (Abstand vom Rand)
        '  float tl = -smx - 0.3 + (2.0 * smx + 0.3) * smoothstep(2.2, 6.0, et);',   // Ende: Schwanz löst sich vom Ursprung her auf
        '  float base = smoothstep(wfn - 0.05, wfn + 0.03, ee / mn) * smoothstep(tl, tl + 0.35, s)',
        '             * smoothstep(0.0, 0.12, et) * (1.0 - smoothstep(3.6, 6.2, et)) * mix(1.0, 0.28, smoothstep(0.05, 1.0, u));',
        '  float sv = 0.0;',
        '  if (base < 0.002) return 0.0;',
        '  for (int n = -1; n <= 1; n++) {',
        '    float id = id0 + float(n);',
        '    float hs = h2(vec2(id, sd * 1.7)), hr = h2(vec2(id + 11.0, sd));',
        '    if (flLit(id, sd) < 0.78) continue;',
        '    float str = smoothstep(0.78, 1.0, hs);',
        '    float sf = -smx + 2.0 * smx * (0.4 + 0.9 * hr * (0.5 + 0.5 * str)) * (1.0 - exp(-et * 1.3));',   // Spitze: schnell, dann langsamer
        '    float sd2 = abs(ps - id) / gl;',
        '    float swd = mn * (0.011 + 0.009 * str) * (1.2 - 0.3 * u), sw2 = swd * 1.45;',
        // Saum läuft weit genug aus, bevor er weggelassen wird (Hugo 24.11.: sonst sichtbarer Beleuchtungsrand)
        '    float thin = 0.0, fib = 0.0;',
        '    if (sd2 < sw2 * 14.0) {',
        // Hugo 24.11. (9:04): dicker, der weiche Schein wirkt weiter in die Umgebung
        '      thin = exp(-sd2 * sd2 / (swd * swd)) + 0.38 * exp(-sd2 * sd2 / (swd * swd * 14.0));',
        '      fib = 0.42 * exp(-sd2 * sd2 / (sw2 * sw2 * 16.0));',
        '      for (int j = -1; j <= 1; j++) {',
        '        float fj = float(j), of = fj * (0.06 + 0.06 * n2(vec2(s * 3.0 - t * 0.3, id * 2.0 + fj * 5.0)));',
        '        float dj = abs(ps - id - of) / gl;',
        '        fib += (fj == 0.0 ? 0.4 : 0.3) * exp(-dj * dj / (sw2 * sw2 * 0.6));',
        '      }',
        '      fib *= 0.75 + 0.35 * sin(s * 8.0 - t * 2.0 + id * 1.7);',
        '    }',
        '    float flick = 0.8 + 0.2 * n2(vec2(s * 6.0 - t * 1.5, id * 3.0));',
        '    float dp1, kp1, bo1, pw1, dp2, kp2, bo2, pw2;',
        '    flX(str, Y1, D1, c, et, fc, d, n1, dp1, kp1, bo1, pw1); flX(str, Y2, D2, c, et, fc, d, n2s, dp2, kp2, bo2, pw2);',
        '    bool f1 = pw1 * dp1 >= pw2 * dp2;',
        '    float dp = f1 ? dp1 : dp2, pw = f1 ? pw1 : pw2, sn = f1 ? n1 : n2s, keep = min(kp1, kp2), tip = 0.0;',
        '    if (dp > 0.0) {',
        '      float ds = dp / mn / max(sn, 0.3);',                                  // Weg seit dem Zusammenstoss
        // Hugo 24.11. (8:32/8:40): das abgeworfene Stück ist nicht mehr magnetisch (ungezogenes psi) – es rollt sich als
        // Korona-Bogen ein und verglimmt mit weichem Schweif ins Nichts; prallt nirgends mehr an
        '      float L = max(sf - s + ds, 0.01);',                                    // Länge seit dem Zusammenstoss
        '      float sg = hr > 0.5 ? 1.0 : -1.0, cur = sg * (0.06 + 7.0 * ds * ds);',   // Bogen: biegt zur Spitze hin stärker ab
        '      float td = (rp - id - cur) / gl;',
        '      float tail = smoothstep(0.0, 0.7 * L, ds);',                           // Schweif läuft zum Ursprung hin ins Nichts
        '      tip = tail * (1.0 - smoothstep(sf - 0.06, sf + 0.02, s)) * exp(-L / 0.32) * exp(-td * td / (swd * swd * 1.8)) * 0.85 * pw;',
        '    }',
        '    float boo = 1.0 + 0.4 * max(bo1, bo2);',                                 // der Stärkere nimmt den Schwung mit
        '    sv += ((0.6 * thin + 0.6 * fib) * keep * boo * (1.0 - smoothstep(sf - 0.3, sf, s)) + tip) * flick * (0.5 + 0.55 * str);',
        '  }',
        '  sv *= base;',
        '  vec2 o = c - d * (s + smx); o = normalize(o * mn + vec2(0.001));',                  // Ursprung am Rand
        '  vec3 oc = 0.5 + 0.5 * cos(6.2832 * (atan(o.y, o.x) / 6.2832 * 2.0 + t * 0.06 + vec3(0.0, 0.33, 0.67)));',
        '  tint = mix(oc, vec3(1.0, 0.82, 0.55), 0.25) * sv * (1.0 - smoothstep(0.1, 0.95, u));',   // trägt die Ursprungsfarbe mit
        '  return sv;',
        '}',
        'float segF(vec2 fc, vec4 a, vec4 b, float mx, float sp, out vec2 dv, out float d) {',
        '  vec2 ab = b.xy - a.xy; float l2 = dot(ab, ab);',
        '  float t = l2 > 0.01 ? clamp(dot(fc - a.xy, ab) / l2, 0.0, 1.0) : 0.0;',
        '  float z = max(mix(a.z, b.z, t), 0.0); dv = fc - (a.xy + ab * t); d = length(dv);',
        // sp > 0: Fingerwelle (gleichmässig); sp < 0: Andock-Welle – schiesst schnell aus dem Rand und wird rasch langsamer,
        // jede Stelle reicht unterschiedlich weit (Punkt.w), so läuft nie ein Viereck zur Mitte
        '  float tr = sp > 0.0 ? z * mx * 0.15 * sp * mix(0.45, 1.3, clamp(mix(a.w, b.w, t), 0.0, 1.35)) : min(uRes.x, uRes.y) * (-sp) * mix(a.w, b.w, t) * (1.0 - exp(-z * 2.6));',   // Hugo 25.11. (08:26): ruhige Welle läuft weniger weit, kräftige weiter   // Andocken: Reichweite nach der schmalen Seite, die Seiten treffen sich nie
        // Hugo 25.11. (17:40): Andock-Bahn mit Vorzeichen (aussen negativ) – sonst hatte der Abstand genau auf der Bahn einen Knick, und wo
        // die Bahn oben im Bild liegt, sah man ihre Ecken als feine gestufte Linie
        '  vec2 nI = l2 > 0.01 ? vec2(-ab.y, ab.x) / sqrt(l2) : vec2(0.0, 1.0); nI *= dot(nI, uRes * 0.5 - a.xy) < 0.0 ? -1.0 : 1.0;',
        '  float ds = sp < 0.0 ? dot(fc - a.xy, nI) : d;',   // Andocken: Abstand zur Linie des Abschnitts (überall stetig, innen positiv)
        '  return ds - tr + (1.0 - smoothstep(0.0, 0.12, z)) * mx * 0.035; }',
        'uniform sampler2D uImg; uniform float uHas; uniform vec4 uRect; uniform vec4 uCrop; uniform float uCov; uniform float uGo; uniform float uWG[' + NW + '];',
        // Hugo 25.11. (20:54): Bildtexturen – jedes Foto liegt einmal in voller Schärfe auf der Grafikkarte; der Shader sucht per Lage
        // (Spalte bzw. Bild, uTE), welches Foto an dieser Stelle liegt, und liest es dort wie object-fit: cover (uTI, uTC).
        // Computer: weisse Textspalte darüber (uTS, uTA). Nichts wird mehr pro Bild neu zusammengesetzt oder hochgeladen
        'uniform float uTx; uniform sampler2D uT0, uT1, uT2, uT3; uniform vec4 uTE[4], uTI[4], uTC[4], uTS[4]; uniform float uTA[4];',
        'vec3 txImg(vec2 q) {',
        '  float sel = -1.0; vec4 ti = vec4(0.0, 0.0, 1.0, 1.0), tc = vec4(0.0, 0.0, 1.0, 1.0), ts = vec4(-9.0, -9.0, 0.0, 0.0); float ta = 0.0;',
        // erst das Bild, in dessen Rahmen die Stelle liegt; sonst ein Bild, dessen Foto dort noch weitergeht (gezoomt, über den Rand
        // hinaus – die Welle holt echtes Foto herein); erst ganz ausserhalb wird am Bühnenrand gespiegelt
        '  for (int k = 0; k < 4; k++) {',
        '    vec4 e = uTE[k];',
        '    if (e.z > 0.0 && q.x >= e.x && q.x < e.x + e.z && q.y >= e.y && q.y < e.y + e.w) { sel = float(k); ti = uTI[k]; tc = uTC[k]; ts = uTS[k]; ta = uTA[k]; }',
        '  }',
        '  if (sel < 0.0) for (int k = 0; k < 4; k++) {',   // Haarspalt zwischen zwei Spalten (Bruchteile eines Pixels): nächstes Bild
        '    vec4 e = uTE[k] + vec4(-1.0, -1.0, 2.0, 2.0);',
        '    if (uTE[k].z > 0.0 && q.x >= e.x && q.x < e.x + e.z && q.y >= e.y && q.y < e.y + e.w) { sel = float(k); ti = uTI[k]; tc = uTC[k]; ts = uTS[k]; ta = uTA[k]; }',
        '  }',
        '  if (sel < 0.0) for (int k = 0; k < 4; k++) {',
        '    vec4 e = uTI[k];',
        '    if (uTE[k].z > 0.0 && q.x >= e.x && q.x < e.x + e.z && q.y >= e.y && q.y < e.y + e.w) { sel = float(k); ti = uTI[k]; tc = uTC[k]; ts = uTS[k]; ta = uTA[k]; }',
        '  }',
        '  if (sel < 0.0) {',
        '    q = uRect.zw - abs(uRect.zw - abs(q));',
        '    for (int k = 0; k < 4; k++) {',
        '      vec4 e = uTE[k];',
        '      if (e.z > 0.0 && q.x >= e.x && q.x < e.x + e.z && q.y >= e.y && q.y < e.y + e.w) { sel = float(k); ti = uTI[k]; tc = uTC[k]; ts = uTS[k]; ta = uTA[k]; }',
        '    }',
        '  }',
        '  if (sel < 0.0) return vec3(0.0);',
        '  vec2 uv = tc.xy + clamp((q - ti.xy) / ti.zw, 0.0, 1.0) * tc.zw;',
        '  vec3 r = sel < 0.5 ? texture2D(uT0, uv).rgb : sel < 1.5 ? texture2D(uT1, uv).rgb : sel < 2.5 ? texture2D(uT2, uv).rgb : texture2D(uT3, uv).rgb;',
        '  if (q.x >= ts.x && q.x < ts.x + ts.z && q.y >= ts.y && q.y < ts.y + ts.w) r = mix(r, vec3(1.0), ta);',
        '  return r;',
        '}',   // Hugo 25.11. (16:58): eine deckende Fläche (uCov) · Effekt klingt als Ganzes aus (uGo)   // Bildlage (px, y oben) · Ausschnitt (uv)
        'void main() {',
        '  vec2 fc = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;',   // in CSS-Pixeln, gerechnet in voller Bildschirmschärfe
        '  float mx = max(uRes.x, uRes.y);',
        '  vec2 ed = min(fc, uRes - fc); float eR = mix(18.0, 90.0, uDesk); float e = -eR * log(exp(-ed.x / eR) + exp(-ed.y / eR));',   // Computer: Ecken viel runder (Hugo 24.11.: sonst Viereck-Rahmen)   // weich gerundet: keine Diagonalen in den Ecken
        // Hugo 23.11.: EINE Welle in der Form der Fingerbewegung. Jeder Punkt der Bahn startet zu seiner Zeit;
        // die Wellenfront ist dort, wo die Welle zuerst ankommt (kleinster Abstand minus gelaufene Strecke).
        // Zähflüssiger als Wasser: langsam, ein einziger weicher Berg mit Tal, lange gedämpft.
        // Hugo 23.11.: mehrere Wellen gleichzeitig (schnell hintereinander verschwindet die erste nicht)
        '  vec2 q = fc / mx * 2.6;',   // gröber: breitere, ruhigere Sonnenbewegung
        '  vec2 wq = vec2(n2(q * 0.9 + vec2(uT * 0.11, -uT * 0.07)), n2(q + vec2(-uT * 0.09, uT * 0.13) + 5.2));',
        '  float sv = n2(q * 1.4 + wq * 2.2 + vec2(0.0, uT * 0.05));',
        '  vec2 off = vec2(0.0); float ring = 0.0, ph = 0.0, edge = 0.0, rs = 0.0, halo = 0.0, fa = 0.0, faD = 0.0, org = 0.0, wipe = 0.0; vec3 rbA = vec3(0.0);',
        '  for (int k = 0; k < ' + NW + '; k++) {',
        '    float age = uAge[k]; if (age < 0.0) continue;',
        // schwache Handys: Pixel weit weg von dieser Welle rechnen die Bahn gar nicht erst durch
        '    if (length(fc - uB[k].xy) - uB[k].z - age * mx * 0.15 * abs(uB[k].w) * (uB[k].w > 0.0 ? 1.6 : 1.0) > mx * 0.62) continue;',
        // Hugo 23.11.: keine Striche beim Auslösen — die Bahn ist eine durchgehende Linie (Abschnitte zwischen den Punkten),
        // nicht einzelne Kreise; Alter und Einblendung laufen entlang des Abschnitts weich mit.
        // Weiches Minimum in einem Durchgang (laufend neu gewichtet), damit es auch in voller Schärfe flüssig bleibt.
        // Hugo 25.11. (17:27): Andock-Welle mit weicherem Übergang zwischen den Abschnitten ihrer Bahn – sonst Knickfalten (feine Linien)
        '    float w = mx * min(0.019 + 0.02 * age, 0.062) * (uB[k].w < 0.0 ? 1.25 : 1.0), sw = 1.0 / (w * (uB[k].w > 0.0 ? 0.5 : 1.6));',   // Hugo 24.11. (14:00): Sonnenwelle breiter   // Andocken: breiter   // Andocken: breiter   // Hugo 23.11.: am Finger wieder grösser, beim Auslaufen kompakt (früher 0.016 + 0.028 · Alter, max. 0.085)
        '    float best = 1e9, ws = 0.0, sf = 0.0, sd = 0.0, sm = 0.0, sa = 0.0; vec2 dir = vec2(0.0);',
        // Hugo 25.11. (17:48): Andock-Welle ohne Bahn aus Abschnitten – deren Ecken und Kanten zeichneten sich als feine gerade
        // Linien und Sterne ins Foto. Jetzt eine glatte Form (weich gerundetes Rechteck wie vorher die Bahn, Superellipse), mit
        // weich wechselnder Reichweite rundherum: keine einzige Kante mehr
        '    if (uB[k].w < 0.0) {',
        '      vec2 hc = uRes * 0.5, pc = fc - hc; float rl = max(length(pc), 1.0); vec2 ua = pc / rl; float th = atan(ua.y, ua.x), sd0 = uHue[k] * 31.0;',
        '      vec2 qn = abs(pc) / (hc + 6.0); float L = pow(pow(qn.x, 2.6) + pow(qn.y, 2.6), 1.0 / 2.6);',
        '      float kk = 1.0 - 0.03 * (1.0 + sin(th * 3.0 + sd0)) - 0.02 * (1.0 + sin(th * 5.0 + sd0 * 1.7)) - 0.03 * n2(ua * 2.2 + vec2(sd0, 3.0));',
        '      float mA = 0.15 + 1.1 * pow(n2(ua * 2.4 + vec2(7.0, sd0)), 1.6), zA = age + 0.11;',
        '      float dsA = rl * (kk / max(L, 1e-3) - 1.0);',
        '      best = dsA - min(uRes.x, uRes.y) * (-uB[k].w) * mA * (1.0 - exp(-zA * 2.6)) + (1.0 - smoothstep(0.0, 0.12, zA)) * mx * 0.035;',
        '      dir = -ua; sd = abs(dsA); sm = 1.0; sa = age;',
        '    } else {',
        '      for (int j = 0; j < ' + (PW - 1) + '; j++) {',
        '        vec4 pa = uP[k * ' + PW + ' + j]; if (pa.w <= 0.0) continue;',
        '        vec4 pb = uP[k * ' + PW + ' + j + 1]; if (pb.w <= 0.0) pb = pa;',
        '        vec2 dv; float d; float f = segF(fc, pa, pb, mx, uB[k].w, dv, d);',
        '        vec2 un = d > 0.5 ? dv / d : vec2(0.0); float mg = 0.5 * (pa.w + pb.w), za = 0.5 * (max(pa.z, 0.0) + max(pb.z, 0.0));',   // Hugo 25.11.: Stärke (Fingertempo) und Alter an dieser Stelle der Bahn
        '        if (f < best) { float sc = best > 1e8 ? 0.0 : exp((f - best) * sw); ws = ws * sc + 1.0; sf = sf * sc + f; sd = sd * sc + d; sm = sm * sc + mg; sa = sa * sc + za; dir = dir * sc + un; best = f; }',
        '        else { float q = exp((best - f) * sw); ws += q; sf += q * f; sd += q * d; sm += q * mg; sa += q * za; dir += q * un; }',
        '      }',
        '      if (ws <= 0.0) continue;',
        '      best = sf / ws; dir /= ws; sd /= ws; sm /= ws; sa /= ws;',
        '    }',
        // Hugo 25.11. (08:10): Fingerwelle je nach Tempo – langsam schmal und ruhig, schnell breit und kräftig (Andocken unverändert)
        // Hugo 25.11. (08:26): langsam deutlich kleiner, schnell grösser als bisher
        // Hugo 25.11. (08:49): wie ein Finger durchs Wasser – am Finger spitz und schmal, dahinter breitet sich die Welle aus.
        // Breite, Einblenden und Abklingen nach dem Alter der jeweiligen Stelle der Bahn (vorher: Alter der ganzen Welle)
        '    bool fW = uB[k].w > 0.0;',
        '    float gk = fW ? clamp(sm, 0.05, 1.35) : 1.0, gA = fW ? mix(0.2, 1.2, gk) : 1.0;',
        '    float wk = fW ? mx * min(0.006 + 0.032 * sa, 0.072) * mix(0.32, 1.35, gk) : w;',
        '    float gD = fW ? mix(0.12, 1.25, gk * gk) : 1.0;',
        // Hugo 25.11. (18:10): die stärksten Wellen etwas kräftiger (Verzerrung +30 %, Licht +25 %), schwächere unverändert
        '    float gS = fW ? smoothstep(0.75, 1.0, gk) : 0.0; gD *= 1.0 + 0.3 * gS; gA *= 1.0 + 0.25 * gS;',   // Verzerrung des Bildes: kleine Welle deutlich weniger als die stärkste
        '    float x = best / wk;',
        // Andock-Welle (uB.w < 0): setzt sofort mit voller Kraft ein und klingt schneller ab (Hugo 23.11.: Snap, Wow)
        '    bool dockW = uB[k].w < 0.0;',
        // Hugo 24.11. (10:13): die Fingerwelle wischt den Andock-Effekt entlang ihres Weges weg (Fingerwellen kommen in der
        // Liste zuerst, die Andock-Welle zuletzt – so ist «wipe» hier schon bekannt)
        '    if (!dockW) wipe = max(wipe, (1.0 - smoothstep(-1.2, 0.3, x)) * smoothstep(0.0, 0.15, age));',
        '    float kD = dockW ? (1.0 - wipe) * uKeep * uDA : 1.0;',   // Rand und Welle des Andockens: uDA
        '    float envT = (dockW ? smoothstep(0.0, mix(0.03, 0.6, uSoft), age) : smoothstep(0.0, 0.14, sa)) * kD * uWG[k], env = exp(-x * x) * envT;',   // Schimmer (Hugo 24.11., 18:19): ohne Aufprall, weich
        '    float amp = dockW ? exp(-age * 0.6) : exp(-sa * 0.45);',   // Andocken: wirkt länger nach
        // Hugo 23.11.: keine Streifen in der Welle — die Verschiebung wächst mit der Wellenbreite, so dass sich das Foto
        // nie überschlägt (vorher wurde es in der Mitte der schmalen Welle über sich selbst gezogen)
        '    float xd = x / (dockW ? 2.0 : 1.6);',
        // Hugo 25.11. (17:06): kein Strich mehr mitten durch die Welle – die Verschiebung verteilt sich auf eine breitere Zone
        // (gleich weit, aber weicher): vorher wurde das Foto in der Wellenmitte fast 8-fach zusammengedrückt, das sah aus wie eine Linie
        // Hugo 25.11. (17:15): kein dunkler Streifen in der Welle – vorher zog die eine Hälfte der Welle das Foto nach innen, die andere
        // nach aussen (hell–dunkel–hell auf glatten Flächen). Jetzt schiebt die ganze Welle in eine Richtung: ein einziges weiches Band
        // Hugo 25.11. (17:34): beim Andocken lag die Bahn oben ein Stück im Bild – auf ihren beiden Seiten zeigte die Richtung
        // entgegengesetzt, das gab eine feine Linie zwischen Farbsaum und Flares. Andocken schiebt jetzt immer zur Bildmitte hin
        // (eine durchgehende Richtung, keine Kante an der Bahn)
        '    vec2 dirW = dockW ? normalize(uRes * 0.5 - fc + 0.001) * smoothstep(0.0, mx * 0.12, length(uRes * 0.5 - fc)) : dir; float sdK = dockW ? 1.0 : smoothstep(0.0, wk * 2.5, sd);',   // Hugo 25.11. (17:41): entlang der Fingerbahn sanfter (vorher wurde das Foto zur Bahn hin gestaucht – Linie, v. a. mit dem Andocken zusammen)
        '    off += dirW * (-0.5 * exp(-xd * xd) * envT * amp * sdK) * wk * 0.7 * gD * (uB[k].w > 0.0 ? 1.0 : 2.0 * (1.0 + 0.6 * uSoft));',   // Hugo 24.11. (18:26): Schimmer – Bild bewegt sich etwas mehr   // Hugo 24.11. (14:08): Sonnenwelle verzieht das Bild stärker   // Andocken: kräftiger
        // Hugo 16:19 (Video 16:14): beim Andocken lag ein milchiger Schleier über dem ganzen Foto – das Licht der Andock-Welle
        // leuchtet jetzt nur am Rand voll, innen nur noch 25 % (die Verschiebung = das Wabbern bleibt ganz)
        '    float lk = dockW ? 0.25 + 0.75 * exp(-max(e, 0.0) / (mx * 0.07)) : 1.0;',
        '    float r = env * amp * gA * lk; ring = 1.0 - (1.0 - ring) * (1.0 - min(r, 1.0)); rs += r; ph += r * x;',
        '    rbA += r * (0.5 + 0.5 * cos(6.2832 * (sv * 1.6 + x * 0.06 + uHue[k] * 0.15 + vec3(0.0, 0.33, 0.67))));',
        // Hugo 23.11.: am Bildschirmrand stärker; hat die Welle den Rand erreicht, leuchtet er nach und verblasst nach rund 4 s
        '    edge = max(edge, uWG[k] * exp(-0.25 * (x + sqrt(x * x + 0.09)) * (x + sqrt(x * x + 0.09))) * exp(-0.5 * (sqrt(x * x + 0.09) - x) * 0.12) * smoothstep(0.0, 0.35, age) * exp(-age * 0.3) * (1.0 - smoothstep(3.6, 5.6, age)) * exp(-max(e, 0.0) * max(e, 0.0) / 560.0) * (uB[k].w > 0.0 ? gA : 0.35) * kD);',   // Andock-Welle: Rand leuchtet nur leicht mit,
        '    float on = smoothstep(0.0, dockW ? 0.03 : 0.35, age) * (dockW ? exp(-age * 0.4) * (1.0 - smoothstep(3.2, 6.2, age)) : amp) * kD * uWG[k];',   // Hugo 24.11.: blendet weich bis ganz aus, bevor die Welle endet   // Flares gleiten am Rand langsam nach
        '    halo = 1.0 - (1.0 - halo) * (1.0 - exp(-x * x / 9.0) * on * gA * lk);',
        '    vec4 p0 = uP[k * ' + PW + ']; if (p0.w > 0.0) { vec2 d0 = (fc - p0.xy) / (mx * 0.22); org = max(org, exp(-dot(d0, d0)) * on); }',   // Hugo 24.11. (14:27): Start der Sonnenwelle nicht so wuchtig
        '    float fs = uHue[k] * 17.0;',
        '    float xo = 0.5 * (x + sqrt(x * x + 0.09));',   // Hugo 25.11. (17:41): weicher Übergang an der Wellenfront (vorher Knick bei x = 0 → zarte Linie um die Welle)
        '    vec2 dn = dot(dir, dir) > 1e-5 ? normalize(dir) : vec2(1.0, 0.0);',
        // Hugo 24.11.: Andock-Flares mit eigener Richtung – jede Stelle der Front neigt ihre Flares anders (langsam
        // wanderndes Feld); so laufen sie schräg, kreuzen sich und fliessen weiter ineinander, statt alle zur Mitte zu zeigen
        '    float lean = (n2(dn * 1.7 + vec2(fs + 3.0, uT * 0.07)) - 0.5) * 2.6;',
        // Hugo 24.11.: magnetisches Spiel ohne Mittelpunkt – eine Flare biegt weg von der stärkeren Nachbarin (die
        // stärkere drückt die schwächere zur Seite, sie verschmelzen und laufen in neuer Richtung weiter); je weiter
        // ins Bild, desto mehr drehen sie seitlich ab, so sammeln sie sich nie in einem Punkt in der Mitte
        '    vec2 dnL = vec2(dn.x * 0.97 + dn.y * 0.25, -dn.x * 0.25 + dn.y * 0.97), dnR = vec2(dn.x * 0.97 - dn.y * 0.25, dn.x * 0.25 + dn.y * 0.97);',
        '    float push = dockW ? n2(dnR * 1.7 + vec2(fs, uT * 0.3)) - n2(dnL * 1.7 + vec2(fs, uT * 0.3)) : 0.0;',
        '    float ra = dockW ? min(xo, 5.0) * (0.42 * lean - 1.1 * push + 0.22 * sin(uT * 0.9 + fs + dn.x * 3.0)) : xo * 0.22 * sin(uT * 0.6 + fs);',
        '    vec2 cs = vec2(dn.x * cos(ra) - dn.y * sin(ra), dn.x * sin(ra) + dn.y * cos(ra)) * 3.4;',   // mehr Flares rundherum (vorher 2.2)
        // Andocken (Hugo 23.11.): weniger Flares, dafür kräftiger und weissgolden
        '    float fl = dockW ? pow(n2(cs * 0.6 + vec2(fs, uT * 0.3)), 5.0) * 1.7 : pow(n2(cs + vec2(fs, uT * 0.3)), 2.8);',   // Hugo 24.11.: schlanke, klare Zungen statt verschwommen
        '    float ln = (0.5 + fl * (4.2 + 2.6 * n2(cs * 1.7 + vec2(uT * 0.8, fs)))) * (dockW ? 1.35 : 1.0);',   // Hugo 24.11.: Andocken – weniger, dafür grösser   // Hugo 23.11.: kleinere Flares an der Welle
        '    float fv = 1.05 * (1.0 + 0.8 * exp(-age * 1.2)) * fl * smoothstep(-0.3, 0.5, x) * exp(-xo * xo / ln) * on * smoothstep(dockW ? 0.0 : 0.05, dockW ? mix(0.06, 0.6, uSoft) : 0.25, age) * smoothstep(wk * 0.3, wk * 1.1, sd) * gA',
        '      * (dockW ? 1.0 - smoothstep(0.1, 0.24, xo * w / min(uRes.x, uRes.y)) : 1.0);',   // Hugo 24.11.: die kleinen Flares bleiben am Rand; die grossen sind die Flare-Fäden (siehe unten)
        '    if (dockW) faD = max(faD, fv * uDF / max(uDA, 0.01) * (1.0 - 0.6 * uSoft)); else fa = max(fa, fv);',   // Flares des Andockens: uDF (Hugo 24.11., 15:16: Flares ja, Rand wenig)   // Hugo 23.11.: schon die erste Welle trägt Flares, sie reiten auf der Front (kein Stern am Startpunkt)
        '  }',
        '  ph = rs > 0.0001 ? ph / rs : 0.0;',
        '  vec3 rb = rs > 0.0001 ? rbA / rs : vec3(0.5);',
        '  rb = mix(vec3(dot(rb, vec3(0.333))), rb, 0.85);',   // Hugo 23.11.: wieder etwas kräftiger
        // Andocken nach dem Laden (Hugo 23.11.): sobald das Bild andockt, leuchtet der ganze Rand bunt auf (so lange wie
        // bei der Fingerwelle); aus der Andock-Welle steigen die Flare-Fäden auf (flPsi/flFam, alles hier im Shader).
        '  vec3 eacc = vec3(0.0); float fI = 0.0;',
        '  if (uEdgeT >= 0.0) {',
        '    float et = uEdgeT;',
        '    float fade = 1.0 - smoothstep(3.6, 5.6, et);',   // Hugo 23.11.: kurzer Höhepunkt, dann klärt sich das Bild
        '    float flash = uSoft > 0.5 ? smoothstep(0.0, 0.8, et) * 0.75 * exp(-et * 0.3) : 1.7 * uImp * exp(-et * 6.5) + 0.85 * exp(-et * 0.42);',   // Hugo 16:19: Aufprall kurz (~0.15 s), Saum klingt in ~2.5 s aus   // Hugo 24.11. (18:19): Schimmer = Ladeanimation ohne den Aufprall – das Nachleuchten blendet weich ein   // uImp: Computer minimal schwächerer Aufprall (Hugo 24.11.)   // Hugo 24.11.: Aufleuchten etwas höher, Nachleuchten mehr   // Hugo 23.11.: Andocken wieder wichtiger – kräftiger Schlag   // Hugo 23.11.: grosse bunte Welle beim Andocken
        '    float band = exp(-max(e, 0.0) * max(e, 0.0) / 560.0);',
        '    vec2 ca = normalize(fc - uRes * 0.5 + vec2(0.001)); float ang = atan(ca.y, ca.x) / 6.2832;',
        '    vec3 erb = 0.5 + 0.5 * cos(6.2832 * (ang * 2.0 + uT * 0.06 + vec3(0.0, 0.33, 0.67)));',
        '    float egm = smoothstep(0.3, 0.7, n2(ca * 3.0 + vec2(uT * 0.08, 5.0)));',
        '    vec3 ecol = mix(erb, vec3(1.0, 0.8, 0.48), 0.15 + 0.3 * egm);',   // satter bunt
        // Hugo 15:59 (Vorschlag 2 «Sonne mit Perlmutt-Rand»): der bunte Saum wird Hirsch-Perlmutt – wandert weich durch Eis-Cyan,
        // Periwinkel, Flieder, Rosé, Champagner, Eis-Cyan hell; ein Hauch Sonne bleibt darin. Der warme Kern (Flares, faD) bleibt golden.
        '    float ept = fract(ang * 2.0 + uT * 0.12 + egm * 0.35) * 6.0;',   // 16:19: Schimmer wandert langsam um den Rand
        '    vec3 epl = mix(vec3(0.588, 0.863, 0.961), vec3(0.890, 0.918, 0.973), smoothstep(0.0, 1.0, ept));',
        '    epl = mix(epl, vec3(0.765, 0.698, 0.980), smoothstep(1.0, 2.0, ept));',
        '    epl = mix(epl, vec3(0.949, 0.867, 0.890), smoothstep(2.0, 3.0, ept));',
        '    epl = mix(epl, vec3(0.984, 0.953, 0.871), smoothstep(3.0, 4.0, ept));',
        '    epl = mix(epl, vec3(0.855, 0.949, 0.973), smoothstep(4.0, 5.0, ept));',
        '    epl = mix(epl, vec3(0.588, 0.863, 0.961), smoothstep(5.0, 6.0, ept));',
        '    epl = clamp(mix(vec3(dot(epl, vec3(0.333))), epl, 1.45), 0.0, 1.0);',   // 16:19: Perlmutt am Rand minimal sichtbarer
        '    ecol = mix(epl, vec3(1.0, 0.86, 0.6), 0.1 + 0.12 * egm);',
        // Hugo 23.11.: kein gleichmässiger Bilderrahmen – das Bunte am Rand ist mal stärker, mal kaum da, und wandert
        '    float patch = 0.08 + 1.1 * smoothstep(0.42, 0.8, n2(ca * 3.2 + vec2(uT * 0.13, -uT * 0.09) + 7.0));',   // einzelne Stellen statt Rahmen
        '    float bw = mix(0.45 + 1.1 * n2(ca * 4.0 + vec2(-uT * 0.1, 2.0)), 0.35 + 1.4 * n2(ca * 5.0 + vec2(-uT * 0.1, 2.0)), uDesk);',   // Hugo 15:59: auch am Handy ungleichmässiger   // Computer: Breite stark wechselnd
        '    band = exp(-max(e, 0.0) * max(e, 0.0) / (950.0 * bw * bw)) + 0.5 * exp(-max(e, 0.0) / (mx * 0.08)) * exp(-et * 1.5);',
        '    eacc = ecol * band * flash * 0.85 * (1.0 + 0.7 * uSoft) * mix(1.0, patch, max(smoothstep(0.15, 0.7, et), 0.8 * uDesk));',   // Computer: von Anfang an ungleich (kein Rahmen)   // Hugo 24.11.: beim Aufprall rundherum kräftig bunt, danach ungleich   // von Anfang an ungleich
        // Flares wie bei der Fingerwelle (Hugo 23.11.): weiche goldene Zungen, rundherum ungleich verteilt, ihre Länge flackert
        // lebendig; sie wachsen beim Andocken aus dem Rand und ziehen sich wieder zurück
        '    float ra = 0.22 * sin(uT * 0.6);',
        '    vec2 cs = vec2(ca.x * cos(ra) - ca.y * sin(ra), ca.x * sin(ra) + ca.y * cos(ra)) * 3.4;',
        '    float efl = pow(n2(cs + vec2(uSeed, uT * 0.3)), 2.8);',
        '    float eln = 0.5 + efl * (4.2 + 2.6 * n2(cs * 1.7 + vec2(uT * 0.8, uSeed)));',
        '    float exo = max(e, 0.0) / (mx * 0.024);',
        '    float egr = smoothstep(0.05, 0.7, et) * (1.0 - smoothstep(4.0, 6.2, et));',
        '    float efa = efl * exp(-exo * exo / eln) * egr * (0.25 + 0.95 * smoothstep(0.35, 0.95, patch));',   // 16:19: Zungen dort, wo der Saum am stärksten ist
        '    float efm = smoothstep(0.35, 0.85, n2(fc / mx * 2.6 + vec2(uT * 0.05, 3.0)));',
        '    eacc += mix(vec3(1.0, 0.86, 0.62), epl, smoothstep(0.15, 0.9, exo * exo / eln)) * efa * (0.6 + 0.5 * efm) * 0.45; fI = efa * 0.3;',   // innen Sonne, Spitzen Perlmutt   // die Flares kommen jetzt v. a. von den Wellen
        '    eacc *= fade;',
        // Flare-Fäden: zwei Scharen aus gegenüberliegenden Seiten, kreuzen weich die Mitte, vermischen sich und verglimmen
        '    {',
        '      float mnS = min(uRes.x, uRes.y), sw = mod(uSeed, 2.0) < 1.0 ? 1.0 : -1.0, ee = max(e, 0.0);',
        '      float a0 = 6.2832 * h2(vec2(uSeed, 4.1));',
        '      vec3 tA, tB; float sA = uSeed, sB = uSeed + 7.3, tB0 = uT * 1.07 + 5.0;',
        '      vec2 dA = vec2(cos(a0), sin(a0)), dB = vec2(cos(a0 + 3.1416 + 0.35 * sw), sin(a0 + 3.1416 + 0.35 * sw));',
        '      vec2 o1 = vec2(1.5, 0.0), o2 = vec2(0.0, 1.5);',
        '      vec3 PA = vec3(flPsi(fc, uRes, uT, dA, sw, sA), flPsi(fc + o1, uRes, uT, dA, sw, sA), flPsi(fc + o2, uRes, uT, dA, sw, sA));',
        '      vec3 PB = vec3(flPsi(fc, uRes, tB0, dB, -sw, sB), flPsi(fc + o1, uRes, tB0, dB, -sw, sB), flPsi(fc + o2, uRes, tB0, dB, -sw, sB));',
        '      float att = 3.0 * smoothstep(0.2, 1.2, et);',   // Anziehung wächst, sobald sie unterwegs sind
        '      vec3 QA = flNoFold(PA, vec3(flPull(PB.x, sB), flPull(PB.y, sB), flPull(PB.z, sB)), att);',
        '      vec3 QB = flNoFold(PB, vec3(flPull(PA.x, sA), flPull(PA.y, sA), flPull(PA.z, sA)), att);',
        '      float vA = 0.0, vB = 0.0;',
        '      vec3 tC; float sC = uSeed + 13.1, tC0 = uT * 0.93 + 9.0, aC = a0 + 1.5708 * sw + 0.3;',
        '      vec2 dC = vec2(cos(aC), sin(aC));',
        '      vec3 PC = vec3(flPsi(fc, uRes, tC0, dC, sw, sC), flPsi(fc + o1, uRes, tC0, dC, sw, sC), flPsi(fc + o2, uRes, tC0, dC, sw, sC));',
        '      float PC0 = PC.x;',
        '      PC = flNoFold(PC, vec3(flPull(PA.x, sA), flPull(PA.y, sA), flPull(PA.z, sA)), att * 0.8);',
        '      float aB = a0 + 3.1416 + 0.35 * sw, nAC = abs(sin(aC - a0)), nBC = abs(sin(aC - aB));',
        '      float gA = length(vec2(QA.y - QA.x, QA.z - QA.x)) / 1.5, gB = length(vec2(QB.y - QB.x, QB.z - QB.x)) / 1.5, gC = length(vec2(PC.y - PC.x, PC.z - PC.x)) / 1.5;',
        '      vec2 oA = flO(fc, dA), oB = flO(fc, dB), oC = flO(fc, dC);',
        '      vec4 off4 = vec4(0.0, 0.0, 1.0, -1.0); vec3 off3 = vec3(1.0, 0.0, 0.0);',
        '      vA = flFam(fc, uRes, uT, et, ee, sA, a0, QA, PA.x, vec4(PC.x, flPsi(oA, uRes, tC0, dC, sw, sC), gC, sC), vec3(dC, 0.0), nAC, off4, off3, 1.0, tA);',
        '      vB = flFam(fc, uRes, tB0, et, ee, sB, aB, QB, PB.x, vec4(PC.x, flPsi(oB, uRes, tC0, dC, sw, sC), gC, sC), vec3(dC, 0.0), nBC, off4, off3, 1.0, tB);',
        '      float vC = 0.75 * flFam(fc, uRes, tC0, et, ee, sC, aC, PC, PC0, vec4(QA.x, flPsi(oC, uRes, uT, dA, sw, sA), gA, sA), vec3(dA, 0.0), nAC,',
        '                                 vec4(QB.x, flPsi(oC, uRes, tB0, dB, -sw, sB), gB, sB), vec3(dB, 0.0), nBC, tC);',
        '      float kSo = 1.0 - uSoft; vB *= kSo; vC *= kSo;',   // Hugo 24.11. (18:22): Schimmer – nur eine Schar Flare-Fäden (sonst manchmal fünf auf einmal)
        '      float sv = vA + vB + vC; sv = 1.1 * (1.0 - exp(-sv / 1.1)) * 0.25;',   // 16:19: Flare-Fäden nur noch ein Hauch (wirkten wie ein Kratzer)   // Hugo 24.11.: beim Verschmelzen heller Strang, keine weisse Fläche   // wo sie sich treffen: weich verschmelzen statt aufaddieren
        '      float wfc = 0.04 + 0.13 * (1.0 - exp(-et * 1.8)), dw = (ee / mnS - wfc) / 0.07;',
        '      float sb = max(1.0 - smoothstep(0.03, 0.3, ee / mnS), 0.85 * exp(-dw * dw));',
        '      faD += sv * (1.0 - 0.7 * sb) * 1.3;',
        '      eacc += mix(ecol, vec3(1.0, 0.82, 0.55), 0.3) * sv * sb * 0.6 + (tA + (tB + tC * 0.75) * kSo) * 0.15 * (1.0 - sb);',
        '    }',
        // Andocken bringt das Bild zum Wabbern (Hugo 23.11.): vom Rand laufen weiche Wellen nach innen, unter den Flares
        // stärker; Verschiebung klein genug, dass sich das Foto nie überschlägt
        '    float kE = (1.0 - wipe) * uKeep; faD *= kE * uDF; eacc *= kE * uDA * uRim; fI *= kE * uDF;',   // Hugo 24.11. (14:29): beim Schliessen nur der Rand (uDA), keine Flares (uDF)   // weggewischt bzw. nach dem ersten Wischen ganz aus
        '    vec2 wxy = vec2(exp(-ed.x / 18.0) * sign(uRes.x * 0.5 - fc.x), exp(-ed.y / 18.0) * sign(uRes.y * 0.5 - fc.y));',
        '    vec2 nin = normalize(uRes * 0.5 - fc + 0.001) * smoothstep(0.0, mx * 0.12, length(uRes * 0.5 - fc));',   // zur Mitte hin weich auf null (dort hat die Richtung keinen Sinn – sonst kleiner Knick genau in der Mitte)   // Hugo 25.11. (17:40): zur Bildmitte (stetig) – vorher kippte die Richtung auf der Diagonale aus jeder Ecke (feine schräge Linie oben rechts)
        '    float wa = (exp(-max(e, 0.0) / (mx * 0.16)) * (0.6 * exp(-et * 1.2) + 0.4 * exp(-et * 0.35)) * 0.4 * (0.45 + 0.9 * smoothstep(0.3, 0.9, patch)) + min(fI, 1.2) * 1.1) * fade * kE;',   // 16:19: von den hellen Stellen aus, ungleich
        '    float wph = max(e, 0.0) * 0.07 - et * 3.2 + 2.0 * n2(ca * 4.0 + vec2(et * 0.3, 1.0));',
        // Hugo 25.11. (17:27): wie bei der Fingerwelle keine Streifen mehr – das Wabbern (v. a. unter den Flares, wo es am stärksten
        // ist) schob das Foto abwechselnd nach innen und aussen (hell–dunkel–hell). Jetzt nur noch in eine Richtung, weich an- und abschwellend
        '    off += (nin * (0.5 + 0.5 * sin(wph)) + vec2(-nin.y, nin.x) * 0.25 * (0.5 + 0.5 * cos(wph * 0.7 + 1.3))) * wa * mx * 0.013 * smoothstep(0.0, mix(0.25, 0.8, uSoft), et) * (1.0 + 0.6 * uSoft) * uGo;',   // 16:19: Wabbern sichtbarer (0.009 → 0.013)
        '  }',
        '  eacc *= uGo; faD *= uGo;',   // Hugo 25.11. (19:10): uGo nur noch fürs Andock-Licht; jede Welle klingt mit ihrem eigenen Wert aus (uWG) – sonst sprangen alte Wellen zurück, wenn eine neue begann
        '  vec3 col = vec3(0.0), base = vec3(0.0); float al = 0.0, here = 0.0, alD = 0.0;',
        '  if (uHas > 0.5) {',
        // Hugo 24.11.: zum Bildschirmrand hin wird die Verschiebung nach aussen weich begrenzt (nie über die Kante) –
        // sonst Spiegelmuster/ausgefranste Kanten am Rand. Nach innen bleibt sie unverändert.
        '    vec2 dE = max(min(fc, uRes - fc), 0.0), sgE = sign(fc - uRes * 0.5 + 0.001);',
        '    vec2 aO = max(off * sgE, 0.0);',   // Anteil nach aussen
        '    vec2 offE = off - sgE * (aO - aO * dE / (dE + aO + 1e-3));',
        // Computer (Hugo 24.11.): beim starken Andocken wurde die oberste Bildzeile nach unten gezogen – dort klingt die
        // Verschiebung nach aussen jetzt sanft über eine breitere Zone aus (höchstens doppelt gedehnt, ganz am Rand gar nicht)
        '    vec2 rmp = smoothstep(vec2(0.0), max(aO * 3.0, vec2(1.0)), dE);',
        '    offE = mix(offE, off - sgE * aO * (1.0 - rmp), uDesk);',
        '    vec2 sp = fc + offE;',
        '    vec2 u = (sp - uRect.xy) / uRect.zw;',
        // Hugo 24.11.: Leinwand = ganzer Bildschirm – was die Welle über den Rand hinaus holt, wird gespiegelt statt
        // ausgeblendet (sonst ausgefranste Kanten mit dem unverzerrten Bild darunter)
        '    u = 1.0 - abs(1.0 - abs(u));',
        '    float inside = 1.0;',
        '    vec2 iu = uCrop.xy + clamp(u, 0.0, 1.0) * uCrop.zw;',
        '    vec3 img = uTx > 0.5 ? txImg(sp - uRect.xy) : texture2D(uImg, iu).rgb;',   // Hugo 25.11. (18:00): keine Farbtrennung mehr – sie legte neben Kanten (Sattelstütze) graue Geisterlinien; nur noch ein Bild
        '    float u0 = (fc.x - uRect.x) / uRect.z, v0 = (fc.y - uRect.y) / uRect.w;',
        '    vec2 bh = min(vec2(u0, v0), 1.0 - vec2(u0, v0)) * uRect.zw;',
        '    here = step(0.0, min(bh.x, bh.y)) * inside; base = img;',   // Hugo 24.11.: kein Ausblenden am Bildschirmrand mehr (sonst dunkler Rahmen mit dem unverzerrten Foto)
        // deckend, wo sich das Bild verschiebt; weich aus, wo es fast stillsteht (kein halbdurchsichtiges Doppelbild)
        '    al = smoothstep(0.15, 1.0, length(off)) * here; col = img * al; alD = al;',
        '  }',
        '  float fm = smoothstep(0.35, 0.85, sv);',                                    // breite Sonnenzellen
        '  edge *= (1.0 - uEdgeOff) * uWE;',
        '  fa *= uWF; halo *= uWL; ring *= uWL;',   // Hugo 25.11.: Licht der Fingerwelle zurückgenommen   // Hugo 24.11. (15:39): beim Öffnen leuchtet die Welle am Bildschirmrand nicht auf (nicht im Blitz sichtbar)
        '  float glow = clamp(ring * 1.0 + edge * 1.9, 0.0, 1.0);',   // ein weiches Band statt heller Linien an Vorder- und Hinterkante
        '  vec3 fc2 = 0.5 + 0.5 * cos(6.2832 * (sv * 1.6 + vec3(0.0, 0.33, 0.67)));',
        '  fc2 = mix(vec3(dot(fc2, vec3(0.333))), fc2, 0.6);',
        '  float fil = pow(1.0 - abs(2.0 * sv - 1.0), 6.0), cw = pow(1.0 - abs(2.0 * sv - 1.0), 3.0);',
        '  vec3 sun = vec3(1.0, 0.9, 0.72) * (0.55 * fm + 0.45 * fil) + vec3(1.0, 0.8, 0.5) * fil * 0.35;',
        '  float mixr = clamp(0.25 * smoothstep(0.45, 0.8, n2(q * 0.5 + vec2(uT * 0.06, 3.0))) + 0.75 * org, 0.0, 1.0);',
        '  vec3 cr = 0.5 + 0.5 * cos(6.2832 * ((sv - 0.5) * 1.8 + uT * 0.03 + vec3(0.0, 0.33, 0.67)));',
        '  sun = mix(sun, cr * (0.5 * fm + 0.6 * cw), mixr * cw);',
        // Hugo 23.11.: am Rand goldenes Licht wie die Sonnenstrahlen, das sich weich mit dem Regenbogen mischt
        '  float gm = smoothstep(0.25, 0.75, n2(q * 0.7 + vec2(uT * 0.05, -uT * 0.04) + 9.0));',
        '  vec3 rim = mix(rb, vec3(1.0, 0.8, 0.48), 0.2 + 0.4 * gm);',
        // Hugo 15:47: Lichtkanten der Fingerwelle in Hirsch-Perlmutt (Eis-Cyan kräftig ↔ Flieder kräftig, weich wandernd, mit Hauch Rosé);
        // Andock-/Ladelicht (fa, faD, eacc) bleibt unverändert
        // Hugo 15:54: dazu die hellen Season-Töne (Periwinkel, Rosé, Champagner, Eis-Cyan hell), weich ineinander übergehend
        '  float pt = fract(sv * 0.9 + uT * 0.05 + gm * 0.6) * 6.0;',
        '  vec3 prl = mix(vec3(0.588, 0.863, 0.961), vec3(0.890, 0.918, 0.973), smoothstep(0.0, 1.0, pt));',
        '  prl = mix(prl, vec3(0.765, 0.698, 0.980), smoothstep(1.0, 2.0, pt));',
        '  prl = mix(prl, vec3(0.949, 0.867, 0.890), smoothstep(2.0, 3.0, pt));',
        '  prl = mix(prl, vec3(0.984, 0.953, 0.871), smoothstep(3.0, 4.0, pt));',
        '  prl = mix(prl, vec3(0.855, 0.949, 0.973), smoothstep(4.0, 5.0, pt));',
        '  prl = mix(prl, vec3(0.588, 0.863, 0.961), smoothstep(5.0, 6.0, pt));',
        '  rim = mix(rim, prl, 0.8); vec3 sunH = mix(sun, prl * 0.9, 0.7);',
        '  vec3 gc = mix(rim, vec3(1.0), 0.1) * glow + sunH * halo * 0.5 + vec3(1.0, 0.86, 0.62) * fa * (0.6 + 0.5 * fm) + vec3(1.0, 0.9, 0.72) * faD * 0.5;',
        '  gc += (h2(fc * 1.37) - 0.5) / 255.0;',
        // Hugo 24.11. (16:41): kein Ausblenden am Rand mehr (sah aus wie ein unsichtbarer Rahmen); der helle Strich oben am
        // iPhone kam von der Schimmerwelle, die knapp am Rand lag – sie startet jetzt ausserhalb des Bildschirms (siehe dock)
                                      // gegen Farbstufen im Verlauf
        // Hugo 23.11.: kein milchiger Schleier — das Licht fällt AUF das Foto (Dunkles bleibt dunkel, Helles leuchtet farbig),
        // statt halbdurchsichtig darüber zu liegen
        '  if (uHas > 0.5 && here > 0.0) {',
        '    float L = dot(gc, vec3(0.333)), lum = dot(base, vec3(0.3, 0.59, 0.11));',
        // Hugo 23.11.: auf Weiss kein heller Rand mehr (Helles wird nur leicht eingefärbt, nicht aufgehellt);
        // auf Dunklem leuchten Licht und Flares dafür stärker, damit man sie überall sieht
        '    float dk = 1.0 - lum;',
        '    vec3 lit = base * (1.0 + L * 1.3 * dk) + (gc - L) * (0.32 + 0.45 * lum) + gc * 0.24 * dk + vec3(1.0, 0.8, 0.5) * fa * 0.4 * dk;',
        // Andock-Flares sichtbar auch auf Hellem: weissgoldenes Licht, das Helles leicht golden färbt und Dunkles aufhellt
        '    float fdv = clamp(faD, 0.0, 1.2);',
        // Hugo 24.11. (9:01): auf hellen Flächen (Hand, Haut) färbt das Licht mehr und hellt weniger auf – Zeichnung bleibt
        '    lit = mix(lit, lit * vec3(1.0, 0.88, 0.64), fdv * 0.6 * lum) + vec3(1.0, 0.93, 0.8) * fdv * (0.08 + 0.72 * dk * dk + 0.2 * dk);',
        '    float ea = clamp(max(eacc.r, max(eacc.g, eacc.b)), 0.0, 1.0);',
        '    lit = lit * mix(vec3(1.0), eacc / max(ea, 0.001), ea * (0.75 + 0.15 * lum)) + eacc * (0.1 + 0.73 * dk);',   // färbt mehr, hellt weniger auf (nicht weiss)      // Andock-Licht: färbt auch Weiss golden
        // Hugo 24.11.: kein weisser Blitz – der Aufprall zeigt sich im kräftigen bunten Aufleuchten am Rand
        // Hugo 25.11. (16:58): alles verschmilzt – das Licht wird weich aufaddiert (nie hart ins Weiss abgeschnitten, sich
        // kreuzende Lichter gehen ineinander über statt heller Streifen); Abdunkeln/Einfärben bleibt wie es war
        // Hugo 25.11. (18:06): nur die Helligkeit wird weich begrenzt, die Farbe bleibt ganz (vorher wurde auf hellen Stellen auch die
        // Farbe gedämpft – darum zeigten die Texte mit «difference» kaum noch Farbwechsel, wenn die Welle darunter lief)
        '    vec3 dl = lit - base; float lB = dot(base, vec3(0.3, 0.59, 0.11)), dL = dot(dl, vec3(0.3, 0.59, 0.11)), hrL = max(1.0 - lB, 0.02);',
        '    float dLs = dL > 0.0 ? hrL * (1.0 - exp(-dL * 1.15 / hrL)) : dL;',
        '    lit = clamp(base + dLs + (dl - dL) * 1.15, 0.0, 1.0);',
        '    float cov = clamp(max(max(al, L * 6.0), ea * 6.0), 0.0, 1.0) * here;',
        // eine deckende Fläche: das ganze Foto kommt aus der Leinwand (keine halbdurchsichtige Kopie über dem Original →
        // keine dunklen Säume, keine Doppelkanten, kein Rauch, wo sich Wellen kreuzen)
        // Hugo 25.11. (19:10): deckend nur dort, wo der Effekt etwas verändert (Verschiebung ab 0.03 px oder Licht) – sonst ist die
        // Leinwand durchsichtig und man sieht das scharfe Originalfoto. Die Übergänge liegen bei Verschiebungen unter einem halben
        // Pixel, darum gibt es keine Doppelkanten
        '    vec3 dLit = abs(lit - base); float covL = max(smoothstep(0.03, 0.5, length(off)), smoothstep(0.004, 0.03, max(dLit.r, max(dLit.g, dLit.b))));',
        '    cov = mix(cov, here * covL, uCov);',
        '    col = lit * cov; al = cov;',
        '  } else {',
        '    col = col + gc * (1.0 - al * 0.4) + eacc;',
        '    al = max(al, max(max(gc.r, max(gc.g, gc.b)) * 0.55, max(eacc.r, max(eacc.g, eacc.b))));',
        '  }',
        // Computer, Sonne nach 1 s Ruhe (Hugo 24.11.): ohne Foto bleibt nur das Licht der Welle (Regenbogen, Flares)
        '  if (uFade < 0.999) {',
        '    vec3 cR = gc + eacc; float aR = max(max(gc.r, max(gc.g, gc.b)) * 0.55, max(eacc.r, max(eacc.g, eacc.b)));',
        // Hugo 24.11. (15:19): über der weissen Sonne wäre addiertes Licht unsichtbar (Weiss + Licht = Weiss) – die Welle
        // verschwand darum abrupt, sobald das Foto weg war. Hier als Farbe auf Weiss (Prisma), sie klingt weich in der Sonne aus
        '    if (uTint > 0.0) { float mR = max(cR.r, max(cR.g, cR.b)); vec3 tc = mR > 1e-3 ? cR / mR : vec3(1.0); tc = clamp(mix(vec3(dot(tc, vec3(0.333))), tc, 1.1), 0.0, 1.0) * 0.95; float ta = clamp(mR * 0.3, 0.0, 0.22); cR = mix(cR, tc * ta, uTint); aR = mix(aR, ta, uTint); }',
        '    vec3 cD = al > 1e-4 ? col * (alD / al) : vec3(0.0);',   // Hugo 24.11. (15:16): über der Sonne nur das verschobene Foto der Welle zeigen (sonst stand am Rand ein dunkler Rahmen)
        '    col = mix(cR, cD, uFade); al = mix(aR, alD, uFade);',
        '  }',
        '  gl_FragColor = vec4(col, al);',
        '}'].join('\n');
      var VS = 'attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }';
      function sh(t, src) { var x = c.createShader(t); c.shaderSource(x, src); c.compileShader(x); return c.getShaderParameter(x, c.COMPILE_STATUS) ? x : null; }
      var vs = sh(c.VERTEX_SHADER, VS), fs = sh(c.FRAGMENT_SHADER, FS);
      if (!vs || !fs) return null;
      var p = c.createProgram(); c.attachShader(p, vs); c.attachShader(p, fs); c.linkProgram(p);
      if (!c.getProgramParameter(p, c.LINK_STATUS)) return null;
      c.useProgram(p);
      var b = c.createBuffer(); c.bindBuffer(c.ARRAY_BUFFER, b); c.bufferData(c.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), c.STATIC_DRAW);
      var al = c.getAttribLocation(p, 'aPos'); c.enableVertexAttribArray(al); c.vertexAttribPointer(al, 2, c.FLOAT, false, 0, 0);
      var U = {}; ['uRim', 'uSoft', 'uEdgeOff', 'uTint', 'uDA', 'uDF', 'uFade', 'uWL', 'uWE', 'uWF', 'uRes', 'uDpr', 'uP', 'uAge', 'uHue', 'uB', 'uT', 'uEdgeT', 'uSeed', 'uKeep', 'uImp', 'uDesk', 'uImg', 'uHas', 'uRect', 'uCrop', 'uCov', 'uGo', 'uWG', 'uTx', 'uT0', 'uT1', 'uT2', 'uT3', 'uTE', 'uTI', 'uTC', 'uTS', 'uTA'].forEach(function (k) { U[k] = c.getUniformLocation(p, k); });
      c.enable(c.BLEND); c.blendFunc(c.ONE, c.ONE_MINUS_SRC_ALPHA);
      var tex = c.createTexture(); c.bindTexture(c.TEXTURE_2D, tex);
      c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MIN_FILTER, c.LINEAR); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MAG_FILTER, c.LINEAR);
      c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_S, c.CLAMP_TO_EDGE); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_T, c.CLAMP_TO_EDGE);
      c.uniform1i(U.uImg, 0); c.uniform1i(U.uT0, 1); c.uniform1i(U.uT1, 2); c.uniform1i(U.uT2, 3); c.uniform1i(U.uT3, 4); c.uniform1f(U.uTx, 0);
      // Hugo 25.11. (17:19): beim ersten Start von Safari ruckelte der Aufprall (~0.2 s Stillstand, Video 17:18). Safari übersetzt
      // das Effekt-Programm erst beim ersten Zeichnen – jetzt sofort beim Laden (schwarzer Bildschirm), einmal 1 × 1 Pixel
      try { c.viewport(0, 0, 1, 1); c.uniform1f(U.uHas, 0); c.drawArrays(c.TRIANGLE_STRIP, 0, 4); c.readPixels(0, 0, 1, 1, c.RGBA, c.UNSIGNED_BYTE, new Uint8Array(4)); c.clearColor(0, 0, 0, 0); c.clear(c.COLOR_BUFFER_BIT); c.viewport(0, 0, cv.width, cv.height); } catch (er) {}
      var cache = {};   // Bilder für den Effekt (eigene Kopien mit CORS; klappt das nicht, gibt es nur den Regenbogen)
      // Computer: Leinwand über der ganzen Bühne (über den Bildern, unter Titeln und Textspalte)
      function sm01(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
      function deskCanvas() {
        if (cvIn) cvOut();
        if (cv.parentNode !== stage) stage.appendChild(cv);
        cv.style.zIndex = '4';
      }
      var comp = document.createElement('canvas'), cctx = comp.getContext('2d'), compSig = '', compOk = false, compCrop = null, compFull = false;
      function srcOf(img) { return img && (img.currentSrc || img.src); }
      function loadAll() {
        slides.forEach(function (sl) {
          var src = srcOf(sl.img); if (!src || cache[src]) return;
          var e = cache[src] = { im: new Image(), ok: false };
          e.im.crossOrigin = 'anonymous'; e.im.onload = function () {
            // verkleinerte, fertig entpackte Kopie: das Neuzeichnen beim Aufprall, Ziehen und Eintauchen geht so viel schneller.
            // Hugo 25.11. (17:19): erst entpacken lassen (decode, nicht im Haupt-Thread) und in einer ruhigen Lücke kopieren –
            // beim ersten Start musste Safari sonst genau beim Aufprall das ganze Foto entpacken (Stillstand)
            function mk() {
              try { var nw = e.im.naturalWidth, nh = e.im.naturalHeight, k = Math.min(1, (weak ? 1400 : 1800) / Math.max(nw, nh)); var sc0 = document.createElement('canvas'); sc0.width = Math.round(nw * k); sc0.height = Math.round(nh * k); sc0.getContext('2d').drawImage(e.im, 0, 0, sc0.width, sc0.height); e.sm = sc0; } catch (er) {}
              e.ok = true; compSig = '';
              idle(function () { upHi(e); });   // Hugo 25.11. (20:54): danach das Foto in voller Schärfe auf die Grafikkarte (eigene ruhige Lücke)
            }
            var dp = e.im.decode ? e.im.decode() : null;
            if (dp && dp.then) dp.then(function () { idle(mk); }, function () { idle(mk); }); else idle(mk);
          }; e.im.src = src;
        });
      }
      // alle sichtbaren Spalten (object-fit: cover, wie im Browser) in ein Bild zeichnen und als Textur hochladen;
      // neu nur, wenn sich etwas bewegt hat (Aufprall, Hover am Rand)
      // Hugo 25.11. (20:54): «immer scharf» – jedes Foto liegt einmal als eigene Textur auf der Grafikkarte, so scharf wie es der
      // Bildschirm braucht (Bildschirmgrösse × Pixeldichte, höchstens die Originaldatei). Der Shader liest es direkt (uT0–uT3, Lage
      // als Zahlen). Ersetzt die Streifen-Textur (Handy) und das Zusammensetzen pro Bild (Computer, beim Auf- und Zugehen der Spalten
      // wurde dort jedes Bild neu gezeichnet und hochgeladen – das war das Ruckeln von Bild zu Bild)
      var maxTex = 4096, txOn = false, txPend = false, TXE = new Float32Array(16), TXI = new Float32Array(16), TXC = new Float32Array(16), TXS = new Float32Array(16), TXA = new Float32Array(4);
      try { maxTex = c.getParameter(c.MAX_TEXTURE_SIZE) || 4096; } catch (er) {}
      function upHi(e) {
        if (e.tx || e.txFail || !e.ok) return;
        try {
          var nw = e.im.naturalWidth, nh = e.im.naturalHeight; if (!nw || !nh) return;
          var dm = Math.min(weak ? 2 : 3, window.devicePixelRatio || 1), sW = Math.max(screen.width || 0, W) * dm * 1.15, sH = Math.max(screen.height || 0, H) * dm * 1.15;
          var cap = Math.min(maxTex, desk ? 4096 : (weak ? 1600 : 2560));
          var k = Math.min(1, Math.max(sW / nw, sH / nh), cap / Math.max(nw, nh)), src = e.im;
          if (k < 0.999) { src = document.createElement('canvas'); src.width = Math.max(1, Math.round(nw * k)); src.height = Math.max(1, Math.round(nh * k)); var x2 = src.getContext('2d'); x2.imageSmoothingQuality = 'high'; x2.drawImage(e.im, 0, 0, src.width, src.height); }
          var t = c.createTexture(); c.bindTexture(c.TEXTURE_2D, t);
          c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MIN_FILTER, c.LINEAR); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MAG_FILTER, c.LINEAR);
          c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_S, c.CLAMP_TO_EDGE); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_T, c.CLAMP_TO_EDGE);
          c.texImage2D(c.TEXTURE_2D, 0, c.RGB, c.RGB, c.UNSIGNED_BYTE, src);
          if (src !== e.im) { src.width = src.height = 0; }   // Kopie gleich wieder freigeben (Speicher am iPhone)
          e.tx = t; c.bindTexture(c.TEXTURE_2D, tex);
        } catch (er) { e.txFail = true; try { c.bindTexture(c.TEXTURE_2D, tex); } catch (er2) {} }
      }
      function txOk() {
        if (introOn || lightMode || infoSlide || root.classList.contains('hp-info-anim')) return false;
        return true;
      }
      function txSet(sr) {
        var list = [];
        for (var j = 0; j < slides.length; j++) {
          var sl = slides[j]; if (!desk && !sl.vis) continue;
          var e = cache[srcOf(sl.img)]; if (!e || !e.tx) { if (!txPend) { txPend = true; idle(function () { txPend = false; loadAll(); slides.forEach(function (q) { var eq = cache[srcOf(q.img)]; if (eq) upHi(eq); }); }); } return false; }
          list.push({ sl: sl, e: e, z: parseFloat(sl.el.style.zIndex) || 0, i: j });
        }
        if (!list.length || list.length > 4) return false;
        list.sort(function (a, b) { return a.z - b.z || a.i - b.i; });
        TXE.fill(0); TXS.fill(-9); TXA.fill(0);
        for (var k = 0; k < list.length; k++) {
          var q = list[k], sl2 = q.sl, im = sl2.img, er = sl2.el.getBoundingClientRect(), ir = im.getBoundingClientRect();
          var nw = im.naturalWidth || q.e.im.naturalWidth || 1, nh = im.naturalHeight || q.e.im.naturalHeight || 1, ra = ir.width / Math.max(1, ir.height), ia = nw / nh;
          var cw = 1, ch = 1; if (ia > ra) cw = ra / ia; else ch = ia / ra;   // object-fit: cover (beim Computer-Foto von Hand: Seitenverhältnis gleich, alles)
          if (!sl2.objP0 || sl2.objPi !== im) { sl2.objP0 = objPos(im); sl2.objPi = im; }
          var o = k * 4;
          TXE[o] = er.left - sr.left; TXE[o + 1] = er.top - sr.top; TXE[o + 2] = er.width; TXE[o + 3] = er.height;
          TXI[o] = ir.left - sr.left; TXI[o + 1] = ir.top - sr.top; TXI[o + 2] = Math.max(1, ir.width); TXI[o + 3] = Math.max(1, ir.height);
          TXC[o] = (1 - cw) * sl2.objP0[0]; TXC[o + 1] = (1 - ch) * sl2.objP0[1]; TXC[o + 2] = cw; TXC[o + 3] = ch;
          if (desk && sl2.side && sl2.side.offsetWidth > 0) { var sd = sl2.side.getBoundingClientRect(); TXS[o] = sd.left - sr.left; TXS[o + 1] = sd.top - sr.top; TXS[o + 2] = sd.width; TXS[o + 3] = sd.height; TXA[k] = sl2.sideA == null ? 1 : sl2.sideA; }
          c.activeTexture(c.TEXTURE1 + k); c.bindTexture(c.TEXTURE_2D, q.e.tx);
        }
        for (k = list.length; k < 4; k++) { c.activeTexture(c.TEXTURE1 + k); c.bindTexture(c.TEXTURE_2D, list[0].e.tx); }
        c.activeTexture(c.TEXTURE0);
        c.uniform4fv(U.uTE, TXE); c.uniform4fv(U.uTI, TXI); c.uniform4fv(U.uTC, TXC); c.uniform4fv(U.uTS, TXS); c.uniform1fv(U.uTA, TXA);
        compFull = true; compCrop = null;
        return true;
      }
      function compTex(sr) {
        txOn = txOk() && txSet(sr);
        if (txOn) return true;
        // Hugo 24.11. (15:37): beim Eintauchen folgt die Textur dem gezoomten Bild (eingefroren zeigte die Welle das Bild in
        // alter Grösse über dem gezoomten – doppeltes Bild).
        // Audit 24.11. (Akku): dafür wird das Bild nicht mehr in jedem Bild neu gezeichnet und hochgeladen, sondern einmal
        // ungezoomt (in höherer Auflösung, gleich scharf) – den Zoom übernimmt die Grafikkarte über den Ausschnitt (uCrop)
        if (!cctx) return false;
        loadAll();
        var dvS = null, nVis = 0;
        if (!desk) slides.forEach(function (sl) { if (sl.vis) { nVis++; if (sl.dv && sl.dv.k > 1.0001 && sl.media) dvS = sl; } });
        if (nVis !== 1) dvS = null;   // nur wenn das eintauchende Bild allein zu sehen ist (sonst wie bisher)
        var dk = 1, qx = 0, qy = 0;
        if (dvS) {
          var mr = dvS.media.getBoundingClientRect();
          dk = dvS.dv.k; qx = mr.left + mr.width / 2 + dk * dvS.dv.px; qy = mr.top + mr.height / 2 + dk * dvS.dv.py;   // Zoom-Mittelpunkt
          compCrop = [(qx - sr.left) / sr.width * (1 - 1 / dk), (qy - sr.top) / sr.height * (1 - 1 / dk), 1 / dk, 1 / dk];
        } else compCrop = null;
        var sc = desk ? 1 : Math.min(weak ? 1.5 : 2, window.devicePixelRatio || 1) * (dvS ? CONFIG.diveZoom : 1), cw2 = Math.round(sr.width * sc), ch2 = Math.round(sr.height * sc);
        var parts = [], sig = cw2 + 'x' + ch2;
        slides.forEach(function (sl) {
          if (!desk && !sl.vis) return;
          var e = cache[srcOf(sl.img)]; if (!e || !e.ok) { sig += '|-'; return; }
          var ir = sl.img.getBoundingClientRect(), er = sl.el.getBoundingClientRect(), z = parseFloat(sl.el.style.zIndex) || 0;
          if (sl === dvS) ir = { left: qx + (ir.left - qx) / dk, top: qy + (ir.top - qy) / dk, width: ir.width / dk, height: ir.height / dk };   // wie ohne Zoom
          var sdr = desk && sl.side && sl.side.offsetWidth > 0 ? sl.side.getBoundingClientRect() : null;   // Textspalte (Computer): weiss
          parts.push({ e: e, im: sl.img, ir: ir, er: er, z: z, i: parts.length, sd: sdr, sa: sl.sideA == null ? 1 : sl.sideA });
          sig += '|' + [ir.left, ir.top, ir.width, ir.height, er.left, er.top, er.width, er.height].map(function (v) { return Math.round(v); }).join(',') + ',' + z + (sdr ? ',' + Math.round(sdr.left) + ',' + Math.round(sdr.width) + ',' + (sl.sideA == null ? 1 : sl.sideA).toFixed(2) : '');
        });
        // Hugo 24.11.: in der Reihenfolge wie auf dem Bildschirm übereinanderlegen (hintere Karten zuerst) – sonst lag beim
        // Andocken die Nachbarkarte, die hinter dem Bild ein paar Pixel übersteht, im Effekt obenauf (Linie oben/unten)
        parts.sort(function (a, b) { return a.z - b.z || a.i - b.i; });
        if (sig === compSig) return compOk;
        compSig = sig; compFull = sig.indexOf('|-') < 0;
        if (comp.width !== cw2 || comp.height !== ch2) { comp.width = cw2; comp.height = ch2; }
        cctx.fillStyle = '#000'; cctx.fillRect(0, 0, cw2, ch2);
        parts.forEach(function (p) {
          var useSm = !!p.e.sm, srcI = useSm ? p.e.sm : p.e.im, iw = useSm ? p.e.sm.width : (p.e.im.naturalWidth || 1), ih = useSm ? p.e.sm.height : (p.e.im.naturalHeight || 1), ra = p.ir.width / Math.max(1, p.ir.height), ia = iw / ih;
          var sw = iw, sh = ih; if (ia > ra) sw = ih * ra; else sh = iw / ra;
          var op = objPos(p.im), sx = (iw - sw) * op[0], sy = (ih - sh) * op[1];
          cctx.save();
          // Hugo 24.11.: Ausschnitt auf ganze Pixel runden und an den Bühnenrändern bis zur Kante ziehen – sonst bleibt am
          // unteren Rand eine halbe schwarze Zeile, die der Effekt als dunkle farbige Linie zeigt
          var cx0 = (p.er.left - sr.left) * sc, cy0 = (p.er.top - sr.top) * sc, cx1 = cx0 + p.er.width * sc, cy1 = cy0 + p.er.height * sc;
          cx0 = cx0 < 2 ? 0 : Math.floor(cx0); cy0 = cy0 < 2 ? 0 : Math.floor(cy0);
          cx1 = cx1 > cw2 - 2 ? cw2 : Math.ceil(cx1); cy1 = cy1 > ch2 - 2 ? ch2 : Math.ceil(cy1);
          cctx.beginPath(); cctx.rect(cx0, cy0, cx1 - cx0, cy1 - cy0); cctx.clip();
          cctx.drawImage(srcI, sx, sy, sw, sh, (p.ir.left - sr.left) * sc, (p.ir.top - sr.top) * sc, p.ir.width * sc, p.ir.height * sc);
          // Hugo 24.11. (13:11): die Textspalte ist durchsichtig über der weissen Wand – für die Welle ist sie darum weiss
          // (sonst zieht die Welle Schwarz in die Spalte)
          if (p.sd) { cctx.globalAlpha = p.sa; cctx.fillStyle = '#fff'; cctx.fillRect((p.sd.left - sr.left) * sc, (p.sd.top - sr.top) * sc, p.sd.width * sc, p.sd.height * sc); }
          cctx.restore();
        });
        try { c.bindTexture(c.TEXTURE_2D, tex); c.texImage2D(c.TEXTURE_2D, 0, c.RGB, c.RGB, c.UNSIGNED_BYTE, comp); compOk = parts.length > 0; }
        catch (er) { compOk = false; }
        return compOk;
      }
      function objPos(im) {
        var op = (getComputedStyle(im).objectPosition || '50% 50%').split(' ');
        function pc(v) { return /%$/.test(v) ? parseFloat(v) / 100 : 0.5; }
        return [pc(op[0]), pc(op[1] || op[0])];
      }
      var waves = [], buf = new Float32Array(NP * 4), ages = new Float32Array(NW), wgs = new Float32Array(NW), wgOne = new Float32Array(NW).fill(1), hues = new Float32Array(NW), bnd = new Float32Array(NW * 4), raf = 0, regAt = -1, LIFE = 6.5, edgeT0 = 0, edgeSeed = 0, killT0 = 0, slowEma = 16, lastT = 0, covV = 0, covT = 0;
      // Schärfe nach Gerät: schwache Handys (wenig Kerne/Speicher) starten gröber; jedes Gerät regelt bei Ruckeln selbst nach
      var weak = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 3);
      // Hugo 25.11. (20:54): «immer scharf, nur drosseln, wenn es nicht geht» – die Welle rechnet in voller Pixeldichte des Geräts
      // (höchstens 3, schwache Geräte 2). Werden die Bilder zu langsam, geht sie stufenweise herunter; läuft es wieder mehrere Sekunden
      // flüssig, wieder hinauf. Die gefundene Stufe merkt sich der Browser (nächster Besuch startet dort, kein Ruckeln beim Aufprall)
      var dprMax = Math.min(weak ? 2 : 3, window.devicePixelRatio || 1), qKey = 'hp-q-' + (desk ? 'd' : 'm') + dprMax;
      var dprCap = desk ? dprMax : Math.min(2, dprMax), dprBad = 99, dprDown = 0, goodN = 0;
      try { var qS = parseFloat(localStorage.getItem(qKey)); if (qS >= 0.6 && qS <= dprMax) { dprCap = qS; dprBad = qS + 0.5; } } catch (er) {}
      function qSave() { try { localStorage.setItem(qKey, String(dprCap)); } catch (er) {} }
      function add(x, y) {
        var wv = waves[waves.length - 1]; if (!wv) return;
        // Hugo 23.11.: die Welle folgt dem Finger ohne Verzögerung — der letzte Punkt ("Spitze") sitzt immer genau unter
        // dem Finger und wird erst festgelegt, wenn der Finger ein Stück weiter ist; ist die Bahn voll, wird sie
        // ausgedünnt statt angehalten, so geht auch ein langer Zug bis zum Schluss mit
        // Hugo 24.11.: Punkte relativ zur Leinwand (zum Bild) – beim Wischen fährt die Welle mit ihrem Bild mit
        var cr = refRect(); x -= cr.left; y -= cr.top;
        var now = performance.now(), pts = wv.pts, last = pts[pts.length - 1];
        // Hugo 25.11. (08:10): Tempo des Fingers (geglättet) → Stärke dieses Punkts (m): langsam ruhig, schnell kräftig
        if (wv.px != null) {
          var dtm = Math.max(4, now - wv.pt), v = Math.hypot(x - wv.px, y - wv.py) / dtm;
          wv.v = wv.v == null ? v : wv.v * 0.65 + v * 0.35;
          wv.dist = (wv.dist || 0) + Math.hypot(x - wv.px, y - wv.py);
        }
        wv.px = x; wv.py = y; wv.pt = now;
        var sk = desk ? Math.pow(sm01(CONFIG.waveSlowDesk, CONFIG.waveFastDesk, wv.v || 0), CONFIG.waveCurveDesk) : Math.pow(sm01(CONFIG.waveSlow, CONFIG.waveFast, wv.v || 0), CONFIG.waveCurve);
        // Hugo 25.11. (17:13): kurze Wischer am Handy (oft benutzt, schnell, aber kurz) machen nur eine kleine Welle –
        // die Kraft aus dem Tempo wächst erst mit dem Weg des Fingers (ab waveShort bis waveLong px voll)
        if (!desk) sk *= CONFIG.waveShortK + (1 - CONFIG.waveShortK) * sm01(CONFIG.waveShort, CONFIG.waveLong, wv.dist || 0);
        var mStr = CONFIG.waveCalm + (1 - CONFIG.waveCalm) * sk;
        if (desk) mStr += CONFIG.waveBoostDesk * sm01(CONFIG.waveFastDesk, CONFIG.waveTopDesk, wv.v || 0);   // ganz schnell: über die Grenze
        if (wv.v != null && !wv.vk) { wv.vk = true; if (pts[0]) pts[0].m = mStr; }   // der erste Punkt kannte das Tempo noch nicht
        if (!last) { pts.push({ x: x, y: y, t: now, m: mStr }); wv.sp = 14; }
        else {
          var fixed = last.tip ? pts[pts.length - 2] : last;
          if (last.tip && Math.hypot(fixed.x - x, fixed.y - y) < wv.sp) { last.x = x; last.y = y; last.t = now; last.m = mStr; }
          else {
            if (last.tip) last.tip = false;
            if (pts.length >= PW) {
              var keep = [pts[0]];
              for (var m = 1; m < pts.length - 1; m++) if (m % 2 === 0) keep.push(pts[m]);
              keep.push(pts[pts.length - 1]); wv.pts = pts = keep; wv.sp *= 2;
            }
            pts.push({ x: x, y: y, t: now, tip: true, m: mStr });
          }
        }
        if (!raf) req();
      }
      function lastAct(wv) { var la = wv.t0, lp = wv.pts[wv.pts.length - 1]; if (lp && lp.t > la) la = lp.t; return la; }
      function draw(now) {
        raf = 0; tickNow = now;
        // Hugo 25.11. (19:10): eine Welle lebt ab ihrer letzten Bewegung (vorher ab ihrem Start – eine lange Mauswelle verschwand
        // nach 6.5 s auf einen Schlag, die Ecken sprangen zurück); jede klingt mit eigenem Wert weich aus (uWG)
        waves = waves.filter(function (wv) { return now - lastAct(wv) < LIFE * 1000 && !(wv.fade0 && now - wv.fade0 > WFADE + 20); });
        // Hugo 24.11.: der Effekt steht fest auf dem Bildschirm, die Bilder wischen darunter durch. Gerechnet wird über die
        // ganze Bühne mit allen sichtbaren Bildern als Textur; Computer: Leinwand liegt über der Bühne. Handy: die
        // Leinwand ist unsichtbar, jedes sichtbare Bild zeigt seinen Ausschnitt davon (unter seinem Titel)
        // Hugo 24.11. (15:20): während die Sonne einblendet, liegt die Welle normal (mit Foto) UNTER ihr und blendet mit dem
        // Bild aus – keine Foto-Fetzen auf dem Weiss mehr. Danach liegt sie darüber und erscheint weich als Prisma-Licht.
        var lf = lightFade(now);
        if (lightMode) { if (cvIn) cvOut(); if (cv.parentNode !== root) root.appendChild(cv); cv.style.zIndex = shimOn ? '9' : '2'; }   // Hugo 24.11. (15:41): die Tippwelle bleibt immer unter der Sonne – sie verschwindet weich mit dem Einblenden und ist danach nicht mehr zu sehen
        else if (desk) deskCanvas();   // Handy: showFx setzt die Leinwand direkt ins sichtbare Bild (oder kopiert, wenn zwei sichtbar sind)
        var sr = refRect();
        var w = Math.max(1, Math.round(sr.width)), h = Math.max(1, Math.round(sr.height));
        // volle Bildschirmschärfe (Hugo 23.11.: vorher halbe Auflösung → das verschobene Foto wirkte unscharf und durchsichtig)
        // passt sich an: wird ein Gerät zu langsam, rechnet die Welle etwas gröber (flüssig geht vor)
        if (lastT && now - lastT < 200) {
          slowEma = slowEma * 0.85 + (now - lastT) * 0.15;
          if (slowEma > 21 && dprCap > 0.6) { dprBad = dprCap; dprCap = Math.max(0.6, dprCap - (dprCap > 1.25 ? 0.5 : 0.2)); slowEma = 16; dprDown = now; goodN = 0; qSave(); }
          else if (slowEma < 17.5 && dprCap < dprMax) {
            // erst nach 1.5 s flüssig und frühestens 5 s nach dem letzten Herunterschalten; die Stufe, die ruckelte, erst nach 30 s wieder versuchen
            if (++goodN > 90 && now - dprDown > 5000 && (dprCap + 0.5 < dprBad || now - dprDown > 30000)) { dprCap = Math.min(dprMax, dprCap + 0.5); goodN = 0; if (dprCap >= dprBad) dprBad = 99; qSave(); }
          } else goodN = 0;
        }
        lastT = now;
        var dpr = Math.min(dprMax, dprCap), pw = Math.round(w * dpr), ph = Math.round(h * dpr);
        if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; c.viewport(0, 0, pw, ph); }
        var ord = waves.filter(function (q) { return !(q.sp2 < 0); }).concat(waves.filter(function (q) { return q.sp2 < 0; }));
        for (var k = 0; k < NW; k++) {
          var wv = ord[k];
          ages[k] = wv ? (now - wv.t0) / 1000 : -1;
          if (wv) { var laW = lastAct(wv), enW = laW + (wv.sp2 < 0 ? 5600 : 5000); wgs[k] = (1 - sm01(enW - 1400, enW, now)) * (wv.fade0 ? 1 - sm01(wv.fade0, wv.fade0 + WFADE, now) : 1); } else wgs[k] = 0;
          // Farbe je nach Auslösung (Hugo 23.11.): Tippen → Ort, Ziehen → Richtung und Länge der Bahn
          if (wv && wv.pts.length) {
            var a0 = wv.pts[0], a1 = wv.pts[wv.pts.length - 1], dl = Math.hypot(a1.x - a0.x, a1.y - a0.y);
            hues[k] = dl < 20 ? (a0.x / Math.max(1, sr.width) * 0.6 + a0.y / Math.max(1, sr.height) * 0.4)
                              : (Math.atan2(a1.y - a0.y, a1.x - a0.x) / 6.2832 + dl / Math.max(1, sr.height) * 0.5);
          }
          // Umkreis der Fingerbahn (für das Überspringen ferner Pixel)
          var cx = 0, cy = 0, rr = 0, np = wv ? wv.pts.length : 0;
          for (var j0 = 0; j0 < np; j0++) { cx += wv.pts[j0].x; cy += wv.pts[j0].y; }
          if (np) { cx /= np; cy /= np; for (j0 = 0; j0 < np; j0++) rr = Math.max(rr, Math.hypot(wv.pts[j0].x - cx, wv.pts[j0].y - cy)); }
          bnd[k * 4] = cx; bnd[k * 4 + 1] = cy; bnd[k * 4 + 2] = rr; bnd[k * 4 + 3] = (wv && wv.sp2) || 1;   // < 0: Andock-Welle (Reichweite)   // Tempo der Welle (Andocken: schneller)
          for (var j = 0; j < PW; j++) {
            var i = k * PW + j, q = wv && wv.pts[j];
            if (q) { buf[i * 4] = q.x; buf[i * 4 + 1] = q.y; buf[i * 4 + 2] = (now - q.t) / 1000; buf[i * 4 + 3] = q.m || 1; }
            else buf[i * 4 + 3] = 0;
          }
        }
        // Textur = alle sichtbaren Bilder zusammen, wie sie gerade auf dem Bildschirm stehen
        if ((!lightMode || lf > 0.001) && compTex(sr)) {   // Licht-Modus: die Welle zeigt nur Licht, keine Bildtextur nötig (weniger Rechenarbeit)
          c.uniform1f(U.uTx, txOn ? 1 : 0);
          c.uniform4f(U.uRect, 0, 0, w, h); if (compCrop) c.uniform4f(U.uCrop, compCrop[0], compCrop[1], compCrop[2], compCrop[3]); else c.uniform4f(U.uCrop, 0, 0, 1, 1); c.uniform1f(U.uHas, 1);
        } else c.uniform1f(U.uHas, 0);
        c.uniform2f(U.uRes, w, h); c.uniform1f(U.uDpr, pw / w); c.uniform4fv(U.uP, buf); c.uniform1fv(U.uAge, ages); c.uniform1fv(U.uHue, hues); c.uniform4fv(U.uB, bnd); c.uniform1f(U.uT, (now / 1000) % 1000);
        var et = edgeT0 ? (now - edgeT0) / 1000 : -1; if (et > 7.2) { edgeT0 = 0; et = -1; } c.uniform1f(U.uEdgeT, et); c.uniform1f(U.uSeed, edgeSeed);
        // nach dem ersten Wischen klingt der ganze Andock-Effekt in 1.5–3 s aus (auch was nicht überstrichen wurde)
        c.uniform1f(U.uImp, desk ? 0.8 : 1); c.uniform1f(U.uSoft, dockSoft); c.uniform1f(U.uDesk, desk ? 1 : 0); c.uniform1f(U.uFade, lightMode && lf <= 0.001 ? 0 : 1); c.uniform1f(U.uTint, lightMode && shimOn ? 1 : 0); c.uniform1f(U.uDA, dockAmt); c.uniform1f(U.uDF, dockFl); c.uniform1f(U.uWL, CONFIG.waveLight); c.uniform1f(U.uWE, CONFIG.waveEdge); c.uniform1f(U.uWF, CONFIG.waveFlares); c.uniform1f(U.uEdgeOff, edgeOffV(now)); c.uniform1f(U.uRim, dockRim);   // Hugo 24.11. (15:25): Prisma zart und klingt bald aus
        c.uniform1f(U.uKeep, killT0 ? 1 - sm01(1.5, 3.0, (now - killT0) / 1000) : 1); if (!edgeT0) killT0 = 0;
        // Hugo 25.11. (16:58): eine Fläche – solange der Effekt läuft, deckt die Leinwand das Foto ganz (uCov). Zum Schluss
        // klingt erst alles gemeinsam aus (uGo → das Bild steht still und klar), dann blendet die Fläche unmerklich zum Foto
        var endT = 0;
        waves.forEach(function (wv) { endT = Math.max(endT, lastAct(wv) + (wv.sp2 < 0 ? 5600 : 5000)); });
        if (edgeT0) endT = Math.max(endT, edgeT0 + 6000);
        // Hugo 26.11.: ohne Fingerwelle – ist das Andocken weggewischt (nach 3 s unsichtbar), endet der Effekt gleich danach auf dem
        // üblichen Weg (Fläche blendet zum Foto). Sonst läge die Leinwand noch bis zu 6 s leer über dem Bild und verdeckte die Tiefe
        if (!CONFIG.fingerWave && !desk && !lightMode && killT0) endT = Math.min(endT, killT0 + 3000);
        var cdt = covT ? Math.min(100, now - covT) : 16; covT = now;
        if (lightMode || !compFull || !(waves.length || edgeT0)) covV = 0;
        else covV = now < endT ? Math.min(1, covV + cdt / 120) : Math.max(0, covV - cdt / 350);
        c.uniform1f(U.uCov, covV); c.uniform1f(U.uGo, lightMode || !edgeT0 ? 1 : 1 - sm01(edgeT0 + 4600, edgeT0 + 6000, now)); c.uniform1fv(U.uWG, lightMode ? wgOne : wgs);
        if (!lightMode && endT && now >= endT && covV <= 0) { waves = []; edgeT0 = 0; killT0 = 0; }
        c.clearColor(0, 0, 0, 0); c.clear(c.COLOR_BUFFER_BIT);
        var on = waves.length || edgeT0;
        if (pendingOff && !on) lightOff();
        if (on) c.drawArrays(c.TRIANGLE_STRIP, 0, 4);
        if (!desk) showFx(sr, pw, ph, on && !lightMode);
        if (on) req();
        tickNow = -1;
      }
      // Handy: jedes sichtbare Bild zeigt seinen Ausschnitt der Bildschirm-Leinwand (gegen seine Verschiebung gehalten,
      // wie der Titel) – so steht der Effekt still, auch während man wischt
      // Hugo 25.11. (18:24, Umbau 2): ist nur ein Bild sichtbar (fast immer), liegt die Effekt-Leinwand direkt darin – keine Kopie
      // mehr pro Bild. Nur beim Wischen (zwei Bilder sichtbar) wird wie bisher in beide kopiert
      var cvIn = null;
      function cvOut() {
        if (cvIn) { cvIn = null; cv.style.width = '100%'; cv.style.height = '100%'; cv.style.transform = ''; cv.style.left = ''; cv.style.top = ''; cv.style.inset = '0'; }
        if (cv.parentNode && !lightMode && !desk) cv.parentNode.removeChild(cv);
      }
      function showFx(sr, pw, ph, on) {
        var visS = on ? slides.filter(function (sl) { return sl.vis; }) : [], direct = visS.length === 1 ? visS[0] : null;
        if (direct) {
          if (cv.parentNode !== direct.el) direct.el.insertBefore(cv, direct.media ? direct.media.nextSibling : direct.el.firstChild);
          cvIn = direct;
          var er0 = direct.el.getBoundingClientRect();
          cv.style.inset = 'auto'; cv.style.left = '0'; cv.style.top = '0';
          cv.style.width = sr.width + 'px'; cv.style.height = sr.height + 'px';
          cv.style.transform = 'translate3d(' + (sr.left - er0.left).toFixed(2) + 'px,' + (sr.top - er0.top).toFixed(2) + 'px,0)';
        } else if (cvIn || (cv.parentNode && cv.parentNode !== root && cv.parentNode !== stage)) cvOut();
        slides.forEach(function (sl) {
          var vis = on && sl.vis && sl !== direct;
          if (!sl.fx) {
            if (!vis) return;
            var f = document.createElement('canvas'); f.className = 'hp-fx'; f.setAttribute('aria-hidden', 'true');
            f.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;';
            if (sl.media && sl.media.nextSibling) sl.el.insertBefore(f, sl.media.nextSibling); else sl.el.appendChild(f);
            sl.fx = f; sl.fxc = f.getContext('2d');
          }
          var f2 = sl.fx;
          if (!vis) { if (f2.style.display !== 'none') { f2.style.display = 'none'; } return; }
          f2.style.display = '';
          var er = sl.el.getBoundingClientRect();
          f2.style.width = sr.width + 'px'; f2.style.height = sr.height + 'px';
          f2.style.transform = 'translate3d(' + (sr.left - er.left).toFixed(2) + 'px,' + (sr.top - er.top).toFixed(2) + 'px,0)';
          if (f2.width !== pw || f2.height !== ph) { f2.width = pw; f2.height = ph; }
          sl.fxc.clearRect(0, 0, pw, ph);
          sl.fxc.drawImage(cv, 0, 0);
        });
      }
      function refRect() { return desk ? cv.getBoundingClientRect() : stage.getBoundingClientRect(); }
      function ok() { return !desk && !root.classList.contains('is-info'); }
      // Hugo 25.11. (20:57, Video): auf dem Handy und am Computer sprang das Bild zurück, sobald eine neue Welle begann. Ursache: lief
      // noch die Andock-Welle (Laden, Schliessen), belegte sie einen der 4 Plätze, und jede neue Welle warf die älteste Fingerwelle
      // ohne Ausblenden hinaus – auch wenn diese noch das halbe Bild verzog. Jetzt: 6 Plätze, einer bleibt immer frei. Sind 5 belegt,
      // blendet die am wenigsten sichtbare Welle weich aus (WFADE). Hart entfernt wird nur, wenn sehr schnell hintereinander mehr Wellen
      // kommen, als Plätze da sind – dann die schwächste, meist die schon ausblendende
      var WFADE = 600;
      function wVis(w, now) {
        var la = lastAct(w), en = la + 5000, v = (1 - sm01(en - 1400, en, now)) * Math.exp(-0.45 * Math.max(0, now - la) / 1000);
        return w.fade0 ? v * (1 - sm01(w.fade0, w.fade0 + WFADE, now)) : v;
      }
      function weakest(now, skip, fresh) {
        var iMin = -1, vMin = 9;
        for (var q = 0; q < waves.length; q++) {
          var w = waves[q]; if (w.sp2 < 0 || w === skip || (fresh && w.fade0)) continue;
          var v = wVis(w, now); if (v < vMin) { vMin = v; iMin = q; }
        }
        return iMin;
      }
      function pushWave(wv) {
        var now = performance.now();
        waves.push(wv);
        while (waves.length > NW) { var iD = weakest(now, wv, false); waves.splice(iD < 0 ? 0 : iD, 1); }
        if (waves.length >= NW - 1) { var iF = weakest(now, wv, true); if (iF >= 0) waves[iF].fade0 = now; }   // ein Platz bleibt frei
      }
      // Computer (Hugo 24.11.): die Maus zieht immer eine Welle wie der Finger am Handy und wischt den Andock-Effekt weg
      var mWave = 0, mAcc = 0, mLast = 0;
      var lmx = -1, lmy = -1;
      stage.addEventListener('mousemove', function (e) {
        // nur echte Mausbewegung (der Browser meldet auch «Bewegung», wenn sich unter der ruhenden Maus etwas verschiebt)
        if (lmx < 0) { lmx = e.clientX; lmy = e.clientY; return; }
        var mdd = Math.hypot(e.clientX - lmx, e.clientY - lmy);
        if (mdd < 3) return;
        lmx = e.clientX; lmy = e.clientY;
        // Hugo 24.11.: die Maus zieht am Computer immer eine Welle wie der Finger am Handy (Text liegt darüber, bleibt ruhig)
        if (!desk || busy() || root.classList.contains('is-info') || dsunOn) return;   // bei der Sonne keine neuen Wellen (die laufende läuft zu Ende)
        var now = performance.now(), wv = waves[waves.length - 1];
        // Hugo 25.11. (19:10): ganz kleine Mausbewegungen lösen keine Welle aus – eine neue Welle beginnt erst, wenn die Maus
        // in einem Zug mindestens CONFIG.mouseMin px zurückgelegt hat (Pause über 350 ms = neuer Zug)
        if (now - mLast > 350) mAcc = 0; mLast = now; mAcc += mdd;
        var mNew = !mWave || !wv || wv.sp2 < 0 || now - mWave > 350;
        if (mNew && mAcc < CONFIG.mouseMin) return;
        if (mNew) { noEdge = false; if (pendingOff) lightOff(); pushWave({ t0: now, pts: [] }); if (edgeT0 && !killT0) killT0 = now; }
        mWave = now; add(e.clientX, e.clientY);
      });
      // Andocken nach dem Laden (Hugo 23.11.): Licht mit grossen Flares läuft den Rand entlang (keine Welle aus der Mitte)
      var dockAmt = 1, dockFl = 1, dockRim = 1, dockSoft = 0;
      function dock(amt, fl, clr, rim, soft) {
        dockAmt = amt == null ? 1 : amt; dockFl = fl == null ? dockAmt : fl; dockRim = rim == null ? 1 : rim; dockSoft = soft ? 1 : 0; killT0 = 0;
        // Hugo 24.11. (14:35): beim Schliessen die alten Wellen (Tippen, Sonnenwelle) weg – sie lagen unter dem Licht und
        // wischten das Leuchten des Rands noch bis zu 6.5 s weg (darum kam es verzögert, wenn man früh schloss)
        if (fl === 0 || clr) waves = [];
        var cs = slides[current()]; if (!cs) return;
        if (desk) deskCanvas();
        compSig = '';
        edgeT0 = performance.now(); edgeSeed = Math.floor(Math.random() * 97);
        // Hugo 23.11. (wie die Fingerwelle im Video): das Andocken löst echte Wellen aus, die rundherum am Rand beginnen
        // und nach innen durchs Bild laufen – mit Prisma-Regenbogen, Verzerrung und Solar Flares, die darauf surfen.
        // Eine Welle; die Bahn läuft einmal um den Rand, unregelmässig (organisch).
        var r = stage.getBoundingClientRect();
        function ring(delay, inset, reach) {
          var now = performance.now() + delay, N = PW - 1, pts = [];
          // Hugo 23.11.: keine viereckige Form – die Bahn ist eine weich gerundete, unregelmässige Form (Superellipse
          // mit Rauschen), die sich nur an den Seiten an den Rand schmiegt und die Ecken weit abrundet
          var off = Math.random() * 6.2832, w2 = r.width, h2 = r.height, ph1 = Math.random() * 6.28, ph2 = Math.random() * 6.28;
          for (var i = 0; i < N; i++) {
            var th = off + 6.2832 * i / N, c = Math.cos(th), sn = Math.sin(th), n = 2.6;
            var ex = Math.sign(c) * Math.pow(Math.abs(c), 2 / n), ey = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
            var k = 1 - 0.03 * (1 + Math.sin(th * 3 + ph1)) - 0.02 * (1 + Math.sin(th * 5 + ph2)) - Math.pow(Math.random(), 2) * 0.03;
            var x = w2 / 2 + ex * (w2 / 2 + inset) * k, y = h2 / 2 + ey * (h2 / 2 + inset) * k;
            pts.push({ x: x, y: y, t: now - Math.random() * 220, m: 0.15 + 1.1 * Math.pow(Math.random(), 1.6) });   // nicht so tief, dass sich die Seiten in der Mitte treffen
          }
          pts.push({ x: pts[0].x, y: pts[0].y, t: pts[0].t, m: pts[0].m });   // Bahn schliessen
          pushWave({ t0: now, pts: pts, sp2: -reach });
        }
        if (dockFl > 0) ring(0, 6, 0.2);   // Hugo 23.11.: nur eine Explosion nach innen
        if (!raf) req();
      }
      // Hugo 24.11.: Reihenfolge im Takt – der Effekt läuft immer nach step() (siehe kick). Hat er sich in diesem Takt
      // schon angemeldet (vor der Bühne) oder ausserhalb eines Takts (Fingerbewegung), meldet er sich hinter ihr neu an;
      // eine Anmeldung aus einem früheren Takt läuft ohnehin nach step()
      function req() { raf = requestAnimationFrame(draw); regAt = tickNow; }
      cv.order = function () {
        if (!raf || (tickNow >= 0 && regAt !== tickNow)) return;
        cancelAnimationFrame(raf); req();
      };
      cv.dock = dock;
      var lightMode = false, lightT0 = 0, shimOn = false;
      // Hugo 24.11. (15:48): nach dem Blitz beim Öffnen derselbe Schimmer wie nach dem close (Andocken mit Flares, schwacher
      // Rand), hier über der Sonne als Farbe auf Weiss; die Tippwelle selbst bleibt darunter (kein Ring)
      // Hugo 24.11. (15:54): statt den Rand aufleuchten zu lassen, läuft der Schimmer als Bewegung von der Lichtquelle
      // (Tippstelle bzw. Maus) bis an den Rand, wie eine Fingerwelle mit Flares – ohne Leuchten am Rand
      // Hugo 24.11. (16:00): wie die Welle eines Fingers – eine kurze, leicht gewundene Bahn (organische Form statt Kreis),
      // Punkt für Punkt nacheinander gezogen, im Tempo der Fingerwelle
      // close (Hugo 24.11., 16:01): dieselbe organische Fingerwelle auf der zurückkommenden Seite, ohne Rand-Leuchten
      // Hugo 24.11. (16:02): Öffnen und Schliessen – nur der Schimmer mit Solar Flares (wie nach dem close), kein Kreis,
      // kein Leuchten am Rand
      // Hugo 24.11. (16:15): ohne Rand-Leuchten (am iPhone sah man oben eine Lichtlinie)
      cv.flareShimmer = function (over) { if (!over) lightOff(); else shimOn = true; dock(CONFIG.shimAmt, CONFIG.shimAmt, true, 1, true); noEdge = true; };   // Hugo 24.11. (16:09/18:19): genau die Ladeanimation, halb so stark, ohne den Aufprall
      var noEdge = false;   // close-Welle: kein Nachleuchten am Rand (Hugo 24.11., 16:01)
      function edgeOffV(now) { return noEdge ? 1 : lightMode && !pendingOff ? smoothstep(0, 0.25, (now - lightT0) / 1000) : 0; }
      cv.tint = function (v) { if (!v) shimOn = false; if (!raf) req(); };
      // Hugo 24.11. (15:12): weicher – das Foto in der Welle blendet über die Dauer des Übergangs aus (vorher auf einen Schlag),
      // und die Welle liegt über dem Licht der Blendung (sonst verschwand sie abrupt im Weiss)
      function lightFade(now) { return lightMode ? 1 - smoothstep(0, CONFIG.deskSunFade / 1000, (now - lightT0) / 1000) : 1; }
      // Hugo 24.11. (15:19): nach dem close nicht sofort zurückschalten – der Wechsel vom Licht zur Bild-Darstellung machte das
      // Bild mitten im Schimmer kurz dunkler (und die Textur musste neu geladen werden, Ruckler). Erst wenn nichts mehr läuft
      // oder eine neue Welle beginnt
      var pendingOff = false;
      function lightOff() { pendingOff = false; lightMode = false; shimOn = false; if (cv.parentNode === root) { cv.parentNode.removeChild(cv); cv.style.zIndex = ''; } }
      cv.lightOnly = function (on) { if (on) { pendingOff = false; if (!lightMode) lightT0 = performance.now(); lightMode = true; } else if (lightMode) pendingOff = true; if (!raf) req(); };
      cv.dropTap = function () { var now = performance.now(); waves = waves.filter(function (q) { return q.sp2 || now - q.t0 > 800 || q.pts.length > 3; }); };
      try { loadAll(); } catch (e) {}   // Hugo 24.11.: Bilder für den Effekt schon beim Laden holen (nicht erst beim Aufprall – sonst Ruckler)
      // eine Berührung = eine Welle (neue Berührung beginnt eine neue)
      // Hugo 25.11. (16:29): beim blossen Tippen keine Welle mehr – sie beginnt erst, wenn der Finger zieht (ab 6 px,
      // gleiche Schwelle wie beim Wischen); dann startet sie an der Stelle, wo der Finger aufgesetzt hat
      var tDown = null;
      function startWave(x, y, t) {
        noEdge = false;
        if (pendingOff) lightOff();
        pushWave({ t0: performance.now(), pts: [] });
        if (edgeT0 && !killT0) killT0 = performance.now();
        add(x, y);
        // Hugo 25.11. (17:03): das erste Tempo vom Aufsetzen an messen – sonst galten die ersten 6 px als in einem Augenblick
        // gezogen (riesiges Tempo) und schon langsames Scrollen machte eine grosse Welle
        var wv = waves[waves.length - 1]; if (wv && t) wv.pt = t;
      }
      stage.addEventListener('touchstart', function (e) {
        tDown = null;
        if (!ok() || !e.touches[0] || e.touches.length > 1) return;
        tDown = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now(), on: false };
      }, { passive: true });
      stage.addEventListener('touchmove', function (e) {
        if (!ok() || !e.touches[0] || !tDown) return;
        var x = e.touches[0].clientX, y = e.touches[0].clientY;
        if (!tDown.on) {
          if (Math.abs(x - tDown.x) < 6 && Math.abs(y - tDown.y) < 6) return;
          tDown.on = true;
          // Hugo 26.11.: Fingerwelle am Handy aus (Tiefe statt Welle). Das Wischen wischt das Andocken weiterhin weg (1,5–3 s Ausklang)
          if (!CONFIG.fingerWave) { if (edgeT0 && !killT0) { killT0 = performance.now(); if (!raf) req(); } }
          else startWave(tDown.x, tDown.y, tDown.t);
        }
        if (CONFIG.fingerWave) add(x, y);
      }, { passive: true });
      stage.addEventListener('touchend', function (e) { if (!e.touches.length) tDown = null; }, { passive: true });
      stage.addEventListener('touchcancel', function () { tDown = null; }, { passive: true });
      return cv;
    })();

