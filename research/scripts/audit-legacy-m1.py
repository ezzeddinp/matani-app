import argparse
import hashlib
import json
import statistics
from datetime import datetime
from pathlib import Path

parser = argparse.ArgumentParser(description='Offline audit of the earlier two-field M1 prototype; no quality/cadence claims')
parser.add_argument('--input', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args()
raw = args.input.read_bytes()
data = json.loads(raw)
if data.get('data_state') != 'prototype' or data.get('study_contract') is not None:
    raise ValueError('Expected the legacy prototype report without an approved study contract')
if data.get('execution', {}).get('complete') is not True:
    raise ValueError('Incomplete source execution')
output = args.output_dir.resolve()
private = (Path(__file__).resolve().parents[1] / 'private').resolve()
if not output.is_relative_to(private):
    raise ValueError('Write recovered provider artifacts under research/private/')
fields = []
for field in data['fields']:
    unique = {}
    for row in field['observations']:
        key = (row['acquisition_interval']['from'], row['acquisition_interval']['to'])
        if key in unique and unique[key] != row:
            raise ValueError('Conflicting duplicate interval')
        for index in ('ndvi', 'ndmi'):
            count = row[index + '_stats']['valid_pixel_count']
            if type(count) is not int or count < 0:
                raise ValueError('Invalid pixel count')
        unique[key] = row
    rows = sorted(unique.values(), key=lambda row: row['acquisition_interval']['from'])
    dates = [datetime.fromisoformat(row['acquisition_interval']['from'].replace('Z', '+00:00'))
             for row in rows if all(row[index + '_stats']['valid_pixel_count'] > 0 for index in ('ndvi','ndmi'))]
    gaps = [(right-left).total_seconds()/86400 for left,right in zip(dates, dates[1:])]
    fields.append({'field_reference_hash': field['field']['field_reference_hash'],
                   'area_ha': field['field']['area_ha'], 'interval_count': len(rows),
                   'duplicates_removed': len(field['observations'])-len(rows),
                   'both_indices_nonzero': len(dates),
                   'median_nonzero_gap_days': statistics.median(gaps) if gaps else None,
                   'longest_nonzero_gap_days': max(gaps) if gaps else None,
                   'observations': rows})
report = {'data_state':'prototype', 'source_pipeline':'legacy-M1-Statistical-API',
          'network_called':False, 'quality_adjudication':'not-evaluated', 'cadence_claim_allowed':False,
          'season_analysis':'unavailable-no-verified-season-labels',
          'source_sha256':hashlib.sha256(raw).hexdigest(), 'window':data['window'],
          'source_versions':data['versions'], 'fields':fields}
output.mkdir(parents=True, exist_ok=False)
(output/'source.json').write_bytes(raw)
(output/'audit.json').write_text(json.dumps(report,indent=2,allow_nan=False)+'\n')
(output/'manifest.json').write_text(json.dumps({
    'data_state':'prototype', 'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(output.iterdir())},
    'analysis_source_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
},indent=2)+'\n')
print(json.dumps([{k:v for k,v in field.items() if k != 'observations'} for field in fields],indent=2))
