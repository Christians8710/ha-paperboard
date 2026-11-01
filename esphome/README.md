# Geräteanbindung

Die Home-Assistant-Integration erzeugt PNG-Bilder. Das Display lädt diese mit
einem eigenen Schlüssel ab. Die Einrichtung in Home Assistant allein flasht kein
Gerät. Für eine ausdrücklich gewählte E1002-Neuinstallation gibt es ab 0.2.0
den geführten USB-Installer unter **PaperBoard → Gerät & Verbindung**.

## Vorhandenes E1002 weiterverwenden

Die vorhandene YAML zuerst sichern. WLAN, API, OTA und IP unverändert lassen.
In PaperBoard unter **Gerät & Verbindung → Verbindungsdaten anzeigen** stehen
der neue Bildpfad und der Header `X-PaperBoard-Token`.

Bei einer bewussten Umstellung nur die Bild-URLs (auch bei allen Tasten),
den Header und den zugehörigen geheimen Schlüssel anpassen. Die bisherige
Integration `eink_calendar` kann bis zur erfolgreichen Umstellung parallel
installiert bleiben. PaperBoard übernimmt keine persönlichen Daten automatisch.

## Neues E1002 mit USB-Installer (empfohlen)

Der Installer bringt vollständig kompilierte Firmware mit. Es sind keine
persönliche YAML-Datei und kein ESPHome-Build erforderlich. Chrome oder Edge,
ein USB-Datenkabel, ein 2,4-GHz-WLAN und eine vom Display erreichbare
Home-Assistant-Adresse werden benötigt. Bei einer normalen HTTP-Adresse
den eigenständigen Installer herunterladen und lokal in Chrome/Edge öffnen.

Die bestätigte Neuinstallation löscht alle bisherigen Einstellungen, schreibt
die Firmware sowie persönliche Zugangsdaten, prüft beide und startet das Gerät.
Die neue Installation verwendet DHCP, eigene API-/OTA-Zugänge und den
Bildschlüssel des ausgewählten PaperBoard-Displays. Seitenzahl, Ausrichtung und
Abrufabstand kommen anschließend automatisch von Home Assistant. Die drei
Hardwaretasten wechseln zurück/vor und fordern eine Aktualisierung an.

Die Gerätezugänge und die private Installerdatei sicher aufbewahren. Es wird
kein echtes Gerät automatisch ohne USB-Auswahl und Löschbestätigung beschrieben.
Für die Browser- und WLAN-Anmeldung sowie die echte Anzeige steht ein
physischer E1002-Test noch aus. Details im Haupt-README.

## Neues E1002 mit eigener ESPHome-Konfiguration (Alternative)

`paperboard-e1002.yaml` ist eine vollständige ESPHome-Vorlage für ein neues Gerät.
Sie enthält keine echten Zugangsdaten und keine feste IP. ESPHome ab 2026.10.1
wird vorausgesetzt. Vor Installation `ha_base_url`, `paperboard_entry`,
`page_count` und `refresh_interval` passend setzen und in der eigenen
`secrets.yaml` diese Werte hinterlegen:

```yaml
wifi_ssid: "Dein WLAN"
wifi_password: "Dein WLAN-Passwort"
paperboard_api_key: "Dein eigener ESPHome-Verschlüsselungsschlüssel"
paperboard_ota_password: "Dein eigenes OTA-Passwort"
paperboard_token: "Display-Schlüssel aus PaperBoard"
```

Die HTTPS-Adresse muss vom Display erreichbar sein und ein gültiges Zertifikat
haben. Für eine lokale HTTP-Adresse wird keine Zertifikatsprüfung benötigt;
Schlüssel und Bilddaten werden dabei im lokalen Netz unverschlüsselt übertragen.
Die Vorlage deaktiviert keine HTTPS-Zertifikatsprüfung.

Die erste Installation erfolgt im ESPHome Device Builder über USB. Anschließend
sind die dort konfigurierten OTA-Updates möglich. Die Anzahl der Seiten muss in
dieser manuellen Vorlage mit `page_count` abgeglichen werden. Das betrifft nicht
die neue Installer-Firmware `paperboard-e1002-installer.yaml`.

## Akkubetrieb und weitere Modelle

Die Integration speichert Netz-/Akkuprofil und gewünschten Abrufabstand.
Ein Energiesparprofil in der Integration allein aktiviert keinen Tiefschlaf.
Die E1002-Vorlage bleibt erreichbar und nutzt den angegebenen Abrufabstand.
Automatischer Tiefschlaf, Aufwecken über Tasten und sichere OTA-Wartungsfenster
sind noch nicht implementiert.

E1001, E1003 und E1004 haben eigene Bildausgabeprofile in der Integration.
Gerätefirmware und Touchbedienung sind für diese Modelle noch nicht freigegeben.
Nicht einfach das E1002-YAML auf diesen Geräten installieren.

Grundlagen: [ESPHome Online Image](https://esphome.io/components/image/online_image/)
und [ePaper SPI](https://esphome.io/components/display/epaper_spi/).
