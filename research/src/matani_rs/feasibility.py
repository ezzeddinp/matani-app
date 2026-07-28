from __future__ import annotations

import csv
import hashlib
import json
import statistics
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

REQUIRED_COLUMNS = {
    "site_id",
    "region",
    "field_id",
    "crop",
    "acquisition_at",
    "season",
    "quality_status",
    "polygon_cloud_shadow_fraction",
    "valid_pixel_fraction",
    "ndvi_valid_pixel_count",
    "ndmi_valid_pixel_count",
    "provider_requests",
    "processing_units",
}


def _number(value: str, field: str) -> float:
    try:
        return float(value)
    except ValueError as error:
        raise ValueError(f"Invalid numeric {field}: {value}") from error


def load_observations(path: str | Path) -> list[dict[str, Any]]:
    with Path(path).open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        missing = REQUIRED_COLUMNS.difference(reader.fieldnames or [])
        if missing:
            raise ValueError(f"Missing columns: {', '.join(sorted(missing))}")
        rows = []
        for raw in reader:
            if raw["crop"].lower() != "padi":
                raise ValueError("M1 thesis feasibility input must be padi-only (DEC-15)")
            status = raw["quality_status"]
            if status not in {"passed", "rejected", "unavailable"}:
                raise ValueError(f"Invalid quality_status: {status}")
            rows.append(
                {
                    **raw,
                    "acquisition_at": datetime.fromisoformat(
                        raw["acquisition_at"].replace("Z", "+00:00")
                    ),
                    "polygon_cloud_shadow_fraction": _number(
                        raw["polygon_cloud_shadow_fraction"], "polygon_cloud_shadow_fraction"
                    ),
                    "valid_pixel_fraction": _number(
                        raw["valid_pixel_fraction"], "valid_pixel_fraction"
                    ),
                    "ndvi_valid_pixel_count": int(
                        _number(raw["ndvi_valid_pixel_count"], "ndvi_valid_pixel_count")
                    ),
                    "ndmi_valid_pixel_count": int(
                        _number(raw["ndmi_valid_pixel_count"], "ndmi_valid_pixel_count")
                    ),
                    "provider_requests": int(
                        _number(raw["provider_requests"], "provider_requests")
                    ),
                    "processing_units": _number(raw["processing_units"], "processing_units"),
                }
            )
    return rows


def _median(values: Iterable[float]) -> float | None:
    materialised = list(values)
    return statistics.median(materialised) if materialised else None


def analyse_observations(
    rows: list[dict[str, Any]], *, dataset_state: str, expected_months: int = 12
) -> dict[str, Any]:
    if dataset_state not in {"fixture", "measured"}:
        raise ValueError("dataset_state must be fixture or measured")
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[row["site_id"]].append(row)

    sites = []
    for site_id, site_rows in sorted(grouped.items()):
        ordered = sorted(site_rows, key=lambda row: row["acquisition_at"])
        passed = [row for row in ordered if row["quality_status"] == "passed"]
        gaps = [
            (right["acquisition_at"] - left["acquisition_at"]).days
            for left, right in zip(passed, passed[1:])
        ]
        monthly: dict[str, int] = defaultdict(int)
        seasonal: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "passed": 0})
        for row in ordered:
            month = row["acquisition_at"].strftime("%Y-%m")
            if row["quality_status"] == "passed":
                monthly[month] += 1
            seasonal[row["season"]]["total"] += 1
            seasonal[row["season"]]["passed"] += int(row["quality_status"] == "passed")

        sites.append(
            {
                "site_id": site_id,
                "region": ordered[0]["region"],
                "field_count": len({row["field_id"] for row in ordered}),
                "acquisition_count": len(ordered),
                "passing_count": len(passed),
                "usable_observations_by_month": dict(sorted(monthly.items())),
                "observed_month_count": len(
                    {row["acquisition_at"].strftime("%Y-%m") for row in ordered}
                ),
                "median_gap_days": _median(gaps),
                "longest_gap_days": max(gaps) if gaps else None,
                "seasonal_availability": {
                    season: {
                        **counts,
                        "passing_fraction": (
                            counts["passed"] / counts["total"] if counts["total"] else None
                        ),
                    }
                    for season, counts in sorted(seasonal.items())
                },
                "median_polygon_cloud_shadow_fraction": _median(
                    row["polygon_cloud_shadow_fraction"] for row in ordered
                ),
                "median_valid_pixel_fraction": _median(
                    row["valid_pixel_fraction"] for row in ordered
                ),
                "median_ndvi_valid_pixel_count": _median(
                    row["ndvi_valid_pixel_count"] for row in ordered
                ),
                "median_ndmi_valid_pixel_count": _median(
                    row["ndmi_valid_pixel_count"] for row in ordered
                ),
                "provider_requests": sum(row["provider_requests"] for row in ordered),
                "processing_units": sum(row["processing_units"] for row in ordered),
            }
        )

    full_coverage = bool(sites) and all(
        site["observed_month_count"] >= expected_months for site in sites
    )
    cadence_status = (
        "review_required_from_measured_metrics"
        if dataset_state == "measured" and full_coverage
        else "withheld"
    )
    return {
        "dataset_state": dataset_state,
        "claim_allowed": dataset_state == "measured" and full_coverage,
        "cadence_status": cadence_status,
        "cadence_determination": None,
        "expected_months": expected_months,
        "sites": sites,
        "limitations": (
            []
            if dataset_state == "measured" and full_coverage
            else ["Fixture or incomplete coverage cannot license a monitoring-cadence claim."]
        ),
    }


def canonical_geometry_hash(coordinates: list[list[float]]) -> str:
    if len(coordinates) < 3:
        raise ValueError("Polygon requires at least three vertices")
    ring = coordinates[:-1] if coordinates[0] == coordinates[-1] else list(coordinates)
    rounded = [[round(float(lon), 7), round(float(lat), 7)] for lon, lat in ring]
    if len(set(map(tuple, rounded))) < 3:
        raise ValueError("Polygon is degenerate")

    candidates = []
    for orientation in (rounded, list(reversed(rounded))):
        for index in range(len(orientation)):
            rotated = orientation[index:] + orientation[:index]
            candidates.append(rotated)
    canonical = min(candidates)
    canonical.append(canonical[0])
    payload = json.dumps(
        {"crs": "EPSG:4326", "ring": canonical},
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
