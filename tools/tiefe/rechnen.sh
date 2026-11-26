#!/bin/sh
# Rechnet die Tiefen-Dateien für ein Startbild (einmal pro Foto, nicht im Browser).
#   sh tools/tiefe/rechnen.sh <foto> <name> <modell.onnx>
#   Beispiel: sh tools/tiefe/rechnen.sh ~/Bilder/creator.webp creator ~/modelle/depth_anything_v2_vits.onnx
# Ergebnis: tiefe/<name>/maske.png, rand.webp, dahinter.webp, netz.png  (dazu zum Anschauen in tiefe/.arbeit/<name>/: panel.jpg,
# plate_view.jpg). Das Foto selbst kommt nicht ins Repo – die Seite nimmt ihr eigenes <img>. Wichtig: dasselbe Foto mit demselben
# Ausschnitt wie im CMS (gleiches Seitenverhältnis), sonst lässt home.js die Tiefe für dieses Bild weg.
# Braucht: Python 3 mit opencv-contrib-python, numpy, onnxruntime · Modell: Depth Anything V2 Small als ONNX (Eingang 518 × 518)
set -e
[ $# -ge 3 ] || { echo "Aufruf: sh tools/tiefe/rechnen.sh <foto> <name> <modell.onnx>"; exit 1; }
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
python3 "$here/dateien.py" "$work" "$work"
cp "$work/maske.png" "$work/rand.webp" "$work/dahinter.webp" "$work/netz.png" "$out/"
echo "Fertig: $out  ·  danach: Commit, Commit-Nummer in src/home/01-config.js (tiefe.base) eintragen, bauen."
