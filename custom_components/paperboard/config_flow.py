"""Grafische Einrichtung; ein Konfigurationseintrag je Display."""
from __future__ import annotations
import secrets
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector
from .schema import vol
from .const import DOMAIN, MODELS


def schema(defaults=None):
    d = defaults or {}
    return vol.Schema({
        vol.Required("name", default=d.get("name", "Mein PaperBoard")): str,
        vol.Required("model", default=d.get("model", "e1002")): selector.SelectSelector(
            selector.SelectSelectorConfig(options=[{"value": key, "label": value["name"]} for key, value in MODELS.items()])),
        vol.Required("orientation", default=d.get("orientation", "native")): selector.SelectSelector(
            selector.SelectSelectorConfig(options=[{"value": "native", "label": "Originalausrichtung"}, {"value": "rotated", "label": "Gedreht (90°)"}])),
        vol.Required("power", default=d.get("power", "mains")): selector.SelectSelector(
            selector.SelectSelectorConfig(options=[{"value": "mains", "label": "Netzbetrieb"}, {"value": "battery", "label": "Akkubetrieb"}])),
        vol.Required("refresh_interval", default=d.get("refresh_interval", 900)): selector.NumberSelector(
            selector.NumberSelectorConfig(min=60, max=86400, step=60, mode=selector.NumberSelectorMode.BOX, unit_of_measurement="s")),
    })


class PaperBoardConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        errors = {}
        if user_input is not None:
            if not user_input["name"].strip() or len(user_input["name"]) > 80:
                errors["name"] = "invalid_name"
            else:
                self._settings = {**user_input, "refresh_interval": int(user_input["refresh_interval"])}
                return await self.async_step_template()
        return self.async_show_form(step_id="user", data_schema=schema(), errors=errors)

    async def async_step_template(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(title=self._settings["name"], data={**self._settings,
                "template": user_input["template"], "token": secrets.token_urlsafe(32)})
        return self.async_show_form(step_id="template", data_schema=vol.Schema({
            vol.Required("template", default="calendar"): selector.SelectSelector(selector.SelectSelectorConfig(options=[
                {"value": "calendar", "label": "Kalender: Heute, 7 und 14 Tage"},
                {"value": "overview", "label": "Übersicht: Wetter, Sensor und Termine"},
                {"value": "blank", "label": "Leere Zeichenfläche"}]))}))

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return PaperBoardOptionsFlow()


class PaperBoardOptionsFlow(config_entries.OptionsFlow):
    async def async_step_init(self, user_input=None):
        errors = {}
        if user_input is not None:
            if not user_input["name"].strip() or len(user_input["name"]) > 80:
                errors["name"] = "invalid_name"
            else:
                self.hass.config_entries.async_update_entry(self.config_entry, title=user_input["name"])
                return self.async_create_entry(title="", data={**user_input, "refresh_interval": int(user_input["refresh_interval"])})
        return self.async_show_form(step_id="init", data_schema=schema({**self.config_entry.data, **self.config_entry.options}), errors=errors)
