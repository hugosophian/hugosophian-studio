#!/bin/sh
# Baut die ausgelieferten Dateien aus den Quellteilen und zeigt die Prüfsummen (SRI) für die Lader in Webflow.
#   sh tools/build.sh            bauen
#   sh tools/build.sh --test     bauen und danach die automatische Prüfung (tests/run.py)
# home.js entsteht aus src/home/*.js (in Namensreihenfolge zusammengesetzt) – Änderungen immer in src/home/ machen.
set -e
cd "$(dirname "$0")/.."
cat src/home/*.js > home.js
for f in home galerie; do   # die anderen Dateien stecken als Inline-Skripte in Webflow (dort von Hand aktualisieren)
  [ -f "$f.js" ] && npx --yes terser "$f.js" -c -m -f ascii_only=true -o "$f.min.js"
done
echo "Prüfsummen (I im Lader):"
for f in home.min.js galerie.min.js; do
  echo "  $f  sha384-$(openssl dgst -sha384 -binary "$f" | openssl base64 -A)"
done
[ "$1" = "--test" ] && python3 tests/run.py
echo "Nach dem Commit: V im Lader = neue Commit-Nummer, I = Prüfsumme oben. Zuerst nur auf webflow.io veröffentlichen."
