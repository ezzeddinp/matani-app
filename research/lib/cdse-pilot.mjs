import crypto from "node:crypto";
import proj4 from "proj4";

export const CDSE_TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
export const CDSE_STATISTICS_URL =
  "https://sh.dataspace.copernicus.eu/statistics/v1";
export const CDSE_CATALOG_URL =
  "https://sh.dataspace.copernicus.eu/catalog/v1/search";
export const CDSE_PROCESS_URL =
  "https://sh.dataspace.copernicus.eu/process/v1";
export const CRS84 =
  "http://www.opengis.net/def/crs/OGC/1.3/CRS84";

export const PILOT_VERSIONS = Object.freeze({
  algorithm: "ndvi-ndmi-pilot-v3",
  evalscript: "s2l2a-statistics-pilot-v3",
  masking: "s2l2a-scl-rice-pilot-v1",
});

const MASKED_SCL = Object.freeze([0, 1, 3, 8, 9, 10]);
const CLOUD_SHADOW_SCL = Object.freeze([3, 8, 9, 10]);

const INDEX_DEFINITIONS = Object.freeze({
  ndvi: {
    bands: ["B04", "B08", "SCL", "dataMask"],
    formula: "(sample.B08 - sample.B04) / (sample.B08 + sample.B04)",
    resolution: 10,
    resampling: "NEAREST",
  },
  ndmi: {
    bands: ["B08", "B11", "SCL", "dataMask"],
    formula: "(sample.B08 - sample.B11) / (sample.B08 + sample.B11)",
    resolution: 20,
    resampling: "NEAREST",
  },
});

const ORIENTATION_EPSILON = 1e-12;
const orientation = (a, b, c) => {
  const cross =
    (b[0] - a[0]) * (c[1] - a[1]) -
    (b[1] - a[1]) * (c[0] - a[0]);
  return Math.abs(cross) <= ORIENTATION_EPSILON ? 0 : Math.sign(cross);
};

const pointOnSegment = (point, start, end) =>
  orientation(start, end, point) === 0 &&
  point[0] >= Math.min(start[0], end[0]) &&
  point[0] <= Math.max(start[0], end[0]) &&
  point[1] >= Math.min(start[1], end[1]) &&
  point[1] <= Math.max(start[1], end[1]);

const segmentsCross = (a, b, c, d) => {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 * o2 < 0 && o3 * o4 < 0) return true;
  return (
    (o1 === 0 && pointOnSegment(c, a, b)) ||
    (o2 === 0 && pointOnSegment(d, a, b)) ||
    (o3 === 0 && pointOnSegment(a, c, d)) ||
    (o4 === 0 && pointOnSegment(b, c, d))
  );
};

export const validatePilotGeometry = (geometry) => {
  if (geometry?.type !== "Polygon" || !Array.isArray(geometry.coordinates)) {
    throw new Error("geometry-must-be-a-geojson-polygon");
  }
  if (geometry.coordinates.length !== 1) {
    throw new Error("pilot-supports-one-exterior-ring-without-holes");
  }
  const ring = geometry.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4 || ring.length > 250) {
    throw new Error("polygon-vertex-count-out-of-bounds");
  }
  for (const point of ring) {
    if (
      !Array.isArray(point) ||
      point.length < 2 ||
      !Number.isFinite(point[0]) ||
      !Number.isFinite(point[1]) ||
      point[0] < -180 ||
      point[0] > 180 ||
      point[1] < -90 ||
      point[1] > 90
    ) {
      throw new Error("invalid-wgs84-coordinate");
    }
  }
  const first = ring[0];
  const last = ring.at(-1);
  if (first[0] !== last[0] || first[1] !== last[1]) {
    throw new Error("polygon-ring-must-be-closed");
  }
  const unique = new Set(ring.slice(0, -1).map((point) => point.join(",")));
  if (unique.size < 3) throw new Error("polygon-is-degenerate");
  const segmentCount = ring.length - 1;
  for (let left = 0; left < segmentCount; left += 1) {
    for (let right = left + 1; right < segmentCount; right += 1) {
      const adjacent =
        Math.abs(left - right) <= 1 ||
        (left === 0 && right === segmentCount - 1);
      if (
        !adjacent &&
        segmentsCross(
          ring[left],
          ring[left + 1],
          ring[right],
          ring[right + 1],
        )
      ) {
        throw new Error("polygon-self-intersects");
      }
    }
  }
  const signedDoubleArea = ring
    .slice(0, -1)
    .reduce(
      (sum, point, index) =>
        sum +
        point[0] * ring[index + 1][1] -
        ring[index + 1][0] * point[1],
      0,
    );
  if (Math.abs(signedDoubleArea) <= ORIENTATION_EPSILON) {
    throw new Error("polygon-is-degenerate");
  }
  return geometry;
};

export const geometryHash = (geometry) => {
  const ring = validatePilotGeometry(geometry).coordinates[0]
    .slice(0, -1)
    .map(([longitude, latitude]) => [
      Number(longitude.toFixed(7)),
      Number(latitude.toFixed(7)),
    ]);
  const candidates = [];
  for (const orientation of [ring, [...ring].reverse()]) {
    for (let index = 0; index < orientation.length; index += 1) {
      candidates.push([
        ...orientation.slice(index),
        ...orientation.slice(0, index),
      ]);
    }
  }
  candidates.sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
  const canonical = [...candidates[0], candidates[0][0]];
  const payload = JSON.stringify({
    crs: "EPSG:4326",
    ring: canonical,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
};

const meanCoordinate = (ring, index) =>
  ring.slice(0, -1).reduce((sum, coordinate) => sum + coordinate[index], 0) /
  (ring.length - 1);

export const projectGeometryToLocalUtm = (geometry) => {
  const ring = validatePilotGeometry(geometry).coordinates[0];
  const longitude = meanCoordinate(ring, 0);
  const latitude = meanCoordinate(ring, 1);
  if (latitude < -80 || latitude > 84) {
    throw new Error("polygon-outside-utm-latitude-range");
  }

  const zone = Math.min(60, Math.max(1, Math.floor((longitude + 180) / 6) + 1));
  const south = latitude < 0;
  const epsg = (south ? 32700 : 32600) + zone;
  const definition = [
    "+proj=utm",
    `+zone=${zone}`,
    south ? "+south" : "",
    "+datum=WGS84",
    "+units=m",
    "+no_defs",
    "+type=crs",
  ]
    .filter(Boolean)
    .join(" ");
  const projectedRing = ring.map((coordinate) =>
    proj4("EPSG:4326", definition, coordinate),
  );

  return {
    geometry: {
      type: "Polygon",
      coordinates: [projectedRing],
    },
    source_crs: CRS84,
    processing_crs: `http://www.opengis.net/def/crs/EPSG/0/${epsg}`,
    epsg,
    zone,
    hemisphere: south ? "south" : "north",
  };
};

const indexEvalscript = (index) => {
  const definition = INDEX_DEFINITIONS[index];
  if (!definition) throw new Error(`unsupported-index-${index}`);
  return [
    "//VERSION=3",
    "function setup() {",
    "  return {",
    `    input: [{ bands: ${JSON.stringify(definition.bands)} }],`,
    `    output: [{ id: "${index}", bands: 1, sampleType: "FLOAT32" }, { id: "coverage", bands: 1, sampleType: "UINT8" }, { id: "dataMask", bands: ["${index}", "coverage"] }]`,
    "  };",
    "}",
    "function evaluatePixel(sample) {",
    `  const excluded = ${JSON.stringify(MASKED_SCL)}.includes(sample.SCL);`,
    `  const denominator = ${index === "ndvi" ? "sample.B08 + sample.B04" : "sample.B08 + sample.B11"};`,
    `  const value = denominator === 0 ? 0 : ${definition.formula};`,
    "  const sourceMask = sample.dataMask ? 1 : 0;",
    "  const indexMask = sourceMask && !excluded && denominator !== 0 ? 1 : 0;",
    `  return { ${index}: [value], coverage: [1], dataMask: [indexMask, sourceMask] };`,
    "}",
  ].join("\n");
};

const qualityEvalscript = () =>
  [
    "//VERSION=3",
    "function setup() {",
    "  return {",
    '    input: [{ bands: ["SCL", "dataMask"] }],',
    '    output: [{ id: "quality", bands: ["cloudShadow", "invalid"], sampleType: "FLOAT32" }, { id: "dataMask", bands: 1 }]',
    "  };",
    "}",
    "function evaluatePixel(sample) {",
    `  const cloudShadow = ${JSON.stringify(CLOUD_SHADOW_SCL)}.includes(sample.SCL) ? 1 : 0;`,
    "  const invalid = [0, 1].includes(sample.SCL) ? 1 : 0;",
    "  return { quality: [cloudShadow, invalid], dataMask: [sample.dataMask] };",
    "}",
  ].join("\n");

const assertWindow = (from, to) => {
  const start = new Date(from);
  const end = new Date(to);
  if (!Number.isFinite(start.valueOf()) || !Number.isFinite(end.valueOf()) || start >= end) {
    throw new Error("invalid-pilot-window");
  }
  const days = (end - start) / 86_400_000;
  if (days > 31) throw new Error("pilot-window-exceeds-31-days");
};

export const buildStatisticalRequest = ({
  geometry,
  from,
  to,
  output,
}) => {
  validatePilotGeometry(geometry);
  assertWindow(from, to);
  const definition = output === "quality" ? null : INDEX_DEFINITIONS[output];
  if (output !== "quality" && !definition) {
    throw new Error("unsupported-pilot-output");
  }
  const resolution = output === "quality" ? 20 : definition.resolution;
  const resampling = output === "quality" ? "NEAREST" : definition.resampling;
  const projection = projectGeometryToLocalUtm(geometry);
  return {
    input: {
      bounds: {
        geometry: projection.geometry,
        properties: { crs: projection.processing_crs },
      },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: { from, to },
            mosaickingOrder: "mostRecent",
          },
          processing: {
            upsampling: resampling,
            downsampling: resampling,
            harmonizeValues: true,
          },
        },
      ],
    },
    aggregation: {
      timeRange: { from, to },
      aggregationInterval: { of: "P1D" },
      evalscript: output === "quality" ? qualityEvalscript() : indexEvalscript(output),
      resx: resolution,
      resy: resolution,
    },
  };
};

export const buildCatalogRequest = ({ geometry, from, to }) => {
  validatePilotGeometry(geometry);
  assertWindow(from, to);
  return {
    collections: ["sentinel-2-l2a"],
    datetime: `${from}/${to}`,
    intersects: geometry,
    limit: 100,
  };
};

const sourceProvenanceEvalscript = () =>
  [
    "//VERSION=3",
    "function setup() {",
    "  return {",
    '    input: [{ bands: ["dataMask"], metadata: ["bounds"] }],',
    "    mosaicking: Mosaicking.ORBIT,",
    '    output: { id: "default", bands: 1, sampleType: "UINT8" }',
    "  };",
    "}",
    "function evaluatePixel(samples) {",
    "  return [samples && samples.length && samples[0].dataMask ? 1 : 0];",
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

export const buildProcessProvenanceRequest = ({ geometry, from, to }) => {
  validatePilotGeometry(geometry);
  assertWindow(from, to);
  const projection = projectGeometryToLocalUtm(geometry);
  return {
    input: {
      bounds: {
        geometry: projection.geometry,
        properties: { crs: projection.processing_crs },
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
      resx: 20,
      resy: 20,
      responses: [
        { identifier: "userdata", format: { type: "application/json" } },
      ],
    },
    evalscript: sourceProvenanceEvalscript(),
  };
};

export const buildPreflightReport = ({ fields, from, to }) => {
  if (!Array.isArray(fields) || fields.length < 1 || fields.length > 2) {
    throw new Error("pilot-requires-one-or-two-fields");
  }
  const reports = fields.map((field) => {
    validatePilotGeometry(field.geometry);
    const areaSquareMetres = Number(field.area_ha) * 10_000;
    return {
      field_reference_hash: crypto
        .createHash("sha256")
        .update(String(field.id))
        .digest("hex"),
      geometry_hash: geometryHash(field.geometry),
      geometry_omitted_from_output: true,
      category: field.category,
      area_ha: field.area_ha,
      theoretical_unmasked_pixel_capacity: {
        ndvi_10m: areaSquareMetres / 100,
        ndmi_20m: areaSquareMetres / 400,
        interpretation:
          "Area/pixel-footprint ratio only; not an observed or valid-pixel count.",
      },
      request_contract: {
        exact_polygon: true,
        bbox_substitution: false,
        outputs: {
          quality: {
            resolution_metres: buildStatisticalRequest({
              geometry: field.geometry,
              from,
              to,
              output: "quality",
            }).aggregation.resx,
          },
          ndvi: {
            resolution_metres: buildStatisticalRequest({
              geometry: field.geometry,
              from,
              to,
              output: "ndvi",
            }).aggregation.resx,
          },
          ndmi: {
            resolution_metres: buildStatisticalRequest({
              geometry: field.geometry,
              from,
              to,
              output: "ndmi",
            }).aggregation.resx,
          },
        },
        scl_excluded: MASKED_SCL,
        scl_water_kept: true,
        requests_if_live: 3,
      },
    };
  });
  return {
    execution: "preflight-only",
    data_state: "prototype",
    claim_allowed: false,
    network_called: false,
    window: { from, to },
    versions: PILOT_VERSIONS,
    reports,
    limitations: [
      "No provider request was made.",
      "Theoretical pixel capacity is not a valid-pixel observation.",
      "Crop identity, field-boundary fidelity, consent, and representativeness remain unverified.",
    ],
  };
};

const statsForBand = (item, output, band = "B0") =>
  item?.outputs?.[output]?.bands?.[band]?.stats ?? null;

const finiteNumberOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const pixelAccounting = (stats) => {
  if (!stats) return null;
  const sampleCount = finiteNumberOrNull(stats.sampleCount);
  const noDataCount = finiteNumberOrNull(stats.noDataCount);
  const validPixelCount =
    sampleCount === null || noDataCount === null
      ? null
      : Math.max(0, sampleCount - noDataCount);
  return {
    sample_count: sampleCount,
    no_data_count: noDataCount,
    valid_pixel_count: validPixelCount,
  };
};

export const summarizeResponses = ({
  field,
  from,
  to,
  qualityResponse,
  ndviResponse,
  ndmiResponse,
  catalogResponse,
  quota,
}) => {
  const projection = projectGeometryToLocalUtm(field.geometry);
  const byInterval = new Map();
  const ensure = (item) => {
    const key = item.interval.from;
    if (!byInterval.has(key)) {
      byInterval.set(key, {
        acquisition_interval: item.interval,
        data_state: "prototype",
        quality_decision: "not-evaluated-hyp-03",
      });
    }
    return byInterval.get(key);
  };

  for (const item of qualityResponse?.data ?? []) {
    const row = ensure(item);
    const cloudShadowStats = statsForBand(
      item,
      "quality",
      "cloudShadow",
    );
    row.geometry_pixel_count_20m = item.geometryPixelCount ?? null;
    row.polygon_cloud_shadow_fraction =
      finiteNumberOrNull(cloudShadowStats?.mean);
    row.polygon_invalid_fraction =
      finiteNumberOrNull(statsForBand(item, "quality", "invalid")?.mean);
    row.quality_source_pixel_count_20m =
      pixelAccounting(cloudShadowStats)?.valid_pixel_count ?? null;
  }
  for (const [index, response] of [
    ["ndvi", ndviResponse],
    ["ndmi", ndmiResponse],
  ]) {
    for (const item of response?.data ?? []) {
      const row = ensure(item);
      const stats = statsForBand(item, index);
      const accounting = pixelAccounting(stats);
      const coverageAccounting = pixelAccounting(
        statsForBand(item, "coverage"),
      );
      row[`${index}_stats`] = stats
        ? {
            min: finiteNumberOrNull(stats.min),
            max: finiteNumberOrNull(stats.max),
            mean: finiteNumberOrNull(stats.mean),
            stdev: finiteNumberOrNull(stats.stDev),
            ...accounting,
          }
        : null;
      row[`${index}_source_pixel_count`] =
        coverageAccounting?.valid_pixel_count ?? null;
      row[`${index}_valid_pixel_fraction`] =
        accounting?.valid_pixel_count !== null &&
        coverageAccounting?.valid_pixel_count > 0
          ? accounting.valid_pixel_count /
            coverageAccounting.valid_pixel_count
          : null;
      row[`geometry_pixel_count_${index === "ndvi" ? "10m" : "20m"}`] =
        item.geometryPixelCount ?? null;
    }
  }

  for (const feature of catalogResponse?.features ?? []) {
    const acquiredAt = feature?.properties?.datetime;
    if (!feature?.id || !acquiredAt) continue;
    const matching = [...byInterval.values()].find(
      (row) =>
        acquiredAt >= row.acquisition_interval.from &&
        acquiredAt < row.acquisition_interval.to,
    );
    if (!matching) continue;
    if (!matching.source_product_candidates) {
      matching.source_product_candidates = [];
    }
    matching.source_product_candidates.push({
      id: feature.id,
      acquired_at: acquiredAt,
    });
  }
  for (const row of byInterval.values()) {
    row.source_product_candidates = (row.source_product_candidates ?? []).sort(
      (left, right) => left.acquired_at.localeCompare(right.acquired_at),
    );
    row.source_product_identity_status =
      "catalog-candidates-not-statistical-selection-proof";
  }

  return {
    execution: "bounded-live-smoke",
    data_state: "prototype",
    field: {
      field_reference_hash: crypto
        .createHash("sha256")
        .update(String(field.id))
        .digest("hex"),
      category: field.category,
      area_ha: field.area_ha,
      ...(field.site_id ? { site_id: field.site_id } : {}),
      ...(field.region ? { region: field.region } : {}),
      ...(field.verification
        ? {
            verification_declarations: Object.fromEntries(
              Object.entries(field.verification).map(([name, value]) => [
                name,
                { status: value.status, method: value.method },
              ]),
            ),
            verification_evidence_references_omitted: true,
          }
        : {}),
      geometry_hash: geometryHash(field.geometry),
      identifiers_omitted_from_output: true,
      geometry_omitted_from_output: true,
    },
    window: { from, to, aggregation: "P1D" },
    provider: "CDSE Sentinel Hub Statistical API",
    collection: "sentinel-2-l2a",
    crs: {
      stored_geometry: "CRS84 / EPSG:4326 coordinates",
      processing_grid: `EPSG:${projection.epsg}`,
      utm_zone: projection.zone,
      hemisphere: projection.hemisphere,
    },
    resolutions: { ndvi_metres: 10, ndmi_metres: 20, quality_metres: 20 },
    resampling: { method: "NEAREST", status: "pilot-provisional" },
    versions: PILOT_VERSIONS,
    requests: catalogResponse ? 4 : 3,
    quota,
    observations: [...byInterval.values()].sort((a, b) =>
      a.acquisition_interval.from.localeCompare(b.acquisition_interval.from),
    ),
    limitations: [
      "Pilot output is prototype, not a persisted provenance-complete Matani measurement.",
      "HYP-03 has no validated valid-pixel reliability floor; quality is not marked passed.",
      ...(catalogResponse
        ? [
            "Catalog product IDs are intersecting candidates; the Statistical API response does not prove which candidate pixels entered its mosaic.",
          ]
        : ["Product/acquisition identity is not included."]),
      "Independent raster comparison is not included.",
      "Crop identity, field-boundary accuracy, and consent are supplied externally and not proven by this request.",
    ],
  };
};

const responseJson = async (response, label) => {
  const body = await response.text();
  let parsed;
  try {
    parsed = body ? JSON.parse(body) : {};
  } catch {
    throw new Error(`${label}-returned-non-json`);
  }
  if (!response.ok) {
    const error = new Error(`${label}-failed-${response.status}`);
    error.statusCode = response.status;
    error.providerBody = parsed;
    error.retryAfterSeconds =
      finiteNumberOrNull(response.headers.get("retry-after")) ?? null;
    throw error;
  }
  return parsed;
};

export const fetchCdseToken = async ({
  clientId,
  clientSecret,
  tokenUrl = CDSE_TOKEN_URL,
  fetchImpl = fetch,
}) => {
  if (!clientId || !clientSecret) throw new Error("cdse-credentials-missing");
  const response = await fetchImpl(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await responseJson(response, "cdse-token");
  if (!data.access_token) throw new Error("cdse-token-missing");
  return data.access_token;
};

export const executeStatisticalRequest = async ({
  token,
  request,
  statisticsUrl = CDSE_STATISTICS_URL,
  fetchImpl = fetch,
}) => {
  const response = await fetchImpl(statisticsUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(30_000),
  });
  return {
    body: await responseJson(response, "cdse-statistics"),
    processingUnits:
      Number(response.headers.get("x-processingunits-spent")) || null,
  };
};

export const executeCatalogRequest = async ({
  token,
  request,
  catalogUrl = CDSE_CATALOG_URL,
  fetchImpl = fetch,
}) => {
  const response = await fetchImpl(catalogUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/geo+json",
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await responseJson(response, "cdse-catalog");
  if (body?.context?.next || body?.links?.some((link) => link.rel === "next")) {
    throw new Error("cdse-catalog-result-exceeds-bounded-100-item-page");
  }
  return {
    body,
    processingUnits:
      Number(response.headers.get("x-processingunits-spent")) || null,
  };
};

export const executeProcessProvenanceRequest = async ({
  token,
  request,
  processUrl = CDSE_PROCESS_URL,
  fetchImpl = fetch,
}) => {
  const response = await fetchImpl(processUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(30_000),
  });
  return {
    body: await responseJson(response, "cdse-process-provenance"),
    processingUnits:
      Number(response.headers.get("x-processingunits-spent")) || null,
  };
};

export const executeProcessProvenanceRequestWithRetry = async ({
  maxAttempts = 3,
  sleepImpl = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  ...request
}) => {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const result = await executeProcessProvenanceRequest(request);
      return { ...result, attempts: attempt };
    } catch (error) {
      const retryable =
        error?.statusCode === 429 ||
        (error?.statusCode >= 500 && error?.statusCode <= 599);
      if (!retryable || attempt >= maxAttempts) {
        error.attempts = attempt;
        throw error;
      }
      const providerDelay = Number(error.retryAfterSeconds) * 1000;
      const exponentialDelay = 1000 * 2 ** (attempt - 1);
      await sleepImpl(
        Math.min(
          15_000,
          Math.max(
            Number.isFinite(providerDelay) ? providerDelay : 0,
            exponentialDelay,
          ),
        ),
      );
    }
  }
  throw new Error("unreachable-process-provenance-retry-state");
};

export const executeCatalogRequestWithRetry = async ({
  maxAttempts = 5,
  sleepImpl = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  ...request
}) => {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const result = await executeCatalogRequest(request);
      return { ...result, attempts: attempt };
    } catch (error) {
      const retryable =
        error?.statusCode === 429 ||
        (error?.statusCode >= 500 && error?.statusCode <= 599);
      if (!retryable || attempt >= maxAttempts) {
        error.attempts = attempt;
        throw error;
      }
      const providerDelay = Number(error.retryAfterSeconds) * 1000;
      const exponentialDelay = 1000 * 2 ** (attempt - 1);
      await sleepImpl(
        Math.min(
          15_000,
          Math.max(
            Number.isFinite(providerDelay) ? providerDelay : 0,
            exponentialDelay,
          ),
        ),
      );
    }
  }
  throw new Error("unreachable-catalog-retry-state");
};

export const executeStatisticalRequestWithRetry = async ({
  maxAttempts = 5,
  sleepImpl = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  ...request
}) => {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const result = await executeStatisticalRequest(request);
      return { ...result, attempts: attempt };
    } catch (error) {
      const retryable =
        error?.statusCode === 429 ||
        (error?.statusCode >= 500 && error?.statusCode <= 599);
      if (!retryable || attempt >= maxAttempts) {
        error.attempts = attempt;
        throw error;
      }
      const providerDelay = Number(error.retryAfterSeconds) * 1000;
      const exponentialDelay = 1000 * 2 ** (attempt - 1);
      await sleepImpl(
        Math.min(
          15_000,
          Math.max(
            Number.isFinite(providerDelay) ? providerDelay : 0,
            exponentialDelay,
          ),
        ),
      );
    }
  }
  throw new Error("unreachable-statistical-retry-state");
};
