import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";

export function DemoAccessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const continueTo = async (path: string) => {
    if (leaving) return;
    setLeaving(true);
    try {
      await logout();
      onClose();
      navigate(path);
    } finally { setLeaving(false); }
  };
  return <Dialog open={open} onOpenChange={value => { if (!value && !leaving) onClose(); }}>
    <DialogContent className="pc-dialog max-w-sm rounded-2xl border border-gray-200 bg-white p-7">
      <DialogTitle className="text-xl font-semibold text-gray-900">Crea una cuenta para hacer tu análisis</DialogTitle>
      <DialogDescription className="text-sm leading-6 text-gray-500">Regístrate o inicia sesión para analizar las ventas de tu farmacia. Puedes seguir consultando los resultados de ejemplo.</DialogDescription>
      <div className="mt-2 flex flex-col gap-3">
        <button className="module-primary justify-center" disabled={leaving} onClick={() => void continueTo("/registro")}>Crear cuenta</button>
        <button className="rounded-full border border-gray-300 px-5 py-3 text-sm text-blue-500" disabled={leaving} onClick={() => void continueTo("/acceso")}>Iniciar sesión</button>
      </div>
    </DialogContent>
  </Dialog>;
}
