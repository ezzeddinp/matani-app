# Matani M0/M1 build and cross-check report

**Checked:** 2026-07-28  
**Scope:** `matani-app` excluding dependency directories; `.agent/` canonical documents
and the M1 research workspace are included.  
**Data-state rule:** the generated M1 report is `fixture`, never `measured`.

## Executive result

- **The M0 foundation is implemented and its applicable local checks pass.**
- **M0 is not formally complete under the roadmap's all-criteria rule.** A remote GitHub
  Actions run has not occurred; developer-controlled secret rotation/key restrictions
  plus hosted Supabase state cannot be inferred; and the literal exact-polygon/
  acquisition-window acceptance check belongs to the not-yet-existing M2 measurement
  request. The current M0 route honestly validates only its bbox prototype contract.
- **M1 is partial and is not complete.** The tested calculation workspace and engineering
  contract are built. No live CDSE representative-site study has been run, so no measured
  feasibility result or monitoring cadence exists.
- **M2 must not start yet.** M1's measured study/cadence gate remains open.

## What changed

| Area | Before | After |
|---|---|---|
| Mobile runtime | Expo SDK 57 / React Native 0.86; the default workflow included a development client. | Expo SDK 54 / React Native 0.81 / React 19.1; SDK-compatible navigation imports, Expo Go default scripts, and no unused `@expo/ui` or `expo-dev-client` (DEC-22/ADR-13). |
| Backend boundary | Provider routes had no JWT gate and permissive CORS. | Supabase token verification, origin allowlist, route bounds, per-user/per-route limiting, quota admission, concurrent-equivalent rejection, structured logs, and sanitized failures run before provider handlers (`backend/app.js`, `backend/security.js`, `backend/config.js`). |
| Mobile provider calls | Backend requests did not consistently carry the active session. | `utils/backend-api.ts` attaches the current Supabase bearer token; satellite, weather, and AI calls use it. |
| Gemini | A key was enough to activate the route. | `AI_SUMMARY_ENABLED` is false by default and tested. |
| Provider configuration | Several provider endpoints were fixed in source. | Endpoint and security limits are environment-configurable; the example lists only consumed variables. |
| Database install | `supabase_setup.sql` was duplicated and not a reliable clean migration. | Ordered migration, seed, local config, pgTAP tests, `security_invoker` view, RLS policies, triggers, geometry column, and generated TypeScript types exist under `supabase/`. The legacy file is historical input only. |
| Verification | No complete fixture-first test/CI surface; lint had debt. | Root artifact tests, seven backend security tests, three research tests, strict zero-warning lint, type-check scripts, DB scripts, and a fixture-only GitHub Actions workflow exist. |
| M1 analysis | No executable retrospective report calculator. | `research/src/matani_rs/feasibility.py`, CLI, manifest, fixture input/output, and unit tests calculate the protocol's per-site metrics while withholding cadence for non-measured input. |
| M1 contract | Physical schema, worker, geometry hash, and processing versions were open. | DEC-21/ADR-12 plus `research/contracts/measurement-contract-v1.json` and a migration-ready M2 draft close the design choices without applying M2 early. |

## Verification evidence

| Check | Result |
|---|---|
| Root dependency install | PASS — `npm install --ignore-scripts --no-audit --no-fund` |
| Backend clean install | PASS — `npm ci --prefix backend` |
| Placeholder Expo config | PASS — `npx expo config --type public` |
| Expo dependency matrix | PASS — `npx expo install --check` |
| Expo Doctor | PASS — 18/18 |
| iOS Metro export | PASS — final SDK 54 graph, 1,587 modules |
| Android Metro export | PASS — final SDK 54 graph, 1,583 modules |
| Expo Go start smoke test | PASS — Metro advertised `Using Expo Go` and produced a device QR endpoint |
| Combined code verification | PASS — `npm run verify` |
| Lint | PASS — 0 errors, 0 warnings |
| TypeScript | PASS |
| Root fixture-only tests | PASS — 3/3 |
| Backend security tests | PASS — 7/7 |
| Research tests | PASS — 3/3 |
| Empty DB migration + reset/reapply | PASS — two consecutive `supabase db reset` runs |
| RLS/view/geometry/trigger pgTAP | PASS — 10/10 |
| Generated DB types | PASS — `supabase/types/database.types.ts` regenerated from local migrated schema |
| Diff hygiene | PASS — `git diff --check`; no local Supabase credentials found in tracked project scope |
| Remote GitHub Actions | NOT RUN — workflow exists, but no push/run was authorized |
| Hosted Supabase migration verification | NOT RUN — applying hosted changes was not authorized |
| Exact-polygon + acquisition-window route validation | OPEN — the M2 measurement request does not exist; the M0 bbox route is bounded but is not relabeled as that future pipeline |

The Windows host did not have an installed Python interpreter during the final recheck.
The three research tests were therefore rerun successfully with a temporary official
Python 3.12.6 embeddable runtime, which was removed afterward. The repository test
launcher now discovers `PYTHON`, a local Python 3 executable, the Windows launcher, or
the temporary verification runtime instead of hard-coding `py -3`. Python 3.12 remains
a documented prerequisite for running the full verification suite.

The first pgTAP attempt exposed that the installed extension does not provide
`col_is_generated`. The test was corrected to assert `information_schema.columns.is_generated
= 'ALWAYS'`; the complete 10-test suite then passed. A local `expo-router` installation
also lacked its declaration file after dependency reconciliation; reinstalling the
locked package restored `index.d.ts`, after which the full combined verification passed.

The later SDK 54 downgrade required replacing SDK 57-only Router subpath imports with
their public React Navigation packages and using `StyleSheet.absoluteFillObject` for the
React Native 0.81 type surface. Local iOS/Android bundle success does not override the
physical-iOS Expo Go distribution limitation in EVID-023.

The SDK 54 production audit reports 13 moderate, 20 high, and 0 critical transitive
findings (OBS-05). npm's broad suggested fixes return Expo/React Native to SDK 57-era
versions, so no forced audit rewrite was applied.

## M1 completion cross-check

| M1 acceptance requirement | Status | Evidence / missing input |
|---|---|---|
| Tested Python research workspace | PASS | `research/`; 3/3 tests |
| Engineering contract decisions closed | PASS | DEC-21, ADR-12, `research/contracts/` |
| Fresh quota-source check | PASS for published limits only | EVID-010 rechecked 2026-07-28 |
| Twelve-month representative padi-site acquisition | OPEN | Requires approved sites/polygons and live CDSE OAuth credentials |
| Polygon-level measured quality metrics per site/season | OPEN | No live acquisition dataset |
| Measured request/PU use checked against quota | OPEN | Fixture accounting is not provider consumption |
| Defensible cadence per location and season | OPEN | Explicitly withheld until measured study passes |

`research/outputs/fixture-feasibility-report.json` verifies the report mechanism only.
It cannot be cited as an Indonesian availability finding and does not convert the current
satellite prototype into `measured`.

## Canonical-document alignment

Updated together with the implementation:

- `.agent/evidence-register.md` — EVID-010 checked date and current official quota limits.
- `.agent/research-protocol.md` — fixture execution status and cadence prohibition.
- `.agent/project-architecture.md` — protected boundary, M0 baseline, ADR-11, ADR-12,
  current local verification.
- `.agent/data-evaluation-plan.md` — DEC-21 contract decisions and implemented M1
  analysis interface.
- `.agent/product-requirements.md` — authenticated backend calls, RLS view status, and
  Gemini-off behavior.
- `.agent/implementation-plan.md` — explicit M0/M1 gate status.
- `.agent/context-dump.md` — DEC-21.

The thesis/app honesty boundary remains unchanged: there is still no
provenance-complete stored satellite measurement, no licensed monitoring cadence, and no
claim that the present application is thesis-ready.

The point-21 DOCX was also normalized from the clean canonical revision after a stale
copy exposed contradictory Section E/F wording. The current file and its cache-safe
duplicate now state bbox as current prototype behavior and exact-polygon processing as
the M2 target. Their ZIP/XML structures and identical hashes were verified; see
`docs/thesis-ef-alignment-cross-check-2026-07-28.md`.
