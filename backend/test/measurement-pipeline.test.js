import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProcessRequest,
  createCdseProcessAdapter,
  extractSourceIdentity,
} from "../measurement/cdse-process-adapter.js";
import { geometryHash } from "../measurement/geometry.js";
import { parseMultipartBuffer } from "../measurement/multipart.js";
import { decideQuality, summarizeIndexBands } from "../measurement/statistics.js";
import { createSupabaseMeasurementAdmin } from "../measurement/supabase-admin.js";
import { createMeasurementWorker } from "../measurement/worker.js";

const polygon = {
  type: "Polygon",
  coordinates: [
    [
      [106.648982, -6.0812361],
      [106.6492133, -6.0812714],
      [106.6494728, -6.0813768],
      [106.649396, -6.0816535],
      [106.6490319, -6.0815328],
      [106.649041, -6.0814058],
      [106.648982, -6.0812361],
    ],
  ],
};

const multipartResponse = (rasterLabel, userdata) => {
  const boundary = "matani-fixture-boundary";
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: image/tiff\r\nContent-Disposition: attachment; filename="${rasterLabel}.tif"\r\n\r\n`),
    Buffer.from(rasterLabel),
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: application/json\r\nContent-Disposition: attachment; filename="userdata.json"\r\n\r\n`),
    Buffer.from(JSON.stringify(userdata)),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": `multipart/mixed; boundary=${boundary}`,
      "x-processingunits-spent": "0.01",
    },
  });
};

test("geometry hash is canonical across ring direction and native grids stay explicit", () => {
  const reversed = {
    type: "Polygon",
    coordinates: [[...polygon.coordinates[0].slice(0, -1)].reverse()],
  };
  reversed.coordinates[0].push(reversed.coordinates[0][0]);
  assert.equal(geometryHash(polygon), geometryHash(reversed));

  const ndvi = buildProcessRequest({
    geometry: polygon,
    from: "2026-08-01T00:00:00.000Z",
    to: "2026-08-02T00:00:00.000Z",
    indexName: "ndvi",
  });
  const ndmi = buildProcessRequest({
    geometry: polygon,
    from: "2026-08-01T00:00:00.000Z",
    to: "2026-08-02T00:00:00.000Z",
    indexName: "ndmi",
  });
  assert.equal(ndvi.output.resx, 10);
  assert.equal(ndmi.output.resx, 20);
  assert.equal(ndvi.input.bounds.geometry.type, "Polygon");
  assert.equal(ndvi.input.bounds.properties.crs.endsWith("/32748"), true);
  assert.match(ndvi.evalscript, /\[0,1,3,8,9,10\]/);
  assert.doesNotMatch(ndvi.evalscript, /\[0,1,3,6,8,9,10\]/);
});

test("multipart parser preserves binary raster bytes and userdata", () => {
  const response = multipartResponse("raster-binary", { serviceVersion: "fixture" });
  const contentType = response.headers.get("content-type");
  return response.arrayBuffer().then((body) => {
    const parts = parseMultipartBuffer(Buffer.from(body), contentType);
    assert.equal(parts.length, 2);
    assert.equal(parts[0].body.toString(), "raster-binary");
    assert.deepEqual(JSON.parse(parts[1].body.toString()), {
      serviceVersion: "fixture",
    });
  });
});

test("pixel accounting applies the advisor-approved provisional 9/3 floors", () => {
  const ndvi = summarizeIndexBands([
    new Float32Array(10).fill(0.6),
    new Float32Array(10).fill(1),
    new Float32Array(10).fill(1),
  ]);
  const ndmi = summarizeIndexBands(
    [
      new Float32Array([0.1, 0.2, 0.3, 0.4]),
      new Float32Array([1, 1, 1, 0]),
      new Float32Array([1, 1, 1, 1]),
      new Float32Array([0, 1, 0, 0]),
    ],
    { includeCloudBand: true },
  );
  assert.deepEqual(decideQuality({ ndvi, ndmi }), { status: "passed", reason: null });
  assert.equal(ndmi.validPixelCount, 3);
  assert.equal(ndmi.cloudShadowFraction, 0.25);
  assert.deepEqual(
    decideQuality({ ndvi: { ...ndvi, validPixelCount: 8 }, ndmi }),
    { status: "rejected", reason: "too-few-valid-pixels" },
  );
});

test("CDSE adapter persists only matched same-source native-grid results", async () => {
  const userdata = {
    serviceVersion: "fixture-service-v1",
    orbits: [
      {
        dateFrom: "2026-08-25T03:00:00Z",
        dateTo: "2026-08-25T03:01:00Z",
        tiles: [
          {
            date: "2026-08-25T03:00:00Z",
            shId: "fixture-scene",
            dataPath: "s3://fixture/S2A_FIXTURE.SAFE/GRANULE/x",
          },
        ],
      },
    ],
  };
  const calls = [];
  const adapter = createCdseProcessAdapter({
    catalogUrl: "https://catalog.test/search",
    processUrl: "https://process.test/v1",
    getToken: async () => "fixture-token",
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      if (String(url).includes("catalog")) {
        return new Response(
          JSON.stringify({
            features: [
              {
                id: "catalog-candidate",
                properties: {
                  datetime: "2026-08-25T03:00:00Z",
                  platform: "sentinel-2a",
                  "eo:cloud_cover": 12,
                },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/geo+json" } },
        );
      }
      const request = JSON.parse(options.body);
      const indexName = request.output.responses[0].identifier;
      return multipartResponse(indexName, userdata);
    },
    decodeRaster: async (buffer) =>
      buffer.toString() === "ndvi"
        ? [
            new Float32Array(10).fill(0.55),
            new Float32Array(10).fill(1),
            new Float32Array(10).fill(1),
          ]
        : [
            new Float32Array([0.2, 0.25, 0.3, 0.35]),
            new Float32Array([1, 1, 1, 0]),
            new Float32Array([1, 1, 1, 1]),
            new Float32Array([0, 0, 1, 0]),
          ],
    now: () => new Date("2026-08-30T00:00:00Z"),
  });

  const result = await adapter.measure({
    geometry: polygon,
    from: "2026-08-01T00:00:00Z",
    to: "2026-08-30T00:00:00Z",
  });
  assert.equal(calls.length, 3);
  assert.equal(result.quality_status, "passed");
  assert.deepEqual(result.source_product_ids, ["S2A_FIXTURE.SAFE"]);
  assert.equal(result.index_stats[0].valid_pixel_count, 10);
  assert.equal(result.index_stats[1].valid_pixel_count, 3);
  assert.equal(result.provider_provenance.source_identity_match, true);
  assert.deepEqual(extractSourceIdentity(userdata).sceneIds, ["fixture-scene"]);
});

test("worker reuses an already completed idempotent job without provider spend", async () => {
  let providerCalls = 0;
  const admin = {
    async loadField() {
      return { geojson: polygon };
    },
    async enqueue() {
      return { id: "job-1" };
    },
    async claim(args) {
      assert.deepEqual(args, { jobId: "job-1", userId: "user-1" });
      return { claimed: false, job: { id: "job-1", status: "succeeded" } };
    },
  };
  const worker = createMeasurementWorker({
    admin,
    provider: {
      async measure() {
        providerCalls += 1;
      },
    },
  });
  const result = await worker.request({
    lahanId: "field-1",
    userId: "user-1",
    from: "2026-08-01T00:00:00Z",
    to: "2026-08-30T00:00:00Z",
  });
  assert.equal(result.reused, true);
  assert.equal(result.status, "succeeded");
  assert.equal(providerCalls, 0);
});

test("Supabase admin supports current secret keys without sending them as bearer JWTs", async () => {
  const calls = [];
  const admin = createSupabaseMeasurementAdmin({
    supabaseUrl: "https://project.test",
    adminKey: "sb_secret_fixture",
    fetchImpl: async (_url, options) => {
      calls.push(options);
      return new Response("[]", { status: 200 });
    },
  });
  await admin.loadField({ lahanId: "field", userId: "user" }).catch(() => {});
  assert.equal(calls[0].headers.get("apikey"), "sb_secret_fixture");
  assert.equal(calls[0].headers.has("authorization"), false);
});

test("Supabase admin keeps bearer authorization for a legacy service-role JWT", async () => {
  const calls = [];
  const admin = createSupabaseMeasurementAdmin({
    supabaseUrl: "https://project.test",
    adminKey: "eyJ.fixture.service-role",
    fetchImpl: async (_url, options) => {
      calls.push(options);
      return new Response("[]", { status: 200 });
    },
  });
  await admin.loadField({ lahanId: "field", userId: "user" }).catch(() => {});
  assert.equal(
    calls[0].headers.get("authorization"),
    "Bearer eyJ.fixture.service-role",
  );
});
