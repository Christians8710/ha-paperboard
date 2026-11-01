# PaperBoard

Frei gestaltbare E-Paper-Dashboards für Home Assistant.

PaperBoard soll einen visuellen Dashboard-Editor und eine geführte Geräteeinrichtung für E-Paper-Displays bieten. Den Anfang machen die Seeed reTerminal E1001, E1002, E1003 und E1004. Der Aufbau soll später auch Geräte anderer Hersteller ermöglichen.

## Entwicklungsstand

Das Projekt befindet sich am Anfang der Entwicklung. Dieses Repository enthält bisher die Projektbeschreibung und den Entwicklungsplan, noch keine installierbare Integration. Eine HACS-Version oder Gerätefirmware steht hier noch nicht zum Download bereit.

Die Grundlage bildet ein bestehender persönlicher E1002-Kalender-Renderer in Version 1.2.6. Persönliche Konfiguration und Zugangsdaten sind nicht Bestandteil dieses öffentlichen Repositorys. Das E1002 ist das erste verfügbare Testgerät; die übrigen Modelle benötigen noch Hardwaretests.

## Geplante Funktionen

- Home-Assistant-Integration mit Installation und Updates über HACS.
- Geführte Modellauswahl, USB-Installation der Firmware und Verbindung des Geräts.
- Visueller Editor mit freier Positionierung, Größenänderung, optionalem Raster, Ausrichtungshilfen und Vorschau.
- Mehrere Displays mit jeweils eigenen Seiten und Einstellungen.
- Bausteine für Kalender, Abfalltermine, Feiertage, Wetter, Sensorwerte, Text und Gerätestatus.
- Kalendervorlagen für Heute/Nächste Termine, 7 Tage und 14 Tage.
- Wählbare Betriebsarten für Netz- und Akkubetrieb mit passenden Aktualisierungen.
- Geräteprofile für Auflösung, Farbpalette, Hardwaretasten und unterstützte Bedienfunktionen.
- Lokale Bilderzeugung in Home Assistant und Übertragung an das Display.
- Zunächst deutsche Bedienoberfläche und Dokumentation; weitere Sprachen können später folgen.

## Entwicklungsplan

1. Wiederverwendbare Darstellung, Geräteprofile und persönliche Konfiguration voneinander trennen.
2. Grafische Einrichtung, dauerhafte Speicherung und Verwaltung mehrerer Displays umsetzen.
3. Den visuellen Editor entwickeln und die Kalenderansichten als bearbeitbare Vorlagen übernehmen.
4. Einen geführten Firmware-Installer und den Ablauf für Geräteupdates ergänzen.
5. Auf dem E1002 testen und anschließend E1001, E1003 und E1004 mit Unterstützung weiterer Tester prüfen.
6. Geprüfte HACS-kompatible Versionen und vollständige Installations-ZIPs veröffentlichen.

## Vorgaben für Veröffentlichungen

Vor jeder Veröffentlichung werden Syntax, Laufzeit, Vorschauen, ZIP-Inhalt und Versionsgleichheit geprüft. Paket-, Manifest- und Renderer-Version müssen übereinstimmen. Installationsarchive dürfen keine `__pycache__`-Ordner und keine `.pyc`- oder `.pyo`-Dateien enthalten. Hardwaretests und bekannte Einschränkungen werden dokumentiert.

WLAN-, API-, OTA- und IP-Einstellungen vorhandener Geräte werden nur auf ausdrücklichen Nutzerauftrag geändert.

## Unabhängiges Projekt

PaperBoard ist ein unabhängiges Community-Projekt und steht in keiner Verbindung zu Seeed Studio oder Home Assistant.
