import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPreflightReport,
  buildCatalogRequest,
  buildProcessProvenanceRequest,
  buildStatisticalRequest,
  executeCatalogRequest,
  executeProcessProvenanceRequest,
  executeStatisticalRequestWithRetry,
  geometryHash,
  projectGeometryToLocalUtm,
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
  const quality = buildStatisticalRequest({ ...common, output: "quality" });
  const catalog = buildCatalogRequest(common);
  assert.notDeepEqual(ndvi.input.bounds.geometry, smallField);
  assert.equal(
    ndvi.input.bounds.properties.crs,
    "http://www.opengis.net/def/crs/EPSG/0/32748",
  );
  assert.ok(ndvi.input.bounds.geometry.coordinates[0][0][0] > 100_000);
  assert.ok(ndvi.input.bounds.geometry.coordinates[0][0][1] > 9_000_000);
  assert.equal("bbox" in ndvi.input.bounds, false);
  assert.equal(ndvi.aggregation.resx, 10);
  assert.equal(ndmi.aggregation.resx, 20);
  assert.match(ndvi.aggregation.evalscript, /\[0,1,3,8,9,10\]/);
  assert.match(ndvi.aggregation.evalscript, /denominator !== 0/);
  assert.match(
    ndvi.aggregation.evalscript,
    /bands: \["ndvi", "coverage"\]/,
  );
  assert.doesNotMatch(ndvi.aggregation.evalscript, /SCL.*6/);
  assert.match(
    quality.aggregation.evalscript,
    /bands: \["cloudShadow", "invalid"\]/,
  );
  assert.match(
    quality.aggregation.evalscript,
    /return \{ quality: \[cloudShadow, invalid\], dataMask: \[sample\.dataMask\] \}/,
  );
  assert.deepEqual(catalog.intersects, smallField);
  assert.deepEqual(catalog.collections, ["sentinel-2-l2a"]);
  assert.equal(catalog.limit, 100);
});

test("CDSE catalog rejects an incomplete paginated provenance page", async () => {
  await assert.rejects(
    () =>
      executeCatalogRequest({
        token: "test-token",
        request: {},
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              features: [],
              links: [{ rel: "next", href: "https://example.invalid/next" }],
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          ),
      }),
    /catalog-result-exceeds-bounded-100-item-page/,
  );
});

test("CDSE catalog requests its current GeoJSON response media type", async () => {
  let receivedHeaders;

  await executeCatalogRequest({
    token: "test-token",
    request: {},
    fetchImpl: async (_url, options) => {
      receivedHeaders = options.headers;
      return new Response(JSON.stringify({ features: [], links: [] }), {
        status: 200,
        headers: { "content-type": "application/geo+json" },
      });
    },
  });

  assert.equal(receivedHeaders.Accept, "application/geo+json");
  assert.equal(receivedHeaders["Content-Type"], "application/json");
});

test("CDSE Process provenance request keeps the exact projected polygon and returns JSON metadata", async () => {
  const request = buildProcessProvenanceRequest({
    geometry: smallField,
    from: "2025-07-22T00:00:00.000Z",
    to: "2025-07-23T00:00:00.000Z",
  });
  let receivedOptions;

  const result = await executeProcessProvenanceRequest({
    token: "test-token",
    request,
    fetchImpl: async (_url, options) => {
      receivedOptions = options;
      return new Response(
        JSON.stringify({
          serviceVersion: "test-version",
          orbits: [
            {
              tiles: [
                {
                  date: "2025-07-22T03:20:04Z",
                  shId: 123,
                  dataPath: "test-provider-path",
                },
              ],
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "x-processingunits-spent": "0.01",
          },
        },
      );
    },
  });

  assert.equal(
    request.input.bounds.properties.crs,
    "http://www.opengis.net/def/crs/EPSG/0/32748",
  );
  assert.deepEqual(
    request.input.bounds.geometry,
    projectGeometryToLocalUtm(smallField).geometry,
  );
  assert.equal(request.input.data[0].dataFilter.mosaickingOrder, "mostRecent");
  assert.match(request.evalscript, /mosaicking: Mosaicking\.ORBIT/);
  assert.equal(request.output.responses[0].identifier, "userdata");
  assert.equal(receivedOptions.headers.Accept, "application/json");
  assert.equal(result.body.orbits[0].tiles[0].shId, 123);
  assert.equal(result.processingUnits, 0.01);
});

test("CDSE statistics retry is bounded and counts rate-limit attempts", async () => {
  let calls = 0;
  const result = await executeStatisticalRequestWithRetry({
    token: "test-token",
    request: {},
    fetchImpl: async () => {
      calls += 1;
      return new Response(
        calls < 3
          ? JSON.stringify({ error: { code: "RATE_LIMIT_EXCEEDED" } })
          : JSON.stringify({ data: [] }),
        {
          status: calls < 3 ? 429 : 200,
          headers: { "content-type": "application/json" },
        },
      );
    },
    sleepImpl: async () => {},
  });
  assert.equal(calls, 3);
  assert.equal(result.attempts, 3);
});

test("WGS84 polygon is projected to a closed local UTM metric grid", () => {
  const projected = projectGeometryToLocalUtm(smallField);
  assert.equal(projected.epsg, 32748);
  assert.equal(projected.zone, 48);
  assert.equal(projected.hemisphere, "south");
  assert.deepEqual(
    projected.geometry.coordinates[0][0],
    projected.geometry.coordinates[0].at(-1),
  );
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
      validatePilotGeometry({
        type: "Polygon",
        coordinates: [
          [
            [106.81, -6.16],
            [106.82, -6.16],
            [106.83, -6.16],
            [106.81, -6.16],
          ],
        ],
      }),
    /polygon-is-degenerate/,
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
  const item = (output, stats, coverageStats, geometryPixelCount) => ({
    interval: {
      from: "2026-06-04T00:00:00Z",
      to: "2026-06-05T00:00:00Z",
    },
    outputs: {
      [output]: { bands: { B0: { stats } } },
      coverage: { bands: { B0: { stats: coverageStats } } },
    },
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
          { sampleCount: 20, noDataCount: 2 },
          18,
        ),
      ],
    },
    ndmiResponse: {
      data: [
        item(
          "ndmi",
          { min: -0.1, max: 0.4, mean: 0.2, stDev: 0.1, sampleCount: 6, noDataCount: 2 },
          { sampleCount: 6, noDataCount: 1 },
          5,
        ),
      ],
    },
    catalogResponse: {
      features: [
        {
          id: "S2B_MSIL2A_FIXTURE_PRODUCT",
          properties: { datetime: "2026-06-04T03:21:00Z" },
        },
      ],
    },
    quota: { requests: 4 },
  });
  const observation = report.observations[0];
  assert.equal(observation.ndvi_stats.valid_pixel_count, 17);
  assert.equal(observation.ndmi_stats.valid_pixel_count, 4);
  assert.equal(observation.ndvi_source_pixel_count, 18);
  assert.equal(observation.ndmi_source_pixel_count, 5);
  assert.equal(observation.ndvi_valid_pixel_fraction, 17 / 18);
  assert.equal(observation.ndmi_valid_pixel_fraction, 4 / 5);
  assert.equal(observation.quality_decision, "not-evaluated-hyp-03");
  assert.deepEqual(observation.source_product_candidates, [
    {
      id: "S2B_MSIL2A_FIXTURE_PRODUCT",
      acquired_at: "2026-06-04T03:21:00Z",
    },
  ]);
  assert.equal(report.requests, 4);
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
