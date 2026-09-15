# Alternatives to the Teluknaga source

**Updated:** 2026-09-14
**Decision basis:** DEC-47 prioritizes defensible Indonesian padi data over locality.
**Recommendation:** Open-SEA-Rice-10 is the strongest source found for the next inspection, not yet an approved study site (OBS-52).

| Source | Verified strengths | Limitation for Matani | Assessment |
|---|---|---|---|
| Open-SEA-Rice-10 | Explicit CC BY 4.0, 2021 label, georeferenced rice-class raster, published method and uncertainty; metadata/index retrieved | Raster patches are not individual plots. Sentinel-2 contributed to classification. Archive retrieved; sampled positive rice codes verified; zero/missingness distinction remains unresolved (OBS-53). | First source to inspect next (EVID-060/061; OBS-52) |
| NESEA-Rice10 | Explicit CC BY 4.0, annual 2017–2019 maps; a 2019 tile already downloaded and checked | Class-code interpretation remains unresolved in inspected documentation; classification errors and missed small/rain-fed rice; no surveyed parcels | Secondary source/comparison, keeping years separate (EVID-058/059; OBS-51) |
| Five-region Indonesian paddy segmentation source | Explicit CC BY 4.0; LBS-derived masks described for Bali, Yogyakarta, Banten and East Java | Precise georeferencing intentionally removed; approximate centroids cannot replace boundaries | Exclude from exact-location extraction (EVID-062) |
| Ministry LBS2019 candidate | Original polygon/IDs recoverable | Exact reuse/date evidence unresolved; current polygon has narrow-geometry concern | Retain screening history; no need to force this candidate (OBS-46/50) |

## Why the recommendation is stronger

EVID-060/061: [Open-SEA-Rice-10](https://zenodo.org/records/14627003) supplies clearer
licensing, year and class documentation than our ministry candidate. Its
[published methods and uncertainty discussion](https://www.nature.com/articles/s41597-025-05722-1)
allow us to describe known limitations instead of guessing them. These are advantages
in traceability, not proof that every mapped location is accurate.

OBS-52: the metadata and small grid archive are preserved and the archive checksum
matches the published record. The 547 MB raster bundle subsequently downloaded and passed its checksum check (OBS-53). No locality has been selected.

## What this would mean for the thesis

Proposed interpretation, not approved methodology: evaluate monitoring over a documented
rice-classified analysis area. Do not call a connected raster patch a farmer's plot or
interpret its size as true field size. Pixel sufficiency would concern the selected
analysis geometry under the declared policy.

EVID-061 / inference: because Sentinel-2 contributes to this map, selection may depend
on optical detectability. A study using it should describe results as conditional on
mapped rice areas, not all rice fields or independent crop-label validation. A map's
classification accuracy must not become a claim about Matani's accuracy.

## Next concrete step

Inspect the actual raster, its CRS, nodata and class values. Establish a small,
reproducible Indonesian candidate pool using the map and a documented spatial selection
rule before querying Sentinel-2 outcomes. Then propose a named location, geometry and
compatible period. Avoid choosing by clearest imagery, expanding shapes until pixel
floors pass, or treating the grid index as agricultural boundaries.

Use the source's 2021 label and 2020–2021 input period explicitly; do not assume monthly
rice cultivation. Confirm the exact temporal interpretation before freezing a monitoring
window. Selecting an area from this source does not require new farmer data collection,
but academic acceptance of the mapped-area unit remains pending.

Canonical evidence: `.agent/evidence-register.md`, EVID-058–062 and OBS-50–52.


## Raster inspection completed (OBS-53)

The complete archive matches its published checksum. All 137 Indonesia-labelled index
entries have corresponding raster files. Three Java tiles were inspected at nine fixed
windows each, chosen without looking at satellite availability. Coordinates match the
index; positive rice codes 1/2/3 are present. No explicit nodata tag exists in those
three files, so zero is not independently verified non-rice. The sole missing indexed
file is Vietnam-labelled ID 248. This does not establish complete detection of rice
across Indonesia.

Assessment: **usable for further mapped-rice-area screening**, with licence, retrieval,
georeferencing and positive class encoding checked. It remains unsuitable as proof of
individual farmer boundaries or independent crop ground truth. No Sentinel-2 index
measurements were generated.

Next: define the analysis-unit and spatial selection rule, then freeze a small candidate
pool and a compatible period before checking Sentinel-2 outcomes. Preserve zeros as
unresolved background rather than negative crop ground truth. A selected geometry must
not be enlarged or relocated to make pixel floors pass.
