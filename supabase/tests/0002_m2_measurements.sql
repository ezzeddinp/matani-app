begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select plan(15);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000011', 'm2-a@example.test', '{}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000012', 'm2-b@example.test', '{}', '{}', 'authenticated', 'authenticated');

insert into public.lahan (id, user_id, name, category, geom)
values
  ('10000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000011', 'M2 A', 'padi', st_geomfromtext('POLYGON((106 -6,106.001 -6,106.001 -6.001,106 -6.001,106 -6))', 4326)),
  ('10000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000012', 'M2 B', 'padi', st_geomfromtext('POLYGON((107 -7,107.001 -7,107.001 -7.001,107 -7.001,107 -7))', 4326));

select results_eq(
  $$select count(*)::bigint from public.measurement_jobs where idempotency_key like 'initial:%'$$,
  array[2::bigint],
  'new fields enqueue one initial measurement job each'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000011', true);

select results_eq(
  'select count(*)::bigint from public.measurement_jobs',
  array[1::bigint],
  'measurement job RLS isolates users'
);
select results_eq(
  'select count(*)::bigint from public.measurements',
  array[0::bigint],
  'authenticated user initially sees no measurements'
);
select throws_ok(
  $$insert into public.measurement_jobs (lahan_id, user_id, idempotency_key, request_window_start, request_window_end) values ('10000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000011', 'forbidden', now() - interval '1 day', now())$$,
  '42501',
  null,
  'authenticated clients cannot write measurement jobs'
);
select throws_ok(
  $$select public.enqueue_measurement_job('10000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000011', now() - interval '1 day', now(), 'forbidden-rpc')$$,
  '42501',
  null,
  'authenticated clients cannot invoke privileged enqueue RPC'
);

reset role;
set local role service_role;

select lives_ok(
  $$select public.enqueue_measurement_job('10000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000011', '2026-08-01T00:00:00Z', '2026-08-02T00:00:00Z', 'm2-idempotent')$$,
  'service role can enqueue a bounded measurement job'
);
select lives_ok(
  $$select public.enqueue_measurement_job('10000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000011', '2026-08-01T00:00:00Z', '2026-08-02T00:00:00Z', 'm2-idempotent')$$,
  'repeated enqueue with the same key is idempotent'
);
select results_eq(
  $$select count(*)::bigint from public.measurement_jobs where user_id = '00000000-0000-4000-8000-000000000011' and idempotency_key = 'm2-idempotent'$$,
  array[1::bigint],
  'idempotency key produces one job row'
);
select lives_ok(
  $$select public.claim_measurement_job((select id from public.measurement_jobs where user_id = '00000000-0000-4000-8000-000000000011' and idempotency_key = 'm2-idempotent'), '00000000-0000-4000-8000-000000000011')$$,
  'service role can claim the exact enqueued job'
);
select results_eq(
  $$select count(*)::bigint from public.measurement_jobs where lahan_id = '10000000-0000-4000-8000-000000000011' and status = 'processing' and attempts = 1$$,
  array[1::bigint],
  'claim transitions exactly one job and increments attempts'
);

select lives_ok(
  $$select public.complete_measurement_job(
      (select id from public.measurement_jobs where lahan_id = '10000000-0000-4000-8000-000000000011' and status = 'processing' limit 1),
      jsonb_build_object(
        'provider', 'fixture-provider',
        'mission', 'Sentinel-2',
        'platform', 'sentinel-2a',
        'collection', 'sentinel-2-l2a',
        'processing_level', 'L2A',
        'source_product_ids', jsonb_build_array('FIXTURE.SAFE'),
        'acquisition_start', '2026-08-01T03:00:00Z',
        'acquisition_end', '2026-08-01T03:01:00Z',
        'processing_at', '2026-08-30T00:00:00Z',
        'geometry_hash', repeat('a', 64),
        'algorithm_version', 'ndvi-ndmi-v1',
        'evalscript_version', 's2l2a-process-native-grids-v2',
        'masking_config_version', 's2l2a-scl-rice-v1',
        'crs', 'EPSG:32748',
        'quality_output_resolution_m', 20,
        'quality_resampling_method', 'NEAREST',
        'polygon_cloud_shadow_fraction', 0.1,
        'quality_status', 'passed',
        'provider_provenance', jsonb_build_object(
          'provider_scene_ids', jsonb_build_array('fixture-scene'),
          'provider_data_paths', jsonb_build_array('/fixture/FIXTURE.SAFE/GRANULE'),
          'provider_service_version', 'fixture-service'
        ),
        'index_stats', jsonb_build_array(
          jsonb_build_object('index_name', 'ndvi', 'output_resolution_m', 10, 'resampling_method', 'NEAREST', 'source_pixel_count', 12, 'valid_pixel_count', 9, 'valid_pixel_fraction', 0.75, 'derived_coverage_pixel_count', 12, 'sample_count', 9, 'minimum', 0.1, 'maximum', 0.7, 'mean', 0.4, 'standard_deviation', 0.2),
          jsonb_build_object('index_name', 'ndmi', 'output_resolution_m', 20, 'resampling_method', 'NEAREST', 'source_pixel_count', 4, 'valid_pixel_count', 3, 'valid_pixel_fraction', 0.75, 'derived_coverage_pixel_count', 4, 'sample_count', 3, 'minimum', 0.0, 'maximum', 0.4, 'mean', 0.2, 'standard_deviation', 0.1)
        )
      )
    )$$,
  'service role can atomically persist a provenance-complete result'
);
select results_eq(
  $$select count(*)::bigint from public.measurements where quality_status = 'passed'$$,
  array[1::bigint],
  'completion persists one measurement'
);
select results_eq(
  $$select count(*)::bigint from public.measurement_index_stats where valid_pixel_count in (9, 3)$$,
  array[2::bigint],
  'completion persists both native-grid pixel statistics'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000011', true);
select results_eq(
  $$select count(*)::bigint from public.measurement_observations where data_state = 'measured' and ndvi_valid_pixel_count = 9 and ndmi_valid_pixel_count = 3$$,
  array[1::bigint],
  'owner reads the flattened provenance-safe observation'
);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000012', true);
select results_eq(
  'select count(*)::bigint from public.measurement_observations',
  array[0::bigint],
  'another user cannot read the persisted observation'
);

select * from finish(true);
rollback;
