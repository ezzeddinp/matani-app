import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createMeasurementWorker } from "../../backend/measurement/worker.js";
import { decideQuality } from "../../backend/measurement/statistics.js";

const output = process.argv[2];
if (!output || process.argv.length !== 3) throw new Error("Usage: node research/scripts/run-m3-replay.mjs OUTPUT.json");
const checks = [];
const input = { job: { id: "fixture-job" }, userId: "fixture-user", geometry: null,
  from: "2025-01-01T00:00:00Z", to: "2025-02-01T00:00:00Z" };

const payload = (quality_status, rejection_reason = null) => ({
  provider: "fixture-provider", acquisition_start: "2025-01-05T00:00:00Z",
  acquisition_end: "2025-01-05T00:00:00Z", quality_status, rejection_reason,
  source_product_ids: ["fixture-source"], algorithm_version: "fixture-algorithm",
  masking_config_version: "fixture-mask", provider_provenance: { fixture: true },
  index_stats: [{ index_name: "NDVI", mean: 0.5, valid_pixel_count: 9 },
    { index_name: "NDMI", mean: 0.2, valid_pixel_count: 3 }],
});

function harness(measure) {
  const state = { status: "queued", writes: [], calls: 0, errors: [] };
  const worker = createMeasurementWorker({
    provider: { async measure() { state.calls += 1; return measure(); } },
    admin: {
      async claim() {
        const claimed = state.status === "queued" || state.status === "failed";
        if (claimed) state.status = "processing";
        return { claimed, job: { id: "fixture-job", status: state.status } };
      },
      async complete({ result }) {
        state.writes.push(structuredClone(result));
        state.status = "succeeded";
        return "fixture-observation";
      },
      async fail(error) { state.errors.push(error); state.status = "failed"; },
    },
  });
  return { state, run: () => worker.process(input) };
}

for (const status of ["passed", "rejected", "unavailable"]) {
  const record = payload(status, status === "passed" ? null : "fixture-reason");
  if (status === "unavailable") {
    record.index_stats = [];
    record.source_product_ids = [];
    record.acquisition_start = null;
    record.acquisition_end = null;
  }
  const replay = harness(async () => record);
  const response = await replay.run();
  assert.deepEqual(replay.state.writes, [record]);
  assert.equal(response.qualityStatus, status);
  assert.equal(response.acquisitionStart, record.acquisition_start);
  assert.equal(response.rejectionReason, record.rejection_reason);
  const reused = await replay.run();
  assert.equal(reused.reused, true);
  assert.equal(replay.state.calls, 1);
  assert.equal(replay.state.writes.length, 1);
  checks.push({ scenario: `${status}-payload-preservation-and-completed-reuse`, passed: true });
}

let release;
const delayed = harness(() => new Promise((resolve) => { release = resolve; }));
const pending = delayed.run();
await Promise.resolve();
assert.equal(delayed.state.status, "processing");
assert.equal(delayed.state.writes.length, 0);
assert.equal((await delayed.run()).reused, true);
release(payload("passed"));
await pending;
assert.equal(delayed.state.writes.length, 1);
assert.equal(delayed.state.calls, 1);
checks.push({ scenario: "delayed-completion-and-inflight-reuse", passed: true });

let attempts = 0;
const retry = harness(async () => {
  if (++attempts === 1) throw new Error("cdse-process-timeout");
  return payload("passed");
});
await assert.rejects(retry.run(), /provider-unavailable/);
assert.equal(retry.state.writes.length, 0);
assert.equal(retry.state.errors[0].errorCode, "provider-unavailable");
assert.equal((await retry.run()).qualityStatus, "passed");
assert.equal(retry.state.writes.length, 1);
checks.push({ scenario: "simulated-timeout-and-successful-retry", passed: true });

for (const [ndvi, ndmi, expected] of [[9, 3, "passed"], [8, 3, "rejected"], [9, 2, "rejected"]]) {
  assert.equal(decideQuality({ ndvi: { sourcePixelCount: 12, validPixelCount: ndvi },
    ndmi: { sourcePixelCount: 4, validPixelCount: ndmi } }).status, expected);
}
checks.push({ scenario: "production-9-3-floor-boundaries", passed: true });

const files = ["backend/measurement/worker.js", "backend/measurement/statistics.js", "research/scripts/run-m3-replay.mjs"];
const sourceHashes = {};
for (const name of files) {
  sourceHashes[name] = createHash("sha256").update(await readFile(new URL(`../../${name}`, import.meta.url))).digest("hex");
}
await writeFile(output, JSON.stringify({ data_state: "fixture", network_called: false,
  scope: "Production worker.process and quality function; in-memory claim/persistence and simulated provider",
  excluded: ["database locking/RLS", "provider arithmetic", "route transport", "rendered UI", "physical device", "agronomic accuracy"],
  source_sha256: sourceHashes, checks }, null, 2) + "\n", { flag: "wx" });
console.log(`Wrote fixture replay: ${output}`);
