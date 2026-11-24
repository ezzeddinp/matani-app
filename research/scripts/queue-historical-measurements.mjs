import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { loadConfig } from "../../backend/config.js";
import { createSupabaseMeasurementAdmin } from "../../backend/measurement/supabase-admin.js";
import { dateMilliseconds, parseCsv, validateLahanId } from "../lib/ndvi-estimate-import.mjs";

export function historicalWindows(rows, blockId) {
  return [...new Set(rows.filter((row) => row.block_id === blockId).map((row) => row.date))]
    .sort()
    .map((date) => {
      const timestamp = dateMilliseconds(date);
      return { date, from: new Date(timestamp).toISOString(), to: new Date(timestamp + 86_400_000).toISOString() };
    });
}

export function retryableError(error) {
  if (error.diagnosticCode) {
    return /^cdse-(?:token|catalog|process)-(?:network|timeout|failed-(?:429|5[0-9]{2}))$/.test(error.diagnosticCode);
  }
  return error.retryable === true || error.statusCode === 429 || (error.statusCode >= 500 && error.statusCode <= 599);
}

export async function processWindows({ windows, lahanId, userId, worker, admin, log = console.log }) {
  const counts = { passed: 0, rejected: 0, unavailable: 0 };
  let failed = false;
  for (const { date, from, to } of windows) {
    try {
      const queued = await worker.enqueue({ lahanId, userId, from, to, idempotencyKey: `historical:${lahanId}:${from}:${to}` });
      const result = await worker.process(queued);
      let qualityStatus = result.qualityStatus;
      if (result.reused && result.status === "succeeded") {
        const query = new URLSearchParams({ select: "quality_status", job_id: `eq.${result.jobId}`, limit: "1" });
        const observations = await admin.request(`measurements?${query}`);
        qualityStatus = observations?.[0]?.quality_status ?? null;
      }
      counts[Object.hasOwn(counts, qualityStatus) ? qualityStatus : "unavailable"] += 1;
      log(JSON.stringify({ date, status: result.status, qualityStatus, reused: result.reused }));
      if (result.status === "failed") {
        failed = true;
        break;
      }
    } catch (error) {
      counts.unavailable += 1;
      failed = true;
      const retryable = retryableError(error);
      log(JSON.stringify({ date, status: "error", qualityStatus: "unavailable", retryable }));
      if (!retryable) break;
    }
  }
  log(JSON.stringify({ summary: counts }));
  return { counts, failed };
}

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args,
    options: {
      "lahan-id": { type: "string" },
      "dates-csv": { type: "string" },
      "block-id": { type: "string" },
      live: { type: "boolean", default: false },
    },
  });
  for (const name of ["lahan-id", "dates-csv", "block-id"]) {
    if (!values[name]?.trim()) throw new Error(`missing_--${name}`);
  }
  const lahanId = values["lahan-id"];
  validateLahanId(lahanId);
  const windows = historicalWindows(parseCsv(await readFile(values["dates-csv"], "utf8")), values["block-id"]);
  console.log(JSON.stringify({ live: values.live, lahan_id: lahanId, count: windows.length, windows }, null, 2));
  if (!values.live || !windows.length) return;
  const { createCdseProcessAdapter } = await import("../../backend/measurement/cdse-process-adapter.js");
  const { createMeasurementWorker } = await import("../../backend/measurement/worker.js");
  const config = loadConfig();
  const admin = createSupabaseMeasurementAdmin({ supabaseUrl: config.supabaseUrl, adminKey: config.supabaseAdminKey });
  const query = new URLSearchParams({ select: "user_id", id: `eq.${lahanId}`, limit: "1" });
  const fields = await admin.request(`lahan?${query}`);
  if (!fields?.[0]?.user_id) throw new Error("MEASUREMENT_FIELD_NOT_FOUND");
  const provider = createCdseProcessAdapter({
    catalogUrl: config.sentinelCatalogUrl,
    processUrl: config.sentinelProcessUrl,
    providerTimeoutMs: config.measurementProviderTimeoutMs,
    maxProviderAttempts: config.measurementProviderMaxAttempts,
    ndviValidPixelFloor: config.ndviValidPixelFloor,
    ndmiValidPixelFloor: config.ndmiValidPixelFloor,
  });
  const worker = createMeasurementWorker({ admin, provider });
  const { failed } = await processWindows({ windows, lahanId, userId: fields[0].user_id, worker, admin });
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
