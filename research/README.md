# Matani research workspace

This workspace implements the M1 retrospective-feasibility interface. Ordinary
development and CI never call CDSE; live acquisition is always explicit (ADR-09).

## Deterministic fixture study

```powershell
python research/scripts/run_feasibility.py `
  --input research/fixtures/availability-observations.csv `
  --dataset-state fixture `
  --output research/outputs/fixture-feasibility-report.json
```

Fixture output proves report calculation only. It cannot license Indonesian monitoring
cadence or a `measured` claim.

## Credential location

The developer-standard local credential file is `backend/.env`, which is ignored by Git.
It must contain the CDSE OAuth variables and endpoints shown in
`backend/.env.example`:

```dotenv
SENTINEL_CLIENT_ID=...
SENTINEL_CLIENT_SECRET=...
SENTINEL_TOKEN_URL=https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token
SENTINEL_STATISTICS_URL=https://sh.dataspace.copernicus.eu/statistics/v1
SENTINEL_CATALOG_URL=https://sh.dataspace.copernicus.eu/catalog/v1/search
```

Never commit this file or paste its values into chat, reports, screenshots, or logs.

## Bounded exact-polygon pilot

Keep sensitive GeoJSON input under ignored `research/private/`. Run:

```powershell
node --env-file=backend/.env research/scripts/run-cdse-pilot.mjs `
  --input research/private/pilot-fields.geojson `
  --output research/outputs/live-pilot-2026-07-29.json `
  --from 2026-06-01T00:00:00Z `
  --to 2026-06-16T00:00:00Z `
  --allow-live
```

The runner accepts one or two padi polygons and a maximum 31-day window. It validates
the stored WGS84 polygon, projects the exact boundary to the local UTM CRS, and makes
three Statistical API calls per field:

- polygon quality/coverage at 20 m;
- NDVI at 10 m;
- NDMI at 20 m.

No bbox is substituted. SCL 0, 1, 3, 8, 9, and 10 are excluded; SCL 6 (water) remains
available under HYP-05. NDVI and NDMI source/valid counts remain separate. Geometry and
direct identifiers are omitted from the live artifact.

Without credentials, validate request construction without network:

```powershell
npm run pilot:cdse -- `
  --input research/private/pilot-fields.geojson `
  --output research/outputs/live-preflight.json `
  --from 2026-06-01T00:00:00Z `
  --to 2026-06-16T00:00:00Z `
  --preflight-only
```

## Multi-site 12-month M1 study

The study runner accepts any advisor-approved field count; it no longer assumes two
fields or one location. Copy
`research/contracts/m1-study-input-v1.fixture.geojson` into ignored
`research/private/`, then replace every fixture value with private evidence-backed
metadata and real field geometry.

The top-level `matani_m1` object records:

- `dataset_state`: use `private-research-input` for a possible live run;
- scope status: `provisional` or `advisor-approved` plus a private decision reference;
- quality policy: keep `open-hyp-03` until numeric floors are actually approved;
- one `site_id`, region, BMKG ZOM source reference, checked date, and `wet`/`dry`
  label for every study month.

Every field feature records `id`, `category: padi`, `area_ha`, `site_id`, exact Polygon,
and four private verification references: crop identity, boundary, consent, and
location/area. Live input requires statuses `verified`, `verified`, `granted`, and
`verified` respectively. The runner checks declarations and required references; it
cannot prove that a farmer supplied them, so the thesis team retains those private
records and honors withdrawal.

Validate the complete manifest and calculate the dynamic request budget without
credentials or network:

```powershell
node research/scripts/run-cdse-availability-study.mjs `
  --input research/private/m1-study-fields.geojson `
  --output research/outputs/live-m1-preflight.json `
  --from 2025-07-01T00:00:00.000Z `
  --to 2026-07-01T00:00:00.000Z `
  --preflight-only
```

For `N` fields, the planned provider operations are `N × 12 × 4` (one Catalog product
lookup plus quality, NDVI, and NDMI). The default retry policy allows at most three
attempts per operation, so the actual attempt ceiling is `N × 12 × 4 × 3`. The preflight
prints both numbers. Use its exact ceiling in the explicit live command; for example,
two fields produce 96 planned operations and a 288-attempt ceiling:

```powershell
node --env-file=backend/.env research/scripts/run-cdse-availability-study.mjs `
  --input research/private/m1-study-fields.geojson `
  --output research/outputs/live-availability-2025-07_to_2026-07.json `
  --from 2025-07-01T00:00:00.000Z `
  --to 2026-07-01T00:00:00.000Z `
  --max-attempts-per-request 3 `
  --confirm-max-request-attempts 288 `
  --allow-live
```

If scope is still provisional, the live runner stops unless
`--allow-provisional-scope` is explicitly added. That override permits data collection;
it does not turn the sample into an approved or representative study.

The runner saves a checkpoint after each field-month, validates the full manifest in
the resume identity, throttles requests, and applies bounded retry to HTTP 429/transient
5xx failures. The privacy-minimized report groups observations by field and by
`site × season`, with acquisition counts, cloud/shadow fractions, separate NDVI/NDMI
valid-pixel counts, Catalog product candidates, requests, and PU. Catalog IDs establish
which L2A products intersected the field/time interval but do not by themselves prove
which pixels the Statistical API selected for its mosaic. Until an advisor-approved
provisional HYP-03 floor is recorded, quality-passing counts, usable observations, gaps,
and cadence remain null or withheld instead of being fabricated.

The historical 2026-07-29 run completed for `hi` and `sszs` (OBS-11/12) under the old
two-field contract. It remains limited provider-backed `prototype` evidence and does not
satisfy representative multi-region sampling, crop/boundary/consent verification,
wet/dry stratification, HYP-03 approval, source-product identity, independent raster
comparison, M2 persistence, or provenance. See
`docs/m1-live-cdse-study-2026-07-29.md`.
