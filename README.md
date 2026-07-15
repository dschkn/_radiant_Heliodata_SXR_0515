# `_radiant_Heliodata_SXR_0515`

**A data-driven sonification study of solar X-ray transient morphology**

`_radiant_Heliodata_SXR_0515` is a compact Max/MSP study that translates NASA DONKI and NOAA/GOES solar-flare observations into a deterministic electronic sound field.

The patch uses a deliberately reduced vocabulary: sine oscillators, filtered noise, sample impulses, short delay diffusion, and restrained post-processing. Solar data controls event timing, envelope shape, spectral density, pulse rate, stereo position, and deterministic pattern variation.

## Quick start

1. Keep the repository structure unchanged.
2. Open `Radiant_Heliodata_SXR_0515.maxpat` in Max 8.6 or newer.
3. Enable audio with the speaker control.
4. Start with a low monitoring level.
5. Press **PLAY TIMELINE**.

The patch opens directly in Presentation Mode. No third-party Max externals or npm packages are required.

## Controls

- **PLAY TIMELINE** — plays the complete event sequence in chronological order.
- **STOP** — cancels playback and releases the current envelope.
- **FOCUS EVENT** — renders the selected event as a longer isolated study.
- **DURATION** — compressed timeline length in minutes.
- **EVENT** — event index used by focus mode.
- **DRY / FIELD** — controls the short spatial afterimage.
- **MASTER** — final monitoring level.

The event table, flux profile, waveform scope, and spectrum display are driven from the same control stream as the sound engine.

## Data status

The included dataset is a curated prototype snapshot covering major NASA-confirmed events and a denser sequence of NOAA/GOES detections through 15 July 2026. It is intentionally compact and explicitly marked as non-exhaustive. `update_data.mjs` can request a broader NASA DONKI interval later without adding dependencies.

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
