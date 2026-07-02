import { ChevronLeft, ChevronRight, CheckCircle, Save, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePredictionFlow } from "../hooks/usePredictionFlow";
import { StepUpload } from "../components/StepUpload";
import { StepMapping } from "../components/StepMapping";
import { StepAnalysis } from "../components/StepAnalysis";
import { StepResults } from "../components/StepResults";
import { StepPurchasePlan } from "../components/StepPurchasePlan";
import { STEPS, FALLBACK_SALES_COLS, FALLBACK_INV_COLS } from "../constants";

export function PredictionFlow() {
  const flow = usePredictionFlow();

  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-gray-900 mb-1" style={{ fontWeight: 700 }}>Nueva predicción</h1>
        <p className="text-gray-400" style={{ fontSize: "0.875rem" }}>
          Completa los pasos para generar tu plan de compras
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-10">
        <div className="flex items-start">
          {STEPS.flatMap((step, idx) => {
            const Icon = step.icon;
            const isCompleted = flow.currentStep > step.id;
            const isActive    = flow.currentStep === step.id;
            const items = [
              <button
                key={`step-${step.id}`}
                onClick={() => { if (isCompleted) flow.setCurrentStep(step.id); }}
                className={`flex flex-col items-center gap-1.5 shrink-0 ${isCompleted ? "cursor-pointer" : "cursor-default"}`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                  isCompleted ? "border-cyan-500 bg-cyan-500 text-white"
                  : isActive  ? "border-cyan-500 bg-cyan-500/10 text-cyan-500"
                  : "border-gray-300 bg-white text-gray-400"
                }`}>
                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className="hidden sm:block text-center whitespace-nowrap transition-colors"
                  style={{ fontSize: "0.6875rem", fontWeight: isActive ? 600 : 400,
                    color: isCompleted ? "#0891b2" : isActive ? "#06b6d4" : "#9ca3af" }}>
                  {step.label}
                </span>
              </button>,
            ];
            if (idx < STEPS.length - 1) {
              items.push(
                <div key={`line-${step.id}`} className="flex-1 h-px mt-[1.125rem] mx-2 transition-colors"
                  style={{ backgroundColor: isCompleted ? "#06b6d4" : "#e5e7eb" }} />
              );
            }
            return items;
          })}
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={flow.currentStep}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.25 }}
        >
          {flow.currentStep === 1 && (
            <StepUpload
              files={flow.files}
              isDragOver={flow.isDragOver}
              setIsDragOver={flow.setIsDragOver}
              uploadError={flow.uploadError}
              uploadFile={flow.uploadFile}
              removeFile={flow.removeFile}
              handleFileInput={flow.handleFileInput}
              fileInputRef={flow.fileInputRef}
              salesInputRef={flow.salesInputRef}
              inventoryInputRef={flow.inventoryInputRef}
              formatSize={flow.formatSize}
            />
          )}

          {flow.currentStep === 2 && (
            <StepMapping
              files={flow.files}
              forecastDays={flow.forecastDays}
              setForecastDays={flow.setForecastDays}
              mappingTab={flow.mappingTab}
              setMappingTab={flow.setMappingTab}
              salesMapping={flow.salesMapping}
              setSalesMapping={flow.setSalesMapping}
              inventoryMapping={flow.inventoryMapping}
              setInventoryMapping={flow.setInventoryMapping}
              detectedSalesCols={flow.detectedSalesCols}
              detectedInvCols={flow.detectedInvCols}
              fieldCatalog={flow.fieldCatalog}
              fieldCatalogLoading={flow.fieldCatalogLoading}
              savedMappings={flow.savedMappings}
              savedMappingsLoading={flow.savedMappingsLoading}
              appliedMappingId={flow.appliedMappingId}
              setAppliedMappingId={flow.setAppliedMappingId}
              mappingName={flow.mappingName}
              setMappingName={flow.setMappingName}
              saveAsDefault={flow.saveAsDefault}
              setSaveAsDefault={flow.setSaveAsDefault}
              canProceed={flow.canProceed}
              today={flow.today}
              FALLBACK_SALES_COLS={FALLBACK_SALES_COLS}
              FALLBACK_INV_COLS={FALLBACK_INV_COLS}
            />
          )}

          {flow.currentStep === 3 && (
            <StepAnalysis
              analysisStatus={flow.analysisStatus}
              analysisProgress={flow.analysisProgress}
              completedStepIdx={flow.completedStepIdx}
              analysisError={flow.analysisError}
              files={flow.files}
              forecastDays={flow.forecastDays}
              prediction={flow.prediction}
              products={flow.products}
              accuracy={flow.accuracy}
              setCurrentStep={flow.setCurrentStep}
              setAnalysisStatus={flow.setAnalysisStatus}
            />
          )}

          {flow.currentStep === 4 && (
            <StepResults
              products={flow.products}
              totalUnits={flow.totalUnits}
              accuracy={flow.accuracy}
              forecastDays={flow.forecastDays}
              selectedProductId={flow.selectedProductId}
              setSelectedProductId={flow.setSelectedProductId}
              showConfidence={flow.showConfidence}
              setShowConfidence={flow.setShowConfidence}
              sidebarOpen={flow.sidebarOpen}
              setSidebarOpen={flow.setSidebarOpen}
              sidebarSearch={flow.sidebarSearch}
              setSidebarSearch={flow.setSidebarSearch}
              resultsTablePage={flow.resultsTablePage}
              setResultsTablePage={flow.setResultsTablePage}
              resultsSearch={flow.resultsSearch}
              setResultsSearch={flow.setResultsSearch}
              selectedProduct={flow.selectedProduct}
              productChartData={flow.productChartData}
              chartLoading={flow.chartLoading}
              bridgeDateLabel={flow.bridgeDateLabel}
              tableData={flow.tableData}
              sidebarProducts={flow.sidebarProducts}
              searchedTableData={flow.searchedTableData}
              paginatedTableData={flow.paginatedTableData}
            />
          )}

          {flow.currentStep === 5 && (
            <StepPurchasePlan
              products={flow.products}
              totalUnits={flow.totalUnits}
              forecastDays={flow.forecastDays}
              filterPriority={flow.filterPriority}
              setFilterPriority={flow.setFilterPriority}
              planSearch={flow.planSearch}
              setPlanSearch={flow.setPlanSearch}
              planTablePage={flow.planTablePage}
              setPlanTablePage={flow.setPlanTablePage}
              searchedPlanProducts={flow.searchedPlanProducts}
              paginatedPlanProducts={flow.paginatedPlanProducts}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={() => flow.setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={flow.currentStep === 1 || flow.currentStep === 3}
          className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-gray-500 transition-all hover:border-gray-400 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ fontSize: "0.875rem" }}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>

        <span className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
          Paso {flow.currentStep} de {STEPS.length}
        </span>

        {flow.currentStep === 3 ? (
          <div className="w-32" />
        ) : flow.currentStep < STEPS.length ? (
          <button
            onClick={flow.handleNext}
            disabled={!flow.canProceed()}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-white transition-all hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontSize: "0.875rem", fontWeight: 600 }}
          >
            {flow.nextLabel}
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            disabled={flow.savingPlan}
            onClick={flow.savePlanAndNavigate}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-white transition-all hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ fontSize: "0.875rem", fontWeight: 600 }}
          >
            {flow.savingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {flow.savingPlan ? "Guardando..." : "Guardar y finalizar"}
          </button>
        )}
      </div>
    </div>
  );
}
