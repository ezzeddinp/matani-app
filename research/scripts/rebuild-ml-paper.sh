#!/bin/sh
# Rebuilds the ML paper from the reviewer's pipeline outputs (research/pipelines/, DEC-61).
#   sh research/scripts/rebuild-ml-paper.sh <ci-name>
# Adds block-bootstrap intervals to the reviewer's parquets in a NEW directory (asserting his point estimates),
# regenerates the figures and the numbers file, then builds the paper. The build lists every selected table row
# and quoted value (85 checks, not exhaustive) that changed; update ml-paper.md until it passes.
# To re-execute the reviewer's notebooks themselves, see OBS-89 (scratch copy with Data/data -> the v2 data).
set -eu
CI=research/private/ml-dataset/$1
PIPELINES=${PIPELINES:-research/pipelines}
HANDOFF=${HANDOFF:-research/private/ml-dataset/ml-dataset-v2}  # v2 = per-track radar history (OBS-79)

uv run --no-project --with polars --with pyarrow --with numpy python research/scripts/reviewer_ci.py \
  --pipelines "$PIPELINES" --out "$CI"
uv run --no-project --with numpy --with matplotlib --with polars --with pyarrow python research/scripts/make-ml-paper-figures.py \
  --handoff "$HANDOFF" --pipelines "$PIPELINES" --ci "$CI" --out docs/manuscripts
uv run --no-project --with python-docx python docs/manuscripts/build-ml-paper.py
