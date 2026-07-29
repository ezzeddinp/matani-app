begin transaction read only;
set local search_path = public, extensions, pg_catalog;

select jsonb_pretty(
  jsonb_build_object(
    'users', jsonb_build_object(
      'rows', (select count(*) from public.users),
      'null_full_name', (select count(*) from public.users where full_name is null),
      'null_created_at', (select count(*) from public.users where created_at is null),
      'null_updated_at', (select count(*) from public.users where updated_at is null),
      'orphan_auth_user', (
        select count(*)
        from public.users u
        left join auth.users au on au.id = u.id
        where au.id is null
      )
    ),
    'lahan', jsonb_build_object(
      'rows', (select count(*) from public.lahan),
      'null_user_id', (select count(*) from public.lahan where user_id is null),
      'null_geom', (select count(*) from public.lahan where geom is null),
      'invalid_geom', (
        select count(*)
        from public.lahan
        where geom is not null and not st_isvalid(geom)
      ),
      'nonpositive_area', (
        select count(*)
        from public.lahan
        where geom is not null and st_area(geom::geography) <= 0
      ),
      'invalid_name_length', (
        select count(*)
        from public.lahan
        where char_length(name) not between 1 and 120
      ),
      'invalid_category', (
        select count(*)
        from public.lahan
        where category is not null
          and lower(category) not in ('padi', 'jagung', 'kedelai', 'teh', 'kopi')
      ),
      'orphan_auth_user', (
        select count(*)
        from public.lahan l
        left join auth.users au on au.id = l.user_id
        where l.user_id is not null and au.id is null
      ),
      'null_created_at', (select count(*) from public.lahan where created_at is null),
      'null_updated_at', (select count(*) from public.lahan where updated_at is null)
    ),
    'lahan_thumbnails', jsonb_build_object(
      'rows', (select count(*) from public.lahan_thumbnails),
      'null_lahan_id', (select count(*) from public.lahan_thumbnails where lahan_id is null),
      'null_user_id', (select count(*) from public.lahan_thumbnails where user_id is null),
      'orphan_lahan', (
        select count(*)
        from public.lahan_thumbnails t
        left join public.lahan l on l.id = t.lahan_id
        where t.lahan_id is not null and l.id is null
      ),
      'owner_mismatch', (
        select count(*)
        from public.lahan_thumbnails t
        join public.lahan l on l.id = t.lahan_id
        where t.user_id is distinct from l.user_id
      ),
      'null_created_at', (
        select count(*) from public.lahan_thumbnails where created_at is null
      ),
      'null_updated_at', (
        select count(*) from public.lahan_thumbnails where updated_at is null
      )
    ),
    'lahan_health', jsonb_build_object(
      'rows', (select count(*) from public.lahan_health),
      'null_lahan_id', (select count(*) from public.lahan_health where lahan_id is null),
      'null_user_id', (select count(*) from public.lahan_health where user_id is null),
      'orphan_lahan', (
        select count(*)
        from public.lahan_health h
        left join public.lahan l on l.id = h.lahan_id
        where h.lahan_id is not null and l.id is null
      ),
      'owner_mismatch', (
        select count(*)
        from public.lahan_health h
        join public.lahan l on l.id = h.lahan_id
        where h.user_id is distinct from l.user_id
      ),
      'invalid_ndvi', (
        select count(*)
        from public.lahan_health
        where ndvi_score is not null and ndvi_score not between -1 and 1
      ),
      'invalid_ndmi', (
        select count(*)
        from public.lahan_health
        where ndmi_score is not null and ndmi_score not between -1 and 1
      ),
      'null_created_at', (
        select count(*) from public.lahan_health where created_at is null
      ),
      'null_updated_at', (
        select count(*) from public.lahan_health where updated_at is null
      )
    ),
    'lahan_notes', jsonb_build_object(
      'rows', (select count(*) from public.lahan_notes),
      'null_user_id', (select count(*) from public.lahan_notes where user_id is null),
      'orphan_lahan', (
        select count(*)
        from public.lahan_notes n
        left join public.lahan l on l.id = n.lahan_id
        where n.lahan_id is not null and l.id is null
      ),
      'owner_mismatch', (
        select count(*)
        from public.lahan_notes n
        join public.lahan l on l.id = n.lahan_id
        where n.user_id is distinct from l.user_id
      ),
      'invalid_title_length', (
        select count(*)
        from public.lahan_notes
        where char_length(title) not between 1 and 160
      ),
      'invalid_content_length', (
        select count(*)
        from public.lahan_notes
        where char_length(content) not between 1 and 10000
      ),
      'null_created_at', (select count(*) from public.lahan_notes where created_at is null),
      'null_updated_at', (select count(*) from public.lahan_notes where updated_at is null)
    ),
    'security', jsonb_build_object(
      'rls_enabled_tables', (
        select count(*)
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname in ('users', 'lahan', 'lahan_thumbnails', 'lahan_health', 'lahan_notes')
          and c.relrowsecurity
      ),
      'view_security_invoker', coalesce((
        select (
          'security_invoker=on' = any(coalesce(c.reloptions, array[]::text[]))
          or 'security_invoker=true' = any(coalesce(c.reloptions, array[]::text[]))
        )
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'lahan_with_info'
      ), false)
    )
  )
) as hosted_m0_compatibility;

rollback;
