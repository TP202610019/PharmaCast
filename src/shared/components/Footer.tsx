import { Link } from "react-router";
import { Activity } from "lucide-react";

export function Footer() {
  const year = 2026;

  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/10">
              <Activity className="h-3.5 w-3.5 text-cyan-500" />
            </div>
            <span className="text-gray-500" style={{ fontSize: "0.8125rem" }}>
              <span style={{ fontWeight: 600, color: "#111827" }}>PharmaCast</span>
              {" "}© {year}
            </span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-1">
            {[
              { label: "Términos y Condiciones", to: "/terms" },
              { label: "Privacidad", to: "/terms" },
              { label: "Soporte", to: "/terms" },
            ].map((link, i, arr) => (
              <span key={link.label} className="flex items-center gap-1">
                <Link
                  to={link.to}
                  className="text-gray-400 hover:text-cyan-500 transition-colors"
                  style={{ fontSize: "0.8125rem" }}
                >
                  {link.label}
                </Link>
                {i < arr.length - 1 && (
                  <span className="text-gray-200 select-none" style={{ fontSize: "0.75rem" }}>·</span>
                )}
              </span>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
