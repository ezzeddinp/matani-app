import csv
import hashlib
import importlib.util
import json
from pathlib import Path
from statistics import mean, median
import subprocess
import sys

repo = Path(__file__).resolve().parents[2]
module = importlib.util.spec_from_file_location('daily', Path(__file__).with_name('check-daily-delivery.py'))
daily = importlib.util.module_from_spec(module)
module.loader.exec_module(daily)
freeze = repo / 'research/private/replacement-study/phase3-20260915-frozen-02'
subprocess.run(['node', 'research/scripts/retry-phase3.mjs', '--audit', str(freeze)], cwd=repo, check=True)
snapshot = json.loads((freeze/'snapshot.json').read_text())
assert snapshot['accounting']['unresolved_days'] == 0
out = Path(sys.argv[1])
out.mkdir()
rows, coverage, pixels, comparisons = [], [], [], []
results = {}
for geometry in ('original', 'buffered'):
    records = []
    for record in snapshot['records']:
        if record['state'] == 'no-acquisition':
            continue
        assert record['pair_compatible'] and record['state'] == 'paired-verified'
        indices = record['indices']
        assert indices['ndvi']['source'] == indices['ndmi']['source']
        identity = json.dumps(indices['ndvi']['source'], sort_keys=True)
        a, b = [indices[index]['geometries'][geometry]['passes'] for index in ('ndvi', 'ndmi')]
        records.append((identity, record['day'], a, b))
        for index in ('ndvi', 'ndmi'):
            value = indices[index]['geometries'][geometry]
            assert 0 <= value['valid_pixels'] <= value['source_pixels']
            assert value['passes'] == (value['valid_pixels'] >= (9 if index == 'ndvi' else 3))
            rows.append(dict(day=record['day'], geometry=geometry, index=index, **value))
    result = daily.daily_metrics(records, snapshot['period']['start'], snapshot['period']['end_exclusive'], [r['day'] for r in snapshot['records']])
    results[geometry] = result
    for policy, metrics in result['policies'].items():
        for metric, values in metrics.items():
            coverage.append(dict(geometry=geometry, policy=policy, metric=metric, **values))
    for metric in ('any', 'pair', 'ndvi', 'ndmi'):
        delta = result['policies']['separate'][metric]['lower_percent'] - result['policies']['joint'][metric]['lower_percent']
        comparisons.append(dict(geometry=geometry, metric=metric, separate_minus_joint_pp=delta))
    assert result['policies']['joint']['pair'] == result['policies']['separate']['pair']
    for index in ('ndvi', 'ndmi'):
        selected = [r for r in rows if r['geometry'] == geometry and r['index'] == index]
        for column in ('source_pixels', 'valid_pixels'):
            values = [r[column] for r in selected]
            pixels.append(dict(geometry=geometry, index=index, measure=column, acquisition_dates=len(values), minimum=min(values), median=median(values), mean=mean(values), maximum=max(values)))
for metric in ('any', 'pair', 'ndvi', 'ndmi'):
    comparisons.append(dict(geometry='buffered-minus-original-policy-difference', metric=metric, separate_minus_joint_pp=comparisons[4+('any','pair','ndvi','ndmi').index(metric)]['separate_minus_joint_pp']-comparisons[('any','pair','ndvi','ndmi').index(metric)]['separate_minus_joint_pp']))
for name, values in [('daily-pixels', rows), ('coverage-and-gaps', coverage), ('pixel-summary', pixels), ('policy-differences', comparisons)]:
    with (out/f'{name}.csv').open('w') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(values[0]))
        writer.writeheader()
        writer.writerows(values)
report = dict(snapshot_sha256=hashlib.sha256((freeze/'snapshot.json').read_bytes()).hexdigest(), accounting=snapshot['accounting'], results=results, pixel_summary=pixels, policy_differences=comparisons)
(out/'results.json').write_text(json.dumps(report, indent=2)+'\n')
(out/'manifest.json').write_text(json.dumps(dict(input_snapshot_sha256=report['snapshot_sha256'], code_sha256={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [Path(__file__),Path(__file__).with_name('check-daily-delivery.py')]}, outputs={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.iterdir())}),indent=2)+'\n')
print(json.dumps(results['original']['policies']['joint']['any']))
