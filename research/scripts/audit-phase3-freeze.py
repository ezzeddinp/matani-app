import hashlib
import json
from datetime import date, timedelta
from pathlib import Path
import sys

freeze = Path(sys.argv[1])
manifest = json.loads((freeze / 'manifest.json').read_text())
root = Path(manifest['acquisition_directory'])
assert root.is_dir()
assert hashlib.sha256((freeze / 'snapshot.json').read_bytes()).hexdigest() == manifest['snapshot_sha256']
actual = {str(path.relative_to(root)) for path in root.rglob('*') if path.is_file()}
assert actual == set(manifest['files']), 'Acquisition file set changed'
for name, expected in manifest['files'].items():
    relative = Path(name)
    assert not relative.is_absolute() and '..' not in relative.parts
    path = root / relative
    assert not path.is_symlink()
    assert hashlib.sha256(path.read_bytes()).hexdigest() == expected, name
snapshot = json.loads((freeze / 'snapshot.json').read_text())
start = date.fromisoformat(snapshot['period']['start'])
end = date.fromisoformat(snapshot['period']['end_exclusive'])
assert [record['day'] for record in snapshot['records']] == [str(start + timedelta(days=i)) for i in range((end-start).days)]
a = snapshot['accounting']
assert a['calendar_days'] == a['paired_verified_days'] + a['unresolved_days'] + a['no_acquisition_days']
assert a['catalogue_days'] == a['paired_verified_days'] + a['unresolved_days']
assert a['unattempted_indices'] == 0
recovery = json.loads((root / 'recovery.json').read_text())
assert hashlib.sha256((root / 'recovery-01.json').read_bytes()).hexdigest() == recovery['previous_recovery_sha256']
assert hashlib.sha256((root / 'open-sea-buffer-comparison.json').read_bytes()).hexdigest() == json.loads((root / 'specification.json').read_text())['buffer_sha256']
print(json.dumps({'audit': 'passed', 'files_verified': len(actual), 'snapshot_sha256': manifest['snapshot_sha256'], 'accounting': a}))
