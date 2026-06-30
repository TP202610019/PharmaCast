import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { authService } from "@/shared/services/auth.service";
import { setTokens, clearTokens, getAccessToken, getRefreshToken, STORAGE } from "@/shared/lib/http";
import { invalidateDashboardCache } from "@/shared/lib/dashboardCache";
import type { ApiError } from "@/shared/types/api";

export interface UserData {
  id: string;
  name: string;
  email: string;
  pharmacy: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: UserData | null;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: () => void;
  register: (fullName: string, email: string, password: string, pharmacy?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<UserData>) => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  login: async () => {},
  loginDemo: () => {},
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

  const login = useCallback(async (email: string, password: string) => {
    const auth = await authService.login(email, password);
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

  const loginDemo = useCallback(() => {
    const demoUser: UserData = {
      id: "demo",
      name: "Dr. Demo",
      email: "demo@pharmacast.com",
      pharmacy: "Farmacia PharmaCast",
    };
    localStorage.setItem(STORAGE.AUTH, "true");
    saveUser(demoUser);
    setUser(demoUser);
    setIsLoggedIn(true);
  }, []);

  const register = useCallback(async (
    fullName: string,
    email: string,
    password: string,
    pharmacy = "Mi Farmacia"
  ) => {
    const auth = await authService.register(fullName, email, password);
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
    <AuthContext.Provider value={{ isLoggedIn, user, login, loginDemo, register, logout, updateUser }}>
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
