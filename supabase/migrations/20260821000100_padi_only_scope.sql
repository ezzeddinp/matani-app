begin;

alter table public.lahan
  add column if not exists legacy_category text;

update public.lahan
set
  legacy_category = coalesce(legacy_category, category),
  category = null
where category is not null
  and lower(category) <> 'padi';

alter table public.lahan
  drop constraint if exists lahan_category_allowed;

alter table public.lahan
  add constraint lahan_category_padi_only
    check (category is null or lower(category) = 'padi');

comment on column public.lahan.legacy_category is
  'Preserves unsupported pre-DEC-24 crop labels without presenting or relabeling them as padi.';

commit;
