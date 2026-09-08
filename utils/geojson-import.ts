export type ImportedFieldPolygon = {
  coordinates: { latitude: number; longitude: number }[];
  suggestedName: string | null;
};

export type ExportedFieldGeoJson = {
  fileName: string;
  text: string;
};

export type GeoJsonImportErrorCode =
  | "INVALID_JSON"
  | "UNSUPPORTED_CRS"
  | "POLYGON_REQUIRED"
  | "ONE_POLYGON_REQUIRED"
  | "HOLES_NOT_SUPPORTED"
  | "VERTEX_COUNT_INVALID"
  | "COORDINATE_INVALID"
  | "POLYGON_DEGENERATE"
  | "POLYGON_SELF_INTERSECTS";

export class GeoJsonImportError extends Error {
  readonly code: GeoJsonImportErrorCode;

  constructor(code: GeoJsonImportErrorCode, message: string) {
    super(message);
    this.name = "GeoJsonImportError";
    this.code = code;
  }
}

const fail = (code: GeoJsonImportErrorCode, message: string): never => {
  throw new GeoJsonImportError(code, message);
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readCrsName = (document: Record<string, unknown>) => {
  const crs = asRecord(document.crs);
  const properties = asRecord(crs?.properties);
  return typeof properties?.name === "string" ? properties.name.toUpperCase() : null;
};

const validateCrs = (document: Record<string, unknown>) => {
  const crsName = readCrsName(document);
  const isWgs84 =
    crsName?.includes("CRS84") ||
    (crsName?.includes("EPSG") && crsName.endsWith("4326"));
  if (
    crsName &&
    !isWgs84
  ) {
    fail(
      "UNSUPPORTED_CRS",
      "GeoJSON harus memakai koordinat WGS84 (EPSG:4326), dengan urutan longitude lalu latitude.",
    );
  }
};

const extractGeometry = (document: Record<string, unknown>) => {
  if (document.type === "FeatureCollection") {
    const features = document.features;
    if (!Array.isArray(features)) {
      throw new GeoJsonImportError(
        "POLYGON_REQUIRED",
        "FeatureCollection tidak memiliki daftar feature yang valid.",
      );
    }
    const featureList = features as unknown[];
    if (featureList.length === 0) {
      fail(
        "POLYGON_REQUIRED",
        "GeoJSON tidak berisi polygon (features masih kosong). Di QGIS, selesaikan gambar, simpan edit layer, lalu ekspor ulang.",
      );
    }
    if (featureList.length !== 1) {
      fail("ONE_POLYGON_REQUIRED", "Pilih file yang berisi tepat satu polygon lahan.");
    }
    const feature = asRecord(featureList[0]);
    return {
      geometry: asRecord(feature?.geometry),
      properties: asRecord(feature?.properties),
    };
  }
  if (document.type === "Feature") {
    return {
      geometry: asRecord(document.geometry),
      properties: asRecord(document.properties),
    };
  }
  return { geometry: document, properties: null };
};

const samePoint = (left: number[], right: number[]) =>
  left[0] === right[0] && left[1] === right[1];

const orientation = (a: number[], b: number[], c: number[]) => {
  const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return Math.abs(cross) <= 1e-12 ? 0 : Math.sign(cross);
};

const onSegment = (point: number[], start: number[], end: number[]) =>
  orientation(start, end, point) === 0 &&
  point[0] >= Math.min(start[0], end[0]) &&
  point[0] <= Math.max(start[0], end[0]) &&
  point[1] >= Math.min(start[1], end[1]) &&
  point[1] <= Math.max(start[1], end[1]);

const segmentsCross = (a: number[], b: number[], c: number[], d: number[]) => {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return (
    (o1 * o2 < 0 && o3 * o4 < 0) ||
    (o1 === 0 && onSegment(c, a, b)) ||
    (o2 === 0 && onSegment(d, a, b)) ||
    (o3 === 0 && onSegment(a, c, d)) ||
    (o4 === 0 && onSegment(b, c, d))
  );
};

const validateSimpleRing = (ring: unknown[]) => {
  const parsed = ring.map((point) => {
    const longitude = Array.isArray(point) ? point[0] : null;
    const latitude = Array.isArray(point) ? point[1] : null;
    if (
      !Array.isArray(point) ||
      point.length < 2 ||
      typeof longitude !== "number" ||
      typeof latitude !== "number" ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      fail("COORDINATE_INVALID", "Koordinat GeoJSON tidak valid atau bukan WGS84.");
    }
    return [longitude, latitude];
  });

  if (parsed.length > 1 && samePoint(parsed[0], parsed.at(-1)!)) parsed.pop();
  if (parsed.length < 3 || parsed.length > 249) {
    fail("VERTEX_COUNT_INVALID", "Polygon harus memiliki 3 sampai 249 titik.");
  }
  if (new Set(parsed.map((point) => point.join(","))).size < 3) {
    fail("POLYGON_DEGENERATE", "Polygon harus memiliki sedikitnya tiga titik yang berbeda.");
  }

  const segmentCount = parsed.length;
  for (let left = 0; left < segmentCount; left += 1) {
    const leftEnd = (left + 1) % segmentCount;
    for (let right = left + 1; right < segmentCount; right += 1) {
      const rightEnd = (right + 1) % segmentCount;
      const adjacent =
        left === right || leftEnd === right || rightEnd === left ||
        (left === 0 && rightEnd === 0);
      if (!adjacent && segmentsCross(parsed[left], parsed[leftEnd], parsed[right], parsed[rightEnd])) {
        fail("POLYGON_SELF_INTERSECTS", "Garis polygon saling berpotongan. Perbaiki geometry sebelum diimpor.");
      }
    }
  }

  const signedDoubleArea = parsed.reduce((sum, point, index) => {
    const next = parsed[(index + 1) % parsed.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0);
  if (Math.abs(signedDoubleArea) <= 1e-12) {
    fail("POLYGON_DEGENERATE", "Polygon tidak memiliki luas yang dapat diukur.");
  }
  return parsed;
};

const suggestedName = (properties: Record<string, unknown> | null, fileName?: string) => {
  for (const key of ["name", "nama", "title", "field_name"]) {
    const value = properties?.[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 80);
  }
  const fromFile = fileName?.replace(/\.(?:geo)?json$/i, "").trim();
  return fromFile ? fromFile.slice(0, 80) : null;
};

export const parseFieldGeoJson = (text: string, fileName?: string): ImportedFieldPolygon => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    fail("INVALID_JSON", "File tidak berisi JSON yang valid.");
  }
  const document = asRecord(parsed);
  if (!document) throw new GeoJsonImportError("INVALID_JSON", "Isi GeoJSON harus berupa object JSON.");
  validateCrs(document);
  const { geometry, properties } = extractGeometry(document);
  if (geometry?.type !== "Polygon" || !Array.isArray(geometry.coordinates)) {
    throw new GeoJsonImportError(
      "POLYGON_REQUIRED",
      "Matani hanya menerima satu geometry Polygon.",
    );
  }
  const rings = geometry.coordinates as unknown[];
  if (rings.length !== 1) {
    fail("HOLES_NOT_SUPPORTED", "Polygon dengan lubang belum didukung.");
  }
  const ring = rings[0];
  if (!Array.isArray(ring)) {
    throw new GeoJsonImportError("POLYGON_REQUIRED", "Koordinat Polygon tidak valid.");
  }
  const coordinates = validateSimpleRing(ring as unknown[]).map(([longitude, latitude]) => ({
    latitude,
    longitude,
  }));
  return { coordinates, suggestedName: suggestedName(properties, fileName) };
};

export const calculatePolygonAreaHa = (
  coordinates: { latitude: number; longitude: number }[],
) => {
  if (coordinates.length < 3) return 0;
  const earthRadius = 6_378_137;
  const radians = Math.PI / 180;
  const meanLatitude =
    coordinates.reduce((sum, point) => sum + point.latitude, 0) /
    coordinates.length;
  const latitudeScale = Math.cos(meanLatitude * radians);
  const metric = coordinates.map((point) => ({
    x: earthRadius * point.longitude * radians * latitudeScale,
    y: earthRadius * point.latitude * radians,
  }));
  const doubleArea = metric.reduce((sum, point, index) => {
    const next = metric[(index + 1) % metric.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0);
  return Math.abs(doubleArea) / 2 / 10_000;
};

const safeGeoJsonFileStem = (name: string) => {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return cleaned.slice(0, 60) || "lahan-matani";
};

export const buildFieldGeoJson = (
  name: string,
  coordinates: { latitude: number; longitude: number }[],
): ExportedFieldGeoJson => {
  const openRing = validateSimpleRing(
    coordinates.map(({ longitude, latitude }) => [longitude, latitude]),
  );
  const closedRing = [...openRing, [...openRing[0]]];
  const normalizedName = name.trim().slice(0, 80) || "Lahan Matani";
  const document = {
    type: "FeatureCollection",
    name: safeGeoJsonFileStem(normalizedName),
    features: [
      {
        type: "Feature",
        properties: {
          name: normalizedName,
          source: "Matani",
        },
        geometry: {
          type: "Polygon",
          coordinates: [closedRing],
        },
      },
    ],
  };
  return {
    fileName: `${safeGeoJsonFileStem(normalizedName)}.geojson`,
    text: JSON.stringify(document, null, 2),
  };
};
