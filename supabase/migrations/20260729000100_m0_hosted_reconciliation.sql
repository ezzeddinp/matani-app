begin;
set local search_path = public, extensions, pg_catalog;

do $$
declare
  matched_count integer;
  invalid_count integer;
begin
  select count(*), count(*) filter (where not st_isvalid(geom))
  into matched_count, invalid_count
  from public.lahan
  where id in (
    'c140ecac-2449-4ced-9b53-10b486d28f01'::uuid,
    '26f02acc-bfeb-46b6-99f9-72b12f3a681e'::uuid,
    '9f8cc9a6-a61a-4580-bb65-898ea76f2379'::uuid,
    '5763a836-8e1e-484c-971b-1b72f45c7c1d'::uuid,
    'fbcd09bc-1455-4c17-ac5c-26dfaaae9eb4'::uuid,
    '0890002d-5991-4889-97f4-adadbcb507e7'::uuid,
    '221e4e43-69ea-4d85-b7dc-e5a111163e4e'::uuid
  );

  if matched_count not in (0, 7) then
    raise exception
      'Expected either all seven approved test polygons or none; found %',
      matched_count;
  end if;

  if invalid_count <> matched_count then
    raise exception
      'Refusing to delete an approved target that is no longer an invalid test polygon';
  end if;

  delete from public.lahan
  where id in (
    'c140ecac-2449-4ced-9b53-10b486d28f01'::uuid,
    '26f02acc-bfeb-46b6-99f9-72b12f3a681e'::uuid,
    '9f8cc9a6-a61a-4580-bb65-898ea76f2379'::uuid,
    '5763a836-8e1e-484c-971b-1b72f45c7c1d'::uuid,
    'fbcd09bc-1455-4c17-ac5c-26dfaaae9eb4'::uuid,
    '0890002d-5991-4889-97f4-adadbcb507e7'::uuid,
    '221e4e43-69ea-4d85-b7dc-e5a111163e4e'::uuid
  );
end;
$$;

drop event trigger if exists ensure_rls;
drop function if exists public.rls_auto_enable();

alter table public.users
  alter column full_name set default '',
  alter column full_name set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.lahan
  alter column user_id set not null,
  alter column geom set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.lahan
  drop constraint if exists lahan_name_length,
  drop constraint if exists lahan_category_allowed,
  drop constraint if exists lahan_valid_geometry,
  drop constraint if exists lahan_positive_area;

alter table public.lahan
  add constraint lahan_name_length
    check (char_length(name) between 1 and 120),
  add constraint lahan_category_allowed
    check (category is null or category in ('padi', 'jagung', 'kedelai', 'teh', 'kopi')),
  add constraint lahan_valid_geometry
    check (st_isvalid(geom)),
  add constraint lahan_positive_area
    check (st_area(geom::geography) > 0);

alter table public.lahan_thumbnails
  alter column lahan_id set not null,
  alter column user_id set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.lahan_health
  alter column lahan_id set not null,
  alter column user_id set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.lahan_health
  drop constraint if exists lahan_health_ndvi_range,
  drop constraint if exists lahan_health_ndmi_range,
  drop constraint if exists lahan_health_user_id_fkey;

alter table public.lahan_health
  add constraint lahan_health_ndvi_range
    check (ndvi_score is null or ndvi_score between -1 and 1),
  add constraint lahan_health_ndmi_range
    check (ndmi_score is null or ndmi_score between -1 and 1),
  add constraint lahan_health_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.lahan_notes
  alter column user_id set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.lahan_notes
  drop constraint if exists lahan_notes_title_length,
  drop constraint if exists lahan_notes_content_length;

alter table public.lahan_notes
  add constraint lahan_notes_title_length
    check (char_length(title) between 1 and 160),
  add constraint lahan_notes_content_length
    check (char_length(content) between 1 and 10000);

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

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.update_updated_at_column() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists update_users_updated_at on public.users;
drop trigger if exists update_lahan_updated_at on public.lahan;
drop trigger if exists update_lahan_thumbnails_updated_at on public.lahan_thumbnails;
drop trigger if exists update_lahan_health_updated_at on public.lahan_health;
drop trigger if exists update_lahan_notes_updated_at on public.lahan_notes;

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

drop index if exists public.idx_lahan_health_captured_at;
drop index if exists public.idx_lahan_health_lahan_id;
drop index if exists public.idx_lahan_notes_created_at;
drop index if exists public.idx_lahan_notes_user_id;
drop index if exists public.idx_users_phone_number;
drop index if exists public.idx_users_username;

create index if not exists idx_lahan_health_lahan_captured
  on public.lahan_health (lahan_id, captured_at desc nulls last);
create index if not exists idx_lahan_notes_user_created
  on public.lahan_notes (user_id, created_at desc);

alter table public.users enable row level security;
alter table public.lahan enable row level security;
alter table public.lahan_thumbnails enable row level security;
alter table public.lahan_health enable row level security;
alter table public.lahan_notes enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'users',
        'lahan',
        'lahan_thumbnails',
        'lahan_health',
        'lahan_notes'
      )
  loop
    execute format(
      'drop policy %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end;
$$;

create policy users_select_own on public.users
for select using (auth.uid() = id);
create policy users_insert_own on public.users
for insert with check (auth.uid() = id);
create policy users_update_own on public.users
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy lahan_select_own on public.lahan
for select using (auth.uid() = user_id);
create policy lahan_insert_own on public.lahan
for insert with check (auth.uid() = user_id);
create policy lahan_update_own on public.lahan
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy lahan_delete_own on public.lahan
for delete using (auth.uid() = user_id);

create policy thumbnails_select_own on public.lahan_thumbnails
for select using (
  auth.uid() = user_id and exists (
    select 1 from public.lahan
    where lahan.id = lahan_id and lahan.user_id = auth.uid()
  )
);
create policy thumbnails_insert_own on public.lahan_thumbnails
for insert with check (
  auth.uid() = user_id and exists (
    select 1 from public.lahan
    where lahan.id = lahan_id and lahan.user_id = auth.uid()
  )
);
create policy thumbnails_update_own on public.lahan_thumbnails
for update using (auth.uid() = user_id)
with check (
  auth.uid() = user_id and exists (
    select 1 from public.lahan
    where lahan.id = lahan_id and lahan.user_id = auth.uid()
  )
);
create policy thumbnails_delete_own on public.lahan_thumbnails
for delete using (auth.uid() = user_id);

create policy health_select_own on public.lahan_health
for select using (
  auth.uid() = user_id and exists (
    select 1 from public.lahan
    where lahan.id = lahan_id and lahan.user_id = auth.uid()
  )
);
create policy health_insert_own on public.lahan_health
for insert with check (
  auth.uid() = user_id and exists (
    select 1 from public.lahan
    where lahan.id = lahan_id and lahan.user_id = auth.uid()
  )
);
create policy health_update_own on public.lahan_health
for update using (auth.uid() = user_id)
with check (
  auth.uid() = user_id and exists (
    select 1 from public.lahan
    where lahan.id = lahan_id and lahan.user_id = auth.uid()
  )
);
create policy health_delete_own on public.lahan_health
for delete using (auth.uid() = user_id);

create policy notes_select_own on public.lahan_notes
for select using (auth.uid() = user_id);
create policy notes_insert_own on public.lahan_notes
for insert with check (
  auth.uid() = user_id and (
    lahan_id is null or exists (
      select 1 from public.lahan
      where lahan.id = lahan_id and lahan.user_id = auth.uid()
    )
  )
);
create policy notes_update_own on public.lahan_notes
for update using (auth.uid() = user_id)
with check (
  auth.uid() = user_id and (
    lahan_id is null or exists (
      select 1 from public.lahan
      where lahan.id = lahan_id and lahan.user_id = auth.uid()
    )
  )
);
create policy notes_delete_own on public.lahan_notes
for delete using (auth.uid() = user_id);

drop view if exists public.lahan_with_info;
create view public.lahan_with_info
with (security_invoker = true)
as
select
  id,
  user_id,
  name,
  st_asgeojson(geom)::jsonb as geojson,
  area_ha,
  thumbnail_url,
  category,
  st_asgeojson(st_centroid(geom))::jsonb as centroid,
  created_at,
  updated_at
from public.lahan;

revoke all on public.users from anon;
revoke all on public.lahan from anon;
revoke all on public.lahan_thumbnails from anon;
revoke all on public.lahan_health from anon;
revoke all on public.lahan_notes from anon;
revoke all on public.lahan_with_info from anon;

grant select, insert, update on public.users to authenticated;
grant select, insert, update, delete on public.lahan to authenticated;
grant select, insert, update, delete on public.lahan_thumbnails to authenticated;
grant select, insert, update, delete on public.lahan_health to authenticated;
grant select, insert, update, delete on public.lahan_notes to authenticated;
grant select on public.lahan_with_info to authenticated;

commit;
