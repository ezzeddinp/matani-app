# Matani

**Updated:** 2026-09-09

_Mata tani_ — "the farmer's eye." Matani is a padi-only mobile decision support application structured by the thesis team's GROW workflow. Its evaluation backbone asks whether Sentinel-2 NDVI/NDMI monitoring can be used defensibly over Indonesian smallholder fields. The Expo / React Native app captures field polygons and presents dated raw index observations, weather context, notes, and explicit data states without classifying or diagnosing crop health.

## Project status

**Thesis groundwork phase.** The app is a hackathon-origin prototype now being rebuilt on measurement provenance. It is not thesis-ready, and this README does not claim otherwise.

The project distinguishes four data states, and the distinction is a product feature, not an implementation detail:

- **fixture** — labeled, deterministic test data.
- **prototype** — partially wired, not provenance-safe.
- **measured** — persisted and provenance-complete.
- **unavailable** — an honest, stated absence of data.

Current status (2026-09-07; OBS-32):

- **M0 remains open:** local checks pass; exact-revision CI and platform credential/key
  controls still require evidence.
- **M1 is PASS** under `M1-CLOSURE-2026-08-30` (DEC-30).
- **M2 is implemented, with acceptance open.** The sole current measurement qualification
  is in [.agent/project-architecture.md § 2](.agent/project-architecture.md). See
  OBS-28/30/31 for scoped hosted evidence and subsequent failures.
- [Current audit and closure requirements](docs/thesis-app-notion-alignment-audit-2026-09-07.md).

The [canonical roadmap](.agent/implementation-plan.md) controls M0–M4 sequencing.

## Stack

- **Mobile** — Expo SDK 57 / React Native 0.86 / React 19.2 with Expo Router. An
  app-specific Expo development client is the default map-capable device workflow
  (DEC-43).
- **Backend** — Express 5 (Node), colocated in [`backend/`](backend/), deployed on Vercel; the runtime and TypeScript entrypoints expose the same protected provider/measurement routes. Satellite, weather, and Gemini data calls use this boundary; mapping/place-search/display services remain client presentation integrations (ADR-10 / DEC-20).
- **Data & auth** — Supabase: Auth, Postgres, PostGIS, Row Level Security.
- **Maps** — Google Maps (`react-native-maps`) for polygon field drawing.
- **Satellite** — Sentinel-2 L2A via CDSE Catalog and native-grid Process API measurement requests; Statistical API remains research/legacy code (CODE: `backend/measurement/`; ADR-15).
- **Weather** — Open-Meteo through the protected backend, with WMO weather-code mapping.
- **AI data summary** — optional, env-configured Google Gemini summary, disabled by default and constrained to descriptive output.

## Getting started

**Prerequisites:** Node 20.19+ and npm. Python 3.12 is required for the research tests; Docker
Desktop and the Supabase CLI are required for local migration/RLS verification.

From a clean clone:

```sh
# 1. App dependencies (repo root)
npm install

# 2. App environment — copy the template and fill in the values.
#    Each variable is labeled in the file (Required / Optional, and where to get it).
cp .env.example .env

# 3. Backend dependencies + environment
cd backend
npm install
cp .env.example .env   # fill in the server-secret provider keys (see the labeled comments)
```

Run the backend (port 5001; the root endpoint at `/` responds with a status message):

```sh
cd backend
npm run dev
```

After the Matani development build has been installed on the device, run Metro:

```sh
npm start
```

`npm start` targets the development client; `npm run start:clear` does the same with a
clean Metro cache. `npm run android` and `npm run ios` compile local native builds (iOS
requires macOS/Xcode). On Windows, create the physical-iPhone build in EAS:

```sh
# One-time per EAS environment: configure both Maps values securely in EAS.
eas env:set development --name GOOGLE_MAPS_API_KEY_ANDROID --visibility sensitive
eas env:set development --name GOOGLE_MAPS_API_KEY_IOS --visibility sensitive

# Build, install the resulting Matani app on the registered iPhone, then run npm start.
npm run build:development:ios
```

The generic Expo Go binary cannot receive this project's iOS Google Maps native library
or build-time key. `npm run start:go` is retained only for limited non-map diagnostics;
clearing Metro cannot change native code already installed on the phone
(EVID-033/034). Local `.env` files are intentionally ignored and do not reach a remote
EAS build, so the development EAS environment must also contain both Maps values
(EVID-036/037).

Run the fixture-only local checks:

```sh
npm run lint
npm run typecheck
npm test
npm run test:backend
python -m unittest discover -s research/tests -p "test_*.py"
```

Run the local database gates after Docker is ready:

```sh
npx supabase start
npm run db:reset
npm run db:test
npm run db:types
```

**Note on Maps keys:** Android and iOS native builds inject separate `GOOGLE_MAPS_API_KEY_ANDROID` / `GOOGLE_MAPS_API_KEY_IOS` values through `app.config.ts`. These keys are **client-visible in shipped binaries by design** — restrict each key to its platform application and Maps SDK API. Ladang has no Apple MapKit fallback. Google Maps on iOS therefore requires a custom native build containing the Google library and a valid iOS key (EVID-019/033; DEC-42).

## Documentation map

The canonical project knowledge lives in [`.agent/`](.agent/). Listed in precedence order (highest first — when documents disagree, the more canonical one wins):

| Document | Canonical for |
|----------|---------------|
| [`.agent/evidence-register.md`](.agent/evidence-register.md) | Every externally sourced factual claim (`EVID-*`) and dated observation (`OBS-*`). |
| [`.agent/research-protocol.md`](.agent/research-protocol.md) | Research questions, hypotheses, methodology, and validity of the evaluation. |
| [`.agent/project-architecture.md`](.agent/project-architecture.md) | As-built and target architecture, trust boundaries, ADRs, security risks — and the canonical measurement-provenance wording (§ 2). |
| [`.agent/data-evaluation-plan.md`](.agent/data-evaluation-plan.md) | The engineering measurement contract: provider adapter, quality pipeline, persistence/provenance, idempotency, fixtures. |
| [`.agent/product-requirements.md`](.agent/product-requirements.md) | Feature behavior, scope tags, and product invariants. |
| [`.agent/product-brief.md`](.agent/product-brief.md) | Positioning, target users, and phased scope. |
| [`.agent/design-guidelines.md`](.agent/design-guidelines.md) | Design tokens, screen map, component patterns, and data-state presentation rules. |
| [`.agent/implementation-plan.md`](.agent/implementation-plan.md) | Milestone sequencing (M0–M4) and acceptance criteria. |
| [`.agent/context-dump.md`](.agent/context-dump.md) | Project history, the hackathon→thesis pivot, the decisions index (`DEC-*`), and the EN↔ID glossary. |
| [`AGENTS.md`](AGENTS.md) | Rules every agent working in this repo follows: vocabulary, provenance taxonomy, and honesty constraints. |

The current cross-checked paper revision is [`.agent/thesis-revised-point-21.docx`](.agent/thesis-revised-point-21.docx). A cache-safe duplicate with an unambiguous filename is available at [`.agent/thesis-revised-point-21-aligned-2026-07-28.docx`](.agent/thesis-revised-point-21-aligned-2026-07-28.docx). Paragraph-level traceability is in [`docs/thesis-revision-point-21.md`](docs/thesis-revision-point-21.md), the focused Section E/F check is in [`docs/thesis-ef-alignment-cross-check-2026-07-28.md`](docs/thesis-ef-alignment-cross-check-2026-07-28.md), and the wider code/paper/Notion matrix is in [`docs/alignment-cross-check-2026-07-27.md`](docs/alignment-cross-check-2026-07-27.md). The original `.agent/thesis.docx` is preserved for comparison.

## Provenance and honesty

Every external claim in the documentation carries a typed evidence marker (`EVID-*` for sourced facts, `CODE-*` / `file:line` for repository facts, `DEC-*` for decisions, `OBS-*` for observations, `HYP-*` for unvalidated thresholds). Synthetic or fixture data is never presented as measured — in the docs or in the product UI — and unavailability is stated honestly rather than papered over. The full ruleset is in [`AGENTS.md`](AGENTS.md).
