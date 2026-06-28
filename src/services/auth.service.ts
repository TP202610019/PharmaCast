import http from "../lib/http";
import type {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  UserProfileResponse,
} from "../types/api";

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const body: LoginRequest = { email, password };
    const { data } = await http.post<ApiResponse<AuthResponse>>("/api/auth/login", body);
    return data.data!;
  },

  async register(fullName: string, email: string, password: string): Promise<AuthResponse> {
    const body: RegisterRequest = { fullName, email, password };
    const { data } = await http.post<ApiResponse<AuthResponse>>("/api/auth/register", body);
    return data.data!;
  },

  async refreshToken(accessToken: string, refreshToken: string): Promise<AuthResponse> {
    const body: RefreshTokenRequest = { accessToken, refreshToken };
    const { data } = await http.post<ApiResponse<AuthResponse>>("/api/auth/refresh", body);
    return data.data!;
  },

  async logout(refreshToken: string, accessToken: string): Promise<void> {
    const body: RefreshTokenRequest = { accessToken, refreshToken };
    await http.post<ApiResponse<null>>("/api/auth/logout", body);
  },

  async getProfile(): Promise<UserProfileResponse> {
    const { data } = await http.get<ApiResponse<UserProfileResponse>>("/api/auth/me");
    return data.data!;
  },
};
