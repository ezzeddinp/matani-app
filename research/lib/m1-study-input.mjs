import { validatePilotGeometry } from "./cdse-pilot.mjs";

const LIVE_DATASET_STATE = "private-research-input";
const FIXTURE_DATASET_STATE = "fixture";
const APPROVED_SCOPE = "advisor-approved";
const OPEN_QUALITY_POLICY = "open-hyp-03";
const APPROVED_QUALITY_POLICY = "advisor-approved-provisional";
const SEASONS = new Set(["wet", "dry"]);

const requiredText = (value, error) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(error);
  return value.trim();
};

const requiredEvidence = (value, prefix) => ({
  status: requiredText(value?.status, `${prefix}-status-missing`),
  method: requiredText(value?.method, `${prefix}-method-missing`),
  reference: requiredText(value?.reference, `${prefix}-reference-missing`),
});

const parseCheckedDate = (value, error) => {
  const text = requiredText(value, error);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(error);
  return text;
};

const monthKeys = (windows) => windows.map((window) => window.from.slice(0, 7));

const normalizeQualityPolicy = (policy) => {
  const status = requiredText(
    policy?.status,
    "quality-policy-status-missing",
  );
  if (![OPEN_QUALITY_POLICY, APPROVED_QUALITY_POLICY].includes(status)) {
    throw new Error("quality-policy-status-invalid");
  }
  if (status === OPEN_QUALITY_POLICY) {
    return {
      status,
      ndvi_min_valid_pixels: null,
      ndmi_min_valid_pixels: null,
      approval_reference: null,
    };
  }
  const threshold = (value, name) => {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1) {
      throw new Error(`${name}-must-be-a-positive-integer`);
    }
    return number;
  };
  return {
    status,
    ndvi_min_valid_pixels: threshold(
      policy.ndvi_min_valid_pixels,
      "ndvi-min-valid-pixels",
    ),
    ndmi_min_valid_pixels: threshold(
      policy.ndmi_min_valid_pixels,
      "ndmi-min-valid-pixels",
    ),
    approval_reference: requiredText(
      policy.approval_reference,
      "quality-policy-approval-reference-missing",
    ),
  };
};

export const normalizeM1StudyInput = ({ source, windows }) => {
  if (source?.type !== "FeatureCollection" || !Array.isArray(source.features)) {
    throw new Error("m1-input-must-be-a-geojson-feature-collection");
  }
  if (!Array.isArray(windows) || windows.length !== 12) {
    throw new Error("m1-input-requires-twelve-month-windows");
  }
  const metadata = source.matani_m1;
  if (!metadata || metadata.contract_version !== "m1-study-input-v1") {
    throw new Error("m1-input-contract-version-invalid");
  }
  const datasetState = requiredText(
    metadata.dataset_state,
    "m1-dataset-state-missing",
  );
  if (![LIVE_DATASET_STATE, FIXTURE_DATASET_STATE].includes(datasetState)) {
    throw new Error("m1-dataset-state-invalid");
  }
  if (metadata.verification_mode !== "remote-assisted") {
    throw new Error("m1-verification-mode-must-be-remote-assisted");
  }

  const scopeStatus = requiredText(
    metadata.scope_approval?.status,
    "scope-approval-status-missing",
  );
  if (!["provisional", APPROVED_SCOPE].includes(scopeStatus)) {
    throw new Error("scope-approval-status-invalid");
  }
  const scopeApproval = {
    status: scopeStatus,
    reference:
      scopeStatus === APPROVED_SCOPE
        ? requiredText(
            metadata.scope_approval?.reference,
            "scope-approval-reference-missing",
          )
        : null,
  };
  const qualityPolicy = normalizeQualityPolicy(metadata.quality_policy);

  if (!Array.isArray(metadata.sites) || metadata.sites.length < 1) {
    throw new Error("m1-sites-missing");
  }
  const expectedMonths = monthKeys(windows);
  const sites = new Map();
  for (const rawSite of metadata.sites) {
    const siteId = requiredText(rawSite?.site_id, "site-id-missing");
    if (sites.has(siteId)) throw new Error("site-id-must-be-unique");
    const labels = rawSite.season_labels;
    if (!labels || typeof labels !== "object" || Array.isArray(labels)) {
      throw new Error(`season-labels-missing-for-site-${siteId}`);
    }
    const normalizedLabels = {};
    for (const month of expectedMonths) {
      const label = labels[month];
      if (!SEASONS.has(label)) {
        throw new Error(`season-label-invalid-for-${siteId}-${month}`);
      }
      normalizedLabels[month] = label;
    }
    const unexpectedMonths = Object.keys(labels).filter(
      (month) => !expectedMonths.includes(month),
    );
    if (unexpectedMonths.length) {
      throw new Error(`season-label-outside-study-window-for-site-${siteId}`);
    }
    sites.set(siteId, {
      site_id: siteId,
      region: requiredText(rawSite.region, `region-missing-for-site-${siteId}`),
      season_labels: normalizedLabels,
      season_source: {
        type: requiredText(
          rawSite.season_source?.type,
          `season-source-type-missing-for-site-${siteId}`,
        ),
        reference: requiredText(
          rawSite.season_source?.reference,
          `season-source-reference-missing-for-site-${siteId}`,
        ),
        checked_at: parseCheckedDate(
          rawSite.season_source?.checked_at,
          `season-source-checked-at-invalid-for-site-${siteId}`,
        ),
      },
    });
  }

  if (source.features.length < 1) throw new Error("m1-fields-missing");
  const ids = new Set();
  const fields = source.features.map((feature) => {
    if (feature?.type !== "Feature") throw new Error("m1-feature-invalid");
    validatePilotGeometry(feature.geometry);
    const properties = feature.properties ?? {};
    const id = requiredText(properties.id, "field-id-missing");
    if (ids.has(id)) throw new Error("field-id-must-be-unique");
    ids.add(id);
    if (String(properties.category).toLowerCase() !== "padi") {
      throw new Error(`field-${id}-must-be-padi`);
    }
    const areaHa = Number(properties.area_ha);
    if (!Number.isFinite(areaHa) || areaHa <= 0) {
      throw new Error(`field-${id}-area-invalid`);
    }
    const siteId = requiredText(properties.site_id, `field-${id}-site-id-missing`);
    const site = sites.get(siteId);
    if (!site) throw new Error(`field-${id}-references-unknown-site`);
    const verification = {
      crop_identity: requiredEvidence(
        properties.verification?.crop_identity,
        `field-${id}-crop-verification`,
      ),
      boundary: requiredEvidence(
        properties.verification?.boundary,
        `field-${id}-boundary-verification`,
      ),
      consent: requiredEvidence(
        properties.verification?.consent,
        `field-${id}-consent`,
      ),
      location_area: requiredEvidence(
        properties.verification?.location_area,
        `field-${id}-location-area-verification`,
      ),
    };
    if (datasetState === LIVE_DATASET_STATE) {
      const requiredStatuses = {
        crop_identity: "verified",
        boundary: "verified",
        consent: "granted",
        location_area: "verified",
      };
      for (const [name, expected] of Object.entries(requiredStatuses)) {
        if (verification[name].status !== expected) {
          throw new Error(`field-${id}-${name}-not-${expected}`);
        }
      }
    }
    return {
      id,
      category: "padi",
      area_ha: areaHa,
      site_id: siteId,
      region: site.region,
      geometry: feature.geometry,
      verification,
    };
  });

  const fieldCountBySite = Object.fromEntries(
    [...sites.keys()].map((siteId) => [siteId, 0]),
  );
  for (const field of fields) fieldCountBySite[field.site_id] += 1;
  const emptySite = Object.entries(fieldCountBySite).find(([, count]) => count === 0);
  if (emptySite) throw new Error(`site-${emptySite[0]}-has-no-fields`);

  return {
    contract_version: metadata.contract_version,
    dataset_state: datasetState,
    verification_mode: metadata.verification_mode,
    scope_approval: scopeApproval,
    quality_policy: qualityPolicy,
    sites: [...sites.values()],
    fields,
    field_count_by_site: fieldCountBySite,
    live_eligible: datasetState === LIVE_DATASET_STATE,
  };
};

export const assertM1LiveAuthorization = ({ input, allowProvisionalScope }) => {
  if (!input.live_eligible) throw new Error("fixture-input-cannot-call-live-provider");
  if (
    input.scope_approval.status !== APPROVED_SCOPE &&
    !allowProvisionalScope
  ) {
    throw new Error("provisional-scope-requires-allow-provisional-scope");
  }
};

export const M1_STUDY_INPUT_CONSTANTS = Object.freeze({
  live_dataset_state: LIVE_DATASET_STATE,
  fixture_dataset_state: FIXTURE_DATASET_STATE,
  approved_scope: APPROVED_SCOPE,
  open_quality_policy: OPEN_QUALITY_POLICY,
  approved_quality_policy: APPROVED_QUALITY_POLICY,
});
