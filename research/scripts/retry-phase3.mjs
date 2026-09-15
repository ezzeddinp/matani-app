import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, openSync, fsyncSync, closeSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { auditResponse } from './run-phase3.mjs';
import { fetchCdseToken, CDSE_TOKEN_URL, CDSE_PROCESS_URL } from '../lib/cdse-pilot.mjs';

const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const { default: nodeFetch } = await import(require.resolve('node-fetch'));
const base = fileURLToPath(new URL('../private/replacement-study/', import.meta.url));
const original = join(base, 'phase3-20260915-collection-01');
const parent = join(base, 'phase3-20260915-frozen-01');
const root = join(base, 'phase3-20260915-retry-01');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = path => JSON.parse(readFileSync(path));
const days = ['2021-02-15', '2021-02-20'];
function save(path, value) {
  const fd = openSync(path, 'wx', 0o600);
  try { writeFileSync(fd, Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n'); fsyncSync(fd); } finally { closeSync(fd); }
}
function targets(snapshot) {
  return days.map(day => {
    const record = snapshot.records.find(record => record.day === day);
    assert.equal(record?.indices.ndvi.state, 'interrupted');
    assert.equal(record.indices.ndmi.state, 'verified');
    return record;
  });
}
function inputs() {
  execFileSync('python3', [fileURLToPath(new URL('./audit-phase3-freeze.py', import.meta.url)), parent], { stdio: 'pipe' });
  const snapshot = json(join(parent, 'snapshot.json'));
  targets(snapshot);
  return { snapshot, spec: json(join(original, 'specification.json')), items: json(join(original, 'catalogue-inventory.json')) };
}
function checkContract() {
  const contract = json(join(root, 'contract.json'));
  assert.equal(contract.parent_manifest_sha256, hash(readFileSync(join(parent, 'manifest.json'))));
  assert.equal(contract.parent_snapshot_sha256, hash(readFileSync(join(parent, 'snapshot.json'))));
  assert.equal(contract.script_sha256, hash(readFileSync(fileURLToPath(import.meta.url))));
  assert.equal(contract.script_sha256, hash(readFileSync(join(root, 'retry-phase3.mjs'))));
  assert.equal(contract.validator_sha256, hash(readFileSync(fileURLToPath(new URL('./run-phase3.mjs', import.meta.url)))));
  assert.deepEqual(contract.days, days);
  assert.deepEqual(contract.limits, { process: 2, authentication: 1 });
  return contract;
}
async function revised() {
  checkContract();
  const { snapshot, spec, items } = inputs();
  let pu = 0;
  for (const day of days) {
    const request = json(join(root, `${day}-request.json`));
    const prior = json(join(original, 'attempts', `${day}-ndvi`, 'request.json'));
    assert.deepEqual(request.body, prior.body);
    assert.equal(request.url, CDSE_PROCESS_URL);
    assert.equal(request.previous_request_sha256, hash(readFileSync(join(original, 'attempts', `${day}-ndvi`, 'request.json'))));
    const metadata = json(join(root, `${day}-metadata.json`));
    assert.ok(metadata.processing_units !== null && metadata.processing_units !== '' && Number.isFinite(Number(metadata.processing_units)) && Number(metadata.processing_units) >= 0);
    pu += Number(metadata.processing_units);
    const index = await auditResponse(readFileSync(join(root, `${day}-response.bin`)), metadata, spec, 'ndvi', day, items);
    const record = snapshot.records.find(record => record.day === day);
    record.indices.ndvi = { ...index, response_sha256: metadata.sha256, recovered_from_request_sha256: request.previous_request_sha256 };
    record.pair_compatible = JSON.stringify(index.source) === JSON.stringify(record.indices.ndmi.source);
    record.state = record.pair_compatible ? 'paired-verified' : 'unresolved';
  }
  snapshot.version = 'phase3-snapshot-v2';
  snapshot.parent_snapshot_sha256 = hash(readFileSync(join(parent, 'snapshot.json')));
  snapshot.retry_contract_sha256 = hash(readFileSync(join(root, 'contract.json')));
  snapshot.accounting.paired_verified_days = snapshot.records.filter(record => record.state === 'paired-verified').length;
  snapshot.accounting.unresolved_days = snapshot.records.filter(record => record.state === 'unresolved').length;
  snapshot.used.process += days.length;
  snapshot.used.authentication += 1;
  snapshot.used.reported_processing_units += pu;
  snapshot.retry_use = { process: 2, authentication: 1, reported_processing_units: pu, original_failed_attempt_charges: 'unknown' };
  return snapshot;
}
async function main() {
  const [mode, destination] = process.argv.slice(2);
  assert.ok(['--check', '--prepare', '--allow-live', '--freeze', '--audit'].includes(mode));
  if (mode === '--check') {
    const { snapshot } = inputs();
    assert.equal(targets(snapshot).length, 2);
    const changed = structuredClone(snapshot);
    changed.records.find(record => record.day === days[0]).indices.ndvi.state = 'verified';
    assert.throws(() => targets(changed));
    console.log(JSON.stringify({ checks: 'passed', retries_only_interrupted: true, live: false })); return;
  }
  if (mode === '--prepare') {
    inputs(); mkdirSync(root, { mode: 0o700 });
    const source = readFileSync(fileURLToPath(import.meta.url));
    save(join(root, 'retry-phase3.mjs'), source);
    save(join(root, 'contract.json'), { date: '2026-09-15', decision: 'DEC-52', days, limits: { process: 2, authentication: 1 },
      selection: 'Only the two interrupted NDVI requests; retain every returned quality outcome; identical request bodies; no NDMI repeats.',
      parent_manifest_sha256: hash(readFileSync(join(parent, 'manifest.json'))), parent_snapshot_sha256: hash(readFileSync(join(parent, 'snapshot.json'))), script_sha256: hash(source), validator_sha256: hash(readFileSync(fileURLToPath(new URL('./run-phase3.mjs', import.meta.url)))) });
    console.log(JSON.stringify({ prepared: true, process_cap: 2 })); return;
  }
  if (mode === '--allow-live') {
    checkContract(); inputs();
    assert.ok(process.env.SENTINEL_CLIENT_ID && process.env.SENTINEL_CLIENT_SECRET, 'credentials-missing');
    save(join(root, 'authentication-attempt.json'), { started: new Date().toISOString(), url: CDSE_TOKEN_URL });
    const token = await fetchCdseToken({ clientId: process.env.SENTINEL_CLIENT_ID, clientSecret: process.env.SENTINEL_CLIENT_SECRET, fetchImpl: (url, options) => nodeFetch(url, { ...options, redirect: 'error' }) });
    save(join(root, 'authentication-result.json'), { status: 'succeeded' });
    for (const day of days) {
      const priorPath = join(original, 'attempts', `${day}-ndvi`, 'request.json');
      const { body } = json(priorPath);
      save(join(root, `${day}-request.json`), { url: CDSE_PROCESS_URL, body, started: new Date().toISOString(), previous_request_sha256: hash(readFileSync(priorPath)) });
      const response = await nodeFetch(CDSE_PROCESS_URL, { method: 'POST', redirect: 'error', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'multipart/mixed' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
      const raw = Buffer.from(await response.arrayBuffer()); save(join(root, `${day}-response.bin`), raw);
      const metadata = { status: response.status, bytes: raw.length, sha256: hash(raw), content_type: response.headers.get('content-type'), processing_units: response.headers.get('x-processingunits-spent'), request_id: response.headers.get('x-request-id'), finished: new Date().toISOString() };
      save(join(root, `${day}-metadata.json`), metadata);
      assert.equal(response.status, 200);
      console.log(JSON.stringify({ day, status: response.status }));
    }
  }
  const snapshot = await revised();
  if (mode === '--freeze') {
    assert.ok(destination); const out = resolve(destination);
    assert.ok(!out.startsWith(root + '/')); mkdirSync(out, { mode: 0o700 });
    save(join(out, 'snapshot.json'), snapshot);
    save(join(out, 'manifest.json'), { version: 'phase3-retry-freeze-v1', parent_freeze_directory: parent, parent_manifest_sha256: hash(readFileSync(join(parent, 'manifest.json'))), retry_directory: root,
      snapshot_sha256: hash(readFileSync(join(out, 'snapshot.json'))), files: Object.fromEntries(readdirSync(root).sort().map(name => [name, hash(readFileSync(join(root, name)))])) });
  }
  if (mode === '--audit') {
    const manifest = json(join(destination, 'manifest.json'));
    assert.equal(manifest.parent_freeze_directory, parent); assert.equal(manifest.retry_directory, root);
    assert.equal(manifest.parent_manifest_sha256, hash(readFileSync(join(parent, 'manifest.json'))));
    assert.deepEqual(Object.keys(manifest.files).sort(), readdirSync(root).sort());
    for (const [name, sha] of Object.entries(manifest.files)) assert.equal(hash(readFileSync(join(root, name))), sha);
    assert.equal(manifest.snapshot_sha256, hash(readFileSync(join(destination, 'snapshot.json'))));
    assert.deepEqual(json(join(destination, 'snapshot.json')), snapshot);
  }
  console.log(JSON.stringify({ mode, accounting: snapshot.accounting, retry_use: snapshot.retry_use }));
}
main().catch(error => { console.error(JSON.stringify({ status: 'stopped', code: error.code ?? null, reason: String(error.message).split('\n')[0].slice(0, 180) })); process.exitCode = 1; });
