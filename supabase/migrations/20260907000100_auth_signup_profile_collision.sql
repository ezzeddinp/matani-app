begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  requested_username text := nullif(btrim(new.raw_user_meta_data ->> 'username'), '');
  requested_phone_number text := nullif(btrim(new.raw_user_meta_data ->> 'phone_number'), '');
  requested_full_name text := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), '');
  profile_constraint_name text;
begin
  -- Optional profile values must never roll back creation of the auth account.
  -- Keep an already-owned unique value null so the user can choose another one later.
  if requested_username is not null and exists (
    select 1 from public.users where username = requested_username and id <> new.id
  ) then
    requested_username := null;
  end if;

  if requested_phone_number is not null and exists (
    select 1 from public.users where phone_number = requested_phone_number and id <> new.id
  ) then
    requested_phone_number := null;
  end if;

  begin
    insert into public.users (id, email, username, phone_number, full_name)
    values (
      new.id,
      coalesce(new.email, ''),
      requested_username,
      requested_phone_number,
      requested_full_name
    )
    on conflict (id) do update set
      email = excluded.email,
      username = coalesce(excluded.username, public.users.username),
      phone_number = coalesce(excluded.phone_number, public.users.phone_number),
      full_name = coalesce(excluded.full_name, public.users.full_name);
  exception
    when unique_violation then
      get stacked diagnostics profile_constraint_name = constraint_name;

      -- Close the small race between the availability checks and insert. Other
      -- integrity failures still abort signup instead of being hidden.
      if profile_constraint_name not in ('users_username_key', 'users_phone_number_key') then
        raise;
      end if;

      insert into public.users (id, email, full_name)
      values (new.id, coalesce(new.email, ''), requested_full_name)
      on conflict (id) do update set
        email = excluded.email,
        full_name = coalesce(excluded.full_name, public.users.full_name);
  end;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

commit;
