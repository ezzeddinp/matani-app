import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "check_run_binding.py"
spec = importlib.util.spec_from_file_location("check_run_binding", SCRIPT)
binding = importlib.util.module_from_spec(spec)
spec.loader.exec_module(binding)

sha = lambda text: hashlib.sha256(text.encode()).hexdigest()


class RunBindingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.handoff, self.run = self.tmp / "ml-dataset-v2", self.tmp / "run"
        self.handoff.mkdir(), self.run.mkdir()
        self.data = {name: f"v2 {name}" for name in binding.DATA}
        (self.handoff / "MANIFEST.json").write_text(json.dumps({"sha256": {n: sha(t) for n, t in self.data.items()}}))
        self.pred = self.run / "predictions.csv"
        self.pred.write_text("row_id,y_pred\n0,0.5\n")

    def env(self, data=None, pred_text=None):
        data = data or self.data
        lines = [f"sha256 {n} {sha(t)}" for n, t in data.items()]
        if pred_text is not None:
            lines.append(f"sha256 predictions.csv {sha(pred_text)}")
        (self.run / "env.txt").write_text("python 3.13\n" + "\n".join(lines) + "\n")

    def test_matching_run_passes(self):
        self.env(pred_text=self.pred.read_text())
        self.assertIn("match ml-dataset-v2", binding.check(self.pred, self.handoff))

    def test_other_dataset_version_is_rejected(self):
        self.env(data={**self.data, "data/ml_table.csv": "v1 ml_table"}, pred_text=self.pred.read_text())
        with self.assertRaisesRegex(ValueError, "another dataset version"):
            binding.check(self.pred, self.handoff)

    def test_substituted_predictions_are_rejected(self):
        self.env(pred_text=self.pred.read_text())
        self.pred.write_text("row_id,y_pred\n0,0.9\n")  # v1 predictions dropped beside v2 metadata
        with self.assertRaisesRegex(ValueError, "does not match the hash"):
            binding.check(self.pred, self.handoff)

    def test_run_without_prediction_hash_is_rejected(self):
        self.env()
        with self.assertRaisesRegex(ValueError, "no hash for predictions.csv"):
            binding.check(self.pred, self.handoff)


if __name__ == "__main__":
    unittest.main()
