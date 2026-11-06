import { createBrowserRouter, redirect } from "react-router";
import { Root } from "./components/Root";
import { Home } from "./pages/Home";
import { Dashboard } from "./pages/Dashboard";
import { PredictionFlow } from "./pages/PredictionFlow";
import { History } from "./pages/History";
import { HistoryDetail } from "./pages/HistoryDetail";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Terms } from "./pages/Terms";

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-4">
      <p className="text-gray-900" style={{ fontSize: "4rem", fontWeight: 800 }}>404</p>
      <p className="text-gray-400">Página no encontrada</p>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: "/forgot-password", loader: () => redirect("/acceso/recuperar") },
  { path: "/register", loader: () => redirect("/registro") },
  { path: "/login", loader: () => redirect("/acceso") },
  { path: "/terms", loader: () => redirect("/terminos") },
  { path: "/dashboard", loader: () => redirect("/panel") },
  { path: "/prediction", loader: () => redirect("/predicciones/nueva") },
  { path: "/history", loader: () => redirect("/historial") },
  { path: "/history/:id", loader: ({ params }) => redirect(`/historial/${params.id}`) },
  {
    path: "/acceso",
    Component: Login,
  },
  {
    path: "/registro",
    Component: Register,
  },
  {
    path: "/acceso/recuperar",
    Component: ForgotPassword,
  },
  {
    path: "/terminos",
    Component: Terms,
  },
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "panel", Component: Dashboard },
      { path: "predicciones/nueva", Component: PredictionFlow },
      { path: "historial", Component: History },
      { path: "historial/:id", Component: HistoryDetail },
      { path: "*", Component: NotFound },
    ],
  },
]);

// Reset page navigation, while preserving intentional links to a section.
let lastScrollLocationKey = router.state.location.key;
router.subscribe((state) => {
  if (state.navigation.state !== "idle" || state.location.key === lastScrollLocationKey) return;
  lastScrollLocationKey = state.location.key;
  const { hash, state: navigationState } = state.location;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (hash === "#inicio") {
      window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    } else if (hash) {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    } else {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: navigationState?.smoothScrollToTop && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "smooth"
          : "instant",
      });
    }
  }));
});
