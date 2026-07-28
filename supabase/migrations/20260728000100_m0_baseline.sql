create extension if not exists postgis with schema extensions;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  username text unique,
  phone_number text unique,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lahan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  geom extensions.geometry(Polygon, 4326) not null,
  area_ha numeric generated always as (extensions.st_area(geom::extensions.geography) / 10000) stored,
  thumbnail_url text,
  category text check (category is null or category in ('padi', 'jagung', 'kedelai', 'teh', 'kopi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lahan_valid_geometry check (extensions.st_isvalid(geom)),
  constraint lahan_positive_area check (extensions.st_area(geom::extensions.geography) > 0)
);

create table public.lahan_thumbnails (
  id uuid primary key default gen_random_uuid(),
  lahan_id uuid not null references public.lahan(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  public_url text,
  description text,
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lahan_health (
  id uuid primary key default gen_random_uuid(),
  lahan_id uuid not null references public.lahan(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ndvi_score numeric check (ndvi_score is null or ndvi_score between -1 and 1),
  ndmi_score numeric check (ndmi_score is null or ndmi_score between -1 and 1),
  status text,
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lahan_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lahan_id uuid references public.lahan(id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  content text not null check (char_length(content) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_lahan_geom on public.lahan using gist (geom);
create index idx_lahan_user_id on public.lahan (user_id);
create index idx_lahan_user_category on public.lahan (user_id, category);
create index idx_lahan_thumbnails_lahan_id on public.lahan_thumbnails (lahan_id);
create index idx_lahan_thumbnails_user_id on public.lahan_thumbnails (user_id);
create index idx_lahan_health_lahan_captured on public.lahan_health (lahan_id, captured_at desc nulls last);
create index idx_lahan_notes_user_created on public.lahan_notes (user_id, created_at desc);
create index idx_lahan_notes_lahan_id on public.lahan_notes (lahan_id);

create trigger update_users_updated_at before update on public.users
for each row execute function public.update_updated_at_column();
create trigger update_lahan_updated_at before update on public.lahan
for each row execute function public.update_updated_at_column();
create trigger update_lahan_thumbnails_updated_at before update on public.lahan_thumbnails
for each row execute function public.update_updated_at_column();
create trigger update_lahan_health_updated_at before update on public.lahan_health
for each row execute function public.update_updated_at_column();
create trigger update_lahan_notes_updated_at before update on public.lahan_notes
for each row execute function public.update_updated_at_column();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, username, phone_number, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'phone_number', ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    username = coalesce(excluded.username, public.users.username),
    phone_number = coalesce(excluded.phone_number, public.users.phone_number),
    full_name = coalesce(excluded.full_name, public.users.full_name);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.lahan enable row level security;
alter table public.lahan_thumbnails enable row level security;
alter table public.lahan_health enable row level security;
alter table public.lahan_notes enable row level security;

create policy users_select_own on public.users for select using (auth.uid() = id);
create policy users_insert_own on public.users for insert with check (auth.uid() = id);
create policy users_update_own on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

create policy lahan_select_own on public.lahan for select using (auth.uid() = user_id);
create policy lahan_insert_own on public.lahan for insert with check (auth.uid() = user_id);
create policy lahan_update_own on public.lahan for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy lahan_delete_own on public.lahan for delete using (auth.uid() = user_id);

create policy thumbnails_select_own on public.lahan_thumbnails for select using (
  auth.uid() = user_id and exists (
    select 1 from public.lahan where lahan.id = lahan_id and lahan.user_id = auth.uid()
  )
);
create policy thumbnails_insert_own on public.lahan_thumbnails for insert with check (
  auth.uid() = user_id and exists (
    select 1 from public.lahan where lahan.id = lahan_id and lahan.user_id = auth.uid()
  )
);
create policy thumbnails_update_own on public.lahan_thumbnails for update using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id and exists (
    select 1 from public.lahan where lahan.id = lahan_id and lahan.user_id = auth.uid()
  )
);
create policy thumbnails_delete_own on public.lahan_thumbnails for delete using (auth.uid() = user_id);

create policy health_select_own on public.lahan_health for select using (
  auth.uid() = user_id and exists (
    select 1 from public.lahan where lahan.id = lahan_id and lahan.user_id = auth.uid()
  )
);
create policy health_insert_own on public.lahan_health for insert with check (
  auth.uid() = user_id and exists (
    select 1 from public.lahan where lahan.id = lahan_id and lahan.user_id = auth.uid()
  )
);
create policy health_update_own on public.lahan_health for update using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id and exists (
    select 1 from public.lahan where lahan.id = lahan_id and lahan.user_id = auth.uid()
  )
);
create policy health_delete_own on public.lahan_health for delete using (auth.uid() = user_id);

create policy notes_select_own on public.lahan_notes for select using (auth.uid() = user_id);
create policy notes_insert_own on public.lahan_notes for insert with check (
  auth.uid() = user_id and (
    lahan_id is null or exists (
      select 1 from public.lahan where lahan.id = lahan_id and lahan.user_id = auth.uid()
    )
  )
);
create policy notes_update_own on public.lahan_notes for update using (auth.uid() = user_id)
with check (
  auth.uid() = user_id and (
    lahan_id is null or exists (
      select 1 from public.lahan where lahan.id = lahan_id and lahan.user_id = auth.uid()
    )
  )
);
create policy notes_delete_own on public.lahan_notes for delete using (auth.uid() = user_id);

create view public.lahan_with_info
with (security_invoker = true)
as
select
  id,
  user_id,
  name,
  extensions.st_asgeojson(geom)::jsonb as geojson,
  area_ha,
  thumbnail_url,
  category,
  extensions.st_asgeojson(extensions.st_centroid(geom))::jsonb as centroid,
  created_at,
  updated_at
from public.lahan;

grant select, insert, update on public.users to authenticated;
grant select, insert, update, delete on public.lahan to authenticated;
grant select, insert, update, delete on public.lahan_thumbnails to authenticated;
grant select, insert, update, delete on public.lahan_health to authenticated;
grant select, insert, update, delete on public.lahan_notes to authenticated;
grant select on public.lahan_with_info to authenticated;
