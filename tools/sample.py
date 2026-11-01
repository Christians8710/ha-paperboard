"""Ausschließlich erfundene Daten für Vorschauen und lokale UI-Prüfung."""
from datetime import datetime, timedelta, timezone
import importlib
from pathlib import Path
import sys
import types

ROOT=Path(__file__).resolve().parents[1]
pkg=types.ModuleType('paperboard_preview')
pkg.__path__=[str(ROOT/'custom_components'/'paperboard')]
sys.modules.setdefault('paperboard_preview',pkg)
layout=importlib.import_module('paperboard_preview.layout')
renderer=importlib.import_module('paperboard_preview.renderer')
const=importlib.import_module('paperboard_preview.const')
NOW=datetime(2026,11,1,9,0,tzinfo=timezone(timedelta(hours=1)))


def sample(scenario='normal'):
    doc=layout.default_layout()
    sources=[{'entity':'calendar.familie','label':'Familie','color':'blue','private_titles':False},
             {'entity':'calendar.arbeit','label':'Arbeit','color':'green','private_titles':False}]
    doc['bindings'].update(calendars=sources,waste_calendar='calendar.abfall',holiday_calendar='calendar.feiertage',
        battery_entity='sensor.akku',temperature_entity='sensor.temperatur',humidity_entity='sensor.feuchte')
    data={'bindings':doc['bindings'],'calendar_sources':sources,'calendars':{},'states':{
        'sensor.akku':{'state':'82','attributes':{'unit_of_measurement':'%'}},
        'sensor.temperatur':{'state':'21,5','attributes':{'unit_of_measurement':'°C'}},
        'sensor.feuchte':{'state':'48','attributes':{'unit_of_measurement':'%'}},
        'weather.zuhause':{'state':'partlycloudy','attributes':{'temperature':17,'temperature_unit':'°C'}}}}
    titles=['Frühstück mit der Familie','Besprechung im Büro','Sportverein','Zahnarzt','Elternabend','Einkaufen']
    for source in sources:
        events=[]
        for day in range(14):
            for j in range(6 if scenario=='dense' else 1):
                start=(NOW+timedelta(days=day)).replace(hour=10+j)
                events.append({'summary':titles[(day+j)%len(titles)],'start':start.isoformat(),'end':(start+timedelta(hours=1)).isoformat()})
        data['calendars'][source['entity']]=events if scenario!='empty' else []
    data['calendars']['calendar.abfall']=[] if scenario=='empty' else [
        {'summary':title,'start':f'2026-11-{day:02}','end':f'2026-11-{day+1:02}'}
        for title,day in [('Restmülltonne',2),('Gelber Sack',4),('Biotonne',6),('Papiertonne',6)]]
    data['calendars']['calendar.feiertage']=[] if scenario=='empty' else [{'summary':'Weihnachten','start':'2026-12-25','end':'2026-12-26'}]
    return layout.validate_layout(doc),data
