import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildEstimateRows, parseCsv, predictionModel } from "../research/lib/ndvi-estimate-import.mjs";
import { main as importMain } from "../research/scripts/import-ndvi-estimates.mjs";
import { historicalWindows, main as historicalMain, processWindows, retryableError } from "../research/scripts/queue-historical-measurements.mjs";
import { createSupabaseMeasurementAdmin } from "../backend/measurement/supabase-admin.js";

const source = {
  row_id: "held", role: "showcase", block_id: "block-a", s2_date: "2021-01-10",
  ndvi: "0.7", s1_datetime: "2021-01-09T03:00:00Z", s1_products: "FIXTURE-A;FIXTURE-B",
  orbit_direction: "ASCENDING", offset_days: "-1",
};
const applied = { ...source, row_id: "applied", s1_date: "2021-02-10" };
const prediction = { row_id: "held", table: "ml_table", model: "rf", feature_set: "F0+F1", outer_fold: "2", seed: "1", y_pred: "0.5" };
const input = (overrides = {}) => ({
  predictions: [prediction], mlTable: [source], showcaseApply: [applied], observations: [],
  model: "random_forest", featureSet: "F0+F1", modelVersion: "fixture-model", datasetVersion: "fixture-data", runId: "fixture-run",
  ...overrides,
});
const appliedInput = (overrides = {}) => input({ predictions: [{ ...prediction, row_id: "applied", table: "showcase_apply" }], ...overrides });

test("rf/xgb map to the stored model names and model/feature selection is exact", () => {
  assert.equal(predictionModel("rf"), "random_forest");
  assert.equal(predictionModel("xgb"), "xgboost");
  assert.throws(() => predictionModel("other"), /invalid_prediction_model/);
  const { rows } = buildEstimateRows(input({ model: "xgboost", predictions: [prediction, { ...prediction, model: "xgb", y_pred: "0.6" }, { ...prediction, model: "xgb", feature_set: "F0", y_pred: "0.9" }] }));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].model_name, "xgboost");
  assert.equal(rows[0].ndvi_estimate, 0.6);
});

test("seeds are averaged with sorted provenance and duplicate seeds are rejected", () => {
  const { rows } = buildEstimateRows(input({ predictions: [{ ...prediction, seed: "2", y_pred: "0.7" }, prediction] }));
  assert.equal(rows[0].ndvi_estimate, 0.6);
  assert.deepEqual(rows[0].provenance, { source_row_table: "ml_table", source_row_id: "held", outer_fold: "2", seeds: [1, 2], feature_set: "F0+F1" });
  assert.throws(() => buildEstimateRows(input({ predictions: [prediction, prediction] })), /duplicate_prediction_seed/);
});

test("held-out rows retain the optical reference; applied rows have no reference and zero offset", () => {
  const { rows } = buildEstimateRows(input({ predictions: [prediction, { ...prediction, row_id: "applied", table: "showcase_apply" }] }));
  assert.equal(rows[0].evaluation_role, "held_out_test");
  assert.equal(rows[0].target_date, "2021-01-10");
  assert.equal(rows[0].reference_ndvi, 0.7);
  assert.equal(rows[0].offset_days, -1);
  assert.deepEqual(rows[0].radar_product_ids, ["FIXTURE-A", "FIXTURE-B"]);
  assert.equal(rows[1].evaluation_role, "applied");
  assert.equal(rows[1].target_date, "2021-02-10");
  assert.equal(rows[1].reference_ndvi, null);
  assert.equal(rows[1].offset_days, 0);
  assert.equal(rows[1].status, "estimated");
  assert.equal(buildEstimateRows(appliedInput({ predictions: [{ ...prediction, row_id: "applied", table: "showcase_apply", outer_fold: "" }] })).rows[0].provenance.outer_fold, "");
});

test("measurement wins inclusively within three days only for the same block and usable optical rows", () => {
  for (const date of ["2021-02-07", "2021-02-10", "2021-02-13"]) {
    const result = buildEstimateRows(appliedInput({ observations: [{ block_id: "block-a", date, valid_frac: "0.8", ndvi: "0" }] }));
    assert.equal(result.rows.length, 0);
    assert.equal(result.skipped, 1);
  }
  for (const observation of [
    { date: "2021-02-06" }, { date: "2021-02-14" }, { block_id: "block-b" }, { valid_frac: "0.79" }, { ndvi: "" },
  ]) {
    const result = buildEstimateRows(appliedInput({ observations: [{ block_id: "block-a", date: "2021-02-10", valid_frac: "1", ndvi: "0.6", ...observation }] }));
    assert.equal(result.rows.length, 1);
    assert.equal(result.skipped, 0);
  }
  assert.equal(buildEstimateRows(input({ observations: [{ block_id: "block-a", date: "2021-01-10", valid_frac: "1", ndvi: "0.7" }] })).rows.length, 1);
});

test("out-of-range individual seeds abort with every offending row ID, even if their mean is valid", () => {
  assert.throws(() => buildEstimateRows(input({ predictions: [
    { ...prediction, y_pred: "1.2" }, { ...prediction, seed: "2", y_pred: "-0.2" },
    { ...prediction, row_id: "applied", table: "showcase_apply", y_pred: "-1.1" },
  ] })), /y_pred_out_of_range: applied, held/);
  assert.throws(() => buildEstimateRows(input({ predictions: [{ ...prediction, y_pred: "NaN" }] })), /invalid_y_pred/);
});

test("only showcase rows are imported and row IDs are joined within their named table", () => {
  const result = buildEstimateRows(input({
    mlTable: [{ ...source, role: "train" }], showcaseApply: [{ ...applied, row_id: "held" }],
    predictions: [prediction, { ...prediction, table: "showcase_apply" }],
  }));
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].evaluation_role, "applied");
  assert.equal(buildEstimateRows(appliedInput({ showcaseApply: [{ ...applied, role: "train" }] })).rows.length, 0);
});

test("CSV parser handles quoted commas, escaped quotes, embedded newlines, BOM and CRLF", () => {
  assert.deepEqual(parseCsv('\uFEFFrow_id,value,empty\r\n"r,1","a""b\nline",\r\n'), [{ row_id: "r,1", value: 'a"b\nline', empty: "" }]);
  assert.throws(() => parseCsv('a,b\n"unclosed,b'), /unterminated_csv_quote/);
  assert.throws(() => parseCsv("a,b\n1"), /invalid_csv_column_count/);
});

test("ambiguous provenance and invalid required metadata fail before import", () => {
  assert.throws(() => buildEstimateRows(input({ predictions: [prediction, { ...prediction, outer_fold: "3", seed: "2" }] })), /conflicting_outer_fold/);
  assert.throws(() => buildEstimateRows(input({ mlTable: [{ ...source, s1_products: "" }] })), /missing_s1_products/);
  assert.throws(() => buildEstimateRows(input({ modelTestMae: "-1" })), /invalid_model_test_mae/);
  assert.throws(() => buildEstimateRows(input({ modelVersion: " " })), /missing_model_version/);
  assert.throws(() => buildEstimateRows(input({ predictions: [{ ...prediction, row_id: "missing" }] })), /source_row_not_found/);
});

test("historical windows are sorted, unique, block-scoped UTC days", () => {
  assert.deepEqual(historicalWindows([
    { block_id: "a", date: "2020-02-29" }, { block_id: "a", date: "2020-02-28" },
    { block_id: "a", date: "2020-02-29" }, { block_id: "b", date: "2020-02-27" },
  ], "a"), [
    { date: "2020-02-28", from: "2020-02-28T00:00:00.000Z", to: "2020-02-29T00:00:00.000Z" },
    { date: "2020-02-29", from: "2020-02-29T00:00:00.000Z", to: "2020-03-01T00:00:00.000Z" },
  ]);
  assert.throws(() => historicalWindows([{ block_id: "a", date: "2021-02-29" }], "a"), /invalid_date/);
});

test("historical processing enqueues and processes sequentially, including cached quality results", async () => {
  const windows = historicalWindows([1, 2, 3].map((day) => ({ block_id: "a", date: `2021-01-0${day}` })), "a");
  const calls = [];
  const results = [
    { status: "succeeded", qualityStatus: "passed", reused: false },
    { status: "succeeded", qualityStatus: null, reused: true, jobId: "cached" },
    { status: "succeeded", qualityStatus: "unavailable", reused: false },
  ];
  const worker = {
    async enqueue(args) { calls.push(["enqueue", args]); return args; },
    async process(args) { calls.push(["process", args]); return results.shift(); },
  };
  const admin = { async request(path) { assert.match(path, /job_id=eq.cached/); return [{ quality_status: "rejected" }]; } };
  const result = await processWindows({ windows, lahanId: "field", userId: "owner", worker, admin, log() {} });
  assert.deepEqual(result, { counts: { passed: 1, rejected: 1, unavailable: 1 }, failed: false });
  assert.deepEqual(calls.map(([name]) => name), ["enqueue", "process", "enqueue", "process", "enqueue", "process"]);
  assert.equal(calls[0][1].idempotencyKey, `historical:field:${windows[0].from}:${windows[0].to}`);
});

test("historical processing continues after retryable failure and stops at the first permanent failure", async () => {
  const windows = historicalWindows([1, 2, 3].map((day) => ({ block_id: "a", date: `2021-01-0${day}` })), "a");
  let attempts = 0;
  const result = await processWindows({ windows, lahanId: "field", userId: "owner", log() {}, worker: {
    async enqueue(args) { return args; },
    async process() { attempts += 1; throw Object.assign(new Error("fixture"), { statusCode: attempts === 1 ? 429 : 400 }); },
  } });
  assert.equal(attempts, 2);
  assert.deepEqual(result.counts, { passed: 0, rejected: 0, unavailable: 2 });
  assert.equal(result.failed, true);
  assert.equal(retryableError({ statusCode: 502, diagnosticCode: "cdse-process-failed-403" }), false);
  assert.equal(retryableError({ statusCode: 502, diagnosticCode: "cdse-process-timeout" }), true);
});

test("both scripts default to dry run without any network calls", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "matani-estimates-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, "data"));
  const csv = (rows) => `${Object.keys(rows[0]).join(",")}\n${rows.map((row) => Object.values(row).join(",")).join("\n")}\n`;
  await writeFile(join(directory, "data/ml_table.csv"), csv([source]));
  await writeFile(join(directory, "data/showcase_apply.csv"), csv([applied]));
  await writeFile(join(directory, "data/s2-observations.csv"), "block_id,date,valid_frac,ndvi\nblock-a,2021-01-10,1,0.7\n");
  await writeFile(join(directory, "predictions.csv"), csv([prediction]));
  t.mock.method(globalThis, "fetch", () => { assert.fail("dry run attempted network"); });
  const logs = [];
  t.mock.method(console, "log", (value) => logs.push(JSON.parse(value)));
  const lahanId = "10000000-0000-4000-8000-000000000021";
  await importMain(["--lahan-id", lahanId, "--handoff-dir", directory, "--predictions", join(directory, "predictions.csv"), "--model", "random_forest", "--feature-set", "F0+F1", "--model-version", "fixture-model", "--dataset-version", "fixture-data", "--run-id", "fixture-run"]);
  await historicalMain(["--lahan-id", lahanId, "--dates-csv", join(directory, "data/s2-observations.csv"), "--block-id", "block-a"]);
  assert.equal(logs[0].counts.held_out_test, 1);
  assert.equal(logs[0].live, false);
  assert.equal(logs[1].count, 1);
  assert.equal(logs[1].live, false);
});

test("the exposed admin request preserves secret-key and legacy JWT authentication for RPC imports", async () => {
  for (const adminKey of ["sb_secret_fixture", "eyJ.fixture.service-role"]) {
    const admin = createSupabaseMeasurementAdmin({ supabaseUrl: "https://fixture.invalid", adminKey, fetchImpl: async (url, options) => {
      assert.equal(url, "https://fixture.invalid/rest/v1/rpc/import_ndvi_estimates");
      assert.equal(options.headers.get("apikey"), adminKey);
      assert.equal(options.headers.get("authorization"), adminKey.startsWith("sb_secret_") ? null : `Bearer ${adminKey}`);
      assert.equal(options.headers.get("content-type"), "application/json");
      assert.deepEqual(JSON.parse(options.body), { p_lahan_id: "fixture", p_rows: [] });
      return new Response("1");
    } });
    assert.equal(await admin.request("rpc/import_ndvi_estimates", { method: "POST", body: JSON.stringify({ p_lahan_id: "fixture", p_rows: [] }) }), 1);
  }
});
