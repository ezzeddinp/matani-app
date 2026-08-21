import assert from "node:assert/strict";
import test from "node:test";
import express from "express";

import { createNdviRouter } from "../api/ndvi/utils.js";
import { createWeatherRouter } from "../api/weather/route.js";

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  async json() {
    return body;
  },
  async text() {
    return JSON.stringify(body);
  },
});

const silentLogger = {
  info() {},
  warn() {},
  error() {},
};

const withRouter = async (mountPath, router, callback) => {
  const app = express();
  app.use(mountPath, router);
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  const address = server.address();
  try {
    await callback(`http://127.0.0.1:${address.port}${mountPath}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
};

test("weather route maps Open-Meteo without a live request", async () => {
  const requestedUrls = [];
  const router = createWeatherRouter({
    openMeteoBase: "https://weather.test/v1",
    logger: silentLogger,
    fetchImpl: async (url) => {
      requestedUrls.push(String(url));
      return jsonResponse({
        current: {
          temperature_2m: "29.5",
          relative_humidity_2m: 80,
          precipitation: 1.2,
          pressure_msl: 1008,
          wind_speed_10m: 5.5,
          weather_code: 61,
        },
        daily: {
          time: ["2026-08-21"],
          temperature_2m_max: [31],
          temperature_2m_min: [24],
          precipitation_sum: [4.2],
          weather_code: [80],
        },
      });
    },
  });

  await withRouter("/weather", router, async (url) => {
    const response = await fetch(`${url}?lat=-6.2&lon=106.8`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.temperature, 29.5);
    assert.equal(payload.dailyForecasts[0].precipitationMm, 4.2);
    assert.equal(payload.iconCode, 61);
    assert.equal(payload.dailyForecasts[0].iconCode, 80);
    assert.equal(payload.location, "Lokasi koordinat");
  });

  assert.equal(requestedUrls.length, 1);
  assert.match(requestedUrls[0], /^https:\/\/weather\.test\/v1\/forecast\?/);
});

test("weather route returns a sanitized provider failure", async () => {
  const router = createWeatherRouter({
    logger: silentLogger,
    fetchImpl: async () => jsonResponse({ secret: "provider detail" }, 503),
  });

  await withRouter("/weather", router, async (url) => {
    const response = await fetch(`${url}?lat=-6.2&lon=106.8`);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      error: "weather_provider_unavailable",
    });
  });
});

test("NDVI route sends the audited prototype request contract", async () => {
  let capturedRequest = null;
  const router = createNdviRouter({
    statisticsUrl: "https://statistics.test/v1",
    getToken: async () => "test-token",
    logger: silentLogger,
    fetchImpl: async (url, options) => {
      capturedRequest = { url: String(url), options };
      return jsonResponse({
        data: [
          {
            interval: { from: "2025-09-02T00:00:00Z" },
            outputs: {
              ndvi: {
                bands: {
                  B0: { stats: { min: 0.1, max: 0.7, mean: 0.45678, stDev: 0.12 } },
                },
              },
              ndmi: {
                bands: {
                  B0: { stats: { min: -0.1, max: 0.4, mean: 0.23456, stDev: 0.08 } },
                },
              },
            },
          },
        ],
      });
    },
  });

  await withRouter("/ndvi", router, async (url) => {
    const response = await fetch(`${url}?bbox=106.7,-6.3,106.8,-6.2`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [
      {
        interval: "2025-09-02",
        ndvi_min: 0.1,
        ndvi_max: 0.7,
        ndvi_mean: 0.4568,
        ndvi_stdev: 0.12,
        ndmi_min: -0.1,
        ndmi_max: 0.4,
        ndmi_mean: 0.2346,
        ndmi_stdev: 0.08,
      },
    ]);
  });

  assert.equal(capturedRequest.url, "https://statistics.test/v1");
  assert.equal(capturedRequest.options.headers.Authorization, "Bearer test-token");
  const body = JSON.parse(capturedRequest.options.body);
  assert.deepEqual(body.input.bounds.bbox, [106.7, -6.3, 106.8, -6.2]);
  assert.equal(body.input.data[0].dataFilter.timeRange.from, "2025-09-01T00:00:00Z");
  assert.match(body.aggregation.evalscript, /B04/);
  assert.match(body.aggregation.evalscript, /B08/);
  assert.match(body.aggregation.evalscript, /B11/);
});

test("NDVI route reports an honest no-data response", async () => {
  const router = createNdviRouter({
    getToken: async () => "test-token",
    logger: silentLogger,
    fetchImpl: async () => jsonResponse({ data: [] }),
  });

  await withRouter("/ndvi", router, async (url) => {
    const response = await fetch(`${url}?bbox=106.7,-6.3,106.8,-6.2`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { error: "No data available" });
  });
});

test("NDVI route returns a sanitized upstream failure", async () => {
  const router = createNdviRouter({
    getToken: async () => "test-token",
    logger: silentLogger,
    fetchImpl: async () => jsonResponse({ secret: "provider detail" }, 401),
  });

  await withRouter("/ndvi", router, async (url) => {
    const response = await fetch(`${url}?bbox=106.7,-6.3,106.8,-6.2`);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      error: "satellite_provider_unavailable",
    });
  });
});
