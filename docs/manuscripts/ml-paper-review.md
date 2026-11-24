# ML paper draft: review status and open items

**Updated:** 2026-09-28 · **Status:** Working draft revised after the external review, the GPT-6 Astra re-review and the v2 fix (OBS-79, OBS-80, DEC-56). Draft 1 (OBS-78) remains the frozen pre-v2 backup.

**Files:**
- Working draft: [ml-paper.md](ml-paper.md), which builds `ml-paper.docx` (conference template) and `output/pdf/matani-ml-paper.pdf` (Chrome review render, 6 pages, the last holding only references).
- **Frozen draft 14 (current: draft 13, reviewed CLEAN by GPT-6 Astra in round 13, plus its three Nits):** `ml-paper-draft14-2026-09-29.{md,docx}`, `output/pdf/matani-ml-paper-draft14-2026-09-29.pdf` (Chrome review copy) and `output/pdf/matani-ml-paper-draft14-2026-09-29-docx-render.pdf` (submission layout, 6 pages), with hashes in [ml-paper-draft14-manifest.json](ml-paper-draft14-manifest.json). Reviews: [r12](ml-paper-astra-review-r12.md) and [r13](ml-paper-astra-review-r13.md).
- **Frozen draft 12 (superseded: results from the reviewer's 12-ablation pipeline, DEC-61/OBS-89, with block-bootstrap intervals; Matani's two display rules, DEC-62):** `ml-paper-draft12-2026-09-29.{md,docx}`, `output/pdf/matani-ml-paper-draft12-2026-09-29.pdf` (Chrome review copy, 7 pages) and `output/pdf/matani-ml-paper-draft12-2026-09-29-docx-render.pdf` (submission layout, 6 pages), with hashes, including every reviewer-pipeline file, in [ml-paper-draft12-manifest.json](ml-paper-draft12-manifest.json). Drafts 1–11 used `team-run-v2-final` and the gap-masking experiment; they are superseded but kept.
- **Frozen draft 11 (superseded; draft 10 plus the round-11 nits N29, N30 and the UTC wording of the Fig. 4 radar pass):** `ml-paper-draft11-2026-09-28.{md,docx}`, `output/pdf/matani-ml-paper-draft11-2026-09-28.pdf` and `output/pdf/matani-ml-paper-draft11-2026-09-28-docx-render.pdf`, with hashes in [ml-paper-draft11-manifest.json](ml-paper-draft11-manifest.json). Round 11 (CLEAN on draft 10): [ml-paper-astra-review-r11.md](ml-paper-astra-review-r11.md).
- **Frozen draft 10 (GPT-6 Astra round 11 CLEAN; draft 9 plus the Astra round-10 fixes N24–N28 and F3; Fig. 4 now shows the estimate detail panel):** `ml-paper-draft10-2026-09-28.{md,docx}`, `output/pdf/matani-ml-paper-draft10-2026-09-28.pdf` and `output/pdf/matani-ml-paper-draft10-2026-09-28-docx-render.pdf`, with hashes in [ml-paper-draft10-manifest.json](ml-paper-draft10-manifest.json). Round 10 and its resolutions: [ml-paper-astra-review-r10.md](ml-paper-astra-review-r10.md).
- **Frozen draft 9 (Matani + ML, Fig. 4 app demo, DEC-60; its figure is now `ml-fig-app-draft9.png`):** `ml-paper-draft9-2026-09-28.{md,docx}`, `output/pdf/matani-ml-paper-draft9-2026-09-28.pdf` and `output/pdf/matani-ml-paper-draft9-2026-09-28-docx-render.pdf`, with hashes in [ml-paper-draft9-manifest.json](ml-paper-draft9-manifest.json).
- Frozen draft 8 (no uncited earlier study, DEC-59): `ml-paper-draft8-2026-09-28.{md,docx}`, `output/pdf/matani-ml-paper-draft8-2026-09-28.pdf` and `output/pdf/matani-ml-paper-draft8-2026-09-28-docx-render.pdf`, with hashes in [ml-paper-draft8-manifest.json](ml-paper-draft8-manifest.json).
- Frozen draft 7 (draft 6 plus the calmer AI-use acknowledgment): `ml-paper-draft7-2026-09-28.{md,docx}`, `output/pdf/matani-ml-paper-draft7-2026-09-28.pdf` and `output/pdf/matani-ml-paper-draft7-2026-09-28-docx-render.pdf`, with hashes in [ml-paper-draft7-manifest.json](ml-paper-draft7-manifest.json).
- Frozen draft 6 (round-8 nits fixed; DOCX rendered with LibreOffice): `ml-paper-draft6-2026-09-28.{md,docx}`, `output/pdf/matani-ml-paper-draft6-2026-09-28.pdf` (Chrome render) and `output/pdf/matani-ml-paper-draft6-2026-09-28-docx-render.pdf` (LibreOffice render of the DOCX, 5 pages), with hashes in [ml-paper-draft6-manifest.json](ml-paper-draft6-manifest.json).
- Frozen draft 5 (draft 4 plus Astra round-7 fixes): `ml-paper-draft5-2026-09-28.{md,docx}` and `output/pdf/matani-ml-paper-draft5-2026-09-28.pdf`, with hashes in [ml-paper-draft5-manifest.json](ml-paper-draft5-manifest.json).
- Frozen draft 4 (draft 3 plus reference-paper house style and AI-use acknowledgment): `ml-paper-draft4-2026-09-28.{md,docx}` and `output/pdf/matani-ml-paper-draft4-2026-09-28.pdf`, with hashes in [ml-paper-draft4-manifest.json](ml-paper-draft4-manifest.json).
- Frozen draft 3 (GPT-6 Astra round 6 CLEAN): `ml-paper-draft3-2026-09-28.{md,docx}` and `output/pdf/matani-ml-paper-draft3-2026-09-28.pdf`, with hashes in [ml-paper-draft3-manifest.json](ml-paper-draft3-manifest.json).
- Frozen draft 2 (ml-dataset-v2, after the first two reviews): `ml-paper-draft2-2026-09-28.{md,docx}` and `output/pdf/matani-ml-paper-draft2-2026-09-28.pdf`, with hashes in [ml-paper-draft2-manifest.json](ml-paper-draft2-manifest.json).
- Frozen backup: `ml-paper-draft1-2026-09-26.{md,docx}` and `output/pdf/matani-ml-paper-draft1-2026-09-26.pdf`, with hashes in [ml-paper-draft1-manifest.json](ml-paper-draft1-manifest.json).

## Dataset version (2026-09-28)

The paper now reports **ml-dataset-v2**, in which radar history is built per relative orbit (OBS-79, OBS-80, DEC-56). The models are trained by the team (DEC-57). The official run is `team-run-v2-final`, evaluated in `evaluation-team-v2-final` (OBS-83). If the reviewer later replicates it, they must use `research/private/ml-dataset/ml-dataset-v2.zip`, not v1, and return `env.txt` unchanged. The rebuild script rejects predictions trained on another dataset version. Draft 1 (`ml-paper-draft1-*`) is the frozen pre-v2 backup.

## Replication or retraining

```sh
sh research/scripts/rebuild-ml-paper.sh <predictions.csv> <new-evaluation-name>   # uses ml-dataset-v2 by default
```

The script:
1. Validates the file.
2. Checks the run binding, then evaluates it into a new directory. It never overwrites an existing evaluation.
3. Regenerates the figures and `ml-paper-numbers.json`.
4. Builds the paper.

The script first runs `research/scripts/check_run_binding.py`. It rejects a run unless `env.txt` holds hashes for the four training data files and for `predictions.csv`, the data hashes match ml-dataset-v2, and the prediction file matches its recorded hash. This matters because row IDs alone cannot tell dataset versions apart (review N3; tested in `research/tests/test_run_binding.py`). The build then recomputes 77 selected table rows and quoted values (other numbers are checked manually) and fails with a list of every stale one. Edit `ml-paper.md` until the build passes. It also fails if the per-tile pattern the text describes changes: tiles 42 and 49 better at 60–90 days, tile 55 not, and all three beyond 90 days. Then re-read the claims about the crossover bin, the absence of a detected learner difference, and radar versus calendar. The official run is `research/private/ml-dataset/team-run-v2-final`, evaluated in `evaluation-team-v2-final` (OBS-83).

## Editorial review

The draft was revised against [paper-best-practice.md](paper-best-practice.md) on 2026-09-26. The build fails on:
- contractions, first person, "proves" and intensifiers
- captions longer than one sentence
- tables or figures the text never mentions
- uncited references
- leftover markdown formatting

The checklist items the build cannot check (C3, C6, C7, C12, C14 and C16) were read by hand on 2026-09-26. Six exactness fixes followed: the order of the 75-day absence, the radar "error independence" wording, the crossover wording, the 60-day threshold wording, the December estimate values and the scope of the Brinkhoff finding.

## Must resolve before submission

1. **Models.** Resolved by DEC-57: the team's own training run on ml-dataset-v2 is the primary result. A reviewer run is optional replication.
2. **Advisor and author approval** of the scope change (DEC-54), the title and the claims. The authors and affiliations follow `research/Thesis Matani.docx`, with Muhammad Wildan as the supervisor.
3. **Venue rules.**
   - Verified: EDAS link N35685 and the 1 October 2026 deadline (EVID-115).
   - Unverified: the AGERS 2026 page limit, template size, anonymity rules and deadline time zone. The chapter's guidelines page is currently ICARES 2026's (4–7 pages, IEEE Letter; EVID-116), and AGERS 2025 used 4–8 pages (EVID-046).
   - The current draft is 6 pages on A4 (Draft 1 was 5). If AGERS requires Letter size, re-flow the draft.
4. **DOCX visual check.** Done in LibreOffice on 2026-09-28: the draft-6 DOCX renders to 5 clean pages (`output/pdf/matani-ml-paper-draft6-2026-09-28-docx-render.pdf`), which GPT-6 Astra round 9 confirmed with its own render. Microsoft Word-specific pagination is still unchecked; open the file once in Word or Google Docs before submission.
5. **App claim.** The paper claims only a tested design. Either import the Krangkeng estimates and verify the display on a device, or keep the current wording.
6. **AI-use acknowledgment.** Reworded on 2026-09-28 into standard IEEE form: it names the tools, the sections and code involved, and the extent of use, and says the authors reviewed, revised and verified the content. **It is accurate only after every author has actually revised the AI-drafted text in their own words and understands every claim and number.** Do that revision pass, have all authors confirm the wording, and check the AGERS call for papers and the EDAS form for any extra AI rule.
7. **Data availability.** The statement says the data are "not publicly deposited at this time". Decide whether anything will be released.

Resolved on 2026-09-26: EVID-108 (Brinkhoff) and EVID-113 (Nguyen) are now verified from their full abstracts, and the Brinkhoff comparison was reframed accordingly.

## Deliberately not done

- Season breakdown by RiceAtlas (spec §8.2). Only the month distribution is reported.
- The 9-pixel display-rule sensitivity set (spec §4.1, T7).
- A ≤ 1-day matching refit. Only the offset breakdown of existing predictions is reported.
- A real-time (persistence-only) crossover protocol. The paper names it as future work.
