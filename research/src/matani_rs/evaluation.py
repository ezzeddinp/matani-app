from __future__ import annotations

import hashlib
import json
import statistics
from collections import Counter
from datetime import datetime, timezone


def canonical_json(value):
    return json.dumps(value, sort_keys=True, indent=2, allow_nan=False) + "\n"


def instant(value):
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Timezone is required")
    return parsed.astimezone(timezone.utc)


def month_windows(start, end):
    if start >= end or start.day != 1 or end.day != 1:
        raise ValueError("Expected an increasing whole-calendar-month window")
    if any((value.hour, value.minute, value.second, value.microsecond) != (0, 0, 0, 0)
           for value in (start, end)):
        raise ValueError("Calendar boundaries must be UTC midnight")
    cursor = start
    while cursor < end:
        following = cursor.replace(year=cursor.year + (cursor.month == 12),
                                   month=cursor.month % 12 + 1)
        yield cursor.strftime("%Y-%m"), cursor, following
        cursor = following


def adapt_m1(source):
    state = source.get("data_state")
    if state not in {"fixture", "prototype"}:
        raise ValueError("Only labeled M1 fixture/prototype reports are supported; M2 is separate")
    if source.get("execution", {}).get("complete") is not True:
        raise ValueError("Incomplete M1 execution cannot establish an availability denominator")
    if not source.get("study_identity") or not source.get("versions"):
        raise ValueError("Study identity and processing versions are required")
    policy = source["study_contract"]["quality_policy"]
    if (policy.get("status"), policy.get("ndvi_min_valid_pixels"),
        policy.get("ndmi_min_valid_pixels")) != ("advisor-approved-provisional", 9, 3):
        raise ValueError("This evaluation requires the existing provisional 9/3 policy")
    start, end = instant(source["window"]["from"]), instant(source["window"]["to"])
    months = list(month_windows(start, end))
    seasons = {}
    for group in source["site_season_metrics"]:
        season = group["season"]
        if season not in {"wet", "dry"}:
            raise ValueError("Only documented wet/dry labels are accepted")
        for month in group["acquisitions_by_month"]:
            key = (group["site_id"], month)
            if key in seasons and seasons[key] != season:
                raise ValueError("Conflicting season labels")
            seasons[key] = season
    fields, seen_fields, duplicate_count = [], set(), 0
    for group in source["fields"]:
        metadata = group["field"]
        field_id, site_id = metadata["field_reference_hash"], metadata["site_id"]
        if not field_id or field_id in seen_fields or metadata.get("category") != "padi":
            raise ValueError("Expected distinct padi field identities")
        seen_fields.add(field_id)
        labels = {month: seasons[(site_id, month)] for month, _, _ in months}
        rows = {}
        for observation in group["observations"]:
            interval = observation["acquisition_interval"]
            acquired, stop = instant(interval["from"]), instant(interval["to"])
            if not start <= acquired < stop <= end:
                raise ValueError("Acquisition interval is outside the study window")
            month = acquired.strftime("%Y-%m")
            if observation["season"] != labels[month]:
                raise ValueError("Observation season conflicts with calendar")
            counts = {}
            for index in ("ndvi", "ndmi"):
                count = (observation.get(index + "_stats") or {}).get("valid_pixel_count")
                if count is not None and (type(count) is not int or count < 0):
                    raise ValueError("Pixel counts must be nonnegative integers or null")
                counts[index] = count
            status = observation["quality_decision"]
            if status not in {"passed", "rejected", "unavailable"}:
                raise ValueError("Invalid stored quality decision")
            reasons = observation.get("quality_rejection_reasons", [])
            if not isinstance(reasons, list) or any(not isinstance(reason, str) for reason in reasons):
                raise ValueError("Rejection reasons must be a string list")
            floor_pass = all(counts[index] is not None and counts[index] >= floor
                             for index, floor in (("ndvi", 9), ("ndmi", 3)))
            if status == "passed" and (not floor_pass or reasons):
                raise ValueError("Stored pass conflicts with counts or rejection reasons")
            row = {"from": acquired.isoformat(), "to": stop.isoformat(),
                   "season": labels[month], "counts": counts, "stored_status": status,
                   "rejection_reasons": reasons, "original": observation}
            key = (row["from"], row["to"])
            if key in rows:
                if rows[key] != row:
                    raise ValueError("Conflicting duplicate acquisition interval")
                duplicate_count += 1
            rows[key] = row
        ordered = sorted(rows.values(), key=lambda row: row["from"])
        if any(instant(left["to"]) > instant(right["from"])
               for left, right in zip(ordered, ordered[1:])):
            raise ValueError("Overlapping intervals require source adjudication")
        fields.append({"field_reference_hash": field_id, "site_id": site_id,
                       "season_labels": labels, "observations": ordered})
    if not fields:
        raise ValueError("No fields in source report")
    return {"schema_version": "m3-m1-snapshot-v1", "data_state": state,
            "source_pipeline": "m1-statistical-api", "study_identity": source["study_identity"],
            "versions": source["versions"], "window": source["window"],
            "duplicate_intervals_removed": duplicate_count,
            "fields": sorted(fields, key=lambda field: field["field_reference_hash"])}


def availability(rows, index):
    if index == "joint":
        return [row for row in rows if row["stored_status"] == "passed"]
    floor = {"ndvi": 9, "ndmi": 3}[index]
    return [row for row in rows if row["stored_status"] != "unavailable"
            and row["counts"][index] is not None and row["counts"][index] >= floor]


def gap_summary(rows, start, end):
    dates = sorted({instant(row["from"]) for row in rows})
    gaps = [(right - left).total_seconds() / 86400 for left, right in zip(dates, dates[1:])]
    return {"median_inter_observation_days": statistics.median(gaps) if gaps else None,
            "longest_inter_observation_days": max(gaps) if gaps else None,
            "leading_boundary_days": (dates[0] - start).total_seconds() / 86400 if dates else None,
            "trailing_boundary_days": (end - dates[-1]).total_seconds() / 86400 if dates else None,
            "no_observation_window_days": (end - start).total_seconds() / 86400 if not dates else None}


def analyse_snapshot(snapshot):
    start, end = instant(snapshot["window"]["from"]), instant(snapshot["window"]["to"])
    months = list(month_windows(start, end))
    results = []
    for field in snapshot["fields"]:
        rows = field["observations"]
        monthly = []
        blocks = []
        for month, begin, stop in months:
            season = field["season_labels"][month]
            selected = [row for row in rows if begin <= instant(row["from"]) < stop]
            monthly.append({"month": month, "season": season, "intervals": len(selected),
                            **{index: len(availability(selected, index)) for index in ("ndvi", "ndmi", "joint")}})
            if blocks and blocks[-1]["season"] == season:
                blocks[-1]["end"] = stop
            else:
                blocks.append({"season": season, "start": begin, "end": stop})
        seasonal = {}
        for season in ("wet", "dry"):
            selected = [row for row in rows if row["season"] == season]
            seasonal[season] = {"intervals": len(selected), **{
                index: {"count": len(availability(selected, index)),
                        "fraction": len(availability(selected, index)) / len(selected) if selected else None}
                for index in ("ndvi", "ndmi", "joint")}}
        block_metrics = []
        for block in blocks:
            selected = [row for row in rows if block["start"] <= instant(row["from"]) < block["end"]]
            block_metrics.append({"season": block["season"], "from": block["start"].isoformat(),
                                  "to": block["end"].isoformat(), **{
                                      index: gap_summary(availability(selected, index), block["start"], block["end"])
                                      for index in ("ndvi", "ndmi", "joint")}})
        results.append({"field_reference_hash": field["field_reference_hash"],
                        "intervals": len(rows), "stored_status_counts": dict(sorted(Counter(row["stored_status"] for row in rows).items())),
                        "rejection_reason_counts": dict(sorted(Counter(reason for row in rows for reason in row["rejection_reasons"]).items())),
                        "monthly": monthly, "seasonal": seasonal, "contiguous_season_blocks": block_metrics,
                        "whole_window_gaps": {index: gap_summary(availability(rows, index), start, end)
                                              for index in ("ndvi", "ndmi", "joint")},
                        "pixel_counts": [{"from": row["from"], **row["counts"]} for row in rows]})
    return {"schema_version": "m3-descriptive-report-v1", "data_state": snapshot["data_state"],
            "source_pipeline": snapshot["source_pipeline"], "cadence_claim_allowed": False,
            "snapshot_sha256": hashlib.sha256(canonical_json(snapshot).encode()).hexdigest(),
            "denominator": "unique returned acquisition intervals, not verified individual overpasses",
            "per_index_metric": "pixel-floor sufficiency; does not override stored quality",
            "uncertainty": "descriptive only; advisor-reviewed inferential method pending",
            "fields": results}
