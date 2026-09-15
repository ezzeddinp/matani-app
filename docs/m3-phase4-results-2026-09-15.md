# Phase 4 results

**Updated:** 2026-09-15
**Status:** Offline comparisons complete. Evidence: OBS-70; method: protocol §19/20.

## Main result

OBS-70: independent-index delivery and complete-pair delivery produce the same results
in this single mapped-block 2021 case. Every passing NDVI date also has passing NDMI,
and vice versa. There are no singleton observations for independent delivery to recover.
The same 23 dates pass with and without the 10 m inward buffer.

| Geometry | Policy | Any-index days | Pair days | NDVI days | NDMI days | Calendar coverage |
|---|---|---:|---:|---:|---:|---:|
| Original | Complete pair | 23 | 23 | 23 | 23 | 6.30% |
| Original | Independent | 23 | 23 | 23 | 23 | 6.30% |
| Buffered | Complete pair | 23 | 23 | 23 | 23 | 6.30% |
| Buffered | Independent | 23 | 23 | 23 | 23 | 6.30% |

OBS-70: all coverage denominators are 365 calendar days. All days are evaluated, including
294 no-acquisition days and 48 catalogue dates where both indices fail quality. There
are zero unresolved downloads. The conditional catalogue-date pass fraction is 23/71
(32.39%); it must not replace calendar coverage. Missing-data bounds coincide because
all processing is resolved. Each combination delivers 46 individual passing index values.

## Observation gaps

OBS-70: every combination has the same qualifying dates. Consecutive-observation gaps
have mean 12.95 days, median 10 days and maximum 65 days. There are 75 leading days
before the first passing date and four trailing days after the last. These are separate
boundary absences, not additional consecutive-observation gaps or processing latency.

## Buffer sensitivity

OBS-58/62: the buffer removes 55.82% of mapped-block area. OBS-70: it reduces source-present
NDVI cells from 36 to 16 and NDMI cells from nine to four. Mean valid counts across 71
acquisition dates drop from 11.746 to 5.211 for NDVI and 2.930 to 1.310 for NDMI.
Despite these losses, no date crosses the frozen pass/fail boundary. Calendar-coverage
changes are zero for both policies; policy differences and their change with buffering
are also zero percentage points. This does not establish that buffering improves purity
or accuracy. The provisional 9/3 floors were not adjusted after seeing the results.

## Result ledger and permitted interpretation

| Result | Evidence | Interpretation limit |
|---|---|---|
| Zero policy difference | OBS-70; policy-differences.csv | No observed benefit in this case; not universal equivalence |
| Zero coverage sensitivity to buffering | OBS-70; coverage-and-gaps.csv | Pixel counts change; accuracy was not measured |
| Sparse passing observations and a 65-day gap | OBS-70; coverage-and-gaps.csv | Historical case description, not a promised monitoring cadence |
| Complete acquisition accounting after retries | OBS-69 | Original transport failures remain operational history |

The empirical conclusion is a zero-difference case, not proof of a superior delivery
policy. Technical cases containing independently passing indices still belong in Phase 5,
clearly labeled synthetic. They cannot supply missing empirical evidence of benefit.
No new site, period or threshold is selected to manufacture a positive result.

## Reproduce and inspect

CODE: `research/scripts/analyze-phase4.py` first audits `frozen-02`, then reuses
`check-daily-delivery.py` for prespecified coverage/gap metrics. It writes daily pixel
rows, coverage/gaps, pixel summaries, policy differences, JSON results and a hash manifest.
The adapter requires a fully resolved paired snapshot; it refuses unresolved input.

```sh
python3 research/scripts/analyze-phase4.py /tmp/matani-phase4-new-analysis
```

Use a fresh directory. The analysis requires the preserved ignored Phase 3 artifacts.
The current output is `research/private/replacement-study/phase4-20260915-analysis-01/`.
`plot-phase4.py` uses installed ReportLab to make `observation-timeline.pdf` from its
CSV rows. The bundled Python runtime provides ReportLab; no project dependency changed.
OBS-70 records byte-identical analysis reproduction, passing checks and visual inspection.

Phase 5 (actual delivery-boundary correctness) is next. Overall M3, manuscripts and
academic approval are not complete merely because Phase 4 comparisons are complete.
