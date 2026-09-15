# Replacement data: suitability assessment

**Updated:** 2026-09-14
**Status:** Research check completed; current candidate has no full green light. This is not an advisor approval or a measured Sentinel-2 results report.

## Findings

| Question | Finding | Evidence |
|---|---|---|
| Is the candidate traceable? | Yes: original ministry response, FID 297, geometry, query and hashes are preserved. | OBS-46 |
| Is it a verified farmer's plot? | No. It is a mapped sawah polygon with unresolved parcel fidelity. | OBS-46 |
| Does its shape need more scrutiny? | Yes. Approximately 1,874 m² with a 568 m perimeter; no interior remains after a 10 m inward buffer. | OBS-50 |
| Does the source prove rice cultivation during 2019? | No. The year-labelled source does not supply the exact feature survey date or monthly crop history. | OBS-46/50 |
| Are exact-source reuse terms established? | No. Empty saved terms and unsuccessful extended metadata retrieval do not establish permission or prohibition. | OBS-48/50 |
| Does historical Sentinel-2 imagery exist there? | One January 2019 catalogue product covering the polygon was confirmed. This is not a complete inventory or a usable-pixel result. | OBS-49 |
| Is an explicitly licensed comparison source available? | Yes: NESEA-Rice10, annual 2019 raster, CC BY 4.0, downloaded and checksum-verified. | EVID-058/059; OBS-51 |

## What the geometry finding means

OBS-50: valid geometry is not sufficient evidence of a suitable field boundary. The
candidate is long and narrow, so boundary mixing and geometry interpretation deserve
attention. The buffer calculation is only a geometric diagnostic. It does not count
provider pixels, establish actual spatial accuracy, or justify increasing the polygon
until observations pass. A low-availability result can remain informative; selecting
only better satellite outcomes would bias the study.

Recommendation from OBS-46/50: retain this candidate and its original selection record
as screening evidence, but do not describe it to the advisor as a verified farm plot.
Any revised eligibility rule must be documented before further satellite outcome analysis.

## The licensed alternative

EVID-058/059: [NESEA-Rice10](https://zenodo.org/records/5717711) has an explicit CC BY 4.0
record and a [published method](https://essd.copernicus.org/articles/13/5969/2021/).
It provides annual rice classification, not ownership parcels. The method reports
classification limitations; local validity cannot be inferred from regional accuracy.

OBS-51: the relevant 2019 tile was successfully retrieved. The candidate's enclosing
25 × 8 cell window contains raw code 0 throughout; the file declares nodata=3. The
reviewed documentation does not identify the rice class code, so this is not a finding
that the area is or is not rice. Verify that legend before using the map for selection
or comparison. Its licence does not resolve the ministry polygon's reuse terms.

This provides a concrete alternative for further screening without a farmer interview.
It is not an automatic switch to raster-derived study areas: that would require explicit
unit-of-analysis wording and an advisor-reviewed scope amendment.

## Next checks and recommendation

1. Resolve the NESEA class legend from author documentation or a documented example;
   assess local rice coverage without using Sentinel-2 availability to choose the site.
2. Seek exact-source terms and feature provenance through the ministry/ATR-BPN metadata
   route. If these remain unavailable, record that limitation and propose an explicitly
   licensed source instead. No contact message has been sent.
3. Once the unit and source are defensible, finalize the bounded processing pilot.
   The catalogue check did not authenticate the configured account or validate its quota.
4. Bring this assessment alongside the September 11 advisor packet. Ask about the
   proposed mapped-area study and the source limitations; do not postpone the scheduled
   advisor discussion on the assumption that a full green light is imminent.

The investigation supports continuing dataset screening. It does not yet support
claiming that the current polygon is ready for the thesis's empirical evaluation.

## Preserved checks

Under ignored `research/private/replacement-study/`: original source artifacts,
`catalogue-january-2019-check.json`, `nesea-rice10-record-5717711.json`, the downloaded
2019 ZIP/GeoTIFF, `rice-tile-check.json`, and `suitability-check-2026-09-14.json`.
Run `node research/private/replacement-study/check-rice-tile.mjs` and
`python3 research/private/replacement-study/check-suitability.py` to reproduce the local
checks. These commands make no network requests. Canonical facts and observations are
in `.agent/evidence-register.md`, EVID-058/059 and OBS-49–51.
