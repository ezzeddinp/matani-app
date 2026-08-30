-- M2: durable, provenance-complete Sentinel-2 measurement jobs and observations.
-- Provider writes are restricted to the server-side service role. Mobile clients
-- can only read rows belonging to their authenticated user.

create table public.measurement_jobs (
  id uuid primary key default gen_random_uuid(),
  lahan_id uuid not null references public.lahan(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  request_window_start timestamptz not null,
  request_window_end timestamptz not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'succeeded', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 3),
  max_attempts integer not null default 3 check (max_attempts between 1 and 3),
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint measurement_jobs_window_check
    check (request_window_start < request_window_end),
  constraint measurement_jobs_idempotency_unique
    unique (user_id, idempotency_key)
);

create index measurement_jobs_lahan_status_idx
  on public.measurement_jobs (lahan_id, status, created_at desc);

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.measurement_jobs(id) on delete cascade,
  lahan_id uuid not null references public.lahan(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  mission text not null,
  platform text,
  collection text not null,
  processing_level text not null,
  source_product_ids text[] not null default '{}',
  acquisition_start timestamptz,
  acquisition_end timestamptz,
  processing_at timestamptz not null default now(),
  geometry_hash text not null check (geometry_hash ~ '^[0-9a-f]{64}$'),
  algorithm_version text not null,
  evalscript_version text not null,
  masking_config_version text not null,
  crs text not null,
  quality_output_resolution_m numeric not null
    check (quality_output_resolution_m > 0),
  quality_resampling_method text not null,
  tile_cloud_metadata jsonb,
  polygon_cloud_shadow_fraction numeric
    check (polygon_cloud_shadow_fraction between 0 and 1),
  quality_status text not null
    check (quality_status in ('passed', 'rejected', 'unavailable')),
  rejection_reason text,
  request_window_start timestamptz not null,
  request_window_end timestamptz not null,
  provider_provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint measurements_window_check
    check (request_window_start < request_window_end),
  constraint measurements_source_identity_check check (
    quality_status = 'unavailable'
    or (
      cardinality(source_product_ids) > 0
      and jsonb_array_length(coalesce(provider_provenance -> 'provider_scene_ids', '[]'::jsonb)) > 0
      and jsonb_array_length(coalesce(provider_provenance -> 'provider_data_paths', '[]'::jsonb)) > 0
      and nullif(provider_provenance ->> 'provider_service_version', '') is not null
    )
  ),
  unique (
    lahan_id,
    geometry_hash,
    request_window_start,
    request_window_end,
    algorithm_version,
    evalscript_version,
    masking_config_version
  )
);

create index measurements_lahan_acquisition_idx
  on public.measurements (lahan_id, acquisition_start desc, created_at desc);

create table public.measurement_index_stats (
  measurement_id uuid not null references public.measurements(id) on delete cascade,
  index_name text not null check (index_name in ('ndvi', 'ndmi')),
  output_resolution_m numeric not null check (output_resolution_m > 0),
  resampling_method text not null,
  source_pixel_count integer not null check (source_pixel_count >= 0),
  valid_pixel_count integer not null
    check (valid_pixel_count >= 0 and valid_pixel_count <= source_pixel_count),
  valid_pixel_fraction numeric not null
    check (valid_pixel_fraction between 0 and 1),
  provider_geometry_pixel_count integer
    check (provider_geometry_pixel_count >= 0),
  derived_coverage_pixel_count integer
    check (derived_coverage_pixel_count >= 0),
  sample_count integer not null check (sample_count >= 0),
  minimum numeric,
  maximum numeric,
  mean numeric,
  standard_deviation numeric,
  primary key (measurement_id, index_name)
);

alter table public.measurement_jobs enable row level security;
alter table public.measurements enable row level security;
alter table public.measurement_index_stats enable row level security;

create policy "measurement_jobs_select_own"
  on public.measurement_jobs for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "measurements_select_own"
  on public.measurements for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "measurement_index_stats_select_own"
  on public.measurement_index_stats for select to authenticated
  using (
    exists (
      select 1
      from public.measurements m
      where m.id = measurement_index_stats.measurement_id
        and m.user_id = (select auth.uid())
    )
  );

revoke all on public.measurement_jobs from anon, authenticated;
revoke all on public.measurements from anon, authenticated;
revoke all on public.measurement_index_stats from anon, authenticated;
grant select on public.measurement_jobs to authenticated;
grant select on public.measurements to authenticated;
grant select on public.measurement_index_stats to authenticated;

create or replace function public.enqueue_initial_measurement_job()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  window_end timestamptz := date_trunc('day', now()) + interval '1 day';
begin
  insert into public.measurement_jobs (
    lahan_id,
    user_id,
    idempotency_key,
    request_window_start,
    request_window_end
  ) values (
    new.id,
    new.user_id,
    'initial:' || new.id::text,
    window_end - interval '31 days',
    window_end
  ) on conflict (user_id, idempotency_key) do nothing;
  return new;
end;
$$;

revoke all on function public.enqueue_initial_measurement_job() from public;

create trigger enqueue_initial_measurement_after_lahan_insert
after insert on public.lahan
for each row execute function public.enqueue_initial_measurement_job();

create or replace function public.enqueue_measurement_job(
  p_lahan_id uuid,
  p_user_id uuid,
  p_request_window_start timestamptz,
  p_request_window_end timestamptz,
  p_idempotency_key text
)
returns public.measurement_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  queued public.measurement_jobs;
begin
  if p_request_window_start >= p_request_window_end
     or p_request_window_end - p_request_window_start > interval '31 days' then
    raise exception 'measurement-window-invalid';
  end if;
  if not exists (
    select 1 from public.lahan
    where id = p_lahan_id and user_id = p_user_id
  ) then
    raise exception 'measurement-field-not-found';
  end if;

  insert into public.measurement_jobs (
    lahan_id, user_id, idempotency_key, request_window_start, request_window_end
  ) values (
    p_lahan_id, p_user_id, left(p_idempotency_key, 250),
    p_request_window_start, p_request_window_end
  )
  on conflict (user_id, idempotency_key) do update
    set idempotency_key = excluded.idempotency_key
  returning * into queued;
  return queued;
end;
$$;

create or replace function public.claim_measurement_job(
  p_job_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed public.measurement_jobs;
  did_claim boolean := false;
begin
  if not exists (
    select 1
    from public.measurement_jobs j
    join public.lahan l on l.id = j.lahan_id
    where j.id = p_job_id
      and j.user_id = p_user_id
      and l.user_id = p_user_id
  ) then
    raise exception 'measurement-job-not-found';
  end if;

  update public.measurement_jobs
  set status = 'processing',
      attempts = attempts + 1,
      started_at = now(),
      completed_at = null,
      error_code = null,
      error_message = null,
      updated_at = now()
  where id = p_job_id
    and user_id = p_user_id
    and (
      status in ('queued', 'failed')
      or (status = 'processing' and started_at < now() - interval '10 minutes')
    )
    and attempts < max_attempts
  returning * into claimed;

  did_claim := claimed.id is not null;

  if claimed.id is null then
    select * into claimed
    from public.measurement_jobs
    where id = p_job_id and user_id = p_user_id;
  end if;

  return jsonb_build_object('claimed', did_claim, 'job', to_jsonb(claimed));
end;
$$;

create or replace function public.complete_measurement_job(
  p_job_id uuid,
  p_result jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_job public.measurement_jobs;
  persisted_measurement_id uuid;
  stat jsonb;
begin
  select * into target_job
  from public.measurement_jobs
  where id = p_job_id
  for update;

  if target_job.id is null or target_job.status <> 'processing' then
    raise exception 'measurement-job-not-processing';
  end if;

  insert into public.measurements (
    job_id, lahan_id, user_id, provider, mission, platform, collection,
    processing_level, source_product_ids, acquisition_start, acquisition_end,
    processing_at, geometry_hash, algorithm_version, evalscript_version,
    masking_config_version, crs, quality_output_resolution_m,
    quality_resampling_method, tile_cloud_metadata,
    polygon_cloud_shadow_fraction, quality_status, rejection_reason,
    request_window_start, request_window_end, provider_provenance
  ) values (
    target_job.id,
    target_job.lahan_id,
    target_job.user_id,
    p_result ->> 'provider',
    p_result ->> 'mission',
    p_result ->> 'platform',
    p_result ->> 'collection',
    p_result ->> 'processing_level',
    coalesce(array(select jsonb_array_elements_text(p_result -> 'source_product_ids')), '{}'),
    nullif(p_result ->> 'acquisition_start', '')::timestamptz,
    nullif(p_result ->> 'acquisition_end', '')::timestamptz,
    coalesce(nullif(p_result ->> 'processing_at', '')::timestamptz, now()),
    p_result ->> 'geometry_hash',
    p_result ->> 'algorithm_version',
    p_result ->> 'evalscript_version',
    p_result ->> 'masking_config_version',
    p_result ->> 'crs',
    (p_result ->> 'quality_output_resolution_m')::numeric,
    p_result ->> 'quality_resampling_method',
    p_result -> 'tile_cloud_metadata',
    nullif(p_result ->> 'polygon_cloud_shadow_fraction', '')::numeric,
    p_result ->> 'quality_status',
    nullif(p_result ->> 'rejection_reason', ''),
    target_job.request_window_start,
    target_job.request_window_end,
    coalesce(p_result -> 'provider_provenance', '{}'::jsonb)
  )
  on conflict (job_id) do update set job_id = excluded.job_id
  returning id into persisted_measurement_id;

  for stat in select * from jsonb_array_elements(coalesce(p_result -> 'index_stats', '[]'::jsonb))
  loop
    insert into public.measurement_index_stats (
      measurement_id, index_name, output_resolution_m, resampling_method,
      source_pixel_count, valid_pixel_count, valid_pixel_fraction,
      provider_geometry_pixel_count, derived_coverage_pixel_count,
      sample_count, minimum, maximum, mean, standard_deviation
    ) values (
      persisted_measurement_id,
      stat ->> 'index_name',
      (stat ->> 'output_resolution_m')::numeric,
      stat ->> 'resampling_method',
      (stat ->> 'source_pixel_count')::integer,
      (stat ->> 'valid_pixel_count')::integer,
      (stat ->> 'valid_pixel_fraction')::numeric,
      nullif(stat ->> 'provider_geometry_pixel_count', '')::integer,
      nullif(stat ->> 'derived_coverage_pixel_count', '')::integer,
      (stat ->> 'sample_count')::integer,
      nullif(stat ->> 'minimum', '')::numeric,
      nullif(stat ->> 'maximum', '')::numeric,
      nullif(stat ->> 'mean', '')::numeric,
      nullif(stat ->> 'standard_deviation', '')::numeric
    )
    on conflict (measurement_id, index_name) do nothing;
  end loop;

  update public.measurement_jobs
  set status = 'succeeded', completed_at = now(), updated_at = now()
  where id = target_job.id;

  return persisted_measurement_id;
end;
$$;

create or replace function public.fail_measurement_job(
  p_job_id uuid,
  p_error_code text,
  p_error_message text
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.measurement_jobs
  set status = 'failed',
      error_code = left(p_error_code, 100),
      error_message = left(p_error_message, 500),
      completed_at = now(),
      updated_at = now()
  where id = p_job_id and status = 'processing';
$$;

revoke all on function public.enqueue_measurement_job(uuid, uuid, timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.claim_measurement_job(uuid, uuid) from public, anon, authenticated;
revoke all on function public.complete_measurement_job(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.fail_measurement_job(uuid, text, text) from public, anon, authenticated;
grant execute on function public.enqueue_measurement_job(uuid, uuid, timestamptz, timestamptz, text) to service_role;
grant execute on function public.claim_measurement_job(uuid, uuid) to service_role;
grant execute on function public.complete_measurement_job(uuid, jsonb) to service_role;
grant execute on function public.fail_measurement_job(uuid, text, text) to service_role;

create view public.measurement_observations
with (security_invoker = true)
as
select
  m.id,
  m.lahan_id,
  m.user_id,
  case when m.quality_status = 'passed' then ndvi.mean else null end as ndvi_score,
  case when m.quality_status = 'passed' then ndmi.mean else null end as ndmi_score,
  m.quality_status as status,
  m.rejection_reason,
  m.acquisition_start as captured_at,
  m.created_at,
  ndvi.valid_pixel_count as ndvi_valid_pixel_count,
  ndmi.valid_pixel_count as ndmi_valid_pixel_count,
  case when m.quality_status in ('passed', 'rejected') then 'measured' else 'unavailable' end as data_state,
  m.source_product_ids,
  m.algorithm_version,
  m.evalscript_version,
  m.masking_config_version
from public.measurements m
left join public.measurement_index_stats ndvi
  on ndvi.measurement_id = m.id and ndvi.index_name = 'ndvi'
left join public.measurement_index_stats ndmi
  on ndmi.measurement_id = m.id and ndmi.index_name = 'ndmi';

revoke all on public.measurement_observations from anon;
grant select on public.measurement_observations to authenticated;
