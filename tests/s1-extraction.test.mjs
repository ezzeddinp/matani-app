import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApplyRows,
  buildMatchedRows,
  buildS1StatisticalRequest,
  parseS1Statistics,
  parseS2NdviStatistics,
  radarFeaturesAt,
} from "../research/lib/cdse-s1.mjs";

const block = {
  id: "b1",
  tile: "42",
  window: "w1",
  geometry: {
    type: "Polygon",
    coordinates: [[[108.5053, -6.5005], [108.5059, -6.5005], [108.5059, -6.4999], [108.5053, -6.4999], [108.5053, -6.5005]]],
  },
};
const s1 = (date, vhDb, extra = {}) => ({ date, datetime: `${date}T22:40:00Z`, orbit_direction: "ASCENDING", vv_db: vhDb + 7, vh_db: vhDb, inc_angle: 38, valid_frac: 1, ...extra });
const s2 = (date, ndvi, validPx = 36) => ({ date, datetime: `${date}T02:50:00Z`, ndvi, valid_px: validPx, block_px: 36, valid_frac: validPx / 36 });

test("S1 request asks for terrain-corrected linear backscatter with a fixed orbit", () => {
  const request = buildS1StatisticalRequest({ geometry: block.geometry, from: "2021-01-01T00:00:00Z", to: "2021-02-01T00:00:00Z", orbitDirection: "DESCENDING" });
  const data = request.input.data[0];
  assert.equal(data.type, "sentinel-1-grd");
  assert.equal(data.dataFilter.orbitDirection, "DESCENDING");
  assert.deepEqual(data.processing, { backCoeff: "GAMMA0_TERRAIN", orthorectify: true, demInstance: "COPERNICUS_30" });
  assert.throws(() => buildS1StatisticalRequest({ geometry: block.geometry, from: "a", to: "b", orbitDirection: "UP" }), /invalid-orbit-direction/);
});

test("dB is taken after the linear mean, and empty days are dropped", () => {
  const body = { data: [
    { interval: { from: "2021-03-02T00:00:00Z" }, outputs: { s1: { bands: {
      VV: { stats: { mean: 0.1, sampleCount: 36, noDataCount: 0 } },
      VH: { stats: { mean: 0.01, sampleCount: 36, noDataCount: 0 } },
      angle: { stats: { mean: 39.5 } } } } } },
    { interval: { from: "2021-03-03T00:00:00Z" }, outputs: { s1: { bands: {
      VV: { stats: { mean: "NaN", sampleCount: 36, noDataCount: 36 } },
      VH: { stats: { mean: "NaN", sampleCount: 36, noDataCount: 36 } } } } } },
  ] };
  const [row, ...rest] = parseS1Statistics(body, "ASCENDING");
  assert.equal(rest.length, 0);
  assert.equal(row.vv_db, -10);
  assert.equal(row.vh_db, -20);
  assert.equal(row.valid_frac, 1);
});

test("S2 valid fraction is relative to the whole block, not only source-present pixels", () => {
  const [row] = parseS2NdviStatistics({ data: [{ interval: { from: "2021-05-01T00:00:00Z" }, outputs: {
    ndvi: { bands: { B0: { stats: { mean: 0.7, stDev: 0.02, sampleCount: 36, noDataCount: 27 } } } },
    coverage: { bands: { B0: { stats: { mean: 1, sampleCount: 36, noDataCount: 0 } } } } } }] });
  assert.equal(row.valid_px, 9);
  assert.equal(row.valid_frac, 0.25);
});

test("matching picks the nearest radar pass within 3 days, earlier on ties, else unmatched", () => {
  const series = [s1("2021-03-01", -20), s1("2021-03-05", -18), s1("2021-03-20", -15)];
  const rows = buildMatchedRows({
    block,
    s2Rows: [s2("2021-03-03", 0.4), s2("2021-03-12", 0.5), s2("2021-03-21", 0.6, 20)],
    s1Series: series.map((row) => ({ ...row, datetime: `${row.date}T02:50:00Z` })),
  });
  assert.equal(rows[0].s1_date, "2021-03-01"); // -2 d vs +2 d: tie → earlier
  assert.equal(rows[0].offset_days, -2);
  assert.equal(rows[1].match_status, "unmatched");
  assert.equal(rows[1].vh_db, undefined);
  assert.equal(rows[2].s1_date, "2021-03-20");
  assert.equal(rows[2].target_v1_pass, false); // 20/36 < 0.8
  assert.equal(rows[2].display_rule_pass, true);
});

test("radar history features never look past the matched acquisition", () => {
  const series = [s1("2021-01-01", -24), s1("2021-01-13", -22), s1("2021-01-25", -17), s1("2021-02-06", -30)];
  const features = radarFeaturesAt(series, 2);
  assert.equal(features.vh_db_prev1, -22);
  assert.equal(features.vh_db_prev2, -24);
  assert.equal(features.dvh_1, 5);
  assert.equal(features.vh_db_min_60d, -24); // the later -30 must not leak in
  assert.equal(features.days_since_vh_min_60d, 24);
});

test("matching may use either orbit, but history only comes from the matched orbit", () => {
  const series = [
    s1("2021-04-01", -25, { orbit_direction: "DESCENDING" }),
    s1("2021-04-07", -12, { orbit_direction: "ASCENDING" }),
    s1("2021-04-13", -20, { orbit_direction: "DESCENDING" }),
  ];
  const [row] = buildMatchedRows({ block, s2Rows: [s2("2021-04-14", 0.5)], s1Series: series });
  assert.equal(row.s1_date, "2021-04-13");
  assert.equal(row.orbit_asc, 0);
  assert.equal(row.vh_db_prev1, -25); // the ascending -12 in between is a different geometry
});

test("history comes from the matched relative orbit, not just the direction (OBS-79)", () => {
  const series = [
    s1("2021-04-01", -25, { orbit_direction: "DESCENDING", relative_orbit: 3 }),
    s1("2021-04-05", -12, { orbit_direction: "DESCENDING", relative_orbit: 105 }), // steeper track
    s1("2021-04-13", -20, { orbit_direction: "DESCENDING", relative_orbit: 3 }),
  ];
  const [row] = buildMatchedRows({ block, s2Rows: [s2("2021-04-14", 0.5)], s1Series: series });
  assert.equal(row.relative_orbit, 3);
  assert.equal(row.vh_db_prev1, -25);
  assert.equal(row.vh_db_min_60d, -25);
  const apply = buildApplyRows({ block: { ...block, role: "showcase" }, s1Series: series, year: "2021" });
  assert.equal(apply.find((r) => r.s1_date === "2021-04-05").vh_db_prev1, null); // no earlier track-105 pass
});

test("apply rows cover every radar date in the target year, with history from the lead-in", () => {
  const series = [s1("2020-12-20", -24), s1("2021-01-01", -22), s1("2021-01-13", -18)];
  const rows = buildApplyRows({ block: { ...block, role: "showcase" }, s1Series: series, year: "2021" });
  assert.deepEqual(rows.map((row) => row.s1_date), ["2021-01-01", "2021-01-13"]);
  assert.equal(rows[0].vh_db_prev1, -24); // December 2020 lead-in feeds history
  assert.equal(rows[0].role, "showcase");
  assert.equal("ndvi" in rows[0], false); // apply rows never carry a target
});
