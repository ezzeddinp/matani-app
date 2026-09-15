import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class LegacyAuditTests(unittest.TestCase):
    def test_replay_deduplicates_and_retains_prototype_state(self):
        source = json.loads((ROOT / 'fixtures/m3-m1-report.json').read_text())
        source['data_state'] = 'prototype'
        source.pop('study_contract')
        field = source['fields'][0]
        field['field']['area_ha'] = 0.1
        field['observations'] = field['observations'][:2]
        field['observations'].append(field['observations'][0])
        private = ROOT / 'private'
        private.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=private) as temp:
            path = Path(temp)
            (path / 'input.json').write_text(json.dumps(source))
            command = [sys.executable, str(ROOT / 'scripts/audit-legacy-m1.py'),
                       '--input', str(path / 'input.json'), '--output-dir', str(path / 'result')]
            result = subprocess.run(command, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            report = json.loads((path / 'result/audit.json').read_text())
            self.assertFalse(report['cadence_claim_allowed'])
            self.assertEqual(report['fields'][0]['interval_count'], 2)
            self.assertEqual(report['fields'][0]['duplicates_removed'], 1)
            self.assertEqual(report['fields'][0]['longest_nonzero_gap_days'], 7)
            self.assertNotEqual(subprocess.run(command, capture_output=True).returncode, 0)
