"""Lokale Gerätekonfiguration aus einer ausschließlich per USB geschriebenen Partition."""
import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import api, display, http_request, sensor
from esphome.components.online_image.image import OnlineImage
from esphome.components.esphome.ota import ESPHomeOTAComponent
from esphome.const import CONF_ID

DEPENDENCIES = ["esp32", "wifi", "api", "http_request"]
AUTO_LOAD = ["json", "sha256"]
ns = cg.esphome_ns.namespace("paperboard_device")
PaperBoardDevice = ns.class_("PaperBoardDevice", cg.Component)
CONFIG_SCHEMA = cv.Schema({
    cv.GenerateID(): cv.declare_id(PaperBoardDevice),
    cv.Required("image_id"): cv.use_id(OnlineImage),
    cv.Required("display_id"): cv.use_id(display.Display),
    cv.Required("http_id"): cv.use_id(http_request.HttpRequestComponent),
    cv.Required("api_id"): cv.use_id(api.APIServer),
    cv.Required("ota_id"): cv.use_id(ESPHomeOTAComponent),
    cv.Required("battery_id"): cv.use_id(sensor.Sensor),
    cv.Required("temperature_id"): cv.use_id(sensor.Sensor),
    cv.Required("humidity_id"): cv.use_id(sensor.Sensor),
}).extend(cv.COMPONENT_SCHEMA)


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    for key in ("image", "display", "http", "api", "ota", "battery", "temperature", "humidity"):
        obj = await cg.get_variable(config[key + "_id"])
        cg.add(getattr(var, "set_" + key)(obj))
