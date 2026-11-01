"""Vollständiger generischer Firmwarebuild; niemals persönliche Zugangsdaten einbauen."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--work-dir',type=Path,required=True)
    args=parser.parse_args()
    target=args.work_dir.resolve()
    target.mkdir(parents=True,exist_ok=True)
    for name in ('paperboard-e1002-installer.yaml','partitions-e1002.csv'):
        shutil.copy2(ROOT/'esphome'/name,target/name)
    shutil.copytree(ROOT/'esphome'/'components',target/'components',dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
    env={**os.environ,'PLATFORMIO_CORE_DIR':str(target/'platformio')}
    subprocess.run([sys.executable,'-m','esphome','compile',str(target/'paperboard-e1002-installer.yaml')],
        check=True,env=env)
    project=target/'.esphome'/'build'/'paperboard-e1002'
    build=project/'build'
    if not (build/'firmware.factory.bin').is_file():build=project/'.pioenvs'/'paperboard-e1002'
    factory=build/'firmware.factory.bin'
    ota=build/'firmware.ota.bin'
    if not ota.is_file():ota=build/'firmware.bin'
    if not factory.is_file() or not ota.is_file():raise RuntimeError('Vollständige Firmwaredateien fehlen.')
    out=ROOT/'custom_components'/'paperboard'/'firmware'
    out.mkdir(exist_ok=True)
    entries=[]
    for kind,path in [('factory',factory),('ota',ota)]:
        content=path.read_bytes()
        if not 100000<len(content)<0x400000:raise ValueError('Unerwartete Firmwaregröße.')
        name=f'paperboard-e1002.{kind}.bin'
        (out/name).write_bytes(content)
        entries.append({'kind':kind,'file':name,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()})
    version=json.loads((ROOT/'custom_components'/'paperboard'/'manifest.json').read_text())['version']
    if version!='0.2.0':raise ValueError('Firmwareversion muss zur Integration passen.')
    manifest={'version':version,'model':'e1002','chip':'ESP32-S3','flash_size':'32MB',
              'config_offset':0x1ff0000,'config_size':65536,'firmware':entries}
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(manifest,indent=2))

if __name__=='__main__':main()
