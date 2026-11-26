#!/bin/sh
# Rechnet die Tiefen-Dateien für ein Startbild (einmal pro Foto, nicht im Browser).
#   sh tools/tiefe/rechnen.sh <foto> <name> <tiefe.onnx> [auffuellen.pt]
#   Beispiel: sh tools/tiefe/rechnen.sh ~/Bilder/creator.webp creator ~/modelle/depth_anything_v2_vits.onnx ~/modelle/big-lama.pt
# Ergebnis: tiefe/<name>/maske.png, rand.webp, dahinter.webp, netz.png  (dazu zum Anschauen in tiefe/.arbeit/<name>/: panel.jpg,
# plate_view.jpg). Das Foto selbst kommt nicht ins Repo – die Seite nimmt ihr eigenes <img>. Wichtig: dasselbe Foto mit demselben
# Ausschnitt wie im CMS (gleiches Seitenverhältnis), sonst lässt home.js die Tiefe für dieses Bild weg.
# Braucht: Python 3 mit opencv-contrib-python, numpy, onnxruntime · Modell: Depth Anything V2 Small als ONNX (Eingang 518 × 518,
# Apache 2.0): depth_anything_v2_vits.onnx aus den GitHub-Releases von fabio-sim/Depth-Anything-ONNX (v2.0.0), rund 99 MB, nicht im Repo
# Auffüllen (empfohlen, viertes Argument): LaMa (Apache 2.0), big-lama.pt aus den GitHub-Releases von Sanster/models
# (add_big_lama), rund 206 MB, braucht zusätzlich PyTorch. Damit führt eine KI weiter, was hinter Personen und Dingen liegt
# (rund 1 Minute pro Foto). Ohne das Modell wird gespiegelt aufgefüllt: schneller, aber an Linien und Mustern sichtbar.
# Ein Motiv vor ruhigem Hintergrund (Alchemist, Model): mit TIEFE_NAH=2.5 davor aufrufen, dann bewegt sich die Person als eine
# Ebene. Szenen mit viel Mittelgrund (Creator, Singer): ohne.   Beispiel: TIEFE_NAH=2.5 sh tools/tiefe/rechnen.sh ...
set -e
[ $# -ge 3 ] || { echo "Aufruf: sh tools/tiefe/rechnen.sh <foto> <name> <tiefe.onnx> [auffuellen.pt]"; exit 1; }
here="$(cd "$(dirname "$0")" && pwd)"; root="$(cd "$here/../.." && pwd)"
work="$root/tiefe/.arbeit/$2"; out="$root/tiefe/$2"
mkdir -p "$work" "$out"
# Arbeitsgrösse 1180 px Breite (darauf sind alle Pixel-Werte im Filter abgestimmt)
python3 -c "
import cv2, sys
im = cv2.imread(sys.argv[1], cv2.IMREAD_COLOR); h, w = im.shape[:2]
im = cv2.resize(im, (1180, int(round(h * 1180.0 / w))), interpolation=cv2.INTER_AREA if w > 1180 else cv2.INTER_CUBIC)
cv2.imwrite(sys.argv[2] + '/clean.png', im); print(w, h, '->', im.shape[1], im.shape[0])" "$1" "$work"
python3 "$here/depth.py" "$work/clean.png" "$3" "$work"
python3 "$here/dateien.py" "$work" "$work" ${4:+"$4"}
cp "$work/maske.png" "$work/rand.webp" "$work/dahinter.webp" "$work/netz.png" "$out/"
echo "Fertig: $out  ·  danach: Commit, Commit-Nummer in src/home/01-config.js (tiefe.base) eintragen, bauen."
