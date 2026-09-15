# 016 - AGERS research preparation

**Updated:** 2026-09-15
**Decision:** DEC-45, amended through DEC-51. **Status:** Phase 6 content drafts prepared; thesis-team review and source confirmation pending.

## Execution record

| Work package | State | Evidence / next action |
|---|---|---|
| Recover original M1 artifacts | Legacy report recovered; approved report pending | [Inventory](../docs/m3-dataset-inventory-2026-09-10.md); recover the named original report from the original workstation/backup, without recreating it from summary counts |
| Literature comparison | Initial scoped review complete | [Matrix](../docs/m3-literature-matrix-2026-09-10.md), eight research papers plus one primary system manual; abstract/section evidence boundaries explicit |
| Offline snapshot and descriptive analysis | Implemented, fixture verified | `research/scripts/run_m3_evaluation.py`, existing Python research tests |
| Production-worker replay | Implemented, fixture verified | `research/outputs/m3-fixture-replay.json`; simulated dependencies, no database or UI proof |
| Advisor packet | Draft prepared | [Proposal](../docs/m3-advisor-proposal-2026-09-14.md), companion PDF under `output/pdf/` |
| Measured pilot figures and historical reconciliation | Pending source recovery | No reconstruction from OBS-19; no invented measured chart |
| Formal revised-method acceptance | Pending September meeting | Record actual advisor wording; do not infer agreement from the developer's preparation authorization |
| Manuscript completion / conference submission | Future, conditional | Complete evidence and author review first; no automatic submission |

## Schedule (DEC-45)

| Target | Deliverable |
|---|---|
| September 10-11 | Source inventory, gap log and literature matrix |
| September 12-13 | Recovered snapshot if available; descriptive pilot and technical replay |
| September 14 | Two-page proposal, comparison matrix, honest pilot status, demo and advisor decisions |
| September 15-19 | Bimbingan; record approval or revisions |
| September 20-25 | Approved analyses and complete paper draft developed together |
| September 26-29 | Reproduction, references, author review and verified 2026 formatting |
| September 30 | Readiness decision and buffer before the organizer deadline (EVID-042) |

Do not wait for the entire app to be polished. Keep production stable and pause unrelated
M4 cleanup. The [research protocol section 17](../.agent/research-protocol.md#17--proposed-participant-free-evaluation-amendment)
owns methodological choices; the evidence register owns conference facts (EVID-041-046).

## Run and acceptance

```sh
npm run test:research
python3 research/scripts/run_m3_evaluation.py --input research/fixtures/m3-m1-report.json --output-dir /tmp/matani-m3-fixture-review
node research/scripts/run-m3-replay.mjs /tmp/matani-m3-replay-review.json
npm run verify
git diff --check
```

Use fresh output paths. After original report recovery, use the same Python command with
that input and a new directory under ignored `research/private/`; no provider call is
performed. The input must match the documented M1 adapter contract. Preserve the original
artifact and distinguish its Statistical API semantics from M2 Process records.

Accept reproducibility only when identical input and code produce identical files/hashes.
Check zero/one observation, empty season, duplicate/conflicting intervals, missing pixels,
9/3 boundaries, out-of-order inputs, season boundaries and stored status preservation.
Compare regenerated counts with OBS-19 but record discrepancies rather than forcing a match.
A complete fixture run is an engineering result only (OBS-42).

## Advisor and publication decisions still open

1. Accept the scoped evaluation amendment, including deferral of HYP-05 and participant UAT.
2. Decide the descriptive versus inferential estimand and suitable temporal uncertainty method.
3. Confirm HYP-01 numerical decision criteria; no retrospective preregistration claim.
4. Approve manuscript framing and authorship before submission.
5. Verify 2026 EDAS destination, page limit, presentation/publication rules and deadline time zone.

If the dataset remains unrecovered, the packet remains an honest proposal with technical
pilot results. Do not submit a results paper whose scientific results cannot be traced.
No new provider acquisition, paid service, external message or submission is authorized
by this execution plan. Academic acceptance and historical M0/M2 verification stay separate.

## Recovery and verification update

OBS-43 reproduces the earlier two-field OBS-12 result from the developer-supplied file.
This is separate from the approved Teluknaga analysis. Run the legacy audit with
`python3 research/scripts/audit-legacy-m1.py --input docs/live-availability-2025-07_to_2026-07.json --output-dir research/private/NEW-LEGACY-AUDIT`.
Use a fresh output directory; never relabel the result as measured or approved.

Final local verification is recorded in OBS-44: lint, both type checks, 9 research tests, earlier 34 root and 46 backend tests passed individually. Combined verification was not rerun after an automatic-review usage-limit rejection.


## Replacement preparation route (DEC-46)

DEC-47 supersedes the earlier Teluknaga-first preference: follow the [replacement plan](../docs/m3-replacement-study-plan-2026-09-10.md) and [candidate selection](../docs/m3-candidate-selection-2026-09-14.md) for the source-quality-led route. Three mapped-rice blocks are candidates, not approved study sites. Preserve legacy evidence separately; live acquisition remains a bounded next-stage decision.


## September 14 preparation while advisor response is pending

Completed: licensed map and hashes (OBS-53), reproducible candidate selection (OBS-54),
January request proposal (OBS-55), administrative location checks (OBS-56), and synthetic
policy-counting check plus nine research tests (OBS-57). The two-page advisor packet now
reflects this route. [Delivery comparison](../docs/m3-delivery-comparison-proposal.md)
contains the proposed experiment and its proof limits.

Next dependencies, in order:
1. Record the advisor's actual response on the mapped-block unit, period/sample scope,
   participant-free evaluation and contribution framing; revise protocol only accordingly.
2. Resolve local land-context treatment and freeze the accepted geometry, selection rule,
   per-index quality definitions and record identity. A rice map is not crop ground truth.
3. Verify account allowance and agree a bounded live acquisition; enforce the cap and save
   raw responses, requests and versions. The offline Statistics proposal is not an M2 dataset.
4. Review the pilot's provenance and denominators before expanding the period; generate
   measured tables only from a checked snapshot. Write results and limitations together.

React Doctor/M4 cleanup remains paused. No manuscript submission is authorized here.


## September 15 advisor response (DEC-48)

The overall direction, participant-free evaluation and AGERS target are supported.
The September 14 pending-response checklist above is historical. Current next work:
1. Prepare and check original/10 m inward-buffer geometries, preserving exclusions and
   source identities. Use protocol §19; the 10 m value is an engineering specification.
2. Freeze site/sample, daily record identity and processing/quality settings. Implement
   and fixture-check the daily metrics and paired geometry/policy analysis before data.
3. Replace or reconcile the older unbuffered Statistics pilot proposal with this contract;
   verify budget/account access and bounded execution before requesting observations.
4. Acquire and audit the pilot, then evaluate whether to expand to the frozen study period.

The advisor-supported contribution framing is delivery-policy evaluation. Availability
alone is supporting analysis. Preserve the no-farmer-benefit claim boundary and continue
literature differentiation. The September 14 advisor PDF is a historical pre-feedback
packet; protocol §19 and this update are current. React Doctor/M4 remains paused.


September 15 execution: original/10 m geometry preparation completed with deterministic
output (OBS-58); daily metric calculation checked using synthetic records (OBS-59).
See [analysis preparation](../docs/m3-analysis-preparation-2026-09-15.md). Next dependency
is a source-compatible paired acquisition contract: daily Statistics aggregation alone
does not prove that independently requested NDVI/NDMI share one source product. Preserve
that distinction before a live pilot or a claim of complete-pair coverage.


Paired Process template and synthetic source matching completed (OBS-60). Remaining
execution dependencies: exhaustive catalogue/day inventory, raster-grid alignment,
full request budget including authentication/catalogue, and raw-response-preserving
bounded executor. The saved template is not a live run or a selected acquisition date.


## Completion phases aligned with the supplied IEEE A4 template

Planning update requested September 15. Basis: DEC-48, protocol §19, OBS-58-61.
Work on writing alongside experiments; keep the conference paper and full thesis as
separate documents drawing on the same traceable evidence. The following are work
estimates after prerequisites are available, not guaranteed dates or organizer deadlines.

| Phase | Work and owner | Required exit output | Paper destination | Estimate |
|---|---|---|---|---|
| 1 Finalize the study | Assistant prepares final site/sample, period, quality rules, source/grid contract and literature comparison; thesis team reviews scope and advisor conditions | Frozen experiment manifest and defensible contribution statement; unresolved methodological decisions explicit | Introduction, Related Work, Methods | 1-2 working days |
| 2 Prove acquisition feasibility | Assistant completes catalogue inventory, alignment checks, bounded executor and raw-data preservation; developer resolves account access/allowance | Audited real paired pilot or documented feasibility failure; no silently missing days | Methods and feasibility notes | 1-2 days after access |
| 3 Acquire and freeze data | Assistant runs the agreed bounded collection and audits failures, identities, dates, quality and duplicates | Immutable original responses, provenance manifest and analysis snapshot with denominators | Data and Methods | 2-4 days, provider-dependent |
| 4 Run the comparisons | Assistant computes both policies on both geometries, daily coverage, gaps, missing-data bounds and buffer sensitivity | Reproducible tables/figures and a result ledger; no required positive effect | Results and Discussion | 1-2 days |
| 5 Verify Matani delivery | Assistant tests the narrow actual delivery/presentation boundary for complete, partial, rejected, missing, duplicate and failed/recovered records | Technical correctness evidence; fix only experiment-blocking defects; no UAT claims | System and Technical Evaluation | 1-2 days, parallel where possible |
| 6 Finish both manuscripts | Assistant drafts; all thesis authors verify references, interpretation, contributions and author details | Complete paper plus expanded thesis chapters; abstract/conclusion reflect actual results | Entire manuscript | 2-3 days, with early sections drafted during phases 1-3 |
| 7 Format and review | Apply the supplied template; thesis team/advisor review; verify current conference instructions separately | Render-checked Word/PDF, correct citations/captions, no placeholders, all-author approval | Submission candidate | 1-2 days |
| 8 Complete academic delivery | Thesis team submits with explicit authorization, prepares defense and handles advisor/reviewer revisions | Submission record, defense materials and final institution-required thesis version | Post-draft completion | Institution/reviewer-dependent |

Recommended paper outline: Title and authors; Abstract; Keywords; I Introduction;
II Related Work; III Study Data and Methods; IV Results; V Discussion and Technical
Evaluation; VI Conclusion; Acknowledgment if applicable; References. This is our outline,
not mandatory headings prescribed by the template. Final section merging depends on
verified conference page limits. Keep most space for methods, results and discussion.

The full thesis can expand these into introduction, literature review, methodology and
system design, implementation/results/discussion, and conclusions, subject to the actual
campus guide. Retain relevant existing architecture and GROW material; revise research
questions, UAT sections and claim wording consistently with DEC-48. Do not infer the
campus chapter structure or formatting from this conference template.

Planned evidence figures/tables: source/geometry map including buffer; processing and
policy diagram; frozen settings and dataset accounting table; paired daily-coverage
results; observation timeline/gap summary; buffer-sensitivity results; technical-test
summary. Combine items if necessary after the page limit is verified. No invented result
values or claims of farmer benefit. Zero policy difference is a reportable outcome.

Template checks (OBS-61): preserve A4, prescribed styles/margins and two-column body;
adapt author block to actual agreed authors; use figure captions below figures and table
titles above tables; numbered citations; remove example instructions and unused funding
placeholders; do not add page numbers. Write content before final layout. Conference
requirements are a separate final verification gate; this template supplies no confirmed
AGERS page limit. React Doctor score cleanup remains outside the critical path.


## Phase 1 completion checkpoint

DEC-49 and protocol §20 freeze the single-case scope, period, common-grid mask approach,
quality rules, source eligibility and previously defined metrics. Exact offline settings
are reproducible through `research/scripts/freeze-phase1.py` (OBS-62). Literature framing
is narrowed to a policy evaluation, with NR and access limits retained. This completes
the pre-acquisition specification, not empirical validation or proof of novelty.

Phase 2 now owns catalogue completeness, authentication/account allowance, a bounded
executor, actual TIFF/source validation and the first real pilot. Use two common-bbox
index requests with local paired masks, not the obsolete four-request template. The
paper's full-text literature refinement can continue alongside Phase 2.


## Phase 2 live feasibility outcome

OBS-63/64: first real pilot completed and audited. Authentication, catalogue pagination,
source matching and common-grid TIFF checks succeeded. First chronological date had
zero valid pixels in both indices/geometries; preserve this rejected observation.
[Phase 2 report](../docs/m3-phase2-pilot-2026-09-15.md) records the scoped result.

Phase 2's live acquisition feasibility gate is passed for this request shape and date.
Account balance remains unverified; the pilot is not permission or evidence for the
full-year run. Before Phase 3, define a total budget from the 71-day catalogue inventory,
check allowance, preserve prior pilot results and specify interrupted-run recovery.
Do not rerun dates merely to seek a positive policy difference.

## Phase 3 preparation checkpoint

OBS (2026-09-15, offline): the saved pilot audit passes; a deterministic calendar
inventory accounts for 365 days as one validated pilot, 70 pending catalogue dates and
294 no-acquisition dates. [Phase 3 preparation](../docs/m3-phase3-acquisition-2026-09-15.md)
records the 140-Process-attempt collection proposal and recovery requirements.
CODE: `research/scripts/prepare-phase3.py` reproduces this accounting without network calls.
This preparation checkpoint is historical; OBS-65 supplied allowance and DEC-51
authorized the subsequent bounded collection.


## Phase 3 completion checkpoint

OBS-67/68 close bounded acquisition and snapshot freezing, including two unresolved
NDVI attempts. The saved dataset preserves all calendar dates and independently verified
indices; pair verification is not quality acceptance. [Phase 3 report](../docs/m3-phase3-acquisition-2026-09-15.md)
links the frozen artifacts, reproduction commands, request accounting and limitations.
Phase 4 policy/buffer comparisons are next. No M3-wide completion or M4 work is implied.


## Phase 3 retry revision

DEC-52 / OBS-69 supersede the initial unresolved-download outcome: both explicitly
requested retries succeeded. Use `phase3-20260915-frozen-02/` for Phase 4. Both recovered
NDVI observations fail quality checks; download recovery does not imply usable values.
The original freeze and failed attempts remain preserved in the linked evidence chain.

## Phase 4 completion checkpoint

OBS-70 records the completed offline comparisons on the revised snapshot: zero observed
policy difference and zero passing-date change from buffering. See [Phase 4 results](../docs/m3-phase4-results-2026-09-15.md)
for metrics, denominators, gaps, interpretation limits and reproduction. Phase 5 narrow
delivery-boundary correctness remains next; no M4 cleanup or empirical-benefit claim follows.


## Phase 5 scoped completion

OBS-71 records automated quality, worker, route and presentation checks, plus the narrow
chart correction required by PRD-11. [Phase 5 report](../docs/m3-phase5-delivery-2026-09-15.md)
separates executed JS/TS and local HTTP evidence from static SQL and excluded device/DB
runtime claims. Phase 6 drafting can use these bounded results. This is not UAT or
a claim that independent delivery is implemented in the app.

## Phase 6 draft checkpoint

OBS-72 records separate [paper](../docs/manuscripts/phase6-paper.md) and
[expanded thesis chapters](../docs/manuscripts/phase6-thesis-chapters.md), using the revised
case and scoped Phase 5 evidence. [Review notes](../docs/manuscripts/phase6-review.md)
list author/source/format decisions. Content drafting is complete; thesis-team approval
and latest-source confirmation remain pending. That historical draft has now been expanded and formatted under DEC-53 / OBS-73 below.

## Phase 7 full-paper review draft

DEC-53 authorizes expansion using the previous PDF and existing A4 conference template.
OBS-73 records completed checks; [review checklist](../docs/manuscripts/phase6-review.md)
and [artifact manifest](../docs/manuscripts/phase7-manifest.json) own the delivery status.

- [x] Expand introduction, literature, index foundations, DSS/GROW, architecture, methods and discussion.
- [x] Reach 6,000–7,000 pre-reference words and screen all 38 previous references.
- [x] Verify the bounded claims, record external evidence and resolve every numbered citation.
- [x] Preserve frozen numerical results and distinguish technical checks from measured findings.
- [x] Deliver Markdown, editable DOCX and A4 PDF with tables, equations and timeline.
- [x] Inspect all rendered pages and preserve the original files and separate chapter draft.
- [ ] Thesis team verifies title, authors, affiliations, contacts and scientific wording.
- [ ] Advisor review and venue-specific page limits/submission approval, separate from this deliverable.

The full-length review draft is complete. Separate chapter expansion remains subsequent work;
no automatic submission, participant claim or closure of broader M3 gates follows.
