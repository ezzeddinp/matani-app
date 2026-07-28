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
