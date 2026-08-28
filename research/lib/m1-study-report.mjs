import crypto from "node:crypto";

import { geometryHash, PILOT_VERSIONS } from "./cdse-pilot.mjs";

const OPEN_QUALITY_POLICY = "open-hyp-03";
const APPROVED_QUALITY_POLICY = "advisor-approved-provisional";

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

const gapDays = (observations) => {
  const dates = [
    ...new Set(
      observations
        .map((observation) => observation.acquisition_interval?.from)
        .filter(Boolean),
    ),
  ]
    .map((value) => new Date(value))
    .filter((date) => Number.isFinite(date.valueOf()))
    .sort((left, right) => left - right);
  return dates.slice(1).map((date, index) => (date - dates[index]) / 86_400_000);
};

const adjudicateObservation = (observation, policy) => {
  if (policy.status !== APPROVED_QUALITY_POLICY) {
    return {
      ...observation,
      quality_decision: "not-evaluated-hyp-03",
      quality_rejection_reasons: [],
    };
  }
  const ndviCount = observation.ndvi_stats?.valid_pixel_count;
  const ndmiCount = observation.ndmi_stats?.valid_pixel_count;
  const reasons = [];
  if (!Number.isFinite(ndviCount)) reasons.push("ndvi-valid-pixel-count-missing");
  else if (ndviCount < policy.ndvi_min_valid_pixels) {
    reasons.push("ndvi-valid-pixel-count-below-approved-floor");
  }
  if (!Number.isFinite(ndmiCount)) reasons.push("ndmi-valid-pixel-count-missing");
  else if (ndmiCount < policy.ndmi_min_valid_pixels) {
    reasons.push("ndmi-valid-pixel-count-below-approved-floor");
  }
  return {
    ...observation,
    quality_decision: reasons.length ? "rejected" : "passed",
    quality_rejection_reasons: reasons,
  };
};

export const m1StudyIdentity = ({ fields, from, to, studyInput }) => {
  const payload = JSON.stringify({
    from,
    to,
    fields: fields
      .map((field) => ({
        id: String(field.id),
        site_id: field.site_id,
        geometry: field.geometry,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    contract_version: studyInput.contract_version,
    scope_approval: studyInput.scope_approval,
    quality_policy: studyInput.quality_policy,
    sites: studyInput.sites,
    versions: PILOT_VERSIONS,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
};

const aggregateField = ({ group, monthKeys, site, qualityPolicy }) => {
  const {
    processingUnits: _processingUnits,
    processingUnitsComplete: _processingUnitsComplete,
    requests: _requests,
    ...publicGroup
  } = group;
  const observations = group.observations
    .map((observation) => {
      const month = observation.acquisition_interval.from.slice(0, 7);
      return adjudicateObservation(
        { ...observation, season: site.season_labels[month] },
        qualityPolicy,
      );
    })
    .sort((left, right) =>
      left.acquisition_interval.from.localeCompare(
        right.acquisition_interval.from,
      ),
    );
  const acquisitionsByMonth = Object.fromEntries(
    monthKeys.map((month) => [month, 0]),
  );
  const usableByMonth = Object.fromEntries(
    monthKeys.map((month) => [
      month,
      qualityPolicy.status === APPROVED_QUALITY_POLICY ? 0 : null,
    ]),
  );
  for (const observation of observations) {
    const month = observation.acquisition_interval.from.slice(0, 7);
    acquisitionsByMonth[month] += 1;
    if (observation.quality_decision === "passed") usableByMonth[month] += 1;
  }
  const usable = observations.filter(
    (observation) => observation.quality_decision === "passed",
  );
  const gaps = gapDays(usable);
  const processingUnits = group.processingUnits
    .filter(Number.isFinite)
    .reduce((sum, value) => sum + value, 0);
  return {
    ...publicGroup,
    observations,
    acquisition_count: observations.length,
    acquisitions_by_month: acquisitionsByMonth,
    observed_month_count: Object.values(acquisitionsByMonth).filter(
      (count) => count > 0,
    ).length,
    descriptive_nonzero_both_index_count: observations.filter(
      (observation) =>
        observation.ndvi_stats?.valid_pixel_count > 0 &&
        observation.ndmi_stats?.valid_pixel_count > 0,
    ).length,
    median_polygon_cloud_shadow_fraction: median(
      observations.map(
        (observation) => observation.polygon_cloud_shadow_fraction,
      ),
    ),
    median_ndvi_valid_pixel_count: median(
      observations.map((observation) => observation.ndvi_stats?.valid_pixel_count),
    ),
    median_ndmi_valid_pixel_count: median(
      observations.map((observation) => observation.ndmi_stats?.valid_pixel_count),
    ),
    quota: {
      requests: group.requests,
      processing_units_total: processingUnits,
      processing_units_complete: group.processingUnitsComplete.every(Boolean),
    },
    quality_adjudication:
      qualityPolicy.status === APPROVED_QUALITY_POLICY
        ? "applied-advisor-approved-provisional-floor"
        : "withheld-no-validated-reliability-floor",
    quality_passing_acquisition_count:
      qualityPolicy.status === APPROVED_QUALITY_POLICY ? usable.length : null,
    usable_observations_by_month: usableByMonth,
    median_gap_days:
      qualityPolicy.status === APPROVED_QUALITY_POLICY ? median(gaps) : null,
    longest_gap_days:
      qualityPolicy.status === APPROVED_QUALITY_POLICY && gaps.length
        ? Math.max(...gaps)
        : null,
    cadence_determination: null,
  };
};

const buildSiteSeasonMetrics = ({ fields, sites, monthKeys, qualityPolicy }) => {
  const siteMap = new Map(sites.map((site) => [site.site_id, site]));
  const groups = new Map();
  for (const site of sites) {
    for (const season of new Set(Object.values(site.season_labels))) {
      groups.set(`${site.site_id}:${season}`, {
        site,
        season,
        fieldObservations: new Map(),
      });
    }
  }
  for (const field of fields) {
    for (const observation of field.observations) {
      const target = groups.get(`${field.field.site_id}:${observation.season}`);
      if (!target.fieldObservations.has(field.field.field_reference_hash)) {
        target.fieldObservations.set(field.field.field_reference_hash, []);
      }
      target.fieldObservations
        .get(field.field.field_reference_hash)
        .push(observation);
    }
  }

  return [...groups.values()].map(({ site, season, fieldObservations }) => {
    const allowedMonths = monthKeys.filter(
      (month) => site.season_labels[month] === season,
    );
    const acquisitionsByMonth = Object.fromEntries(
      allowedMonths.map((month) => [month, 0]),
    );
    const usableByMonth = Object.fromEntries(
      allowedMonths.map((month) => [
        month,
        qualityPolicy.status === APPROVED_QUALITY_POLICY ? 0 : null,
      ]),
    );
    const observations = [...fieldObservations.values()].flat();
    for (const observation of observations) {
      const month = observation.acquisition_interval.from.slice(0, 7);
      acquisitionsByMonth[month] += 1;
      if (observation.quality_decision === "passed") usableByMonth[month] += 1;
    }
    const fieldMetrics = [...fieldObservations.entries()].map(
      ([fieldReferenceHash, observationsForField]) => {
        const usable = observationsForField.filter(
          (observation) => observation.quality_decision === "passed",
        );
        const gaps = gapDays(usable);
        return {
          field_reference_hash: fieldReferenceHash,
          acquisition_count: observationsForField.length,
          quality_passing_acquisition_count:
            qualityPolicy.status === APPROVED_QUALITY_POLICY
              ? usable.length
              : null,
          median_gap_days:
            qualityPolicy.status === APPROVED_QUALITY_POLICY
              ? median(gaps)
              : null,
          longest_gap_days:
            qualityPolicy.status === APPROVED_QUALITY_POLICY && gaps.length
              ? Math.max(...gaps)
              : null,
        };
      },
    );
    const fieldGaps = [...fieldObservations.values()].flatMap(
      (observationsForField) =>
        gapDays(
          observationsForField.filter(
            (observation) => observation.quality_decision === "passed",
          ),
        ),
    );
    return {
      site_id: site.site_id,
      region: site.region,
      season,
      season_source: site.season_source,
      field_count: fieldObservations.size,
      acquisition_count: observations.length,
      acquisitions_by_month: acquisitionsByMonth,
      quality_passing_acquisition_count:
        qualityPolicy.status === APPROVED_QUALITY_POLICY
          ? observations.filter(
              (observation) => observation.quality_decision === "passed",
            ).length
          : null,
      usable_observations_by_month: usableByMonth,
      median_gap_days_across_within_field_gaps:
        qualityPolicy.status === APPROVED_QUALITY_POLICY
          ? median(fieldGaps)
          : null,
      longest_within_field_gap_days:
        qualityPolicy.status === APPROVED_QUALITY_POLICY && fieldGaps.length
          ? Math.max(...fieldGaps)
          : null,
      median_polygon_cloud_shadow_fraction: median(
        observations.map(
          (observation) => observation.polygon_cloud_shadow_fraction,
        ),
      ),
      median_ndvi_valid_pixel_count: median(
        observations.map(
          (observation) => observation.ndvi_stats?.valid_pixel_count,
        ),
      ),
      median_ndmi_valid_pixel_count: median(
        observations.map(
          (observation) => observation.ndmi_stats?.valid_pixel_count,
        ),
      ),
      field_metrics: fieldMetrics,
      cadence_determination: null,
    };
  });
};

export const buildM1StudyArtifact = ({
  identity,
  from,
  to,
  windows,
  monthlyReports,
  studyInput,
  plannedRequestOperations,
  confirmedRequestAttemptCeiling,
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
        processingUnitsComplete: [],
      });
    }
    const target = grouped.get(key);
    target.observations.push(...report.observations);
    target.requests += report.quota.requests;
    target.processingUnits.push(report.quota.processing_units_total);
    target.processingUnitsComplete.push(
      report.quota.processing_units_complete ??
        Number.isFinite(report.quota.processing_units_total),
    );
  }
  const monthKeys = windows.map((window) => window.from.slice(0, 7));
  const siteMap = new Map(studyInput.sites.map((site) => [site.site_id, site]));
  const fields = [...grouped.values()].map((group) =>
    aggregateField({
      group,
      monthKeys,
      site: siteMap.get(group.field.site_id),
      qualityPolicy: studyInput.quality_policy,
    }),
  );
  const completedFieldMonths = monthlyReports.length;
  const expectedFieldMonths = windows.length * studyInput.fields.length;
  const complete = completedFieldMonths === expectedFieldMonths;
  const qualityReady =
    studyInput.quality_policy.status === APPROVED_QUALITY_POLICY;
  return {
    generated_at: new Date().toISOString(),
    data_state: "prototype",
    claim_allowed: false,
    study_identity: identity,
    study_contract: {
      version: studyInput.contract_version,
      dataset_state: studyInput.dataset_state,
      verification_mode: studyInput.verification_mode,
      scope_approval: studyInput.scope_approval,
      quality_policy: studyInput.quality_policy,
      field_count_by_site: studyInput.field_count_by_site,
    },
    window: { from, to, calendar_months: windows.length },
    execution: {
      completed_field_months: completedFieldMonths,
      expected_field_months: expectedFieldMonths,
      complete,
      requests_completed: monthlyReports.reduce(
        (sum, report) => sum + report.quota.requests,
        0,
      ),
      planned_request_operations: plannedRequestOperations,
      confirmed_request_attempt_ceiling: confirmedRequestAttemptCeiling,
    },
    versions: PILOT_VERSIONS,
    fields,
    site_season_metrics: buildSiteSeasonMetrics({
      fields,
      sites: studyInput.sites,
      monthKeys,
      qualityPolicy: studyInput.quality_policy,
    }),
    cadence_status:
      complete && qualityReady
        ? "requires-advisor-determination-from-site-season-metrics"
        : "withheld",
    limitations: [
      ...(studyInput.scope_approval.status === "advisor-approved"
        ? []
        : ["Study-site scope and sample size remain provisional pending advisor approval."]),
      "Verification statuses are private-input declarations with omitted evidence references; the provider does not prove crop identity, boundary fidelity, or consent.",
      ...(qualityReady
        ? [
            "The applied valid-pixel floors are advisor-approved provisional hypotheses, not validated HYP-03 findings.",
          ]
        : [
            "No advisor-approved HYP-03 reliability floor exists, so observations are not marked passed and usable/gap metrics remain null.",
          ]),
      "Catalog product candidates are recorded, but exact Statistical API mosaic selection and independent raster comparison are not proven.",
      "This provider-backed artifact is prototype evidence and cannot by itself license a product cadence or a measured product claim.",
    ],
  };
};

export const buildM1StudyPreflightArtifact = ({
  identity,
  from,
  to,
  windows,
  studyInput,
  plannedRequestOperations,
  confirmedRequestAttemptCeiling,
  maxAttemptsPerRequest,
}) => ({
  generated_at: new Date().toISOString(),
  execution: "preflight-only",
  network_called: false,
  data_state: studyInput.dataset_state,
  claim_allowed: false,
  study_identity: identity,
  window: { from, to, calendar_months: windows.length },
  study_contract: {
    version: studyInput.contract_version,
    dataset_state: studyInput.dataset_state,
    verification_mode: studyInput.verification_mode,
    scope_approval: studyInput.scope_approval,
    quality_policy: studyInput.quality_policy,
    field_count_by_site: studyInput.field_count_by_site,
  },
  sites: studyInput.sites,
  fields: studyInput.fields.map((field) => ({
    field_reference_hash: crypto
      .createHash("sha256")
      .update(String(field.id))
      .digest("hex"),
    site_id: field.site_id,
    region: field.region,
    category: field.category,
    area_ha: field.area_ha,
    geometry_hash: geometryHash(field.geometry),
    verification_declarations: Object.fromEntries(
      Object.entries(field.verification).map(([name, value]) => [
        name,
        { status: value.status, method: value.method },
      ]),
    ),
    geometry_omitted_from_output: true,
    verification_evidence_references_omitted: true,
  })),
  request_budget: {
    planned_request_operations: plannedRequestOperations,
    max_attempts_per_request: maxAttemptsPerRequest,
    confirmed_request_attempt_ceiling: confirmedRequestAttemptCeiling,
  },
  limitations: [
    "No provider request was made.",
    "The preflight validates declarations and references but does not independently prove their truth.",
    "No availability, quality, gap, processing-unit, or cadence result is produced by preflight.",
  ],
});

export const M1_REPORT_CONSTANTS = Object.freeze({
  open_quality_policy: OPEN_QUALITY_POLICY,
  approved_quality_policy: APPROVED_QUALITY_POLICY,
});
