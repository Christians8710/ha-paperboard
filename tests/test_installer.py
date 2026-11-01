"""Firmwareprüfung und Telemetrievalidierung ohne echte Zugangsdaten."""
import base64
import hashlib
import importlib
import json
from pathlib import Path
import sys
import types
import pytest

ROOT=Path(__file__).resolve().parents[1]
pkg=types.ModuleType('paperboard_core');pkg.__path__=[str(ROOT/'custom_components'/'paperboard')]
sys.modules.setdefault('paperboard_core',pkg)
installer=importlib.import_module('paperboard_core.installer')


def firmware(directory):
    entries=[]
    for kind in ('factory','ota'):
        raw=b'\xe9'*120000;name=f'paperboard-e1002.{kind}.bin';(directory/name).write_bytes(raw)
        entries.append({'kind':kind,'file':name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
    manifest={'version':'0.3.0','model':'e1002','chip':'ESP32-S3','flash_size':'32MB','config_offset':0x1ff0000,'config_size':65536,'firmware':entries}
    (directory/'manifest.json').write_text(json.dumps(manifest));return manifest


def test_firmware_hash_and_version_are_required(tmp_path):
    manifest=firmware(tmp_path)
    assert installer.load_firmware(tmp_path)['available']
    (tmp_path/'paperboard-e1002.factory.bin').write_bytes(b'corrupt')
    assert not installer.load_firmware(tmp_path)['available']
    firmware(tmp_path);manifest['version']='0.1.0';(tmp_path/'manifest.json').write_text(json.dumps(manifest))
    assert not installer.load_firmware(tmp_path)['available']


def test_firmware_paths_are_not_trusted(tmp_path):
    m=firmware(tmp_path);m['firmware'][0]['file']='../outside.bin';(tmp_path/'manifest.json').write_text(json.dumps(m))
    assert not installer.load_firmware(tmp_path)['available']


def test_each_installation_has_private_random_credentials():
    a,b=installer.installation_credentials(),installer.installation_credentials()
    assert a!=b and len(bytes.fromhex(a['api_key_hex']))==32
    assert base64.b64decode(a['api_key'])==bytes.fromhex(a['api_key_hex'])
    assert len(a['ota_password'])>=32 and len(a['install_id'])==32


@pytest.mark.parametrize('url',['http://localhost:8123','http://127.0.0.1','https://a:b@example.com','file:///config','https://example.com/api','https://example.com/?token=x'])
def test_invalid_device_addresses(url):
    with pytest.raises(ValueError):installer.validate_base_url(url)


def test_valid_device_address():
    assert installer.validate_base_url('http://homeassistant.local:8123/')=='http://homeassistant.local:8123'


def test_existing_020_device_remains_compatible_without_flashing():
    raw={'model':'e1002','version':'0.2.0','install_id':'a'*32,'boot_id':'123',
         'downloaded':True,'battery':82,'temperature':21.5,'humidity':48}
    result=installer.validate_telemetry(raw,'a'*32)
    assert result=={'version':'0.2.0','boot_id':'123','downloaded':True,
                    'battery':82,'temperature':21.5,'humidity':48}


@pytest.mark.parametrize('patch',[{'battery':101},{'battery':True},{'temperature':float('nan')},{'humidity':-1},{'version':'<script>'},{'model':'e1004'},{'install_id':'wrong'}])
def test_bad_telemetry(patch):
    raw={'model':'e1002','version':'0.3.0','install_id':'a'*32,'boot_id':'123',**patch}
    with pytest.raises(ValueError):installer.validate_telemetry(raw,'a'*32)
