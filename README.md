# Matani

_Mata tani_ — "the farmer's eye." Matani is a thesis project evaluating whether Sentinel-2 NDVI/NDMI monitoring can work honestly for Indonesian smallholder farms, where fields are often smaller than half a hectare and tropical cloud cover strains optical observation. The thesis contribution is the measurement evaluation itself; the Expo / React Native app (Indonesian UI) is its delivery and field-interaction vehicle — the instrument that captures real field polygons and, once the measurement pipeline is built, surfaces provenance-safe satellite observations, weather, and optional advisory to farmers.

## Project status

**Thesis groundwork phase.** The app is a hackathon-origin prototype now being rebuilt on measurement provenance. It is not thesis-ready, and this README does not claim otherwise.

The project distinguishes four data states, and the distinction is a product feature, not an implementation detail:

- **fixture** — labeled, deterministic test data.
- **prototype** — partially wired, not provenance-safe.
- **measured** — persisted and provenance-complete.
- **unavailable** — an honest, stated absence of data.

Where things stand today:

- The satellite path is a **prototype with a silent synthetic fallback** — a Sentinel Hub request wired to the field list that falls back to synthesized values the UI does not distinguish from real ones; the field-detail history is fully synthetic. This is stated only via the canonical wording in [`.agent/project-architecture.md` § 2 (Current measurement provenance)](.agent/project-architecture.md) — read it there; it is never softened or restated.
- **No `measured` data exists yet.** Nothing is persisted with provenance.
- What _is_ real: interactive polygon field capture persisted to Supabase (PostGIS), area computation, weather, and education content.

The roadmap to a real, persisted, provenance-complete pipeline runs across milestones **M0–M4** — see [`.agent/implementation-plan.md`](.agent/implementation-plan.md).

## Stack

- **Mobile** — Expo SDK 54 / React Native 0.81 with expo-router (file-based routes), TypeScript.
- **Backend** — Express (Node), colocated in [`backend/`](backend/), deployed on Vercel; proxies all external providers.
- **Data & auth** — Supabase: Auth, Postgres, PostGIS, Row Level Security.
- **Maps** — Google Maps (`react-native-maps`) for polygon field drawing.
- **Satellite** — Sentinel-2 L2A via Sentinel Hub Statistical API semantics. Target provider: Copernicus Data Space Ecosystem (migration from the commercial host is decided, not yet done).
- **Weather** — Open-Meteo (target default; AccuWeather is the as-built primary, being dropped).
- **AI advisory** — optional, env-configured Google Gemini summary (disabled-by-default is target work).

## Getting started

**Prerequisites:** Node and npm.

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

Run the app:

```sh
npx expo start
```

**Note on Maps keys:** `GOOGLE_MAPS_API_KEY_IOS` / `GOOGLE_MAPS_API_KEY_ANDROID` are injected into the native build from env by `app.config.ts` at build time. They are **client-visible in the shipped binary by design** — the control is per-platform, per-API key restriction, not secrecy.

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

## Provenance and honesty

Every external claim in the documentation carries a typed evidence marker (`EVID-*` for sourced facts, `CODE-*` / `file:line` for repository facts, `DEC-*` for decisions, `OBS-*` for observations, `HYP-*` for unvalidated thresholds). Synthetic or fixture data is never presented as measured — in the docs or in the product UI — and unavailability is stated honestly rather than papered over. The full ruleset is in [`AGENTS.md`](AGENTS.md).
