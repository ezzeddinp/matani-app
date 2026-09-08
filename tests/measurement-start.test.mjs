import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldStartMeasurement } from '../utils/measurement-start.ts';

test('empty fields and queued/failed jobs start automatically', () => {
  assert.equal(shouldStartMeasurement(0, null), true);
  for (const status of ['queued', 'failed']) {
    assert.equal(shouldStartMeasurement(0, { status }), true);
  }
});

test('stored results and completed no-data jobs do not spend provider quota again', () => {
  assert.equal(shouldStartMeasurement(1, null), false);
  assert.equal(shouldStartMeasurement(0, { status: 'succeeded' }), false);
});

test('active jobs are polled; only expired worker leases can be restarted', () => {
  const now = Date.parse('2026-09-08T12:00:00Z');
  assert.equal(shouldStartMeasurement(0, { status: 'processing', updated_at: '2026-09-08T11:59:00Z' }, now), false);
  assert.equal(shouldStartMeasurement(0, { status: 'processing', updated_at: '2026-09-08T11:49:00Z' }, now), true);
  assert.equal(shouldStartMeasurement(0, { status: 'processing' }, now), false);
});
