import { Link, useLocation, useNavigate } from "react-router";
import { Activity, LogIn, LogOut, Menu, X, AlertTriangle, Settings, ChevronDown, Building2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { SettingsModal } from "./SettingsModal";

const authLinks = [
  { label: "Mi Panel", path: "/dashboard" },
  { label: "Nueva predicción", path: "/prediction" },
  { label: "Historial", path: "/history" },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userInitial = (user?.name ?? "U")[0].toUpperCase();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutModal(false);
    navigate("/login");
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to={isLoggedIn ? "/dashboard" : "/login"} className="flex items-center gap-2.5 group">
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

            {/* Desktop Nav — solo visible si está logueado */}
            {isLoggedIn && (
              <div className="hidden md:flex items-center gap-1">
                {authLinks.map((link) => {
                  const isActive = location.pathname.startsWith(link.path);
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`relative px-4 py-2 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "text-cyan-500 bg-cyan-500/10"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                      style={{ fontSize: "0.875rem" }}
                    >
                      {isActive && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-cyan-500" />
                      )}
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Right side */}
            <div className="hidden md:flex items-center gap-3">
              {isLoggedIn ? (
                /* User avatar with dropdown */
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown((v) => !v)}
                    className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 transition-all hover:border-gray-300 hover:bg-gray-50"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500 shrink-0">
                      <span className="text-white" style={{ fontSize: "0.8125rem", fontWeight: 700 }}>
                        {userInitial}
                      </span>
                    </div>
                    <span className="text-gray-700 max-w-24 truncate" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                      {user?.name}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {showDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden z-50"
                      >
                        {/* User info header */}
                        <div className="px-4 py-3.5 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500 shrink-0">
                              <span className="text-white" style={{ fontSize: "1rem", fontWeight: 700 }}>
                                {userInitial}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-gray-900 truncate" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                                {user?.name}
                              </p>
                              <p className="text-gray-400 truncate" style={{ fontSize: "0.75rem" }}>
                                {user?.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mt-2.5">
                            <Building2 className="h-3 w-3 text-gray-400 shrink-0" />
                            <p className="text-gray-500 truncate" style={{ fontSize: "0.75rem" }}>
                              {user?.pharmacy}
                            </p>
                          </div>
                        </div>

                        {/* Menu items */}
                        <div className="p-1.5">
                          <button
                            onClick={() => { setShowDropdown(false); setShowSettings(true); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors text-left"
                            style={{ fontSize: "0.875rem" }}
                          >
                            <Settings className="h-4 w-4 text-gray-400" />
                            Mi cuenta
                          </button>
                          <button
                            onClick={() => { setShowDropdown(false); setShowLogoutModal(true); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors text-left"
                            style={{ fontSize: "0.875rem" }}
                          >
                            <LogOut className="h-4 w-4" />
                            Cerrar sesión
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-gray-600 transition-all hover:border-cyan-500/40 hover:text-cyan-500 hover:bg-cyan-500/5"
                  style={{ fontSize: "0.875rem" }}
                >
                  <LogIn className="h-4 w-4" />
                  Iniciar sesión
                </Link>
              )}
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
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-gray-200 bg-white px-6 py-4 flex flex-col gap-1 overflow-hidden"
            >
              {isLoggedIn && (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500 shrink-0">
                      <span className="text-white" style={{ fontSize: "1rem", fontWeight: 700 }}>{userInitial}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-900 truncate" style={{ fontSize: "0.875rem", fontWeight: 600 }}>{user?.name}</p>
                      <p className="text-gray-400 truncate" style={{ fontSize: "0.75rem" }}>{user?.pharmacy}</p>
                    </div>
                  </div>

                  {authLinks.map((link) => {
                    const isActive = location.pathname.startsWith(link.path);
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setMobileOpen(false)}
                        className={`px-4 py-3 rounded-lg transition-all ${
                          isActive ? "text-cyan-500 bg-cyan-500/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                        style={{ fontSize: "0.875rem" }}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </>
              )}

              <div className="pt-2 border-t border-gray-200 mt-2 space-y-1.5">
                {isLoggedIn ? (
                  <>
                    <button
                      onClick={() => { setMobileOpen(false); setShowSettings(true); }}
                      className="w-full flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition-all"
                      style={{ fontSize: "0.875rem" }}
                    >
                      <Settings className="h-4 w-4" />
                      Mi cuenta
                    </button>
                    <button
                      onClick={() => { setMobileOpen(false); setShowLogoutModal(true); }}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-red-500 transition-all"
                      style={{ fontSize: "0.875rem" }}
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-gray-600"
                    style={{ fontSize: "0.875rem" }}
                  >
                    <LogIn className="h-4 w-4" />
                    Iniciar sesión
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Settings Modal */}
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <>
            <motion.div
              key="logout-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm"
              onClick={() => setShowLogoutModal(false)}
            />
            <motion.div
              key="logout-modal"
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-sm w-full pointer-events-auto text-center relative">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 border border-red-100 mx-auto mb-5">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                </div>
                <h2 className="text-gray-900 mb-2" style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                  ¿Cerrar sesión?
                </h2>
                <p className="text-gray-500 mb-7" style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
                  Se cerrará tu sesión activa y serás redirigido al inicio de sesión.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleLogoutConfirm}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-white transition-all hover:bg-red-400 hover:shadow-lg hover:shadow-red-500/20 active:scale-[0.98]"
                    style={{ fontWeight: 600, fontSize: "0.9375rem" }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sí, cerrar sesión
                  </button>
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-gray-600 transition-all hover:border-gray-400 hover:text-gray-900"
                    style={{ fontSize: "0.9375rem" }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}