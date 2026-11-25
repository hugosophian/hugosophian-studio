// ARCHIV (25.11.2026): Wortbewegung wie perappelgren.de (apChunks/apWord) – seit 13:54 nicht mehr benutzt (Hugo: nur Ausblenden ins Weiss).
// Letzte Fassung mit dieser Bewegung: home.js @72c1de8.

    // ---------- Appelgren 1:1 auf ein festes Textfeld übertragen (Hugo 13:36) ----------
    // Sein Code (perappelgren.de, About): o = (vh − top)/(vh + Höhe) für die ganze Sektion (Sektion = 900 px = Bildschirm, Text 352 px
    // darin = .39 × Höhe, 67 Wörter). Alle Wörter teilen dasselbe o, jedes Wort r = Nummer/(Anzahl−1):
    //   rein  n = easeOutQuart((o − (.06 + .14 r)) / .28),  raus i = easeInOutCubic((o − (.58 + .12 r)) / .16)
    //   Deckkraft n·(1 − i), Lage lerp(22, 0, n) − lerp(0, 28, i) px. Keine Drehung, kein Strecken.
    // In Bildschirm-Lage umgerechnet: der Textblock geht als Ganzes – die Reihenfolge (r) verteilt sich beim Gehen nur auf 61 % und
    // beim Kommen auf 72 % der Blockhöhe. Darum gehen tiefere Zeilen etwas früher als ihre Lage sagt: der Block hebt sich, die Zeilen
    // laufen leicht auseinander (das «Dehnen»), und in jeder Zeile ist links früher dran als rechts (die Welle durch die Buchstaben).
    // Weil unser Text länger sein kann als sein Block, wird er in Blöcke von .39 × Feldhöhe geteilt (wie sein Textblock), jeder Block
    // verhält sich wie seine ganze Sektion. Die Zonen oben und unten bleiben so, wie Hugo sie eingestellt hat.
    function apChunks(ws, chunkH) {
      var cur = null, list = [];
      ws.forEach(function (W) {
        if (!cur || (W.k === 0 && W.y - cur.t >= chunkH) || (W.p && cur.p && W.p !== cur.p)) { cur = { t: W.y, b: W.y + W.h, n: 0, p: W.p }; list.push(cur); }
        W.cc = cur; W.ci = cur.n++; cur.b = Math.max(cur.b, W.y + W.h);
      });
      ws.forEach(function (W) { var c = W.cc; W.r = c.n > 1 ? W.ci / (c.n - 1) : 0; W.ct = c.t; W.cb = c.b; W.cH = Math.max(1, c.b - c.t); });
    }
    // Hugo 13:45 (Video 13:43): Effekt hervorragend, aber die Blöcke gingen so früh, dass oben und unten viel Weiss blieb. Kombiniert:
    // die Reihenfolge verteilt sich jetzt auf 75 % (Gehen) und 80 % (Kommen) der Blockhöhe statt 61/72 % – die Welle und das leichte
    // Auseinanderlaufen bleiben, die Lücke wird klein (≈ ¼ Block). Ganz am Rand blendet der Text zusätzlich normal ins Weiss aus
    // (oben über 26 px bis unter den Titel, unten über 26 px vor dem Knopf).
    function apWord(W, st, oS, zT, botB, zB, red, topE) {
      if (red) return { o: 1, ty: 0 };
      var pEx = (W.ct - st) + 0.75 * W.r * W.cH;            // Lage, nach der das Wort geht
      var pIn = (W.cb - st) - 0.80 * (1 - W.r) * W.cH;      // Lage, nach der das Wort kommt
      var i = eIOC(clamp((oS - pEx) / zT, 0, 1));
      var n = zB ? eOQ(clamp((botB - 24 - pIn) / zB, 0, 1)) : 1;
      var y = W.y - st;
      var edge = (zB ? clamp((botB - (y + W.h)) / 20, 0, 1) : 1) * (topE == null ? 1 : clamp((y - topE) / 13, 0, 1));   // normal ins Weiss (13:49: oben 13, unten 20 px)
      return { o: n * (1 - i) * edge, ty: 22 * (1 - n) - 28 * i };
    }
    function eOQ(t) { return 1 - Math.pow(1 - t, 4); }
    function eIOC(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
