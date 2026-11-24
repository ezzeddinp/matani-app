import assert from "node:assert/strict";
import test from "node:test";

import {
  gapEstimates,
  heldOutFor,
  inYear,
  timelineYears,
  toEstimatePoints,
} from "../utils/estimate-timeline.ts";

const record = (overrides) => ({
  id: "e1",
  target_date: "2021-03-10",
  ndvi_estimate: 0.42,
  status: "estimated",
  radar_acquired_at: "2021-03-09T22:40:00Z",
  orbit_direction: "DESCENDING",
  offset_days: 0,
  model_name: "random_forest",
  model_version: "rf-v1",
  feature_set: "F0+F1",
  evaluation_role: "applied",
  reference_ndvi: null,
  model_test_mae: 0.07,
  ...overrides,
});

test("only valid estimated rows become points; a zero NDVI stays a value", () => {
  const points = toEstimatePoints([
    record({ id: "zero", ndvi_estimate: "0" }),
    record({ id: "unavailable", status: "unavailable", ndvi_estimate: null }),
    record({ id: "bad-role", evaluation_role: "other" }),
    record({ id: "bad-date", target_date: "not-a-date" }),
  ]);
  assert.deepEqual(points.map((point) => [point.id, point.ndvi]), [["zero", 0]]);
});

const NO_GAP_RULE = { bracketed: 0, open: 0 };
const ids = (points) => points.map((point) => point.id);
const at = (id, target_date) => toEstimatePoints([record({ id, target_date })]);
const obs = (...days) => days.map((day) => ({ timestamp: `${day}T02:50:00Z`, ndvi: 0.5 }));

test("measurements win: applied estimates within 3 days of a measured value are hidden", () => {
  const estimates = toEstimatePoints([
    record({ id: "near", target_date: "2021-03-10" }),
    record({ id: "gap", target_date: "2021-04-20" }),
    record({ id: "blind", target_date: "2021-04-25", evaluation_role: "held_out_test", reference_ndvi: 0.6 }),
  ]);
  const measured = [
    { timestamp: "2021-03-12T02:50:00Z", ndvi: 0.4 },
    { timestamp: "2021-04-19T02:50:00Z", ndvi: null }, // rejected date does not suppress
  ];
  assert.deepEqual(ids(gapEstimates(estimates, measured, NO_GAP_RULE)), ["gap"]); // gap rules off
});

test("two rules: bracketed gaps need 80 days (vs interpolation), open-ended gaps 20 days (vs persistence)", () => {
  const estimates = toEstimatePoints([
    record({ id: "short-gap", target_date: "2021-02-15" }), // inside a 30-day interval
    record({ id: "long-gap", target_date: "2021-05-01" }), // inside a 100-day interval
    record({ id: "leading-near", target_date: "2021-01-20" }), // 11 days before the first observation
    record({ id: "leading-far", target_date: "2021-01-01" }), // 30 days before the first observation
    record({ id: "trailing-near", target_date: "2021-07-20" }), // 10 days after the last observation
    record({ id: "trailing-far", target_date: "2021-08-05" }), // 26 days after the last observation
  ]);
  const measured = [
    { timestamp: "2021-03-02T02:50:00Z", ndvi: 0.3 },
    { timestamp: "2021-01-31T02:50:00Z", ndvi: 0.2 },
    { timestamp: "2021-04-01T02:50:00Z", ndvi: null }, // rejected date is not an observation
    { timestamp: "2021-06-10T02:50:00Z", ndvi: 0.7 },
    { timestamp: "2021-07-10T02:50:00Z", ndvi: 0.6 },
  ];
  assert.deepEqual(ids(gapEstimates(estimates, measured)), ["long-gap", "leading-far", "trailing-far"]);
  assert.equal(gapEstimates(estimates, measured, NO_GAP_RULE).length, 6);
});

test("bracketed rule: 80 days is shown, 79 is not, however far the estimate is from both sides", () => {
  assert.deepEqual(ids(gapEstimates(at("mid", "2021-02-10"), obs("2021-01-01", "2021-03-21"))), []); // 79 days
  assert.deepEqual(ids(gapEstimates(at("mid", "2021-02-10"), obs("2021-01-01", "2021-03-22"))), ["mid"]); // 80 days
});

test("open rule: 20 days from the nearest observation is shown, 19 is not", () => {
  assert.deepEqual(ids(gapEstimates(at("after", "2021-05-21"), obs("2021-05-01"))), ["after"]); // 20 days after
  assert.deepEqual(ids(gapEstimates(at("after", "2021-05-20"), obs("2021-05-01"))), []); // 19 days after
  assert.deepEqual(ids(gapEstimates(at("before", "2021-04-11"), obs("2021-05-01"))), ["before"]); // 20 days before
  assert.deepEqual(ids(gapEstimates(at("before", "2021-04-12"), obs("2021-05-01"))), []); // 19 days before
});

test("no established optical interval means no estimate (review N25)", () => {
  const estimates = at("alone", "2021-05-01");
  assert.deepEqual(ids(gapEstimates(estimates, [])), []);
  assert.deepEqual(ids(gapEstimates(estimates, [{ timestamp: "2021-01-01T02:50:00Z", ndvi: null }])), []);
});

test("the 3-day and gap rules use UTC calendar days, like the importer (review N27)", () => {
  const measured = obs("2020-10-20", "2021-01-13"); // an 85-day bracketed gap; 02:50 UTC acquisitions
  // 10 Jan is exactly 3 calendar days before 13 Jan: the measurement wins, as in the importer
  assert.deepEqual(ids(gapEstimates(at("tenth", "2021-01-10"), measured)), []);
  assert.deepEqual(ids(gapEstimates(at("ninth", "2021-01-09"), measured)), ["ninth"]); // 4 days away
});

test("held-out estimate is found for the measured observation on the same UTC date", () => {
  const estimates = toEstimatePoints([record({ id: "blind", target_date: "2021-04-25", evaluation_role: "held_out_test", reference_ndvi: 0.6 })]);
  assert.equal(heldOutFor(estimates, "2021-04-25T02:50:00Z")?.id, "blind");
  assert.equal(heldOutFor(estimates, "2021-04-26T02:50:00Z"), null);
});

test("years are listed once and filtering keeps only that year", () => {
  const items = [{ timestamp: "2021-01-05T00:00:00Z" }, { timestamp: "2026-08-01T00:00:00Z" }, { timestamp: "2021-12-31T23:00:00Z" }];
  assert.deepEqual(timelineYears(items), [2021, 2026]);
  assert.equal(inYear(items, 2021).length, 2);
  assert.equal(inYear(items, null).length, 3);
});
