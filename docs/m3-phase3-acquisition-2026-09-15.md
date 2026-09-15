# Phase 3 acquisition and frozen dataset

**Updated:** 2026-09-15
**Status:** Complete; both interrupted downloads recovered, zero unresolved requests.
**Basis:** DEC-49/51/52; OBS-65–69. Method remains in research protocol §20.

## Dataset accounting

OBS-69 accounts for the revised frozen 2021 case in Krangkeng, Indramayu:

| Category | Days |
|---|---:|
| Calendar denominator | 365 |
| Catalogue dates | 71 |
| Source-compatible, verified NDVI/NDMI pairs | 71 |
| Unresolved pair dates | 0 |
| No acquisition under the complete frozen catalogue query | 294 |

Verified pairs include quality-rejected records; these are not counts of usable dates.
OBS-69 recovered both interrupted NDVI downloads using identical requests. Both returned
zero valid NDVI pixels in both geometries: their means remain null and their quality
status is rejected. They are now resolved observations rather than unknown downloads.
The original failures remain in the execution history. These observations describe one
mapped analysis block, not surveyed farm boundaries or crop-health accuracy.

## Initial execution and recovery (historical DEC-51)

OBS-65 supplied the account allowance. DEC-51 bounded acquisition to 140 new Process
attempts, up to 10 authentication attempts, sequential collection and no automatic Process
retries. Actual recorded use was 140 Process and four authentication attempts. No new
catalogue query was made. The two failed Process attempts were never resent; the other
138 responses were preserved. After two recorded recovery decisions, remaining collection
used the existing production HTTP transport. Scientific settings were unchanged.

OBS-67 records **2.76 reported processing units plus two unknown request charges**.
The initial stopping rule paused on unknown use; the documented recoveries retained the
140-attempt cap and applied the 10-unit threshold to reported use. It is not a hard
provider-side total cap, exact total consumption, or refreshed account balance.

## Explicit retries before analysis (DEC-52; OBS-69)

The developer requested retrying the two failed NDVI downloads before Phase 4. One retry
per date succeeded and matched the previously saved NDMI source. No other index or date
was re-requested. Added use: two Process requests, one authentication and 0.04 reported
processing units. Cumulative Phase 3 use is 142 Process attempts, five authentication
attempts and 2.80 reported units plus the original two unknown charges. Recovering these
responses does not establish whether Wi-Fi, the provider or another transport component
caused the original failures. All quality outcomes were retained.

## Frozen artifacts

CODE: `research/scripts/run-phase3.mjs` preserves request journals, raw multipart bodies,
headers, hashes, source inventory, original pilot, frozen settings, code versions and
recovery records. TIFF/userdata are retained within the original multipart bodies and
reparsed during audit. Each accepted index is checked against its catalogue day, source
identity, expected grid and local geometry masks. Independently verified indices survive
pair failures. Original and buffered statistics come from the same per-index raster.

- Acquisition: `research/private/replacement-study/phase3-20260915-collection-01/`
- Original freeze: `research/private/replacement-study/phase3-20260915-frozen-01/`
- Retry artifacts: `research/private/replacement-study/phase3-20260915-retry-01/`
- **Current snapshot and manifest:** `research/private/replacement-study/phase3-20260915-frozen-02/`
- Current snapshot SHA256: `41ab605fb814ea07b29db3b4bccf953dcad3bd9c0bb59f170f81e0ec31cdbdc1`

OBS-68 verifies the original 470 acquisition/code/evidence files; OBS-69 verifies the
linked retry evidence and byte-identical reproduction of the current revision. The local artifacts are read-only and hash-checked, not externally archived
write-once storage. They remain ignored by Git; keep these directories together when
backing up the research evidence. The manifest records the acquisition directory's path.

## Reproduce without provider calls

```sh
node research/scripts/retry-phase3.mjs --check
node research/scripts/retry-phase3.mjs --audit research/private/replacement-study/phase3-20260915-frozen-02
node research/scripts/retry-phase3.mjs --freeze /tmp/matani-phase3-current-reproduction
```

Use a fresh reproduction directory. The executor refuses to overwrite a freeze and
checks current code against its archived versions before reproducing the snapshot.
OBS-68 also records tamper rejection and a completed-run recovery check without new
attempts. No live rerun is needed to reproduce the dataset.

## Next phase

Phase 3 is closed after the explicit retries resolved both download gaps.
Phase 4 compares delivery policies and buffer sensitivity using **frozen-02**, while
retaining the original request failures as operational evidence. Do not
claim policy benefit, annual usable cadence or a completed M3 research-validation
milestone before those analyses and the remaining technical/manuscript work.
