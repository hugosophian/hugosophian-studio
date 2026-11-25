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

### Ordner

| Ordner | Inhalt |
|---|---|
| `src/home/` | home.js in Teilen, in Namensreihenfolge: Kopf, Konfiguration (inkl. Bewegungssystem `MOTION`), CSS, Start, Titel, Effekt (Welle, Andocken, Shader), Zeichnen, Takt, Rückweg, Menü-Knopf, Zur Galerie, Desktop, Handy, About, Close-Knopf, Ladeanimation, Start, Boot |
| `archiv/` | ausgeschalteter Code (Sonne beim About, Appelgren-Wortbewegung). Wird nicht ausgeliefert. |
| `tests/` | automatische Prüfung (Playwright, virtuelle Uhr, fester Zufall, Gitterbild), Vergleichsbilder in `tests/baseline/` |
| `tools/` | Build-Skript |
