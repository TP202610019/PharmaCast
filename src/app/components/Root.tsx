import { useEffect, useState } from "react";
import { DEMO_ACCESS_EVENT, requestDemoAccess } from "../../lib/demoAccess";
import { DemoAccessModal } from "./DemoAccessModal";
import { Outlet, useLocation, Navigate } from "react-router";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { useAuth } from "../context/AuthContext";
import "../../styles/workspace.css";
export function Root() {
  const { pathname, search, hash } = useLocation();
  const { isLoggedIn, isDemo } = useAuth();
  const [showDemoAccess, setShowDemoAccess] = useState(false);
  useEffect(() => {
    const open = () => setShowDemoAccess(true);
    window.addEventListener(DEMO_ACCESS_EVENT, open);
    return () => window.removeEventListener(DEMO_ACCESS_EVENT, open);
  }, []);
  const workspace = /^\/(panel|predicciones|historial)(\/|$)/.test(pathname);
  if (pathname === "/" && isLoggedIn) return <Navigate to="/panel" replace />;
  if (workspace && !isLoggedIn) return <Navigate to="/acceso" replace state={{ returnTo: pathname + search + hash }} />;
  return <div className={`min-h-screen text-gray-900 flex flex-col ${workspace ? "workspace-root" : ""} ${pathname === "/predicciones/nueva" ? "prediction-root" : ""}`} style={{backgroundColor:pathname === "/" ? "#090d16" : workspace ? "#ffffff" : "#F5F5F7"}}>
    <Navbar />
    <main className={pathname === "/" ? "pc-landing-main flex-1" : "workspace-main flex flex-1 flex-col"} onClickCapture={event => {
      if (isDemo && event.target instanceof HTMLInputElement && event.target.type === "file") {
        event.preventDefault(); event.stopPropagation(); requestDemoAccess();
      }
    }} onDropCapture={event => {
      if (isDemo && event.dataTransfer.types.includes("Files")) {
        event.preventDefault(); event.stopPropagation(); requestDemoAccess();
      }
    }}><Outlet /></main>
    <Footer workspace={workspace} />
    <DemoAccessModal open={showDemoAccess} onClose={() => setShowDemoAccess(false)} />
  </div>;
}
