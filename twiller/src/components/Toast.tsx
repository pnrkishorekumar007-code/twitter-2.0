"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "@/lib/motion";
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

const DURATION = 4200;

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
      window.setTimeout(() => dismiss(id), DURATION);
    },
    [dismiss]
  );

  const icons: Record<ToastKind, React.ReactNode> = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-brand" />,
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-[70] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              role="status"
              className={cn(
                "relative overflow-hidden pointer-events-auto flex items-start gap-3 rounded-xl border bg-popover text-popover-foreground px-4 py-3",
                t.kind === "success" && "border-emerald-500/40",
                t.kind === "error" && "border-red-500/40",
                t.kind === "info" && "border-brand/40"
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
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: DURATION / 1000, ease: "linear" }}
                className="absolute bottom-0 left-0 right-0 h-0.5 origin-left bg-foreground/15"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
