begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select plan(11);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000001', 'a@example.test', '{}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000002', 'b@example.test', '{}', '{}', 'authenticated', 'authenticated');

insert into public.lahan (id, user_id, name, category, geom)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'A', 'padi', st_geomfromtext('POLYGON((106 -6,106.001 -6,106.001 -6.001,106 -6.001,106 -6))', 4326)),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'B', 'padi', st_geomfromtext('POLYGON((107 -7,107.001 -7,107.001 -7.001,107 -7.001,107 -7))', 4326));

insert into public.lahan_notes (user_id, lahan_id, title, content)
values
  ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'A', 'fixture'),
  ('00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'B', 'fixture');

insert into public.lahan_health (user_id, lahan_id, status)
values
  ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'fixture'),
  ('00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'fixture');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

select results_eq('select count(*)::bigint from public.users', array[1::bigint], 'profile RLS isolates users');
select results_eq('select count(*)::bigint from public.lahan', array[1::bigint], 'lahan RLS isolates users');
select results_eq('select count(*)::bigint from public.lahan_with_info', array[1::bigint], 'security-invoker view preserves RLS');
select results_eq('select count(*)::bigint from public.lahan_notes', array[1::bigint], 'notes RLS isolates users');
select results_eq('select count(*)::bigint from public.lahan_health', array[1::bigint], 'health RLS isolates users');
select results_eq(
  'select count(*)::bigint from public.lahan where area_ha > 0',
  array[1::bigint],
  'geometry produces positive area'
);
select throws_ok(
  $$insert into public.lahan (user_id, name, geom) values ('00000000-0000-4000-8000-000000000002', 'forbidden', st_geomfromtext('POLYGON((106 -6,106.001 -6,106.001 -6.001,106 -6.001,106 -6))', 4326))$$,
  '42501',
  null,
  'cannot insert another user field'
);
select throws_ok(
  $$insert into public.lahan (user_id, name, category, geom) values ('00000000-0000-4000-8000-000000000001', 'non-rice', 'jagung', st_geomfromtext('POLYGON((106 -6,106.001 -6,106.001 -6.001,106 -6.001,106 -6))', 4326))$$,
  '23514',
  null,
  'padi-only scope rejects non-rice categories'
);
select throws_ok(
  $$insert into public.lahan_notes (user_id, lahan_id, title, content) values ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'forbidden', 'fixture')$$,
  '42501',
  null,
  'cannot attach a note to another user field'
);
select has_trigger('public', 'lahan', 'update_lahan_updated_at', 'lahan updated_at trigger exists');
select results_eq(
  $$select count(*)::bigint
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lahan'
      and column_name = 'area_ha'
      and is_generated = 'ALWAYS'$$,
  array[1::bigint],
  'area is generated from geometry'
);

select * from finish(true);
rollback;
