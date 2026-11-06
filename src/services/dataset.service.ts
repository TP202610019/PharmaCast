import http from "../lib/http";
import type { ApiResponse, DatasetResponse } from "../types/api";

export const datasetService = {
  async upload(file: File, mappingConfigId?: string): Promise<DatasetResponse> {
    const form = new FormData();
    form.append("file", file);

    const params = mappingConfigId ? { mappingConfigId } : undefined;

    const { data } = await http.post<ApiResponse<DatasetResponse>>(
      "/api/datasets/upload",
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
        params,
      }
    );
    return data.data!;
  },

  async getAll(): Promise<DatasetResponse[]> {
    const { data } = await http.get<ApiResponse<DatasetResponse[]>>("/api/datasets");
    return data.data ?? [];
  },

  async getById(id: string): Promise<DatasetResponse> {
    const { data } = await http.get<ApiResponse<DatasetResponse>>(`/api/datasets/${id}`);
    return data.data!;
  },

  async validate(id: string): Promise<DatasetResponse> {
    const { data } = await http.post<ApiResponse<DatasetResponse>>(`/api/datasets/${id}/validate`);
    return data.data!;
  },

  async delete(id: string): Promise<void> {
    await http.delete(`/api/datasets/${id}`);
  },

  async getHeaders(id: string): Promise<string[]> {
    const { data } = await http.get<ApiResponse<string[]>>(`/api/datasets/${id}/headers`);
    return data.data ?? [];
  },

  async parseHeaders(file: File): Promise<string[]> {
    const form = new FormData();
    form.append("file", file);
    const { data } = await http.post<ApiResponse<string[]>>(
      "/api/datasets/parse-headers",
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data.data ?? [];
  },
};
