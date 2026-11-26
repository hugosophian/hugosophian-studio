  // ---------- Bewegungssystem (25.11.2026, siehe Stilanleitung «Bewegung») ----------
  // Eine Sprache für alle Bewegungen: wenige feste Kurven und Dauern. Neue Animationen nehmen diese Werte, statt eigene zu erfinden.
  // Die Werte sind die, die schon überall benutzt werden (es ändert sich nichts am Aussehen). Als CSS-Variablen: --hp-ease-out usw.
  var MOTION = {
    out:    'cubic-bezier(.22,1,.36,1)',   // Erscheinen, Einrasten: schneller Start, weicher Auslauf
    page:   'cubic-bezier(.6,0,.1,1)',     // grosse Wechsel (About, Titel-Flug): ruhig an, weich aus (Mario)
    away:   'cubic-bezier(.55,0,.9,.4)',   // Verschwinden, Röhren-TV: wird immer schneller
    snap:   'cubic-bezier(.2,.7,.3,1)',    // kurze Bewegung, die sitzt
    quick:  150,   // Rückmeldung (Ausblenden beim Wischen)
    ui:     420,   // Elemente erscheinen (Buchstaben, Knöpfe, Titel)
    glow:   900,   // Schimmer, Nachleuchten
    pageMs: 1500   // About, Seiten-Wechsel
  };
  var CONFIG = {
    // Senkrecht (Handy)
    // Senkrecht (Handy) – nachgebaut nach marioroudil.com (main.js, Klasse Slider + WebGL-Shader):
    //   Die Bilder liegen als durchgehender Streifen untereinander. Der Finger bewegt das Ziel
    //   (mal speed), die Anzeige läuft dem Ziel mit einer Glättung pro Bild hinterher (ease).
    //   Der Abstand zwischen Ziel und Anzeige ist das Tempo: Daraus zoomt das Bild in seinem Rahmen
    //   (Mario: progress = 0.25 · Abstand / Bildschirmhöhe, Bildausschnitt · (1 − 0.5 · progress)).
    //   Schnell ziehen = grosser Abstand = starkes Verziehen, langsam = wenig. Loslassen rastet auf das nächste Bild ein.
    speed:      3,      // Mario am Handy: 3 (Finger-Weg mal 3), Desktop 1.5
    ease:       0.15,   // Mario: 0.15 pro Bild (60 fps), kleiner = träger und mehr Verziehen
    zoom:       0.25,   // Mario: 0.25 (Stärke des Verziehens)
    zoomMax:    0.24,   // Begrenzung, damit beim Herauszoomen nie ein Rand sichtbar wird
    imgBase:    1.12,   // Bild im Rahmen leicht grösser, als Reserve fürs Herauszoomen (= 1 / (1 − zoomMax / 2))
    wheelIdle:  160,    // ms nach Mausrad/Trackpad, dann einrasten
    edgeGuard:  40,     // px am Rand, in denen Safaris Zurück-Wischen gesperrt ist
    // Einflug
    introMs:    3000,   // Dauer (Aufziehen wie Mario: 2.25 s mit Kurve 0.72, 0, 0.11, 1)
    introWait:  1500,   // höchstens so lange auf die Bilder warten (ms)
    // Hugo 25.11. (09:24): «zum Studio» soll immer die ganze Ladeanimation zeigen. Die alte Seite gleitet 0.8 s weg und
    // verdeckte so den Anfang der Animation → sie startet erst, wenn die alte Seite weg ist (vorher 0)
    vtDelay:    780,    // nach „zum Studio“: Animation so viel später (ms)
    stripW:     0.07,   // Säule: Breite (Anteil Bildschirm)
    stripH:     0.085,  // Säule: Höhe pro Bild (Anteil Bildschirm)
    ldCards:    true,   // Hugo 24.11.: true = weisse Karten mit Magnet (Handy), false = Einflug wie am Computer
    ldStripW:   0.065,  // Ladeanimation: Startgrösse der Karten (Hugo 24.11.: näher, vorher 0.038 × 0.046)
    ldStripH:   0.079,
    // Desktop
    desk:       992,    // ab dieser Breite (px) und mit Maus: Bilder nebeneinander
    deskOpen:   0.52,   // Breite des geöffneten Bildes samt Text (Anteil)
    deskSide:   0.2,    // Breite der Textspalte (Anteil)
    deskStiff:  150,    // Feder beim Aufschieben
    deskDamp:   0.6,    // kleiner = mehr Nachwippen
    deskTitle:  0.9,    // der längste Titel füllt so viel der Bildbreite
    deskTextFrom: 0.25, // Computer: Text der Spalte blendet ein, sobald sie so weit offen ist …
    deskTextSpan: 0.25, // … und ist nach diesem Stück ganz da
    warmAfter:  2200,   // Galerien so lange nach dem Einflug vorladen (ms)
    warmDelay:  1300,   // Computer: Galerie erst so lange nach dem Aufgehen der Spalte vorladen (ms), dann in einer ruhigen Lücke
    goScrollDelay: 280, // Hugo 11:09: beim Hineinscrollen schreibt sich der Knopf so viel später ein (ms)
    goDelay:    0,      // zusätzliche Verzögerung (ms). Hugo 11:06: zeitlich wieder wie ursprünglich, dafür erst wenn sichtbar (vorher 200, 350)
    mouseMin:   24,     // Computer: so viele px muss die Maus in einem Zug machen, bevor eine Welle beginnt (Hugo 19:10: kleine Bewegungen ohne Welle)
    goAnim:     false,  // Hugo 25.11. (18:25): «Galerie öffnen» / «Werkstatt betreten» ohne Einschreiben und Schimmer, überall (true = wieder an)
    infoMs:     MOTION.pageMs,   // About: Dauer (Mario: 1.5 s, Kurve 0.6, 0, 0.1, 1)
    // Hugo 25.11.: About wieder wie am 21.11. (Mario pur: weisse Seite von rechts, Bild zoomt hinein, kein Licht), Handy und Computer.
    // true = Sonne mit Welle (Stand 24.11., siehe effekt-bibliothek/06-sonne-welle.md). Die Sonnenstrahlen sollen später woanders hin.
    aboutSun:   false,  // true geht nur mit dem Code aus archiv/sonne-about.js (25.11. ausgelagert)
    // Hugo 25.11.: Effekte ruhiger (vorher alles 1). Fingerwelle: das Wasser verzieht das Bild weiter wie bisher,
    // nur das Licht darauf ist zurückgenommen.
    waveLight:  0.46,   // Hugo 18:06: minimal sichtbarer (vorher 0.4)
       // Regenbogen-Licht auf der Welle (Ring, Halo)
    waveEdge:   0.2,    // Leuchten, wenn die Welle den Bildschirmrand erreicht (lief bis 5 s nach)
    // Hugo 25.11. (08:10): langsam wischen = schmale, ruhige Welle; schnell = kräftige. Jeder Punkt der Fingerbahn merkt
    // sich das Tempo dort, die Welle ist entlang der Bahn gemischt. Tempo in px pro ms (Finger/Maus):
    waveSlow:   0.12,   // bis hier ruhigste Welle (Hugo 17:03: vorher 0.08)
    waveShort:  20,     // Handy: kurze Wischer – ab hier wächst die Kraft mit dem Weg (px) (Hugo 17:13)
    waveLong:   130,    // Handy: ab diesem Weg (px) volle Kraft aus dem Tempo (Hugo 17:26: halbiert und minimal früher, vorher 280)
    waveShortK: 0.15,   // Handy: Anteil der Tempo-Kraft bei ganz kurzem Wischer
    waveCurve:  1.5,    // Handy: >1 = langsames Scrollen bleibt länger ruhig (Hugo 17:03)
    waveFast:   1.2,    // ab hier volle Stärke (wie bisher)
    waveCalm:   0.3,    // Stärke der ruhigsten Welle (1 = wie bisher)
    // Hugo 25.11. (09:21): am Computer werden die Wellen erst später stark – auch etwas mehr Bewegung bleibt noch ruhig,
    // die kräftigen setzen erst bei schneller Maus ein (Maus-Tempo ist höher als Finger-Tempo)
    // Hugo 09:45: noch später stark, und bei ganz schneller Maus etwas stärker als die bisherige Grenze
    waveSlowDesk: 0.3,  // Computer: bis hier ruhigste Welle (px/ms) (vorher 0.2)
    waveFastDesk: 4.5,  // Computer: hier volle Stärke wie bisher (vorher 3.0)
    waveCurveDesk: 2.2, // Computer: >1 = Stärke steigt erst spät steil an (vorher 1.8)
    waveTopDesk:  8.0,  // Computer: bei diesem Tempo die Extra-Stärke ganz
    waveBoostDesk: 0.2, // Computer: so viel stärker als die bisherige Grenze (0.2 = +20 % Stärke)
    waveFlares: 0,      // Solar Flares auf der Fingerwelle (0 = keine)
    ldRim:      0.58,   // Hugo 18:06: minimal sichtbarer (vorher 0.5)
       // Ladeanimation: Rand-Leuchten beim Andocken (Hugo 16:16: Perlmutt minimal sichtbarer, vorher 0.35)
    ldFlares:   0.6,    // Ladeanimation: Flares beim Andocken (Hugo 15:59: wieder an – ungleichmässig, macht auch die Wellen ungleich; vorher 0)
    // Computer (Hugo 24.11.): Maus ruht so lange auf dem geöffneten Bereich → alles ausser Text und «Galerie öffnen»
    // blendet aus und die Sonne vom Handy-About geht an. Maus ausserhalb des Bereichs → alles zurück, Sonne weg.
    deskSunIdle: 1000,  // ms ohne Mausbewegung
    deskSunFade: 900,   // ms Aus- und Einblenden
    deskSunRes:  0.5,   // Auflösung der Sonne am Computer (Anteil der CSS-Pixel; Strahlen sind weich)
    deskSunOval: 60,    // px Rand der ovalen Zone um den Text: Maus ausserhalb → alles zurück (Hugo 24.11., 13:36)
    diveZoom:   1.6,    // Hugo 24.11. (13:50/14:27): das Bild zoomt beim Übergang hinein, als würde man eintauchen – früher und stärker
    diveZoomIn: 3.4,    // Hugo 24.11. (19:48/19:51): so tief taucht das Bild beim Öffnen ein (gleichmässig, schnell); danach unsichtbar zurück auf diveZoom
    diveMs:     1300,   // Dauer des Eintauchens (startet am Handy schon beim Tippen); gleichmässig ohne Abbremsen, bis das Bild ganz unter dem Licht ist
    closeBeam:  400,    // Hugo 24.11. (13:51): beim Schliessen schwingt ein Sonnenstrahl aufs Display und blendet (ms)
    closeHold:  160,    // Hugo 24.11. (14:23): so lange nach dem Start des Strahls beginnt schon das Ausblenden (die Seite taucht im Licht auf)
    shimAmt:    0.5,   // Hugo 24.11. (16:09): Schimmer bei Öffnen und Schliessen = Aufprall der Ladeanimation in halber Stärke
    // Hugo 26.11.: Foto mit Tiefe statt Fingerwelle (Handy, Test auf webflow.io). Zwei grosse Effekte gleichzeitig auf einem Bild
    // widersprechen Regel 1 im Bewegungssystem – darum ist die Fingerwelle am Handy aus. Das Andocken der Ladeanimation bleibt.
    fingerWave: false,  // Fingerwelle am Handy (true = wieder an). Die Maus-Welle am Computer bleibt unverändert
    tiefe: {
      on:      true,
      base:    'https://cdn.jsdelivr.net/gh/hugosophian/hugosophian-studio@8337c49e2a052b3a691c3a9abf1077855860af2d/tiefe/',   // Ordner mit den Tiefen-Dateien (feste Commit-Nummer)
      names:   { alchemist: 'alchemist', creator: 'creator', singer: 'singer', model: 'model',     // Titel des Bilds (klein) → Ordner
                 mechanic: 'alchemist', kunst: 'creator', musik: 'singer', persona: 'model' },      // oder Feld Name
      travel:  0.14,    // Weg zwischen ganz nah und ganz fern über einen ganzen Bildwechsel bei Stärke 1 (Anteil der Bildhöhe)
      strength: 0.8,    // Stärke (Hugo 26.11., nach dem Test am iPhone: mindestens 80 %, mehr, wenn es sauber aussieht)
      levels:  [0.8, 1.0, 1.2],   // Schalter zum Vergleichen, nur auf webflow.io sichtbar. Die Tiefen-Dateien reichen bis 1.2
      fade:    0.03,    // so viele Bildhöhen Weg, bis die Tiefen-Leinwand das <img> ganz abgelöst hat (eingerastet sieht man das <img>)
      wall:    0.13,    // Tiefensprung, ab dem das vordere Netz offen bleibt
      maxPixels: 2000000,  // Obergrenze gezeichneter Bildpunkte pro Bild
      maxTex:  3700000     // Obergrenze für das Foto auf der Grafikkarte (Bildpunkte; die 1600er-Variante von Webflow passt unverkleinert)
    }
  };

