import http from "../lib/http";
import { withCache } from "../lib/dashboardCache";
import type {
  ApiResponse,
  DashboardMetricsResponse,
  DashboardSummaryResponse,
  DashboardProductRow,
  DashboardChartResponse,
  PagedResult,
} from "../types/api";

const CHART_STALE_MS = 10 * 60 * 1000;

export const dashboardService = {
  async getMetrics(): Promise<DashboardMetricsResponse> {
    return withCache("metrics", async () => {
      const { data } = await http.get<ApiResponse<DashboardMetricsResponse>>("/api/dashboard/metrics");
      return data.data!;
    });
  },

  async getSummary(): Promise<DashboardSummaryResponse> {
    return withCache("summary", async () => {
      const { data } = await http.get<ApiResponse<DashboardSummaryResponse>>("/api/dashboard/summary");
      return data.data!;
    });
  },

  async getProducts(
    predictionId: string,
    page: number,
    pageSize: number,
    search?: string
  ): Promise<PagedResult<DashboardProductRow>> {
    const key = `products:${predictionId}:${page}:${pageSize}:${search ?? ""}`;
    return withCache(key, async () => {
      const params = new URLSearchParams({
        predictionId,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search) params.append("search", search);
      const { data } = await http.get<ApiResponse<PagedResult<DashboardProductRow>>>(
        `/api/dashboard/products?${params}`
      );
      return data.data!;
    });
  },

  async getPredictionSummary(predictionId: string): Promise<DashboardSummaryResponse> {
    const key = `prediction-summary:${predictionId}`;
    return withCache(key, async () => {
      const params = new URLSearchParams({ predictionId });
      const { data } = await http.get<ApiResponse<DashboardSummaryResponse>>(
        `/api/dashboard/prediction-summary?${params}`
      );
      return data.data!;
    });
  },

  async getChart(predictionId: string, product: string): Promise<DashboardChartResponse> {
    const key = `chart:${predictionId}:${product}`;
    return withCache(
      key,
      async () => {
        const params = new URLSearchParams({ predictionId, product });
        const { data } = await http.get<ApiResponse<DashboardChartResponse>>(
          `/api/dashboard/chart?${params}`
        );
        return data.data!;
      },
      CHART_STALE_MS
    );
  },
};
