export function parseCsv(text) {
  const records = [];
  let row = [];
  let field = "";
  let quoted = false;
  let closed = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else {
        field += char;
      }
    } else if (char === "," || char === "\n" || char === "\r") {
      row.push(field);
      field = "";
      closed = false;
      if (char !== ",") {
        if (row.some((value) => value !== "")) records.push(row);
        row = [];
        if (char === "\r" && input[i + 1] === "\n") i += 1;
      }
    } else if (char === '"' && field === "" && !closed) {
      quoted = true;
    } else {
      if (closed || char === '"') throw new Error("invalid_csv_quoting");
      field += char;
    }
  }
  if (quoted) throw new Error("unterminated_csv_quote");
  if (field !== "" || row.length || closed) records.push([...row, field]);
  const headers = records.shift();
  if (!headers?.length || headers.some((header) => !header) || new Set(headers).size !== headers.length) {
    throw new Error("invalid_csv_headers");
  }
  return records.map((values) => {
    if (values.length !== headers.length) throw new Error("invalid_csv_column_count");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

export function dateMilliseconds(value) {
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "") || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
    throw new Error(`invalid_date: ${value}`);
  }
  return timestamp;
}

export function validateLahanId(value) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value ?? "")) {
    throw new Error("invalid_lahan_id");
  }
}

export function predictionModel(value) {
  const model = { rf: "random_forest", xgb: "xgboost" }[value];
  if (!model || !["rf", "xgb"].includes(value)) throw new Error(`invalid_prediction_model: ${value}`);
  return model;
}

function required(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`missing_${label}`);
  return value;
}

function number(value, label) {
  if (value === null || value === undefined || String(value).trim() === "" || !Number.isFinite(Number(value))) {
    throw new Error(`invalid_${label}`);
  }
  return Number(value);
}

export function buildEstimateRows({ predictions, mlTable, showcaseApply, observations, model, featureSet, modelVersion, datasetVersion, runId, modelTestMae = null }) {
  if (!["random_forest", "xgboost"].includes(model)) throw new Error("invalid_model");
  for (const [label, value] of Object.entries({ feature_set: featureSet, model_version: modelVersion, dataset_version: datasetVersion, run_id: runId })) {
    required(value, label);
  }
  const mae = modelTestMae === null ? null : number(modelTestMae, "model_test_mae");
  if (mae !== null && mae < 0) throw new Error("invalid_model_test_mae");
  const sources = new Map();
  for (const [table, rows] of [["ml_table", mlTable], ["showcase_apply", showcaseApply]]) {
    for (const row of rows) {
      const key = `${table}:${required(row.row_id, "row_id")}`;
      if (sources.has(key)) throw new Error(`duplicate_source_row: ${key}`);
      sources.set(key, row);
    }
  }
  const groups = new Map();
  const invalid = new Set();
  for (const prediction of predictions) {
    if (predictionModel(prediction.model) !== model || prediction.feature_set !== featureSet) continue;
    if (!["ml_table", "showcase_apply"].includes(prediction.table)) throw new Error("invalid_prediction_table");
    const key = `${prediction.table}:${required(prediction.row_id, "row_id")}`;
    const source = sources.get(key);
    if (!source) throw new Error(`source_row_not_found: ${key}`);
    if (source.role !== "showcase") continue;
    const value = number(prediction.y_pred, `y_pred: ${prediction.row_id}`);
    if (value < -1 || value > 1) invalid.add(prediction.row_id);
    const seed = number(prediction.seed, "seed");
    if (!Number.isInteger(seed)) throw new Error("invalid_seed");
    const outerFold = prediction.outer_fold ?? null;
    const group = groups.get(key) ?? { source, table: prediction.table, outerFold, values: new Map() };
    if (group.outerFold !== outerFold) throw new Error(`conflicting_outer_fold: ${key}`);
    if (group.values.has(seed)) throw new Error(`duplicate_prediction_seed: ${key}`);
    group.values.set(seed, value);
    groups.set(key, group);
  }
  if (invalid.size) throw new Error(`y_pred_out_of_range: ${[...invalid].sort().join(", ")}`);

  const rows = [];
  const targets = new Set();
  let skipped = 0;
  for (const { source, table, outerFold, values } of groups.values()) {
    const applied = table === "showcase_apply";
    const targetDate = applied ? source.s1_date : source.s2_date;
    const timestamp = dateMilliseconds(targetDate);
    if (applied) {
      const blockId = required(source.block_id, "block_id");
      const measured = observations.some((row) =>
        row.block_id === blockId && row.ndvi?.trim() && Number.isFinite(Number(row.ndvi)) &&
        Number(row.valid_frac) >= 0.8 && Math.abs(dateMilliseconds(row.date) - timestamp) <= 3 * 86_400_000,
      );
      if (measured) {
        skipped += 1;
        continue;
      }
    }
    const acquiredAt = required(source.s1_datetime, "s1_datetime");
    if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(acquiredAt) || !Number.isFinite(Date.parse(acquiredAt))) throw new Error("invalid_s1_datetime");
    const products = required(source.s1_products, "s1_products").split(";").map((value) => value.trim()).filter(Boolean);
    if (!products.length) throw new Error("missing_s1_products");
    if (!["ASCENDING", "DESCENDING"].includes(source.orbit_direction)) throw new Error("invalid_orbit_direction");
    const reference = applied ? null : number(source.ndvi, "reference_ndvi");
    if (reference !== null && (reference < -1 || reference > 1)) throw new Error("invalid_reference_ndvi");
    const evaluationRole = applied ? "applied" : "held_out_test";
    const targetKey = `${targetDate}:${evaluationRole}`;
    if (targets.has(targetKey)) throw new Error(`conflicting_target_rows: ${targetKey}`);
    targets.add(targetKey);
    const seeds = [...values.keys()].sort((a, b) => a - b);
    rows.push({
      target_date: targetDate,
      ndvi_estimate: seeds.reduce((sum, seed) => sum + values.get(seed), 0) / seeds.length,
      status: "estimated",
      unavailable_reason: null,
      radar_acquired_at: new Date(acquiredAt).toISOString(),
      radar_product_ids: products,
      orbit_direction: source.orbit_direction,
      offset_days: applied ? 0 : number(source.offset_days, "offset_days"),
      model_name: model,
      model_version: modelVersion,
      feature_set: featureSet,
      dataset_version: datasetVersion,
      run_id: runId,
      evaluation_role: evaluationRole,
      reference_ndvi: reference,
      model_test_mae: mae,
      provenance: { source_row_table: table, source_row_id: source.row_id, outer_fold: outerFold, seeds, feature_set: featureSet },
    });
  }
  rows.sort((a, b) => a.target_date.localeCompare(b.target_date) || a.evaluation_role.localeCompare(b.evaluation_role));
  return { rows, skipped };
}
