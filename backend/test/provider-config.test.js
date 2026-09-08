import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../config.js';

test('empty provider environment values resolve to CDSE API defaults', () => {
  const config = loadConfig({ SENTINEL_CATALOG_URL: '  ', SENTINEL_PROCESS_URL: '' });
  assert.equal(config.sentinelCatalogUrl, 'https://sh.dataspace.copernicus.eu/catalog/v1/search');
  assert.equal(config.sentinelProcessUrl, 'https://sh.dataspace.copernicus.eu/process/v1');
});

test('provider URLs trim whitespace and reject relative or credential-bearing URLs', () => {
  assert.equal(loadConfig({ SENTINEL_PROCESS_URL: ' https://example.com/process\n' }).sentinelProcessUrl, 'https://example.com/process');
  for (const url of ['/process', 'http://example.com', 'https://user:pass@example.com']) {
    assert.throws(() => loadConfig({ SENTINEL_PROCESS_URL: url }));
  }
});
