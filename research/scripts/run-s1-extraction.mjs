// Builds the Sentinel-1 → NDVI dataset (docs/matani-ml-technical-spec.md §4, §11.1).
//
// Plan only (no network):
//   node research/scripts/run-s1-extraction.mjs --blocks <blocks.geojson> --out <new-dir>
// Live CDSE acquisition (explicit, ADR-09):
//   node --env-file=.env research/scripts/run-s1-extraction.mjs --blocks <blocks.geojson> --out <new-dir> --live
//
// Blocks: GeoJSON FeatureCollection of Polygons; properties need `id`, plus `tile`
// (or `source_tile`) and `window` (or `source_window`). Output directory must not exist.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

import {
  CDSE_TOKEN_URL,
  buildStatisticalRequest,
  executeCatalogRequestWithRetry,
  executeStatisticalRequestWithRetry,
  fetchCdseToken,
} from "../lib/cdse-pilot.mjs";
import {
  APPLY_COLUMNS,
  FEATURE_SETS,
  MATCHED_COLUMNS,
  ORBIT_DIRECTIONS,
  S1_PROCESSING,
  S1_VERSIONS,
  buildApplyRows,
  buildCollectionCatalogRequest,
  buildMatchedRows,
  buildS1StatisticalRequest,
  indexCatalogByDate,
  parseS1Statistics,
  parseS2NdviStatistics,
  toCsv,
} from "../lib/cdse-s1.mjs";

const { values: args } = parseArgs({
  options: {
    blocks: { type: "string" },
    ids: { type: "string" },
    out: { type: "string" },
    "s1-from": { type: "string", default: "2020-10-01" }, // 3-month lead-in for radar history
    "s1-to": { type: "string", default: "2022-01-01" },
    "s2-from": { type: "string", default: "2021-01-01" },
    "s2-to": { type: "string", default: "2022-01-01" },
    live: { type: "boolean", default: false },
    "max-pu": { type: "string", default: "200" },
    concurrency: { type: "string", default: "4" },
  },
});
if (!args.blocks || !args.out) {
  console.error("Usage: --blocks <geojson> --out <new-dir> [--ids a,b] [--live]");
  process.exit(1);
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const monthWindows = (from, to) => {
  const windows = [];
  let cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (cursor.getUTCDate() !== 1 || end.getUTCDate() !== 1 || cursor >= end) throw new Error("windows-must-start-on-month-boundaries");
  while (cursor < end) {
    const next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    windows.push({ from: cursor.toISOString(), to: next.toISOString() });
    cursor = next;
  }
  return windows;
};

const wanted = args.ids ? new Set(args.ids.split(",")) : null;
const blocks = JSON.parse(readFileSync(args.blocks, "utf8"))
  .features.filter((feature) => !wanted || wanted.has(feature.properties.id))
  .map((feature) => ({
    id: feature.properties.id,
    tile: String(feature.properties.tile ?? feature.properties.source_tile),
    window: String(feature.properties.window ?? feature.properties.source_window?.join("_")),
    role: feature.properties.role ?? "pool",
    geometry: feature.geometry,
  }));
if (!blocks.length) throw new Error("no-blocks-selected");
if (wanted && blocks.length !== wanted.size) throw new Error("some --ids not found in --blocks");

const s1Months = monthWindows(args["s1-from"], args["s1-to"]);
const s2Months = monthWindows(args["s2-from"], args["s2-to"]);
const jobsFor = (block) => [
  ...s2Months.map((w) => ({ kind: "s2-stats", w, request: buildStatisticalRequest({ geometry: block.geometry, ...w, output: "ndvi" }) })),
  ...s2Months.map((w) => ({ kind: "s2-catalog", w, request: buildCollectionCatalogRequest({ collection: "sentinel-2-l2a", geometry: block.geometry, ...w }) })),
  ...ORBIT_DIRECTIONS.flatMap((orbitDirection) =>
    s1Months.map((w) => ({ kind: "s1-stats", orbitDirection, w, request: buildS1StatisticalRequest({ geometry: block.geometry, ...w, orbitDirection }) })),
  ),
  ...s1Months.map((w) => ({ kind: "s1-catalog", w, request: buildCollectionCatalogRequest({ collection: "sentinel-1-grd", geometry: block.geometry, ...w }) })),
];
const plannedRequests = blocks.length * jobsFor(blocks[0]).length;

mkdirSync(dirname(args.out), { recursive: true });
mkdirSync(args.out); // throws if it exists: never overwrite a previous run
const save = (name, text) => writeFileSync(join(args.out, name), text, { flag: "wx" });
console.log(`${blocks.length} block(s), ${plannedRequests} requests planned.`);

if (!args.live) {
  save("PLAN.json", JSON.stringify({ blocks: blocks.map(({ geometry, ...rest }) => rest), planned_requests: plannedRequests, example_s1_request: jobsFor(blocks[0]).find((job) => job.kind === "s1-stats").request }, null, 2));
  console.log(`Plan written to ${args.out}/PLAN.json. Add --live to acquire.`);
  process.exit(0);
}

if (!process.env.SENTINEL_CLIENT_ID || !process.env.SENTINEL_CLIENT_SECRET) {
  throw new Error("Set SENTINEL_CLIENT_ID and SENTINEL_CLIENT_SECRET (e.g. node --env-file=.env ...).");
}
// Always the CDSE identity endpoint: statistics/catalog calls below use the CDSE defaults too.
let token = null;
let tokenAt = 0;
const freshToken = () => {
  if (!token || Date.now() - tokenAt > 4 * 60_000) {
    tokenAt = Date.now();
    token = fetchCdseToken({
      clientId: process.env.SENTINEL_CLIENT_ID,
      clientSecret: process.env.SENTINEL_CLIENT_SECRET,
      tokenUrl: CDSE_TOKEN_URL,
    });
  }
  return token; // shared promise: concurrent workers reuse one token request
};

const maxPu = Number(args["max-pu"]);
let puSpent = 0;
let requestsSent = 0;
const run = async (job) => {
  if (puSpent > maxPu) throw new Error(`processing-unit cap ${maxPu} reached; rerun into a new --out with a higher --max-pu`);
  const execute = job.kind.endsWith("catalog") ? executeCatalogRequestWithRetry : executeStatisticalRequestWithRetry;
  const result = await execute({ token: await freshToken(), request: job.request });
  requestsSent += result.attempts;
  puSpent += result.processingUnits ?? 0;
  return result.body;
};
const pool = async (jobs, size) => {
  const results = new Array(jobs.length);
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < jobs.length) {
      const index = next++;
      results[index] = await run(jobs[index]);
    }
  }));
  return results;
};

mkdirSync(join(args.out, "raw"));
const perBlock = [];
for (const block of blocks) {
  const jobs = jobsFor(block);
  const bodies = await pool(jobs, Number(args.concurrency));
  save(`raw/${block.id}.json`, JSON.stringify(jobs.map((job, i) => ({ kind: job.kind, orbit: job.orbitDirection ?? null, window: job.w, body: bodies[i] }))));

  const byKind = (kind) => jobs.flatMap((job, i) => (job.kind === kind ? [{ job, body: bodies[i] }] : []));
  const s2Catalog = indexCatalogByDate(byKind("s2-catalog").flatMap(({ body }) => body.features ?? []));
  const s1Catalog = indexCatalogByDate(byKind("s1-catalog").flatMap(({ body }) => body.features ?? []));
  const withCatalog = (row, key) => {
    const entry = key.endsWith("|") ? [...s2Catalog.entries()].find(([k]) => k.startsWith(key))?.[1] : s1Catalog.get(key);
    return { ...row, datetime: entry?.datetime ?? null, product_ids: entry?.product_ids ?? [], relative_orbit: entry?.relative_orbit ?? null };
  };
  const s2Rows = byKind("s2-stats").flatMap(({ body }) => parseS2NdviStatistics(body)).map((row) => withCatalog(row, `${row.date}|`));
  const s1Rows = byKind("s1-stats")
    .flatMap(({ job, body }) => parseS1Statistics(body, job.orbitDirection))
    .map((row) => withCatalog(row, `${row.date}|${row.orbit_direction}`));
  perBlock.push({ block, s2Rows, s1Rows });
  console.log(`${block.id}: ${s2Rows.length} S2 acquisitions, ${s1Rows.length} S1 acquisitions (both orbits); ${requestsSent} requests, ${puSpent.toFixed(3)} PU so far`);
}

// Acquisition counts per tile and orbit direction (both directions are used, spec §4.2).
const orbitCounts = {};
for (const { block, s1Rows } of perBlock) {
  for (const row of s1Rows) {
    if (!row.date.startsWith(args["s2-from"].slice(0, 4))) continue;
    orbitCounts[block.tile] ??= { ASCENDING: 0, DESCENDING: 0 };
    orbitCounts[block.tile][row.orbit_direction] += 1;
  }
}

let rowId = 0;
const matched = perBlock.flatMap(({ block, s2Rows, s1Rows }) =>
  buildMatchedRows({ block, s2Rows, s1Series: s1Rows })
    .map((row) => ({ row_id: rowId++, ...row })),
);

const applyRows = perBlock
  .filter(({ block }) => block.role === "showcase")
  .flatMap(({ block, s1Rows }) =>
    buildApplyRows({ block, s1Series: s1Rows, year: args["s2-from"].slice(0, 4) }),
  )
  .map((row, index) => ({ row_id: index, ...row }));

const S1_COLUMNS = ["block_id", "date", "datetime", "orbit_direction", "relative_orbit", "product_ids", "vv_lin", "vh_lin", "vv_db", "vh_db", "inc_angle", "valid_px", "total_px", "valid_frac"];
const S2_COLUMNS = ["block_id", "date", "datetime", "product_ids", "ndvi", "ndvi_std", "valid_px", "source_px", "block_px", "valid_frac"];
const flat = (rows, block) => rows.map((row) => ({ block_id: block.id, ...row, product_ids: row.product_ids.join(";") }));
const files = {
  "matched.csv": toCsv(matched, MATCHED_COLUMNS),
  "showcase-apply.csv": toCsv(applyRows, APPLY_COLUMNS),
  "s1-observations.csv": toCsv(perBlock.flatMap(({ block, s1Rows }) => flat(s1Rows, block)), S1_COLUMNS),
  "s2-observations.csv": toCsv(perBlock.flatMap(({ block, s2Rows }) => flat(s2Rows, block)), S2_COLUMNS),
  "blocks.geojson": JSON.stringify({ type: "FeatureCollection", features: blocks.map(({ geometry, ...properties }) => ({ type: "Feature", properties, geometry })) }),
  "features.json": JSON.stringify(FEATURE_SETS, null, 2),
};
for (const [name, text] of Object.entries(files)) save(name, text);

const ml = matched.filter((row) => row.target_v1_pass && row.match_status === "matched");
const codeFiles = ["research/lib/cdse-s1.mjs", "research/lib/cdse-pilot.mjs", "research/scripts/run-s1-extraction.mjs"];
save("MANIFEST.json", JSON.stringify({
  created_at: new Date().toISOString(),
  data_state: "research-extraction-unreviewed",
  versions: S1_VERSIONS,
  settings: { s1_processing: S1_PROCESSING, s1_window: [args["s1-from"], args["s1-to"]], s2_window: [args["s2-from"], args["s2-to"]], s1_acquisitions_by_tile_and_orbit: orbitCounts },
  counts: {
    blocks: blocks.length,
    s2_acquisitions: matched.length,
    target_v1_pass: matched.filter((row) => row.target_v1_pass).length,
    display_rule_pass: matched.filter((row) => row.display_rule_pass).length,
    ml_ready_rows: ml.length,
    showcase_apply_rows: applyRows.length,
    per_block_ml_ready: Object.fromEntries(blocks.map((block) => [block.id, ml.filter((row) => row.block_id === block.id).length])),
  },
  provider: { requests_including_retries: requestsSent, processing_units: Number(puSpent.toFixed(4)) },
  code_sha256: Object.fromEntries(codeFiles.map((file) => [file, sha256(readFileSync(new URL(`../../${file}`, import.meta.url)))])),
  output_sha256: Object.fromEntries(Object.entries(files).map(([name, text]) => [name, sha256(text)])),
}, null, 2));
console.log(`Done: ${ml.length} ML-ready rows (target-v1 pass + matched) of ${matched.length} S2 acquisitions. Output: ${args.out}`);
