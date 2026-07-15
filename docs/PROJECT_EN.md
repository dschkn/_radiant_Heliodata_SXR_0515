# Project description

`_radiant_Heliodata_SXR_0515` is an electroacoustic research study based on solar X-ray flare records. It does not claim to reproduce a literal sound of the Sun. Instead, it constructs a transparent set of relationships between measured or catalogued solar events and audible parameters.

The project investigates how chronological scientific observations can create a perceptible musical morphology without being reduced to a conventional melody. The resulting texture is generated from a small collection of elementary signals: sine waves, white noise, single-sample impulses, amplitude envelopes, filters, and short delay networks.

## Formal model

The default timeline compresses the observation interval into a user-defined performance duration. Relative event order is preserved. Each flare produces an asymmetric sound envelope derived from its rise and decay proportions when complete timing is available. Peak X-ray flux is normalized logarithmically because the A, B, C, M, and X classes represent successive orders of magnitude.

Higher-energy events increase spectral and temporal complexity rather than simply increasing output level. The master amplitude remains bounded.

## Interface

The Max/MSP interface is designed as a restrained monitoring instrument. A monochrome presentation layer combines transport controls, a flux profile, a scrolling event table, waveform and spectrum displays, and a compact event readout. The synthesis graph remains in the patch, while the JavaScript engine handles data loading, validation, normalization, deterministic scheduling, and display messages.

## Scope

This first version is deliberately small. It establishes a stable data model, audible mapping, visual language, and project structure that can later be extended with denser GOES time-series data, CME relationships, multichannel spatialization, or additional visual analysis.

Copyright © 2026 Dmitrii Shchukin. All rights reserved.
