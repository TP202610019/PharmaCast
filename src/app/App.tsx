import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "@/shared/context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
