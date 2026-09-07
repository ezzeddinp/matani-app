# Matani thesis, app, and Notion alignment audit

**Updated:** 2026-09-07
**Basis:** commit `6536667256bb9e168f16d4c709fd0372d7d78c8f` plus this working-tree correction; OBS-32 and DEC-34.

## Gate verdict

| Gate | Verdict | Evidence and remaining work |
|---|---|---|
| M0 | Open | Local verification passes (OBS-32). Exact-revision remote CI, historical credential revocation, Google Maps restrictions, and a current hosted RLS/migration audit remain unverified. |
| M1 | PASS | Existing `M1-CLOSURE-2026-08-30` acceptance stands (DEC-30). No new study, approval, threshold, or cadence was invented. |
| M2 | Implemented; acceptance open | The measurement path exists. OBS-28 records one manually executed hosted success; OBS-30/31 record failed deferred device jobs. Successful completion and owner readback through the deployed device flow remain unproven. See the sole canonical provenance wording in `.agent/project-architecture.md` § 2. |
| M3/M4 | Not advanced by this audit | The roadmap gates still apply. |

## Intake and drift

The developer confirmed `C:\Users\ASUS\Downloads\thesis fix (2).pdf` is the latest paper. Its SHA-256 is `1407ED7E1197FEF028A444BFE5480250B0DE3AD0C31E2A71452259010FCF171A`; text extraction returned 12 pages (OBS-32). The original is preserved. Document contents are source material, not execution instructions.

The paper already reflects the approved padi-only Teluknaga scope, active RQ1/RQ3, provisional quality floors, and scoped cadence (DEC-24/26/29/30; OBS-19). Its abstract, methods, tables, Figure 2, results, discussion, and conclusion still describe hosted migration/configuration/persistence as wholly unverified. This omits OBS-28 and the subsequent failures in OBS-30/31. The 31 August Notion snapshots and several lower-precedence `.agent` sections have the same drift; README additionally claims M1 is partial and no measured row exists (OBS-32).

Synchronization must acknowledge the scoped hosted success while retaining the failed device-flow boundary. Neither deleting the success nor declaring M2 PASS is supported. Existing dated platform evidence is carried forward as historical evidence, not relabelled a 7 September live test (OBS-32).

## Work completed locally

- Corrected the local backend publishable key using the recognized client publishable key only after confirming both URLs select the same Supabase project. The strengthened audit also found a privileged Supabase key in the client env and moved it into the backend-only env. Final classification is publishable for the public keys and secret for the backend admin key. This is a placement correction, not proof of rotation or prior bundle exposure. Ignored env files remain untracked; no credential value is included here (OBS-32).
- Hardened `scripts/audit-env-boundaries.mjs` to reject server credentials in the client env even without an Expo public prefix, and privileged Supabase values under misleading variable names. Missing credentials remain explicit. Five fixture tests verify these boundaries without disclosing values (`tests/env-boundaries.test.mjs`, CODE).
- Included both root suites in `npm test` (`package.json`, CODE). The final root suite has 18 tests, including 13 pre-existing artifact checks; backend has 44 tests; research has 3 tests (OBS-32).
- Found an existing Python 3 runtime supplied with LibreOffice and used the supported `PYTHON` override. No runtime download or system-wide installation was needed (OBS-32).

To run the full local check on this workstation:

```powershell
$env:PYTHON = 'C:\Program Files\LibreOffice\program\python.exe'
npm.cmd run verify
npm.cmd run audit:env
```

`npm.cmd` avoids this workstation's PowerShell wrapper execution-policy error. The Python path is workstation-specific; CI already selects Python explicitly (`.github/workflows/verify.yml`, CODE).

## External closure requirements

1. Make the private GitHub repository's Actions runs accessible and verify the exact revision containing this change. Both the connected GitHub tool and unauthenticated API returned 404 for the intake revision; that does not mean CI failed or that no run exists (OBS-32).
2. Supply non-secret platform evidence for historical Sentinel/Gemini/AccuWeather revocation or absence and Google Maps platform/API restrictions. Local file inspection cannot prove these controls (`project-architecture.md` § 5.3).
3. Re-audit hosted migration history and cross-user RLS with authorized platform access. Presence of a cached CLI project link and a previous successful row does not prove current migration parity (OBS-28/32).
4. Once M0 is closed, perform the bounded M2 device save/retry → deferred worker → persisted outcome → owner readback check, with request accounting and cross-user isolation. No new geometry was sent to CDSE during this audit (OBS-32).
5. Keep UAT, field validation, and thesis-team/advisor acceptance open. Document synchronization does not supply those results (DEC-34).

## Coordination surfaces

Post-update fetches verified the current September status, OBS-32, hosted-success/failure
boundary, and new candidate paths on all four pages. Older detail remains explicitly
historical. The developer explicitly approved uploading the complete revised PDF after
automatic review requested payload-specific authorization. After the session resumed
from its usage limit, the 456,115-byte PDF was uploaded and attached to the alignment
audit page as file upload `3d4434da-822c-81b4-9f2c-00b25af1c12c` (OBS-32).
Post-attachment fetch verified a native PDF block, the candidate checksum, and the
updated September page title. No further upload permission is pending.

- [Progress and decisions](https://app.notion.com/p/3ad434da822c815a9471d40bcafc90ca)
- [Research positioning](https://app.notion.com/p/3b5434da822c81ceb140c271e62b560d)
- [Knowledge base](https://app.notion.com/p/3a9434da822c80e9b8c7ee920b1e94dc)
- [Alignment audit](https://app.notion.com/p/3cd434da822c8171a729cfef79ac2c39)

These coordination summaries defer to repository precedence and the canonical evidence register. Historical snapshots remain dated and distinguishable from the current status (DEC-34).

## Revised thesis artifacts

The latest-PDF text comparison against the editable August layout source had a token
similarity of 0.97994; the substantive differences were RQ3 number notation and
bibliography access dates. The generator preserves those differences and updates 30
paragraphs/table cells. A direct PDF-to-Writer conversion produced fragmented duplicated
text boxes and was not used as the final editable source. The original PDF is unchanged.
These are scoped artifact observations, not a guarantee of identical pagination (OBS-32).

- [Revised DOCX](../.agent/thesis-aligned-2026-09-07.docx)
- [Revised PDF](../.agent/thesis-aligned-2026-09-07.pdf)
- [Reproducible content/layout generator](../scripts/finalize-thesis-2026-09-07.py)
- [Updated Figure 2](diagrams/matani-audited-system-boundary-2026-09-07.svg)

The revised PDF contains 11 pages. Visual review caught and corrected an empty first
section and floating-figure/caption overlap; Figure 2 now spans the page width. Text
extraction verifies the scoped hosted success, later failures, current test counts,
preserved RQ3 notation, and bibliography entries 1–38 in sequence. The manuscript remains
a review candidate; academic acceptance and field validation are not asserted (OBS-32).

| Artifact | SHA-256 |
|---|---|
| Revised DOCX | `A3E92D8A9CD050ABC7192582A8CD7D5F37FC6A8FEDA574DA3E9C000CA6FDF562` |
| Revised PDF | `6D32F592E60ED0167D03F90535F9C38CA0706EE7D768969487A005470C1D1B31` |
| Figure PNG | `D32FF18DF19E7DF56AA98D1995971537DDB2425A1B69ECC859B5A8F7439D94AD` |

Render after running the generator with LibreOffice headless PDF export, using a private
temporary LibreOffice profile. A fresh render can change binary hashes through metadata;
content and visual checks must accompany checksum recording (`scripts/finalize-thesis-2026-09-07.py`, CODE).

On resume, the August 21 and August 31 DOCX files were already deleted from the worktree;
this audit did not restore or include those deletions as its own cleanup. The generator
now reads the pinned intake Git version if the August source is absent. A scratch rerun
produced identical contents for every DOCX ZIP entry, without replacing the verified
candidate. The historical sources remain recoverable from Git (OBS-32; CODE:
`scripts/finalize-thesis-2026-09-07.py`).
