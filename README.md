# PaperBoard

**Frei gestaltbare E-Paper-Dashboards für Home Assistant.**

PaperBoard verwaltet mehrere Displays und erzeugt deren Bilder lokal in Home
Assistant. Ein visueller Editor ermöglicht frei platzierbare Bausteine, mehrere
Seiten und eine Vorschau des tatsächlich gerenderten Displaybilds. Den Anfang
machen die Seeed reTerminal E1001 bis E1004; weitere Hersteller können später
über eigene Geräteprofile ergänzt werden.

## Version 0.1.0 – erste Testversion

Die erste Integration ist implementiert. Vor dem Einsatz am eigenen Gerät bitte
die unten genannten Grenzen beachten. Es gibt noch keinen Hardwaretest mit
PaperBoard. Die persönliche Vorgängerintegration `eink_calendar` wird nicht
überschrieben oder automatisch umgestellt.

### Bereits umgesetzt

- Deutsche grafische Einrichtung unter **Geräte & Dienste**, ein Eintrag je Display.
- Geräteprofile für E1001, E1002, E1003 und E1004 mit passender Auflösung und Farbpalette.
- Freier Seiteneditor: Verschieben, Größenänderung, Raster, Ebenen, Kopieren,
  Ausrichten, Rückgängig/Wiederholen und Seitenreihenfolge.
- Bis zu zwölf Seiten und 40 Bausteine pro Seite, mit eigener Zeichenfläche.
- Text, Datum/Uhrzeit, Sensorwert, aktuelles Wetter, Kalender, Abfalltermine,
  Feiertage, Gerätestatus, Rahmen und Linien.
- Kalendervorlagen für nächste Termine, 7 Tage und 14 Tage; leere Vorlage
  und Übersicht mit Wetter und Sensorwert.
- Frei wählbare Kalender, Quellenbezeichnungen, Farben und optional verborgene Termintitel.
- Abfall-Badges und nächste Feiertage mit bis zu 90 Tagen Vorschau.
- Serverseitige PNG-Vorschau, Bildausgabe mit eigenem Schlüssel je Display,
  ETag und HTTP 304 bei unverändertem Bild.
- Layouts in Home Assistants `.storage`, geschützt vor widersprüchlichen
  gleichzeitigen Speicherungen; Import und Export als JSON.
- Diagnosewerte für Bildabruf, Bilderzeugung und Seitenanzahl sowie eine
  Aktion zum Erneuern des Bilds beim nächsten Geräteabruf.
- Separate ESPHome-Vorlage für neue E1002-Geräte mit Tasten und Sensoren.
- Frei weitergebbare Ubuntu-Schrift mit Umlauten und zugehöriger Schriftlizenz.

### Noch nicht freigegeben oder umgesetzt

- Automatisches USB-Flashen aus dem Einrichtungsassistenten.
- Automatischer Tiefschlaf mit Tasten-Aufwecken und OTA-Wartungsfenster.
  Netz-/Akkuprofil und Abrufabstand werden gespeichert; die Firmware muss sie
  derzeit selbst umsetzen. Die beigelegte Firmware bleibt erreichbar.
- Gerätefirmware und Hardwaretests für E1001, E1003 und E1004; Touchbedienung.
- Direkte Gerätebefehle aus dem Editor; Bilder werden beim nächsten Abruf geladen.
- Wettervorhersage, beliebige Bilder und benutzerdefinierte Schriftdateien.
- Pixelgenaue Übernahme des alten privaten Kalenders: die drei Ansichten sind
  neue bearbeitbare Vorlagen, keine unveränderte Kopie des alten Layouts.

## Installation über HACS

Voraussetzungen: Home Assistant ab **2026.10.0**, HACS und Zugriff als Administrator.

1. In HACS das Menü **Benutzerdefinierte Repositories** öffnen.
2. `https://github.com/Christians8710/ha-paperboard` mit Typ **Integration** hinzufügen.
3. **PaperBoard** herunterladen und Home Assistant neu starten.
4. **Einstellungen → Geräte & Dienste → Integration hinzufügen → PaperBoard** öffnen.
5. Displaymodell, Ausrichtung, Betriebsart und Vorlage auswählen.
6. In der Seitenleiste **PaperBoard** öffnen, Datenquellen wählen und Seiten gestalten.
7. Änderungen speichern und unter **Gerät & Verbindung** die Anbindung vorbereiten.

PaperBoard ist ein benutzerdefiniertes HACS-Repository. Eine Aufnahme in das
HACS-Standardverzeichnis wurde noch nicht beantragt oder zugesagt.

## Manuelle Installation

Das vollständige Installations-ZIP so entpacken, dass
`/config/custom_components/paperboard/manifest.json` existiert.
Home Assistant neu starten und mit Schritt 4 fortfahren. Das Komplettpaket
enthält zusätzlich Dokumentation und ESPHome-Vorlage.

Die ZIPs sind **PaperBoard-Installationspakete**. Sie werden nicht mit dem alten
`eink_calendar`-Updater installiert, der eine andere Integration erwartet.

## Datenquellen und Editor

Unter **Datenquellen** normale Kalender, Abfall- und Feiertagskalender sowie
optionale Akku-, Temperatur- und Feuchtesensoren auswählen. Sensor- und
Wetterbausteine haben eigene Entitätsfelder. Es werden keine persönlichen
Kalender, IP-Adressen oder Zugangsdaten vorgegeben.

Der Editor zeigt vereinfachte Platzhalter zur Bearbeitung. Die **Displayvorschau**
darunter verwendet denselben Renderer wie der Bildendpunkt und ist für die
Beurteilung von Textumbrüchen und Farben maßgeblich. Alle Bausteine werden auf
ihren Bereich begrenzt. Die Zeichenfläche wird auf die Displayauflösung skaliert.
Für ein anderes Seitenverhältnis die Zeichenfläche entsprechend anpassen.

Schriftgröße und Höhe des Kalenderbausteins bestimmen, wie viele Termine pro Tag
Platz haben. Weitere Termine erscheinen als Überlaufhinweis.

## Vorhandenes E1002 und neue Geräte

Siehe [Geräteanbindung und ESPHome-Vorlage](esphome/README.md).
WLAN, API, OTA und IP vorhandener Geräte werden von PaperBoard nicht verändert.
Für eine Umstellung des Bildendpunkts muss die vorhandene ESPHome-Konfiguration
bewusst angepasst werden. Vorher deren Sicherung aufbewahren.

Die Bild-URL hat die Form `/api/paperboard/image/DISPLAYKENNUNG/0`.
Die letzte Zahl ist die Seitennummer ab 0. Nur Anfragen mit dem passenden
HTTP-Header `X-PaperBoard-Token` erhalten Bilder. Editor und Verbindungsdaten
sind Administratoren vorbehalten. Schlüssel nicht veröffentlichen.

## Prüfungen und Entwicklung

- `python -m pytest -q`: Layout-, Renderer- und (mit installierter HA-Testumgebung)
  Home-Assistant-Tests einschließlich Einrichtung, Speicherung, WebSocket und Bildabruf.
- `node --test tests/editor.test.js`: Geometrie- und Skalierungsprüfungen des Editors.
- `python tools/build.py`: Syntax, Versionen, 36 Vorschauen und ZIP-Prüfung.
- GitHub Actions: dieselben Prüfungen mit Home Assistant unter Linux, HACS-Prüfung
  und hassfest. Der jeweilige Lauf ist im Reiter **Actions** sichtbar.
- `python tools/dev_server.py`: lokaler Editor mit erfundenen Daten auf
  `http://127.0.0.1:8765`; keine Home-Assistant-Instanz und kein Hardwaretest.

Lokal werden Pillow 12.3.0, aiohttp, pytest und pytest-asyncio benötigt.
Die HA-Tests benötigen zusätzlich `pytest-homeassistant-custom-component` in
einer dazu passenden Linux-/Python-Umgebung. Ohne Home Assistant werden diese
Tests ausdrücklich übersprungen; das gilt nicht als bestandener Integrationstest.

Vor Veröffentlichungen werden Syntax, Laufzeit, Vorschauen, Paketinhalt und
Versionsgleichheit geprüft. Hardwareteststatus wird separat ausgewiesen.
Installationsarchive enthalten keine `__pycache__`, `.pyc` oder `.pyo`.

## Lizenz und Projekt

Quellcode: [MIT-Lizenz](LICENSE). Die unveränderten Ubuntu-Schriften unterliegen
der separat beigefügten Ubuntu Font Licence. DVAG-Schriften sind nicht enthalten.

PaperBoard ist ein unabhängiges Community-Projekt und nicht mit Seeed Studio
oder Home Assistant verbunden.
