# Phase 5 technical delivery evaluation

**Updated:** 2026-09-15
**Status:** Scoped automated delivery checks complete; rendered-device and live database evidence excluded.
**Evidence:** OBS-71. Method scope: plan 016 Phase 5 and protocol §19/20.

## Actual delivery boundary

CODE: `backend/measurement/statistics.js` decides one joint quality status. The
`measurement_observations` view in migration `20260830000100_m2_measurement_pipeline.sql`
projects both means only for `passed` records. The field-detail screen reads that view.
Consequently the actual app implements complete-pair delivery; independent delivery
remains the offline comparator. This evaluation does not claim an independent-policy
feature was shipped or a production database was populated from the research snapshot.

## Scenario ledger

| Scenario | Observed automated result | Evidence boundary |
|---|---|---|
| Complete (9 NDVI / 3 NDMI pixels) | Production quality passes; worker preserves payload; numeric zero remains zero | Executed production JS/TS with fixtures |
| Partial (9/2 and 8/3) | Joint quality rejects; static SQL projects neither mean | Quality executed; SQL view inspected, not executed |
| Both rejected | Rejection status/reason preserved; unavailable state and null placeholder retained | Worker replay and actual presentation helpers |
| Missing acquisition | No timestamp substitution from creation time; null produces `--`; empty chart has no dots | Actual helper/JSX evaluated with host stubs |
| Duplicate / concurrent request | Worker reuse avoids another simulated provider call/write; backend concurrent-request tests pass | Fake admin/provider plus local HTTP tests, not DB locking proof |
| Failed then recovered | Failure produces no observation write; subsequent simulated success writes once | Worker replay; not live-provider recovery evidence |
| Irregular observation gaps | Date-proportional positions; no connecting line; null omitted and zero retained | Unit check and actual chart JSX with host stubs |

OBS-71: all 46 backend and 35 root tests pass, as do lint and frontend type checking.
The new chart test exercises a one-day position inside a ten-day range, endpoints,
single-date centering and invalid dates. Existing fixture replay covers persistence
payload preservation, in-flight reuse and simulated timeout/recovery. Fixture labels
remain in every evidence artifact; these are not additional scientific observations.

## Experiment-blocking presentation correction

CODE: the previous field-detail chart spaced observations by row index and connected
them across gaps. PRD-11 already requires true acquisition dates and no gap interpolation.
The chart now plots dots at elapsed-date positions through `utils/observation-chart.ts`.
No delivery policy, provider, database schema or measurement threshold was changed.
The chart remains bounded by its first and last numeric observation; Phase 4's full-year
calendar figure supplies the study-period boundary absences. It is not a full-year UI axis.

## Reproduce

```sh
node research/scripts/check-phase5.mjs /tmp/matani-phase5-new-presentation.json
node research/scripts/run-m3-replay.mjs /tmp/matani-phase5-new-worker.json
npm test
npm run test:backend
npm run lint
npm run typecheck
```

Use fresh output filenames. Backend route tests need permission to bind localhost;
the first sandbox run failed with `listen EPERM`, and the permitted rerun passed.
No live satellite call is made by these checks. Artifacts and source hashes are stored
under ignored `research/private/replacement-study/phase5-20260915-checks/`.

## Limits and next work

OBS-71 does not establish a rendered native layout, physical-device interaction,
PostgreSQL view execution, RLS/locking correctness or farmer usability. Do not expand
this into an end-to-end device validation claim. Static SQL inspection supports only
the stated projection contract. Phase 6 manuscript drafting may use this explicitly
scoped technical evidence; any stronger runtime claim needs its own verification.
The zero empirical policy difference from Phase 4 remains unchanged.
