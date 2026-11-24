# Product

## Register

product

## Users
Primarily the thesis team using Matani as a research instrument to produce and inspect provenance-complete satellite observations. Secondarily, Indonesian smallholder rice (padi) farmers, most with fields under 0.5 ha, who map a field on their phone and check dated NDVI/NDMI values alongside weather and notes, often outdoors and on mid-range Android devices. The advisor and examiners judge the research through the same screens.

## Product Purpose
Matani is a padi-only mobile decision support app. Users draw their field, then view the field over time: dated Sentinel-2 NDVI/NDMI observations, radar-based NDVI estimates where optical data is missing, weather context and field notes. Success means every value on screen can be traced to its source and date, and missing data is stated plainly rather than hidden or invented.

## Brand Personality
Honest, plain, grounded. Farmer-facing Indonesian copy in short literal sentences. The emotional goal is trust: the user should always know whether a number was measured, estimated, or is unavailable, and why.

## Anti-references
- Health or severity colour scales on index values (red/amber/green "crop health"), and words like sehat, stres, membaik, memburuk.
- Diagnoses, recommendations, or yield claims derived from NDVI.
- Anything that renders an estimated, simulated or fixture value like a measured one, or silently fills gaps with lines or smoothing.
- Generic agritech dashboards with hero metrics and decorative gradients.

## Design Principles
1. Provenance before polish: a value never appears without its date and source.
2. Absence is a designed state: unavailable data says why, instead of showing a blank or a spinner.
3. Measured and estimated never look alike: distinct shape and text label, not colour alone.
4. Show the real timing: points sit at their actual dates, with gaps left visible.
5. Plain words over jargon: technical terms (NDVI, Sentinel) only where the user needs them to judge the data.

## Accessibility & Inclusion
WCAG 2.2 AA: text contrast ≥ 4.5:1, graphics ≥ 3:1. Colour is never the only carrier of meaning (data states use shape plus a text label). Touch targets ≥ 44 pt. Every chart point has an accessibility label. Respect reduced-motion settings.
