import { createContext, useContext, useState, ReactNode } from "react";

export interface UserData {
  name: string;
  email: string;
  pharmacy: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: UserData | null;
  login: (userData?: Partial<UserData>) => void;
  logout: () => void;
  updateUser: (updates: Partial<UserData>) => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
});

const DEMO_USER: UserData = {
  name: "Dr. Demo",
  email: "demo@pharmacast.com",
  pharmacy: "Farmacia PharmaCast",
};

const STORAGE_KEY = "pharmacast_auth";
const USER_KEY = "pharmacast_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  const [user, setUser] = useState<UserData | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const login = (userData?: Partial<UserData>) => {
    const newUser: UserData = { ...DEMO_USER, ...userData };
    localStorage.setItem(STORAGE_KEY, "true");
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setIsLoggedIn(true);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    setIsLoggedIn(false);
    setUser(null);
  };

  const updateUser = (updates: Partial<UserData>) => {
    if (user) {
      const updated: UserData = { ...user, ...updates };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      setUser(updated);
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
