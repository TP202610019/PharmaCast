import { Link, useLocation, useNavigate } from "react-router";
import { Activity, LogIn, LogOut, Menu, X, AlertTriangle, Settings, ChevronDown, Building2, ArrowUpRight, ArrowLeft } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { SettingsModal } from "./SettingsModal";
import "../../styles/chrome.css";
import { PharmaCastLogo } from "./PharmaCastLogo";

const publicLinks = [
  { label: "Producto", path: "/#producto" },
  { label: "Cómo funciona", path: "/#recorrido" },
  { label: "Preguntas frecuentes", path: "/#preguntas" },
];

const authLinks = [
  { label: "Mi Panel", path: "/panel" },
  { label: "Nueva predicción", path: "/predicciones/nueva" },
  { label: "Historial", path: "/historial" },
];

export function Navbar({ backLink, plain = false }: { backLink?: { to: string; label: string }; plain?: boolean } = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const workspace = /^\/(panel|predicciones|historial)(\/|$)/.test(location.pathname);
  const { isLoggedIn, user, logout } = useAuth();
  const showAccountNav = isLoggedIn && workspace;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(() => window.scrollY > 24);
  const solid = scrolled || location.pathname === "/terminos";
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMobileOpen(false); setShowDropdown(false); }, [location.pathname, location.hash]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setMobileOpen(false); setShowDropdown(false); } };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);

  const handleSectionNav = (event: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    setMobileOpen(false);
    if (location.pathname + location.hash !== path) return;
    event.preventDefault();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (path === "/#inicio") {
      window.scrollTo({ top: 0, behavior: reducedMotion ? "instant" : "smooth" });
    } else {
      document.getElementById(path.slice(2))?.scrollIntoView({
        behavior: reducedMotion ? "instant" : "smooth",
        block: "start",
      });
    }
  };

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

  const handleLogoutConfirm = async () => {
    setShowLogoutModal(false);
    await logout();
    navigate("/acceso");
  };

  if (backLink) return <nav aria-label="Navegación principal" className={`pc-navbar pc-nav-dark pc-legal-nav z-50 ${solid ? "is-scrolled" : ""} ${plain ? "pc-auth-plain" : ""}`}><div className="pc-nav-inner"><div className="pc-nav-row"><Link to="/#inicio" onClick={event => handleSectionNav(event, "/#inicio")} className="pc-brand" aria-label="PharmaCast, inicio"><PharmaCastLogo /></Link><Link to={backLink.to} className="pc-legal-back"><ArrowLeft size={15}/>{backLink.label}</Link></div></div></nav>;

  return (
    <>
      <nav aria-label="Navegación principal" className={`pc-navbar z-50 ${solid ? "is-scrolled" : ""} ${workspace ? "pc-nav-workspace" : ""} ${workspace || ["/", "/terminos"].includes(location.pathname) ? "pc-nav-dark" : ""}`}>
        <div className="pc-nav-inner">
          <div className="pc-nav-row">
            <Link to={showAccountNav ? "/panel" : "/#inicio"} onClick={showAccountNav ? undefined : event => handleSectionNav(event, "/#inicio")} className="pc-brand" aria-label="PharmaCast, inicio">
              <PharmaCastLogo />
            </Link>

            {/* Desktop Nav — solo visible si está logueado */}
            {showAccountNav && (
              <div className="pc-workspace-links hidden md:flex items-center gap-1">
                {authLinks.map((link) => {
                  const isActive = location.pathname.startsWith(link.path);
                  return (
                    <Link
                      key={link.path}
                      aria-current={isActive ? "page" : undefined}
                      to={link.path}
                      className={`relative px-4 py-2 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "text-blue-500 bg-blue-500/10"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                      style={{ fontSize: "0.875rem" }}
                    >
                      {isActive && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-blue-500" />
                      )}
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {!showAccountNav && <div className="pc-public-links">{publicLinks.map(link => <Link key={link.path} to={link.path} onClick={event => handleSectionNav(event, link.path)} className={location.hash === link.path.slice(1) ? "is-active" : ""}>{link.label}</Link>)}</div>}
            {/* Right side */}
            <div className="hidden md:flex items-center gap-3">
              {showAccountNav ? (
                /* User avatar with dropdown */
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown((v) => !v)}
                    className="pc-user-trigger flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 transition-all hover:border-gray-300 hover:bg-gray-50"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500 shrink-0">
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
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 shrink-0">
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
                            Configuración
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
                <div className="pc-nav-actions"><Link to="/acceso" className="pc-signin">Iniciar sesión</Link><Link to="/registro" className="pc-start">Comenzar <ArrowUpRight size={15}/></Link></div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="pc-menu-button"
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileOpen}
              aria-controls="pc-mobile-menu"
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
              id="pc-mobile-menu"
              className="pc-mobile-menu"
            >
              {!showAccountNav && <div className="pc-mobile-links">{publicLinks.map(link => <Link key={link.path} to={link.path} onClick={event => handleSectionNav(event, link.path)}>{link.label}<ArrowUpRight size={16}/></Link>)}</div>}
              {showAccountNav && (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 shrink-0">
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
                        aria-current={isActive ? "page" : undefined}
                        to={link.path}
                        onClick={() => setMobileOpen(false)}
                        className={`px-4 py-3 rounded-lg transition-all ${
                          isActive ? "text-blue-500 bg-blue-500/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
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
                {showAccountNav ? (
                  <>
                    <button
                      onClick={() => { setMobileOpen(false); setShowSettings(true); }}
                      className="w-full flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition-all"
                      style={{ fontSize: "0.875rem" }}
                    >
                      <Settings className="h-4 w-4" />
                      Configuración
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
                  <div className="pc-mobile-actions"><Link to="/acceso" className="pc-signin" onClick={() => setMobileOpen(false)}>Iniciar sesión</Link><Link to="/registro" className="pc-start" onClick={() => setMobileOpen(false)}>Comenzar <ArrowUpRight size={16}/></Link></div>
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
              className="fixed inset-0 z-50 bg-black/25 "
              onClick={() => setShowLogoutModal(false)}
            />
            <motion.div
              key="logout-modal"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div role="dialog" aria-modal="true" className="pc-dialog bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-sm w-full pointer-events-auto text-center relative">
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
