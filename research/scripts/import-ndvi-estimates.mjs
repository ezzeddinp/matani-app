import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { loadConfig } from "../../backend/config.js";
import { createSupabaseMeasurementAdmin } from "../../backend/measurement/supabase-admin.js";
import { buildEstimateRows, parseCsv, validateLahanId } from "../lib/ndvi-estimate-import.mjs";

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args,
    options: {
      "lahan-id": { type: "string" },
      "handoff-dir": { type: "string" },
      predictions: { type: "string" },
      model: { type: "string" },
      "feature-set": { type: "string" },
      "model-version": { type: "string" },
      "dataset-version": { type: "string" },
      "run-id": { type: "string" },
      "model-test-mae": { type: "string" },
      live: { type: "boolean", default: false },
    },
  });
  for (const name of ["lahan-id", "handoff-dir", "predictions", "model", "feature-set", "model-version", "dataset-version", "run-id"]) {
    if (!values[name]?.trim()) throw new Error(`missing_--${name}`);
  }
  validateLahanId(values["lahan-id"]);
  const readCsv = async (path) => parseCsv(await readFile(path, "utf8"));
  const [predictions, mlTable, showcaseApply, observations] = await Promise.all([
    readCsv(values.predictions),
    readCsv(join(values["handoff-dir"], "data/ml_table.csv")),
    readCsv(join(values["handoff-dir"], "data/showcase_apply.csv")),
    readCsv(join(values["handoff-dir"], "data/s2-observations.csv")),
  ]);
  const { rows, skipped } = buildEstimateRows({
    predictions, mlTable, showcaseApply, observations,
    model: values.model,
    featureSet: values["feature-set"],
    modelVersion: values["model-version"],
    datasetVersion: values["dataset-version"],
    runId: values["run-id"],
    modelTestMae: values["model-test-mae"] ?? null,
  });
  console.log(JSON.stringify({
    live: values.live,
    lahan_id: values["lahan-id"],
    count: rows.length,
    counts: {
      held_out_test: rows.filter((row) => row.evaluation_role === "held_out_test").length,
      applied: rows.filter((row) => row.evaluation_role === "applied").length,
    },
    skipped_measurement_wins: skipped,
    first_rows: rows.slice(0, 3),
  }, null, 2));
  if (!values.live) return;
  if (!rows.length) {
    console.log(JSON.stringify({ upserted: 0 }));
    return;
  }
  const config = loadConfig();
  const admin = createSupabaseMeasurementAdmin({ supabaseUrl: config.supabaseUrl, adminKey: config.supabaseAdminKey });
  const upserted = await admin.request("rpc/import_ndvi_estimates", {
    method: "POST",
    body: JSON.stringify({ p_lahan_id: values["lahan-id"], p_rows: rows }),
  });
  console.log(JSON.stringify({ upserted }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
