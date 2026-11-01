"""PaperBoard: lokale Displayverwaltung, Editor und Bildausgabe."""
from __future__ import annotations
import asyncio
import base64
from copy import deepcopy
from datetime import datetime, time, timedelta
import hashlib
import logging
from pathlib import Path
import secrets
import time as monotonic_time
from zoneinfo import ZoneInfo
from aiohttp import web
from homeassistant.components import panel_custom, websocket_api
from homeassistant.components.http import HomeAssistantView, StaticPathConfig
from homeassistant.const import EVENT_STATE_CHANGED, Platform
from homeassistant.core import callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.storage import Store
from homeassistant.helpers import config_validation as cv
from .schema import vol
from .const import DOMAIN, VERSION, MODELS, display_size
from .layout import default_layout, validate_layout
from .renderer import render_png

_LOGGER = logging.getLogger(__name__)
PLATFORMS = [Platform.SENSOR, Platform.BUTTON]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


def settings_for(entry):
    return {key: val for key, val in {**entry.data, **entry.options}.items() if key != "token"}


class Display:
    def __init__(self, hass, entry):
        self.hass, self.entry = hass, entry
        self.store = Store(hass, 1, f"{DOMAIN}.{entry.entry_id}")
        self.layout = None
        self.revision = 0
        self.lock = asyncio.Lock()
        self.cache = {}
        self.last_request = None
        self.last_render = None
        self.warnings = []

    async def load(self):
        saved = await self.store.async_load()
        if saved is not None:
            # Refuse to overwrite invalid saved documents silently.
            self.layout = validate_layout(saved["layout"])
            self.revision = saved.get("revision", 0)
        else:
            self.layout = validate_layout(default_layout(self.entry.data.get("template", "calendar")))

    def public(self, with_layout=False):
        result = {"id": self.entry.entry_id, "settings": settings_for(self.entry),
                  "size": display_size(settings_for(self.entry)), "revision": self.revision,
                  "last_request": self.last_request, "last_render": self.last_render,
                  "warnings": self.warnings, "hardware_tested": False}
        if with_layout:
            result["layout"] = deepcopy(self.layout)
        return result

    async def save(self, layout, revision):
        clean = validate_layout(layout)
        async with self.lock:
            if revision != self.revision:
                raise ValueError("Das Layout wurde zwischenzeitlich geändert. Bitte neu laden.")
            new_revision = self.revision+1
            await self.store.async_save({"layout": clean, "revision": new_revision})
            self.layout, self.revision = clean, new_revision
            self.cache.clear()

    async def data(self, layout, now):
        bindings = layout["bindings"]
        calendars = {c["entity"] for c in bindings["calendars"]}
        calendars.update(bindings[k] for k in ("waste_calendar", "holiday_calendar") if bindings[k])
        states = {}
        for page in layout["pages"]:
            for w in page["widgets"]:
                if w.get("entity"):
                    if w["type"] in ("calendar", "waste", "holiday"):
                        calendars.add(w["entity"])
                    else:
                        states[w["entity"]] = None
        for key in ("battery_entity", "temperature_entity", "humidity_entity"):
            if bindings[key]: states[bindings[key]] = None
        for eid in states:
            state = self.hass.states.get(eid)
            # Keep only attributes used by renderer; no large history payloads.
            attrs = state.attributes if state else {}
            states[eid] = {"state": state.state if state else "unavailable", "attributes": {
                k: attrs[k] for k in ("unit_of_measurement", "temperature", "temperature_unit") if k in attrs}}
        start = datetime.combine(now.date(), time.min, tzinfo=now.tzinfo)
        result, warnings = {}, []

        async def fetch(eid):
            try:
                lookahead=90 if eid in (bindings["waste_calendar"],bindings["holiday_calendar"]) else 14
                async with asyncio.timeout(15):
                    response = await self.hass.services.async_call("calendar", "get_events",
                        {"start_date_time": start.isoformat(), "end_date_time": (start+timedelta(days=lookahead)).isoformat()},
                        target={"entity_id": eid}, blocking=True, return_response=True)
                # Bound data sent to renderer; calendar services can return lots of events.
                result[eid] = (response or {}).get(eid, {}).get("events", [])[:2000]
            except Exception:  # One unavailable calendar must not hide the entire dashboard.
                _LOGGER.debug("Kalender %s konnte nicht geladen werden", eid, exc_info=True)
                warnings.append(f"Kalender nicht erreichbar: {eid}")
                result[eid] = []
        await asyncio.gather(*(fetch(eid) for eid in calendars))
        self.warnings = warnings
        return {"bindings": bindings, "calendar_sources": bindings["calendars"], "calendars": result, "states": states}

    async def render(self, page, draft=None):
        async with self.lock:
            layout = validate_layout(draft) if draft is not None else self.layout
            if not 0 <= page < len(layout["pages"]):
                raise ValueError("Seite nicht gefunden.")
            now = datetime.now(ZoneInfo(self.hass.config.time_zone))
            key = (page, self.revision, now.strftime("%Y%m%d%H%M"))
            if draft is None and key in self.cache:
                stamp, raw, tag = self.cache[key]
                if monotonic_time.monotonic()-stamp < 30:
                    return raw, tag
            payload = await self.data(layout, now)
            raw = await self.hass.async_add_executor_job(render_png, layout, page, settings_for(self.entry), payload, now)
            tag = '"'+hashlib.sha256(raw).hexdigest()+'"'
            if draft is None:
                self.cache = {key: (monotonic_time.monotonic(), raw, tag)}
                self.last_render = now.isoformat()
            return raw, tag


class ImageView(HomeAssistantView):
    url = "/api/paperboard/image/{entry_id}/{page}"
    name = "api:paperboard:image"
    requires_auth = False

    def __init__(self, hass):
        self.hass = hass

    async def get(self, request, entry_id, page):
        display = self.hass.data[DOMAIN]["displays"].get(entry_id)
        supplied = request.headers.get("X-PaperBoard-Token", "")
        if display is None or not secrets.compare_digest(supplied.encode("utf-8"), display.entry.data["token"].encode("utf-8")):
            raise web.HTTPUnauthorized(text="Ungültiger Display-Schlüssel.")
        try:
            index = int(page)
            if not 0 <= index < len(display.layout["pages"]):
                raise ValueError
        except ValueError:
            raise web.HTTPNotFound(text="Seite nicht gefunden.") from None
        raw, tag = await display.render(index)
        display.last_request = datetime.now().astimezone().isoformat()
        headers = {"ETag": tag, "Cache-Control": "private, no-cache", "X-Content-Type-Options": "nosniff"}
        if tag in [t.strip() for t in request.headers.get("If-None-Match", "").split(",")]:
            return web.Response(status=304, headers=headers)
        return web.Response(body=raw, content_type="image/png", headers=headers)


@websocket_api.websocket_command({vol.Required("type"): "paperboard/command",
    vol.Required("action"): str, vol.Optional("entry_id"): str,
    vol.Optional("layout"): dict, vol.Optional("page", default=0): int,
    vol.Optional("revision", default=0): int})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_command(hass, connection, msg):
    displays = hass.data[DOMAIN]["displays"]
    action = msg["action"]
    if action == "list":
        connection.send_result(msg["id"], {"version": VERSION, "models": MODELS,
            "displays": [d.public() for d in displays.values()]})
        return
    display = displays.get(msg.get("entry_id"))
    if display is None:
        connection.send_error(msg["id"], "not_found", "Display nicht geladen. Bitte Integration prüfen.")
        return
    try:
        if action == "get":
            result = display.public(True)
        elif action == "save":
            await display.save(msg.get("layout"), msg["revision"])
            result = display.public(True)
        elif action == "preview":
            raw, _ = await display.render(msg["page"], msg.get("layout"))
            result = {"image": base64.b64encode(raw).decode("ascii"), "warnings": display.warnings}
        elif action == "connection":
            result = {"path": f"/api/paperboard/image/{display.entry.entry_id}/0",
                      "header": "X-PaperBoard-Token", "token": display.entry.data["token"],
                      "refresh_interval": settings_for(display.entry)["refresh_interval"],
                      "pages": len(display.layout["pages"])}
        elif action == "refresh":
            display.cache.clear()
            result = {"ok": True}
        else:
            raise ValueError("Unbekannte Aktion.")
    except (ValueError, KeyError, TypeError) as err:
        connection.send_error(msg["id"], "invalid_format", str(err))
        return
    connection.send_result(msg["id"], result)


async def async_setup(hass, config):
    hass.data.setdefault(DOMAIN, {"displays": {}})
    root = Path(__file__).parent
    await hass.http.async_register_static_paths([StaticPathConfig("/paperboard_static", str(root / "frontend"), False)])
    hass.http.register_view(ImageView(hass))
    websocket_api.async_register_command(hass, ws_command)
    await panel_custom.async_register_panel(hass, frontend_url_path="paperboard",
        webcomponent_name="paperboard-panel", sidebar_title="PaperBoard", sidebar_icon="mdi:draw",
        module_url=f"/paperboard_static/panel.js?v={VERSION}", require_admin=True,
        config_panel_domain=DOMAIN)

    @callback
    def state_changed(event):
        eid = event.data.get("entity_id")
        for display in hass.data[DOMAIN]["displays"].values():
            bindings = display.layout["bindings"]
            sources = {c["entity"] for c in bindings["calendars"]}
            sources.update(v for k, v in bindings.items() if isinstance(v, str))
            sources.update(w.get("entity") for p in display.layout["pages"] for w in p["widgets"])
            if eid in sources: display.cache.clear()
    hass.bus.async_listen(EVENT_STATE_CHANGED, state_changed)
    return True


async def async_setup_entry(hass, entry):
    display = Display(hass, entry)
    await display.load()
    hass.data[DOMAIN]["displays"][entry.entry_id] = display
    registry = dr.async_get(hass)
    registry.async_get_or_create(config_entry_id=entry.entry_id, identifiers={(DOMAIN, entry.entry_id)},
        manufacturer="Seeed Studio", model=MODELS[settings_for(entry)["model"]]["name"], name=entry.title,
        sw_version=VERSION, configuration_url="homeassistant://paperboard")
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_options_updated))
    return True


async def _options_updated(hass, entry):
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass, entry):
    if await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN]["displays"].pop(entry.entry_id, None)
        return True
    return False


async def async_remove_entry(hass, entry):
    await Store(hass, 1, f"{DOMAIN}.{entry.entry_id}").async_remove()
