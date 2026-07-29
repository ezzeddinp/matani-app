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

## Checkpointed 12-month acquisition

The two-field study has a hard ceiling of 72 requests and requires explicit
acknowledgement:

```powershell
node --env-file=backend/.env research/scripts/run-cdse-availability-study.mjs `
  --input research/private/pilot-fields.geojson `
  --output research/outputs/live-availability-2025-07_to_2026-07.json `
  --from 2025-07-01T00:00:00Z `
  --to 2026-07-01T00:00:00Z `
  --confirm-max-requests 72 `
  --allow-live
```

The runner saves a checkpoint after each field-month, validates study identity before
resume, throttles requests, and applies bounded retry to HTTP 429/transient 5xx failures.
Re-running the same command resumes rather than repeats completed field-months.

The 2026-07-29 run completed for `hi` and `sszs` (OBS-11/12), but remains
provider-backed `prototype` evidence. It does not satisfy representative multi-region
sampling, crop/boundary/consent verification, wet/dry stratification, HYP-03 approval,
source-product identity, independent raster comparison, M2 persistence, or provenance.
See `docs/m1-live-cdse-study-2026-07-29.md`.
