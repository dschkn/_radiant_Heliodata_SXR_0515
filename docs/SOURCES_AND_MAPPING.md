# Sources and mapping

## Scientific sources

- NASA CCMC DONKI: https://ccmc.gsfc.nasa.gov/tools/DONKI/
- NASA Open APIs: https://api.nasa.gov/
- NOAA GOES primary X-ray flare feed: https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json
- NOAA Solar and Geophysical Event Reports: https://services.swpc.noaa.gov/text/solar-geophysical-event-reports.txt
- NOAA solar flare classification: https://www.spaceweather.gov/phenomena/solar-flares-radio-blackouts
- NASA Solar Cycle 25 archive: https://science.nasa.gov/blogs/solar-cycle-25/

## Mapping principles

| Source field | Normalization | Audible / visual result |
| --- | --- | --- |
| Peak X-ray flux | logarithmic, A1 to X1 | spectral density, impulse rate, oscillator register |
| Begin / peak / end | proportional timing | asymmetric `line~` envelope |
| Flare class | categorical + numeric multiplier | orchestration depth |
| Inter-event interval | normalized within dataset window | compressed macro-timeline |
| Solar east/west coordinate | -1 to +1 | stereo position |
| Solar north/south coordinate | two bounded registers | oscillator register bias |
| Active-region number | integer hash | deterministic phase and pulse variation |
| GOES short/long ratio | bounded continuous value | noise-filter brightness |

Amplitude is intentionally bounded. Stronger events create more complex sound rather than proportionally louder sound.

## Data integrity

The bundled JSON is a curated prototype snapshot, not a claim of a complete scientific catalogue. Every event includes a provenance tag and timing quality. Rows with only a verified peak time receive explicitly marked default attack and decay durations in the sound engine.

Times are stored in UTC. Flux is stored in watts per square metre where a numeric value is available or can be derived from the standard flare class.

## Attribution

NASA and NOAA are acknowledged as scientific data sources. Their names and links do not imply sponsorship or endorsement.

Copyright © 2026 Dmitrii Shchukin. All rights reserved.
