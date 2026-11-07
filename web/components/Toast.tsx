"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast: t, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = { success: CheckCircle, error: XCircle, warning: AlertTriangle, info: Info };
  const colors = {
    success: { border: "#16a34a", iconColor: "#16a34a" },
    error:   { border: "#ef4444", iconColor: "#ef4444" },
    warning: { border: "#f59e0b", iconColor: "#d97706" },
    info:    { border: "#16a34a", iconColor: "#16a34a" },
  };
  const Icon  = icons[t.type];
  const color = colors[t.type];

  return (
    <div
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl animate-toast-in min-w-[280px] max-w-sm"
      style={{
        background: "var(--bg-card)",
        border: `1px solid var(--border)`,
        borderLeft: `3px solid ${color.border}`,
        color: "var(--text-main)",
      }}
    >
      <Icon className="w-4 h-4 shrink-0" style={{ color: color.iconColor }} />
      <span className="text-sm flex-1">{t.message}</span>
      <button onClick={onClose} className="shrink-0 hover:opacity-60" style={{ color: "var(--text-muted)" }}>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx.toast;
}
