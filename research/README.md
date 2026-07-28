# Matani research workspace

This workspace implements the M1 retrospective-feasibility interface without making live
provider calls during ordinary development or CI (DEC-09).

Run the deterministic fixture study:

```powershell
python research/scripts/run_feasibility.py `
  --input research/fixtures/availability-observations.csv `
  --dataset-state fixture `
  --output research/outputs/fixture-feasibility-report.json
```

`fixture` output proves the analysis pipeline, not Indonesian monitoring cadence. A cadence
determination is withheld unless the input is explicitly `measured`, covers the configured
12-month window, contains only padi study fields, and passes manifest validation.

Live CDSE acquisition is intentionally a separate, explicitly enabled operation and is not
implemented as a default test command. Credentials must remain in the execution environment.

Run the bounded exact-polygon pilot only after placing sensitive field input under the
gitignored `research/private/` directory and exporting a CDSE OAuth client into the
execution environment:

```powershell
$env:SENTINEL_CLIENT_ID = "<CDSE client id>"
$env:SENTINEL_CLIENT_SECRET = "<CDSE client secret>"
npm run pilot:cdse -- `
  --input research/private/pilot-fields.geojson `
  --output research/outputs/live-pilot.json `
  --from 2026-06-01T00:00:00Z `
  --to 2026-06-16T00:00:00Z `
  --allow-live
```

The runner accepts at most two padi fields and a maximum 31-day window. It makes three
Statistical API calls per field: polygon quality at 20 m, NDVI at 10 m, and NDMI at
20 m. The exact GeoJSON polygon is sent; no bbox is substituted. SCL classes 0, 1, 3,
8, 9, and 10 are excluded from index statistics, while water class 6 remains available
for the padi-specific HYP-05 rule. Live artifacts and raw polygon inputs are ignored by
Git. A smoke result remains `prototype` and never licenses a cadence or `measured`
claim.

Without credentials, the same two-field contract can be validated without network:

```powershell
npm run pilot:cdse -- `
  --input research/private/pilot-fields.geojson `
  --output research/outputs/live-preflight.json `
  --from 2026-06-01T00:00:00Z `
  --to 2026-06-16T00:00:00Z `
  --preflight-only
```

The preflight reports only geometry/reference hashes, exact-polygon request semantics,
and theoretical area-to-pixel-footprint capacity. That capacity is explicitly not an
observed valid-pixel count.
