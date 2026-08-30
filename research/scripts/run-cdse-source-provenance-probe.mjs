import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  buildProcessProvenanceRequest,
  CDSE_PROCESS_URL,
  CDSE_TOKEN_URL,
  executeProcessProvenanceRequestWithRetry,
  fetchCdseToken,
  geometryHash,
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

if (!args.includes("--allow-live")) {
  fail("Live provenance probe requires --allow-live.");
}

const inputPath = value("--input");
const outputPath = value("--output");
const from = value("--from");
const to = value("--to");
const confirmedCeiling = Number(value("--confirm-max-request-attempts"));
if (!inputPath || !outputPath || !from || !to || confirmedCeiling !== 3) {
  fail(
    "Required: --input --output --from --to --confirm-max-request-attempts 3 --allow-live",
  );
}

const start = new Date(from);
const end = new Date(to);
if (
  !Number.isFinite(start.valueOf()) ||
  !Number.isFinite(end.valueOf()) ||
  end <= start ||
  end - start > 86_400_000
) {
  fail("Provenance probe window must be positive and at most one day.");
}

const input = JSON.parse(await fs.readFile(inputPath, "utf8"));
if (input?.type !== "FeatureCollection" || input.features?.length !== 1) {
  fail("Provenance probe requires exactly one private study field.");
}
const feature = input.features[0];
validatePilotGeometry(feature.geometry);
if (String(feature.properties?.category).toLowerCase() !== "padi") {
  fail("Provenance probe is padi-only.");
}

const clientId = process.env.SENTINEL_CLIENT_ID;
const clientSecret = process.env.SENTINEL_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  fail("CDSE credentials missing from the execution environment.");
}

const token = await fetchCdseToken({
  clientId,
  clientSecret,
  tokenUrl: process.env.SENTINEL_TOKEN_URL || CDSE_TOKEN_URL,
});
const result = await executeProcessProvenanceRequestWithRetry({
  token,
  request: buildProcessProvenanceRequest({
    geometry: feature.geometry,
    from,
    to,
  }),
  processUrl: process.env.SENTINEL_PROCESS_URL || CDSE_PROCESS_URL,
  maxAttempts: 3,
});

const orbits = Array.isArray(result.body?.orbits) ? result.body.orbits : [];
const sourceReferences = orbits.flatMap((orbit) =>
  (orbit.tiles ?? []).map((tile) => ({
    acquired_at: tile.date ?? null,
    provider_scene_id: tile.shId == null ? null : String(tile.shId),
    provider_data_path: tile.dataPath ?? null,
  })),
);
if (
  sourceReferences.length === 0 ||
  sourceReferences.some(
    (source) => !source.provider_scene_id || !source.provider_data_path,
  )
) {
  fail("CDSE Process API did not return complete source scene references.");
}

const artifact = {
  generated_at: new Date().toISOString(),
  data_state: "prototype",
  purpose: "m1-source-provenance-path-test",
  claim_allowed: false,
  provider: "CDSE Sentinel Hub Process API",
  collection: "sentinel-2-l2a",
  field_reference_hash: geometryHash(feature.geometry),
  geometry_omitted_from_output: true,
  identifiers_omitted_from_output: true,
  window: { from, to },
  request_contract: {
    exact_polygon: true,
    bbox_substitution: false,
    mosaicking_order: "mostRecent",
    mosaicking_mode: "ORBIT",
    response: "userdata-only",
  },
  execution: {
    requests: 1,
    attempts: result.attempts,
    confirmed_request_attempt_ceiling: 3,
    processing_units: result.processingUnits,
  },
  provider_service_version: result.body?.serviceVersion ?? null,
  source_identity_status: "process-scenes-provider-references-returned",
  source_references: sourceReferences,
  limitation:
    "This tests the M2 provenance path; it does not turn the M1 Statistical API observations into persisted Matani measurements.",
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(`Wrote privacy-minimized source-provenance artifact: ${outputPath}`);
