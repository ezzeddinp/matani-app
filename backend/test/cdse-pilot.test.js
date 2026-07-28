import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPreflightReport,
  buildStatisticalRequest,
  geometryHash,
  summarizeResponses,
  validatePilotGeometry,
} from "../../research/lib/cdse-pilot.mjs";

const smallField = {
  type: "Polygon",
  coordinates: [
    [
      [106.6970214, -6.3165669],
      [106.6970961, -6.3167871],
      [106.6974689, -6.3168334],
      [106.6974653, -6.3166018],
      [106.6970214, -6.3165669],
    ],
  ],
};

test("pilot requests use exact polygon geometry and per-index native grids", () => {
  const common = {
    geometry: smallField,
    from: "2026-06-01T00:00:00Z",
    to: "2026-06-16T00:00:00Z",
  };
  const ndvi = buildStatisticalRequest({ ...common, output: "ndvi" });
  const ndmi = buildStatisticalRequest({ ...common, output: "ndmi" });
  assert.deepEqual(ndvi.input.bounds.geometry, smallField);
  assert.equal("bbox" in ndvi.input.bounds, false);
  assert.equal(ndvi.aggregation.resx, 10);
  assert.equal(ndmi.aggregation.resx, 20);
  assert.match(ndvi.aggregation.evalscript, /\[0,1,3,8,9,10\]/);
  assert.match(ndvi.aggregation.evalscript, /sample\.dataMask && !excluded/);
  assert.doesNotMatch(ndvi.aggregation.evalscript, /SCL.*6/);
});

test("pilot rejects self-intersecting geometry and windows over 31 days", () => {
  assert.throws(
    () =>
      validatePilotGeometry({
        type: "Polygon",
        coordinates: [
          [
            [106.81, -6.16],
            [106.82, -6.16],
            [106.81, -6.17],
            [106.82, -6.17],
            [106.81, -6.16],
          ],
        ],
      }),
    /polygon-self-intersects/,
  );
  assert.throws(
    () =>
      buildStatisticalRequest({
        geometry: smallField,
        from: "2026-01-01T00:00:00Z",
        to: "2026-03-01T00:00:00Z",
        output: "ndvi",
      }),
    /pilot-window-exceeds-31-days/,
  );
});

test("pilot geometry hash is stable across ring rotation and orientation", () => {
  const ring = smallField.coordinates[0].slice(0, -1);
  const rotated = [...ring.slice(2), ...ring.slice(0, 2)];
  rotated.push(rotated[0]);
  const reversed = [...ring].reverse();
  reversed.push(reversed[0]);
  assert.equal(
    geometryHash(smallField),
    geometryHash({ type: "Polygon", coordinates: [rotated] }),
  );
  assert.equal(
    geometryHash(smallField),
    geometryHash({ type: "Polygon", coordinates: [reversed] }),
  );
});

test("response summary keeps per-index counts separate and withholds passed status", () => {
  const item = (output, stats, geometryPixelCount) => ({
    interval: {
      from: "2026-06-04T00:00:00Z",
      to: "2026-06-05T00:00:00Z",
    },
    outputs: { [output]: { bands: { B0: { stats } } } },
    geometryPixelCount,
  });
  const report = summarizeResponses({
    field: {
      id: "field",
      name: "field",
      category: "padi",
      area_ha: 0.11,
      geometry: smallField,
    },
    from: "2026-06-01T00:00:00Z",
    to: "2026-06-16T00:00:00Z",
    qualityResponse: { data: [] },
    ndviResponse: {
      data: [
        item(
          "ndvi",
          { min: 0.1, max: 0.8, mean: 0.5, stDev: 0.1, sampleCount: 20, noDataCount: 3 },
          18,
        ),
      ],
    },
    ndmiResponse: {
      data: [
        item(
          "ndmi",
          { min: -0.1, max: 0.4, mean: 0.2, stDev: 0.1, sampleCount: 6, noDataCount: 2 },
          5,
        ),
      ],
    },
    quota: { requests: 3 },
  });
  const observation = report.observations[0];
  assert.equal(observation.ndvi_stats.valid_pixel_count, 17);
  assert.equal(observation.ndmi_stats.valid_pixel_count, 4);
  assert.equal(observation.quality_decision, "not-evaluated-hyp-03");
  assert.equal(report.data_state, "prototype");
});

test("preflight reports theoretical capacity without calling it valid pixels", () => {
  const report = buildPreflightReport({
    fields: [
      {
        id: "small",
        category: "padi",
        area_ha: 0.110930581010156,
        geometry: smallField,
      },
    ],
    from: "2026-06-01T00:00:00Z",
    to: "2026-06-16T00:00:00Z",
  });
  assert.equal(report.network_called, false);
  assert.equal(report.reports[0].request_contract.exact_polygon, true);
  assert.equal(report.reports[0].request_contract.bbox_substitution, false);
  assert.ok(
    report.reports[0].theoretical_unmasked_pixel_capacity.ndvi_10m > 11,
  );
  assert.ok(
    report.reports[0].theoretical_unmasked_pixel_capacity.ndmi_20m < 3,
  );
  assert.match(
    report.reports[0].theoretical_unmasked_pixel_capacity.interpretation,
    /not an observed or valid-pixel count/,
  );
});
