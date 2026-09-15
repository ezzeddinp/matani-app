# Paper analysis preparation

**Updated:** 2026-09-15
**Status:** Offline geometry analysis and synthetic metric verification; no replacement satellite results.

## Geometry sensitivity result

OBS-58: inward buffering by 10 m gives the following calculated areas. Candidate
locations follow OBS-56. The geometry pair is an implementation of the specification
in research protocol §19; the advisor did not prescribe this exact distance.

| Candidate location | Original area (m²) | Buffered area (m²) | Area removed |
|---|---:|---:|---:|
| Krangkeng, Indramayu | 3557.38 | 1571.63 | 55.82% |
| Dukuhseti, Pati | 3550.68 | 1567.18 | 55.86% |
| Dukun, Gresik | 3549.53 | 1566.41 | 55.87% |

All three buffered polygons remain valid and inside their original blocks. These are
approximately 60 m wide analysis blocks, so removing 10 m from every side removes a
large fraction of their area. The buffer may reduce edge contributions but also reduces
the area available for index calculation. Actual valid-pixel losses and availability
changes require satellite observations. Dividing polygon area by pixel area would not
establish actual sampled pixels, alignment, masks or usable counts.

These results belong in source/geometry preparation or the sensitivity-method description.
They cannot be reported as improved accuracy or measured availability. The mapped blocks'
edges are not verified rice-field boundaries, so the mitigation is limited to sensitivity
to analysis-boundary pixels. It does not resolve classification error.

## Daily comparison ready for provider-independent checking

OBS-59: the runnable daily check implements calendar coverage, per-index/complete-pair
coverage, mean/median/longest inter-observation gaps, boundary absence and unresolved-day
bounds from already-decided source records. It verifies that two different acquisitions
on the same day cannot fabricate a complete pair. It also preserves an independently
passing index when the other decision is unknown. Exact metric definitions remain in
[protocol §19](../.agent/research-protocol.md#19--advisor-supported-direction-and-pre-acquisition-specification).

The synthetic example is a test only and should not appear in the empirical results table.
A completed inventory with no records establishes a known empty day; a missing inventory
does not. Request counts and raw response validation remain the adapter's responsibility.

## Remaining dependency before empirical analysis

CODE: `research/lib/cdse-pilot.mjs` already builds P1D Statistical aggregation with
separate quality/NDVI/NDMI requests. A monthly request window is not a monthly aggregated
result. However, those separate daily outputs do not themselves establish identical
source-product provenance across the indices and geometry variants. The older January
proposal therefore remains preparation evidence, not the final paired study contract.

Before acquisition, freeze the selected site/sample and choose a compatible source
identity strategy. Reuse the existing source-specific pipeline where it can preserve
identical source products across the geometry pair; document any resulting distinction
from Statistical intervals. Do not claim source-specific complete pairs from independently
aggregated outputs without reconciliation. Keep identical quality rules for the two
policies and geometry-specific pixel counts for the buffer comparison.

The eventual results table should contain, for each geometry and policy: total calendar
days, evaluated/unresolved days, any-index coverage, complete-pair coverage, separate
index coverage and gaps. Report policy differences within each geometry, followed by
how those differences change with buffering. Leave all empirical cells unwritten until
real observations and provenance have been checked.

## Reproduce

Run `python3 research/scripts/prepare-buffer-comparison.py` with the saved source artifact,
then `python3 research/scripts/check-daily-delivery.py` and `npm run test:research`.
The geometry script uses the existing Node projection helper and installed Shapely.
The daily checker uses Python's standard library. OBS-58/59 record the actual checks;
no production or provider changes were made.


## Paired Process preparation checkpoint

OBS-60: `node research/scripts/prepare-paired-process.mjs` now produces four deterministic
request templates for the first candidate using the existing production request builder.
The exported source check requires one identical scene/product/path and acquisition
instant across all four responses. It rejects ambiguous multi-source responses; these
must remain unresolved in availability accounting rather than being counted as absent.
This strict initial eligibility may exclude overlap days and must be reported.

CODE: the production adapter's `measure` method selects the latest catalogue feature in
a requested window and performs the two index requests concurrently with retries. It
must not be reused as a once-per-month research time-series collector. Reuse its pure
builders/parser; a research executor needs explicit daily inventory, sequential bounded
requests and original-response preservation.

The four templates currently use January 1 as an offline example only. No observed date
has been selected. Before execution, enumerate catalogue days without cloud-outcome
screening, preserve pagination/completeness, select the first eligible pilot day by the
recorded chronological rule, and substitute its exact window. Catalogue/authentication
budgets still need to be included; four Process requests alone are not the whole budget.

A further comparison check is necessary: original and buffered requests can have different
raster grid origins. Inspect returned TIFF georeferencing and grid alignment before
interpreting their difference solely as edge removal. If alignment differs, use a common
aligned grid or explicitly revise the estimand; do not silently call it pure buffer effect.
The next work is this acquisition/grid contract and bounded executor, not empirical
results writing or general application cleanup.
