# PaperBoard

E-Paper dashboards for Home Assistant.

PaperBoard aims to provide a visual dashboard editor and guided device setup for E-Paper displays, starting with the Seeed reTerminal E1001, E1002, E1003 and E1004. The architecture is intended to accommodate other manufacturers later.

## Development status

Early development. This repository currently contains the project outline, not an installable integration. No HACS release or device firmware is available here yet.

The starting point is an existing personal E1002 calendar renderer (version 1.2.6). Its private configuration and credentials are not included in this repository. The E1002 is the initial hardware test device; the other models require hardware validation.

## Planned features

- Home Assistant custom integration distributed through HACS.
- Guided model selection, USB firmware installation and device pairing.
- A visual editor with free positioning, resizing, optional grid, alignment guides and preview.
- Multiple displays, each with its own pages and settings.
- Calendar, waste collection, holidays, weather, sensor values, text and device status widgets.
- Calendar templates for today/upcoming events, 7 days and 14 days.
- Mains and battery operating profiles with appropriate refresh behavior.
- Device-specific resolution, palette, buttons and supported interaction features.
- Local rendering in Home Assistant and image delivery to the display.

## Development roadmap

1. Separate reusable rendering, device profiles and personal configuration.
2. Implement graphical setup, persistent storage and multi-display management.
3. Build the visual editor and migrate the calendar layouts into editable templates.
4. Add a guided installer and firmware update workflow.
5. Validate on E1002, then work with community testers for E1001/E1003/E1004.
6. Publish tested HACS-compatible releases and complete installation archives.

## Release requirements

Every release must pass syntax, runtime, preview, package-content and version checks. Package, manifest and renderer versions must match. Release archives must not contain __pycache__, .pyc or .pyo files. Hardware test status and known limitations must be documented.

Existing devices must not have Wi-Fi, API, OTA or IP settings changed without an explicit user request.

## Project scope

PaperBoard is an independent community project and is not affiliated with Seeed Studio or Home Assistant.
