import { Link, useLocation } from "react-router";
import { Activity, LogIn, Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { label: "Inicio", path: "/" },
  { label: "Nueva predicción", path: "/prediction" },
  { label: "Historial", path: "/history" },
];

export function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 group-hover:bg-cyan-500/20 transition-colors">
              <Activity className="h-4 w-4 text-cyan-500" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-gray-900 tracking-tight" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                PharmaCast
              </span>
              <span className="text-gray-400" style={{ fontSize: "0.625rem", fontWeight: 400, letterSpacing: "0.08em" }}>
                PREDICTION SYSTEM
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                link.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                    isActive
                      ? "text-cyan-500 bg-cyan-500/10"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-cyan-500" />
                  )}
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Login Button */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 transition-all hover:border-cyan-500/40 hover:text-cyan-500 hover:bg-cyan-500/5"
            >
              <LogIn className="h-4 w-4" />
              Iniciar sesión
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-500 hover:text-gray-900 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-6 py-4 flex flex-col gap-1">
          {navLinks.map((link) => {
            const isActive =
              link.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm transition-all ${
                  isActive ? "text-cyan-500 bg-cyan-500/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-gray-200 mt-2">
            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-600"
            >
              <LogIn className="h-4 w-4" />
              Iniciar sesión
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}