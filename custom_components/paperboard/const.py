"""Gemeinsame Kennungen und Gerätefähigkeiten."""
DOMAIN = "paperboard"
VERSION = RENDER_VERSION = "0.3.1"
MODELS = {
    "e1001": {"name": "Seeed reTerminal E1001", "width": 800, "height": 480, "color": False, "touch": False},
    "e1002": {"name": "Seeed reTerminal E1002", "width": 800, "height": 480, "color": True, "touch": False},
    "e1003": {"name": "Seeed reTerminal E1003", "width": 1404, "height": 1872, "color": False, "touch": True},
    "e1004": {"name": "Seeed reTerminal E1004", "width": 1200, "height": 1600, "color": True, "touch": False},
}
COLORS = {"black": "#000000", "white": "#ffffff", "red": "#ff0000", "yellow": "#ffff00", "blue": "#0000ff", "green": "#00ff00"}
WIDGET_TYPES = ("text", "datetime", "sensor", "weather", "calendar", "waste", "holiday", "status", "rectangle", "line")
MAX_PAGES = 12
MAX_WIDGETS = 40


def display_size(settings):
    profile = MODELS[settings["model"]]
    w, h = profile["width"], profile["height"]
    return (h, w) if settings.get("orientation") == "rotated" else (w, h)
