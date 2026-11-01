"""Prüfbare Firmwaremetadaten und gerätespezifische Installationszugänge."""
from __future__ import annotations
import base64
import hashlib
import json
import math
from pathlib import Path
import re
import secrets
from urllib.parse import urlsplit
from .const import VERSION

CONFIG_OFFSET = 0x1FF0000
CONFIG_SIZE = 65536


def load_firmware(directory: Path):
    try:
        manifest=json.loads((directory/'manifest.json').read_text(encoding='utf-8'))
        if manifest['version']!=VERSION or manifest['model']!='e1002' or manifest['chip']!='ESP32-S3':
            raise ValueError('Firmwareversion oder Modell passt nicht.')
        if manifest['config_offset']!=CONFIG_OFFSET or manifest['config_size']!=CONFIG_SIZE or manifest['flash_size']!='32MB':
            raise ValueError('Falsches Partitionslayout.')
        files={}
        for item in manifest['firmware']:
            kind=item['kind']
            if kind not in ('factory','ota') or kind in files or item['file']!=f'paperboard-e1002.{kind}.bin':
                raise ValueError('Unerwartete Firmwaredatei.')
            raw=(directory/item['file']).read_bytes()
            if len(raw)!=item['bytes'] or not 100000<len(raw)<0x400000 or hashlib.sha256(raw).hexdigest()!=item['sha256']:
                raise ValueError('Prüfsumme oder Dateigröße ist falsch.')
            files[kind]={**item,'url':'/paperboard_firmware/'+item['file']}
        if set(files)!= {'factory','ota'}:raise ValueError('Firmware unvollständig.')
        return {**manifest,'available':True,'files':files}
    except (OSError,ValueError,KeyError,TypeError) as err:
        return {'available':False,'error':str(err),'version':VERSION,'model':'e1002'}


def installation_credentials():
    key=secrets.token_bytes(32)
    return {'install_id':secrets.token_hex(16),'api_key_hex':key.hex(),
            'api_key':base64.b64encode(key).decode('ascii'),'ota_password':secrets.token_urlsafe(32)}


def validate_base_url(value):
    if not isinstance(value,str) or len(value)>500:raise ValueError('Ungültige Home-Assistant-Adresse.')
    value=value.strip().rstrip('/')
    try:
        parsed=urlsplit(value)
        port=parsed.port
    except ValueError as err:raise ValueError('Ungültige Home-Assistant-Adresse.') from err
    if parsed.scheme not in ('http','https') or not parsed.hostname or parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment:
        raise ValueError('Bitte eine HTTP-/HTTPS-Basisadresse ohne Pfad oder Zugangsdaten eingeben.')
    if parsed.hostname.lower() in ('localhost','127.0.0.1','0.0.0.0','::1') or (port is not None and not 1<=port<=65535):
        raise ValueError('Die Home-Assistant-Adresse muss vom E1002 im WLAN erreichbar sein.')
    if any(c.isspace() for c in value):raise ValueError('Die Adresse darf keine Leerzeichen enthalten.')
    return value


def validate_telemetry(raw, install_id):
    if not isinstance(raw,dict) or raw.get('model')!='e1002':raise ValueError('Ungültiges Gerätemodell.')
    if not isinstance(raw.get('install_id'),str) or not secrets.compare_digest(raw['install_id'],install_id):
        raise ValueError('Unbekannte Installation.')
    version=raw.get('version','')
    boot=raw.get('boot_id','')
    if not isinstance(version,str) or not re.fullmatch(r'\d{1,3}\.\d{1,3}\.\d{1,3}',version):raise ValueError('Ungültige Firmwareversion.')
    if not isinstance(boot,str) or not re.fullmatch(r'\d{1,10}',boot):raise ValueError('Ungültige Startkennung.')
    result={'version':version,'boot_id':boot,'downloaded':raw.get('downloaded') is True}
    for key,low,high in [('battery',0,100),('temperature',-40,85),('humidity',0,100)]:
        if key in raw:
            v=raw[key]
            if type(v) not in (int,float) or not math.isfinite(v) or not low<=v<=high:
                raise ValueError('Ungültiger Messwert.')
            result[key]=round(v,1)
    return result
