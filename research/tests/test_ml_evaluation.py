import importlib.util
import unittest
from pathlib import Path

import numpy as np

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "evaluate_ml.py"
spec = importlib.util.spec_from_file_location("evaluate_ml", SCRIPT)
evaluate_ml = importlib.util.module_from_spec(spec)
spec.loader.exec_module(evaluate_ml)

SERIES = [(100, 0.2), (110, 0.4), (120, 0.6), (150, 0.8)]


class MlEvaluationTests(unittest.TestCase):
    def test_natural_gap_hides_only_the_target_date(self):
        prev, nxt = evaluate_ml.bracket(SERIES, 110, 0)
        self.assertEqual((prev, nxt), ((100, 0.2), (120, 0.6)))
        self.assertAlmostEqual(evaluate_ml.interpolate(prev, nxt, 110), 0.4)

    def test_hidden_window_drops_neighbours_and_widens_the_gap(self):
        prev, nxt = evaluate_ml.bracket(SERIES, 110, 30)  # hides 95..125
        self.assertEqual((prev, nxt), (None, (150, 0.8)))
        self.assertIsNone(evaluate_ml.interpolate(prev, nxt, 110))
        prev, nxt = evaluate_ml.bracket(SERIES, 120, 20)  # hides 110..130, keeps 100 and 150
        self.assertEqual(nxt[0] - prev[0], 50)
        self.assertAlmostEqual(evaluate_ml.interpolate(prev, nxt, 120), 0.2 + 0.6 * 20 / 50)

    def test_window_edges_are_hidden(self):
        prev, nxt = evaluate_ml.bracket(SERIES, 110, 20)  # 100 and 120 sit exactly on the edges
        self.assertEqual((prev, nxt), (None, (150, 0.8)))

    def test_bins(self):
        self.assertEqual([evaluate_ml.bin_of(g) for g in (5, 10, 44, 45, 200)], [0, 10, 30, 45, 90])

    def test_bootstrap_interval_contains_the_mean_and_resamples_whole_blocks(self):
        tiles = {"a": "1", "b": "1", "c": "2", "d": "2"}
        boot = evaluate_ml.BlockBootstrap(tiles, resamples=500, seed=1)
        self.assertTrue((boot.weights.sum(axis=1) == 4).all())  # 2 draws per tile
        blocks = ["a", "a", "b", "c", "d", "d"]
        values = np.array([0.1, 0.1, 0.3, 0.2, 0.4, 0.4])
        low, high = boot.ci(blocks, values)
        self.assertLessEqual(low, values.mean())
        self.assertGreaterEqual(high, values.mean())
        self.assertEqual(boot.ci(["a", "b"], np.array([0.5, 0.5])), (0.5, 0.5))


if __name__ == "__main__":
    unittest.main()
