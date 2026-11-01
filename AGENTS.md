# PaperBoard

- Zunächst alle nutzersichtbaren Texte und Dokumentation auf Deutsch.
- Angenommenes Projektlogo: `assets/brand/paperboard-logo-entwurf.png` (Nutzerfreigabe 01.11.2026). Beim nächsten Update in Integration und GitHub-Darstellung einbinden; Logoquelle erhalten, kleine Symbolvarianten separat ableiten. Bestehende Version 0.1.0 nicht nachträglich verändern.
- Herstellerunabhängige Geräteprofile; zunächst Seeed reTerminal E1001–E1004. E1002 ist das verfügbare Testgerät, andere Hardware ehrlich als ungetestet kennzeichnen.
- Mehrere Displays, freier visueller Editor, Kalender als zentrale Vorlage, Netz- und Akkubetrieb.
- Keine WLAN-/API-/OTA-/IP-Änderungen an vorhandenen Geräten ohne ausdrücklichen Auftrag. Kein automatisches Flashen ohne bewussten Start durch den Nutzer.
- Keine persönlichen Entitäten, IPs oder Zugangsdaten aus dem privaten E1002-Projekt veröffentlichen. DVAG-Schriften nicht mitliefern.
- Vor Releases Syntax-, Laufzeit-, Preview-, ZIP- und Versionsprüfungen. Keine __pycache__, .pyc oder .pyo in Archiven. Paket-, Manifest- und Renderer-Version identisch.
- Vollständige Installations-ZIPs liefern. HACS-Integration und Gerätefirmware getrennt behandeln.
- Keine Hardware- oder Home-Assistant-Liveprüfung behaupten, wenn nur automatisierte isolierte Tests liefen.
