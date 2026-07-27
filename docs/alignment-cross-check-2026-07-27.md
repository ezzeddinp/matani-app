# Matani Thesis–Code–Canonical-Docs–Notion Cross-Check

**Checked:** 2026-07-27  
**Scope:** `D:\matani-app`, excluding `node_modules`  
**Current revised thesis:** `.agent/thesis-revised-aligned.docx`  
**Notion source:** [Matani — Centralized Knowledge Base](https://app.notion.com/p/3a9434da822c80e9b8c7ee920b1e94dc), updated to v1.1  
**Verdict:** The current revised thesis, current application behavior, canonical `.agent` documents, and Notion now describe the same **honest prototype baseline and target roadmap**. This does **not** mean Matani is thesis-ready: M0–M3 acceptance gates, the provenance-safe measurement pipeline, and actual evaluation results remain incomplete and are disclosed as such.

## 1. What “aligned” means here

Alignment means that:

- as-built behavior is described as as-built;
- target behavior remains labeled as target;
- fixture/prototype values are never represented as measured values;
- the app's five crop categories are separated from the rice-only thesis scope (DEC-15);
- the paper uses climate-risk **classification**, not spatial risk mapping (DEC-19);
- HYP-04 NDVI ranges and HYP-07 weather scoring remain uncalibrated hypotheses;
- no document claims that automated testing, UAT, notification delivery, or the thesis measurement evaluation has already been completed;
- known engineering gaps remain visible in the M0–M4 roadmap.

The original `.agent/thesis.docx` is intentionally preserved as the before-version. The older `.agent/thesis-revised-point-21.docx` is superseded and is not the current deliverable.

## 2. Cross-check matrix and corrections

| Area | Before cross-check | Confirmed correction | Result |
|---|---|---|---|
| Thesis title/output | “Climate Risk Mapping” exceeded the implemented scalar field-level class/score. | Retitled the revised paper to “Climate Risk Classification” and recorded DEC-19. | Aligned |
| Crop scope | Paper was rice-focused while parts of the product exposed five crops without explaining the distinction. | Revised methodology/limitations state that padi is the only thesis sampling/evaluation scope; padi, jagung, kedelai, teh, and kopi remain product categories (DEC-15). | Aligned |
| Satellite provenance | Some UI/document wording could make prototype or synthetic values look measured. | Field-list fixture records are labeled “Simulasi demo / Bukan pengukuran satelit”; detail simulations have a persistent fixture disclaimer; the thesis repeats the canonical prototype limitations. | Presentation aligned; M2 pipeline still open |
| Weather boundary | Home and Weather could bypass the backend and call Open-Meteo directly, contradicting the architecture. | Both mobile screens now call Matani `/weather` only. AccuWeather→Open-Meteo provider fallback remains inside the backend (ADR-10 / DEC-20). | Aligned |
| Backend entrypoints | `backend/index.js` mounted NDVI, weather, and AI routes; `backend/index.ts` mounted only NDVI. | TypeScript entrypoint now mirrors all three runtime routes. | Aligned |
| Crop filter/images | Field cards used `card.name` to select crop category and image. | Filter and thumbnail selection use persisted `card.category`. | Aligned |
| AI advisory | Payload omitted data state, and the prompt could overstate expertise or convert prototype inputs into advice. | Payload includes `fixture`, `prototype`, `measured`, or `unavailable`; prompt forbids measurement inflation, diagnosis, and chemical-application directives and requires field verification (DEC-20). | Aligned for current optional prototype |
| Profile metrics | UI implied NDVI averages, health/productivity, monitoring efficiency, alert response, and expertise badges without verified writers. | Unsupported metrics are unavailable; displayed facts come from account/saved-field metadata; badges are labeled product previews. | Aligned |
| Notifications | Screen/settings implied a functioning notification capability. | Notification generation, storage, delivery, and controls are explicitly unavailable. | Aligned |
| Evaluation claims | Paper used completed-sounding functional/API/conceptual/UAT language although no automated suite or completed UAT dataset exists. | Revised paper and research protocol describe these as planned procedures and prevent conceptual plausibility from being presented as agronomic validation. | Aligned; results still open |
| Risk-score location | Paper assigned heuristic scoring to backend/application processing while code computes HYP-07 in the mobile screen. | Revised paper states client-side as-built behavior and labels a server-side versioned component as planned hardening. | Aligned |
| Provider/presentation boundary | Architecture previously overgeneralized that the client never contacts external services. | Architecture now distinguishes backend data-provider calls from client presentation integrations such as Google Maps, Nominatim, and display images (DEC-20). | Aligned |
| Notion terminology/status | Notion retained stale Mapping, silent-fallback, rice-only-product, personal-name, precedence, filename, and open-decision wording. | Knowledge base updated to v1.1 with Classification, labeled fixture wording, five-crop/rice-only distinction, canonical precedence, repository vocabulary, current filenames, and closed paper decisions. | Aligned |

## 3. Thesis adjustments

The paragraph-level before/after wording is recorded in [`thesis-revision-point-21.md`](thesis-revision-point-21.md). The main revised sections are:

- title, abstract, keywords, contributions, and comparison rows;
- methodology scope and the five-crop product/rice-only research distinction;
- prototype satellite API behavior and provenance limitations;
- HYP-04 NDVI and HYP-07 weather interpretation;
- AI data-state and safety boundaries;
- evaluation procedures changed from apparent results to planned tests;
- limitations expanded to cover bbox/fixed window/no SCL/no persistence, labeled fixtures, no ground truth, no completed test/UAT dataset, no production notifications, unauthenticated/permissive-CORS backend, and non-reproducible legacy schema;
- three-layer architecture corrected to match backend provider routes and client-side risk scoring.

The revision is reproducible through `scripts/revise-thesis-point-21.ps1`, using `.agent/thesis.docx` as the preserved source and `.agent/thesis-revised-aligned.docx` as the default output.

## 4. Canonical documents updated

| Document | Alignment role |
|---|---|
| `.agent/context-dump.md` | DEC-19 classification title and DEC-20 backend/provider/presentation rules |
| `.agent/project-architecture.md` | Correct system boundary, matching backend entrypoints, canonical prototype provenance, ADR-10 |
| `.agent/product-requirements.md` | Crop-category behavior, AI data state, backend-only weather, honest Profile/Notifications |
| `.agent/design-guidelines.md` | Current fixture/unavailable/preview presentation and corrected screen map |
| `.agent/research-protocol.md` | Planned evaluation status; no completed suite/UAT result |
| `.agent/data-evaluation-plan.md` | Links to canonical current provenance and keeps the measurement contract as target |
| `.agent/product-brief.md` | Rice-only thesis versus five-crop product and prototype qualifier |
| `.agent/implementation-plan.md` | Records applied alignment hardening without falsely completing M0 |
| `.agent/thesis-paper-corrections.md` | Marks the aligned DOCX current and the older point-21 DOCX superseded |

No new external factual claim was introduced, so `.agent/evidence-register.md` required no new EVID entry.

## 5. Verification evidence

| Check | Result |
|---|---|
| `git diff --check` | Passed; only Windows LF→CRLF notices were emitted |
| Revised DOCX OPC package | Passed: required OPC parts present; every XML/relationship part parsed |
| Revised DOCX Microsoft Word open | Passed read-only: 379 paragraphs and 7 tables |
| Revised DOCX content anchors | Passed for Classification, five-crop distinction, planned evaluation, and fixture wording |
| Android Expo export | Passed: 1,864 modules bundled and Android artifact exported |
| Backend JavaScript syntax | `backend/index.js` and `backend/api/ai/route.js` passed `node --check` |
| Focused ESLint | Not clean: 16 errors and 9 warnings remain, primarily React hook/compiler findings in the existing large Explore/Home/Detail screens, plus unresolved backend imports in the root resolver |
| Root/backend TypeScript build | Not clean: the backend dependency tree is not resolvable in the current install, producing missing `cors`, `dotenv`, and `express` module/type errors |
| Automated tests/CI/UAT | Not available in the repository; no result is claimed |

The successful mobile export proves that the adjusted mobile bundle compiles. It does not replace unit/integration tests or prove the research pipeline.

## 6. Remaining gaps that are aligned but incomplete

These are not hidden thesis–code mismatches. They are explicitly documented unfinished gates:

- **M0:** backend authentication/authorization, CORS allowlist, rate limiting, reproducible migrations, RLS tests, fixture-first automated tests, CI, secret/operations hardening;
- **M1:** Indonesia retrospective feasibility study, final RQ/HYP decisions, regions/sample design, valid-pixel and acquisition rules;
- **M2:** exact-polygon, dynamic-window, SCL/dataMask-versioned, per-index pixel accounting, idempotent and provenance-complete persistence; removal of production fixture substitution;
- **M3:** measurement comparison, system evaluation, UAT execution, reproducible datasets/tables/figures, and advisor-approved claims;
- **M4/post-thesis:** real notifications, calibrated product hardening, broader non-rice research, and optional future ML.

Therefore, the accurate final statement is:

> The current revised thesis and Matani application are aligned about what the prototype does, what it does not do, and what the thesis must still build and evaluate. The project is not yet thesis-ready and no current satellite output is a provenance-complete measured observation.
