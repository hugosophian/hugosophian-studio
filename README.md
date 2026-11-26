# hugosophian-studio

Code für hugosophian.studio (Webflow). Ausgeliefert über jsDelivr:

    https://cdn.jsdelivr.net/gh/hugosophian/hugosophian-studio@<version>/<datei>

In Webflow wird immer eine feste Version eingebunden: die Commit-Nummer statt <version>. So ändert sich die Live-Seite erst, wenn die Nummer in Webflow angepasst wird.

## Arbeitsweise (seit 25.11.2026)

1. **Ändern in `src/home/`** (home.js wird daraus zusammengesetzt), galerie.js direkt.
2. **Bauen und prüfen:** `sh tools/build.sh --test`
   - setzt home.js zusammen und erzeugt die .min.js-Dateien
   - zeigt die Prüfsummen (SRI)
   - startet die automatische Prüfung `tests/run.py`
3. **Commit und Push.**
4. **Lader in Webflow anpassen:** V = Commit-Nummer, I = Prüfsumme.
   - Homepage: im Seiten-Head
   - Galerien: im Seiten-Footer
5. **Nur auf webflow.io veröffentlichen** (https://hugo-portfolio-daa8a9.webflow.io), dort am iPhone testen.
6. **Erst nach OK** auch auf hugosophian.studio veröffentlichen.

### Lader

Die Skripte werden nicht mehr mit einem festen `<script src>` eingebunden, sondern über einen kleinen Lader. Er:
- lädt früh (Homepage: schon im Head)
- prüft die Datei mit einer Prüfsumme (SRI)
- holt dieselbe Datei von githack, falls jsDelivr ausfällt oder die Prüfsumme nicht stimmt

### Tiefe der Startbilder (seit 26.11.2026, Test auf webflow.io)

Am Handy bekommt jedes Startbild beim Wischen Tiefe: Nahes verschiebt sich stärker als Fernes, ganz hinten bleibt stehen. Eingerastet sieht man das normale `<img>`.

- **Code:** `src/home/13b-tiefe.js`, Werte in `src/home/01-config.js` unter `tiefe` (Stärke, Weg, Ordner).
- **Dateien pro Foto:** `tiefe/<name>/` mit `maske.png`, `rand.webp`, `dahinter.webp`, `netz.png` (zusammen rund 300 KB). Das Foto selbst liegt nicht im Repo, die Seite nimmt ihr eigenes `<img>`.
- **Neues oder geändertes Startbild:** einmal rechnen mit `sh tools/tiefe/rechnen.sh <foto> <name> <tiefe.onnx> <auffuellen.pt>` (rund 1 Minute, die Modelle stehen im Kopf des Skripts), committen, die Commit-Nummer in `tiefe.base` eintragen, bauen. Welcher Titel zu welchem Ordner gehört, steht in `tiefe.names`. Ohne passende Dateien (oder bei anderem Seitenverhältnis) bleibt das Bild einfach ohne Tiefe.
- **Schalter 80 / 100 / 120 %:** erscheint nur auf webflow.io, zum Vergleichen. Auf hugosophian.studio gilt `tiefe.strength` (0.8). Die Dateien sind bis 120 % gerechnet.
- **Fingerwelle:** am Handy aus (`fingerWave: false`), das Andocken der Ladeanimation bleibt.

### Ordner

| Ordner | Inhalt |
|---|---|
| `src/home/` | home.js in Teilen, in Namensreihenfolge: Kopf, Konfiguration (inkl. Bewegungssystem `MOTION`), CSS, Start, Titel, Effekt (Welle, Andocken, Shader), Zeichnen, Takt, Rückweg, Menü-Knopf, Zur Galerie, Desktop, Handy, Tiefe, About, Close-Knopf, Ladeanimation, Start, Boot |
| `archiv/` | ausgeschalteter Code (Sonne beim About, Appelgren-Wortbewegung). Wird nicht ausgeliefert. |
| `tiefe/` | Tiefen-Dateien der Startbilder (über jsDelivr mit fester Commit-Nummer geladen) |
| `tests/` | automatische Prüfung (Playwright, virtuelle Uhr, fester Zufall, Gitterbild), Vergleichsbilder in `tests/baseline/` |
| `tools/` | Build-Skript, `tools/tiefe/` = Filter für die Tiefen-Dateien |
