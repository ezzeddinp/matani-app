import json
from datetime import date, timedelta
from statistics import mean, median


def daily_metrics(records, start, end, completed_days):
    start, end = date.fromisoformat(start), date.fromisoformat(end)
    if start >= end:
        raise ValueError('Empty or reversed window')
    days = [start + timedelta(days=i) for i in range((end - start).days)]
    completed = {date.fromisoformat(day) for day in completed_days}
    if not completed.issubset(days):
        raise ValueError('Completion date outside window')
    unique = {}
    by_day = {day: [] for day in days}
    for identity, day, a, b in records:
        day = date.fromisoformat(day)
        if not isinstance(identity, str) or not identity or day not in by_day:
            raise ValueError('Invalid identity or date')
        if any(v is not None and type(v) is not bool for v in (a, b)):
            raise ValueError('Expected Boolean decisions or None')
        value = (day, a, b)
        if identity in unique and unique[identity] != value:
            raise ValueError('Conflicting source identity')
        unique[identity] = value
    for day, a, b in unique.values():
        if day in completed and (a is None or b is None):
            raise ValueError('Completed day contains unknown decisions')
        by_day[day].append((a, b))
    output = {}
    for policy in ('joint', 'separate'):
        output[policy] = {}
        for metric in ('any', 'pair', 'ndvi', 'ndmi'):
            known, possible = [], []
            for day, values in by_day.items():
                if policy == 'joint' or metric == 'pair':
                    passed = any(a is True and b is True for a, b in values)
                    could_pass = any(a is not False and b is not False for a, b in values)
                elif metric == 'any':
                    passed = any(a is True or b is True for a, b in values)
                    could_pass = any(a is not False or b is not False for a, b in values)
                else:
                    i = 0 if metric == 'ndvi' else 1
                    passed = any(v[i] is True for v in values)
                    could_pass = any(v[i] is not False for v in values)
                if passed:
                    known.append(day)
                if passed or could_pass or day not in completed:
                    possible.append(day)
            gaps = [(b - a).days for a, b in zip(known, known[1:])]
            output[policy][metric] = dict(
                known_days=len(known), lower_percent=100 * len(known) / len(days),
                upper_percent=100 * len(possible) / len(days),
                mean_gap_days=mean(gaps) if gaps else None,
                median_gap_days=median(gaps) if gaps else None,
                longest_gap_days=max(gaps) if gaps else None,
                leading_absent_days=(known[0] - start).days if known else None,
                trailing_absent_days=(end - known[-1]).days - 1 if known else None,
                full_period_without_verified_observation_days=len(days) if not known else None,
                gaps_provisional=len(completed) != len(days),
            )
    return dict(calendar_days=len(days), fully_evaluated_days=len(completed), unresolved_days=len(days) - len(completed), policies=output)


if __name__ == '__main__':
    days = ['2021-01-01', '2021-01-02', '2021-01-03', '2021-01-04']
    records = [('a', days[0], True, False), ('b', days[0], False, True), ('c', days[2], True, True)]
    result = daily_metrics(records, days[0], '2021-01-05', days)
    assert result == daily_metrics(records[::-1] + records, days[0], '2021-01-05', days)
    p = result['policies']
    assert p['separate']['any']['lower_percent'] == 50
    assert p['joint']['any']['lower_percent'] == 25
    assert p['separate']['pair'] == p['joint']['pair']
    assert p['separate']['any']['mean_gap_days'] == 2
    assert p['joint']['any']['mean_gap_days'] is None
    assert p['separate']['any']['trailing_absent_days'] == 1
    empty = daily_metrics([], days[0], '2021-01-05', days)
    assert empty['policies']['joint']['any']['upper_percent'] == 0
    assert empty['policies']['joint']['any']['full_period_without_verified_observation_days'] == 4
    unresolved = daily_metrics([], days[0], '2021-01-05', [])
    assert unresolved['policies']['joint']['any']['upper_percent'] == 100
    partial = daily_metrics([('x', days[0], True, None)], days[0], '2021-01-02', [])
    assert partial['policies']['separate']['ndvi']['lower_percent'] == 100
    assert partial['policies']['joint']['pair']['lower_percent'] == 0
    for invalid in [records + [('a', days[0], False, False)], [('x', days[0], 1, False)], [('x', days[0], None, False)]]:
        try:
            daily_metrics(invalid, days[0], '2021-01-05', days)
        except ValueError:
            pass
        else:
            raise AssertionError('Invalid input accepted')
    print(json.dumps(dict(check='passed', data_state='synthetic-only', cases='Daily deduplication, incompatible same-day sources, gaps, empty/singleton/unknown days, partial decisions and invalid input', demonstration=result), indent=2))
