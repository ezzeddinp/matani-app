import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from matani_rs.evaluation import adapt_m1, analyse_snapshot


class EvaluationTests(unittest.TestCase):
    def setUp(self):
        self.source = json.loads((ROOT / "fixtures/m3-m1-report.json").read_text())

    def test_distinct_index_counts_and_season_boundaries(self):
        report = analyse_snapshot(adapt_m1(self.source))
        self.assertEqual(report["data_state"], "fixture")
        self.assertFalse(report["cadence_claim_allowed"])
        field = report["fields"][0]
        self.assertEqual(field["seasonal"]["wet"]["ndvi"]["count"], 1)
        self.assertEqual(field["seasonal"]["wet"]["joint"]["count"], 0)
        self.assertEqual(field["monthly"][0]["ndmi"], 2)
        self.assertEqual(field["whole_window_gaps"]["joint"]["longest_inter_observation_days"], 90)
        self.assertEqual(len(field["contiguous_season_blocks"]), 3)
        self.assertTrue(all(block["joint"]["longest_inter_observation_days"] is None
                            for block in field["contiguous_season_blocks"]))
        self.assertEqual(field["contiguous_season_blocks"][1]["joint"]["no_observation_window_days"], 59)
        self.assertIsNone(field["pixel_counts"][3]["ndvi"])

    def test_duplicate_order_and_conflict(self):
        baseline = analyse_snapshot(adapt_m1(self.source))["fields"]
        rows = self.source["fields"][0]["observations"]
        rows.reverse()
        rows.append(copy.deepcopy(rows[0]))
        snapshot = adapt_m1(self.source)
        self.assertEqual(snapshot["duplicate_intervals_removed"], 1)
        self.assertEqual(analyse_snapshot(snapshot)["fields"], baseline)
        rows[-1]["ndvi_stats"]["mean"] = 0.123
        with self.assertRaisesRegex(ValueError, "Conflicting duplicate"):
            adapt_m1(self.source)

    def test_empty_season_and_one_observation(self):
        self.source["fields"][0]["observations"] = self.source["fields"][0]["observations"][:1]
        field = analyse_snapshot(adapt_m1(self.source))["fields"][0]
        self.assertIsNone(field["seasonal"]["wet"]["joint"]["fraction"])
        self.assertIsNone(field["whole_window_gaps"]["joint"]["median_inter_observation_days"])
        self.assertEqual(field["whole_window_gaps"]["joint"]["leading_boundary_days"], 4)

    def test_rejects_untrusted_or_incompatible_inputs(self):
        for mutation in (
            lambda src: src.update(data_state="measured"),
            lambda src: src["execution"].update(complete=False),
            lambda src: src["fields"][0]["observations"][0]["ndvi_stats"].update(valid_pixel_count=8),
            lambda src: src["fields"][0]["observations"][0]["ndvi_stats"].update(valid_pixel_count=True),
            lambda src: src["fields"][0]["observations"][0].update(season="wet"),
        ):
            source = copy.deepcopy(self.source)
            mutation(source)
            with self.assertRaises(ValueError):
                adapt_m1(source)

    def test_cli_reproducible_and_non_overwriting(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            def run(destination):
                return subprocess.run([sys.executable, str(ROOT / "scripts/run_m3_evaluation.py"),
                                       "--input", str(ROOT / "fixtures/m3-m1-report.json"),
                                       "--output-dir", str(destination)], capture_output=True)
            self.assertEqual(run(root / "one").returncode, 0)
            self.assertEqual(run(root / "two").returncode, 0)
            self.assertEqual((root / "one/manifest.json").read_bytes(), (root / "two/manifest.json").read_bytes())
            self.assertNotEqual(run(root / "one").returncode, 0)


if __name__ == "__main__":
    unittest.main()
