import { motion, AnimatePresence } from "motion/react";
import { LogIn, X, Lock } from "lucide-react";
import { useNavigate } from "react-router";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function LoginRequiredModal({ open, onClose }: Props) {
  const navigate = useNavigate();

  const handleLogin = () => {
    onClose();
    navigate("/login");
  };

  const handleRegister = () => {
    onClose();
    navigate("/register");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-sm w-full pointer-events-auto text-center relative">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Icon */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mx-auto mb-5">
                <Lock className="h-8 w-8 text-cyan-500" />
              </div>

              {/* Text */}
              <h2 className="text-gray-900 mb-2" style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                Inicia sesión para continuar
              </h2>
              <p className="text-gray-500 mb-7" style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
                Para acceder a esta funcionalidad necesitas una cuenta de PharmaCast.
              </p>

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleLogin}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-white transition-all hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-[0.98]"
                  style={{ fontWeight: 600, fontSize: "0.9375rem" }}
                >
                  <LogIn className="h-4 w-4" />
                  Iniciar sesión
                </button>
                <button
                  onClick={handleRegister}
                  className="w-full rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-gray-600 transition-all hover:border-gray-400 hover:text-gray-900"
                  style={{ fontSize: "0.9375rem" }}
                >
                  Crear cuenta gratis
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors mt-1"
                  style={{ fontSize: "0.875rem" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
