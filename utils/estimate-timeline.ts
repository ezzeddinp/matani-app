// Radar-based NDVI estimates (table public.ndvi_estimates) next to measured observations.
// Invariant: estimates never replace or alter a measured value.

export type EstimateRecord = {
  id: string;
  target_date: string;
  ndvi_estimate: number | string | null;
  status: string | null;
  radar_acquired_at: string | null;
  orbit_direction: string | null;
  offset_days: number | string | null;
  model_name: string | null;
  model_version: string | null;
  feature_set: string | null;
  evaluation_role: string | null;
  reference_ndvi: number | string | null;
  model_test_mae: number | string | null;
};

export type EstimatePoint = {
  id: string;
  timestamp: string;
  ndvi: number;
  role: "held_out_test" | "applied";
  radarAcquiredAt: string | null;
  orbitDirection: "ASCENDING" | "DESCENDING" | null;
  modelName: string;
  modelVersion: string;
  featureSet: string | null;
  referenceNdvi: number | null;
  modelTestMae: number | null;
};

type Dated = { timestamp: string };
type MeasuredLike = Dated & { ndvi: number | null };

const DAY_MS = 86_400_000;
export const MEASUREMENT_WINS_DAYS = 3;

const toNumber = (value: unknown) => {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
};

export const toEstimatePoints = (records: EstimateRecord[]): EstimatePoint[] =>
  records.flatMap((record) => {
    const ndvi = toNumber(record.ndvi_estimate);
    const timestamp = `${record.target_date}T00:00:00Z`;
    const role = record.evaluation_role;
    if (record.status !== "estimated" || ndvi === null || Number.isNaN(Date.parse(timestamp))) return [];
    if (role !== "held_out_test" && role !== "applied") return [];
    const orbit = record.orbit_direction;
    return [{
      id: record.id,
      timestamp,
      ndvi,
      role,
      radarAcquiredAt: record.radar_acquired_at,
      orbitDirection: orbit === "ASCENDING" || orbit === "DESCENDING" ? orbit : null,
      modelName: record.model_name ?? "model",
      modelVersion: record.model_version ?? "",
      featureSet: record.feature_set,
      referenceNdvi: toNumber(record.reference_ndvi),
      modelTestMae: toNumber(record.model_test_mae),
    }];
  });

const utcDate = (timestamp: string) => new Date(timestamp).toISOString().slice(0, 10);

// Provisional display cutoffs from the region-held-out gap comparisons (paper IV-C and Table IV, DEC-62/63). The
// chart draws no baseline; these only decide whether an estimate is shown.
// - bracketed gap (a qualifying observation on both sides): versus interpolation, no difference was detected only
//   beyond 60 days, and the exploratory crossover was about 80 days;
// - trailing gap (after the last observation): versus persistence, the crossover was about 20 days;
// - leading gap (before the first observation): versus the next observation carried backward, radar was worse up
//   to 20 days and better only beyond 30 (crossover 26 days), so this side waits 30 days.
export const MIN_BRACKETED_GAP_DAYS = 80;
export const MIN_TRAILING_GAP_DAYS = 20;
export const MIN_LEADING_GAP_DAYS = 30;
export type GapRules = { bracketed: number; leading: number; trailing: number };
export const DISPLAY_RULES: GapRules = {
  bracketed: MIN_BRACKETED_GAP_DAYS,
  leading: MIN_LEADING_GAP_DAYS,
  trailing: MIN_TRAILING_GAP_DAYS,
};

// The 3-day and gap rules count whole UTC calendar days, the same convention as the importer
// (research/lib/ndvi-estimate-import.mjs), so import and display agree at the 3-day boundary.
const utcDay = (timestamp: string) => Math.floor(Date.parse(timestamp) / DAY_MS);

// Whether the optical gap an estimate sits in is long enough. With no measured value there is no established
// interval, so nothing is shown.
const longEnough = (day: number, measuredDays: number[], rules: GapRules) => {
  const before = Math.max(...measuredDays.filter((m) => m <= day));
  const after = Math.min(...measuredDays.filter((m) => m >= day));
  if (!Number.isFinite(before) && !Number.isFinite(after)) return false;
  if (!Number.isFinite(before)) return after - day >= rules.leading;
  if (!Number.isFinite(after)) return day - before >= rules.trailing;
  return after - before >= rules.bracketed;
};

// Gap-filling estimates to draw: applied role only, never within MEASUREMENT_WINS_DAYS of a
// measured NDVI value, and only inside optical gaps that meet the display rules.
export const gapEstimates = (estimates: EstimatePoint[], measured: MeasuredLike[], rules: GapRules = DISPLAY_RULES) => {
  const measuredDays = measured.filter((point) => point.ndvi !== null).map((point) => utcDay(point.timestamp));
  return estimates.filter((estimate) => {
    if (estimate.role !== "applied") return false;
    const day = utcDay(estimate.timestamp);
    if (measuredDays.some((m) => Math.abs(m - day) <= MEASUREMENT_WINS_DAYS)) return false;
    return longEnough(day, measuredDays, rules);
  });
};

// Empirical 80% range of (optical reference − estimate), by estimate value, over the 792 region-held-out rows of
// the run the app shows (research/scripts/revision_analyses.py, analyses.json "uncertainty"). When each region's
// range came from the other two regions, it held 76% of that region's references. A run without a measured range
// gets none, so a range is never shown for a model it was not measured on.
type RangeBin = { upTo: number; q10: number; q90: number };
const RANGE_BY_RUN: Record<string, RangeBin[]> = {
  "random_forest F0+F1 2026.09": [
    { upTo: 0.3, q10: -0.517, q90: 0.231 },
    { upTo: 0.5, q10: -0.183, q90: 0.229 },
    { upTo: 0.7, q10: -0.245, q90: 0.238 },
    { upTo: Infinity, q10: -0.21, q90: 0.13 },
  ],
};

export const estimateRange = (point: EstimatePoint) => {
  const bins = RANGE_BY_RUN[`${point.modelName} ${point.featureSet} ${point.modelVersion}`];
  const bin = bins?.find((candidate) => point.ndvi <= candidate.upTo);
  if (!bin) return null;
  const clamp = (value: number) => Math.min(1, Math.max(-1, value));
  return { low: clamp(point.ndvi + bin.q10), high: clamp(point.ndvi + bin.q90) };
};

// Blind (held-out) estimate for a measured observation on the same UTC date, if any.
export const heldOutFor = (estimates: EstimatePoint[], observationTimestamp: string) => {
  const date = utcDate(observationTimestamp);
  return estimates.find((estimate) => estimate.role === "held_out_test" && utcDate(estimate.timestamp) === date) ?? null;
};

export const timelineYears = (items: Dated[]) =>
  [...new Set(items.map((item) => new Date(item.timestamp).getUTCFullYear()).filter(Number.isFinite))].sort((a, b) => a - b);

export const inYear = <T extends Dated>(items: T[], year: number | null) =>
  year === null ? items : items.filter((item) => new Date(item.timestamp).getUTCFullYear() === year);

export const MODEL_LABEL: Record<string, string> = {
  random_forest: "Random Forest",
  xgboost: "XGBoost",
};
