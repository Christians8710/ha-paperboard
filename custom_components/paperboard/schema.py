"""Kompatibilität mit den Schema-Bibliotheken unterstützter HA-Versionen."""
try:
    import probatio as vol
except ImportError:
    import voluptuous as vol
