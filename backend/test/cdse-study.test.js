import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCalendarMonthWindows,
  buildStudyArtifact,
} from "../../research/lib/cdse-study.mjs";

test("availability study splits exactly 12 calendar months into bounded windows", () => {
  const windows = buildCalendarMonthWindows(
    "2025-07-01T00:00:00.000Z",
    "2026-07-01T00:00:00.000Z",
  );
  assert.equal(windows.length, 12);
  assert.deepEqual(windows[0], {
    from: "2025-07-01T00:00:00.000Z",
    to: "2025-08-01T00:00:00.000Z",
  });
  assert.ok(
    windows.every(
      (window) =>
        (new Date(window.to) - new Date(window.from)) / 86_400_000 <= 31,
    ),
  );
  assert.throws(
    () =>
      buildCalendarMonthWindows(
        "2025-07-15T00:00:00Z",
        "2026-07-15T00:00:00Z",
      ),
    /utc-month-boundaries/,
  );
});

test("provider-backed study withholds cadence and measured claims", () => {
  const windows = buildCalendarMonthWindows(
    "2025-07-01T00:00:00.000Z",
    "2026-07-01T00:00:00.000Z",
  );
  const report = {
    field: {
      field_reference_hash: "field-a",
      area_ha: 0.1,
    },
    provider: "CDSE Sentinel Hub Statistical API",
    collection: "sentinel-2-l2a",
    crs: { processing_grid: "EPSG:32748" },
    resolutions: { ndvi_metres: 10, ndmi_metres: 20 },
    resampling: { method: "NEAREST" },
    versions: { algorithm: "test" },
    window: windows[0],
    quota: { requests: 3, processing_units_total: 0.14 },
    observations: [
      {
        acquisition_interval: {
          from: "2025-07-04T00:00:00Z",
          to: "2025-07-05T00:00:00Z",
        },
        polygon_cloud_shadow_fraction: 0,
        ndvi_stats: { valid_pixel_count: 15 },
        ndmi_stats: { valid_pixel_count: 2 },
      },
    ],
  };
  const artifact = buildStudyArtifact({
    identity: "study",
    from: windows[0].from,
    to: windows.at(-1).to,
    windows,
    fieldCount: 1,
    monthlyReports: [report],
  });
  assert.equal(artifact.data_state, "prototype");
  assert.equal(artifact.claim_allowed, false);
  assert.equal(artifact.cadence_status, "withheld");
  assert.equal(
    artifact.fields[0].quality_adjudication,
    "withheld-no-validated-reliability-floor",
  );
});
