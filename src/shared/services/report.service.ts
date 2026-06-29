import http from "../lib/http";
import type {
  ApiResponse,
  GenerateReportRequest,
  ReportResponse,
  ReportType,
} from "../types/api";

export const reportService = {
  async generate(predictionExecutionId: string, reportType: ReportType): Promise<ReportResponse> {
    const body: GenerateReportRequest = { predictionExecutionId, reportType };
    const { data } = await http.post<ApiResponse<ReportResponse>>("/api/reports", body);
    return data.data!;
  },

  async getByExecution(executionId: string): Promise<ReportResponse[]> {
    const { data } = await http.get<ApiResponse<ReportResponse[]>>(
      `/api/reports/by-execution/${executionId}`
    );
    return data.data ?? [];
  },

  async download(id: string): Promise<Blob> {
    const { data } = await http.get(`/api/reports/${id}/download`, {
      responseType: "blob",
    });
    return data;
  },
};
