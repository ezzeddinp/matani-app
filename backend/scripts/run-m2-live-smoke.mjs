import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { loadConfig } from "../config.js";
import { createCdseProcessAdapter } from "../measurement/cdse-process-adapter.js";

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
  fail("M2 live smoke requires --allow-live.");
}

const inputPath = value("--input");
const outputPath = value("--output");
const from = value("--from");
const to = value("--to");
const confirmedCeiling = Number(value("--confirm-max-request-attempts"));
if (!inputPath || !outputPath || !from || !to || confirmedCeiling !== 9) {
  fail(
    "Required: --input --output --from --to --confirm-max-request-attempts 9 --allow-live",
  );
}

const start = new Date(from);
const end = new Date(to);
if (
  !Number.isFinite(start.valueOf()) ||
  !Number.isFinite(end.valueOf()) ||
  end <= start ||
  end - start > 31 * 86_400_000
) {
  fail("M2 live smoke window must be positive and at most 31 days.");
}

const input = JSON.parse(await fs.readFile(inputPath, "utf8"));
if (input?.type !== "FeatureCollection" || input.features?.length !== 1) {
  fail("M2 live smoke requires exactly one approved private study field.");
}
const feature = input.features[0];
if (String(feature.properties?.category).toLowerCase() !== "padi") {
  fail("M2 live smoke is padi-only.");
}
if (!process.env.SENTINEL_CLIENT_ID || !process.env.SENTINEL_CLIENT_SECRET) {
  fail("CDSE credentials are missing from the execution environment.");
}

const config = loadConfig();
const adapter = createCdseProcessAdapter({
  catalogUrl: config.sentinelCatalogUrl,
  processUrl: config.sentinelProcessUrl,
  providerTimeoutMs: config.measurementProviderTimeoutMs,
  maxProviderAttempts: 3,
  ndviValidPixelFloor: config.ndviValidPixelFloor,
  ndmiValidPixelFloor: config.ndmiValidPixelFloor,
});
const result = await adapter.measure({
  geometry: feature.geometry,
  from: start.toISOString(),
  to: end.toISOString(),
});

const artifact = {
  generated_at: new Date().toISOString(),
  data_state: "prototype-live-smoke",
  purpose: "m2-provider-adapter-validation",
  claim_allowed: false,
  field_reference_hash: result.geometry_hash,
  geometry_omitted_from_output: true,
  source_identifiers_omitted_from_output: true,
  request_window: { from: start.toISOString(), to: end.toISOString() },
  request_contract: {
    exact_projected_polygon: true,
    bbox_substitution: false,
    ndvi_resolution_metres: 10,
    ndmi_resolution_metres: 20,
    source_identity_match_required: true,
  },
  result: {
    quality_status: result.quality_status,
    rejection_reason: result.rejection_reason,
    acquisition_start: result.acquisition_start,
    acquisition_end: result.acquisition_end,
    source_product_count: result.source_product_ids.length,
    source_identity_match:
      result.provider_provenance?.source_identity_match ?? false,
    algorithm_version: result.algorithm_version,
    evalscript_version: result.evalscript_version,
    masking_config_version: result.masking_config_version,
    crs: result.crs,
    index_stats: result.index_stats.map((stat) => ({
      index_name: stat.index_name,
      output_resolution_m: stat.output_resolution_m,
      source_pixel_count: stat.source_pixel_count,
      valid_pixel_count: stat.valid_pixel_count,
      valid_pixel_fraction: stat.valid_pixel_fraction,
      sample_count: stat.sample_count,
      minimum: stat.minimum,
      maximum: stat.maximum,
      mean: stat.mean,
      standard_deviation: stat.standard_deviation,
    })),
  },
  execution: {
    maximum_request_attempts: confirmedCeiling,
    attempts: result.provider_provenance?.attempts ?? null,
    processing_units: result.provider_provenance?.processing_units ?? null,
  },
  limitation:
    "This validates the live provider adapter. It is not a hosted-app persistence or user-device test.",
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify({
    output: outputPath,
    quality_status: artifact.result.quality_status,
    source_product_count: artifact.result.source_product_count,
    source_identity_match: artifact.result.source_identity_match,
    index_stats: artifact.result.index_stats.map((stat) => ({
      index_name: stat.index_name,
      valid_pixel_count: stat.valid_pixel_count,
      source_pixel_count: stat.source_pixel_count,
    })),
    attempts: artifact.execution.attempts,
    processing_units_total: artifact.execution.processing_units?.total ?? null,
  }),
);
