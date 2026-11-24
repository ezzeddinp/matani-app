begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select plan(14);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000021', 'estimates-a@example.test', '{}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000022', 'estimates-b@example.test', '{}', '{}', 'authenticated', 'authenticated');

insert into public.lahan (id, user_id, name, category, geom)
values
  ('10000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000021', 'Estimates A', 'padi', st_geomfromtext('POLYGON((106 -6,106.001 -6,106.001 -6.001,106 -6.001,106 -6))', 4326)),
  ('10000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000022', 'Estimates B', 'padi', st_geomfromtext('POLYGON((107 -7,107.001 -7,107.001 -7.001,107 -7.001,107 -7))', 4326));

select set_config('test.ndvi_estimate_rows', '[{
  "target_date": "2026-08-01", "ndvi_estimate": 0.5, "status": "estimated",
  "radar_acquired_at": "2026-08-01T03:00:00Z", "radar_product_ids": ["FIXTURE.SAFE"],
  "orbit_direction": "ASCENDING", "offset_days": 0, "model_name": "random_forest",
  "model_version": "fixture-v1", "feature_set": "F0+F1", "dataset_version": "fixture-v1",
  "run_id": "fixture-run", "evaluation_role": "applied", "provenance": {"fixture": true}
}]', true);

set local role service_role;
select is(
  public.import_ndvi_estimates('10000000-0000-4000-8000-000000000021', current_setting('test.ndvi_estimate_rows')::jsonb),
  1,
  'service role imports one estimate'
);
select is(
  public.import_ndvi_estimates('10000000-0000-4000-8000-000000000021', current_setting('test.ndvi_estimate_rows')::jsonb),
  1,
  'service role can repeat the same import'
);
reset role;
select results_eq(
  'select count(*)::bigint from public.ndvi_estimates',
  array[1::bigint],
  'repeated import keeps exactly one row'
);

set local role service_role;
select is(
  public.import_ndvi_estimates('10000000-0000-4000-8000-000000000021', jsonb_set(current_setting('test.ndvi_estimate_rows')::jsonb, '{0,ndvi_estimate}', '0.6')),
  1,
  'service role updates the conflicting estimate'
);
reset role;
select results_eq(
  'select ndvi_estimate from public.ndvi_estimates',
  array[0.6::double precision],
  'upsert replaces the stored value'
);

set local role service_role;
select throws_ok(
  $$select public.import_ndvi_estimates('10000000-0000-4000-8000-000000000021', jsonb_set(current_setting('test.ndvi_estimate_rows')::jsonb, '{0,ndvi_estimate}', 'null'))$$,
  '23514', null,
  'estimated status requires a non-null estimate'
);
select throws_ok(
  $$select public.import_ndvi_estimates('10000000-0000-4000-8000-000000000021', jsonb_set(current_setting('test.ndvi_estimate_rows')::jsonb, '{0,reference_ndvi}', '0.4'))$$,
  '23514', null,
  'applied estimates cannot carry reference NDVI'
);
select throws_ok(
  $$select public.import_ndvi_estimates('10000000-0000-4000-8000-000000000021', '[]')$$,
  'P0001', 'invalid_rows',
  'import rejects an empty array'
);
select throws_ok(
  $$select public.import_ndvi_estimates('10000000-0000-4000-8000-000000000021', '{}')$$,
  'P0001', 'invalid_rows',
  'import rejects a non-array'
);
select throws_ok(
  $$select public.import_ndvi_estimates('10000000-0000-4000-8000-000000000099', current_setting('test.ndvi_estimate_rows')::jsonb)$$,
  'P0001', 'lahan_not_found',
  'import rejects an unknown field'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000021', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000021","role":"authenticated"}', true);
select results_eq(
  'select count(*)::bigint from public.ndvi_estimates',
  array[1::bigint],
  'owner can select their imported estimate'
);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000022', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000022","role":"authenticated"}', true);
select results_eq(
  'select count(*)::bigint from public.ndvi_estimates',
  array[0::bigint],
  'another authenticated user cannot select the estimate'
);
select throws_ok(
  $$insert into public.ndvi_estimates (lahan_id, user_id, target_date, status, unavailable_reason, model_name, model_version, feature_set, dataset_version, run_id, evaluation_role) values ('10000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000022', '2026-08-01', 'unavailable', 'fixture', 'random_forest', 'fixture-v1', 'F0+F1', 'fixture-v1', 'fixture-run', 'applied')$$,
  '42501', null,
  'authenticated clients cannot insert estimates'
);
select throws_ok(
  $$select public.import_ndvi_estimates('10000000-0000-4000-8000-000000000022', current_setting('test.ndvi_estimate_rows')::jsonb)$$,
  '42501', null,
  'authenticated clients cannot execute the import RPC'
);

select * from finish(true);
rollback;
