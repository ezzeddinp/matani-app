-- M1 physical-schema decision, ready for an M2 versioned migration.
-- Do not apply during M1: production measurement persistence begins in M2.
create table public.measurements (
  id uuid primary key default gen_random_uuid(),
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
  geometry_hash text not null,
  algorithm_version text not null,
  evalscript_version text not null,
  masking_config_version text not null,
  crs text not null,
  output_resolution_m numeric not null,
  resampling_method text not null,
  tile_cloud_metadata jsonb,
  polygon_cloud_shadow_fraction numeric,
  valid_pixel_fraction numeric,
  quality_status text not null check (quality_status in ('passed', 'rejected', 'unavailable')),
  rejection_reason text,
  request_window_start timestamptz not null,
  request_window_end timestamptz not null,
  provider_provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (lahan_id, geometry_hash, request_window_start, request_window_end, algorithm_version, evalscript_version, masking_config_version)
);

create table public.measurement_index_stats (
  measurement_id uuid not null references public.measurements(id) on delete cascade,
  index_name text not null check (index_name in ('ndvi', 'ndmi')),
  sample_count integer not null check (sample_count >= 0),
  minimum numeric,
  maximum numeric,
  mean numeric,
  standard_deviation numeric,
  primary key (measurement_id, index_name)
);
