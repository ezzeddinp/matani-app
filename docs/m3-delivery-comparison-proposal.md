# Proposed comparison of observation delivery policies

**Updated:** 2026-09-15
**Status:** Overall direction supported by advisor feedback reported on September 15 (DEC-48). Detailed experiment settings remain to be frozen. Novelty is not established by that support.

The current pre-acquisition metrics, buffer comparison and failure treatment are canonical
in [research protocol §19](../.agent/research-protocol.md#19--advisor-supported-direction-and-pre-acquisition-specification). The interval-counting notes below remain supporting checks; they do not replace daily metrics.

## Question

Proposed experiment: how much individually usable index information is withheld when
both NDVI and NDMI must pass before either is delivered? This measures a delivery-policy
tradeoff, not crop accuracy, usability or superiority of Sentinel-2.

Use the same frozen records, dates, source identity and per-index acceptance rules for
both policies. Apply the same non-pixel quality exclusions to both. The provisional
9/3 floors alone do not constitute complete quality validation.

- Joint gate: deliver both indices only when each independently satisfies the agreed rules.
- Separate gate: deliver each passing index with its own date and quality; explicitly
  mark the other unavailable/rejected. Do not imply that a partial pair supports joint analysis.

For N distinct successfully evaluated intervals, let A mean NDVI passes and B mean NDMI
passes. Record all four states: both, NDVI only, NDMI only, neither. Acquisition failures
and unevaluable records are separate; do not silently classify them as failed quality.
Report attempted, returned, evaluable and unavailable denominators alongside percentages.

## Outputs and checks

Report counts of each state, complete-pair coverage, per-index coverage, and information
withheld by the joint gate. Count delivered index values as well as intervals: the joint
gate delivers 2 × count(A and B), while separate delivery yields count(A) + count(B).
Their difference equals the number of single-index passing intervals. This is a
mathematical consequence of the policies, not an empirical discovery or novelty claim.
The substantive result is the observed magnitude, temporal distribution and correct
handling of partial information in the selected case.

Complete-pair coverage must be identical under both policies. Independent delivery must
never promote a rejected value. Compare gaps per index and for complete pairs separately;
retain boundary absence. Deduplicate by the agreed record identity and reject conflicting
duplicates before counting. Use identical quality rules and processing provenance.

Technical replay should cover the four states, unavailable requests, duplicates and
failure recovery. Synthetic scenarios establish behavior only. A UI claim requires testing
the presentation boundary, not only the worker. No production behavior change is authorized
by this document.

## Existing tooling compatibility

CODE: `research/src/matani_rs/evaluation.py:116` defines historical `joint` availability
using stored passed status, while separate counts use pixel floors and non-unavailable
status. Those are intentionally distinct historical definitions. They cannot be reused
as an otherwise-identical policy comparison without reconciling all quality conditions.
Preserve the historical report and label any new comparison separately.

## Work following advisor feedback

Freeze the geometry pair and the daily measurement contract specified in protocol §19,
retain the selection audit, then implement the required adapter/checks before a bounded
pilot. Site/sample and buffer distance were not specified in the advisor message.
No further generic approval of the direction or omission of UAT is needed (DEC-48).


## Offline counting check

OBS-57: run `python3 research/scripts/check-delivery-policy.py`. The synthetic check
covers all 64 three-interval combinations, duplicate/order invariance, empty/one-record
inputs and conflicting decisions. Any unknown per-index decision makes the interval
unevaluable for the four-state comparison; it is not a quality failure. This small check
accepts Boolean decisions only: it cannot detect conflicting raw values or provenance,
identify acquisitions, account for retries, or classify quality. Those remain acceptance
requirements of the eventual real-data adapter. It does not change production delivery.


## September 15 analysis preparation

OBS-58 supplies the original/10 m buffer geometry diagnostics. OBS-59 adds the daily
metric check: `python3 research/scripts/check-daily-delivery.py`. Unlike the older
four-state interval check, this daily calculation retains an independently verified
passing index when its companion is unknown; it does not force a fabricated complete
pair. Multiple compatible records may contribute to a day, but separate acquisitions
cannot be combined into a complete pair. The caller must establish UTC dates, source
identity and which days have a complete source/processing inventory. An absent input
record alone is not proof of an observation-free day.

[Paper analysis preparation](m3-analysis-preparation-2026-09-15.md) records the geometry
results and the remaining acquisition-contract dependency. Neither check is a provider
adapter or evidence of measured policy improvement.
