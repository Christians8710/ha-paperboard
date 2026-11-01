"""Echte Rendering- und Formatprüfungen ohne Home-Assistant-Ersatzobjekte."""
from __future__ import annotations
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from io import BytesIO
import importlib
from pathlib import Path
import sys
import types
from unittest.mock import patch
import pytest
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
pkg = types.ModuleType("paperboard_core")
pkg.__path__ = [str(ROOT / "custom_components" / "paperboard")]
sys.modules.setdefault("paperboard_core", pkg)
layout_module = importlib.import_module("paperboard_core.layout")
renderer = importlib.import_module("paperboard_core.renderer")
const = importlib.import_module("paperboard_core.const")
validate, defaults = layout_module.validate_layout, layout_module.default_layout
NOW = datetime(2026, 11, 1, 9, 0, tzinfo=timezone(timedelta(hours=1)))


def example_data(dense=False):
    sources = [{"entity":"calendar.beispiel", "label":"Familie", "color":"blue"}]
    events=[]
    for day in range(14):
        for hour in ((10, 11, 12, 13, 14, 15) if dense else (10,)):
            start = (NOW+timedelta(days=day)).replace(hour=hour)
            events.append({"summary":"Besprechung mit langem Titel – Grüße aus München", "start":start.isoformat(), "end":(start+timedelta(hours=1)).isoformat()})
    return {"calendar_sources":sources, "calendars":{"calendar.beispiel":events,
        "calendar.abfall":[{"summary":s, "start":"2026-11-02", "end":"2026-11-03"} for s in ["Restmülltonne","Gelber Sack","Biotonne","Papiertonne"]],
        "calendar.feiertage":[{"summary":"Weihnachten", "start":"2026-12-25", "end":"2026-12-26"}]},
        "bindings":{"waste_calendar":"calendar.abfall", "holiday_calendar":"calendar.feiertage", "battery_entity":"sensor.akku"},
        "states":{"sensor.akku":{"state":"82","attributes":{"unit_of_measurement":"%"}},
                  "sensor.temperatur":{"state":"21.5","attributes":{"unit_of_measurement":"°C"}},
                  "weather.beispiel":{"state":"sunny","attributes":{"temperature":19,"temperature_unit":"°C"}}}}


@pytest.mark.parametrize("template", ["calendar","overview","blank"])
def test_templates_are_valid(template):
    assert validate(defaults(template))["schema"] == 1


@pytest.mark.parametrize("mutation", [
    lambda d:d.update(schema=2), lambda d:d.update(width=999999), lambda d:d.update(pages=[]),
    lambda d:d["pages"][0]["widgets"][0].update(x=-1),
    lambda d:d["pages"][0]["widgets"][0].update(w=900),
    lambda d:d["pages"][0]["widgets"][0].update(font_size=True),
    lambda d:d["pages"][0]["widgets"][0].update(type="script"),
    lambda d:d["bindings"].update(waste_calendar="sensor.wrong"),
    lambda d:d["bindings"].update(calendars=[{"entity":"../secrets","color":"blue"}]),
    lambda d:d["pages"].append(deepcopy(d["pages"][0])),
])
def test_reject_invalid_documents(mutation):
    doc=defaults();mutation(doc)
    with pytest.raises(ValueError): validate(doc)


@pytest.mark.parametrize("model", const.MODELS)
@pytest.mark.parametrize("page", range(3))
@pytest.mark.parametrize("scenario", ["empty","normal","dense"])
def test_render_all_pages_models(model,page,scenario):
    doc=validate(defaults())
    data={} if scenario=="empty" else example_data(scenario=="dense")
    png=renderer.render_png(doc,page,{"model":model},data,NOW)
    image=Image.open(BytesIO(png)).convert("RGB")
    assert image.size==(const.MODELS[model]["width"],const.MODELS[model]["height"])
    permitted={(0,0,0),(255,255,255)}
    if const.MODELS[model]["color"]: permitted|={(255,0,0),(0,255,0),(0,0,255),(255,255,0)}
    assert set(image.get_flattened_data())<=permitted


def test_all_widgets_and_clipping():
    doc=defaults("blank");data=example_data()
    for i,kind in enumerate(const.WIDGET_TYPES):
        w=layout_module.widget(kind,(i%4)*200,(i//4)*140,195,130,text="Grüße ÄÖÜ – lange Zeile "*20,
            entity="weather.beispiel" if kind=="weather" else "sensor.temperatur")
        doc["pages"][0]["widgets"].append(w)
    assert renderer.render_png(validate(doc),0,{"model":"e1002"},data,NOW).startswith(b'\x89PNG')
    isolated=defaults("blank")
    isolated["pages"][0]["widgets"]=[layout_module.widget("text",10,10,40,40,text="X"*500,font_size=40)]
    image=Image.open(BytesIO(renderer.render_png(validate(isolated),0,{"model":"e1002"},{},NOW)))
    assert image.getpixel((51,15))==(255,255,255)


def test_multiday_exclusive_end_and_privacy():
    data={"calendar_sources":[{"entity":"calendar.x","private_titles":True}],"calendars":{"calendar.x":[
        {"summary":"Geheim", "start":"2026-11-01", "end":"2026-11-03"}]}}
    events=renderer.normalize_events(data,NOW)
    assert events[0]["title"]=="Termin"
    assert renderer.for_day(events,NOW.date()+timedelta(days=1),NOW.tzinfo)
    assert not renderer.for_day(events,NOW.date()+timedelta(days=2),NOW.tzinfo)


def test_invalid_dates_and_missing_states():
    data=example_data();data["calendars"]["calendar.beispiel"].append({"start":"wrong","end":"wrong"})
    assert len(renderer.normalize_events(data,NOW))==14
    assert renderer.state_value({},"sensor.missing")[0]=="–"


def test_sensor_value_changes_image():
    doc=defaults("blank");doc["pages"][0]["widgets"]=[layout_module.widget("sensor",0,0,300,80,entity="sensor.akku")]
    data=example_data();a=renderer.render_png(validate(doc),0,{"model":"e1002"},data,NOW)
    data["states"]["sensor.akku"]["state"]="20"
    assert a!=renderer.render_png(validate(doc),0,{"model":"e1002"},data,NOW)


def test_dense_day_keeps_a_real_event_visible_next_to_overflow():
    doc=validate(defaults());data=example_data(True)
    with patch.object(renderer,"draw_event", wraps=renderer.draw_event) as drawing:
        renderer.render_png(doc,1,{"model":"e1002"},data,NOW)
    assert drawing.call_count >= 7  # Each busy day shows a real event, not only a count.
