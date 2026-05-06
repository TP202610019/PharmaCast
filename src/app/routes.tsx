import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { Home } from "./pages/Home";
import { PredictionFlow } from "./pages/PredictionFlow";
import { History } from "./pages/History";
import { HistoryDetail } from "./pages/HistoryDetail";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-4">
      <p className="text-gray-900" style={{ fontSize: "4rem", fontWeight: 800 }}>404</p>
      <p className="text-gray-400">Página no encontrada</p>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "prediction", Component: PredictionFlow },
      { path: "history", Component: History },
      { path: "history/:id", Component: HistoryDetail },
      { path: "*", Component: NotFound },
    ],
  },
]);
