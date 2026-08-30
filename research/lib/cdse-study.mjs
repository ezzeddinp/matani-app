import crypto from "node:crypto";

import { PILOT_VERSIONS } from "./cdse-pilot.mjs";

const iso = (date) => date.toISOString();

export const buildCalendarMonthWindows = (from, to) => {
  const start = new Date(from);
  const end = new Date(to);
  if (
    !Number.isFinite(start.valueOf()) ||
    !Number.isFinite(end.valueOf()) ||
    start >= end
  ) {
    throw new Error("invalid-study-window");
  }
  if (
    start.getUTCDate() !== 1 ||
    end.getUTCDate() !== 1 ||
    start.getUTCHours() !== 0 ||
    end.getUTCHours() !== 0 ||
    start.getUTCMinutes() !== 0 ||
    end.getUTCMinutes() !== 0 ||
    start.getUTCSeconds() !== 0 ||
    end.getUTCSeconds() !== 0 ||
    start.getUTCMilliseconds() !== 0 ||
    end.getUTCMilliseconds() !== 0
  ) {
    throw new Error("study-window-must-use-utc-month-boundaries");
  }

  const monthDifference =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    end.getUTCMonth() -
    start.getUTCMonth();
  if (monthDifference !== 12) {
    throw new Error("study-window-must-cover-exactly-12-calendar-months");
  }

  const windows = [];
  let cursor = start;
  while (cursor < end) {
    const next = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
    );
    windows.push({ from: iso(cursor), to: iso(next) });
    cursor = next;
  }
  return windows;
};

export const studyIdentity = ({ fields, from, to }) => {
  const payload = JSON.stringify({
    from,
    to,
    fields: fields
      .map((field) => ({
        id: String(field.id),
        geometry: field.geometry,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    versions: PILOT_VERSIONS,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
};

const median = (values) => {
  const ordered = values
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);
  if (!ordered.length) return null;
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
};

export const buildStudyArtifact = ({
  identity,
  from,
  to,
  windows,
  fieldCount,
  monthlyReports,
}) => {
  const grouped = new Map();
  for (const report of monthlyReports) {
    const key = report.field.field_reference_hash;
    if (!grouped.has(key)) {
      grouped.set(key, {
        field: report.field,
        provider: report.provider,
        collection: report.collection,
        crs: report.crs,
        resolutions: report.resolutions,
        resampling: report.resampling,
        versions: report.versions,
        observations: [],
        requests: 0,
        processingUnits: [],
      });
    }
    const target = grouped.get(key);
    target.observations.push(...report.observations);
    target.requests += report.quota.requests;
    target.processingUnits.push(report.quota.processing_units_total);
  }

  const monthKeys = windows.map((window) => window.from.slice(0, 7));
  const fields = [...grouped.values()].map((group) => {
    const observations = group.observations.sort((left, right) =>
      left.acquisition_interval.from.localeCompare(
        right.acquisition_interval.from,
      ),
    );
    const monthlyAcquisitions = Object.fromEntries(
      monthKeys.map((month) => [month, 0]),
    );
    for (const observation of observations) {
      monthlyAcquisitions[observation.acquisition_interval.from.slice(0, 7)] +=
        1;
    }
    const ndviCounts = observations.map(
      (observation) => observation.ndvi_stats?.valid_pixel_count,
    );
    const ndmiCounts = observations.map(
      (observation) => observation.ndmi_stats?.valid_pixel_count,
    );
    const cloudFractions = observations.map(
      (observation) => observation.polygon_cloud_shadow_fraction,
    );
    const processingUnits = group.processingUnits.every(Number.isFinite)
      ? group.processingUnits.reduce((sum, value) => sum + value, 0)
      : null;

    return {
      ...group,
      observations,
      acquisition_count: observations.length,
      acquisitions_by_month: monthlyAcquisitions,
      observed_month_count: Object.values(monthlyAcquisitions).filter(
        (count) => count > 0,
      ).length,
      median_polygon_cloud_shadow_fraction: median(cloudFractions),
      median_ndvi_valid_pixel_count: median(ndviCounts),
      median_ndmi_valid_pixel_count: median(ndmiCounts),
      quota: {
        requests: group.requests,
        processing_units_total: processingUnits,
      },
      quality_adjudication: "withheld-no-validated-reliability-floor",
      cadence_determination: null,
    };
  });

  const completedReportCount = monthlyReports.length;
  const expectedReportCount = windows.length * fieldCount;
  return {
    generated_at: new Date().toISOString(),
    data_state: "prototype",
    claim_allowed: false,
    study_identity: identity,
    window: { from, to, calendar_months: windows.length },
    execution: {
      completed_field_months: completedReportCount,
      expected_field_months: expectedReportCount,
      complete: completedReportCount === expectedReportCount,
      requests_completed: monthlyReports.reduce(
        (sum, report) => sum + report.quota.requests,
        0,
      ),
      maximum_requests: expectedReportCount * 3,
    },
    versions: PILOT_VERSIONS,
    fields,
    cadence_status: "withheld",
    limitations: [
      "The available polygons do not establish representative Indonesian multi-region coverage.",
      "Crop identity, boundary fidelity, consent, and site representativeness require thesis-team verification.",
      "No validated HYP-03 reliability floor or advisor-approved quality threshold exists, so observations are not marked passed.",
      "Exact source product/acquisition identity for the Statistical API result is not included.",
      "Independent raster comparison is optional M3/future work and is not an M1 acceptance criterion (DEC-26).",
      "This provider-backed artifact is prototype evidence and cannot license a product cadence or a measured claim.",
    ],
  };
};
