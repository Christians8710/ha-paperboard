"""Aktion für eine erneute Bilderzeugung beim nächsten Geräteabruf."""
from homeassistant.components.button import ButtonEntity
from homeassistant.helpers.entity import DeviceInfo
from .const import DOMAIN


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([RefreshButton(hass.data[DOMAIN]["displays"][entry.entry_id])])


class RefreshButton(ButtonEntity):
    _attr_has_entity_name = True
    _attr_name = "Bild beim nächsten Abruf erneuern"
    _attr_icon = "mdi:refresh"

    def __init__(self, display):
        self.display = display
        self._attr_unique_id = f"{display.entry.entry_id}_refresh"
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, display.entry.entry_id)})

    async def async_press(self):
        self.display.cache.clear()
