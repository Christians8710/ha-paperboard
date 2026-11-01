"""Lokaler Renderer: jeder Baustein wird auf seine eigene Fläche begrenzt."""
from __future__ import annotations
from datetime import datetime, time, timedelta
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from .const import COLORS, MODELS, RENDER_VERSION, display_size

FONT_DIR = Path(__file__).parent / "fonts"
WEEKDAYS = ("Mo", "Di", "Mi", "Do", "Fr", "Sa", "So")
WEATHER = {"sunny": "Sonnig", "clear-night": "Klare Nacht", "cloudy": "Bewölkt", "partlycloudy": "Teilweise bewölkt",
           "rainy": "Regen", "pouring": "Starkregen", "snowy": "Schnee", "fog": "Nebel", "windy": "Windig",
           "lightning": "Gewitter", "lightning-rainy": "Gewitter mit Regen", "snowy-rainy": "Schneeregen",
           "exceptional": "Außergewöhnliches Wetter", "hail": "Hagel", "windy-variant": "Windig"}


@lru_cache(maxsize=128)
def font(size, bold=False):
    return ImageFont.truetype(str(FONT_DIR / ("Ubuntu-B.ttf" if bold else "Ubuntu-R.ttf")), size)


def fit(draw, text, f, width):
    text = str(text).replace("\n", " ")
    if draw.textlength(text, font=f) <= width:
        return text
    while text and draw.textlength(text + "…", font=f) > width:
        text = text[:-1]
    return text + "…" if text else ""


def lines(draw, text, f, width):
    output = []
    for paragraph in str(text).split("\n"):
        line = ""
        for word in paragraph.split():
            candidate = (line + " " + word).strip()
            if line and draw.textlength(candidate, font=f) > width:
                output.append(line)
                line = word
            else:
                line = candidate
        output.append(fit(draw, line, f, width))
    return output


def text(draw, xy, value, f, color="black", max_width=800, align="left"):
    value = fit(draw, value, f, max_width)
    x, y = xy
    length = draw.textlength(value, font=f)
    if align == "right":
        x += max_width - length
    elif align == "center":
        x += (max_width - length) / 2
    # Anchor at the visible top, independent of ascender metrics.
    draw.text((x, y), value, font=f, fill=COLORS.get(color, color), anchor="lt")


def event_time(value, tz):
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    return parsed.replace(tzinfo=tz) if parsed.tzinfo is None else parsed.astimezone(tz)


def normalize_events(data, now):
    events = []
    for source in data.get("calendar_sources", []):
        for raw in data.get("calendars", {}).get(source["entity"], []):
            try:
                start = event_time(raw["start"], now.tzinfo)
                end = event_time(raw["end"], now.tzinfo)
            except (ValueError, TypeError, KeyError):
                continue
            if end <= now or end <= start:
                continue
            title = str(raw.get("summary") or "Ohne Titel")
            if source.get("private_titles"):
                title = "Termin"
            events.append({"start": start, "end": end, "all_day": len(str(raw["start"])) == 10,
                           "title": title, "label": source.get("label", ""), "color": source.get("color", "blue")})
    return sorted(events, key=lambda e: (e["start"], e["title"]))


def for_day(events, day, tz):
    start = datetime.combine(day, time.min, tzinfo=tz)
    end = datetime.combine(day + timedelta(days=1), time.min, tzinfo=tz)
    return [e for e in events if e["start"] < end and e["end"] > start]


def draw_event(draw, e, y, width, f, color):
    draw.rectangle((6, y+2, 15, y+11), fill=COLORS.get(e["color"], "black"), outline="black")
    stamp = "Ganztägig" if e["all_day"] else e["start"].strftime("%H:%M")
    label = (e["label"] + " · ") if e["label"] else ""
    text(draw, (23, y), f'{stamp}  {label}{e["title"]}', f, color, width-29)


def calendar_widget(draw, w, data, now):
    width, height = w["w"], w["h"]
    size = w["font_size"]
    f, fb = font(size), font(max(11, size-2), True)
    events = normalize_events(data, now)
    title_h = size+15 if w.get("title") else 0
    if title_h:
        text(draw, (6, 5), w["title"], font(size, True), w["color"], width-12)
    mode = w.get("mode", "today")
    if mode == "today":
        row_h = size+13
        capacity = max(0, (height-title_h-6)//row_h)
        visible = events[:capacity]
        if len(events) > capacity and capacity:
            visible = events[:capacity-1]
        for i, e in enumerate(visible):
            y = title_h + i*row_h + 3
            day = e["start"].date()
            prefix = "Heute" if day == now.date() else "Morgen" if day == now.date()+timedelta(days=1) else day.strftime("%d.%m.")
            text(draw, (6, y), prefix, fb, w["color"], 74)
            # Own subregion avoids collisions with the day label.
            badge = Image.new("RGB", (max(1, width-84), row_h), COLORS[w["background"]])
            draw_event(ImageDraw.Draw(badge), e, 1, badge.width, f, w["color"])
            draw._image.paste(badge, (80, y))
        if not events:
            text(draw, (6, title_h+4), "Keine Termine", f, w["color"], width-12)
        elif len(events) > len(visible) and capacity:
            text(draw, (6, title_h+(capacity-1)*row_h+3), f"+ {len(events)-len(visible)} weitere Termine", fb, w["color"], width-12)
        return
    count = int(mode)
    columns, rows = (2, 7) if count == 14 else (1, 7)
    col_width = width//columns
    row_height = max(1, (height-title_h)//rows)
    for offset in range(count):
        col, row = offset//rows, offset%rows
        x, y = col*col_width, title_h+row*row_height
        day = now.date()+timedelta(days=offset)
        # The entire day gets its own clipped canvas.
        cell = Image.new("RGB", (col_width, row_height), COLORS[w["background"]])
        cd = ImageDraw.Draw(cell)
        text(cd, (5, 4), f"{WEEKDAYS[day.weekday()]} {day:%d.%m.}", fb, w["color"], 95)
        day_events = for_day(events, day, now.tzinfo)
        start_x = 100 if col_width > 300 else 6
        top = 4 if start_x == 100 else size+10
        available = max(0, (row_height-top-4)//(size+6))
        shown = available if len(day_events) <= available else max(0, available-1)
        for i, e in enumerate(day_events[:shown]):
            line_img = Image.new("RGB", (max(1, col_width-start_x-4), size+6), COLORS[w["background"]])
            draw_event(ImageDraw.Draw(line_img), e, 0, line_img.width, f, w["color"])
            cell.paste(line_img, (start_x, top+i*(size+6)))
        if len(day_events) > shown and available:
            text(cd, (start_x+5, top+shown*(size+6)), f"+{len(day_events)-shown} weitere", fb, w["color"], col_width-start_x-10)
        elif not day_events:
            text(cd, (start_x+5, top), "Keine Termine", fb, w["color"], col_width-start_x-10)
        cd.line((4, row_height-1, col_width-4, row_height-1), fill=COLORS[w["color"]])
        draw._image.paste(cell, (x, y))


def waste_kind(value):
    v = value.casefold()
    if any(t in v for t in ("rest", "hausmüll", "hausmuell")): return "Restmüll", "black", "white"
    if any(t in v for t in ("gelb", "wertstoff", "verpack")): return "Gelber Sack", "yellow", "black"
    if any(t in v for t in ("bio", "organ")): return "Biotonne", "green", "black"
    if any(t in v for t in ("papier", "pappe", "blau")): return "Papiertonne", "blue", "white"
    return value, "white", "black"


def special_widget(draw, w, data, now):
    key = "waste_calendar" if w["type"] == "waste" else "holiday_calendar"
    eid = w.get("entity") or data.get("bindings", {}).get(key, "")
    items = []
    for raw in data.get("calendars", {}).get(eid, []):
        try:
            start = event_time(raw["start"], now.tzinfo)
        except (ValueError, TypeError, KeyError):
            continue
        if start.date() >= now.date():
            items.append((start, str(raw.get("summary") or "Ohne Titel")))
    items.sort()
    size, width = w["font_size"], w["w"]
    f = font(size, True)
    label = w.get("title") or ("Abfall" if w["type"] == "waste" else "Feiertag")
    if not items:
        text(draw, (5, 5), f"{label}: " + ("Kein Termin" if eid else "Kalender auswählen"), f, w["color"], width-10)
        return
    date_value, title_value = items[0]
    label_text = f"{label} {date_value:%d.%m.}"
    text(draw, (5, 5), label_text, f, w["color"], width-10)
    y = size+12 if w["h"] >= size*2+18 else 5
    x = 5 if y > 5 else int(draw.textlength(label_text, font=f))+14
    same_day = [title for dt, title in items if dt.date() == date_value.date()]
    if w["type"] == "holiday":
        text(draw, (x, y), ", ".join(same_day), f, w["color"], max(1, width-x-5))
    else:
        for title in same_day:
            title, bg, fg = waste_kind(title)
            title = fit(draw, title, f, max(0, width-x-14))
            if not title:
                break
            length = int(draw.textlength(title, font=f))+12
            draw.rounded_rectangle((x, y-2, x+length, y+size+4), radius=3, fill=COLORS[bg], outline="black")
            text(draw, (x+6, y), title, f, fg, length-12)
            x += length+5


def state_value(data, entity):
    state = data.get("states", {}).get(entity, {})
    value = state.get("state", "unavailable")
    if value in ("unknown", "unavailable", ""):
        return "–", state.get("attributes", {})
    return str(value), state.get("attributes", {})


def draw_widget(image, w, data, now):
    layer = Image.new("RGB", (w["w"], w["h"]), COLORS[w["background"]])
    d = ImageDraw.Draw(layer)
    f = font(w["font_size"], w.get("bold", False))
    kind = w["type"]
    if kind == "calendar":
        calendar_widget(d, w, data, now)
    elif kind in ("waste", "holiday"):
        special_widget(d, w, data, now)
    elif kind in ("rectangle", "line"):
        if kind == "rectangle":
            d.rectangle((0, 0, w["w"]-1, w["h"]-1), outline=COLORS[w["color"]], width=2)
        else:
            d.line((0, w["h"]//2, w["w"], w["h"]//2), fill=COLORS[w["color"]], width=2)
    else:
        if kind == "datetime":
            value = f"{WEEKDAYS[now.weekday()]} {now:%d.%m.%Y  %H:%M}"
        elif kind in ("sensor", "weather"):
            value, attrs = state_value(data, w.get("entity", ""))
            if kind == "weather" and value != "–":
                value = f'{WEATHER.get(value, value)}\n{attrs.get("temperature", "–")} {attrs.get("temperature_unit", "°C")}'
            elif kind == "sensor":
                value += (" " + str(attrs.get("unit_of_measurement", ""))).rstrip()
            value = (w.get("title", "") + "\n" if w.get("title") else "") + value
        elif kind == "status":
            parts = []
            for key, label, unit in [("battery_entity", "Akku", "%"), ("temperature_entity", "Temperatur", "°C"), ("humidity_entity", "Feuchte", "%")]:
                entity = data.get("bindings", {}).get(key)
                if entity:
                    val, attrs = state_value(data, entity)
                    parts.append(f'{label} {val} {attrs.get("unit_of_measurement", unit)}')
            parts.append(f"Stand {now:%H:%M}")
            value = " · ".join(parts)
        else:
            value = w.get("text", "")
        for i, line in enumerate(lines(d, value, f, w["w"]-10)):
            y = 5+i*(w["font_size"]+6)
            if y+w["font_size"] > w["h"]:
                break
            text(d, (5, y), line, f, w["color"], w["w"]-10, w.get("align", "left"))
    if w.get("border"):
        d.rectangle((0, 0, w["w"]-1, w["h"]-1), outline=COLORS[w["color"]])
    image.paste(layer, (w["x"], w["y"]))


def render_png(layout, page, settings, data, now):
    canvas = Image.new("RGB", (layout["width"], layout["height"]), "white")
    for w in layout["pages"][page]["widgets"]:
        draw_widget(canvas, w, data, now)
    size = display_size(settings)
    canvas = canvas.resize(size, Image.Resampling.LANCZOS)
    palette = Image.new("P", (1, 1))
    colors = [(255,255,255), (0,0,0), (255,255,0), (255,0,0), (0,0,255), (0,255,0)] if MODELS[settings["model"]]["color"] else [(255,255,255), (0,0,0)]
    flat = [channel for color in colors for channel in color]
    palette.putpalette(flat + [0]*(768-len(flat)))
    canvas = canvas.quantize(palette=palette, dither=Image.Dither.NONE).convert("RGB")
    out = BytesIO()
    canvas.save(out, format="PNG", optimize=True)
    return out.getvalue()
