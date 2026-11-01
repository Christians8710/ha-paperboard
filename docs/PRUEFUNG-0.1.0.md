# Prüfstand PaperBoard 0.1.0

Stand: 01.11.2026. Diese Version ist eine erste Testversion.

## Automatisierte Prüfungen

- Layoutvalidierung mit ungültigen Dokumenten, Größen, Entitäten und doppelten Kennungen.
- Alle drei Kalenderseiten mit leeren, normalen und dicht belegten Tagen auf vier Ausgabeprofilen.
- Prüfung von Bildabmessungen, Displayfarbpalette, Textbegrenzung, Mehrtagsterminen,
  exklusivem Enddatum, verborgenen Termintiteln und geänderten Sensorwerten.
- Echte Home-Assistant-Testumgebung 2026.10.4 unter Linux: Einrichtung,
  Seiten speichern und wiederladen, widersprüchliche Speicherstände,
  WebSocket-Vorschau, getrennte Displays, Bildschlüssel und ETag/HTTP 304.
- Administratorschutz für Verbindungsdaten.
- Editor-Geometrie und proportionale Skalierung.
- JavaScript- und Python-Syntax, Paket-/Manifest-/Renderer-Versionsgleichheit.
- Integrations- und Komplett-ZIP vollständig, ohne Bytecode oder Cacheordner.
- HACS-Validierung und hassfest.
- ESPHome 2026.10.1: E1002-Konfiguration und C++-Codegenerierung mit temporären
  Testschlüsseln. Die Prüfung flasht nichts und veröffentlicht keine Testfirmware.

Das maßgebliche Ergebnis für den jeweiligen Commit steht unter
[GitHub Actions](https://github.com/Christians8710/ha-paperboard/actions).
`tools/build.py` erzeugt zusätzlich `dist/Pruefbericht.json` und 36 PNG-Vorschauen.

## Manuelle Sicht- und Bedienprüfung

Der Editor wurde in Chrome mit erfundenen Daten geöffnet. Geprüft wurden
Baustein hinzufügen, Text ändern, per Maus verschieben und vergrößern,
Vorschau laden und Layout speichern.
Eine verlorene Texteingabe wurde dabei behoben. Normale und dichte
Kalenderansichten wurden als PNG kontrolliert. Überlaufzähler erhalten einen
eigenen Bereich neben dem letzten sichtbaren Termin.

## Grenzen

- Noch keine Installation auf dem persönlichen Home Assistant und kein Test am E1002.
- Kein Hardwaretest für E1001, E1003 oder E1004.
- Keine vollständige C++-Kompilierung und kein USB-/OTA-Flashlauf durchgeführt.
- Automatischer Flash-Installer und echtes Tiefschlafmanagement sind noch offen.
- Der Browserprüfstand ersetzt keine Home-Assistant-Installation; die separaten
  HA-Tests verwenden dagegen den echten Home-Assistant-Code.
