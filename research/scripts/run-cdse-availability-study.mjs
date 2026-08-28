import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  buildStatisticalRequest,
  buildCatalogRequest,
  CDSE_CATALOG_URL,
  CDSE_STATISTICS_URL,
  CDSE_TOKEN_URL,
  executeCatalogRequestWithRetry,
  executeStatisticalRequestWithRetry,
  fetchCdseToken,
  summarizeResponses,
} from "../lib/cdse-pilot.mjs";
import { buildCalendarMonthWindows } from "../lib/cdse-study.mjs";
import {
  assertM1LiveAuthorization,
  normalizeM1StudyInput,
} from "../lib/m1-study-input.mjs";
import {
  buildM1StudyArtifact,
  buildM1StudyPreflightArtifact,
  m1StudyIdentity,
} from "../lib/m1-study-report.mjs";

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const inputPath = value("--input");
const outputPath = value("--output");
const from = value("--from");
const to = value("--to");
if (!inputPath || !outputPath || !from || !to) {
  fail("Required: --input --output --from --to.");
}

const source = JSON.parse(await fs.readFile(inputPath, "utf8"));
const windows = buildCalendarMonthWindows(from, to);
let studyInput;
try {
  studyInput = normalizeM1StudyInput({ source, windows });
} catch (error) {
  fail(`M1 input validation failed: ${error.message}`);
}
const fields = studyInput.fields;
const maxAttemptsPerRequest = Number(
  value("--max-attempts-per-request") ?? "3",
);
if (
  !Number.isInteger(maxAttemptsPerRequest) ||
  maxAttemptsPerRequest < 1 ||
  maxAttemptsPerRequest > 5
) {
  fail("--max-attempts-per-request must be an integer from 1 through 5.");
}
const plannedRequestOperations = windows.length * fields.length * 4;
const requestAttemptCeiling =
  plannedRequestOperations * maxAttemptsPerRequest;
const identity = m1StudyIdentity({ fields, from, to, studyInput });

if (args.includes("--preflight-only")) {
  const artifact = buildM1StudyPreflightArtifact({
    identity,
    from,
    to,
    windows,
    studyInput,
    plannedRequestOperations,
    confirmedRequestAttemptCeiling: null,
    maxAttemptsPerRequest,
  });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(
    `Preflight passed for ${fields.length} fields across ${studyInput.sites.length} sites; ${plannedRequestOperations} operations and at most ${requestAttemptCeiling} attempts if live.`,
  );
  process.exit(0);
}

if (!args.includes("--allow-live")) {
  fail("Live availability study requires --allow-live; use --preflight-only for no network.");
}
try {
  assertM1LiveAuthorization({
    input: studyInput,
    allowProvisionalScope: args.includes("--allow-provisional-scope"),
  });
} catch (error) {
  fail(`Live study authorization failed: ${error.message}`);
}
if (value("--confirm-max-request-attempts") !== String(requestAttemptCeiling)) {
  fail(
    `Explicitly acknowledge the ${requestAttemptCeiling}-attempt ceiling (${plannedRequestOperations} planned operations × ${maxAttemptsPerRequest} attempts) with --confirm-max-request-attempts ${requestAttemptCeiling}.`,
  );
}

let monthlyReports = [];
try {
  const previous = JSON.parse(await fs.readFile(outputPath, "utf8"));
  if (previous.study_identity !== identity) {
    fail("Existing checkpoint belongs to a different study identity.");
  }
  monthlyReports = previous.checkpoint?.monthly_reports ?? [];
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const completed = new Set(
  monthlyReports.map(
    (report) =>
      `${report.field.field_reference_hash}:${report.window.from}:${report.window.to}`,
  ),
);

const clientId = process.env.SENTINEL_CLIENT_ID;
const clientSecret = process.env.SENTINEL_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  fail("CDSE credentials are missing from the execution environment.");
}
const token = await fetchCdseToken({
  clientId,
  clientSecret,
  tokenUrl: process.env.SENTINEL_TOKEN_URL || CDSE_TOKEN_URL,
});
const minimumRequestIntervalMs = 2500;
let lastRequestAt = 0;
const throttle = async () => {
  const remaining =
    minimumRequestIntervalMs - (Date.now() - lastRequestAt);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
};

const save = async () => {
  const artifact = buildM1StudyArtifact({
    identity,
    from,
    to,
    windows,
    monthlyReports,
    studyInput,
    plannedRequestOperations,
    confirmedRequestAttemptCeiling: requestAttemptCeiling,
  });
  artifact.checkpoint = { monthly_reports: monthlyReports };
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
};

for (const window of windows) {
  for (const field of fields) {
    const probe = summarizeResponses({
      field,
      from: window.from,
      to: window.to,
      qualityResponse: {},
      ndviResponse: {},
      ndmiResponse: {},
      catalogResponse: { features: [] },
      quota: { requests: 4 },
    });
    const key = `${probe.field.field_reference_hash}:${window.from}:${window.to}`;
    if (completed.has(key)) continue;

    const responses = {};
    const processingUnits = {};
    const attempts = {};
    await throttle();
    const catalogResult = await executeCatalogRequestWithRetry({
      token,
      request: buildCatalogRequest({
        geometry: field.geometry,
        from: window.from,
        to: window.to,
      }),
      catalogUrl: process.env.SENTINEL_CATALOG_URL || CDSE_CATALOG_URL,
      maxAttempts: maxAttemptsPerRequest,
    });
    lastRequestAt = Date.now();
    responses.catalog = catalogResult.body;
    processingUnits.catalog = catalogResult.processingUnits;
    attempts.catalog = catalogResult.attempts;
    for (const output of ["quality", "ndvi", "ndmi"]) {
      await throttle();
      const result = await executeStatisticalRequestWithRetry({
        token,
        request: buildStatisticalRequest({
          geometry: field.geometry,
          from: window.from,
          to: window.to,
          output,
        }),
        statisticsUrl:
          process.env.SENTINEL_STATISTICS_URL || CDSE_STATISTICS_URL,
        maxAttempts: maxAttemptsPerRequest,
      });
      lastRequestAt = Date.now();
      responses[output] = result.body;
      processingUnits[output] = result.processingUnits;
      attempts[output] = result.attempts;
    }
    monthlyReports.push(
      summarizeResponses({
        field,
        from: window.from,
        to: window.to,
        qualityResponse: responses.quality,
        ndviResponse: responses.ndvi,
        ndmiResponse: responses.ndmi,
        catalogResponse: responses.catalog,
        quota: {
          requests: Object.values(attempts).reduce(
            (sum, current) => sum + current,
            0,
          ),
          attempts_by_request: attempts,
          processing_units_by_request: processingUnits,
          processing_units_total: Object.values(processingUnits)
            .filter(Number.isFinite)
            .reduce((sum, current) => sum + current, 0),
          processing_units_complete: Object.values(processingUnits).every(
            Number.isFinite,
          ),
        },
      }),
    );
    completed.add(key);
    await save();
    console.log(
      `Completed ${completed.size}/${windows.length * fields.length} field-months.`,
    );
  }
}

await save();
console.log(
  `Wrote privacy-minimized multi-site 12-month study artifact: ${outputPath}`,
);
