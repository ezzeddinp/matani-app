// Rebuilds matched rows and radar features from an existing extraction's saved observations, with no
// network call. Used when feature code changes but the provider data do not (e.g. OBS-79's per-track fix).
//
//   node research/scripts/refeature-extraction.mjs --from <extraction-dir> --out <new-dir>
//
// Copies the observation CSVs and blocks byte for byte, recomputes matched.csv and showcase-apply.csv
// with the current research/lib/cdse-s1.mjs, and records the source in MANIFEST.json.

import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { APPLY_COLUMNS, FEATURE_SETS, MATCHED_COLUMNS, S1_VERSIONS, buildApplyRows, buildMatchedRows, toCsv } from "../lib/cdse-s1.mjs";

const { values: args } = parseArgs({ options: { from: { type: "string" }, out: { type: "string" } } });
if (!args.from || !args.out) {
  console.error("Usage: --from <extraction-dir> --out <new-dir>");
  process.exit(1);
}
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readCsv = (name) => {
  const text = readFileSync(join(args.from, name), "utf8");
  if (text.includes('"')) throw new Error(`${name}: quoted cells are not supported`); // toCsv never quoted these files
  const [header, ...lines] = text.trimEnd().split("\n");
  const columns = header.split(",");
  return lines.map((line) => Object.fromEntries(line.split(",").map((cell, i) => [columns[i], cell])));
};
const num = (cell) => (cell === "" ? null : Number(cell));
const ids = (cell) => (cell === "" ? [] : cell.split(";"));

const s1ByBlock = new Map();
for (const r of readCsv("s1-observations.csv")) {
  const row = {
    date: r.date, datetime: r.datetime || null, orbit_direction: r.orbit_direction, relative_orbit: num(r.relative_orbit),
    product_ids: ids(r.product_ids), vv_lin: num(r.vv_lin), vh_lin: num(r.vh_lin), vv_db: num(r.vv_db), vh_db: num(r.vh_db),
    inc_angle: num(r.inc_angle), valid_px: num(r.valid_px), total_px: num(r.total_px), valid_frac: num(r.valid_frac),
  };
  s1ByBlock.set(r.block_id, [...(s1ByBlock.get(r.block_id) ?? []), row]);
}
const s2ByBlock = new Map();
for (const r of readCsv("s2-observations.csv")) {
  const row = {
    date: r.date, datetime: r.datetime || null, product_ids: ids(r.product_ids), ndvi: num(r.ndvi), ndvi_std: num(r.ndvi_std),
    valid_px: num(r.valid_px), source_px: num(r.source_px), block_px: num(r.block_px), valid_frac: num(r.valid_frac),
  };
  s2ByBlock.set(r.block_id, [...(s2ByBlock.get(r.block_id) ?? []), row]);
}

const blocks = JSON.parse(readFileSync(join(args.from, "blocks.geojson"), "utf8")).features.map((f) => f.properties);
let rowId = 0;
const matched = blocks.flatMap((block) =>
  buildMatchedRows({ block, s2Rows: s2ByBlock.get(block.id) ?? [], s1Series: s1ByBlock.get(block.id) ?? [] })
    .map((row) => ({ row_id: rowId++, ...row })),
);
const year = JSON.parse(readFileSync(join(args.from, "MANIFEST.json"), "utf8")).settings.s2_window[0].slice(0, 4);
const applyRows = blocks
  .filter((block) => block.role === "showcase")
  .flatMap((block) => buildApplyRows({ block, s1Series: s1ByBlock.get(block.id) ?? [], year }))
  .map((row, index) => ({ row_id: index, ...row }));

mkdirSync(args.out); // throws if it exists
const save = (name, text) => writeFileSync(join(args.out, name), text);
for (const name of ["s1-observations.csv", "s2-observations.csv", "blocks.geojson"]) copyFileSync(join(args.from, name), join(args.out, name));
const files = {
  "matched.csv": toCsv(matched, MATCHED_COLUMNS),
  "showcase-apply.csv": toCsv(applyRows, APPLY_COLUMNS),
  "features.json": JSON.stringify(FEATURE_SETS, null, 2),
};
for (const [name, text] of Object.entries(files)) save(name, text);

const source = JSON.parse(readFileSync(join(args.from, "MANIFEST.json"), "utf8"));
const codeFiles = ["research/lib/cdse-s1.mjs", "research/scripts/refeature-extraction.mjs"];
const ml = matched.filter((row) => row.target_v1_pass && row.match_status === "matched");
save("MANIFEST.json", JSON.stringify({
  created_at: new Date().toISOString(),
  data_state: "research-extraction-unreviewed",
  derived_from: { extraction: args.from, created_at: source.created_at, manifest_sha256: sha256(readFileSync(join(args.from, "MANIFEST.json"))) },
  versions: S1_VERSIONS,
  settings: source.settings,
  counts: { blocks: blocks.length, s2_acquisitions: matched.length, ml_ready_rows: ml.length, showcase_apply_rows: applyRows.length },
  provider: { ...source.provider, note: "no provider call; observations copied from derived_from.extraction" },
  code_sha256: Object.fromEntries(codeFiles.map((file) => [file, sha256(readFileSync(new URL(`../../${file}`, import.meta.url)))])),
  output_sha256: Object.fromEntries(["matched.csv", "showcase-apply.csv", "features.json", "s1-observations.csv", "s2-observations.csv", "blocks.geojson"]
    .map((name) => [name, sha256(readFileSync(join(args.out, name)))])),
}, null, 2));
console.log(`Done: ${ml.length} ML-ready rows of ${matched.length} S2 acquisitions, ${applyRows.length} apply rows. Output: ${args.out}`);
