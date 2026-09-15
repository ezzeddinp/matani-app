import json
from itertools import product


def compare(records):
    unique = {}
    for identity, ndvi_pass, ndmi_pass in records:
        if not isinstance(identity, str) or not identity:
            raise ValueError('Missing interval identity')
        if any(value is not None and type(value) is not bool for value in (ndvi_pass, ndmi_pass)):
            raise ValueError('Expected Boolean decisions or None for unevaluable')
        decisions = (ndvi_pass, ndmi_pass)
        if identity in unique and unique[identity] != decisions:
            raise ValueError('Conflicting duplicate decisions')
        unique[identity] = decisions
    counts = dict(both=0, ndvi_only=0, ndmi_only=0, neither=0, unevaluable=0)
    for a, b in unique.values():
        state = 'unevaluable' if a is None or b is None else 'both' if a and b else 'ndvi_only' if a else 'ndmi_only' if b else 'neither'
        counts[state] += 1
    return dict(
        data_state='synthetic-policy-check',
        distinct_intervals=len(unique),
        evaluable_intervals=len(unique) - counts['unevaluable'],
        states=counts,
        joint_delivered_values=2 * counts['both'],
        separate_delivered_values=2 * counts['both'] + counts['ndvi_only'] + counts['ndmi_only'],
    )


if __name__ == '__main__':
    states = list(product((False, True), repeat=2))
    for sequence in product(states, repeat=3):
        records = [(str(i), *state) for i, state in enumerate(sequence)]
        result = compare(records)
        assert result == compare(list(reversed(records)) + records)
        assert result['joint_delivered_values'] == 2 * sum(a and b for a, b in sequence)
        assert result['separate_delivered_values'] == sum(a + b for a, b in sequence)
        assert result['separate_delivered_values'] - result['joint_delivered_values'] == sum(a != b for a, b in sequence)
    assert compare([])['evaluable_intervals'] == 0
    assert compare([('one', True, False)])['separate_delivered_values'] == 1
    assert compare([('unknown', True, None)])['evaluable_intervals'] == 0
    for invalid in [[('x', True, False), ('x', False, True)], [('', True, True)], [('x', 1, False)]]:
        try:
            compare(invalid)
        except ValueError:
            pass
        else:
            raise AssertionError('Invalid input accepted')
    print(json.dumps(dict(check='passed', exhaustive_three_interval_sequences=64, limitation='Boolean decisions are synthetic; no raw-data quality, provenance, request accounting or application delivery is validated.'), indent=2))
