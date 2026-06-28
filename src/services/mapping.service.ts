import http from "../lib/http";
import type {
  ApiResponse,
  CreateMappingRequest,
  MappingConfigResponse,
  MappingFieldResponse,
} from "../types/api";

export const mappingService = {
  async create(request: CreateMappingRequest): Promise<MappingConfigResponse> {
    const { data } = await http.post<ApiResponse<MappingConfigResponse>>("/api/mappings", request);
    return data.data!;
  },

  async getAll(): Promise<MappingConfigResponse[]> {
    const { data } = await http.get<ApiResponse<MappingConfigResponse[]>>("/api/mappings");
    return data.data ?? [];
  },

  async getById(id: string): Promise<MappingConfigResponse> {
    const { data } = await http.get<ApiResponse<MappingConfigResponse>>(`/api/mappings/${id}`);
    return data.data!;
  },

  async update(id: string, request: CreateMappingRequest): Promise<MappingConfigResponse> {
    const { data } = await http.put<ApiResponse<MappingConfigResponse>>(`/api/mappings/${id}`, request);
    return data.data!;
  },

  async delete(id: string): Promise<void> {
    await http.delete(`/api/mappings/${id}`);
  },

  async setDefault(id: string): Promise<void> {
    await http.post(`/api/mappings/${id}/set-default`);
  },
};

export const mappingFieldService = {
  async getAll(): Promise<MappingFieldResponse[]> {
    const { data } = await http.get<ApiResponse<MappingFieldResponse[]>>("/api/mapping-fields");
    return data.data ?? [];
  },
};
