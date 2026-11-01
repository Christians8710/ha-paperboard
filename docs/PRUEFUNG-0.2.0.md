# Prüfstand PaperBoard 0.2.0

Stand: 01.11.2026. Vorabversion mit vollständiger E1002-Installer-Firmware.

## Bestandene Prüfungen

- 78 Python-/Home-Assistant-Tests unter Linux mit Home Assistant 2026.10.4.
  Einschließlich Einrichtung, Speicherung, WebSocket-Administratorschutz,
  Bildabruf/ETag, dauerhaft gespeicherter individueller Installerzugänge,
  authentifizierter Gerätemeldungen und fragmentierter HTTP-Anfragen.
- 11 JavaScript-Tests: Editor sowie USB-Konfigurationsformat, Firmware-Prüfsumme,
  falscher Chip, falsche Flashgröße, Schreibfehler, Verbindungsabbau und Neustart
  erst nach erfolgreicher Schreibprüfung. USB-Verhalten wird dabei simuliert.
- Python- und JavaScript-Syntax, Paket-/Manifest-/Renderer-/Firmwareversion 0.2.0.
- 36 echte PNG-Renderläufe: drei Kalenderseiten, vier Modelle, jeweils leere,
  normale und dicht belegte Kalender; Bildgrößen und Farbpaletten werden geprüft.
- Integrations- und Komplettpaket mit Logo, lokalen Installerbibliotheken,
  deren Lizenzen und beiden Firmwaredateien. Keine Bytecode-/Cachedateien.
- HACS und hassfest erfolgreich.
- E1002-ESPHome-Konfiguration und Codegenerierung erfolgreich.

[Prüflauf 8f432d5](https://github.com/Christians8710/ha-paperboard/actions/runs/41298557776).
Eine abschließende Anpassung sperrt USB-Schreiben ausschließlich im lokalen
Entwicklungsprüfstand, auch in daraus exportierten Test-Installerdateien.

## Vollständige Firmware-Kompilierung

ESPHome 2026.10.1 hat Bootloader und Anwendung einschließlich der eigenen
USB-Konfigurationskomponente vollständig für ESP32-S3/32 MB kompiliert.
Die gebündelten Binärdateien stammen aus
[Build d14e8de](https://github.com/Christians8710/ha-paperboard/actions/runs/41297998228).
Der Firmwarequellcode ist seither unverändert; spätere Änderungen betreffen
Oberfläche, Tests und Dokumentation. Größe und SHA-256 stehen in
`custom_components/paperboard/firmware/manifest.json` und werden vor dem
Paketbau sowie vor dem USB-Schreiben nochmals geprüft.

## Sicht- und Bedienprüfung

In Chrome geprüft: unverändertes angenommenes PaperBoard-Logo, Gerätebereich,
Laden der tatsächlichen kompilierten Firmware, Installerformular und Herunterladen
der eigenständigen HTML-Datei. Die lokale Vorschau hat keinen USB-Schreibzugriff.
Die heruntergeladene Datei enthält alle benötigten Skripte und Firmwarebytes;
die Browserautomatisierung erlaubt keinen Aufruf von `file://`. Daher ist die
Ausführung dieser Variante als lokale Datei noch nicht praktisch bestätigt.

## Noch am echten E1002 zu bestätigen

- USB-Portauswahl und tatsächliches Löschen/Schreiben/Neustarten.
- WLAN-Anmeldung, HTTPS-Zeitabgleich, erfolgreiche Gerätemeldung und Bildanzeige.
- Alle drei Tasten, Akku-/Temperatur-/Feuchtemessung sowie API- und OTA-Zugang.
- Automatische Änderung von Seitenzahl, Ausrichtung und Abrufabstand am Gerät.

Der aktuell angeschlossene andere ESP wurde nicht geöffnet oder geflasht.
Kein echter E1002-Hardwaretest ist durch Softwaretests ersetzt oder zugesagt.
E1001/E1003/E1004 bleiben Ausgabeprofile ohne freigegebene Gerätefirmware.
Automatischer Tiefschlaf gehört nicht zu dieser Version.
