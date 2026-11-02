# Prüfung von PaperBoard 0.3.1

Stand: 02.11.2026. Oberflächenupdate; bestehende Geräte benötigen kein Flashen.

- Python-Syntax, lokale Laufzeittests und 36 Renderer-Vorschauen geprüft.
- JavaScript: 13 Tests einschließlich HA-Moduswechsel und Kontrasten beider Paletten.
- Browser: helle Desktopansicht, dunkle Smartphoneansicht (375 × 812), helle Smartphoneansicht mit 200 % Schrift; kein horizontaler Seitenüberlauf.
- Breitenänderung 400 → 380, Rückgängig → 400 und Wiederholen → 380 im Browser geprüft. Aktionsverfügbarkeit nach Eingaben korrigiert.
- Größengriff: 44 Pixel breite Berührungsfläche, Höhe/Breite auf kleine Bausteine begrenzt; sichtbares Ecksymbol weiterhin 14 × 14 Pixel. Präzise Eingabe über Eigenschaftenfelder möglich.
- Eigenständige Installer folgen per CSS der Betriebssystemeinstellung; Home-Assistant-Modus hat in der Integration Vorrang, ohne Formularneuladen bei Moduswechsel.
- E1002-Firmware 0.3.1 vollständig auf GitHub kompiliert, Build 41408628215. Artefakt-SHA-256 vor Übernahme geprüft.
- Installationsarchive: Versionsgleichheit, ZIP-Integrität und Abwesenheit von Python-Bytecode werden durch tools/build.py geprüft.
- Sponsoring, Logo, Lizenz und Geräteverbindungsverhalten bleiben erhalten.

Die Home-Assistant-, HACS- und hassfest-Prüfungen laufen zusätzlich auf GitHub. Maßgeblich ist der erfolgreiche Lauf zum Release-Commit.

Kein angeschlossenes USB-Gerät geöffnet oder geflasht. Keine Prüfung auf physischem E1002 oder in der produktiven Home-Assistant-Installation. Ein vollständiger Screenreader-Test steht aus.

Referenzen zur Modusanbindung: Home Assistant Frontend, `hass.themes.darkMode` sowie die offizielle Beschreibung eigener Panels:
https://contributors.home-assistant.io/frontend/custom-ui/panel/
https://github.com/home-assistant/frontend/blob/dev/src/types.ts
