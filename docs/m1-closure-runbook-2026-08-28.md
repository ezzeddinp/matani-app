# M1 Closure Runbook — 2026-08-30

**Purpose:** exact operator checklist for closing M1 without inventing scope approval,
field evidence, thresholds, provider results, or cadence. Canonical requirements remain in
`.agent/research-protocol.md`, `.agent/data-evaluation-plan.md`, and
`.agent/implementation-plan.md`.

## What is already complete

- The multi-site, site × season manifest contract, validation gates, dynamic request
  budget, no-network preflight, bounded live execution, checkpointing, and field plus
  site × season report paths exist and are tested (CODE:
  `research/lib/m1-study-input.mjs`, `research/scripts/run-cdse-availability-study.mjs`,
  `research/lib/m1-study-report.mjs`).
- Independent raster comparison is not an M1 acceptance criterion; it is optional
  M3/future work (DEC-26).

## Inputs only the thesis team/advisor can supply

Before the final run, obtain and record all of the following. Do not use guessed values.

1. Advisor-approved active RQ1/RQ3 wording, study regions/sites, and target field count.
2. For every field: a padi polygon, verified crop identity, verified boundary, granted
   consent, verified location/area, and a non-secret reference to each evidence record.
3. For every site and every study month: `wet` or `dry`, with a dated site-specific
   seasonal-source reference. DEC-25 requires site-specific labels.
4. Advisor-approved provisional HYP-03 floors as two positive integers:
   `ndvi_min_valid_pixels` and `ndmi_min_valid_pixels`, plus the approval reference.
5. CDSE OAuth credentials in `backend/.env`. Never paste credentials into the manifest,
   report, Git, Notion, or chat.
6. A reviewed source-identity decision. Catalog candidate IDs do not prove which mosaic
   the separate Statistical API selected (EVID-026). Before M1 contract review can close,
   either select and test a provider/request path that yields exact source product IDs for
   M2, or obtain advisor approval for a different reproducible provenance contract and
   amend the canonical contract/ADR. This is separate from independent raster comparison;
   DEC-26 does not require reactivating RQ2/HYP-02 to solve it.

## Step 1 — create the private manifest

From the repository root in PowerShell:

```powershell
New-Item -ItemType Directory -Force research/private | Out-Null
Copy-Item research/contracts/m1-study-input-v1.fixture.geojson research/private/m1-study-fields.geojson
```

Edit `research/private/m1-study-fields.geojson`. Use the fixture only as a structural
template and make these exact replacements:

tess

```json
{
  "matani_m1": {
    "contract_version": "m1-study-input-v1",
    "dataset_state": "private-research-input",
    "verification_mode": "remote-assisted",
    "scope_approval": {
      "status": "advisor-approved",
      "reference": "REPLACE_WITH_ADVISOR_RECORD_REFERENCE"
    },
    "quality_policy": {
      "status": "advisor-approved-provisional",
      "ndvi_min_valid_pixels": 1,
      "ndmi_min_valid_pixels": 1,
      "approval_reference": "REPLACE_WITH_ADVISOR_RECORD_REFERENCE"
    }
  }
}
```

Replace both example `1` values with the approved positive integers. Do not treat the
example values as recommendations. For each site, replace `site_id`, `region`, all 12
monthly labels, and `season_source.type/reference/checked_at`. For each feature:

- set `properties.id` to a unique non-personal field ID;
- keep `properties.category` exactly `padi`;
- set the verified `area_ha` and matching `site_id`;
- set verification statuses exactly to `verified`, `verified`, `granted`, and `verified`
  for `crop_identity`, `boundary`, `consent`, and `location_area` respectively;
- replace every fixture method/reference with the real verification method and a
  non-secret record reference;
- replace the geometry with the verified WGS84 Polygon.

Keep the private manifest under `research/private/`; do not commit it.

## Step 2 — run the no-network preflight

Use the established 12-month window below. If the thesis team changes the window, update
the manifest so every included month has a site-specific season label before running.

```powershell
node research/scripts/run-cdse-availability-study.mjs `
  --input research/private/m1-study-fields.geojson `
  --output research/outputs/live-m1-preflight.json `
  --from 2025-07-01T00:00:00.000Z `
  --to 2026-07-01T00:00:00.000Z `
  --preflight-only
```

Stop if this command exits non-zero. Fix the named manifest error; do not bypass it. Open
`research/outputs/live-m1-preflight.json` and copy the integer at
`request_budget.request_attempt_ceiling`.

## Step 3 — run the bounded live study

Replace `REPLACE_WITH_PREFLIGHT_INTEGER` with the exact integer from Step 2:

```powershell
node --env-file=backend/.env research/scripts/run-cdse-availability-study.mjs `
  --input research/private/m1-study-fields.geojson `
  --output research/outputs/live-availability-2025-07_to_2026-07.json `
  --from 2025-07-01T00:00:00.000Z `
  --to 2026-07-01T00:00:00.000Z `
  --max-attempts-per-request 3 `
  --confirm-max-request-attempts REPLACE_WITH_PREFLIGHT_INTEGER `
  --allow-live
```

Do not add `--allow-provisional-scope` for a final M1 run. That flag permits acquisition
only and cannot satisfy advisor approval or representative-study acceptance.

## Step 4 — review the report and close decisions

The thesis team must inspect the generated report rather than treating exit code zero as
scientific acceptance.

1. Confirm every intended field and site appears and no unexpected field/site appears.
2. Confirm each site has both correct month labels and the intended region.
3. Confirm request/PU totals are within the freshly checked CDSE allowance (EVID-010).
4. Record usable observations/month, median gap, longest gap, cloud/shadow fraction,
   valid-pixel counts per index, and wet/dry split per site × season.
5. Record one explicit cadence outcome per site × season: weekly, biweekly, monthly,
   event-based, or no defensible cadence. A negative result is valid; do not force one
   national cadence (HYP-01; DEC-25).
6. Close the source-product identity decision from the input checklist. Merely recording
   the limitation or listing Catalog candidates does not finalize the M2 provenance
   contract.
7. Have the thesis team/advisor review the cadence result and the finalized measurement
   contract. Record the decision references in the canonical documents and Notion.

## Closure status — 2026-08-30

- [x] Approved private Teluknaga manifest and 12-month live report exist (OBS-19).
- [x] Report metrics use the advisor-approved provisional 9/3 floors (DEC-27).
- [x] Request/PU totals were compared with the rechecked quota (EVID-010).
- [x] Cadence was reviewed: dry monthly; wet no defensible cadence (DEC-29).
- [x] Source-provenance/measurement contract was reviewed for M2 (DEC-28/29; ADR-15).
- [x] Final active RQ wording was approved; RQ2 remains optional future work (DEC-29).
- [x] Run and record the latest clean local repository verification evidence: `npm run verify` exited 0; lint, typechecks, root 7/7, backend 28/28, and research 3/3 passed (OBS-21).
- [ ] Confirm remote CI for the exact current revision under the still-open M0 gate; this is tracked separately from M1 acceptance.
- [x] Update the Notion progress log with DEC-29 and OBS-21; post-update fetch verification passed on 2026-08-30.
- [x] Record final closure reference `M1-CLOSURE-2026-08-30` (DEC-30). M1 PASS; this does not close M0 or implement M2.

## M1 is 100% complete only when

- the approved private manifest and 12-month live report exist;
- the report contains usable field and site × season metrics under approved provisional
  quality floors;
- the quota comparison and cadence determination are recorded;
- the provenance/processing contract is reviewed and ready for M2 migration; and
- the canonical M1 status and Notion log are updated with the review references.

The required private/advisor/provider inputs and review references are now present under
the closure reference above. M0 external controls and M2 implementation remain separate.
