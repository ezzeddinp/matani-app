import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCalendarMonthWindows,
  buildStudyArtifact,
} from "../../research/lib/cdse-study.mjs";
import {
  assertM1LiveAuthorization,
  normalizeM1StudyInput,
} from "../../research/lib/m1-study-input.mjs";
import {
  buildM1StudyArtifact,
  buildM1StudyPreflightArtifact,
  m1StudyIdentity,
} from "../../research/lib/m1-study-report.mjs";

const polygon = (longitude) => ({
  type: "Polygon",
  coordinates: [
    [
      [longitude, -6.3],
      [longitude + 0.001, -6.3],
      [longitude + 0.001, -6.301],
      [longitude, -6.301],
      [longitude, -6.3],
    ],
  ],
});

const m1Source = ({ qualityStatus = "open-hyp-03" } = {}) => {
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(2025, 6 + index, 1));
    return date.toISOString().slice(0, 7);
  });
  const site = (siteId, region, wetUntil) => ({
    site_id: siteId,
    region,
    season_labels: Object.fromEntries(
      months.map((month, index) => [month, index < wetUntil ? "wet" : "dry"]),
    ),
    season_source: {
      type: "fixture-season-source",
      reference: `fixture://${siteId}/season-labels`,
      checked_at: "2026-08-28",
    },
  });
  const verification = {
    crop_identity: {
      status: "verified",
      method: "fixture-owner-confirmation",
      reference: "fixture://crop",
    },
    boundary: {
      status: "verified",
      method: "fixture-owner-confirmation",
      reference: "fixture://boundary",
    },
    consent: {
      status: "granted",
      method: "fixture-digital-form",
      reference: "fixture://consent",
    },
    location_area: {
      status: "verified",
      method: "fixture-geometry-check",
      reference: "fixture://location-area",
    },
  };
  return {
    type: "FeatureCollection",
    matani_m1: {
      contract_version: "m1-study-input-v1",
      dataset_state: "fixture",
      verification_mode: "remote-assisted",
      scope_approval: { status: "provisional" },
      quality_policy:
        qualityStatus === "open-hyp-03"
          ? { status: qualityStatus }
          : {
              status: qualityStatus,
              ndvi_min_valid_pixels: 5,
              ndmi_min_valid_pixels: 2,
              approval_reference: "fixture://advisor/quality-floor",
            },
      sites: [
        site("karawang-a", "Jawa Barat", 6),
        site("demak-a", "Jawa Tengah", 5),
      ],
    },
    features: [
      {
        type: "Feature",
        properties: {
          id: "field-a",
          category: "padi",
          area_ha: 0.2,
          site_id: "karawang-a",
          verification,
        },
        geometry: polygon(107.3),
      },
      {
        type: "Feature",
        properties: {
          id: "field-b",
          category: "padi",
          area_ha: 1.2,
          site_id: "demak-a",
          verification,
        },
        geometry: polygon(110.6),
      },
    ],
  };
};

test("availability study splits exactly 12 calendar months into bounded windows", () => {
  const windows = buildCalendarMonthWindows(
    "2025-07-01T00:00:00.000Z",
    "2026-07-01T00:00:00.000Z",
  );
  assert.equal(windows.length, 12);
  assert.deepEqual(windows[0], {
    from: "2025-07-01T00:00:00.000Z",
    to: "2025-08-01T00:00:00.000Z",
  });
  assert.ok(
    windows.every(
      (window) =>
        (new Date(window.to) - new Date(window.from)) / 86_400_000 <= 31,
    ),
  );
  assert.throws(
    () =>
      buildCalendarMonthWindows(
        "2025-07-15T00:00:00Z",
        "2026-07-15T00:00:00Z",
      ),
    /utc-month-boundaries/,
  );
});

test("provider-backed study withholds cadence and measured claims", () => {
  const windows = buildCalendarMonthWindows(
    "2025-07-01T00:00:00.000Z",
    "2026-07-01T00:00:00.000Z",
  );
  const report = {
    field: {
      field_reference_hash: "field-a",
      area_ha: 0.1,
    },
    provider: "CDSE Sentinel Hub Statistical API",
    collection: "sentinel-2-l2a",
    crs: { processing_grid: "EPSG:32748" },
    resolutions: { ndvi_metres: 10, ndmi_metres: 20 },
    resampling: { method: "NEAREST" },
    versions: { algorithm: "test" },
    window: windows[0],
    quota: { requests: 3, processing_units_total: 0.14 },
    observations: [
      {
        acquisition_interval: {
          from: "2025-07-04T00:00:00Z",
          to: "2025-07-05T00:00:00Z",
        },
        polygon_cloud_shadow_fraction: 0,
        ndvi_stats: { valid_pixel_count: 15 },
        ndmi_stats: { valid_pixel_count: 2 },
      },
    ],
  };
  const artifact = buildStudyArtifact({
    identity: "study",
    from: windows[0].from,
    to: windows.at(-1).to,
    windows,
    fieldCount: 1,
    monthlyReports: [report],
  });
  assert.equal(artifact.data_state, "prototype");
  assert.equal(artifact.claim_allowed, false);
  assert.equal(artifact.cadence_status, "withheld");
  assert.equal(
    artifact.fields[0].quality_adjudication,
    "withheld-no-validated-reliability-floor",
  );
});

test("M1 manifest validates multi-site remote verification and monthly site seasons", () => {
  const windows = buildCalendarMonthWindows(
    "2025-07-01T00:00:00.000Z",
    "2026-07-01T00:00:00.000Z",
  );
  const input = normalizeM1StudyInput({ source: m1Source(), windows });
  assert.equal(input.fields.length, 2);
  assert.deepEqual(input.field_count_by_site, {
    "karawang-a": 1,
    "demak-a": 1,
  });
  assert.equal(input.sites[0].season_labels["2025-07"], "wet");
  assert.equal(input.live_eligible, false);
  assert.throws(
    () => assertM1LiveAuthorization({ input, allowProvisionalScope: true }),
    /fixture-input-cannot-call-live-provider/,
  );
});

test("M1 live manifest rejects absent consent and requires provisional override", () => {
  const windows = buildCalendarMonthWindows(
    "2025-07-01T00:00:00.000Z",
    "2026-07-01T00:00:00.000Z",
  );
  const source = m1Source();
  source.matani_m1.dataset_state = "private-research-input";
  source.features[0].properties.verification.consent.status = "missing";
  assert.throws(
    () => normalizeM1StudyInput({ source, windows }),
    /consent-not-granted/,
  );
  source.features[0].properties.verification.consent.status = "granted";
  const input = normalizeM1StudyInput({ source, windows });
  assert.throws(
    () => assertM1LiveAuthorization({ input, allowProvisionalScope: false }),
    /provisional-scope-requires-allow-provisional-scope/,
  );
  assert.doesNotThrow(() =>
    assertM1LiveAuthorization({ input, allowProvisionalScope: true }),
  );
});

test("M1 preflight exposes dynamic budget without geometry or live calls", () => {
  const windows = buildCalendarMonthWindows(
    "2025-07-01T00:00:00.000Z",
    "2026-07-01T00:00:00.000Z",
  );
  const studyInput = normalizeM1StudyInput({ source: m1Source(), windows });
  const identity = m1StudyIdentity({
    fields: studyInput.fields,
    from: windows[0].from,
    to: windows.at(-1).to,
    studyInput,
  });
  const artifact = buildM1StudyPreflightArtifact({
    identity,
    from: windows[0].from,
    to: windows.at(-1).to,
    windows,
    studyInput,
    plannedRequestOperations: 96,
    confirmedRequestAttemptCeiling: null,
    maxAttemptsPerRequest: 3,
  });
  assert.equal(artifact.network_called, false);
  assert.equal(artifact.request_budget.planned_request_operations, 96);
  assert.equal(artifact.fields[0].geometry, undefined);
  assert.equal(
    artifact.fields[0].verification_evidence_references_omitted,
    true,
  );
});

test("approved provisional floors produce site-season usable counts and within-field gaps", () => {
  const windows = buildCalendarMonthWindows(
    "2025-07-01T00:00:00.000Z",
    "2026-07-01T00:00:00.000Z",
  );
  const studyInput = normalizeM1StudyInput({
    source: m1Source({
      qualityStatus: "advisor-approved-provisional",
    }),
    windows,
  });
  const report = {
    field: {
      field_reference_hash: "field-a-hash",
      site_id: "karawang-a",
      region: "Jawa Barat",
      area_ha: 0.2,
    },
    provider: "CDSE Sentinel Hub Statistical API",
    collection: "sentinel-2-l2a",
    crs: { processing_grid: "EPSG:32748" },
    resolutions: { ndvi_metres: 10, ndmi_metres: 20 },
    resampling: { method: "NEAREST" },
    versions: { algorithm: "test" },
    window: windows[0],
    quota: { requests: 3, processing_units_total: 0.1 },
    observations: [
      {
        acquisition_interval: {
          from: "2025-07-04T00:00:00Z",
          to: "2025-07-05T00:00:00Z",
        },
        polygon_cloud_shadow_fraction: 0.1,
        ndvi_stats: { valid_pixel_count: 8 },
        ndmi_stats: { valid_pixel_count: 3 },
      },
      {
        acquisition_interval: {
          from: "2025-07-11T00:00:00Z",
          to: "2025-07-12T00:00:00Z",
        },
        polygon_cloud_shadow_fraction: 0.2,
        ndvi_stats: { valid_pixel_count: 4 },
        ndmi_stats: { valid_pixel_count: 3 },
      },
      {
        acquisition_interval: {
          from: "2025-07-18T00:00:00Z",
          to: "2025-07-19T00:00:00Z",
        },
        polygon_cloud_shadow_fraction: 0,
        ndvi_stats: { valid_pixel_count: 9 },
        ndmi_stats: { valid_pixel_count: 2 },
      },
    ],
  };
  const artifact = buildM1StudyArtifact({
    identity: "m1-study",
    from: windows[0].from,
    to: windows.at(-1).to,
    windows,
    monthlyReports: [report],
    studyInput,
    plannedRequestOperations: 96,
    confirmedRequestAttemptCeiling: 288,
  });
  assert.equal(artifact.fields[0].quality_passing_acquisition_count, 2);
  assert.equal(artifact.fields[0].median_gap_days, 14);
  const wet = artifact.site_season_metrics.find(
    (row) => row.site_id === "karawang-a" && row.season === "wet",
  );
  assert.equal(wet.quality_passing_acquisition_count, 2);
  assert.equal(wet.longest_within_field_gap_days, 14);
  assert.equal(artifact.cadence_status, "withheld");
});
