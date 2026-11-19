import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";

export function StartAccessButton({ children, className, onClick }: { children: ReactNode; className: string; onClick?: () => void }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={className} onClick={() => { onClick?.(); setOpen(true); }}>{children}</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="pc-dialog max-w-sm rounded-2xl border border-gray-200 bg-white p-7">
        <DialogTitle className="text-xl font-semibold text-gray-900">Comienza con PharmaCast</DialogTitle>
        <DialogDescription className="text-sm leading-6 text-gray-500">Crea una cuenta o inicia sesión para analizar las ventas de tu farmacia.</DialogDescription>
        <div className="mt-2 flex flex-col gap-3">
          <Link to="/registro" onClick={() => setOpen(false)} className="module-primary justify-center">Crear cuenta</Link>
          <Link to="/acceso" onClick={() => setOpen(false)} className="rounded-full border border-gray-300 px-5 py-3 text-center text-sm text-blue-500">Iniciar sesión</Link>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
