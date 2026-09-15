# M3 dataset inventory

**Updated:** 2026-09-11
**Observation:** OBS-41. **Scope:** read-only local recovery search; no provider/database query.

| Artifact | Local result | Permitted use |
|---|---|---|
| `research/private/m1-study-fields.geojson` | Not present | Its prior existence is recorded in OBS-19; do not invent verification or consent metadata |
| `research/outputs/live-availability-teluknaga-2025-07_to_2026-07.json` | Not found | Required original for reproducing the approved one-field historical result |
| `docs/live-availability-2025-07_to_2026-07.json` | Subsequently supplied by the developer; recovered as the legacy report (OBS-43) | Historical earlier two-polygon prototype; must not substitute it for the approved field |
| `research/fixtures/availability-observations.csv` | Present | Existing fixture; not a Teluknaga observation |
| `research/outputs/fixture-feasibility-report.json` | Present | Existing calculation example only |
| Persisted M2 export | No research export recovered | Production existence/status not inferred from absence of a local export |
| `research/fixtures/m3-m1-report.json` | Added in this work | Explicit synthetic input spanning quality/count/season edge cases; not historical M1 data |

## Search and recovery boundary

Inspected paths referenced in `docs/m1-closure-runbook-2026-08-28.md` and OBS-12/19,
then filename searches for availability, M1 and Teluknaga artifacts under the repository,
`/Users/billy/codeOS`, `/Users/billy/Downloads`, and `/private/tmp`, excluding dependency
and Git directories. No matching original live artifact was found in those searched
locations. This is not an exhaustive search of every disk, cloud service or old Windows
workstation. The historical workflow includes Windows commands (CODE: closure runbook).

Recovery action: locate the two named approved-study files in the original workstation
or backup and restore them to ignored research folders. Preserve bytes and checksum
before any normalization; retain private geometry/consent records outside publication
artifacts. Do not infer which external backup exists.

## Historical reconciliation target

OBS-19 records 86 intervals, 32 joint passes and 54 rejections, with dry 30/60 and wet
2/26. These are **historical register values, not reproduced results in this run**.
The restored report must reproduce them or yield an explained discrepancy. Its exact
Statistical API mosaic identity limitation stays attached. No raw index values, pixel
series, hashes, season labels or measured plots can be reconstructed from those totals.

## Current pilot boundary

OBS-42 covers fixture-only offline tests and production-worker replay. No measured
RQ1/RQ3 pilot is currently claimed. Water-mask sensitivity is excluded because original
per-pixel/mask inputs were not recovered. Descriptive code preparation can continue
without those records; the measured-results chapter cannot be completed honestly yet.

## Recovery update (OBS-43)

The supplied legacy file was frozen and audited separately. The 0.11093 ha field has 25/86 intervals with both indices nonzero; the 3.89709 ha field has 28/86. Median nonzero gaps are 7 days for both; longest gaps are 113 and 133 days. These exactly match the scoped OBS-12 figures, not OBS-19. No quality thresholds or season labels were retroactively inserted.

The original bytes, derived audit and SHA-256 manifest are under ignored `research/private/recovered-legacy-m1-2026-09-10/`. The developer-supplied file is left unchanged. The separate [legacy prototype plot](../output/pdf/legacy-m1-prototype-pixels.png) shows raw valid-pixel counts only. Approved Teluknaga reproduction remains pending.


## Teluknaga replacement-source check — September 11

OBS-45 records successful administrative-boundary recovery and unsuccessful sawah retrieval. The administrative feature identifies the requested region, but cannot serve as a farm-field study unit. Raw response and request/checksum manifest: `research/private/replacement-study/`. Reuse rights, sawah feature geometry/scale, observation year and seasonal crop identity remain unresolved. No replacement study unit has been selected.

Next bounded action: retry the sawah endpoint after service recovery or inspect an alternate official Teluknaga/Tangerang sawah source. Do not switch to Magelang automatically, derive farmer parcels by splitting administrative geometry, or start satellite processing over the administrative region.


## Ministry alternative recovered — September 11

OBS-46 supersedes the lack of any sawah sample: five original polygons are now saved from the LBS2019 Banten service. Four lie fully inside the recovered Teluknaga administrative geometry. The lowest eligible sampled FID, 297, is saved as `research/private/replacement-study/candidate-297.geojson`; the raw download remains unchanged. Its source area is about 0.187 ha. This is a mapped sawah candidate, not a verified farmer parcel.

A 2019 calendar-year retrospective window is proposed to align with the source label, instead of silently extending this label to 2025–2026. Exact survey date, seasonal cultivation and reuse terms remain unresolved. The candidate manifest documents those gaps and must not be fed to the private-input runner as approved evidence. Source screening can proceed without farmer interviews; actual public-data reuse and academic claims still need a supported basis.
