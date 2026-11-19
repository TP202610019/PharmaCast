import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
async function load(entry) {
  const result = await build({ entryPoints: [path.resolve(entry)], bundle: true, write: false,
    platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic', loader: { '.css': 'empty' },
    define: { 'import.meta.env': '{}' }, logLevel: 'silent' });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
}
const { PredictionAnalysis, AnalysisPaginator } = await load('src/app/components/PredictionAnalysis.tsx');
const transforms = await load('src/lib/transforms.ts');
const cache = await load('src/lib/dashboardCache.ts');
const { exportPurchasePlan } = await load('src/lib/purchaseExport.ts');
const products = Array.from({ length: 12 }, (_, index) => ({
  productName: `Medicamento ${String(index + 1).padStart(2, '0')}`,
  forecastDate: '2026-11-07', predictedQuantity: 24 - index, lowerBound: null, upperBound: null,
}));
const prediction = { id: 'execution-a', datasetId: 'sales-a', forecastPeriod: 30,
  executionStatus: 'Completed', forecastResults: products,
  metrics: [{ scope: 'Overall', method: 'XGBoost', volumeAccuracy: 84 }],
  productMetrics: [{ productName: 'Medicamento 01', historicalAvg: 20 }],
};
const plan = { id: 'plan-a', predictionExecutionId: 'execution-a', items: products.map(row => ({
  id: row.productName, productName: row.productName, stockActual: 10,
  demandPredicted: row.predictedQuantity, recommendedQuantity: Math.ceil(row.predictedQuantity - 10),
  toPurchase: row.predictedQuantity - 10, priority: row.predictedQuantity > 20 ? 'high' : 'medium',
})) };
function tableRows(markup) { return markup.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1].match(/<tr>/g)?.length ?? 0; }
test('CSV exports the saved plan quantities and leaves unknown stock blank of estimates', async () => {
  const originalDocument = globalThis.document;
  const createObjectURL = URL.createObjectURL;
  let exported;
  let downloaded = false;
  globalThis.document = { createElement: () => ({ click: () => { downloaded = true; } }) };
  URL.createObjectURL = blob => { exported = blob; return 'blob:qa'; };
  try {
    await exportPurchasePlan('csv', prediction, { ...plan, items: [
      { ...plan.items[0], stockActual: 0, demandPredicted: 24, recommendedQuantity: 24, priority: 'critical' },
      { ...plan.items[1], stockActual: null, demandPredicted: null, recommendedQuantity: 7, priority: null },
    ] });
    assert.equal(downloaded, true);
    const csv = await exported.text();
    assert.doesNotMatch(csv, /Categoría/);
    assert.match(csv, /"Medicamento 01";"0";"24";"24";"Crítico"/);
    assert.match(csv, /"Medicamento 02";"—";"—";"7";"No calculable"/);
    assert.doesNotMatch(csv, /Medicamento 03/);
  } finally {
    globalThis.document = originalDocument;
    URL.createObjectURL = createObjectURL;
  }
});
function render(view, extra = {}) {
  return renderToStaticMarkup(React.createElement(PredictionAnalysis, {
    executionId: prediction.id, view, initialPrediction: prediction, initialPlan: plan, ...extra,
  }));
}

test('demand and plan display at most five products and show pagination', () => {
  for (const view of ['demand', 'purchase']) {
    const markup = render(view);
    assert.equal(tableRows(markup), 5);
    assert.match(markup, /1–5 de 12/);
    assert.doesNotMatch(markup, /<td>Medicamento 09<\/td>/);
  }
});

test('saved purchase quantities use inventory and authoritative rounded recommendations', () => {
  const rows = transforms.forecastResultsToProducts(products, plan.items, prediction.productMetrics);
  assert.equal(rows[0].recommendedQty, 14);
  assert.equal(rows[0].totalPredicted, 24);
  assert.equal(rows[0].historicalAvg, 20);
  const markup = render('purchase');
  assert.match(markup, /Stock actual/);
  assert.match(markup, /<td>14 uds<\/td>/);
  assert.match(markup, /analysis-priority-chip is-high/);
});

test('investment appears only with the corresponding purchase costs', () => {
  const uncosted = render('purchase');
  assert.doesNotMatch(uncosted, /<th>Costo unitario de compra<\/th>/);
  assert.match(uncosted, /Mapea el costo unitario de compra/);
  const items = plan.items.map(item => ({ ...item, unitPurchaseCost: 0, estimatedCost: 0 }));
  const complete = render('purchase', { initialPlan: { ...plan, items, totalEstimatedCost: 0 } });
  assert.match(complete, /<th>Costo unitario de compra<\/th>/);
  assert.match(complete, /<dt>.*Inversión estimada<\/dt><dd>.*0\.00<\/dd>/);
  const partial = render('purchase', {
    initialPlan: { ...plan, items: [items[0], plan.items[1]], itemsMissingPurchaseCost: 1 },
  });
  assert.match(partial, /<th>Costo unitario de compra<\/th>/);
  assert.match(partial, /La inversión total no está disponible/);
  assert.doesNotMatch(partial, /Inversión estimada<\/dt>/);
});

test('demand comparison uses real historical values and leaves absent data unknown', () => {
  const markup = render('demand');
  assert.match(markup, /<td>140 uds<\/td>/);
  assert.match(markup, /-96%/);
  assert.match(markup, /<td>—<\/td>/);
  assert.doesNotMatch(markup, /General/);
  assert.doesNotMatch(markup, /<th>Categoría<\/th>|data-trend=/);
});

test('demand renders mapped categories and the server trend without a local threshold', () => {
  const markup = render('demand', { initialPrediction: {
    ...prediction,
    productSummaries: [{
      productName: 'Medicamento 01', category: 'Analgésicos', historicalAvg: 20,
      variationPercent: -96, trend: 'steady',
    }],
  } });
  assert.match(markup, /<th>Categoría<\/th>/);
  assert.match(markup, /<td>Analgésicos<\/td>/);
  assert.match(markup, /<td>Medicamento 02<\/td><td><\/td>/);
  assert.match(markup, /data-trend="steady"/);
  assert.doesNotMatch(markup, /data-trend="down"/);
});

test('late pages remain reachable with current page and last page controls', () => {
  const markup = renderToStaticMarkup(React.createElement(AnalysisPaginator, { page: 14, total: 160, onChange() {} }));
  assert.match(markup, /aria-current="page"[^>]*>14</);
  assert.match(markup, />32<\/button>/);
  assert.match(markup, /66–70 de 160/);
});

test('weekly chart retains real historical totals without inventing confidence bounds', () => {
  const chart = transforms.buildChartFromBackendPoints([
    { date: '2026-11-09', predicted: 4, upper: null, lower: null },
    { date: '2026-11-10', predicted: 6, upper: null, lower: null },
  ], 30, [{ date: '2026-11-02', quantity: 3 }, { date: '2026-11-03', quantity: 7 }]);
  assert.equal(chart[0].historical, 10);
  assert.equal(chart[1].predicted, 10);
  assert.equal(chart[1].upper, null);
  assert.equal(chart[1].lower, null);
});

test('priority comes from the purchase plan and remains unknown without it', () => {
  const rows = transforms.forecastResultsToProducts(products, []);
  assert.ok(rows.every(row => row.priority === null));
  assert.doesNotMatch(render('demand'), /analysis-priority-chip/);
  const markup = render('purchase', { initialPlan: { ...plan, items: [
    { ...plan.items[0], priority: 'none' },
    { ...plan.items[1], priority: null, stockActual: null },
  ] } });
  assert.match(markup, /Sin prioridad/);
  assert.match(markup, /No calculable/);
});

test('cache deduplicates requests and rejects writes from a previous account generation', async () => {
  let finish, calls = 0;
  const fetcher = () => { calls++; return new Promise(resolve => { finish = resolve; }); };
  const one = cache.withCache('test', fetcher);
  const two = cache.withCache('test', fetcher);
  assert.equal(calls, 1);
  finish(42); await Promise.all([one, two]);
  assert.equal(await cache.withCache('test', fetcher), 42);
  assert.equal(calls, 1);
  const old = cache.withCache('old', fetcher);
  cache.invalidateDashboardCache();
  finish(12); await old;
  assert.equal(cache.peekCache('old'), undefined);
  assert.equal(cache.peekCache('test'), undefined);
});

test('finishing a plan invalidates lists without discarding the saved execution', () => {
  cache.seedCache('prediction:execution-a', prediction);
  cache.seedCache('history', []);
  cache.seedCache('summary', {});
  cache.invalidateAnalysisLists();
  assert.equal(cache.peekCache('history'), undefined);
  assert.equal(cache.peekCache('summary'), undefined);
  assert.equal(cache.peekCache('prediction:execution-a'), prediction);
});

test('an old history request cannot overwrite cache after a new prediction is saved', async () => {
  cache.invalidateDashboardCache();
  let finishOld;
  const old = cache.withCache('history', () => new Promise(resolve => { finishOld = resolve; }));
  cache.invalidateAnalysisLists();
  await cache.withCache('history', async () => ['new-execution']);
  finishOld(['old-execution']); await old;
  assert.deepEqual(cache.peekCache('history'), ['new-execution']);
});
