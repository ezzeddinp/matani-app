import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  buildPreflightReport,
  buildStatisticalRequest,
  CDSE_STATISTICS_URL,
  CDSE_TOKEN_URL,
  executeStatisticalRequest,
  fetchCdseToken,
  summarizeResponses,
  validatePilotGeometry,
} from "../lib/cdse-pilot.mjs";

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const allowLive = args.includes("--allow-live");
const preflightOnly = args.includes("--preflight-only");
if (allowLive === preflightOnly) {
  fail("Choose exactly one of --allow-live or --preflight-only.");
}

const inputPath = value("--input");
const outputPath = value("--output");
const from = value("--from");
const to = value("--to");
if (!inputPath || !outputPath || !from || !to) {
  fail("Required: --input --output --from --to and one execution mode");
}

const input = JSON.parse(await fs.readFile(inputPath, "utf8"));
const fields = input.type === "FeatureCollection" ? input.features : input;
if (!Array.isArray(fields) || fields.length < 1 || fields.length > 2) {
  fail("Pilot requires one or two fields.");
}

const normalized = fields.map((feature) => {
  validatePilotGeometry(feature.geometry);
  if (String(feature.properties?.category).toLowerCase() !== "padi") {
    fail("M1 thesis pilot is padi-only.");
  }
  return {
    id: feature.properties.id,
    name: feature.properties.name,
    category: "padi",
    area_ha: Number(feature.properties.area_ha),
    geometry: feature.geometry,
  };
});

if (preflightOnly) {
  const artifact = buildPreflightReport({
    fields: normalized,
    from,
    to,
  });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`Wrote privacy-minimized preflight artifact: ${outputPath}`);
  process.exit(0);
}

const clientId = process.env.SENTINEL_CLIENT_ID;
const clientSecret = process.env.SENTINEL_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  fail(
    "CDSE credentials missing. Set SENTINEL_CLIENT_ID and SENTINEL_CLIENT_SECRET in the execution environment.",
  );
}

console.log(`Starting bounded CDSE pilot for ${normalized.length} field(s).`);
const token = await fetchCdseToken({
  clientId,
  clientSecret,
  tokenUrl: process.env.SENTINEL_TOKEN_URL || CDSE_TOKEN_URL,
});

const reports = [];
for (const field of normalized) {
  const responses = {};
  const pu = {};
  for (const output of ["quality", "ndvi", "ndmi"]) {
    const result = await executeStatisticalRequest({
      token,
      request: buildStatisticalRequest({
        geometry: field.geometry,
        from,
        to,
        output,
      }),
      statisticsUrl:
        process.env.SENTINEL_STATISTICS_URL || CDSE_STATISTICS_URL,
    });
    responses[output] = result.body;
    pu[output] = result.processingUnits;
  }
  reports.push(
    summarizeResponses({
      field,
      from,
      to,
      qualityResponse: responses.quality,
      ndviResponse: responses.ndvi,
      ndmiResponse: responses.ndmi,
      quota: {
        requests: 3,
        processing_units_by_request: pu,
        processing_units_total: Object.values(pu).every(Number.isFinite)
          ? Object.values(pu).reduce((sum, current) => sum + current, 0)
          : null,
      },
    }),
  );
}

const artifact = {
  generated_at: new Date().toISOString(),
  data_state: "prototype",
  claim_allowed: false,
  reports,
};
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(`Wrote privacy-minimized pilot artifact: ${outputPath}`);
