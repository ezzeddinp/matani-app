# Phase 2 live pilot result

**Updated:** 2026-09-15
**Evidence:** OBS-63/64; execution authorization DEC-50.

The first live pilot passed access, source identity and raster-grid checks. It produced
an honestly rejected observation on January 1, 2021. This demonstrates collection and
missing-value handling, not a favorable research outcome.

| Check | Observed result |
|---|---|
| Catalogue inventory | 142 items on 71 dates; two pages completed for the frozen query |
| Pilot date | January 1, 2021, selected chronologically without cloud screening |
| Provider use | 1 authentication, 2 catalogue, 2 Process requests; no retries |
| Source matching | One identical source product for NDVI/NDMI; both geometries reuse those rasters |
| Grid checks | Expected EPSG:32749, dimensions, origin and resolution passed |
| Offline audit | Saved response hashes, source membership and denominator/count consistency passed |

| Index | Geometry | Source-present pixels | Valid pixels | Mean | Quality decision |
|---|---|---:|---:|---|---|
| NDVI | Original | 36 | 0 | Unavailable | Rejected |
| NDVI | 10 m buffer | 16 | 0 | Unavailable | Rejected |
| NDMI | Original | 9 | 0 | Unavailable | Rejected |
| NDMI | 10 m buffer | 4 | 0 | Unavailable | Rejected |

Both display policies deliver no index for this pilot day. Do not convert its missing
means to zero-valued indices. The saved mask does not justify identifying clouds as the
sole rejection cause. No crop-health conclusion follows.

The 71 catalogue dates are not 71 usable dates. The remaining dates have not been
processed; annual coverage, average gaps and policy differences are still unmeasured.
The catalogue contains multiple items per date; source eligibility must continue to be
checked on every processed response rather than inferred from this one success.

The provider headers report 0.30 processing units in total across the four non-authentication
responses. This is observed pilot consumption, not verified remaining account allowance
or a guaranteed full-study cost. Scaling collection needs a separate total cap and
allowance check. No automatic year-long raster run was started.

Artifacts are preserved under ignored
`research/private/replacement-study/phase2-20260915-pilot-01/`. Reproduce the saved audit
with `python3 research/scripts/audit-phase2-pilot.py research/private/replacement-study/phase2-20260915-pilot-01`.
The nine existing research tests passed again. No app launch, production database change,
farmer UAT or full-year result was involved.
