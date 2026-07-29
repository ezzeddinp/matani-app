import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  buildStatisticalRequest,
  CDSE_STATISTICS_URL,
  CDSE_TOKEN_URL,
  executeStatisticalRequestWithRetry,
  fetchCdseToken,
  summarizeResponses,
  validatePilotGeometry,
} from "../lib/cdse-pilot.mjs";
import {
  buildCalendarMonthWindows,
  buildStudyArtifact,
  studyIdentity,
} from "../lib/cdse-study.mjs";

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!args.includes("--allow-live")) {
  fail("Live availability study requires --allow-live.");
}
if (value("--confirm-max-requests") !== "72") {
  fail("Explicitly acknowledge the 72-request ceiling with --confirm-max-requests 72.");
}

const inputPath = value("--input");
const outputPath = value("--output");
const from = value("--from");
const to = value("--to");
if (!inputPath || !outputPath || !from || !to) {
  fail("Required: --input --output --from --to.");
}

const source = JSON.parse(await fs.readFile(inputPath, "utf8"));
const features = source.type === "FeatureCollection" ? source.features : source;
if (!Array.isArray(features) || features.length !== 2) {
  fail("The bounded study runner requires exactly two padi pilot fields.");
}
const fields = features.map((feature) => {
  validatePilotGeometry(feature.geometry);
  if (String(feature.properties?.category).toLowerCase() !== "padi") {
    fail("M1 thesis availability input is padi-only.");
  }
  return {
    id: feature.properties.id,
    category: "padi",
    area_ha: Number(feature.properties.area_ha),
    geometry: feature.geometry,
  };
});
const windows = buildCalendarMonthWindows(from, to);
const identity = studyIdentity({ fields, from, to });

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
  const artifact = buildStudyArtifact({
    identity,
    from,
    to,
    windows,
    fieldCount: fields.length,
    monthlyReports,
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
      quota: { requests: 3 },
    });
    const key = `${probe.field.field_reference_hash}:${window.from}:${window.to}`;
    if (completed.has(key)) continue;

    const responses = {};
    const processingUnits = {};
    const attempts = {};
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
        quota: {
          requests: Object.values(attempts).reduce(
            (sum, current) => sum + current,
            0,
          ),
          attempts_by_request: attempts,
          processing_units_by_request: processingUnits,
          processing_units_total: Object.values(processingUnits).every(
            Number.isFinite,
          )
            ? Object.values(processingUnits).reduce(
                (sum, current) => sum + current,
                0,
              )
            : null,
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
console.log(`Wrote privacy-minimized 12-month study artifact: ${outputPath}`);
