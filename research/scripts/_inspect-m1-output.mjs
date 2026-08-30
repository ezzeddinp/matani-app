import fs from "node:fs";

const report = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

const monthlyReports = report.checkpoint?.monthly_reports ?? [];
const attempts = monthlyReports.reduce(
  (sum, month) =>
    sum +
    Object.values(month.quota?.attempts_by_request ?? {}).reduce(
      (requestSum, value) => requestSum + value,
      0,
    ),
  0,
);

console.log(
  JSON.stringify(
    {
      generated_at: report.generated_at,
      data_state: report.data_state,
      claim_allowed: report.claim_allowed,
      execution: { ...report.execution, attempts },
      quality_policy: report.study_contract?.quality_policy,
      fields: (report.fields ?? []).map((field) => ({
        area_ha: field.field?.area_ha,
        site_id: field.field?.site_id,
        region: field.field?.region,
        acquisition_count: field.acquisition_count,
        quality_passing_acquisition_count: field.quality_passing_acquisition_count,
        quality_rejected_acquisition_count:
          field.acquisition_count - field.quality_passing_acquisition_count,
        usable_observations_by_month: field.usable_observations_by_month,
        median_gap_days: field.median_gap_days,
        longest_gap_days: field.longest_gap_days,
        processing_units_total: field.quota?.processing_units_total,
        source_identity_statuses: [
          ...new Set(
            field.observations?.map(
              (observation) => observation.source_product_identity_status,
            ) ?? [],
          ),
        ],
        multiple_candidate_acquisition_count:
          field.observations?.filter(
            (observation) => observation.source_product_candidates?.length > 1,
          ).length ?? 0,
      })),
      site_season_metrics: (report.site_season_metrics ?? []).map((metric) => ({
        site_id: metric.site_id,
        region: metric.region,
        season: metric.season,
        acquisition_count: metric.acquisition_count,
        quality_passing_acquisition_count: metric.quality_passing_acquisition_count,
        usable_observations_by_month: metric.usable_observations_by_month,
        median_gap_days_across_within_field_gaps:
          metric.median_gap_days_across_within_field_gaps,
        longest_within_field_gap_days: metric.longest_within_field_gap_days,
        median_polygon_cloud_shadow_fraction:
          metric.median_polygon_cloud_shadow_fraction,
        median_ndvi_valid_pixel_count: metric.median_ndvi_valid_pixel_count,
        median_ndmi_valid_pixel_count: metric.median_ndmi_valid_pixel_count,
        cadence_determination: metric.cadence_determination,
      })),
      cadence_status: report.cadence_status,
      limitations: report.limitations,
    },
    null,
    2,
  ),
);
