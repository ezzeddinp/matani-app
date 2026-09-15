import test from 'node:test';
import assert from 'node:assert/strict';
import { observationChartX } from '../utils/observation-chart.ts';

test('observation positions preserve elapsed days and centre a single date', () => {
  assert.equal(observationChartX('2021-01-02', '2021-01-01', '2021-01-11', 30, 260), 56);
  assert.equal(observationChartX('2021-01-11', '2021-01-01', '2021-01-11', 30, 260), 290);
  assert.equal(observationChartX('2021-01-01', '2021-01-01', '2021-01-01', 30, 260), 160);
  assert.throws(() => observationChartX('invalid', '2021-01-01', '2021-01-11', 30, 260));
});
