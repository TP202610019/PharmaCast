# Análisis dashboard para mejora

Análisis de los gráficos de predicción por producto (post-predicción) en el frontend: cuántos son, dónde aparecen, si están relacionados y si usan datos reales o simulados. Incluye plan de unificación.

## Gráficos encontrados (4 en total, Recharts)

### 1-3. "Histórico vs. Predicho" por producto — mismo gráfico duplicado en 3 archivos

1. **`src/features/prediction/components/StepResults.tsx`** (líneas 218-237)
   Se renderiza en: Paso 4 "Resultados" del flujo de predicción (`src/features/prediction/pages/PredictionFlow.tsx`).
   Datos: `productChartData`, construido en `usePredictionFlow.ts:334-340` vía `buildProductChartData` (`src/shared/lib/transforms.ts:106-127`) sobre `prediction.forecastResults` (recién calculado, en memoria). **Nunca muestra histórico** (`historical` siempre `null`), aunque dibuja la leyenda "Histórico".

2. **`src/features/history/components/TabDashboard.tsx`** (líneas 201-222)
   Se renderiza en: Historial → Detalle de predicción → pestaña "Dashboard" (`src/features/history/pages/HistoryDetail.tsx`).
   Datos: `chartData`, construido en `useHistoryDetail.ts:185-199` vía `dashboardService.getChart(id, selectedProduct)` → `buildChartFromBackendPoints` (`transforms.ts:146-239`).

3. **`src/features/dashboard/pages/Dashboard.tsx`** (JSX ~líneas 620-641)
   Se renderiza en: página Home "Dashboard" (muestra la última predicción).
   Datos: idéntico a #2 — mismo `dashboardService.getChart` + `buildChartFromBackendPoints`.

**Relación:** los 3 muestran la misma información (histórico vs. predicho de un producto). #2 y #3 comparten exactamente la misma lógica de datos; #1 usa una función distinta y más simple porque opera sobre el resultado recién calculado (aún no persistido con histórico). El JSX (tooltip, leyenda, sidebar, gradientes) está duplicado casi literal en los 3 archivos — no existe un componente `<DemandChart>` compartido. `Dashboard.tsx` incluso reimplementa su propio `Paginator` en vez de usar el compartido.

### 4. "Plan vs. Ventas reales" (evaluación) — información distinta

**`src/features/history/components/TabEvaluation.tsx`** (líneas 482-528), pestaña "Evaluación del plan" de Historial (Sección B / diagnóstico retrospectivo).
No filtra por un solo producto: compara varios productos a la vez (top 10/20/todos) — `actual` (vendido real) vs `pharmaCast` (plan sugerido) vs opcionalmente `botica` (plan propio). Agregado por período, no serie temporal día a día. No comparte código con los otros 3.

### Nota — código legacy no enrutado
`src/app/pages/HistoryDetail.tsx` y `src/app/pages/PredictionFlow.tsx` (1400-1900 líneas c/u) tienen gráficos similares pero **no están referenciados en `routes.tsx`** — parecen una versión monolítica previa a la división en `features/`. Candidatos a limpieza.

## ¿Usan datos fake/simulados?

**Sí — manipulación sintética en el frontend, en la línea de predicción de los gráficos #2 y #3.**

`buildChartFromBackendPoints` (`transforms.ts:146-239`) toma la predicción real y le aplica:
- **Reescalado ("level alignment")**: fuerza el inicio de la predicción a acercarse al promedio de los últimos 14 días históricos, factor acotado 0.3x-3.5x.
- **Patrón día-de-semana inyectado**: multiplicador por día de semana extraído del histórico, mezclado al 50% con la predicción.
- **Tendencia de crecimiento artificial**: +6% acumulado, inventado (comentario propio en el código: `// Subtle growth trend: +6% over the full horizon`).
- El propio autor lo llama **"synthetic history"** en un comentario (`Dashboard.tsx:213`).

`StepResults.tsx` usa `buildProductChartData` (sin reescalos ni patrones inventados) — grafica el valor crudo de predicción. Es la más fiel en cuanto a la predicción, pero nunca muestra histórico.

Los 3 caen a `buildGeneratedChartData(100, dias)` (línea plana de valor 100, ±11%) cuando no hay datos — 100% inventado, usado como fallback.

**Tablas de productos (columna "histórico"):**
- `StepResults.tsx` y `TabDashboard.tsx` (vía `getAvgHistorical` en `useHistoryDetail.ts:333`) calculan `Math.round(predictedDemand * 0.88)` — siempre 88% de la predicción, **no es histórico real**.
- `Dashboard.tsx` usa `p.historicalAvg` (línea 256) — campo real del backend.

## Verificación de origen de datos reales (backend `PharmacyApiService` + ML service `Modelo_XGBOOST`)

| Variable | Origen | ¿Real o fabricado? |
|---|---|---|
| `historicalAvg` (escalar, por producto) | `DashboardProductRow.historicalAvg` ← `GET /api/dashboard/products` ← tabla `PredictionMetrics.HistoricalAvg` ← ML service: promedio real de ventas diarias sumadas por producto, sobre todo el histórico acumulado del usuario (`execution_orchestrator.py`) | ✅ Real |
| `historicalPoints[]` (serie temporal) | `DashboardChartResponse.historicalPoints` ← `GET /api/dashboard/chart` ← tabla `HistoricalDailyPoints` ← ML service: `groupby(product,date).sum(quantity)` sobre dataset acumulado real | ✅ Real |
| `points[].predicted` | mismo endpoint ← tabla `ForecastResults.PredictedQuantity` | ✅ Real |
| `points[].upper` / `points[].lower` | mismo endpoint; `ForecastResult.LowerBound/UpperBound` siempre se persisten `null`, el backend rellena con ±11% fabricado (`DashboardService.cs:213-224`) | ⚠️ Fabricado (bug de backend, fuera de alcance salvo que se pida) |
| `prediction.id` | `PredictionResponse.id` (resultado de `predictionService.execute(...)`) — mismo `PredictionExecutionId` que usan los endpoints de dashboard | ✅ Real, reutilizable |
| `prediction.metrics` | `PredictionResponse.metrics: PredictionMetricResponse[]` — trae `historicalAvg` por producto, ya viene en la respuesta de `execute()` pero hoy no se usa | ✅ Real, pero no conectado |

**Bug encontrado:** `usePredictionFlow.ts:73` llama `forecastResultsToProducts(prediction.forecastResults, purchasePlan?.items ?? [])` sin el 3er argumento `metrics`, aunque la función ya sabe usarlo para llenar `UIProduct.historicalAvg` (`transforms.ts:89`). El campo real existe en el tipo pero nunca se llena — por eso la tabla de `StepResults.tsx` inventa el `*0.88`.

## Plan de unificación (pendiente de ejecutar)

1. **`src/shared/lib/transforms.ts`**: reescribir `buildChartFromBackendPoints` eliminando reescalado, patrón día-de-semana y tendencia +6%; mapear `historicalPoints`/`points` tal cual, manteniendo solo un punto puente (repetir el último valor histórico real en el primer punto de predicción) para continuidad visual. Eliminar `buildProductChartData` (queda obsoleta). Decidir qué hacer con `buildGeneratedChartData` como fallback sin datos (línea plana fake vs. estado vacío).

2. **`usePredictionFlow.ts` / `StepResults.tsx`**: pasar `prediction.metrics` a `forecastResultsToProducts` (arregla el bug). Cambiar el gráfico para usar `dashboardService.getChart(prediction.id, selectedProduct.name)` en vez de construirlo localmente (el backend ya persiste `HistoricalDailyPoints` durante `ExecuteAsync`, antes de responder). En `tableData`, reemplazar `avgHistorical: Math.round(p.predictedDemand * 0.88)` por `p.historicalAvg` real (manejar `null` con "—").

3. **`useHistoryDetail.ts` / `TabDashboard.tsx`**: eliminar `getAvgHistorical` (`*0.88`), usar `p.historicalAvg` directo del `DashboardProductRow` (ya se pide al backend, solo no se usa). Ajustar `getVariation` sobre el valor real, con guarda para `null`/0.

4. **`Dashboard.tsx`**: sin cambios propios — ya usa `p.historicalAvg` real en tabla, y hereda el arreglo del gráfico automáticamente vía `buildChartFromBackendPoints`.

### Decisiones pendientes antes de implementar
- ¿Fallback sin datos: línea plana fake (`buildGeneratedChartData`) o estado vacío?
- ¿Se incluye en este cambio el arreglo del ±11% fabricado en backend (`PharmacyApiService`, `DashboardService.cs:213-224`), o queda fuera de alcance?
