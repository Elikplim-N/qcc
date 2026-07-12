"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

const COLORS: Record<ToastType, string> = {
  success: "border-emerald-800/30 text-emerald-300",
  error: "border-red-800/30 text-red-300",
  info: "border-zinc-700/30 text-zinc-300",
};

const ICON_BG: Record<ToastType, string> = {
  success: "bg-emerald-900/50 text-emerald-400",
  error: "bg-red-900/50 text-red-400",
  info: "bg-zinc-800 text-zinc-400",
};

export function Toast({
  message,
  type = "info",
  duration = 4000,
  onClose,
}: {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border bg-zinc-950/95 px-4 py-3 shadow-2xl transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } ${COLORS[type]}`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${ICON_BG[type]}`}
      >
        {ICONS[type]}
      </span>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
