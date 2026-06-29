import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/shared/context/AuthContext";

export function AuthGuard() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}
