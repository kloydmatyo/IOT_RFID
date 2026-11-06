"use client";

import { X } from "lucide-react";

interface Props {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}

export default function ConfirmModal({
  title, message, onConfirm, onCancel,
  confirmLabel = "Confirm", danger = true,
}: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)" }}>
      <div className="rounded-xl w-full max-w-sm animate-slide-in shadow-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-semibold text-sm">{title}</h3>
          <button onClick={onCancel} className="text-[#8892b0] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 text-sm" style={{ color: "#8892b0" }}>{message}</div>
        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm transition-colors" style={{ border: "1px solid var(--border)", color: "#e2e8f0" }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: danger ? "#ef4444" : "var(--primary)" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
