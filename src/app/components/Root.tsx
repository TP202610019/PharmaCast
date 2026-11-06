import { Outlet, useLocation, Navigate } from "react-router";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { useAuth } from "../context/AuthContext";
import "../../styles/workspace.css";
export function Root() {
  const { pathname } = useLocation();
  const { isLoggedIn } = useAuth();
  const workspace = /^\/(panel|predicciones|historial)(\/|$)/.test(pathname);
  if (pathname === "/" && isLoggedIn) return <Navigate to="/panel" replace />;
  if (workspace && !isLoggedIn) return <Navigate to="/acceso" replace />;
  return <div className={`min-h-screen text-gray-900 flex flex-col ${workspace ? "workspace-root" : ""} ${pathname === "/predicciones/nueva" ? "prediction-root" : ""}`} style={{backgroundColor:pathname === "/" ? "#090d16" : workspace ? "#ffffff" : "#F5F5F7"}}>
    <Navbar />
    <main className={pathname === "/" ? "pc-landing-main flex-1" : "workspace-main flex-1"}><Outlet /></main>
    <Footer workspace={workspace} />
  </div>;
}
