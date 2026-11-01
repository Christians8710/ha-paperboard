"""Diagnosewerte je Display; kein erfundener Online-Status."""
from homeassistant.components.sensor import SensorEntity, SensorDeviceClass
from homeassistant.const import EntityCategory
from homeassistant.helpers.entity import DeviceInfo
from .const import DOMAIN


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([PaperBoardSensor(hass.data[DOMAIN]["displays"][entry.entry_id], key, name)
        for key, name in [("last_request", "Letzter Bildabruf"), ("last_render", "Letzte Bilderzeugung"), ("pages", "Seitenanzahl"),
                          ('battery','Akku'),('temperature','Temperatur'),('humidity','Luftfeuchtigkeit')]])


class PaperBoardSensor(SensorEntity):
    _attr_has_entity_name = True
    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _attr_icon = "mdi:monitor-dashboard"

    def __init__(self, display, key, name):
        self.display, self.key = display, key
        self._attr_name = name
        self._attr_unique_id = f"{display.entry.entry_id}_{key}"
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, display.entry.entry_id)})
        if key in ('battery','temperature','humidity'):
            self._attr_entity_category=None
            self._attr_device_class={'battery':SensorDeviceClass.BATTERY,'temperature':SensorDeviceClass.TEMPERATURE,'humidity':SensorDeviceClass.HUMIDITY}[key]
            self._attr_native_unit_of_measurement='°C' if key=='temperature' else '%'

    @property
    def native_value(self):
        if self.key == "pages": return len(self.display.layout["pages"])
        if self.key in ('battery','temperature','humidity'):return self.display.device_status.get(self.key)
        return getattr(self.display, self.key)
