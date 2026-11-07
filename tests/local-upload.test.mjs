import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import XLSX from 'xlsx';

const require = createRequire(import.meta.url);
const bundle = await build({ entryPoints: ['src/lib/localDatasetValidation.ts'], bundle: true,
  write: false, platform: 'node', format: 'cjs', packages: 'external' });
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, module, module.exports);
const { inspectLocalDataset } = module.exports;
const csv = text => new File([text], 'ventas.csv');

test('local validation needs no network and returns only first-row headers', async () => {
  const oldFetch = global.fetch;
  global.fetch = () => { throw new Error('No network allowed'); };
  try {
    assert.deepEqual(await inspectLocalDataset(csv('\uFEFFfecha;producto;cantidad\r\n2026-01-01;"Producto; A";4\r\n')),
      { headers: ['fecha', 'producto', 'cantidad'], rows: 1 });
  } finally { global.fetch = oldFetch; }
});

test('rejects wrong extensions, empty files and renamed fake Excel', async () => {
  await assert.rejects(inspectLocalDataset(new File(['a'], 'ventas.pdf')), /Formato/);
  await assert.rejects(inspectLocalDataset(csv('')), /vacío/);
  for (const extension of ['xls', 'xlsx'])
    await assert.rejects(inspectLocalDataset(new File(['a,b\n1,2'], `ventas.${extension}`)), /Excel válido/);
});

test('rejects missing, repeated headers and files without data', async () => {
  for (const text of ['\na,b\n1,2', 'fecha,,cantidad\n1,a,2', 'fecha,FECHA\n1,2', 'fecha,producto'])
    await assert.rejects(inspectLocalDataset(csv(text)));
});

test('detects malformed CSV quoting and inconsistent row widths', async () => {
  for (const text of ['a,b\n"open,2', 'a,b\n1,2,3', 'a,b\n"one"junk,2'])
    await assert.rejects(inspectLocalDataset(csv(text)));
  assert.equal((await inspectLocalDataset(csv('a,b\n"text\nwith ""quotes""",2'))).rows, 1);
});

test('reads genuine XLS and XLSX locally, rejects header-only and blank header cells', async () => {
  for (const extension of ['xls', 'xlsx']) {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['fecha','producto','cantidad'], ['2026-01-01','A',2]]), 'Ventas');
    const file = new File([XLSX.write(workbook, { type: 'buffer', bookType: extension === 'xls' ? 'biff8' : 'xlsx' })], `ventas.${extension}`);
    assert.deepEqual(await inspectLocalDataset(file), { headers: ['fecha','producto','cantidad'], rows: 1 });
  }
  for (const rows of [[['a','b']], [['a',null,'b'], [1,2,3]]]) {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Ventas');
    await assert.rejects(inspectLocalDataset(new File([XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })], 'ventas.xlsx')));
  }
});
