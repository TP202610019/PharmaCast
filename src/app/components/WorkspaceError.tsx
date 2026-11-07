import { createPortal } from "react-dom";
import { AlertCircle, RefreshCw } from "lucide-react";

export function WorkspaceError({ title, message, onRetry, onBack }: {
  title: string;
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
}) {
  return createPortal(
    <div className="workspace-loading">
      <div role="alert" className="flex w-full max-w-md flex-col items-center gap-4 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-100 bg-red-50">
          <AlertCircle className="h-7 w-7 text-red-400" />
        </div>
        <div>
          <h2 className="mb-1 text-base font-semibold text-gray-900">{title}</h2>
          <p className="text-sm leading-6 text-gray-500">{message}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {onRetry && <button onClick={onRetry} className="module-primary"><RefreshCw size={16} />Reintentar</button>}
          {onBack && <button onClick={onBack} className="module-secondary">Volver al historial</button>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
