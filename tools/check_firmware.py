"""ESPHome-Prüfung in einem temporären Ordner mit neu erzeugten Testschlüsseln."""
import base64
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import tempfile

root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='paperboard-firmware-') as tmp:
    target=Path(tmp)
    shutil.copy2(root/'esphome'/'paperboard-e1002.yaml',target/'paperboard-e1002.yaml')
    (target/'secrets.yaml').write_text(
        'wifi_ssid: "PaperBoard-Testnetz"\nwifi_password: "Nur-ein-Testwert"\n'
        f'paperboard_api_key: "{base64.b64encode(secrets.token_bytes(32)).decode()}"\n'
        f'paperboard_ota_password: "{secrets.token_urlsafe(24)}"\n'
        f'paperboard_token: "{secrets.token_urlsafe(32)}"\n',encoding='utf-8')
    for args in [('config',),('compile','--only-generate')]:
        result=subprocess.run([sys.executable,'-m','esphome',*args,str(target/'paperboard-e1002.yaml')],
            capture_output=True,text=True,encoding='utf-8',errors='replace')
        if result.returncode:
            print(result.stdout[-5000:]);print(result.stderr[-3000:]);raise SystemExit(result.returncode)
        print('ESPHome '+ ' '.join(args)+': bestanden')
print('Keine Hardwareprüfung oder vollständige C++-Kompilierung.')
