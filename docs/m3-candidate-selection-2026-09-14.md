# Proposed mapped-rice candidate shortlist

**Updated:** 2026-09-14
**Status:** Offline preparation under DEC-47; academic scope and final site remain unapproved.

OBS-54: three candidate blocks were generated from Open-SEA-Rice-10. Each is a 6 × 6
source-cell rectangle containing only mapped rice codes 1/2/3. This is approximately
60 × 60 metres, not a surveyed farmer boundary. Coordinates below are longitude, latitude.

| Source tile | Centre | Calculated hectares | Eligible blocks in screened windows |
|---|---|---|---|
| 42 | 108.505617, -6.500209 | 0.3557 | 1360 |
| 49 | 111.014252, -6.500209 | 0.3551 | 1603 |
| 55 | 112.501323, -7.000212 | 0.3550 | 731 |

## Selection rule and limits

Proposed pilot rule: reuse the previously inspected Java tiles 42/49/55 and their nine
fixed 256 × 256 windows. Partition each window into non-overlapping 6 × 6 blocks,
ignoring incomplete edge strips. In saved window order, then row/column order, retain
the first block containing only positive rice codes per tile. Save all eligible counts.
The 6 × 6 size is an engineering choice for a manageable pilot; it is not a validated
minimum field size or the existing 9/3 pixel-quality policy.

This is a convenience shortlist, not random sampling or a claim of representativeness.
Map summaries were already inspected; this is not preregistration. Requiring contiguous
mapped rice favors that type of area and excludes fragmented/mixed blocks. No current
Sentinel-2 cloud or availability outcome was used. Source classification itself uses
Sentinel-2, so the selection remains conditional on that map (EVID-061).

Propose calendar 2021, matching the map label, while disclosing the classifier's
2020–2021 inputs. The map does not establish rice cultivation every month. Administrative context is checked in OBS-56: tile 42 is in Krangkeng, Indramayu;
tile 49 in Dukuhseti, Pati; tile 55 in Dukun, Gresik. Each complete block is covered
by its returned administrative polygon. This does not verify 2021 land use or crop labels.

## How to use the shortlist

Present the mapped-block unit to the advisor: it supports conditional observation
availability and pixel sufficiency, not true farm-size conclusions. Three candidate
blocks do not automatically expand the thesis into a three-site study. For a one-block
engineering pilot, tile 42 is the first by the same source ordering; preserve that rule
rather than choosing whichever later yields the most usable data. No live acquisition
has been performed for these blocks.

Before acquisition: resolve local land-context limitations, finalize the academic unit and
period, prepare the exact request/provenance contract and bounded budget. Do not copy
these blocks into the private-field contract as verified farmer plots.

## Reproducibility

Ignored artifacts: `research/private/replacement-study/open-sea-candidates.geojson`,
`open-sea-selection-audit.json`, and `select-open-sea-candidates.mjs`. The script checks
source TIFF hashes, positive class labels, CRS, geometry validity and unique candidates.
Rerunning it reproduced identical candidate bytes (OBS-54). Canonical method proposal:
research protocol §18. Source evidence: EVID-060/061; raster inspection: OBS-53.
