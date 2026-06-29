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
    const { data } = await http.post<ApiResponse<PredictionResponse>>("/api/predictions", body, { timeout: 180_000 });
    return data.data!;
  },

  async getById(id: string): Promise<PredictionResponse> {
    const { data } = await http.get<ApiResponse<PredictionResponse>>(`/api/predictions/${id}`);
    return data.data!;
  },

  async getHistory(): Promise<PredictionSummaryResponse[]> {
    const { data } = await http.get<ApiResponse<PredictionSummaryResponse[]>>("/api/predictions/history");
    return data.data ?? [];
  },
};
