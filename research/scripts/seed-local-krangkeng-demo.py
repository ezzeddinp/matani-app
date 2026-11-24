"""Prints SQL that loads the Krangkeng 2021 research field into a LOCAL Supabase for the app demo (Fig. 4).

    python3 research/scripts/seed-local-krangkeng-demo.py --user-id <local auth user uuid> \
        | docker exec -i supabase_db_matani-app psql -U postgres -v ON_ERROR_STOP=1

Only prints SQL; it opens no connection, so it cannot reach a hosted database. The measurements are the real
2021 Sentinel-2 observations of the frozen Krangkeng study snapshot (both indices, original geometry, with
their provider product/scene/path provenance), labelled as a research-snapshot import rather than a live
worker run. Standard library only.
"""

import argparse
import hashlib
import json
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / "research/private/replacement-study/phase3-20260915-frozen-02/snapshot.json"
FIELD = ROOT / "research/private/ml-dataset/krangkeng-showcase-field.geojson"
LAHAN_ID = "6b7c1a52-2021-4c1e-9a6f-6b7261616e67"  # fixed so the estimate import can target it
NAMESPACE = uuid.UUID(LAHAN_ID)


def q(value):
    """SQL literal."""
    if value is None:
        return "null"
    if isinstance(value, (int, float)):
        return repr(value)
    return "'" + str(value).replace("'", "''") + "'"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", required=True, type=uuid.UUID)
    args = parser.parse_args()
    snapshot = json.loads(SNAPSHOT.read_text())
    geometry = json.loads(FIELD.read_text())["features"][0]["geometry"]
    geometry_hash = hashlib.sha256(json.dumps(geometry, sort_keys=True).encode()).hexdigest()
    user = str(args.user_id)
    days = [r for r in snapshot["records"] if r.get("catalogue_products")]
    assert len(days) == 71 and snapshot["candidate_id"] == "open-sea-2021-tile-42-r5566-c5626"

    out = ["begin;",
           f"insert into public.lahan (id, user_id, name, geom, category) values ({q(LAHAN_ID)}, {q(user)}, "
           f"'Krangkeng 2021 (riset)', extensions.st_setsrid(extensions.st_geomfromgeojson({q(json.dumps(geometry))}), 4326), 'padi');",
           # the insert trigger queues a live measurement job; this field's history comes from the snapshot instead
           f"delete from public.measurement_jobs where lahan_id = {q(LAHAN_ID)};"]
    passed = 0
    for record in days:
        ndvi, ndmi = record["indices"]["ndvi"], record["indices"]["ndmi"]
        a, b = ndvi["geometries"]["original"], ndmi["geometries"]["original"]
        ok = a["passes"] and b["passes"]
        passed += ok
        day = date.fromisoformat(record["day"])
        start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
        end = start + timedelta(days=1)
        acquired = datetime.fromtimestamp(ndvi["source"]["acquired"] / 1000, tz=timezone.utc)
        job_id = uuid.uuid5(NAMESPACE, f"job-{record['day']}")
        measurement_id = uuid.uuid5(NAMESPACE, f"measurement-{record['day']}")
        provenance = {
            "provider_scene_ids": ndvi["source"]["sceneIds"],
            "provider_data_paths": ndvi["source"]["dataPaths"],
            "provider_service_version": ndvi["source"]["serviceVersion"],
            "import": "research snapshot phase3-snapshot-v2 (not a live worker run)",
            "raster_sha256": {"ndvi": ndvi["raster_sha256"], "ndmi": ndmi["raster_sha256"]},
        }
        out.append(
            "insert into public.measurement_jobs (id, lahan_id, user_id, idempotency_key, request_window_start, "
            "request_window_end, status, attempts, completed_at) values "
            f"({q(job_id)}, {q(LAHAN_ID)}, {q(user)}, {q('research-snapshot-' + record['day'])}, {q(start.isoformat())}, "
            f"{q(end.isoformat())}, 'succeeded', 1, {q(start.isoformat())});")
        out.append(
            "insert into public.measurements (id, job_id, lahan_id, user_id, provider, mission, collection, "
            "processing_level, source_product_ids, acquisition_start, acquisition_end, geometry_hash, algorithm_version, "
            "evalscript_version, masking_config_version, crs, quality_output_resolution_m, quality_resampling_method, "
            "quality_status, rejection_reason, request_window_start, request_window_end, provider_provenance) values "
            f"({q(measurement_id)}, {q(job_id)}, {q(LAHAN_ID)}, {q(user)}, 'cdse-sentinel-hub', 'sentinel-2', "
            f"'sentinel-2-l2a', 'L2A', array[{', '.join(q(p) for p in ndvi['source']['productIds'])}]::text[], "
            f"{q(acquired.isoformat())}, {q(acquired.isoformat())}, {q(geometry_hash)}, 'phase3-snapshot-v2', "
            f"'phase3-snapshot-v2', 'scl-0-1-3-8-9-10', 'EPSG:32749', 10, 'NEAREST', "
            f"{q('passed' if ok else 'rejected')}, {q(None if ok else 'insufficient_valid_pixels')}, "
            f"{q(start.isoformat())}, {q(end.isoformat())}, {q(json.dumps(provenance))}::jsonb);")
        for name, stats, resolution in (("ndvi", a, 10), ("ndmi", b, 20)):
            out.append(
                "insert into public.measurement_index_stats (measurement_id, index_name, output_resolution_m, "
                "resampling_method, source_pixel_count, valid_pixel_count, valid_pixel_fraction, sample_count, mean) values "
                f"({q(measurement_id)}, {q(name)}, {resolution}, 'NEAREST', {stats['source_pixels']}, {stats['valid_pixels']}, "
                f"{stats['valid_pixels'] / stats['source_pixels']!r}, {stats['valid_pixels']}, {q(stats['mean'])});")
    assert passed == 23, passed
    out.append("commit;")
    print("\n".join(out))


if __name__ == "__main__":
    main()
