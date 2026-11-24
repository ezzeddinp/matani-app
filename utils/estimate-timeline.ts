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

// Provisional display cutoffs, rounded from the fitted crossovers of the region-held-out gap comparison (paper IV-C,
// DEC-62). The chart draws no baseline; these only decide whether an estimate is shown.
// - bracketed gap (a qualifying observation on both sides): versus interpolation, no difference was detected only
//   beyond 60 days, and the exploratory crossover was about 80 days;
// - open gap (after the last observation): versus persistence, the fitted crossover was about 20 days. Before the
//   first observation the same cutoff is applied by symmetry, a case not evaluated separately.
export const MIN_BRACKETED_GAP_DAYS = 80;
export const MIN_OPEN_GAP_DAYS = 20;
export type GapRules = { bracketed: number; open: number };
export const DISPLAY_RULES: GapRules = { bracketed: MIN_BRACKETED_GAP_DAYS, open: MIN_OPEN_GAP_DAYS };

// Both rules count whole UTC calendar days, the same convention as the importer
// (research/lib/ndvi-estimate-import.mjs), so import and display agree at the 3-day boundary.
const utcDay = (timestamp: string) => Math.floor(Date.parse(timestamp) / DAY_MS);

// Whether the optical gap an estimate sits in is long enough. With no measured value there is no established
// interval, so nothing is shown.
const longEnough = (day: number, measuredDays: number[], rules: GapRules) => {
  const before = Math.max(...measuredDays.filter((m) => m <= day));
  const after = Math.min(...measuredDays.filter((m) => m >= day));
  if (!Number.isFinite(before) && !Number.isFinite(after)) return false;
  if (!Number.isFinite(before)) return after - day >= rules.open;
  if (!Number.isFinite(after)) return day - before >= rules.open;
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
