# AGENTS.md

Matani is a thesis project: a **mobile decision support application (DSS) for padi-field time-series monitoring** built on Sentinel-2 NDVI, SWIR-derived NDMI, and weather data, structured by the thesis paper's GROW workflow (Gather → Recognize → Offer → Warn). It is a **three-author group thesis** (DEC-17); the repo owner remains "the developer". The **measurement evaluation** of Sentinel-2 NDVI/NDMI monitoring over Indonesian smallholder fields is the thesis's evaluation backbone, not a separate thesis (DEC-14): the DSS is only as defensible as its measurements. **Both thesis and product crop scope are padi (rice) only; Matani presents dated index observations and does not diagnose crop health** (DEC-24, superseding DEC-11/15/19). The Expo mobile app is the delivery and field-interaction vehicle. Every agent working in this repository follows the rules below.

## Document precedence

When documents disagree, the more canonical one wins. Precedence, highest first:

1. `.agent/evidence-register.md` — external factual claims (EVID-*)
2. `.agent/research-protocol.md` — research questions, methodology, validity
3. `.agent/project-architecture.md` — as-built and target system, trust boundaries, ADRs, security risks, verification baseline, **the canonical NDVI provenance wording (§ Current measurement provenance)**
4. `.agent/data-evaluation-plan.md` — engineering measurement contract, quality pipeline, provenance/persistence
5. `.agent/product-requirements.md` — feature behavior and invariants
6. `.agent/product-brief.md` — positioning and phased scope
7. `.agent/design-guidelines.md` — design system
8. `.agent/implementation-plan.md` — roadmap (M0–M4)
9. `.agent/context-dump.md` — history and decision record
10. `README.md` — onboarding summary; never canonical

A claim may live in exactly one canonical home. Other documents link to it with a short role-specific summary — never duplicate canonical wording verbatim.

## Provenance taxonomy (mandatory)

Every non-obvious claim in any document carries a typed marker:

- **EVID-\*** — externally sourced research/domain claim. Lives in the evidence register with: one atomic claim, primary source, exact supporting section/table, checked date, permitted wording, limitation, and geographic/contextual applicability where relevant. **HTTP 200 alone is not evidence.**
- **CODE-\*** or a direct `file:line` citation — repository facts. Verify against the code before writing.
- **DEC-\*** — the developer's product/thesis decisions.
- **OBS-\*** — test, catalogue, or field observations (dated, scoped; never generalized beyond what was observed).
- **HYP-\*** — hypotheses or thresholds not yet validated. HYP-04 is retained only as a historical, retired threshold set after DEC-24 removed NDVI severity classification from the active product and thesis claim surface. The client-side weather risk-score heuristic in `app/(tabs)/weather.tsx` remains HYP-07 until calibrated against field observations.

## Honesty constraints (non-negotiable)

- Never present synthetic, fixture, or simulated data as measured data — in documents or in product UI.
- The current satellite pipeline is **partially connected**: a prototype request whose synthetic fallback is now visibly labeled, but which remains non-provenance-safe and non-measured. Describe it only via the canonical wording in `.agent/project-architecture.md`; do not soften or overstate it.
- Every measured value must carry provenance; unavailability is stated honestly, never papered over.
- External quota/pricing/coverage statements always carry a checked date and are treated as perishable.
- Monitoring-cadence claims require the Indonesia feasibility study — never promise cadence from nominal satellite revisit.
- Do not claim the present implementation is thesis-ready.

## Vocabulary

English throughout; Indonesian domain terms kept where they are the product's words (glossary: `.agent/context-dump.md`). Core terms: **lahan** = field/plot (DB table), **ladang** = farm field (UI tab), NDVI/NDMI = Sentinel-2 vegetation/moisture indices, **GROW** = the thesis paper's decision-support workflow (Gathering, Recognizing, Offering, Warning — a paper-defined framing, not an external methodology). Data states: **fixture** (labeled test data) · **prototype** (partially wired, non-provenance-safe) · **measured** (persisted, provenance-complete) · **unavailable** (honest absence).

Refer to the project owner as "the developer" and the three thesis authors collectively as "the thesis team" — never by personal name.

## Working rules

- Ordinary development and CI never call live satellite or paid providers; fixture-first testing.
- Secrets never enter tracked files. Env examples list only variables the code actually consumes.
- The roadmap in `.agent/implementation-plan.md` is a sequence of gates (M0–M4); do not pull later-milestone work forward past an unfinished gate.

## Maintenance ritual (part of "done")

A change is not done until the canonical documents it invalidates are updated in the same unit of work:

- Behavior change → `product-requirements.md` (and `design-guidelines.md` if presentation changed)
- Architecture/provider/security change → `project-architecture.md` (ADR added or amended, never silently edited)
- Pipeline/measurement semantics → `data-evaluation-plan.md`
- Methodology change → `research-protocol.md` (advisor-visible)
- New external fact → `evidence-register.md` first, then cite the ID
- New decision → the DEC index in `context-dump.md`
- Update each touched document's `Updated:` date; keep perishable claims (quotas, pricing, terms) dated and recheck them before relying on them.
