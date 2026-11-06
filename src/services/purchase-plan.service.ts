import http from "../lib/http";
import type {
  ApiResponse,
  GeneratePurchasePlanRequest,
  PurchasePlanResponse,
  PlanEvaluationResponse,
} from "../types/api";

export const purchasePlanService = {
  async generate(
    predictionExecutionId: string,
    planName?: string,
    inventoryDatasetId?: string,
    inventoryFieldMappings?: Record<string, string>,
  ): Promise<PurchasePlanResponse> {
    const body: GeneratePurchasePlanRequest = {
      predictionExecutionId,
      planName,
      inventoryDatasetId,
      inventoryFieldMappings,
    };
    const { data } = await http.post<ApiResponse<PurchasePlanResponse>>("/api/purchase-plans", body);
    return data.data!;
  },

  async getById(id: string): Promise<PurchasePlanResponse> {
    const { data } = await http.get<ApiResponse<PurchasePlanResponse>>(`/api/purchase-plans/${id}`);
    return data.data!;
  },

  async getByExecution(executionId: string): Promise<PurchasePlanResponse> {
    const { data } = await http.get<ApiResponse<PurchasePlanResponse>>(
      `/api/purchase-plans/by-execution/${executionId}`
    );
    return data.data!;
  },

  async evaluate(
    planId: string,
    actualSalesFile: File,
    productCol: string,
    quantityCol: string,
    priceCol?: string,
    pharmacyPlanFile?: File,
    pharmacyProductCol?: string,
    pharmacyQuantityCol?: string,
  ): Promise<PlanEvaluationResponse> {
    const form = new FormData();
    form.append('actualSalesFile', actualSalesFile);
    form.append('productCol', productCol);
    form.append('quantityCol', quantityCol);
    if (priceCol) form.append('priceCol', priceCol);
    if (pharmacyPlanFile) form.append('pharmacyPlanFile', pharmacyPlanFile);
    if (pharmacyProductCol) form.append('pharmacyProductCol', pharmacyProductCol);
    if (pharmacyQuantityCol) form.append('pharmacyQuantityCol', pharmacyQuantityCol);
    const { data } = await http.post<ApiResponse<PlanEvaluationResponse>>(
      `/api/purchase-plans/${planId}/evaluate`, form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data.data!;
  },

  async getLatestEvaluation(planId: string): Promise<PlanEvaluationResponse | null> {
    try {
      const { data } = await http.get<ApiResponse<PlanEvaluationResponse>>(
        `/api/purchase-plans/${planId}/evaluation/latest`
      );
      return data.data ?? null;
    } catch {
      return null; // 404 = no evaluation saved yet
    }
  },
};
