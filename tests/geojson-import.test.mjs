import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFieldGeoJson,
  calculatePolygonAreaHa,
  GeoJsonImportError,
  parseFieldGeoJson,
} from "../utils/geojson-import.ts";

const ring = [
  [107.455, -6.304],
  [107.456, -6.304],
  [107.456, -6.305],
  [107.455, -6.305],
  [107.455, -6.304],
];

test("imports a single Polygon Feature and removes its closing display vertex", () => {
  const result = parseFieldGeoJson(
    JSON.stringify({
      type: "Feature",
      properties: { name: "Sawah Validasi" },
      geometry: { type: "Polygon", coordinates: [ring] },
    }),
    "fallback.geojson",
  );
  assert.equal(result.suggestedName, "Sawah Validasi");
  assert.equal(result.coordinates.length, 4);
  assert.deepEqual(result.coordinates[0], { longitude: 107.455, latitude: -6.304 });
  assert.ok(calculatePolygonAreaHa(result.coordinates) > 1);
});

test("accepts one Polygon FeatureCollection and suggests a filename-based name", () => {
  const result = parseFieldGeoJson(
    JSON.stringify({
      type: "FeatureCollection",
      crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::4326" } },
      features: [
        { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } },
      ],
    }),
    "blok-b.geojson",
  );
  assert.equal(result.suggestedName, "blok-b");
});

test("exports a Copernicus-compatible single-feature WGS84 polygon and round-trips it", () => {
  const coordinates = ring.slice(0, -1).map(([longitude, latitude]) => ({
    longitude,
    latitude,
  }));
  const exported = buildFieldGeoJson("Sawah Blok A", coordinates);
  const document = JSON.parse(exported.text);
  assert.equal(exported.fileName, "sawah-blok-a.geojson");
  assert.equal(document.type, "FeatureCollection");
  assert.equal(document.features.length, 1);
  assert.equal(document.features[0].geometry.type, "Polygon");
  assert.deepEqual(
    document.features[0].geometry.coordinates[0][0],
    document.features[0].geometry.coordinates[0].at(-1),
  );
  assert.equal(document.crs, undefined);
  const imported = parseFieldGeoJson(exported.text, exported.fileName);
  assert.deepEqual(imported.coordinates, coordinates);
  assert.equal(imported.suggestedName, "Sawah Blok A");
});

test("explains that an empty QGIS FeatureCollection has no polygon", () => {
  assert.throws(
    () => parseFieldGeoJson(JSON.stringify({ type: "FeatureCollection", features: [] })),
    (error) =>
      error instanceof GeoJsonImportError &&
      error.code === "POLYGON_REQUIRED" &&
      error.message.includes("features masih kosong"),
  );
});

test("rejects ambiguous, projected, holed, and self-intersecting inputs", () => {
  const cases = [
    {
      value: { type: "FeatureCollection", features: [{}, {}] },
      code: "ONE_POLYGON_REQUIRED",
    },
    {
      value: {
        type: "Feature",
        crs: { type: "name", properties: { name: "EPSG:32748" } },
        properties: {},
        geometry: { type: "Polygon", coordinates: [ring] },
      },
      code: "UNSUPPORTED_CRS",
    },
    {
      value: { type: "Polygon", coordinates: [ring, ring] },
      code: "HOLES_NOT_SUPPORTED",
    },
    {
      value: {
        type: "Polygon",
        coordinates: [[
          [107.455, -6.304],
          [107.456, -6.305],
          [107.455, -6.305],
          [107.456, -6.304],
          [107.455, -6.304],
        ]],
      },
      code: "POLYGON_SELF_INTERSECTS",
    },
  ];
  for (const entry of cases) {
    assert.throws(
      () => parseFieldGeoJson(JSON.stringify(entry.value)),
      (error) => error instanceof GeoJsonImportError && error.code === entry.code,
    );
  }
});
