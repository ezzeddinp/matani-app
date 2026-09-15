import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildProcessRequest, extractSourceIdentity, MEASUREMENT_VERSIONS } from '../../backend/measurement/cdse-process-adapter.js';

const hash = value => createHash('sha256').update(value).digest('hex');
export function checkPairedSources(responses, from, to) {
  const expected = ['original:ndvi', 'original:ndmi', 'buffered:ndvi', 'buffered:ndmi'];
  const start = Date.parse(from), end = Date.parse(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) throw new Error('invalid-window');
  if (!Array.isArray(responses) || responses.length !== 4 || new Set(responses.map(r => r.key)).size !== 4) throw new Error('incomplete-pair');
  const identities = expected.map(key => {
    const response = responses.find(r => r.key === key);
    if (!response) throw new Error('missing-response-key');
    const identity = extractSourceIdentity(response.userdata);
    if (!identity.serviceVersion || identity.sceneIds.length !== 1 || identity.productIds.length !== 1 || identity.dataPaths.length !== 1 || identity.tiles.length !== 1) throw new Error('missing-or-multiple-sources');
    const acquired = Date.parse(identity.tiles[0].date);
    if (!Number.isFinite(acquired) || acquired < start || acquired >= end) throw new Error('source-outside-window');
    return { serviceVersion: identity.serviceVersion, sceneIds: identity.sceneIds, productIds: identity.productIds, dataPaths: identity.dataPaths, acquired };
  });
  if (!identities.every(i => JSON.stringify(i) === JSON.stringify(identities[0]))) throw new Error('source-mismatch');
  return identities[0];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL('../private/replacement-study/', import.meta.url);
  const candidatesRaw = readFileSync(new URL('open-sea-candidates.geojson', root));
  const buffersRaw = readFileSync(new URL('open-sea-buffer-comparison.json', root));
  const candidates = JSON.parse(candidatesRaw), buffers = JSON.parse(buffersRaw);
  assert.equal(hash(candidatesRaw), buffers.source_sha256);
  const candidate = candidates.features[0], pair = buffers.candidates[0];
  assert.equal(candidate.properties.id, pair.candidate_id);
  assert.equal(pair.status, 'eligible');
  const from = '2021-01-01T00:00:00.000Z', to = '2021-01-02T00:00:00.000Z';
  const requests = ['original', 'buffered'].flatMap(variant => ['ndvi', 'ndmi'].map(indexName => {
    const body = buildProcessRequest({ geometry: candidate.geometry, from, to, indexName });
    assert.ok(body.input.bounds.properties.crs.endsWith(`/${pair.epsg}`));
    body.input.bounds.geometry = pair[`${variant}_metric_geometry`];
    assert.ok(body.input.bounds.geometry.coordinates.length > 0);
    assert.equal(body.output.resx, indexName === 'ndvi' ? 10 : 20);
    return { key: `${variant}:${indexName}`, body, sha256: hash(JSON.stringify(body)) };
  }));
  const userdata = { serviceVersion: 'fixture', orbits: [{ tiles: [{ date: '2021-01-01T03:00:00Z', shId: 'fixture-scene', dataPath: '/fixture.SAFE/' }] }] };
  const responses = requests.map(r => ({ key: r.key, userdata: structuredClone(userdata) }));
  assert.equal(checkPairedSources(responses, from, to).productIds[0], 'fixture.SAFE');
  assert.deepEqual(checkPairedSources(responses.toReversed(), from, to), checkPairedSources(responses, from, to));
  assert.throws(() => checkPairedSources(responses.slice(1), from, to));
  for (const mutate of [
    r => { r[0].userdata.orbits[0].tiles[0].shId = 'other'; },
    r => { r[0].userdata.orbits[0].tiles.push({ ...r[0].userdata.orbits[0].tiles[0] }); },
    r => { r[0].userdata.orbits[0].tiles[0].date = to; },
    r => { r[0].userdata.serviceVersion = null; },
  ]) {
    const changed = structuredClone(responses); mutate(changed);
    assert.throws(() => checkPairedSources(changed, from, to));
  }
  const artifact = {
    prepared: '2026-09-15', state: 'offline-request-template-no-observations',
    candidate_id: candidate.properties.id, candidates_sha256: hash(candidatesRaw), buffers_sha256: hash(buffersRaw),
    versions: MEASUREMENT_VERSIONS, adapter_sha256: hash(readFileSync(new URL('../../backend/measurement/cdse-process-adapter.js', import.meta.url))),
    window: { from, to_exclusive: to, role: 'Template only; not a catalogue-confirmed acquisition day' },
    proposed_budget: { process_attempts: 4, retries: 0, concurrency: 1, stop_on_failure: true, enforced: false, catalogue_and_authentication: 'Separate budget not yet frozen' },
    limitations: ['Single-source identity required across all four responses; unsupported multi-source days remain unresolved, not absent.', 'Grid origin/alignment must be verified from returned TIFF metadata before attributing differences solely to buffering.', 'Metadata identity is not independent proof of per-pixel provenance or rice purity.', 'No credentials, provider requests, observations or production changes.'],
    requests,
  };
  writeFileSync(new URL('paired-process-template.json', root), JSON.stringify(artifact, null, 2) + '\n');
  console.log(JSON.stringify({ check: 'passed', requests: 4, fixture_source_checks: 'passed', network_called: false }));
}
