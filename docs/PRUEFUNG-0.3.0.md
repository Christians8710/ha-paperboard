# Prüfstand PaperBoard 0.3.0

## Freigabekriterien

Vor Veröffentlichung müssen die GitHub-Prüfungen für den endgültigen Stand grün
sein: Python-/Home-Assistant-Tests, JavaScript-Tests, Syntax, HACS, hassfest,
ESPHome-Konfiguration und Codegenerierung sowie Paketbau mit 36 PNG-Renderläufen.
Die E1002-Firmware wird vollständig kompiliert und mit SHA-256-Prüfsummen gebündelt.
Paket-, Manifest-, Renderer-, Installer- und Firmwareversion sind 0.3.0.
Installationsarchive enthalten keine `__pycache__`, `.pyc` oder `.pyo`.

Die konkreten Ergebnisse stehen in den
[GitHub-Actions-Läufen](https://github.com/Christians8710/ha-paperboard/actions)
und im angehängten Prüfbericht der Veröffentlichung.

## Sicht- und Bedienprüfung der Gestaltung

Die Oberfläche wurde in Chrome mit erfundenen Daten geprüft:

- Desktop mit 1280 und 1905 Pixeln, schmale Ansichten mit 320 und 390 Pixeln.
- Auf 200 Prozent vergrößerte Schrift; keine horizontalen Seitenüberläufe in
  den geprüften Ansichten, auch bei langen Gerätenamen.
- Editor, Datenquellen, Gerätebereich und eigenständige Installeransicht.
- Hinzufügen/Bearbeiten/Entfernen eines Textbausteins, Speichern und Vorschau.
- Tastaturbedienung, Fokusbegrenzung im Dialog, Escape und Fokus-Rückkehr.
- Lade- und Leerzustand, Speicher- und Vorschaufehler sowie fehlende Firmware.
- Erhalt eingegebener Werte bei Formular- und Speicherfehlern.
- Lokal eingebettetes, unverändertes Logo im eigenständigen Installer.

Die geprüften grundlegenden Farbpaarungen erreichen mindestens 6,64:1 Kontrast.
Die Sichtprüfung ist keine umfassende Zertifizierung der Barrierefreiheit.
Die lokale Vorschau sperrt USB-Zugriffe; die Schreibabläufe werden zusätzlich
mit simulierten Geräten getestet.

## Bestehende Installationen

Das Designupdate benötigt keinen Firmwarewechsel auf einem vorhandenen Display.
Layouts, Gerätezugänge und Bildschnittstellen bleiben erhalten. Die neu gebaute
0.3.0-Firmware ist für eine ausdrücklich bestätigte Neuinstallation über den
Installer vorgesehen. Das Update selbst beschreibt kein Gerät.

## Grenzen

- Kein Home-Assistant-Livetest auf der persönlichen Installation und kein
  tatsächlicher USB-Schreibvorgang oder Hardwaretest am E1002.
- Der angeschlossene andere ESP wurde nicht angesprochen oder geflasht.
- Die eigenständige Installeransicht ist unter localhost geprüft. Ihre Ausführung
  als `file://`-Datei ist wegen der Browserbeschränkung weiterhin ungeprüft.
- HA-eigene Einrichtungsdialoge verwenden weiterhin das Home-Assistant-Design.
- E1001/E1003/E1004 bleiben Ausgabeprofile ohne freigegebene Gerätefirmware;
  automatischer Tiefschlaf ist nicht enthalten.
- Sponsoring-Konfiguration und README-Link bleiben erhalten. Der offizielle
  Sponsor-Button war im geprüften Repository nicht sichtbar; das angemeldete
  Konto zeigte das Sponsors-Profil als Vorschau. Die Ursache ist nicht abschließend
  geklärt; es wurden keine Sponsors- oder Repository-Einstellungen geändert.
