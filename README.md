# `_radiant_Heliodata_SXR_0515`

**A data-driven sonification study of solar X-ray transient morphology**

`_radiant_Heliodata_SXR_0515` translates NASA DONKI and NOAA/GOES solar-flare records into a deterministic electronic sound field in Max/MSP. The patch maps event timing, logarithmic peak flux, flare morphology, and source position to envelope shape, spectral density, pulse rate, filtering, and stereo position.

## Requirements

- Max 8.6 or newer
- No third-party externals
- Keep `Radiant_Heliodata_SXR_0515.maxpat`, `flare_engine.js`, and the `data` directory together

## Quick start

1. Open `Radiant_Heliodata_SXR_0515.maxpat`.
2. Press **TEST**. A short 440 Hz tone should sound. This path bypasses JavaScript and the dataset.
3. Press **PLAY TIMELINE**. The button enables DSP and starts the chronological sequence.
4. Use **FOCUS** to render the selected event as a longer isolated gesture.
5. Use **STOP** to cancel scheduling and release the current envelope.

The status strip must change from `INITIALISING DATA ENGINE...` to `READY`. If the JSON file cannot be read, the engine installs a small embedded fallback dataset, so timeline playback remains available.

## Controls

- **PLAY TIMELINE**: plays all events in chronological order.
- **STOP**: stops the scheduler and closes the event envelope.
- **FOCUS**: renders the selected event with an extended envelope.
- **TEST**: direct oscillator test independent of JavaScript and JSON.
- **DURATION / MIN**: compressed timeline length.
- **EVENT INDEX**: event used by focus mode.
- **MASTER**: linear output gain from `0.0` to `0.5`.
- **AUDIO**: standard Max DSP toggle.

## Architecture

The project deliberately separates three layers:

1. `flare_engine.js` loads and validates data, calculates deterministic mappings, schedules events, and drives the displays.
2. The visible Max signal graph performs all synthesis, filtering, envelope generation, panning, delay, metering, and output.
3. The **TEST** path is wired directly to `ezdac~`, allowing audio configuration to be checked even if the control engine fails.

The rebuild removes the former `hip~` compatibility abstraction and `live.gain~`. The signal path now uses only standard Max/MSP objects and a plain smoothed linear master gain.

## Validation

Run the static project audit from the repository root:

```bash
python3 tools/validate_project.py
```

It checks the patch JSON, patchline references, dataset structure, forbidden compatibility objects, and JavaScript syntax when Node.js is available.

For an isolated audio check, open `diagnostics/Audio_Diagnostic.maxpat`.

## Documentation

- [English](docs/PROJECT_EN.md)
- [Deutsch](docs/PROJECT_DE.md)
- [Русский](docs/PROJECT_RU.md)
- [Sources and mapping](docs/SOURCES_AND_MAPPING.md)

## Authorship

Concept, composition, system design, and implementation:

**Dmitrii Shchukin**

Copyright © 2026 Dmitrii Shchukin. All rights reserved.

NASA and NOAA are credited solely as sources of public scientific data. No institutional endorsement is implied.
