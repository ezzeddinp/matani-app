import crypto from "node:crypto";

export const CDSE_TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
export const CDSE_STATISTICS_URL =
  "https://sh.dataspace.copernicus.eu/statistics/v1";
export const CRS84 =
  "http://www.opengis.net/def/crs/OGC/1.3/CRS84";

export const PILOT_VERSIONS = Object.freeze({
  algorithm: "ndvi-ndmi-pilot-v1",
  evalscript: "s2l2a-statistics-pilot-v1",
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

const orientation = (a, b, c) =>
  Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));

const segmentsCross = (a, b, c, d) => {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return o1 !== o2 && o3 !== o4;
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

const indexEvalscript = (index) => {
  const definition = INDEX_DEFINITIONS[index];
  if (!definition) throw new Error(`unsupported-index-${index}`);
  return [
    "//VERSION=3",
    "function setup() {",
    "  return {",
    `    input: [{ bands: ${JSON.stringify(definition.bands)} }],`,
    `    output: [{ id: "${index}", bands: 1, sampleType: "FLOAT32" }, { id: "dataMask", bands: 1 }]`,
    "  };",
    "}",
    "function evaluatePixel(sample) {",
    `  const excluded = ${JSON.stringify(MASKED_SCL)}.includes(sample.SCL);`,
    `  const denominator = ${index === "ndvi" ? "sample.B08 + sample.B04" : "sample.B08 + sample.B11"};`,
    `  const value = denominator === 0 ? 0 : ${definition.formula};`,
    `  return { ${index}: [value], dataMask: [sample.dataMask && !excluded ? 1 : 0] };`,
    "}",
  ].join("\n");
};

const qualityEvalscript = () =>
  [
    "//VERSION=3",
    "function setup() {",
    "  return {",
    '    input: [{ bands: ["SCL", "dataMask"] }],',
    '    output: [{ id: "quality", bands: [{ name: "cloudShadow" }, { name: "invalid" }], sampleType: "FLOAT32" }, { id: "dataMask", bands: 1 }]',
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
  return {
    input: {
      bounds: {
        geometry,
        properties: { crs: CRS84 },
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

export const summarizeResponses = ({
  field,
  from,
  to,
  qualityResponse,
  ndviResponse,
  ndmiResponse,
  quota,
}) => {
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
    row.geometry_pixel_count_20m = item.geometryPixelCount ?? null;
    row.polygon_cloud_shadow_fraction =
      statsForBand(item, "quality", "cloudShadow")?.mean ?? null;
    row.polygon_invalid_fraction =
      statsForBand(item, "quality", "invalid")?.mean ?? null;
  }
  for (const [index, response] of [
    ["ndvi", ndviResponse],
    ["ndmi", ndmiResponse],
  ]) {
    for (const item of response?.data ?? []) {
      const row = ensure(item);
      const stats = statsForBand(item, index);
      row[`${index}_stats`] = stats
        ? {
            min: stats.min,
            max: stats.max,
            mean: stats.mean,
            stdev: stats.stDev,
            sample_count: stats.sampleCount,
            no_data_count: stats.noDataCount,
            valid_pixel_count: Math.max(
              0,
              (stats.sampleCount ?? 0) - (stats.noDataCount ?? 0),
            ),
          }
        : null;
      row[`geometry_pixel_count_${index === "ndvi" ? "10m" : "20m"}`] =
        item.geometryPixelCount ?? null;
    }
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
      geometry_hash: geometryHash(field.geometry),
      identifiers_omitted_from_output: true,
      geometry_omitted_from_output: true,
    },
    window: { from, to, aggregation: "P1D" },
    provider: "CDSE Sentinel Hub Statistical API",
    collection: "sentinel-2-l2a",
    crs: "CRS84 / EPSG:4326 coordinates",
    resolutions: { ndvi_metres: 10, ndmi_metres: 20, quality_metres: 20 },
    resampling: { method: "NEAREST", status: "pilot-provisional" },
    versions: PILOT_VERSIONS,
    requests: 3,
    quota,
    observations: [...byInterval.values()].sort((a, b) =>
      a.acquisition_interval.from.localeCompare(b.acquisition_interval.from),
    ),
    limitations: [
      "Pilot output is prototype, not a persisted provenance-complete Matani measurement.",
      "HYP-03 has no validated valid-pixel reliability floor; quality is not marked passed.",
      "Product/acquisition identity and independent raster comparison are not included.",
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
