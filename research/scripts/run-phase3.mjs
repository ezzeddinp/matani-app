import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync, openSync, closeSync, fsyncSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { fetchCdseToken, CDSE_TOKEN_URL, CDSE_PROCESS_URL } from '../lib/cdse-pilot.mjs';
import { extractProcessParts } from '../../backend/measurement/multipart.js';
import { checkPairedSources } from './prepare-paired-process.mjs';

const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const { fromArrayBuffer } = await import(require.resolve('geotiff'));
const { default: nodeFetch } = await import(require.resolve('node-fetch'));
const repository = fileURLToPath(new URL('../../', import.meta.url));
const privateRoot = join(repository, 'research/private/replacement-study');
const pilotRoot = join(privateRoot, 'phase2-20260915-pilot-01');
const codeFiles = ['research/scripts/run-phase3.mjs', 'research/scripts/freeze-phase1.py', 'research/scripts/prepare-paired-process.mjs', 'research/scripts/audit-phase2-pilot.py', 'research/lib/cdse-pilot.mjs', 'backend/measurement/cdse-process-adapter.js', 'backend/measurement/multipart.js', 'backend/measurement/statistics.js', 'backend/measurement/geometry.js', 'backend/sentinelAuth.js', 'package-lock.json', 'backend/package-lock.json'];
export const limits = Object.freeze({ process: 140, authentication: 10, processing_units_stop: 10 });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = path => JSON.parse(readFileSync(path));
function save(path, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value, null, 2) + '\n');
  const fd = openSync(path, 'wx', 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
}
export function windowFor(day) {
  const from = `${day}T00:00:00.000Z`;
  assert.equal(new Date(from).toISOString().slice(0, 10), day);
  return { from, to: new Date(Date.parse(from) + 86400000).toISOString() };
}
function bodyFor(spec, index, day) {
  const body = structuredClone(spec.request_templates.find(template => template.indexName === index).body);
  body.input.data[0].dataFilter.timeRange = windowFor(day);
  return body;
}
export function summarizeBands(bands, grid, floor) {
  assert.equal(grid.masks.original.length, grid.width * grid.height);
  assert.equal(grid.masks.buffered.length, grid.width * grid.height);
  for (const band of bands) assert.equal(band.length, grid.width * grid.height);
  for (let i = 0; i < grid.width * grid.height; i++) {
    assert.equal(typeof grid.masks.original[i], 'boolean');
    assert.equal(typeof grid.masks.buffered[i], 'boolean');
    assert.ok(!grid.masks.buffered[i] || grid.masks.original[i]);
    assert.ok([0, 1].includes(bands[1][i]) && [0, 1].includes(bands[2][i]), 'invalid-mask');
    if (bands[1][i]) assert.ok(bands[2][i] === 1 && Number.isFinite(bands[0][i]), 'invalid-valid-pixel');
  }
  return Object.fromEntries(['original', 'buffered'].map(variant => {
    let source = 0;
    const values = [];
    grid.masks[variant].forEach((inside, i) => {
      if (!inside) return;
      source += bands[2][i];
      if (bands[1][i]) values.push(bands[0][i]);
    });
    return [variant, { source_pixels: source, valid_pixels: values.length,
      mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
      passes: values.length >= floor }];
  }));
}
export async function auditResponse(raw, metadata, spec, index, day, items) {
  assert.equal(hash(raw), metadata.sha256, 'response-hash-mismatch');
  assert.equal(raw.length, metadata.bytes, 'response-size-mismatch');
  if (metadata.status !== 200) throw new Error(`http-${metadata.status}`);
  const { raster, userdata } = await extractProcessParts(new Response(raw, { headers: { 'content-type': metadata.content_type } }));
  const { from, to } = windowFor(day);
  const source = checkPairedSources(['original:ndvi', 'original:ndmi', 'buffered:ndvi', 'buffered:ndmi'].map(key => ({ key, userdata })), from, to);
  const products = new Set(items.filter(item => item.properties.datetime.slice(0, 10) === day).map(item => item.id.replace(/\.SAFE$/, '')));
  assert.ok(source.productIds.every(id => products.has(id.replace(/\.SAFE$/, ''))), 'source-not-in-catalogue');
  const image = await (await fromArrayBuffer(raster.buffer.slice(raster.byteOffset, raster.byteOffset + raster.byteLength))).getImage();
  const grid = spec.grids[index], origin = image.getOrigin(), resolution = image.getResolution();
  assert.equal(image.getGeoKeys().ProjectedCSTypeGeoKey, spec.epsg, 'crs-mismatch');
  assert.equal(image.getWidth(), grid.width, 'width-mismatch');
  assert.equal(image.getHeight(), grid.height, 'height-mismatch');
  assert.ok(!image.fileDirectory.ModelTransformation, 'unexpected-grid-transform');
  assert.ok(Math.abs(origin[0] - grid.affine[2]) <= 1e-6 && Math.abs(origin[1] - grid.affine[5]) <= 1e-6, 'origin-mismatch');
  assert.ok(Math.abs(resolution[0] - grid.resolution_m) <= 1e-6 && Math.abs(resolution[1] + grid.resolution_m) <= 1e-6, 'resolution-mismatch');
  const bands = await image.readRasters();
  assert.equal(bands.length, index === 'ndvi' ? 3 : 4, 'band-count-mismatch');
  return { state: 'verified', source, raster_sha256: hash(raster), userdata_sha256: hash(Buffer.from(JSON.stringify(userdata))),
    grid: { origin, resolution, width: grid.width, height: grid.height, epsg: spec.epsg },
    geometries: summarizeBands(bands, grid, spec.quality[`${index}_floor`]) };
}
function inventory(root) {
  const spec = json(join(root, 'specification.json'));
  const report = json(join(root, 'pilot/report.json'));
  const items = json(join(root, 'catalogue-inventory.json'));
  assert.equal(hash(readFileSync(join(root, 'specification.json'))), report.frozen_sha256);
  assert.equal(report.catalogue_complete, true);
  const reconstructed = new Map();
  let next;
  const cursors = new Set();
  const pages = report.responses.filter(response => response.name.startsWith('catalogue-'));
  const base = json(join(root, 'pilot/catalogue-1-request.json')).body;
  assert.equal(base.datetime, `${spec.period.start}T00:00:00Z/${spec.period.end_exclusive}T00:00:00Z`);
  assert.deepEqual(Object.keys(base).sort(), ['collections', 'datetime', 'intersects', 'limit']);
  assert.deepEqual(base.collections, ['sentinel-2-l2a']);
  const candidates = json(join(root, 'open-sea-candidates.geojson'));
  assert.equal(hash(readFileSync(join(root, 'open-sea-candidates.geojson'))), spec.source_sha256);
  assert.equal(candidates.features[0].properties.id, spec.candidate_id);
  assert.deepEqual(base.intersects, candidates.features[0].geometry);
  for (const [i, meta] of pages.entries()) {
    const raw = readFileSync(join(root, `pilot/${meta.name}-response.bin`));
    assert.equal(hash(raw), meta.sha256);
    assert.equal(meta.status, 200);
    const request = json(join(root, `pilot/${meta.name}-request.json`));
    assert.deepEqual(request.body, { ...base, ...(next === undefined ? {} : { next }) });
    const page = JSON.parse(raw);
    assert.ok(Array.isArray(page.features));
    for (const item of page.features) {
      assert.ok(item.id && Number.isFinite(Date.parse(item.properties?.datetime)));
      const day = new Date(item.properties.datetime).toISOString().slice(0, 10);
      if (day < spec.period.start || day >= spec.period.end_exclusive) continue;
      if (reconstructed.has(item.id)) assert.deepEqual(reconstructed.get(item.id), item, 'conflicting-product');
      reconstructed.set(item.id, item);
    }
    next = page.context?.next ?? undefined;
    assert.equal(next === undefined, i === pages.length - 1, 'incomplete-pagination');
    if (next !== undefined) { assert.ok(!cursors.has(String(next))); cursors.add(String(next)); }
    else assert.ok(!page.links?.some(link => link.rel === 'next'), 'unhandled-pagination');
  }
  assert.ok(pages.length > 0);
  const sorted = [...reconstructed.values()].sort((a, b) => a.properties.datetime.localeCompare(b.properties.datetime) || a.id.localeCompare(b.id));
  assert.deepEqual(sorted, items, 'inventory-does-not-match-raw-catalogue');
  const days = [...new Set(items.map(item => new Date(item.properties.datetime).toISOString().slice(0, 10)))];
  assert.deepEqual(days, report.catalogue_days);
  assert.equal(items.length, report.catalogue_items);
  assert.equal(days[0], report.pilot_day);
  return { spec, items, days, pilotDay: report.pilot_day };
}
function filesUnder(root, prefix = '') {
  return readdirSync(join(root, prefix), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    assert.ok(!entry.isSymbolicLink(), 'symlink-not-allowed');
    return entry.isDirectory() ? filesUnder(root, name) : [name];
  });
}
function initialize(root) {
  execFileSync('python3', [join(repository, 'research/scripts/audit-phase2-pilot.py'), pilotRoot], { stdio: 'pipe' });
  mkdirSync(root, { mode: 0o700 });
  mkdirSync(join(root, 'pilot')); mkdirSync(join(root, 'attempts')); mkdirSync(join(root, 'code'));
  for (const name of readdirSync(pilotRoot)) save(join(root, 'pilot', name), readFileSync(join(pilotRoot, name)));
  for (const name of ['specification.json', 'catalogue-inventory.json']) save(join(root, name), readFileSync(join(pilotRoot, name)));
  save(join(root, 'open-sea-candidates.geojson'), readFileSync(join(privateRoot, 'open-sea-candidates.geojson')));
  const codes = {};
  for (const name of codeFiles) {
    const bytes = readFileSync(join(repository, name)); codes[name] = hash(bytes);
    const target = join(root, 'code', name); mkdirSync(resolve(target, '..'), { recursive: true }); save(target, bytes);
  }
  const { days } = inventory(root);
  assert.equal((days.length - 1) * 2, limits.process);
  save(join(root, 'contract.json'), { version: 'phase3-v1', limits, concurrency: 1, retries: 0,
    quota_observation: { date: '2026-09-15', source: 'developer-supplied-dashboard-screenshot', remaining_processing_units: 28781, remaining_requests: 28666 },
    authorization: 'Developer requested Phase 3 and continued after supplying account quota; DEC-51',
    processing_units_rule: 'Stop before the next request at 10 reported units or missing usage; response-time reporting cannot enforce a hard provider-side PU cap.',
    code_sha256: codes,
    input_sha256: Object.fromEntries(filesUnder(root).filter(name => !name.startsWith('code/')).map(name => [name, hash(readFileSync(join(root, name)))])) });
}
function recoveryAt(root) {
  const path = join(root, 'recovery.json');
  return existsSync(path) ? json(path) : { acknowledged_interrupted: [], code_overrides: {} };
}
function checkContract(root) {
  const recovery = recoveryAt(root);
  const contract = json(join(root, 'contract.json'));
  assert.deepEqual(contract.limits, limits);
  for (const [name, sha] of Object.entries(json(join(root, 'specification.json')).hashes)) assert.equal(hash(readFileSync(join(repository, name))), sha, `changed-phase1-code:${name}`);
  for (const [name, sha] of Object.entries(contract.input_sha256)) assert.equal(hash(readFileSync(join(root, name))), sha, `changed-input:${name}`);
  for (const [name, sha] of Object.entries(contract.code_sha256)) {
    assert.equal(hash(readFileSync(join(root, 'code', name))), sha, `changed-archived-code:${name}`);
    const override = recovery.code_overrides[name];
    if (override) assert.equal(hash(readFileSync(join(root, override.path))), override.sha256, `changed-recovery-code:${name}`);
    assert.equal(hash(readFileSync(join(repository, name))), override?.sha256 ?? sha, `changed-code:${name}`);
  }
}
export function budget(attempts) {
  const counts = { process: 0, authentication: 0, reported_processing_units: 0, unresolved_usage: false };
  for (const attempt of attempts) {
    assert.ok(['process', 'authentication'].includes(attempt.kind));
    counts[attempt.kind]++;
    if (attempt.kind === 'process') {
      const usage = attempt.metadata?.processing_units;
      if (usage === null || usage === undefined || usage === '' || !Number.isFinite(Number(usage)) || Number(usage) < 0) counts.unresolved_usage = true;
      else counts.reported_processing_units += Number(usage);
    }
  }
  assert.ok(counts.process <= limits.process && counts.authentication <= limits.authentication, 'budget-exceeded');
  return counts;
}
function attemptsAt(root) {
  return readdirSync(join(root, 'attempts')).sort().map(name => {
    const dir = join(root, 'attempts', name);
    const request = json(join(dir, 'request.json'));
    assert.equal(name, request.kind === 'process' ? `${request.day}-${request.index}` : `auth-${request.number}`);
    return { ...request, dir, metadata: existsSync(join(dir, 'metadata.json')) ? json(join(dir, 'metadata.json')) : null };
  });
}
async function snapshot(root) {
  checkContract(root);
  const { spec, items, days, pilotDay } = inventory(root);
  const attempts = attemptsAt(root);
  const counted = budget(attempts);
  const keys = new Set();
  for (const attempt of attempts.filter(attempt => attempt.kind === 'process')) {
    assert.ok(days.includes(attempt.day) && attempt.day !== pilotDay);
    assert.ok(['ndvi', 'ndmi'].includes(attempt.index));
    assert.equal(attempt.url, CDSE_PROCESS_URL);
    assert.deepEqual(attempt.body, bodyFor(spec, attempt.index, attempt.day));
    assert.ok(!keys.has(`${attempt.day}:${attempt.index}`)); keys.add(`${attempt.day}:${attempt.index}`);
    if (attempt.metadata) {
      const raw = readFileSync(join(attempt.dir, 'response.bin'));
      assert.equal(hash(raw), attempt.metadata.sha256, 'attempt-hash-mismatch');
      assert.equal(raw.length, attempt.metadata.bytes);
    }
  }
  const records = [];
  for (let date = spec.period.start; date < spec.period.end_exclusive; date = windowFor(date).to.slice(0, 10)) {
    const products = items.filter(item => item.properties.datetime.slice(0, 10) === date).map(item => item.id).sort();
    if (!products.length) { records.push({ day: date, state: 'no-acquisition', catalogue_products: [] }); continue; }
    const indices = {};
    for (const index of ['ndvi', 'ndmi']) {
      const attempt = attempts.find(attempt => attempt.day === date && attempt.index === index);
      const dir = date === pilotDay ? join(root, 'pilot') : attempt?.dir;
      const metaName = date === pilotDay ? `${index}-response-metadata.json` : 'metadata.json';
      const rawName = date === pilotDay ? `${index}-response.bin` : 'response.bin';
      if (!dir || !existsSync(join(dir, metaName))) {
        indices[index] = { state: dir ? 'interrupted' : 'not-attempted' }; continue;
      }
      const metadata = json(join(dir, metaName)), raw = readFileSync(join(dir, rawName));
      if (date === pilotDay) assert.deepEqual(json(join(dir, `${index}-request.json`)), { url: CDSE_PROCESS_URL, body: bodyFor(spec, index, date) });
      try { indices[index] = { ...await auditResponse(raw, metadata, spec, index, date, items), response_sha256: metadata.sha256 }; }
      catch (error) { indices[index] = { state: 'unresolved', reason: error.code === 'ERR_ASSERTION' ? error.message.split('\n')[0] : error.message, response_sha256: metadata.sha256 }; }
    }
    const pair = indices.ndvi.state === 'verified' && indices.ndmi.state === 'verified' && JSON.stringify(indices.ndvi.source) === JSON.stringify(indices.ndmi.source);
    records.push({ day: date, catalogue_products: products, state: pair ? 'paired-verified' : 'unresolved', pair_compatible: pair, indices });
  }
  assert.equal(records.length, spec.period.utc_days);
  return { version: 'phase3-snapshot-v1', data_state: 'research-provider-observations-not-production-database', candidate_id: spec.candidate_id,
    period: spec.period, specification_sha256: hash(readFileSync(join(root, 'specification.json'))),
    contract_sha256: hash(readFileSync(join(root, 'contract.json'))),
    recovery_sha256: existsSync(join(root, 'recovery.json')) ? hash(readFileSync(join(root, 'recovery.json'))) : null,
    accounting: { calendar_days: records.length, catalogue_days: days.length,
      paired_verified_days: records.filter(record => record.state === 'paired-verified').length,
      unresolved_days: records.filter(record => record.state === 'unresolved').length,
      no_acquisition_days: records.filter(record => record.state === 'no-acquisition').length,
      unattempted_indices: records.reduce((n, record) => n + Object.values(record.indices ?? {}).filter(index => index.state === 'not-attempted').length, 0) },
    used: counted, records };
}
async function collect(root) {
  await snapshot(root);
  const { spec, items, days, pilotDay } = inventory(root);
  const recovery = recoveryAt(root);
  let token, authenticated = 0;
  for (const day of days.filter(day => day !== pilotDay)) {
    for (const index of ['ndvi', 'ndmi']) {
      const attempts = attemptsAt(root), used = budget(attempts);
      const old = attempts.find(attempt => attempt.day === day && attempt.index === index);
      if (old) {
        assert.deepEqual(old.body, bodyFor(spec, index, day));
        if (!old.metadata) {
          if (recovery.acknowledged_interrupted.includes(`${day}-${index}`)) continue;
          throw new Error(`interrupted-attempt:${day}:${index}`);
        }
        if (old.metadata.status !== 200) throw new Error(`previous-http-failure:${day}:${index}`);
        continue;
      }
      const unknownUsage = attempts.filter(attempt => attempt.kind === 'process' && budget([attempt]).unresolved_usage);
      if (used.process >= limits.process || unknownUsage.some(attempt => !recovery.acknowledged_interrupted.includes(`${attempt.day}-${attempt.index}`)) || used.reported_processing_units >= limits.processing_units_stop) throw new Error('collection-budget-stop');
      if (!token || Date.now() - authenticated > 240000) {
        if (used.authentication >= limits.authentication) throw new Error('authentication-budget-stop');
        const dir = join(root, 'attempts', `auth-${used.authentication + 1}`); mkdirSync(dir);
        save(join(dir, 'request.json'), { kind: 'authentication', number: used.authentication + 1, started: new Date().toISOString(), url: CDSE_TOKEN_URL });
        token = await fetchCdseToken({ clientId: process.env.SENTINEL_CLIENT_ID, clientSecret: process.env.SENTINEL_CLIENT_SECRET,
          fetchImpl: (url, options) => nodeFetch(url, { ...options, redirect: 'error' }) });
        authenticated = Date.now(); save(join(dir, 'metadata.json'), { status: 'succeeded', finished: new Date().toISOString() });
      }
      const dir = join(root, 'attempts', `${day}-${index}`); mkdirSync(dir);
      const body = bodyFor(spec, index, day);
      save(join(dir, 'request.json'), { kind: 'process', day, index, started: new Date().toISOString(), url: CDSE_PROCESS_URL, body });
      const response = await nodeFetch(CDSE_PROCESS_URL, { method: 'POST', redirect: 'error', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'multipart/mixed' }, body: JSON.stringify(body), signal: AbortSignal.timeout(45000) });
      const raw = Buffer.from(await response.arrayBuffer()); save(join(dir, 'response.bin'), raw);
      const metadata = { status: response.status, content_type: response.headers.get('content-type'), processing_units: response.headers.get('x-processingunits-spent'), request_id: response.headers.get('x-request-id'), retry_after: response.headers.get('retry-after'), sha256: hash(raw), bytes: raw.length, finished: new Date().toISOString() };
      save(join(dir, 'metadata.json'), metadata);
      if (metadata.status !== 200) throw new Error(`http-${metadata.status}:${day}:${index}`);
      try { await auditResponse(raw, metadata, spec, index, day, items); }
      catch (error) { console.log(JSON.stringify({ day, index, state: 'unresolved', reason: error.message.split('\n')[0] })); }
    }
    console.log(JSON.stringify({ day, process_attempts: budget(attemptsAt(root)).process }));
  }
}
async function main() {
  const [mode, name, destination] = process.argv.slice(2);
  if (!['--prepare', '--allow-live', '--audit', '--freeze'].includes(mode) || !/^phase3-[a-zA-Z0-9-]+$/.test(name ?? '')) throw new Error('usage: --prepare|--allow-live|--audit|--freeze phase3-NAME [fresh-freeze-directory]');
  const root = join(privateRoot, name);
  if (mode === '--prepare') initialize(root);
  else if (mode === '--allow-live') {
    if (!process.env.SENTINEL_CLIENT_ID || !process.env.SENTINEL_CLIENT_SECRET) throw new Error('credentials-missing');
    const lock = join(root, '.collector.lock'); save(lock, { pid: process.pid });
    try { await collect(root); } finally { unlinkSync(lock); }
  }
  const result = await snapshot(root);
  if (mode === '--freeze') {
    assert.ok(destination, 'fresh-freeze-directory-required');
    assert.ok(!existsSync(join(root, '.collector.lock')), 'collector-still-running');
    assert.equal(result.accounting.unattempted_indices, 0, 'collection-incomplete');
    const out = resolve(destination); assert.ok(!out.startsWith(root + '/'), 'freeze-outside-acquisition-directory');
    mkdirSync(out, { mode: 0o700 });
    save(join(out, 'snapshot.json'), result);
    const files = Object.fromEntries(filesUnder(root).map(name => [name, hash(readFileSync(join(root, name)))]));
    save(join(out, 'manifest.json'), { version: 'phase3-freeze-v1', acquisition_directory: root, snapshot_sha256: hash(readFileSync(join(out, 'snapshot.json'))), files });
  }
  console.log(JSON.stringify({ mode, accounting: result.accounting, used: result.used }));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(error => {
  console.error(JSON.stringify({ status: 'stopped', transport_code: error.cause?.code ?? error.code ?? null, reason: error.code === 'ERR_ASSERTION' ? error.message.split('\n')[0] : String(error.message).slice(0, 160) })); process.exitCode = 1;
});
