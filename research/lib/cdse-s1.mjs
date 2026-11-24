import { projectGeometryToLocalUtm, validatePilotGeometry } from "./cdse-pilot.mjs";

// Sentinel-1 → NDVI dataset builder (docs/matani-ml-technical-spec.md §4–§5).
// Pure functions only; network calls live in research/scripts/run-s1-extraction.mjs.

export const S1_VERSIONS = Object.freeze({
  extraction: "s1-grd-block-stats-v1",
  target: "target-v1-valid-frac-0.8",
  matching: "nearest-either-orbit-within-3d-earlier-on-tie-v2",
  features: "f0-f1-f2-v3-same-track-history",
});

export const S1_PROCESSING = Object.freeze({
  backCoeff: "GAMMA0_TERRAIN",
  orthorectify: true,
  demInstance: "COPERNICUS_30",
});

export const ORBIT_DIRECTIONS = Object.freeze(["ASCENDING", "DESCENDING"]);
export const TARGET_MIN_VALID_FRACTION = 0.8; // HYP: target-v1
export const DISPLAY_NDVI_FLOOR = 9; // existing display rule, backend/measurement/statistics.js:60
export const MAX_MATCH_OFFSET_DAYS = 3; // HYP: spec §4.3
const DAY_MS = 86_400_000;

const s1Evalscript = () =>
  [
    "//VERSION=3",
    "function setup() {",
    "  return {",
    '    input: [{ bands: ["VV", "VH", "localIncidenceAngle", "shadowMask", "dataMask"] }],',
    '    output: [{ id: "s1", bands: ["VV", "VH", "angle"], sampleType: "FLOAT32" }, { id: "dataMask", bands: 1 }]',
    "  };",
    "}",
    "function evaluatePixel(sample) {",
    "  const ok = sample.dataMask === 1 && sample.shadowMask === 0 ? 1 : 0;",
    "  return { s1: [sample.VV, sample.VH, sample.localIncidenceAngle], dataMask: [ok] };",
    "}",
  ].join("\n");

// VV/VH come back as LINEAR power; the API mean is therefore a linear average (never average dB).
export const buildS1StatisticalRequest = ({ geometry, from, to, orbitDirection }) => {
  validatePilotGeometry(geometry);
  if (!ORBIT_DIRECTIONS.includes(orbitDirection)) throw new Error("invalid-orbit-direction");
  const projection = projectGeometryToLocalUtm(geometry);
  return {
    input: {
      bounds: {
        geometry: projection.geometry,
        properties: { crs: projection.processing_crs },
      },
      data: [
        {
          type: "sentinel-1-grd",
          dataFilter: {
            timeRange: { from, to },
            acquisitionMode: "IW",
            polarization: "DV",
            resolution: "HIGH",
            orbitDirection,
            mosaickingOrder: "mostRecent",
          },
          processing: { ...S1_PROCESSING },
        },
      ],
    },
    aggregation: {
      timeRange: { from, to },
      aggregationInterval: { of: "P1D" },
      evalscript: s1Evalscript(),
      resx: 10,
      resy: 10,
    },
  };
};

// Monthly windows keep each page under the 100-item cap enforced by executeCatalogRequest.
export const buildCollectionCatalogRequest = ({ collection, geometry, from, to }) => {
  validatePilotGeometry(geometry);
  return { collections: [collection], datetime: `${from}/${to}`, intersects: geometry, limit: 100 };
};

export const toDb = (linear) => 10 * Math.log10(linear);

const validCount = (stats) =>
  stats ? Math.max(0, Number(stats.sampleCount) - Number(stats.noDataCount)) : 0;

export const parseS1Statistics = (body, orbitDirection) =>
  (body?.data ?? []).flatMap((item) => {
    const bands = item?.outputs?.s1?.bands ?? {};
    const vv = bands.VV?.stats;
    const vh = bands.VH?.stats;
    const valid = validCount(vv);
    if (!valid || !(Number(vv.mean) > 0) || !(Number(vh?.mean) > 0)) return [];
    return [
      {
        date: item.interval.from.slice(0, 10),
        orbit_direction: orbitDirection,
        vv_lin: Number(vv.mean),
        vh_lin: Number(vh.mean),
        vv_db: toDb(Number(vv.mean)),
        vh_db: toDb(Number(vh.mean)),
        inc_angle: Number.isFinite(Number(bands.angle?.stats?.mean))
          ? Number(bands.angle.stats.mean)
          : null,
        valid_px: valid,
        total_px: Number(vv.sampleCount),
        valid_frac: valid / Number(vv.sampleCount),
      },
    ];
  });

// Parses responses from cdse-pilot.mjs buildStatisticalRequest({ output: "ndvi" }).
export const parseS2NdviStatistics = (body) =>
  (body?.data ?? []).flatMap((item) => {
    const ndvi = item?.outputs?.ndvi?.bands?.B0?.stats;
    const coverage = item?.outputs?.coverage?.bands?.B0?.stats;
    const blockPx = Number(coverage?.sampleCount ?? 0);
    const sourcePx = validCount(coverage);
    if (!sourcePx) return [];
    const validPx = validCount(ndvi);
    return [
      {
        date: item.interval.from.slice(0, 10),
        ndvi: validPx ? Number(ndvi.mean) : null,
        ndvi_std: validPx ? Number(ndvi.stDev) : null,
        valid_px: validPx,
        source_px: sourcePx,
        block_px: blockPx,
        valid_frac: blockPx ? validPx / blockPx : 0,
      },
    ];
  });

// Collapses catalog features to one record per UTC date (and orbit state for S1).
export const indexCatalogByDate = (features) => {
  const byKey = new Map();
  for (const feature of features) {
    const properties = feature.properties ?? {};
    if (properties["sar:instrument_mode"] && properties["sar:instrument_mode"] !== "IW") continue;
    const datetime = properties.datetime;
    if (!datetime) continue;
    const orbit = properties["sat:orbit_state"]?.toUpperCase() ?? null;
    const key = `${datetime.slice(0, 10)}|${orbit ?? ""}`;
    const entry = byKey.get(key) ?? { datetime, orbit_direction: orbit, product_ids: [], relative_orbit: null };
    if (datetime < entry.datetime) entry.datetime = datetime;
    entry.product_ids.push(feature.id);
    entry.relative_orbit ??= properties["sat:relative_orbit"] ?? null;
    byKey.set(key, entry);
  }
  return byKey;
};

const timeOf = (row) => Date.parse(row.datetime ?? `${row.date}T00:00:00Z`);
const round = (value, digits = 4) =>
  value === null || value === undefined ? null : Number(value.toFixed(digits));

// Past-only radar features at series[i] (spec §5). series: one block + one relative orbit, time-sorted.
export const radarFeaturesAt = (series, i) => {
  const current = series[i];
  const prev1 = series[i - 1] ?? null;
  const prev2 = series[i - 2] ?? null;
  const t = timeOf(current);
  const recent = series.slice(0, i + 1).filter((row) => timeOf(row) > t - 60 * DAY_MS);
  const minimum = recent.reduce((low, row) => (row.vh_db < low.vh_db ? row : low));
  return {
    vv_db: round(current.vv_db),
    vh_db: round(current.vh_db),
    vh_minus_vv_db: round(current.vh_db - current.vv_db),
    inc_angle: round(current.inc_angle, 2),
    orbit_asc: current.orbit_direction === "ASCENDING" ? 1 : 0,
    vh_db_prev1: round(prev1?.vh_db ?? null),
    vh_db_prev2: round(prev2?.vh_db ?? null),
    dvh_1: prev1 ? round(current.vh_db - prev1.vh_db) : null,
    vh_db_min_60d: round(minimum.vh_db),
    days_since_vh_min_60d: round((t - timeOf(minimum)) / DAY_MS, 2),
  };
};

// Both orbit directions are used (spec §4.2); history always comes from the same relative orbit
// (track), so each lag compares like geometry with like. A direction can hold two tracks with very
// different incidence angles (e.g. descending 3 and 105 in tile 55, OBS-79).
const track = (row) => `${row.orbit_direction}|${row.relative_orbit ?? ""}`;
const sameOrbitFeatures = (series, row) => {
  const sameOrbit = series.filter((other) => track(other) === track(row));
  return radarFeaturesAt(sameOrbit, sameOrbit.indexOf(row));
};

export const calendarFeatures = (date) => {
  const start = Date.UTC(Number(date.slice(0, 4)), 0, 1);
  const doy = Math.floor((Date.parse(`${date}T00:00:00Z`) - start) / DAY_MS) + 1;
  const angle = (2 * Math.PI * doy) / 365.25;
  return { doy, doy_sin: round(Math.sin(angle)), doy_cos: round(Math.cos(angle)) };
};

// One output row per S2 acquisition (every one, for the inventory); ML uses
// rows where target_v1_pass && match_status === "matched".
export const buildMatchedRows = ({ block, s2Rows, s1Series, maxOffsetDays = MAX_MATCH_OFFSET_DAYS }) => {
  const series = [...s1Series].sort((a, b) => timeOf(a) - timeOf(b));
  return s2Rows.map((target) => {
    const t = timeOf(target);
    let best = -1;
    series.forEach((row, index) => {
      const offset = (timeOf(row) - t) / DAY_MS;
      if (Math.abs(offset) > maxOffsetDays) return;
      if (best === -1) return void (best = index);
      const bestOffset = (timeOf(series[best]) - t) / DAY_MS;
      if (Math.abs(offset) < Math.abs(bestOffset)) best = index; // equal |offset| keeps the earlier row
    });
    const match = best === -1 ? null : series[best];
    return {
      block_id: block.id,
      tile: block.tile,
      window: block.window,
      role: block.role ?? "pool",
      s2_date: target.date,
      s2_datetime: target.datetime ?? null,
      s2_products: target.product_ids?.join(";") ?? null,
      ndvi: round(target.ndvi),
      ndvi_valid_px: target.valid_px,
      ndvi_block_px: target.block_px,
      ndvi_valid_frac: round(target.valid_frac),
      target_v1_pass: target.ndvi !== null && target.valid_frac >= TARGET_MIN_VALID_FRACTION,
      display_rule_pass: target.valid_px >= DISPLAY_NDVI_FLOOR,
      match_status: match ? "matched" : "unmatched",
      s1_date: match?.date ?? null,
      s1_datetime: match?.datetime ?? null,
      s1_products: match?.product_ids?.join(";") ?? null,
      orbit_direction: match?.orbit_direction ?? null,
      relative_orbit: match?.relative_orbit ?? null,
      offset_days: match ? round((timeOf(match) - t) / DAY_MS, 3) : null,
      s1_valid_frac: match ? round(match.valid_frac) : null,
      ...(match ? sameOrbitFeatures(series, match) : {}),
      ...calendarFeatures(target.date),
    };
  });
};

export const MATCHED_COLUMNS = Object.freeze([
  "row_id", "block_id", "tile", "window", "role", "s2_date", "s2_datetime", "s2_products",
  "ndvi", "ndvi_valid_px", "ndvi_block_px", "ndvi_valid_frac", "target_v1_pass",
  "display_rule_pass", "match_status", "s1_date", "s1_datetime", "s1_products",
  "orbit_direction", "relative_orbit", "offset_days", "s1_valid_frac",
  "vv_db", "vh_db", "vh_minus_vv_db", "inc_angle", "orbit_asc", "vh_db_prev1", "vh_db_prev2",
  "dvh_1", "vh_db_min_60d", "days_since_vh_min_60d", "doy", "doy_sin", "doy_cos",
]);

// Rows to *apply* a model to (no target): every radar acquisition (both orbits) in `year`.
// Used for the showcase block so Matani can show estimates inside optical gaps.
export const buildApplyRows = ({ block, s1Series, year }) => {
  const series = [...s1Series].sort((a, b) => timeOf(a) - timeOf(b));
  return series.flatMap((row) =>
    row.date.startsWith(String(year))
      ? [{
          block_id: block.id,
          tile: block.tile,
          window: block.window,
          role: block.role ?? "pool",
          s1_date: row.date,
          s1_datetime: row.datetime ?? null,
          s1_products: row.product_ids?.join(";") ?? null,
          orbit_direction: row.orbit_direction,
          relative_orbit: row.relative_orbit ?? null,
          s1_valid_frac: round(row.valid_frac),
          ...sameOrbitFeatures(series, row),
          ...calendarFeatures(row.date),
        }]
      : [],
  );
};

export const APPLY_COLUMNS = Object.freeze([
  "row_id", "block_id", "tile", "window", "role", "s1_date", "s1_datetime", "s1_products",
  "orbit_direction", "relative_orbit", "s1_valid_frac",
  "vv_db", "vh_db", "vh_minus_vv_db", "inc_angle", "orbit_asc", "vh_db_prev1", "vh_db_prev2",
  "dvh_1", "vh_db_min_60d", "days_since_vh_min_60d", "doy", "doy_sin", "doy_cos",
]);

export const FEATURE_SETS = Object.freeze({
  F0: ["vv_db", "vh_db", "vh_minus_vv_db", "inc_angle", "orbit_asc"],
  F1: ["vh_db_prev1", "vh_db_prev2", "dvh_1", "vh_db_min_60d", "days_since_vh_min_60d"],
  F2: ["doy_sin", "doy_cos"],
});

export const toCsv = (rows, columns) => {
  const cell = (value) => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [columns.join(","), ...rows.map((row) => columns.map((column) => cell(row[column])).join(","))].join("\n") + "\n";
};
