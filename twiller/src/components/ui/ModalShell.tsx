"use client";

import React, { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { motion } from "@/lib/motion";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

/**
 * Accessible modal shell: Escape to close, body scroll lock, vertical
 * scroll on short screens, and theme-aware surface styling.
 */
export default function ModalShell({
  open,
  onClose,
  label,
  children,
  maxWidth = "sm:max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-3 sm:p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full ${maxWidth} my-auto max-h-[90dvh] bg-card border border-border rounded-2xl flex flex-col overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
