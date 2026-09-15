import hashlib
import json
import subprocess
from pathlib import Path

from shapely.geometry import mapping, shape, box

root = Path(__file__).resolve().parents[2]
source = root / 'research/private/replacement-study/open-sea-candidates.geojson'
raw = source.read_bytes()
assert hashlib.sha256(raw).hexdigest() == '3696915b8e0b111223667a7d4bb8099d1bc89158994f8d9a8c7058d2e93f9e05'
projected = json.loads(subprocess.check_output([
    'node', '--input-type=module', '-e',
    "import {readFileSync} from 'node:fs'; import {projectGeometryToLocalUtm} from './research/lib/cdse-pilot.mjs'; console.log(JSON.stringify(JSON.parse(readFileSync(process.argv[1])).features.map(f=>({id:f.properties.id,...projectGeometryToLocalUtm(f.geometry)}))));",
    str(source),
], cwd=root))
assert box(0, 0, 15, 15).buffer(-10).is_empty
results = []
for item in projected:
    original = shape(item['geometry'])
    assert original.is_valid and not original.is_empty
    buffered = original.buffer(-10)
    eligible = not buffered.is_empty and buffered.is_valid and buffered.geom_type == 'Polygon'
    if eligible:
        assert original.covers(buffered) and 0 < buffered.area < original.area
    geometry = mapping(buffered) if eligible else None
    encoded = json.dumps(geometry, sort_keys=True, separators=(',', ':')).encode()
    results.append(dict(
        candidate_id=item['id'], epsg=item['epsg'], inward_buffer_m=10,
        status='eligible' if eligible else 'excluded-empty-or-invalid-buffer',
        original_area_m2=original.area, buffered_area_m2=buffered.area,
        area_loss_percent=100 * (1 - buffered.area / original.area),
        original_metric_geometry=item['geometry'], buffered_metric_geometry=geometry,
        buffered_geometry_sha256=hashlib.sha256(encoded).hexdigest(),
    ))
output = dict(
    prepared='2026-09-15', data_state='geometry-analysis-no-satellite-observations',
    source_sha256=hashlib.sha256(raw).hexdigest(),
    geometry_encoding='Projected coordinates in metres; each item declares EPSG. Not RFC 7946 GeoJSON.',
    limitations=['Buffer removes analysis-block edges, not verified rice boundaries.', 'Area is not a valid-pixel count or proof of crop purity.'],
    candidates=results,
)
destination = source.with_name('open-sea-buffer-comparison.json')
destination.write_text(json.dumps(output, indent=2) + '\n')
print(json.dumps([{k: r[k] for k in ('candidate_id', 'epsg', 'status', 'original_area_m2', 'buffered_area_m2', 'area_loss_percent')} for r in results], indent=2))
