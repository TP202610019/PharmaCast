import http from "../lib/http";
import type {
  ApiResponse,
  CreatePredictionRequest,
  PredictionResponse,
  PredictionSummaryResponse,
  PredictionPeriodResponse,
} from "../types/api";

export const predictionService = {
  async getPeriods(): Promise<PredictionPeriodResponse[]> {
    const { data } = await http.get<PredictionPeriodResponse[] | ApiResponse<PredictionPeriodResponse[]>>("/api/predictions/periods");
    return Array.isArray(data) ? data : data.data ?? [];
  },
  async execute(datasetId: string, forecastPeriod: number, mappingConfigurationId?: string): Promise<PredictionResponse> {
    const body: CreatePredictionRequest = { datasetId, forecastPeriod, mappingConfigurationId };
    // Allow a few seconds for backend timeout handling and the final response.
    const { data } = await http.post<ApiResponse<PredictionResponse>>("/api/predictions", body, { timeout: 125_000 });
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
