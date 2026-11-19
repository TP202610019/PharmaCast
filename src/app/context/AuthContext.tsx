import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { authService } from "../../services/auth.service";
import { setTokens, clearTokens, getAccessToken, getRefreshToken, STORAGE } from "../../lib/http";
import { invalidateDashboardCache } from "../../lib/dashboardCache";
import { isDemoEmail } from "../../lib/demoAccess";
import type { AuthResponse, ApiError } from "../../types/api";

export interface UserData {
  id: string;
  name: string;
  email: string;
  pharmacy: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  isDemo: boolean;
  user: UserData | null;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  register: (fullName: string, email: string, password: string, pharmacy?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<UserData>) => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isDemo: false,
  user: null,
  login: async () => {},
  loginDemo: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUser: () => {},
});

function loadStoredUser(): UserData | null {
  try {
    const stored = localStorage.getItem(STORAGE.USER);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return null;
}

function saveUser(user: UserData) {
  localStorage.setItem(STORAGE.USER, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return !!getAccessToken() && localStorage.getItem(STORAGE.AUTH) === "true";
  });

  const [user, setUser] = useState<UserData | null>(loadStoredUser);

  const completeLogin = useCallback((auth: AuthResponse) => {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith("prediction-draft:")) sessionStorage.removeItem(key);
    }
    invalidateDashboardCache();
    setTokens(auth.accessToken, auth.refreshToken, auth.expiresAt);

    const pharmacy = localStorage.getItem(STORAGE.PHARMACY) ?? "Mi Farmacia";
    const userData: UserData = {
      id: auth.user.id,
      name: auth.user.fullName,
      email: auth.user.email,
      pharmacy,
    };
    saveUser(userData);
    setUser(userData);
    setIsLoggedIn(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    completeLogin(await authService.login(email, password));
  }, [completeLogin]);

  const loginDemo = useCallback(async () => {
    completeLogin(await authService.loginDemo());
  }, [completeLogin]);

  const register = useCallback(async (
    fullName: string,
    email: string,
    password: string,
    pharmacy = "Mi Farmacia"
  ) => {
    const auth = await authService.register(fullName, email, password);
    invalidateDashboardCache();
    setTokens(auth.accessToken, auth.refreshToken, auth.expiresAt);
    localStorage.setItem(STORAGE.PHARMACY, pharmacy);

    const userData: UserData = {
      id: auth.user.id,
      name: auth.user.fullName,
      email: auth.user.email,
      pharmacy,
    };
    saveUser(userData);
    setUser(userData);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();
      if (accessToken && refreshToken) {
        await authService.logout(refreshToken, accessToken);
      }
    } catch {
      // silently fail - still clear local state
    } finally {
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith("prediction-draft:")) sessionStorage.removeItem(key);
      }
      invalidateDashboardCache();
      clearTokens();
      setUser(null);
      setIsLoggedIn(false);
    }
  }, []);

  const updateUser = useCallback((updates: Partial<UserData>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated: UserData = { ...prev, ...updates };
      saveUser(updated);
      if (updates.pharmacy) {
        localStorage.setItem(STORAGE.PHARMACY, updates.pharmacy);
      }
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, isDemo: isLoggedIn && isDemoEmail(user?.email), user, login, loginDemo, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function extractApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as ApiError;
  if (e?.errors) {
    const first = Object.values(e.errors)[0];
    if (first?.length) return first[0];
  }
  return e?.message || fallback;
}
