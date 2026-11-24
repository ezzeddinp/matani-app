# Response to Reviewers: AGERS 2026, Paper 1571359656

**When to Show Sentinel-1 NDVI Estimates in Rice Monitoring: Gap-Length Crossovers against Persistence and Interpolation in Java**

The authors thank the three reviewers. Their comments led to new analyses, a revised display-rule table and a revised application figure. All new results come from the same region-held-out predictions and the same block cluster bootstrap (2,000 resamples) as the original Table III, except where another clustering unit is stated, and the original numbers are unchanged. Section references are to the revised paper. Diff. denotes radar minus baseline absolute error, so a negative value favours radar.

## Reviewer 1

**1.1 Focus on a decision framework rather than prediction.** The Introduction now frames gap filling as a display decision rather than only a prediction task, and the third research question and contribution concern when and how an application shows an estimate. Table IV links each display rule to its evidence, and Section V-C discusses the rules as decisions.

**1.2 The 20-day threshold is more defensible; the 80-day threshold should be exploratory.** The paper keeps 20 days after the last observation and labels 80 days exploratory in the Abstract, Sections III-H, IV-C and V-C, Table IV and the application itself, whose detail panel calls it an exploratory cutoff. The new analyses support this asymmetry. The persistence result held in every sensitivity check (Section IV-D). The interpolation result reached significance in none, and its isotonic crossover interval extends beyond the observed range (Section IV-C).

**1.3 Distinguish observed and fitted crossovers in the Abstract.** The Abstract now separates the bin results ("In the observed gap bins…", "radar was clearly more accurate only in gaps longer than 30 days") from the fitted crossovers (79 days, CI 58 to 152, "exploratory only"; about 19 days, CI 17 to 23).

**1.4 Avoid "ground truth".** The term is not used. Section III-B defines Sentinel-2 as an optical reference with its own errors, reported against rather than treated as field measurement.

**1.5 Do the five seeds produce meaningful variation?** As already reported in Section III-E, the standard deviation of MAE across seeds was below 0.0011, negligible next to the bootstrap intervals, so the seeds serve as a stability check rather than a source of uncertainty.

**1.6 Label Matani's estimate as model-derived.** The paper and the application now use "model-derived estimate" throughout. The revised Fig. 4 shows the English interface, where the chart legend and the detail panel read "Model-derived estimate", and the Fig. 3 legend and caption use the same term. The Indonesian interface was relabelled from "Estimasi radar" to "Estimasi model".

## Reviewer 2

**2.1 The demonstration shows estimates before the first optical observation, a case the methodology excluded.** This case is now evaluated, and the application rule was changed to follow the result. Before the first observation persistence is undefined, so radar was compared with the next observation carried backward (NOCB), in the same bins of days to that observation (Section III-F). NOCB is a one-sided stand-in evaluated mostly within the series, since only 38 rows lay before their block's first observation, and the paper says so. Radar was less accurate than NOCB up to 20 days, including 11–20 days (+0.034, CI 0.008 to 0.059). No difference was detected at 21–30 days (−0.034, CI −0.079 to 0.010, 58 rows). Beyond 30 days radar was 0.171 more accurate (CI 0.114 to 0.235, 45 rows), and the isotonic crossover was 26 days (CI 19 to 29) (Section IV-C, Table IV). Matani therefore now shows an estimate before the first observation only when that observation is at least 30 days away, while the rule after the last observation stays at 20 days (Sections III-H and V-C). For Krangkeng 2021 the chart now shows 6 estimates, all 37 or more days before the first observation; the estimates 29 and 25 days before it are hidden (Section IV-F, Fig. 4).

**2.2 The 80-day threshold is not statistically supported.** The authors agree. The paper no longer presents it as a validated threshold. Table IV lists the >60-day bin (−0.010, CI −0.083 to 0.066, 29 rows) beside the fitted crossover (79 days, CI 58 to 152). A non-parametric isotonic crossover (76 days) has an interval from 55 days to beyond the observed range, because 9% of resamples never crossed zero. The rule is labelled exploratory in the paper and in the application.

**2.3 The 20-day threshold is insufficiently validated; significance appears only beyond 30 days.** The paper states this directly (Abstract, Section IV-C, Section V-C). The 20-day cutoff marks where the difference changes sign, by both the linear fit (19 days, CI 17 to 23) and the isotonic fit (21 days, CI 14 to 31). At 21–30 days no difference was detected against persistence or the new hybrid baseline; the intervals do not exclude a loss of up to about 0.02 to 0.04, and the paper does not claim a gain there. Section V-A notes that a 30-day cutoff, backed by a significant difference, would be the more conservative choice, and Matani now applies it before the first observation, where the NOCB comparison crossed later (2.1). The >30-day result was robust (see 3.1).

**2.4 Accuracy during cloudy periods is not established.** The authors agree that this cannot be established with clear-sky references. Section V-B states it as the principal limitation, the Abstract specifies that all references are clear-sky, and the Conclusion repeats the limitation. Testing in cloudy periods is the first next step.

**2.5 43 blocks, three regions, one year.** Section V-B states that this is not enough to show that the results hold across seasons, years and agricultural conditions. The new leave-one-block-out and leave-one-tile-and-date-out checks address within-sample concentration (3.1), not generalisation, and the paper does not claim otherwise.

## Reviewer 3

**3.1 Distinct blocks and dates in the long-gap bins, leave-one-out sensitivity and flooded references.** Section IV-C now reports that the >30-day persistence bin held 45 rows from 26 blocks in all three tiles, on 20 Sentinel-2 dates, with at most four rows per block. The >60-day interpolation bin held 29 rows from 18 blocks on 18 dates. Section IV-D reports the sensitivity checks:
- In the >30-day persistence bin, the difference ranged from −0.159 to −0.139 when any one block was left out and from −0.164 to −0.132 when any one tile and Sentinel-2 date was left out, and every interval excluded zero.
- With the bootstrap clustered by tile and date instead of block, the intervals were −0.203 to −0.094 for persistence, −0.238 to −0.108 for NOCB and −0.101 to 0.072 for interpolation, so the conclusions do not depend on the clustering unit.
- Without rows whose reference or baseline value was negative, the difference was −0.152 (CI −0.201 to −0.095, 42 rows), and persistence MAE fell only from 0.310 to 0.283. Flooded references therefore do not drive the result.
- In the >60-day interpolation bin, every such interval included zero.

**3.2 A stronger temporal baseline.** A hybrid of persistence and radar change was added: the previous observation plus β times the VH change since the same-orbit pass within six days of it, with β fitted on the training tiles (Section III-F). It matched persistence overall (MAE 0.109) and improved on it only beyond 20 days. Radar was 0.127 more accurate than this baseline beyond 30 days (CI 0.073 to 0.172) and did not differ from it at 11–30 days (Section IV-C). A per-block seasonal climatology needs several years per block. The calendar-only model, a seasonal prior learned in other regions, was the least accurate configuration (Table II, Section V-B).

**3.3 Justify the linear crossover or add a non-parametric estimate.** Section III-F now treats the bin-wise differences as the observed result and both fits as summaries. A decreasing isotonic fit assumes only that radar's advantage does not shrink as the gap grows, because baseline error rises with gap length while no radar feature uses optical data. It gave 21 days (CI 14 to 31) against persistence, in line with the linear 19 days, 26 days (CI 19 to 29) against NOCB, and 76 days against interpolation with an unbounded upper interval. Gap lengths are multiples of 5 days, so these crossovers are interpolated between observed lengths. The 80-day cutoff is stated as exploratory in the Abstract and in the Matani description.

**3.4 Instability in the Krangkeng gap, and whether the held-out MAE disclosure is adequate.** Section V-B explains that the up-to-0.26 swing follows the radar inputs, since the seed spread averaged 0.016. Across all 792 rows, the pooled MAE around an estimate contained only 56% of references, so it is not adequate alone. Matani now draws an empirical 80% range for every estimate, from the held-out errors of estimates of similar value. Taken for each region from the other two regions, this range contained 76% of references, below its nominal 80%, with a mean width of 0.44 (Sections III-H, IV-D, IV-F; Fig. 4). The range describes error against the optical reference; it is wider than the 0.26 swing but does not explain it, as Section V-B states. Temporal smoothing was not evaluated and is listed as a next step.

**3.5 Summary table of the display rules.** Table IV gives, for each rule, the baseline, the supporting gap bins, rows, differences with 95% CIs, and the linear and isotonic crossovers.

**3.6 Presentation.**
- Section III-A was reworded: "Each tile was divided into nine fixed windows, 27 in total. The 14 windows that held at least five eligible blocks…".
- [15] is cited at the first mention of Brinkhoff (Section II).
- The Table I headers were reformatted so that each wraps only at a space or hyphen.
- Fig. 4 was recaptured from the English interface at a larger relative text size, cropped to the chart and the main panel lines, and now shows each estimate's 80% range.
- Sections III-F and IV-C state that interpolation is retrospective and not available in live monitoring.
- As already reported in Section III-D, the matched radar pass fell after the optical date for 383 of 792 pairs. Restricting the >30-day persistence comparison to passes before the optical date gave −0.182 (CI −0.292 to −0.079, 13 rows) (Section IV-D).

**3.7 Novelty, scope and user evaluation.** The authors agree that the learners are standard. The contribution is the decision framing: gap-length crossovers against simple baselines, turned into display rules with stated evidence. Section V-C states that Matani is a prototype demonstrated on a local deployment, not checked on a phone, and not evaluated with users.
