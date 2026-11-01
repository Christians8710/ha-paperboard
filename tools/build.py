"""Prüfen, Vorschauen erzeugen und vollständige Archive bauen."""
from __future__ import annotations
import ast
import hashlib
from io import BytesIO
import json
from pathlib import Path
import zipfile
from PIL import Image
from sample import ROOT,NOW,sample,renderer,const
import importlib
import re


def main():
    source=ROOT/'custom_components'/'paperboard'
    manifest=json.loads((source/'manifest.json').read_text(encoding='utf-8'))
    package=json.loads((ROOT/'paperboard-update.json').read_text(encoding='utf-8'))
    assert manifest['version']==package['version']==const.VERSION==renderer.RENDER_VERSION
    version=const.VERSION
    for name in ('panel.js','installer-ui.js'):
        asset_versions=re.findall(r'\?v=(\d+\.\d+\.\d+)',(source/'frontend'/name).read_text(encoding='utf-8'))
        assert asset_versions and all(v==version for v in asset_versions), 'Frontend-Versionen stimmen nicht überein: '+name
    firmware=importlib.import_module('paperboard_preview.installer').load_firmware(source/'firmware')
    if not firmware.get('available'):raise RuntimeError('Geprüfte E1002-Firmware fehlt: '+firmware.get('error',''))
    for path in source.rglob('*.py'):
        ast.parse(path.read_text(encoding='utf-8'),filename=str(path))
    for path in source.rglob('*.json'):
        json.loads(path.read_text(encoding='utf-8'))
    assert (source/'translations'/'de.json').read_bytes()==(source/'strings.json').read_bytes()
    dist=ROOT/'dist';dist.mkdir(exist_ok=True)
    previews=dist/'Vorschauen';previews.mkdir(exist_ok=True)
    rendered=[]
    for scenario in ('empty','normal','dense'):
        doc,data=sample(scenario)
        for model in const.MODELS:
            for page in range(3):
                raw=renderer.render_png(doc,page,{'model':model},data,NOW)
                image=Image.open(BytesIO(raw));image.verify()
                name=f'{model}-{scenario}-seite-{page+1}.png'
                (previews/name).write_bytes(raw);rendered.append(name)
    paths=[p for p in source.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ('.pyc','.pyo')]
    outputs=[]
    firmware_source=[p for p in (ROOT/'esphome').rglob('*') if p.is_file() and p.suffix in ('.yaml','.md','.csv','.h','.cpp','.py') and '.esphome' not in p.parts and '__pycache__' not in p.parts]
    for label,extra in [('Integration',[]),('Komplettpaket',firmware_source+list((ROOT/'docs').rglob('*.md'))+[ROOT/'README.md',ROOT/'LICENSE',ROOT/'hacs.json',ROOT/'paperboard-update.json'])]:
        archive=dist/f'PaperBoard-{label}-{version}.zip'
        with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
            for path in sorted(paths+extra): z.write(path,path.relative_to(ROOT).as_posix())
        with zipfile.ZipFile(archive) as z:
            assert z.testzip() is None
            assert 'custom_components/paperboard/manifest.json' in z.namelist()
            assert not any('__pycache__' in n or n.endswith(('.pyc','.pyo')) for n in z.namelist())
            assert json.loads(z.read('custom_components/paperboard/manifest.json'))['version']==version
        outputs.append({'datei':archive.name,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()})
    report={'version':version,'syntax':'bestanden','versionsgleichheit':'bestanden','zip':'bestanden',
        'renderlaeufe':len(rendered),'vorschauen':rendered,'archive':outputs,
        'firmware':firmware,'grenzen':['Hardwaretest und tatsächlicher USB-Schreibvorgang ausstehend','Kein automatischer Tiefschlaf',
                   'Home-Assistant-Laufzeittests separat im CI-Lauf prüfen; dieses Skript ersetzt sie nicht']}
    (dist/'Pruefbericht.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='vorschauen'},ensure_ascii=False,indent=2))

if __name__=='__main__':main()
