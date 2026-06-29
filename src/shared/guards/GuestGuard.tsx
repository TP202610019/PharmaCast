import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/shared/context/AuthContext";

export function GuestGuard() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
