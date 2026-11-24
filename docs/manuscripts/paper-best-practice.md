# Paper writing best practice (reviewer-derived)

**Updated:** 2026-09-28
**Source:** 25 comments the reviewer left on 2026-09-25 in the Google Docs copy of the Phase 7 delivery-policy paper (document `1BdAlrWpf7DhGUnyRV6kGai6J3Sj1ck1S3yaq6JimNpg`, extracted from its DOCX export).
**Use:** Run the checklist in §3 on every draft before it goes to the reviewer. The rules are editorial: they make a paper shorter, clearer and more exact. They do not decide whether the science is sound. The research protocol and evidence register still govern that.

The reviewer's pattern in one line: **say each thing once, in the fewest words, and claim no more than the data shows.** Of the 25 comments, 14 rewrite a passage to about 25% of its length (3,002 → 763 words across the rewritten passages), 6 delete a table or section, 2 convert or move content, 3 correct logic or claims, 1 fixes a caption and 1 fixes the front matter.

---

## 1. Rules

### R1 · One fact, one place

State each number and finding once. Do not repeat it across the text, a table, the discussion and the conclusion.

- **Why:** Repetition is the reviewer's most frequent complaint. Each restatement costs space and invites inconsistencies.
- **Evidence:** #3, a 200-word discussion paragraph re-deriving coverage and gap numbers, was cut to 43 words with the note "you repeat a lot here". #7 deleted a whole discussion subsection as "redundant". #24 deleted a table because the text above it already gave the same figures.
- **Check:** Does any number appear in more than one place, apart from the abstract and one results statement?

### R2 · Compress each paragraph to its claim

Each paragraph carries one claim and the evidence for it. For a methods passage, list the facts that must survive and write only those.

- **Why:** The reviewer's rewrites keep one-tenth to one-half of the original. Most of what disappears is narration ("To do this…", "It is important to note that…"), justification and restated context.
- **Evidence:** #25 reduced a 452-word acquisition section to a keep-list of ten facts (catalogue items, dates, continuation mechanism, no cloud filter, band pairs, grids, SCL exclusions, dataMask, validity thresholds, no temporal filling), to be written as one or two paragraphs. #20 cut 409 words to 39, #14 cut 90 to 15, and #21, #23 and #17 cut 300 or more words each to about 70.
- **Check:** Can every sentence in the paragraph be removed without losing a fact, a number or a reason? If yes, remove it.

### R3 · Tables hold results only

Definitions, truth tables, input inventories and test-evidence lists become one sentence or are deleted. A table stays only if it reports empirical findings that are not already stated in the text.

- **Evidence:** #18 deleted the inputs table ("no empirical information"). #19 replaced the policy truth table with two sentences. #4 deleted the technical-evidence table, and #5 supplied the paragraph that replaced it. #24 deleted a coverage table that duplicated the text.
- **Check:** For each table, does it contain measured results that appear nowhere else?

### R4 · Captions are labels

A caption says what is shown, where and when. Interpretation belongs in the text.

- **Evidence:** #10: "don't explain the picture in the caption."
- **Check:** Does any caption contain a finding, a "we found", or more than one sentence?

### R5 · Size every claim to the evidence

Qualify findings to the case studied ("for this case", "in this block-year", "in this setting"). Never write "proves". Do not turn a descriptive result into a general recommendation.

- **Evidence:** #16 changed "our study proves that it is best to…" to "For this case, independent delivery provided no additional coverage…". #11 ends with "These findings describe this block-year rather than policy equivalence." #6 states that the findings "cannot establish agronomic validity or geographic generalizability".
- **Check:** Does any sentence generalise beyond the sampled sites, period or conditions, or use "proves", "demonstrates that X is best" or "ensures"?

### R6 · Make the decisive logic explicit

When one condition determines the result, state it outright and connect it to the finding.

- **Evidence:** #22 added "Because the two delivery policies differ only when exactly one index qualifies, the absence of single-index dates meant that independent delivery had no opportunity to increase coverage in this case." #19 turned a table into the same one-condition statement.
- **Check:** Can a reader name the single condition behind the headline result from the text alone?

### R7 · Describe mechanisms exactly

Every definition of a policy, rule, model or metric must be literally correct. Read each one as a specification.

- **Evidence:** #13 caught "the system only displays a date if exactly one index qualifies", which is wrong. It was replaced with "The two delivery policies differ only when exactly one index qualifies."
- **Check:** Would implementing each definition exactly as written reproduce the method?

### R8 · State the scope and principal limitation plainly, and early

Say which part of the system or question the study evaluates, and name the principal limitation in one sentence.

- **Evidence:** #20 narrowed the scope to "only the satellite acquisition and presentation components corresponding to the Gathering and Recognizing stages". #6 opens with "The principal limitation is the single, map-selected block…"
- **Check:** Are the evaluated scope and the principal limitation each stated in a single sentence?

### R9 · Positioning belongs in the Introduction

There should be no separate "position of the present study" subsection. The gap and the contribution belong in a short Introduction paragraph.

- **Evidence:** #15: "delete this; it should be shortened and moved to the introduction."
- **Check:** Does the literature section end without a positioning or contribution subsection?

### R10 · Methods report the decision and its reason in one sentence

For each design choice, write what was done and why, once. Leave out alternatives considered, reassurances and restated goals.

- **Evidence:** #14: "Process API rasters were retained so both geometry masks could be evaluated against identical cells." This replaced four sentences. #17 and #23 follow the same pattern.
- **Check:** Does any methods choice take more than one sentence of justification?

### R11 · Academic voice

Write impersonally, in the past tense for what was done and the present tense for what the results mean. Avoid conversational or emphatic phrasing such as "we must acknowledge", "perfectly illustrates", "massive", "for now", "completely different" or "just".

- **Evidence:** Every reviewer rewrite, compared with the draft's voice. For example, #3's "a massive 65-day gap… long periods of silence" became "neither captures temporal clustering".
- **Check:** Search the draft for "we", intensifiers (very, massive, perfectly, completely, exact), and "for now", "just" and "actually".
- **Machine-sounding patterns to remove** (found in the 2026-09-26 ML draft review):
  - "Not X but Y" and "X rather than Y" contrasts used for rhythm, not meaning.
  - Semicolon balancing, such as "…; they do not substitute for…".
  - Aphorism-like summaries, such as "the features mattered more than the learner".
  - Paragraph openers that restate the result, such as "For these blocks, the preferred method depends on the gap."
  - Stock connectors used as filler: "In addition", "By contrast", "Therefore" at the start of consecutive sentences.
  - Filler scene-setting, such as "offers one way to…".
- **Loop check:** Each explanation (why a method behaves as it does) appears once, in the Discussion. Methods say what was done, Results say what happened, and neither re-explains the mechanism.

### R12 · Front matter

List the supervisor (dosen pembimbing) as an author, and lay out four authors as a 2 × 2 block.

- **Evidence:** #1.
- **Check:** Does the front matter list the supervisor, in a 2 × 2 layout?

### R13 · References follow the text

When text is deleted, delete the references that only it cited, and renumber.

- **Evidence:** #17: "then delete [35] and [36]."
- **Check:** Is every reference in the list cited in the remaining text?

### R14 · Conclusion template

A conclusion covers five things, in order:

1. What was evaluated
2. The key counts
3. The main finding
4. What the finding does not show
5. The next evaluation needed

- **Evidence:** #11, a 5-sentence conclusion in exactly this shape, and #9, future work in 3 sentences.
- **Check:** Does the conclusion hit all five, add no new results and repeat no discussion?

### R15 · House layout, following the reference paper

The reference is the reviewer's own IEEE paper, GRACE-LAKSA (`research/private/conference_101719-3.pdf`, not in git), which the team adopted as the layout model on 2026-09-28.

- **Author block:** name; department and university in *italics*; city and country; email. Smaller than body text, laid out 2 × 2 for four authors.
- **Keywords:** "Index Terms—" in Title Case, separated by commas.
- **Table captions:** above the table, as "TABLE I: Title Case Caption", left aligned. Tables use three horizontal rules only (above the header, below the header, below the last row), with no vertical lines.
- **Figure captions:** below the figure, as "Fig. 1: Sentence-case label."
- **Numbered lists** use "1)", "2)", "3)". Contributions are stated as a numbered list ("The contributions of this study are …") where appropriate.
- **Check:** Does the rendered DOCX and PDF match these conventions?

### R16 · No review or process traces in the paper

The paper describes the final method and its results. The history of how they were reached belongs in the repository records (evidence register, review files).

- **Remove:** bug changelogs ("an earlier version …, correcting it changed …"), internal verification notes ("… was not verified"), repository plumbing (hashes, file names), defensive disclaimers nobody asked for ("no new algorithm is proposed"), and informal shorthand ("after the fact", "seed noise").
- **Keep instead:** the design rationale ("history is grouped by relative orbit because …"), and scope stated positively ("… are outside the scope of this study").
- **Evidence:** the 2026-09-28 comparison of the ML draft with the reference paper; see the flagged sentence "no new algorithm is proposed".
- **Check:** Would a referee reading the sentence wonder who it is addressed to, or why it is there? If so, rewrite or remove it.

---

## 2. Worked examples

**Methods choice (R2, R10), #14.** 90 words became 15.
> Before: "Although the Statistical API can calculate aggregates while accounting for excluded pixels [34], we decided to keep the Process API rasters for this experiment. This choice allowed us to apply both polygon masks to the exact same cells and check the resulting counts locally. Keeping these rasters also ensures… It is important to note that simply getting a successful API response isn't enough…"
>
> After: "Process API rasters were retained so both geometry masks could be evaluated against identical cells."

**Caption (R4), #10.**
> Before: "Fig. 1. When looking at the passing dates for both the original and buffered NDVI and NDMI series, we found that the two delivery policies match perfectly. In our visualizations, the axis covers the entire 2021 calendar year…"
>
> After: "Fig. 1. Qualifying NDVI and NDMI acquisition dates during 2021 for the original and buffered geometries."

**Claim size (R5), #16.**
> Before: "For now, our study proves that it is best to stick with clear missing-data handling while we collect more cases…"
>
> After: "For this case, independent delivery provided no additional coverage, while explicit missing data handling remained necessary."

**Decisive logic (R6, R7), #13 and #22.**
> Before: "Under the independent delivery policy, the system only displays a date if exactly one index qualifies." (incorrect)
>
> After: "The two delivery policies differ only when exactly one index qualifies. Since no such dates occurred, both policies produced identical coverage."

---

## 3. Review checklist

Answer each question yes or no. Any "no" is a finding to fix before the draft goes to the reviewer.

| # | Section | Question | Rule |
|---|---|---|---|
| C1 | Front matter | Is the supervisor listed, in a 2 × 2 author block? | R12 |
| C2 | Abstract | Does it state the question, the data, the main numbers once and the scope limit, with no discussion? | R1, R5 |
| C3 | Introduction | Does it state the gap, the contribution and the evaluated scope in one short paragraph each? | R8, R9 |
| C4 | Literature | Does it end without a separate positioning subsection? | R9 |
| C5 | Methods | Is every design choice given in one sentence with its reason? | R10 |
| C6 | Methods | Is every definition of a policy, rule, model or metric literally correct? | R7 |
| C7 | Methods | Has every paragraph been reduced to its keep-list of facts? | R2 |
| C8 | Results | Does each number appear in only one place in the body? | R1 |
| C9 | Results | Is the condition that decides the headline result stated explicitly? | R6 |
| C10 | Tables | Does every table report measured results found nowhere else? | R3 |
| C11 | Figures | Is every caption a one-sentence label with no findings? | R4 |
| C12 | Discussion | Does it interpret rather than restate results? | R1, R2 |
| C13 | Discussion | Is every claim qualified to the sites, period and setting studied, with no "proves"? | R5 |
| C14 | Discussion | Is the principal limitation stated in one sentence? | R8 |
| C15 | Whole paper | Is it free of conversational phrasing, intensifiers and first-person narration? | R11 |
| C16 | Conclusion | Does it follow the five-part template, with no new numbers or recommendations beyond the data? | R14 |
| C17 | References | Is every listed reference cited in the remaining text? | R13 |

---

## Appendix: comment index

The comments are numbered in document-export order, the same order as the session analysis. Quotes are English paraphrases of the reviewer's Indonesian asides.

| # | Section commented | Action | Rules | Gist |
|---|---|---|---|---|
| 1 | Author block | Front matter | R12 | Add the supervisor; 2 × 2 authors |
| 2 | Results C, buffer sensitivity | Shorten | R2, R1 | 194 → 67 words; keep the numbers and the eligibility conclusion |
| 3 | Discussion B, availability | Shorten | R1, R2, R11 | 200 → 43 words; "you repeat a lot here" |
| 4 | Results D, Table VII | Delete | R3 | Technical-evidence table removed |
| 5 | Results D, Table VII | Convert | R3, R2 | Replacement paragraph for the deleted table |
| 6 | Discussion C, limits | Shorten | R8, R5 | Principal limitation in one sentence; no generalisation |
| 7 | Discussion D, reproducibility | Delete | R1 | Whole subsection redundant |
| 8 | Methods G, verification | Shorten | R2 | 81 → 27 words |
| 9 | Discussion E, further evaluation | Shorten | R2, R14 | Future work in 3 sentences |
| 10 | Results B, Fig. 1 caption | Caption | R4 | Caption must not explain the figure |
| 11 | Conclusion | Shorten | R14, R5 | Five-part conclusion; "describe this block-year" |
| 12 | Results B, gaps | Shorten | R2, R1 | Intervals in one sentence |
| 13 | Discussion A | Correct | R7, R6 | Wrong definition of independent delivery |
| 14 | Methods D, processing | Shorten | R10, R2 | 90 → 15 words, one sentence |
| 15 | Literature, position | Delete / move | R9 | Shorten and move to the Introduction |
| 16 | Discussion E | Correct | R5, R11 | "proves… best" is too strong |
| 17 | Methods E, provenance | Shorten | R10, R13 | 311 → 66 words; delete refs [35] and [36] |
| 18 | Methods A, Table I | Delete | R3 | "no empirical information" |
| 19 | Methods F, Table III | Convert | R3, R6 | Truth table becomes the one-condition sentence |
| 20 | Methods A, GROW | Shorten | R8, R2 | 409 → 39 words; state the evaluated GROW stages |
| 21 | Methods B, design | Shorten | R2, R10 | 301 → 81 words; site, selection and period facts only |
| 22 | Results A, inventory | Correct | R6 | Add the sentence that makes the zero-gain logic explicit |
| 23 | Methods C, geometry | Shorten | R10, R2 | 297 → 71 words |
| 24 | Results A, Table V | Delete | R3, R1 | Duplicates the text |
| 25 | Methods D, acquisition | Shorten | R2 | 452 words → keep-list of 10 facts, 1–2 paragraphs |
