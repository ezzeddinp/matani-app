import crypto from "node:crypto";
import proj4 from "proj4";

const CRS84 = "http://www.opengis.net/def/crs/OGC/1.3/CRS84";
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

export const validateFieldGeometry = (geometry) => {
  if (geometry?.type !== "Polygon" || !Array.isArray(geometry.coordinates)) {
    throw new Error("geometry-must-be-a-geojson-polygon");
  }
  if (geometry.coordinates.length !== 1) {
    throw new Error("geometry-holes-not-supported");
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
  if (new Set(ring.slice(0, -1).map((point) => point.join(","))).size < 3) {
    throw new Error("polygon-is-degenerate");
  }
  const segmentCount = ring.length - 1;
  for (let left = 0; left < segmentCount; left += 1) {
    for (let right = left + 1; right < segmentCount; right += 1) {
      const adjacent =
        Math.abs(left - right) <= 1 ||
        (left === 0 && right === segmentCount - 1);
      if (
        !adjacent &&
        segmentsCross(ring[left], ring[left + 1], ring[right], ring[right + 1])
      ) {
        throw new Error("polygon-self-intersects");
      }
    }
  }
  const signedDoubleArea = ring.slice(0, -1).reduce(
    (sum, point, index) =>
      sum + point[0] * ring[index + 1][1] - ring[index + 1][0] * point[1],
    0,
  );
  if (Math.abs(signedDoubleArea) <= ORIENTATION_EPSILON) {
    throw new Error("polygon-is-degenerate");
  }
  return geometry;
};

export const geometryHash = (geometry) => {
  const ring = validateFieldGeometry(geometry).coordinates[0]
    .slice(0, -1)
    .map(([longitude, latitude]) => [
      Number(longitude.toFixed(7)),
      Number(latitude.toFixed(7)),
    ]);
  const candidates = [];
  for (const candidateRing of [ring, [...ring].reverse()]) {
    for (let index = 0; index < candidateRing.length; index += 1) {
      candidates.push([
        ...candidateRing.slice(index),
        ...candidateRing.slice(0, index),
      ]);
    }
  }
  candidates.sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
  const canonical = [...candidates[0], candidates[0][0]];
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ crs: "EPSG:4326", ring: canonical }))
    .digest("hex");
};

export const projectGeometryToLocalUtm = (geometry) => {
  const ring = validateFieldGeometry(geometry).coordinates[0];
  const longitude =
    ring.slice(0, -1).reduce((sum, coordinate) => sum + coordinate[0], 0) /
    (ring.length - 1);
  const latitude =
    ring.slice(0, -1).reduce((sum, coordinate) => sum + coordinate[1], 0) /
    (ring.length - 1);
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
  return {
    geometry: {
      type: "Polygon",
      coordinates: [
        ring.map((coordinate) => proj4("EPSG:4326", definition, coordinate)),
      ],
    },
    sourceCrs: CRS84,
    processingCrs: `http://www.opengis.net/def/crs/EPSG/0/${epsg}`,
    epsg,
  };
};

