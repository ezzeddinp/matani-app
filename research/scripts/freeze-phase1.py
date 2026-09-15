import hashlib
import json
import math
import subprocess
from pathlib import Path
from shapely.geometry import Point, shape

root = Path(__file__).resolve().parents[2]
private = root / 'research/private/replacement-study'
source = private / 'open-sea-candidates.geojson'
buffer_file = private / 'open-sea-buffer-comparison.json'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
data = json.loads(buffer_file.read_text())
assert data['source_sha256'] == sha(source)
pair = data['candidates'][0]
assert pair['candidate_id'] == 'open-sea-2021-tile-42-r5566-c5626'
original, buffered = (shape(pair[k]) for k in ('original_metric_geometry', 'buffered_metric_geometry'))
assert original.is_valid and buffered.is_valid and original.covers(buffered)
x0, y0, x1, y1 = original.bounds
bbox = [math.floor(x0/20)*20, math.floor(y0/20)*20, math.ceil(x1/20)*20, math.ceil(y1/20)*20]
grids = {}
for index, resolution in [('ndvi', 10), ('ndmi', 20)]:
    width, height = int((bbox[2]-bbox[0])/resolution), int((bbox[3]-bbox[1])/resolution)
    centres = [Point(bbox[0]+(col+.5)*resolution, bbox[3]-(row+.5)*resolution) for row in range(height) for col in range(width)]
    masks = {name: [polygon.covers(point) for point in centres] for name, polygon in [('original', original), ('buffered', buffered)]}
    assert all(not b or a for a, b in zip(masks['original'], masks['buffered']))
    assert any(masks['buffered'])
    grids[index] = dict(resolution_m=resolution, width=width, height=height, affine=[resolution, 0, bbox[0], 0, -resolution, bbox[3]], masks=masks, geometric_cell_counts={k: sum(v) for k,v in masks.items()})
requests = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', "import {readFileSync} from 'node:fs'; import {buildProcessRequest} from './backend/measurement/cdse-process-adapter.js'; const geometry=JSON.parse(readFileSync(process.argv[1])).features[0].geometry; console.log(JSON.stringify(['ndvi','ndmi'].map(indexName=>({indexName,body:buildProcessRequest({geometry,from:'2021-01-01T00:00:00.000Z',to:'2021-01-02T00:00:00.000Z',indexName})}))));", str(source)], cwd=root))
for request in requests:
    body = request['body']
    body['input']['bounds'] = dict(bbox=bbox, properties=dict(crs=f'http://www.opengis.net/def/crs/EPSG/0/{pair["epsg"]}'))
    grid = grids[request['indexName']]
    body['output'].pop('resx'); body['output'].pop('resy')
    body['output'].update(width=grid['width'], height=grid['height'])
    assert 'geometry' not in body['input']['bounds']
manifest = dict(
    version='phase1-v1', frozen_on='2026-09-15', status='pre-acquisition-specification-not-live-validation',
    candidate_id=pair['candidate_id'], study_unit='one mapped-rice analysis block, not a surveyed farm parcel',
    period=dict(start='2021-01-01', end_exclusive='2022-01-01', utc_days=365),
    selection='First saved candidate; alternatives not substituted based on satellite outcomes',
    source_sha256=sha(source), buffer_sha256=sha(buffer_file), epsg=pair['epsg'], bbox=bbox,
    grids=grids, buffer_m=10, inclusion='Pixel centre covered by polygon, including boundary; no all-touched or fractional weighting',
    quality=dict(ndvi_floor=9, ndmi_floor=3, excluded_scl=[0,1,3,8,9,10], water_scl_6='retained; no agronomic validation', required='Source-present and finite index with nonzero denominator; apply polygon mask before counts; valid count reaches per-index floor', status='provisional technical criteria, not validated accuracy'),
    source_rule='One complete matching source identity across NDVI/NDMI; geometry variants derived from those same rasters. Multiple source metadata remain unresolved.',
    day_rule='All catalogue days inventoried without cloud screening; incomplete catalogue or processing remains unresolved. No-acquisition day requires complete inventory.',
    reporting='Protocol section 19 metrics; no interpolation, positive-result requirement or inferential significance tests',
    request_templates=requests,
    template_day='January 1 is not a confirmed acquisition. Replace with first chronological inventoried day for pilot.',
    phase2_gate='Validate TIFF CRS, dimensions and affine within 1e-6 m before masks; save raw rasters/userdata, requests, headers and hashes. Implement complete inventory and capped execution; verify account allowance.',
    hashes={str(p.relative_to(root)): sha(p) for p in [Path(__file__), root/'backend/measurement/cdse-process-adapter.js', root/'backend/measurement/statistics.js']},
)
out = private / 'phase1-frozen-manifest.json'
out.write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps(dict(check='passed', candidate=pair['candidate_id'], geometric_cells={k:v['geometric_cell_counts'] for k,v in grids.items()}, request_templates=len(requests), note='Geometric counts only; no source or valid-pixel observations.'), indent=2))
