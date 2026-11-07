import { withCache, invalidateAnalysisLists, seedCache } from "../lib/dashboardCache";
import http from "../lib/http";
import type {
  ApiResponse,
  CreatePredictionRequest,
  PredictionResponse,
  PredictionSummaryResponse,
} from "../types/api";

export const predictionService = {
  async execute(datasetId: string, forecastPeriod: number, mappingConfigurationId?: string): Promise<PredictionResponse> {
    const body: CreatePredictionRequest = { datasetId, forecastPeriod, mappingConfigurationId };
    const { data } = await http.post<ApiResponse<PredictionResponse>>("/api/predictions", body, { timeout: 300_000 });
    invalidateAnalysisLists();
    seedCache(`prediction:${data.data!.id}`, data.data!);
    return data.data!;
  },

  async getById(id: string): Promise<PredictionResponse> {
    return withCache(`prediction:${id}`, async () => {
      const { data } = await http.get<ApiResponse<PredictionResponse>>(`/api/predictions/${id}`);
      return data.data!;
    }, 10 * 60_000);
  },

  async getHistory(): Promise<PredictionSummaryResponse[]> {
    return withCache("history", async () => {
      const { data } = await http.get<ApiResponse<PredictionSummaryResponse[]>>("/api/predictions/history");
      return data.data ?? [];
    });
  },
};
