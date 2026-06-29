import { ArrowLeft, Calendar, Clock, Download, Loader2, AlertCircle, RefreshCw, BarChart3, Package, ClipboardList } from "lucide-react";
import { motion } from "motion/react";
import { useHistoryDetail, PAGE } from "../hooks/useHistoryDetail";
import { TabDashboard } from "../components/TabDashboard";
import { TabPurchase } from "../components/TabPurchase";
import { TabEvaluation } from "../components/TabEvaluation";

export function HistoryDetail() {
  const hd = useHistoryDetail();

  // ── Loading ──────────────────────────────────────────────────────────────
  if (hd.loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          <p className="text-gray-500" style={{ fontSize: "0.9375rem" }}>Cargando predicción...</p>
        </div>
      </div>
    );
  }

  // ── Error / no data ──────────────────────────────────────────────────────
  if (hd.error || !hd.summary?.latestPredictionId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 border border-gray-200">
          <AlertCircle className="h-7 w-7 text-gray-300" />
        </div>
        <p className="text-gray-500">{hd.error || "Predicción no encontrada"}</p>
        <div className="flex gap-2">
          {hd.error && (
            <button onClick={hd.loadData}
              className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-white hover:bg-cyan-400 transition-colors"
              style={{ fontSize: "0.875rem", fontWeight: 600 }}>
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
          )}
          <button onClick={() => hd.navigate("/history")}
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            style={{ fontSize: "0.875rem" }}>
            <ArrowLeft className="h-4 w-4" />
            Volver al historial
          </button>
        </div>
      </div>
    );
  }

  const { summary } = hd;

  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <button onClick={() => hd.navigate("/history")}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-900 transition-colors mt-1"
            style={{ fontSize: "0.875rem" }}>
            <ArrowLeft className="h-4 w-4" />
            Historial
          </button>
          <div>
            <h1 className="text-gray-900 mb-1" style={{ fontWeight: 700 }}>Predicción</h1>
            <p className="text-gray-400 mb-1" style={{ fontSize: "0.8125rem", fontFamily: "monospace" }}>
              {summary.latestPredictionId.slice(0, 8).toUpperCase()}…
            </p>
            <div className="flex items-center gap-4">
              {summary.latestPredictionDate && (
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span style={{ fontSize: "0.8125rem" }}>{hd.formatDate(summary.latestPredictionDate)}</span>
                </div>
              )}
              {summary.forecastPeriod && (
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span style={{ fontSize: "0.8125rem" }}>{summary.forecastPeriod} días de predicción</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => hd.handleExport("csv")} disabled={hd.exportLoading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-all disabled:opacity-50"
            style={{ fontSize: "0.8125rem" }}>
            {hd.exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar CSV
          </button>
          <button onClick={() => hd.handleExport("pdf")} disabled={hd.exportLoading}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-white hover:bg-cyan-400 transition-all disabled:opacity-50"
            style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
            {hd.exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 w-fit mb-8">
        {[
          { id: "dashboard",  label: "Dashboard",           icon: BarChart3     },
          { id: "purchase",   label: "Plan de compras",     icon: Package       },
          { id: "evaluation", label: "Evaluación del plan", icon: ClipboardList },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => hd.setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all ${
                hd.activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
              style={{ fontSize: "0.875rem", fontWeight: hd.activeTab === tab.id ? 500 : 400 }}>
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <motion.div key={hd.activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
        {hd.activeTab === "dashboard" && (
          <TabDashboard
            summary={summary}
            productsData={hd.productsData}
            productsLoading={hd.productsLoading}
            resultsPage={hd.resultsPage}
            setResultsPage={hd.setResultsPage}
            resultsSearch={hd.resultsSearch}
            setResultsSearch={hd.setResultsSearch}
            selectedProduct={hd.selectedProduct}
            setSelectedProduct={hd.setSelectedProduct}
            chartData={hd.chartData}
            chartLoading={hd.chartLoading}
            showConfidence={hd.showConfidence}
            setShowConfidence={hd.setShowConfidence}
            sidebarOpen={hd.sidebarOpen}
            setSidebarOpen={hd.setSidebarOpen}
            sidebarSearch={hd.sidebarSearch}
            setSidebarSearch={hd.setSidebarSearch}
            sidebarProducts={hd.sidebarProducts}
            bridgeDateLabel={hd.bridgeDateLabel}
            getAvgHistorical={hd.getAvgHistorical}
            getVariation={hd.getVariation}
            PAGE={PAGE}
          />
        )}

        {hd.activeTab === "purchase" && (
          <TabPurchase
            summary={summary}
            productsLoading={hd.productsLoading}
            filterPriority={hd.filterPriority}
            setFilterPriority={hd.setFilterPriority}
            planSearch={hd.planSearch}
            setPlanSearch={hd.setPlanSearch}
            planPage={hd.planPage}
            setPlanPage={hd.setPlanPage}
            planItems={hd.planItems}
            paginatedPlan={hd.paginatedPlan}
            setActiveTab={hd.setActiveTab}
          />
        )}

        {hd.activeTab === "evaluation" && (
          <TabEvaluation
            purchasePlanId={hd.purchasePlanId}
            purchasePlanIdLoading={hd.purchasePlanIdLoading}
            evalSalesFile={hd.evalSalesFile}
            setEvalSalesFile={hd.setEvalSalesFile}
            evalSalesProdCol={hd.evalSalesProdCol}
            setEvalSalesProdCol={hd.setEvalSalesProdCol}
            evalSalesQtyCol={hd.evalSalesQtyCol}
            setEvalSalesQtyCol={hd.setEvalSalesQtyCol}
            evalSalesPriceCol={hd.evalSalesPriceCol}
            setEvalSalesPriceCol={hd.setEvalSalesPriceCol}
            salesColumns={hd.salesColumns}
            salesColsLoading={hd.salesColsLoading}
            salesDragging={hd.salesDragging}
            setSalesDragging={hd.setSalesDragging}
            salesFileRef={hd.salesFileRef}
            handleSalesFile={hd.handleSalesFile}
            evalPharmFile={hd.evalPharmFile}
            setEvalPharmFile={hd.setEvalPharmFile}
            evalPharmProdCol={hd.evalPharmProdCol}
            setEvalPharmProdCol={hd.setEvalPharmProdCol}
            evalPharmQtyCol={hd.evalPharmQtyCol}
            setEvalPharmQtyCol={hd.setEvalPharmQtyCol}
            pharmColumns={hd.pharmColumns}
            pharmColsLoading={hd.pharmColsLoading}
            pharmDragging={hd.pharmDragging}
            setPharmDragging={hd.setPharmDragging}
            pharmFileRef={hd.pharmFileRef}
            handlePharmFile={hd.handlePharmFile}
            planEvalLoading={hd.planEvalLoading}
            planEvalResult={hd.planEvalResult}
            planEvalError={hd.planEvalError}
            handleEvaluate={hd.handleEvaluate}
            evalResultRef={hd.evalResultRef}
            chartLimit={hd.chartLimit}
            setChartLimit={hd.setChartLimit}
            planSampleNames={hd.planSampleNames}
            csvSampleNames={hd.csvSampleNames}
            evalSalesProdColValue={hd.evalSalesProdCol}
            formatFileSize={hd.formatFileSize}
          />
        )}
      </motion.div>
    </div>
  );
}
