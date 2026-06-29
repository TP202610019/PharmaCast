import { Outlet } from "react-router";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function Root() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <Navbar />
      <main className="pt-16 flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
