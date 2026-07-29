begin transaction read only;

with targets(id) as (
  values
    ('c140ecac-2449-4ced-9b53-10b486d28f01'::uuid),
    ('26f02acc-bfeb-46b6-99f9-72b12f3a681e'::uuid),
    ('9f8cc9a6-a61a-4580-bb65-898ea76f2379'::uuid),
    ('5763a836-8e1e-484c-971b-1b72f45c7c1d'::uuid),
    ('fbcd09bc-1455-4c17-ac5c-26dfaaae9eb4'::uuid),
    ('0890002d-5991-4889-97f4-adadbcb507e7'::uuid),
    ('221e4e43-69ea-4d85-b7dc-e5a111163e4e'::uuid)
)
select jsonb_build_object(
  'matched_lahan', (
    select count(*) from public.lahan l join targets t on t.id = l.id
  ),
  'dependent_thumbnails', (
    select count(*) from public.lahan_thumbnails x join targets t on t.id = x.lahan_id
  ),
  'dependent_health', (
    select count(*) from public.lahan_health x join targets t on t.id = x.lahan_id
  ),
  'dependent_notes', (
    select count(*) from public.lahan_notes x join targets t on t.id = x.lahan_id
  )
) as test_record_dependencies;

rollback;
