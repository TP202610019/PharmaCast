import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { indexedDB } from 'fake-indexeddb';

global.indexedDB = indexedDB;
const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
global.localStorage = storage(); global.sessionStorage = storage();
localStorage.setItem('pharmacast_auth', 'true');
localStorage.setItem('pharmacast_user', JSON.stringify({ id: 'account-a' }));
const require = createRequire(import.meta.url);
async function load() {
  const code = await build({ entryPoints: ['src/lib/dashboardCache.ts'], bundle: true, write: false, platform: 'node', format: 'cjs' });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
}
const settle = () => new Promise(resolve => setTimeout(resolve, 30));

test('reload restores saved analysis without fetching it again; original expiry is preserved', async () => {
  const one = await load();
  one.seedCache('prediction:saved', { id: 'saved', total: 42 });
  await settle();
  const two = await load(); // A fresh JS module simulates a browser reload.
  let calls = 0;
  const fetcher = async () => { calls++; return { id: 'server' }; };
  assert.equal((await two.withCache('prediction:saved', fetcher, 60000)).id, 'saved');
  assert.equal(calls, 0);
  assert.equal((await two.withCache('prediction:saved', fetcher, 0)).id, 'server');
  assert.equal(calls, 1);
});

test('account changes cannot reuse another account data; logout invalidates the persisted session', async () => {
  const one = await load();
  one.seedCache('plan:private', { owner: 'a' }); await settle();
  localStorage.setItem('pharmacast_user', JSON.stringify({ id: 'account-b' }));
  const two = await load();
  assert.equal((await two.withCache('plan:private', async () => ({ owner: 'b' }))).owner, 'b');
  two.invalidateDashboardCache(); await settle();
  const three = await load();
  let calls = 0;
  await three.withCache('plan:private', async () => { calls++; return {}; });
  assert.equal(calls, 1);
});

test('new predictions invalidate persisted lists while preserving completed results', async () => {
  const one = await load();
  one.seedCache('history', ['old']);
  one.seedCache('prediction:stable', { id: 'stable' }); await settle();
  one.invalidateAnalysisLists(); await settle();
  const two = await load();
  assert.deepEqual(await two.withCache('history', async () => ['new']), ['new']);
  assert.equal((await two.withCache('prediction:stable', async () => { throw new Error('Should not fetch'); })).id, 'stable');
});
