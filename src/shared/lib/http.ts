import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiResponse, ApiError, RefreshTokenRequest } from "../types/api";

// ─── Storage keys ─────────────────────────────────────────────────────────────
export const STORAGE = {
  ACCESS_TOKEN: "pharmacast_access_token",
  REFRESH_TOKEN: "pharmacast_refresh_token",
  EXPIRES_AT: "pharmacast_expires_at",
  USER: "pharmacast_user",
  PHARMACY: "pharmacast_pharmacy",
  AUTH: "pharmacast_auth",
} as const;

// ─── Token helpers ────────────────────────────────────────────────────────────
export function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE.ACCESS_TOKEN);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(STORAGE.REFRESH_TOKEN);
}

export function setTokens(accessToken: string, refreshToken: string, expiresAt: string) {
  localStorage.setItem(STORAGE.ACCESS_TOKEN, accessToken);
  localStorage.setItem(STORAGE.REFRESH_TOKEN, refreshToken);
  localStorage.setItem(STORAGE.EXPIRES_AT, expiresAt);
  localStorage.setItem(STORAGE.AUTH, "true");
}

export function clearTokens() {
  localStorage.removeItem(STORAGE.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE.EXPIRES_AT);
  localStorage.removeItem(STORAGE.AUTH);
  localStorage.removeItem(STORAGE.USER);
}

// ─── Axios instance ───────────────────────────────────────────────────────────
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT ?? 30000),
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ─── Request interceptor: inject access token ─────────────────────────────────
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Token refresh state ──────────────────────────────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  refreshQueue = [];
}

// ─── Response interceptor: handle 401 and centralized error normalization ─────
http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = getRefreshToken();
      const accessToken = getAccessToken();

      if (!refreshToken || !accessToken) {
        clearTokens();
        window.location.href = "/login";
        return Promise.reject(buildApiError(error));
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return http(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const body: RefreshTokenRequest = { accessToken, refreshToken };
        const { data } = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string; expiresAt: string }>>(
          `${import.meta.env.VITE_API_BASE_URL}/api/auth/refresh`,
          body,
          { headers: { "Content-Type": "application/json" } }
        );

        if (!data.success || !data.data) {
          throw new Error("Refresh failed");
        }

        const { accessToken: newAccess, refreshToken: newRefresh, expiresAt } = data.data;
        setTokens(newAccess, newRefresh, expiresAt);
        processQueue(null, newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return http(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        window.location.href = "/login";
        return Promise.reject(buildApiError(error));
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 403) {
      window.location.href = "/dashboard";
    }

    return Promise.reject(buildApiError(error));
  }
);

function buildApiError(error: AxiosError<ApiResponse<unknown>>): ApiError {
  const response = error.response;
  if (response?.data) {
    const body = response.data;
    return {
      message: body.message ?? error.message,
      code: body.code ?? null,
      errors: body.errors ?? null,
      status: response.status,
    };
  }
  return {
    message: error.message || "Error de red. Verifica tu conexión.",
    code: null,
    errors: null,
    status: response?.status ?? 0,
  };
}

export default http;
