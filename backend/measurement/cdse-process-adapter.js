import { fromArrayBuffer } from "geotiff";
import nodeFetch from "node-fetch";

import { getSentinelToken } from "../sentinelAuth.js";
import {
  geometryHash,
  projectGeometryToLocalUtm,
  validateFieldGeometry,
} from "./geometry.js";
import { extractProcessParts } from "./multipart.js";
import { decideQuality, summarizeIndexBands } from "./statistics.js";

export const MEASUREMENT_VERSIONS = Object.freeze({
  algorithm: "ndvi-ndmi-v1",
  evalscript: "s2l2a-process-native-grids-v2",
  masking: "s2l2a-scl-rice-v1",
  executor: "cdse-node-fetch-v1",
});

const MASKED_SCL = Object.freeze([0, 1, 3, 8, 9, 10]);
const CLOUD_SHADOW_SCL = Object.freeze([3, 8, 9, 10]);

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const providerError = async (response, label) => {
  const error = new Error(`${label}-failed-${response.status}`);
  error.statusCode = response.status;
  error.retryAfterSeconds = Number(response.headers.get("retry-after")) || null;
  return error;
};

const transportError = (error, label) => {
  if (error?.message?.startsWith("cdse-")) return error;
  const kind =
    error?.name === "AbortError" || error?.name === "TimeoutError"
      ? "timeout"
      : "network";
  const routed = new Error(`${label}-${kind}`);
  routed.statusCode = error?.statusCode;
  return routed;
};

const withRetry = async (operation, { maxAttempts = 3, sleepImpl = sleep } = {}) => {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const result = await operation();
      return { ...result, attempts: attempt };
    } catch (error) {
      const retryable =
        error?.statusCode === 429 ||
        (error?.statusCode >= 500 && error?.statusCode <= 599);
      if (!retryable || attempt >= maxAttempts) {
        error.attempts = attempt;
        throw error;
      }
      const providerDelay = Number(error.retryAfterSeconds) * 1_000;
      const exponentialDelay = 1_000 * 2 ** (attempt - 1);
      await sleepImpl(
        Math.min(
          15_000,
          Math.max(Number.isFinite(providerDelay) ? providerDelay : 0, exponentialDelay),
        ),
      );
    }
  }
  throw new Error("unreachable-provider-retry-state");
};

export const buildCatalogRequest = ({ geometry, from, to }) => ({
  collections: ["sentinel-2-l2a"],
  datetime: `${from}/${to}`,
  intersects: validateFieldGeometry(geometry),
  limit: 100,
});

const indexDefinition = (indexName) => {
  if (indexName === "ndvi") {
    return {
      bands: ["B04", "B08", "SCL", "dataMask"],
      denominator: "sample.B08 + sample.B04",
      formula: "(sample.B08 - sample.B04) / (sample.B08 + sample.B04)",
      resolution: 10,
      outputBands: 3,
    };
  }
  if (indexName === "ndmi") {
    return {
      bands: ["B08", "B11", "SCL", "dataMask"],
      denominator: "sample.B08 + sample.B11",
      formula: "(sample.B08 - sample.B11) / (sample.B08 + sample.B11)",
      resolution: 20,
      outputBands: 4,
    };
  }
  throw new Error("unsupported-measurement-index");
};

export const buildIndexEvalscript = (indexName) => {
  const definition = indexDefinition(indexName);
  const includeCloud = indexName === "ndmi";
  return [
    "//VERSION=3",
    "function setup() {",
    "  return {",
    `    input: [{ bands: ${JSON.stringify(definition.bands)} }],`,
    "    mosaicking: Mosaicking.ORBIT,",
    `    output: { id: \"${indexName}\", bands: ${definition.outputBands}, sampleType: \"FLOAT32\" }`,
    "  };",
    "}",
    "function evaluatePixel(samples) {",
    "  const list = Array.isArray(samples) ? samples : [samples];",
    "  const sample = list.find(function (candidate) { return candidate && candidate.dataMask; }) || list[0] || {};",
    `  const excluded = ${JSON.stringify(MASKED_SCL)}.includes(sample.SCL);`,
    `  const denominator = ${definition.denominator};`,
    `  const value = denominator === 0 ? 0 : ${definition.formula};`,
    "  const sourceMask = sample.dataMask ? 1 : 0;",
    "  const validMask = sourceMask && !excluded && denominator !== 0 ? 1 : 0;",
    ...(includeCloud
      ? [
          `  const cloudShadow = sourceMask && ${JSON.stringify(CLOUD_SHADOW_SCL)}.includes(sample.SCL) ? 1 : 0;`,
          "  return [value, validMask, sourceMask, cloudShadow];",
        ]
      : ["  return [value, validMask, sourceMask];"]),
    "}",
    "function updateOutputMetadata(scenes, inputMetadata, outputMetadata) {",
    "  const orbits = scenes && scenes.orbits ? scenes.orbits : [];",
    "  outputMetadata.userData = {",
    "    serviceVersion: inputMetadata.serviceVersion,",
    "    orbits: orbits.map(function (orbit) {",
    "      return {",
    "        dateFrom: orbit.dateFrom,",
    "        dateTo: orbit.dateTo,",
    "        tiles: (orbit.tiles || []).map(function (tile) {",
    "          return { date: tile.date, shId: tile.shId, dataPath: tile.dataPath };",
    "        })",
    "      };",
    "    })",
    "  };",
    "}",
  ].join("\n");
};

export const buildProcessRequest = ({ geometry, from, to, indexName }) => {
  const projection = projectGeometryToLocalUtm(geometry);
  const definition = indexDefinition(indexName);
  return {
    input: {
      bounds: {
        geometry: projection.geometry,
        properties: { crs: projection.processingCrs },
      },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: { from, to },
            mosaickingOrder: "mostRecent",
          },
          processing: {
            upsampling: "NEAREST",
            downsampling: "NEAREST",
            harmonizeValues: true,
          },
        },
      ],
    },
    output: {
      resx: definition.resolution,
      resy: definition.resolution,
      responses: [
        { identifier: indexName, format: { type: "image/tiff" } },
        { identifier: "userdata", format: { type: "application/json" } },
      ],
    },
    evalscript: buildIndexEvalscript(indexName),
  };
};

const latestCatalogFeature = (body) =>
  [...(body?.features ?? [])]
    .filter((feature) => feature?.id && feature?.properties?.datetime)
    .sort((left, right) =>
      right.properties.datetime.localeCompare(left.properties.datetime),
    )[0] ?? null;

const utcDayWindow = (timestamp) => {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.valueOf())) throw new Error("catalog-acquisition-date-invalid");
  const from = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const to = new Date(from.valueOf() + 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
};

const rasterBands = async (buffer) => {
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
  const tiff = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  return image.readRasters({ interleave: false });
};

export const extractSourceIdentity = (userdata) => {
  const orbits = userdata?.orbits ?? [];
  const tiles = orbits.flatMap((orbit) => orbit?.tiles ?? []);
  const sceneIds = [...new Set(tiles.map((tile) => tile?.shId).filter(Boolean))].sort();
  const dataPaths = [
    ...new Set(tiles.map((tile) => tile?.dataPath).filter(Boolean)),
  ].sort();
  const productIds = [
    ...new Set(
      dataPaths
        .map((path) => /([^/]+\.SAFE)(?:\/|$)/i.exec(path)?.[1] ?? null)
        .filter(Boolean),
    ),
  ].sort();
  const validDates = (values) =>
    values
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((value) => Number.isFinite(value.valueOf()))
      .map((value) => value.toISOString())
      .sort();
  const starts = validDates([
    ...orbits.map((orbit) => orbit?.dateFrom),
    ...tiles.map((tile) => tile?.date),
  ]);
  const ends = validDates(orbits.map((orbit) => orbit?.dateTo));
  return {
    serviceVersion: userdata?.serviceVersion ?? null,
    sceneIds,
    dataPaths,
    productIds,
    acquisitionStart: starts[0] ?? null,
    acquisitionEnd: ends.at(-1) ?? starts.at(-1) ?? null,
    tiles,
  };
};

const sameSourceIdentity = (left, right) =>
  left.serviceVersion === right.serviceVersion &&
  JSON.stringify(left.sceneIds) === JSON.stringify(right.sceneIds) &&
  JSON.stringify(left.dataPaths) === JSON.stringify(right.dataPaths) &&
  JSON.stringify(left.productIds) === JSON.stringify(right.productIds) &&
  left.acquisitionStart === right.acquisitionStart &&
  left.acquisitionEnd === right.acquisitionEnd;

const unavailableResult = ({ geometry, projection, reason, processingAt }) => ({
  provider: "CDSE Sentinel Hub Process API",
  mission: "Sentinel-2",
  platform: null,
  collection: "sentinel-2-l2a",
  processing_level: "L2A",
  source_product_ids: [],
  acquisition_start: null,
  acquisition_end: null,
  processing_at: processingAt,
  geometry_hash: geometryHash(geometry),
  algorithm_version: MEASUREMENT_VERSIONS.algorithm,
  evalscript_version: MEASUREMENT_VERSIONS.evalscript,
  masking_config_version: MEASUREMENT_VERSIONS.masking,
  crs: `EPSG:${projection.epsg}`,
  quality_output_resolution_m: 20,
  quality_resampling_method: "NEAREST",
  tile_cloud_metadata: null,
  polygon_cloud_shadow_fraction: null,
  quality_status: "unavailable",
  rejection_reason: reason,
  provider_provenance: {},
  index_stats: [],
});

export const createCdseProcessAdapter = ({
  catalogUrl,
  processUrl,
  providerTimeoutMs = 45_000,
  maxProviderAttempts = 3,
  ndviValidPixelFloor = 9,
  ndmiValidPixelFloor = 3,
  getToken = getSentinelToken,
  fetchImpl = nodeFetch,
  now = () => new Date(),
  sleepImpl = sleep,
  decodeRaster = rasterBands,
} = {}) => {
  const executeCatalog = async ({ token, request }) => {
    let response;
    try {
      response = await fetchImpl(catalogUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/geo+json",
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(providerTimeoutMs),
      });
    } catch (error) {
      throw transportError(error, "cdse-catalog");
    }
    if (!response.ok) throw await providerError(response, "cdse-catalog");
    return {
      body: await response.json(),
      processingUnits: Number(response.headers.get("x-processingunits-spent")) || 0,
    };
  };

  const executeProcess = async ({ token, request }) => {
    let response;
    try {
      response = await fetchImpl(processUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "multipart/mixed",
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(providerTimeoutMs),
      });
    } catch (error) {
      throw transportError(error, "cdse-process");
    }
    const parts = await extractProcessParts(response);
    return {
      ...parts,
      processingUnits: Number(response.headers.get("x-processingunits-spent")) || 0,
    };
  };

  return {
    async measure({ geometry, from, to, onStage = () => {} }) {
      validateFieldGeometry(geometry);
      const projection = projectGeometryToLocalUtm(geometry);
      const processingAt = now().toISOString();
      let token;
      try {
        token = await getToken();
      } catch (error) {
        throw transportError(error, "cdse-token");
      }
      onStage("token_acquired");
      const catalog = await withRetry(
        () => executeCatalog({ token, request: buildCatalogRequest({ geometry, from, to }) }),
        { maxAttempts: maxProviderAttempts, sleepImpl },
      );
      onStage("catalog_received");
      let feature;
      try {
        feature = latestCatalogFeature(catalog.body);
      } catch {
        throw new Error("process-catalog-response-invalid");
      }
      if (!feature) {
        onStage("catalog_no_acquisition");
        return unavailableResult({
          geometry,
          projection,
          reason: "no-acquisition-in-window",
          processingAt,
        });
      }

      const acquisition = utcDayWindow(feature.properties.datetime);
      const [ndviResponse, ndmiResponse] = await Promise.all(
        ["ndvi", "ndmi"].map((indexName) =>
          withRetry(
            () =>
              executeProcess({
                token,
                request: buildProcessRequest({
                  geometry,
                  from: acquisition.from,
                  to: acquisition.to,
                  indexName,
                }),
              }),
            { maxAttempts: maxProviderAttempts, sleepImpl },
          ),
        ),
      );
      onStage("process_responses_received");

      let ndviIdentity;
      let ndmiIdentity;
      try {
        ndviIdentity = extractSourceIdentity(ndviResponse.userdata);
        ndmiIdentity = extractSourceIdentity(ndmiResponse.userdata);
      } catch {
        throw new Error("process-source-identity-invalid");
      }
      const completeIdentity =
        ndviIdentity.serviceVersion &&
        ndviIdentity.sceneIds.length > 0 &&
        ndviIdentity.dataPaths.length > 0 &&
        ndviIdentity.productIds.length > 0;
      if (!completeIdentity || !sameSourceIdentity(ndviIdentity, ndmiIdentity)) {
        onStage("source_identity_unavailable");
        return unavailableResult({
          geometry,
          projection,
          reason: completeIdentity
            ? "source-identity-mismatch"
            : "source-identity-missing",
          processingAt,
        });
      }

      let ndviBands;
      let ndmiBands;
      try {
        [ndviBands, ndmiBands] = await Promise.all([
          decodeRaster(ndviResponse.raster),
          decodeRaster(ndmiResponse.raster),
        ]);
      } catch {
        throw new Error("process-raster-decode-failed");
      }
      onStage("rasters_decoded");
      let ndvi;
      let ndmi;
      try {
        ndvi = summarizeIndexBands(ndviBands);
        ndmi = summarizeIndexBands(ndmiBands, { includeCloudBand: true });
      } catch {
        throw new Error("process-raster-statistics-invalid");
      }
      onStage("statistics_summarized");
      const quality = decideQuality({
        ndvi,
        ndmi,
        ndviFloor: ndviValidPixelFloor,
        ndmiFloor: ndmiValidPixelFloor,
      });
      const stats = (indexName, summary, resolution) => ({
        index_name: indexName,
        output_resolution_m: resolution,
        resampling_method: "NEAREST",
        source_pixel_count: summary.sourcePixelCount,
        valid_pixel_count: summary.validPixelCount,
        valid_pixel_fraction: summary.validPixelFraction,
        provider_geometry_pixel_count: null,
        derived_coverage_pixel_count: summary.sourcePixelCount,
        sample_count: summary.sampleCount,
        minimum: summary.minimum,
        maximum: summary.maximum,
        mean: summary.mean,
        standard_deviation: summary.standardDeviation,
      });

      return {
        provider: "CDSE Sentinel Hub Process API",
        mission: "Sentinel-2",
        platform: feature.properties?.platform ?? null,
        collection: "sentinel-2-l2a",
        processing_level: "L2A",
        source_product_ids: ndviIdentity.productIds,
        acquisition_start: ndviIdentity.acquisitionStart ?? feature.properties.datetime,
        acquisition_end:
          ndviIdentity.acquisitionEnd ?? ndviIdentity.acquisitionStart ?? feature.properties.datetime,
        processing_at: processingAt,
        geometry_hash: geometryHash(geometry),
        algorithm_version: MEASUREMENT_VERSIONS.algorithm,
        evalscript_version: MEASUREMENT_VERSIONS.evalscript,
        masking_config_version: MEASUREMENT_VERSIONS.masking,
        crs: `EPSG:${projection.epsg}`,
        quality_output_resolution_m: 20,
        quality_resampling_method: "NEAREST",
        tile_cloud_metadata: {
          catalog_feature_id: feature.id,
          catalog_cloud_cover: feature.properties?.["eo:cloud_cover"] ?? null,
        },
        polygon_cloud_shadow_fraction: ndmi.cloudShadowFraction,
        quality_status: quality.status,
        rejection_reason: quality.reason,
        provider_provenance: {
          provider_scene_ids: ndviIdentity.sceneIds,
          provider_data_paths: ndviIdentity.dataPaths,
          provider_service_version: ndviIdentity.serviceVersion,
          catalog_feature_id: feature.id,
          native_grid_requests: { ndvi_metres: 10, ndmi_metres: 20 },
          source_identity_match: true,
          processing_units: {
            catalog: catalog.processingUnits,
            ndvi: ndviResponse.processingUnits,
            ndmi: ndmiResponse.processingUnits,
            total:
              catalog.processingUnits +
              ndviResponse.processingUnits +
              ndmiResponse.processingUnits,
          },
          attempts: {
            catalog: catalog.attempts,
            ndvi: ndviResponse.attempts,
            ndmi: ndmiResponse.attempts,
          },
        },
        index_stats: [stats("ndvi", ndvi, 10), stats("ndmi", ndmi, 20)],
      };
    },
  };
};
