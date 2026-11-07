import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

export function WorkspaceLoading({ label }: { label: string }) {
  return createPortal(
    <div role="status" aria-live="polite" className="workspace-loading">
      <Loader2 aria-hidden="true" className="h-7 w-7 text-blue-500 motion-safe:animate-spin" />
      <span>{label}</span>
    </div>,
    document.body,
  );
}
