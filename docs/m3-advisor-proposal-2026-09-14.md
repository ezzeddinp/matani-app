# Matani: proposed replacement evaluation

**Updated:** 2026-09-14
**Prepared for:** September 15-19 bimbingan (DEC-45).
**Status:** Advisor response pending, as reported by the developer. Revised scope remains a proposal.

## Page 1 - Research proposal

**Working title:** Sentinel-2 NDVI/NDMI Observation Availability over Mapped Rice Blocks in Indonesia, with Technical Evaluation of Matani (protocol section 18; proposed title).

**Purpose.** Evaluate when quality-qualified index observations can be supplied to Matani and how missing or partial observations are handled. Preserve the mobile DSS as the delivery artifact. Propose secondary-data analysis and controlled technical tests without new field collection, farmer interviews or participant UAT. This evaluates observation availability and delivery correctness, not crop-health accuracy or farmer benefit (protocol sections 17-18).

**Source and proposed unit.** DEC-47 prioritizes defensible sources over Teluknaga. Open-SEA-Rice-10 has an explicit CC BY 4.0 licence and a 2021 map label (EVID-060). Three approximately 0.355 ha blocks were selected deterministically from previously inspected Java windows: candidates in Indramayu, Pati and Gresik (OBS-54/56). They are fixed 6 by 6 mapped-rice-cell blocks, not surveyed farmer parcels. Three candidates do not mean an approved three-site study. Propose calendar 2021 and tile 42 first for an engineering pilot, pending agreement on the unit and sample.

**Proposed questions.** RQ1: what separate NDVI, NDMI and joint usable-interval counts, monthly fractions and gaps are observed? RQ3: how do valid-pixel counts and provisional 9/3 floors constrain observations? Proposed technical comparison: on identical records and identical per-index acceptance rules, compare delivering only complete pairs against delivering each passing index with an explicit state for the other (delivery-comparison proposal).

**Contribution to assess.** A reproducible, bounded case analysis plus an evaluated handling of incomplete index pairs. Additional single-index delivery is a mathematical consequence when only one index passes; that fact alone is not novelty. The research result would quantify its magnitude, timing and delivery correctness. Literature differentiation remains necessary; neither a new location nor an interface alone establishes novelty (EVID-049/052/054/055).

**Validity limits.** Selection favors contiguous mapped rice, is not representative or preregistered, and uses a map partly derived from Sentinel-2 (EVID-061; OBS-54). The map is not independent crop truth or proof of continuous rice cultivation. Administrative coverage is checked; local land context remains unresolved. Findings cannot establish agronomic accuracy, universal minimum field size or nationwide monitoring cadence.

## Page 2 - Pilot evidence and decisions

**Preparation completed.** The source archive matches its published checksum; selected raster classes and geometry were checked. Candidate generation and January request generation reproduced identical bytes. Public administrative polygons cover the three blocks. These are source/preparation observations, not new Sentinel-2 index results (OBS-53-56).

**Technical evidence.** The synthetic policy-counting check passed 64 three-interval combinations and edge cases; all nine existing research tests passed again (OBS-57). Existing worker replay uses simulated provider/admin dependencies (OBS-42). These checks do not prove raw-data quality, rendered mobile behavior, live database correctness, usability or crop accuracy.

**Pilot still pending.** The offline first-candidate proposal contains three January 2021 Statistics requests. Its proposed cap is three attempts plus one authentication attempt, sequential, no retries, stopping on failure. Account allowance, execution enforcement, final quality/identity contract and local land-context treatment remain open (OBS-55). Statistics intervals must stay distinct from M2 source-specific Process records. No replacement satellite results exist.

| Existing framing | Proposed amendment requiring advisor response |
|---|---|
| Private field and wet/dry evaluation | Licensed mapped-rice blocks; calendar-month analysis; agree unit, sample and period |
| Field-based agronomic validation | Defer HYP-05; no crop-condition accuracy claim |
| Participant UAT | Controlled technical evaluation; no usability claim |
| HYP-01 and uncertainty conclusions | Agree descriptive scope, decision criteria and uncertainty treatment before a verdict |

**Decisions needed.** Accept or revise the unit, period and sample; determine whether this bounded empirical and technical contribution is sufficient; accept or revise participant-free evaluation. Record actual feedback before treating the amended method as approved. The licensed map resolves one source issue, not every scientific requirement (protocol sections 17-18).

**Next sequence and demo.** Show source provenance, candidate-selection audit, offline requests and clearly labeled synthetic checks. After scope feedback, finalize the measurement contract and bounded live pilot. Review original responses and provenance before expanding acquisition; write methods and results alongside analysis. Historical prototype results remain separate and do not fill the replacement-data gap (OBS-41/43).

**Conference context.** AGERS remains the target under DEC-45. Dated organizer facts and unresolved author requirements remain in EVID-041-046; recheck before submission. Submission depends on actual results, thesis-team review and separate authorization. This packet is a proposal, not a completed thesis.

**Repository references:** research protocol sections 17-18; evidence register EVID-060/061 and OBS-53-57; candidate-selection and delivery-comparison proposals; execution plan 016.
