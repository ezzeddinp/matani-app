import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from matani_rs.feasibility import analyse_observations, canonical_geometry_hash, load_observations


class FeasibilityTests(unittest.TestCase):
    def setUp(self):
        self.rows = load_observations(ROOT / "fixtures" / "availability-observations.csv")

    def test_fixture_metrics_are_computed_but_cadence_claim_is_withheld(self):
        report = analyse_observations(self.rows, dataset_state="fixture")
        self.assertFalse(report["claim_allowed"])
        self.assertEqual(report["cadence_status"], "withheld")
        self.assertEqual(report["sites"][0]["observed_month_count"], 12)
        self.assertEqual(report["sites"][0]["provider_requests"], 12)

    def test_measured_full_window_requires_human_cadence_review(self):
        report = analyse_observations(self.rows, dataset_state="measured")
        self.assertTrue(report["claim_allowed"])
        self.assertEqual(report["cadence_status"], "review_required_from_measured_metrics")
        self.assertIsNone(report["cadence_determination"])

    def test_geometry_hash_is_rotation_and_orientation_invariant(self):
        a = [[106.0, -6.0], [106.1, -6.0], [106.1, -6.1], [106.0, -6.0]]
        b = [[106.1, -6.1], [106.1, -6.0], [106.0, -6.0], [106.1, -6.1]]
        self.assertEqual(canonical_geometry_hash(a), canonical_geometry_hash(b))


if __name__ == "__main__":
    unittest.main()
