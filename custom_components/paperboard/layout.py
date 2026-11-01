"""Begrenztes, portables Dokumentformat für den visuellen Editor."""
from __future__ import annotations
from copy import deepcopy
import json
import re
from .const import COLORS, MAX_PAGES, MAX_WIDGETS, WIDGET_TYPES


def widget(kind, x, y, w, h, **kwargs):
    return {"id": kwargs.pop("id", f"{kind}-{x}-{y}"), "type": kind, "x": x, "y": y,
            "w": w, "h": h, "font_size": 18, "color": "black", "background": "white", **kwargs}


def default_layout(template="calendar"):
    header = [widget("text", 20, 12, 400, 44, text="Mein Kalender", font_size=30, bold=True),
              widget("datetime", 430, 18, 350, 34, font_size=18, align="right"),
              widget("line", 20, 62, 760, 2)]
    pages = []
    for name, mode in [("Heute und nächste Termine", "today"), ("7 Tage", "7"), ("14 Tage", "14")]:
        pages.append({"id": f"page-{len(pages)+1}", "name": name,
                      "widgets": deepcopy(header) + [widget("calendar", 20, 76, 760, 306, mode=mode, title=name, font_size=12 if mode=="14" else 16 if mode=="7" else 18),
                         widget("waste", 20, 388, 440, 36, font_size=13, title="Abfall"),
                         widget("holiday", 466, 388, 314, 36, font_size=13, title="Feiertag"),
                         widget("status", 20, 438, 760, 26, font_size=13)]})
    if template == "blank":
        pages = [{"id": "page-1", "name": "Meine Seite", "widgets": []}]
    elif template == "overview":
        pages = [{"id": "page-1", "name": "Übersicht", "widgets": deepcopy(header) + [
            widget("weather", 20, 90, 360, 130, font_size=28, title="Wetter"),
            widget("sensor", 420, 90, 360, 130, font_size=32, title="Sensorwert"),
            widget("calendar", 20, 250, 760, 175, mode="today", title="Termine"),
            widget("status", 20, 438, 760, 26, font_size=13)]}]
    return {"schema": 1, "width": 800, "height": 480, "pages": pages,
            "bindings": {"calendars": [], "waste_calendar": "", "holiday_calendar": "",
                         "battery_entity": "", "temperature_entity": "", "humidity_entity": ""}}


def _text(value, limit=200):
    if not isinstance(value, str) or len(value) > limit:
        raise ValueError(f"Text muss höchstens {limit} Zeichen enthalten.")
    return value


def _int(value, low, high):
    if type(value) is not int or not low <= value <= high:
        raise ValueError(f"Zahl muss zwischen {low} und {high} liegen.")
    return value


def _entity(value, domain=None, optional=True):
    value = _text(value, 255)
    if optional and not value:
        return value
    if not re.fullmatch(r"[a-z_][a-z0-9_]*\.[a-z0-9_]+", value) or (domain and not value.startswith(domain + ".")):
        raise ValueError("Ungültige Entität.")
    return value


def validate_layout(raw):
    if not isinstance(raw, dict) or len(json.dumps(raw)) > 200_000:
        raise ValueError("Ungültiges oder zu großes Layout.")
    if raw.get("schema") != 1:
        raise ValueError("Unbekanntes Layoutformat.")
    width = _int(raw.get("width"), 240, 2000)
    height = _int(raw.get("height"), 240, 2000)
    pages = raw.get("pages")
    if not isinstance(pages, list) or not 1 <= len(pages) <= MAX_PAGES:
        raise ValueError("Es sind 1 bis 12 Seiten erlaubt.")
    clean = {"schema": 1, "width": width, "height": height, "pages": [], "bindings": {}}
    page_ids = set()
    for page in pages:
        if not isinstance(page, dict):
            raise ValueError("Ungültige Seite.")
        pid = _text(page.get("id"), 80)
        if not pid or pid in page_ids:
            raise ValueError("Seitenkennungen müssen eindeutig sein.")
        page_ids.add(pid)
        ws = page.get("widgets")
        if not isinstance(ws, list) or len(ws) > MAX_WIDGETS:
            raise ValueError("Höchstens 40 Bausteine pro Seite.")
        output, ids = [], set()
        for w in ws:
            if not isinstance(w, dict) or w.get("type") not in WIDGET_TYPES:
                raise ValueError("Unbekannter Baustein.")
            wid = _text(w.get("id"), 80)
            if not wid or wid in ids:
                raise ValueError("Bausteinkennungen müssen eindeutig sein.")
            ids.add(wid)
            c = {"id": wid, "type": w["type"]}
            c["x"], c["y"] = _int(w.get("x"), 0, width-1), _int(w.get("y"), 0, height-1)
            c["w"], c["h"] = _int(w.get("w"), 1, width), _int(w.get("h"), 1, height)
            if c["x"] + c["w"] > width or c["y"] + c["h"] > height:
                raise ValueError("Baustein liegt außerhalb der Zeichenfläche.")
            c["font_size"] = _int(w.get("font_size", 18), 8, 120)
            for key, default in [("color", "black"), ("background", "white")]:
                if w.get(key, default) not in COLORS:
                    raise ValueError("Unbekannte Farbe.")
                c[key] = w.get(key, default)
            for key in ("text", "title"):
                c[key] = _text(w.get(key, ""), 2000 if key == "text" else 100)
            c["entity"] = _entity(w.get("entity", ""))
            c["bold"] = bool(w.get("bold", False))
            c["border"] = bool(w.get("border", False))
            c["align"] = w.get("align", "left")
            c["mode"] = w.get("mode", "today")
            if c["align"] not in ("left", "center", "right") or c["mode"] not in ("today", "7", "14"):
                raise ValueError("Ungültige Ausrichtung oder Kalenderansicht.")
            output.append(c)
        clean["pages"].append({"id": pid, "name": _text(page.get("name"), 80), "widgets": output})
    bindings = raw.get("bindings", {})
    if not isinstance(bindings, dict):
        raise ValueError("Ungültige Datenquellen.")
    calendars = bindings.get("calendars", [])
    if not isinstance(calendars, list) or len(calendars) > 12:
        raise ValueError("Höchstens zwölf Kalender.")
    clean["bindings"]["calendars"] = []
    for c in calendars:
        if not isinstance(c, dict) or c.get("color", "blue") not in COLORS:
            raise ValueError("Ungültiger Kalender.")
        clean["bindings"]["calendars"].append({"entity": _entity(c.get("entity"), "calendar", False),
            "label": _text(c.get("label", ""), 60), "color": c.get("color", "blue"),
            "private_titles": bool(c.get("private_titles", False))})
    for key in ("waste_calendar", "holiday_calendar", "battery_entity", "temperature_entity", "humidity_entity"):
        clean["bindings"][key] = _entity(bindings.get(key, ""), "calendar" if key.endswith("calendar") else None)
    return clean
