// Selects the ML study blocks (docs/matani-ml-technical-spec.md §3) from the saved
// Open-SEA-Rice-10 tiles. No satellite values are read: selection is fixed before acquisition.
//
//   node research/scripts/select-ml-blocks.mjs [--per-window 3] [--min-eligible 5]
//
// Rule: in each of the 9 saved windows per tile, list 6x6 all-rice blocks (codes 1/2/3) in
// row-then-column order (same scan as select-open-sea-candidates.mjs), drop the Krangkeng
// showcase block, and take `per-window` blocks evenly spread through that list
// (index floor((k + 0.5) * n / per-window)). Windows with fewer than `min-eligible` blocks are skipped.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { parseArgs } from "node:util";

import { geometryHash, projectGeometryToLocalUtm } from "../lib/cdse-pilot.mjs";

const { values: args } = parseArgs({
  options: {
    "per-window": { type: "string", default: "3" },
    "min-eligible": { type: "string", default: "5" },
  },
});
const perWindow = Number(args["per-window"]);
const minEligible = Number(args["min-eligible"]);

const require = createRequire(new URL("../../backend/package.json", import.meta.url));
const { fromFile } = await import(require.resolve("geotiff"));
const source = (name) => new URL(`../private/replacement-study/${name}`, import.meta.url);
const outDir = new URL("../private/ml-dataset/", import.meta.url);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const windowId = (tile, window) => `${tile}:${window[0]}_${window[1]}`;

const inspection = JSON.parse(readFileSync(source("open-sea-raster-inspection.json")));
const showcase = JSON.parse(readFileSync(source("open-sea-candidates.geojson"))).features.find(
  (feature) => feature.properties.id === "open-sea-2021-tile-42-r5566-c5626",
);
assert.ok(showcase, "Krangkeng showcase block missing from open-sea-candidates.geojson");

const features = [];
const audit = [];
let selectionOrder = 0;
for (const tile of inspection.tiles) {
  const file = source(`open-sea-tile-${tile.id}.tif`);
  assert.equal(sha(readFileSync(file)), tile.sha256, `tile ${tile.id} hash mismatch`);
  const tiff = await fromFile(file.pathname);
  try {
    const image = await tiff.getImage();
    const origin = image.getOrigin();
    const resolution = image.getResolution();
    assert.equal(image.getGeoKeys().GeographicTypeGeoKey, 4326);
    for (const { window } of tile.windows) {
      const width = window[2] - window[0];
      const height = window[3] - window[1];
      const raster = await image.readRasters({ window, samples: [0], interleave: true });
      const eligible = [];
      for (let y = 0; y + 6 <= height; y += 6) {
        for (let x = 0; x + 6 <= width; x += 6) {
          const cells = [];
          for (let dy = 0; dy < 6; dy++) for (let dx = 0; dx < 6; dx++) cells.push(raster[(y + dy) * width + x + dx]);
          if (!cells.every((value) => [1, 2, 3].includes(value))) continue;
          const col = window[0] + x;
          const row = window[1] + y;
          if (tile.id === showcase.properties.source_tile && col === showcase.properties.col && row === showcase.properties.row) continue;
          eligible.push({ col, row, cells });
        }
      }
      const used = eligible.length >= minEligible;
      audit.push({ tile: tile.id, window: windowId(tile.id, window), eligible: eligible.length, used });
      if (!used) continue;
      for (let k = 0; k < perWindow; k++) {
        const pick = eligible[Math.floor(((k + 0.5) * eligible.length) / perWindow)];
        const x0 = origin[0] + pick.col * resolution[0];
        const x1 = x0 + 6 * resolution[0];
        const y1 = origin[1] + pick.row * resolution[1];
        const y0 = y1 + 6 * resolution[1];
        const geometry = { type: "Polygon", coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]] };
        const ring = projectGeometryToLocalUtm(geometry).geometry.coordinates[0];
        const area = Math.abs(ring.slice(0, -1).reduce((sum, p, n) => sum + p[0] * ring[n + 1][1] - ring[n + 1][0] * p[1], 0)) / 2;
        assert.ok(area > 3000 && area < 4000, `unexpected block area ${area}`);
        features.push({
          type: "Feature",
          geometry,
          properties: {
            id: `open-sea-2021-tile-${tile.id}-r${pick.row}-c${pick.col}`,
            tile: String(tile.id),
            window: windowId(tile.id, window),
            role: "pool",
            selection_order: selectionOrder++,
            class_values: pick.cells,
            geometry_hash: geometryHash(geometry),
            calculated_area_m2: Number(area.toFixed(2)),
          },
        });
      }
    }
  } finally {
    await tiff.close();
  }
}

features.push({
  type: "Feature",
  geometry: showcase.geometry,
  properties: {
    id: showcase.properties.id,
    tile: String(showcase.properties.source_tile),
    window: windowId(showcase.properties.source_tile, showcase.properties.source_window),
    role: "showcase",
    selection_order: null,
    class_values: showcase.properties.class_values,
    geometry_hash: showcase.properties.geometry_hash,
    calculated_area_m2: showcase.properties.calculated_area_m2,
  },
});
assert.equal(new Set(features.map((feature) => feature.properties.id)).size, features.length, "duplicate block ids");

const collection = {
  type: "FeatureCollection",
  metadata: {
    version: "blocks-v1",
    source: "https://doi.org/10.5281/zenodo.14627003 (Open-SEA-Rice-10, CC-BY-4.0, map year 2021)",
    rule: `Per window: 6x6 all-rice blocks in row-then-column order, Krangkeng showcase removed, ${perWindow} evenly spread picks (floor((k+0.5)*n/${perWindow})); windows with < ${minEligible} eligible skipped. No satellite values used.`,
    limitations: [
      "Mapped rice, not surveyed farm parcels; contiguous 6x6 rice favours consolidated paddy areas.",
      "The source map used Sentinel-1 VH and Sentinel-2 NDVI (2020-2021), so selected blocks have typical rice signatures.",
    ],
  },
  features,
};
mkdirSync(outDir, { recursive: true });
writeFileSync(new URL("blocks-v1.geojson", outDir), `${JSON.stringify(collection)}\n`, { flag: "wx" });
writeFileSync(new URL("blocks-v1-audit.json", outDir), `${JSON.stringify(audit, null, 2)}\n`, { flag: "wx" });
const byTile = Object.groupBy(features, (feature) => `${feature.properties.tile}/${feature.properties.role}`);
console.log(Object.fromEntries(Object.entries(byTile).map(([key, list]) => [key, list.length])));
console.log(`windows used: ${audit.filter((row) => row.used).length}/${audit.length}`);
