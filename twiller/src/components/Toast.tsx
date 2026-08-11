"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastContextType {
  toast: (title: string, kind?: ToastKind, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (title: string, kind: ToastKind = "info", description?: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, kind, title, description }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  const icons: Record<ToastKind, React.ReactNode> = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-[60] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "flex items-start gap-3 rounded-xl border bg-popover text-popover-foreground shadow-lg px-4 py-3 animate-fade-up",
              t.kind === "success" && "border-emerald-500/40",
              t.kind === "error" && "border-red-500/40",
              t.kind === "info" && "border-blue-500/40"
            )}
          >
            <span className="mt-0.5 shrink-0">{icons[t.kind]}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-snug">{t.title}</p>
              {t.description && (
                <p className="text-muted-foreground text-sm mt-0.5">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
