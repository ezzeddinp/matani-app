import hashlib
import json
from datetime import date, timedelta
from pathlib import Path
import subprocess
import sys

pilot = Path(sys.argv[1])
out = Path(sys.argv[2])
subprocess.run([sys.executable, str(Path(__file__).with_name('audit-phase2-pilot.py')), str(pilot)], check=True)
spec = json.loads((pilot / 'specification.json').read_text())
report = json.loads((pilot / 'report.json').read_text())
items = json.loads((pilot / 'catalogue-inventory.json').read_text())
assert report['catalogue_complete'] is True
assert len({item['id'] for item in items}) == len(items)
start, end = (date.fromisoformat(spec['period'][key]) for key in ('start', 'end_exclusive'))
days = [str(start + timedelta(days=i)) for i in range((end-start).days)]
assert len(days) == spec['period']['utc_days']
assert set(report['catalogue_days']) <= set(days)
records = []
for day in days:
    products = sorted(item['id'] for item in items if item['properties']['datetime'][:10] == day)
    state = 'pilot-validated' if day == report['pilot_day'] else 'pending' if products else 'no-acquisition'
    records.append(dict(day=day, catalogue_products=products, state=state))
pending = sum(record['state'] == 'pending' for record in records)
manifest = dict(
    state='preparation-only-not-a-frozen-analysis-dataset',
    candidate_id=spec['candidate_id'], period=spec['period'],
    inputs={name: hashlib.sha256((pilot/name).read_bytes()).hexdigest() for name in
            ('specification.json', 'report.json', 'catalogue-inventory.json')},
    accounting=dict(calendar_days=len(days), catalogue_days=len(report['catalogue_days']),
                    reused_pilot_days=1, pending_days=pending,
                    no_acquisition_days=sum(record['state'] == 'no-acquisition' for record in records)),
    proposed_requests=dict(process=pending*len(spec['request_templates']), catalogue=0,
                           authentication='Requires approved cap and allowance; refresh attempts count'),
    execution_authorized=False,
    recovery='Preserve every attempted request before sending. Reuse saved responses after hash and contract checks. An interrupted attempt without a response remains unresolved; do not automatically resend. Count attempts across restarts. Never overwrite pilot or raw artifacts.',
    days=records,
)
with out.open('x') as handle:
    handle.write(json.dumps(manifest, indent=2)+'\n')
print(json.dumps(manifest['accounting']))
