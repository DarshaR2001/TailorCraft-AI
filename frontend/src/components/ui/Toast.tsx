"use client";

import React, { useEffect, useState, useCallback } from "react";
import { CheckCircle, AlertCircle, Loader2, Info } from "lucide-react";
import type { ToastMessage, ToastType } from "@/types";

// ── Toast Manager (singleton event bus) ───────────────────────
let _addToast: ((msg: Omit<ToastMessage, "id">) => void) | null = null;
let _clearLoading: (() => void) | null = null;

export const toast = {
  success: (message: string) => {
    _clearLoading?.();
    _addToast?.({ type: "success", message });
  },
  error: (message: string) => {
    _clearLoading?.();
    _addToast?.({ type: "error", message });
  },
  loading: (message: string) => _addToast?.({ type: "loading", message }),
  info: (message: string) => _addToast?.({ type: "info", message }),
};

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} />,
  error: <AlertCircle size={16} />,
  loading: <Loader2 size={16} className="animate-spin" />,
  info: <Info size={16} />,
};

const DURATIONS: Record<ToastType, number> = {
  success: 4000,
  error: 6000,
  loading: 180000, // 3 min safety fallback
  info: 4000,
};

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

function ToastItem({ toast: t, onRemove }: ToastItemProps) {
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(t.id), 260);
  }, [t.id, onRemove]);

  useEffect(() => {
    const duration = DURATIONS[t.type];
    if (duration > 0) {
      const timer = setTimeout(dismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [t.type, dismiss]);

  return (
    <div
      className={`toast toast-${t.type} ${exiting ? "toast-exit" : ""}`}
      role="alert"
      onClick={dismiss}
      style={{ cursor: "pointer" }}
    >
      {ICONS[t.type]}
      <span>{t.message}</span>
    </div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    _addToast = (msg) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev.slice(-4), { ...msg, id }]); // max 5
    };
    _clearLoading = () => {
      setToasts((prev) => prev.filter((t) => t.type !== "loading"));
    };
    return () => {
      _addToast = null;
      _clearLoading = null;
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  );
}
