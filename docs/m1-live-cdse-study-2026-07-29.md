# Matani M1 live CDSE evidence

**Checked:** 2026-07-29  
**Data state:** provider-backed `prototype`  
**Claim allowed:** no `measured` or product-cadence claim

## Scope

The run used the two private, developer-supplied, padi-labeled polygons `hi`
(0.110930581 ha) and `sszs` (3.897092360 ha). Stored WGS84 coordinates were
validated and projected to UTM zone 48S (EPSG:32748) before requesting a metre-based
10 m NDVI grid and 20 m NDMI/quality grid. No bbox was substituted.

The request excludes SCL 0, 1, 3, 8, 9, and 10 from index statistics. SCL 6
(water) remains included under HYP-05. The provider returned no
`geometryPixelCount`, so a separate coverage output supplies the polygon-source
pixel denominator. That value is kept distinct from valid-pixel counts.

## Bounded live pilot

- Window: 2026-06-01 → 2026-06-16.
- Requests: 6 successful calls.
- Provider-reported consumption: approximately 0.28 PU.
- `hi`: 15 NDVI-source pixels and 2 NDMI-source pixels per acquisition; two
  acquisitions had nonzero valid pixels and one was fully masked.
- `sszs`: 436 NDVI-source pixels and 115 NDMI-source pixels per acquisition; two
  acquisitions had nonzero valid pixels and one was fully masked.

These counts are real provider responses, but the records remain `prototype` because
HYP-03 is not approved, source-product identity and independent raster comparison are
absent, and the values are not persisted through the M2 provenance schema (OBS-11).

## Twelve-month retrospective run

- Window: 2025-07-01 → 2026-07-01.
- Completion: 24/24 field-months.
- Requests: 72 successful calls.
- Provider-reported consumption: approximately 8.027 PU.
- Returned acquisition intervals: 86 per polygon across 12/12 months.
- `hi`: both NDVI and NDMI had nonzero valid pixels on 25/86 intervals.
- `sszs`: both indices had nonzero valid pixels on 28/86 intervals.
- Descriptive median gap between nonzero intervals: 7 days for both polygons.
- Descriptive longest gap: 113 days for `hi`, 133 days for `sszs`.

The initial run received HTTP 429 after eight completed field-months. Checkpointing
preserved completed work; a 2.5-second request interval and bounded retry allowed a
resume without repeating completed field-months (OBS-12).

## Corrections found by live execution

- The quality evalscript originally declared named outputs as objects; the Statistical
  API required an array of band names.
- Sending WGS84 coordinates with `resx=10`/`resy=10` interpreted the grid in degrees,
  not metres, and produced a one-sample defect. The corrected implementation projects
  the exact polygon to a local UTM CRS before setting metre resolution.
- Provider `"NaN"` values are normalized to `null`.
- NDVI and NDMI source/valid counts are recorded separately.
- HTTP 429 and transient 5xx responses use bounded retry; monthly checkpoints make the
  retrospective run resumable.

## Gate conclusion

This run proves CDSE authentication, exact-polygon request construction, SCL masking,
metre-based processing grids, separate pixel accounting, request/PU accounting, and
resumable archive acquisition for these two polygons.

It does **not** complete M1 because:

- both polygons are from one area and do not form a representative Indonesian
  multi-region sample;
- rice identity, boundary fidelity, consent, and representativeness have not been
  independently verified;
- wet/dry-season labels and the advisor-approved HYP-03 reliability floor are absent;
- source product identity and independent raster comparison are absent.

Therefore no weekly/biweekly/monthly cadence is licensed, and M2 remains gated by the
unfinished M1 acceptance criteria.

