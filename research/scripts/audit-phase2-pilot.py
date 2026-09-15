import hashlib
import json
from pathlib import Path
import sys

root = Path(sys.argv[1])
r = json.loads((root/'report.json').read_text())
assert r['status'] == 'pilot-validated'
assert hashlib.sha256((root/'specification.json').read_bytes()).hexdigest() == r['frozen_sha256']
assert all(r['used'][kind] <= cap for kind, cap in r['limits'].items())
for response in r['responses']:
    raw = (root/f"{response['name']}-response.bin").read_bytes()
    assert hashlib.sha256(raw).hexdigest() == response['sha256']
    assert response['status'] == 200
items = json.loads((root/'catalogue-inventory.json').read_text())
days = sorted({item['properties']['datetime'][:10] for item in items})
assert len(items) == r['catalogue_items'] and days == r['catalogue_days']
assert days[0] == r['pilot_day']
products = {item['id'].removesuffix('.SAFE') for item in items if item['properties']['datetime'][:10] == r['pilot_day']}
assert all(product.removesuffix('.SAFE') in products for product in r['source']['productIds'])
for variants in r['geometry_results'].values():
    for result in variants.values():
        assert 0 <= result['valid_pixels'] <= result['source_pixels']
        assert (result['mean'] is None) == (result['valid_pixels'] == 0)
print(json.dumps(dict(check='passed', response_hashes=len(r['responses']), catalogue_days=len(days), source_present_in_pilot_catalogue=True)))
