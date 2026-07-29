begin transaction read only;
set local search_path = public, extensions, pg_catalog;

with invalid as (
  select
    id,
    name,
    category,
    geom,
    st_isvalidreason(geom) as reason,
    st_makevalid(geom) as repaired
  from public.lahan
  where geom is not null and not st_isvalid(geom)
),
classified as (
  select
    id,
    name,
    category,
    regexp_replace(reason, E'\\[[^]]+\\]', '[coordinate-redacted]', 'g') as reason,
    geometrytype(repaired) as repaired_type,
    st_area(geom::geography) as original_area_m2,
    st_area(repaired::geography) as repaired_area_m2
  from invalid
)
select
  id,
  name,
  category,
  reason,
  repaired_type,
  round(
    (original_area_m2 / 10000)::numeric,
    6
  ) as stored_geometry_area_ha,
  round(
    (repaired_area_m2 / 10000)::numeric,
    6
  ) as repaired_geometry_area_ha,
  round(
    (
      case
        when original_area_m2 > 0
          then abs(repaired_area_m2 - original_area_m2) / original_area_m2 * 100
        else null
      end
    )::numeric,
    6
  ) as absolute_area_change_percent
from classified
order by name, id;

rollback;
