import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { budget, limits, summarizeBands, auditResponse, windowFor } from './run-phase3.mjs';

const grid = { width: 3, height: 3, masks: { original: Array(9).fill(true), buffered: [true, true, true, false, false, false, false, false, false] } };
const bands = [Array(9).fill(0.5), Array(9).fill(1), Array(9).fill(1)];
assert.equal(summarizeBands(bands, grid, 9).original.passes, true);
assert.equal(summarizeBands(bands, grid, 9).buffered.passes, false);
assert.equal(summarizeBands(bands, grid, 3).buffered.passes, true);
const rejected = [Array(9).fill(0), Array(9).fill(0), Array(9).fill(1)];
assert.deepEqual(summarizeBands(rejected, grid, 9).original, { source_pixels: 9, valid_pixels: 0, mean: null, passes: false });
for (const mutate of [b => { b[0][0] = NaN; }, b => { b[1][0] = 0.6; }, b => { b[2][0] = 0; }, b => { b[0].pop(); }]) {
  const changed = structuredClone(bands); mutate(changed); assert.throws(() => summarizeBands(changed, grid, 9));
}
assert.equal(windowFor('2021-12-31').to, '2022-01-01T00:00:00.000Z');
assert.throws(() => windowFor('2021-02-30'));
assert.equal(budget([{ kind: 'process' }]).unresolved_usage, true);
assert.equal(budget([{ kind: 'process', metadata: { processing_units: '0.02' } }]).reported_processing_units, 0.02);
assert.throws(() => budget(Array(limits.process + 1).fill({ kind: 'process' })));
assert.throws(() => budget(Array(limits.authentication + 1).fill({ kind: 'authentication' })));
const root = new URL('../private/replacement-study/phase2-20260915-pilot-01/', import.meta.url);
const json = name => JSON.parse(readFileSync(new URL(name, root)));
const spec = json('specification.json'), items = json('catalogue-inventory.json'), report = json('report.json');
for (const index of ['ndvi', 'ndmi']) {
  const raw = readFileSync(new URL(`${index}-response.bin`, root)), meta = json(`${index}-response-metadata.json`);
  const audited = await auditResponse(raw, meta, spec, index, report.pilot_day, items);
  assert.deepEqual(audited.geometries, report.geometry_results[index]);
  assert.deepEqual(audited.source, report.source);
  await assert.rejects(auditResponse(raw, { ...meta, sha256: 'invalid' }, spec, index, report.pilot_day, items));
  await assert.rejects(auditResponse(raw, meta, { ...spec, epsg: 4326 }, index, report.pilot_day, items));
  await assert.rejects(auditResponse(raw, meta, spec, index, '2021-01-02', items));
  await assert.rejects(auditResponse(raw, meta, spec, index, report.pilot_day, []));
}
console.log(JSON.stringify({ checks: 'passed', network: false, coverage: '9/3 floors, zero-valid nulls, invalid pixels/masks, dates, attempt caps, interrupted usage, saved pilot source/grid/hash validation' }));
