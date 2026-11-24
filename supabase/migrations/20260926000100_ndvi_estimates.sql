create table public.ndvi_estimates (
  id uuid primary key default gen_random_uuid(),
  lahan_id uuid not null references public.lahan(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  target_date date not null,
  ndvi_estimate double precision check (ndvi_estimate between -1 and 1),
  status text not null check (status in ('estimated', 'unavailable')),
  unavailable_reason text,
  radar_acquired_at timestamptz,
  radar_product_ids text[] not null default '{}',
  orbit_direction text check (orbit_direction in ('ASCENDING', 'DESCENDING')),
  offset_days double precision,
  model_name text not null check (model_name in ('random_forest', 'xgboost')),
  model_version text not null check (length(btrim(model_version)) > 0),
  feature_set text not null,
  dataset_version text not null,
  run_id text not null,
  evaluation_role text not null check (evaluation_role in ('held_out_test', 'applied')),
  reference_ndvi double precision check (reference_ndvi between -1 and 1),
  model_test_mae double precision check (model_test_mae >= 0),
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check ((status = 'estimated') = (ndvi_estimate is not null)),
  check (status <> 'unavailable' or (unavailable_reason is not null and length(btrim(unavailable_reason)) > 0)),
  check (status <> 'estimated' or radar_acquired_at is not null),
  check (status <> 'estimated' or cardinality(radar_product_ids) > 0),
  check (reference_ndvi is null or evaluation_role = 'held_out_test'),
  unique (lahan_id, target_date, model_version, evaluation_role)
);

create index ndvi_estimates_lahan_date_idx on public.ndvi_estimates (lahan_id, target_date);

alter table public.ndvi_estimates enable row level security;

create policy "ndvi_estimates_select_own"
  on public.ndvi_estimates for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ndvi_estimates from anon, authenticated;
grant select on public.ndvi_estimates to authenticated;

create or replace function public.import_ndvi_estimates(p_lahan_id uuid, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owner_id uuid;
  item jsonb;
  estimate public.ndvi_estimates;
  imported integer := 0;
begin
  select user_id into owner_id from public.lahan where id = p_lahan_id;
  if not found then
    raise exception 'lahan_not_found';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'invalid_rows';
  end if;
  if jsonb_array_length(p_rows) = 0 then
    raise exception 'invalid_rows';
  end if;

  for item in select value from jsonb_array_elements(p_rows) loop
    estimate := jsonb_populate_record(
      null::public.ndvi_estimates,
      '{"radar_product_ids": [], "provenance": {}}'::jsonb || item
    );
    insert into public.ndvi_estimates (
      lahan_id, user_id, target_date, ndvi_estimate, status, unavailable_reason,
      radar_acquired_at, radar_product_ids, orbit_direction, offset_days,
      model_name, model_version, feature_set, dataset_version, run_id,
      evaluation_role, reference_ndvi, model_test_mae, provenance
    ) values (
      p_lahan_id, owner_id, estimate.target_date, estimate.ndvi_estimate,
      estimate.status, estimate.unavailable_reason, estimate.radar_acquired_at,
      estimate.radar_product_ids, estimate.orbit_direction, estimate.offset_days,
      estimate.model_name, estimate.model_version, estimate.feature_set,
      estimate.dataset_version, estimate.run_id, estimate.evaluation_role,
      estimate.reference_ndvi, estimate.model_test_mae, estimate.provenance
    )
    on conflict (lahan_id, target_date, model_version, evaluation_role) do update set
      user_id = excluded.user_id,
      ndvi_estimate = excluded.ndvi_estimate,
      status = excluded.status,
      unavailable_reason = excluded.unavailable_reason,
      radar_acquired_at = excluded.radar_acquired_at,
      radar_product_ids = excluded.radar_product_ids,
      orbit_direction = excluded.orbit_direction,
      offset_days = excluded.offset_days,
      model_name = excluded.model_name,
      feature_set = excluded.feature_set,
      dataset_version = excluded.dataset_version,
      run_id = excluded.run_id,
      reference_ndvi = excluded.reference_ndvi,
      model_test_mae = excluded.model_test_mae,
      provenance = excluded.provenance;
    imported := imported + 1;
  end loop;
  return imported;
end;
$$;

revoke all on function public.import_ndvi_estimates(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.import_ndvi_estimates(uuid, jsonb) to service_role;
