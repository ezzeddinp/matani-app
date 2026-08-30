import assert from "node:assert/strict";
import test from "node:test";
import express from "express";

import { createApp } from "../app.js";

const baseConfig = {
  supabaseUrl: "https://fixture.invalid",
  supabasePublishableKey: "fixture-key",
  corsAllowedOrigins: ["https://allowed.example"],
  rateLimitWindowMs: 60_000,
  rateLimitMax: 20,
  maxJsonBytes: 65_536,
  maxBboxAreaHa: 1_000,
  aiSummaryEnabled: false,
};

const fixtureAuth = async (token) => {
  if (token !== "valid-token") {
    const error = new Error("INVALID_ACCESS_TOKEN");
    error.statusCode = 401;
    throw error;
  }
  return { id: "00000000-0000-4000-8000-000000000001", role: "authenticated" };
};

const createRouters = ({ delayMs = 0 } = {}) => {
  const ndvi = express.Router();
  ndvi.get("/", async (_req, res) => {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    res.json({ source: "fixture" });
  });
  const weather = express.Router();
  weather.get("/", (_req, res) => res.json({ source: "fixture" }));
  const ai = express.Router();
  ai.post("/summary", (_req, res) => res.json({ source: "fixture" }));
  const measurements = express.Router();
  measurements.post("/request", (req, res) =>
    res.json({ source: "fixture", lahanId: req.body.lahanId })
  );
  return { ndvi, weather, ai, measurements };
};

const withServer = async (options, run) => {
  const app = createApp({
    config: { ...baseConfig, ...options?.config },
    verifyAccessToken: options?.verifyAccessToken ?? fixtureAuth,
    routers: options?.routers ?? createRouters(),
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`, app);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
};

test("health endpoint is public while provider routes require authentication", async () => {
  await withServer({}, async (baseUrl) => {
    const health = await fetch(`${baseUrl}/`);
    assert.equal(health.status, 200);
    const protectedResponse = await fetch(`${baseUrl}/weather?lat=-6.2&lon=106.8`);
    assert.equal(protectedResponse.status, 401);
    assert.deepEqual(await protectedResponse.json(), { error: "authentication_required" });
  });
});

test("invalid bearer token is rejected before the route", async () => {
  await withServer({}, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/weather?lat=-6.2&lon=106.8`, {
      headers: { Authorization: "Bearer invalid" },
    });
    assert.equal(response.status, 401);
  });
});

test("request schema and bbox area limits reject invalid provider requests", async () => {
  await withServer({}, async (baseUrl) => {
    const headers = { Authorization: "Bearer valid-token" };
    assert.equal((await fetch(`${baseUrl}/weather?lat=999&lon=106`, { headers })).status, 400);
    assert.equal((await fetch(`${baseUrl}/ndvi?bbox=invalid`, { headers })).status, 400);
    assert.equal((await fetch(`${baseUrl}/ndvi?bbox=100,-10,110,0`, { headers })).status, 413);
    assert.equal(
      (
        await fetch(`${baseUrl}/measurements/request`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ lahanId: "not-a-uuid" }),
        })
      ).status,
      400,
    );
  });
});

test("measurement requests are authenticated and admitted with a valid field id", async () => {
  await withServer({}, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/measurements/request`, {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lahanId: "00000000-0000-4000-8000-000000000002" }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      source: "fixture",
      lahanId: "00000000-0000-4000-8000-000000000002",
    });
  });
});

test("unapproved browser origins are rejected", async () => {
  await withServer({}, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`, {
      headers: { Origin: "https://denied.example" },
    });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "cors_origin_denied" });
  });
});

test("rate limits are enforced per authenticated user and endpoint", async () => {
  await withServer({ config: { rateLimitMax: 2 } }, async (baseUrl) => {
    const headers = { Authorization: "Bearer valid-token" };
    const url = `${baseUrl}/weather?lat=-6.2&lon=106.8`;
    assert.equal((await fetch(url, { headers })).status, 200);
    assert.equal((await fetch(url, { headers })).status, 200);
    assert.equal((await fetch(url, { headers })).status, 429);
  });
});

test("Gemini is disabled by default before its route can spend quota", async () => {
  await withServer({}, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/ai/summary`, {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lahanCards: [], totals: {} }),
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "ai_summary_disabled" });
  });
});

test("equivalent concurrent requests are not executed twice", async () => {
  await withServer(
    { routers: createRouters({ delayMs: 100 }) },
    async (baseUrl, app) => {
      const headers = {
        Authorization: "Bearer valid-token",
        "Idempotency-Key": "fixture-request-1",
      };
      const url = `${baseUrl}/ndvi?bbox=106.8,-6.2,106.801,-6.199`;
      const first = fetch(url, { headers });
      await new Promise((resolve) => setTimeout(resolve, 20));
      const second = await fetch(url, { headers });
      assert.equal(second.status, 409);
      assert.equal((await first).status, 200);
      assert.equal(app.locals.quotaSnapshot()[
        "00000000-0000-4000-8000-000000000001:/ndvi"
      ], 1);
    }
  );
});
