"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "@/lib/motion";
import { X } from "lucide-react";
import Sidebar from "./Sidebar";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { Button } from "../ui/button";
import { TwillerBrand } from "../Twitterlogo";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

export default function MobileDrawer({
  open,
  onClose,
  currentPage = "home",
  onNavigate,
}: MobileDrawerProps) {
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleNavigate = (page: string) => {
    onClose();
    onNavigate?.(page);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="absolute inset-y-0 left-0 w-[80vw] max-w-[320px] border-r border-border bg-background"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <TwillerBrand />
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-foreground"
                onClick={onClose}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Sidebar
              currentPage={currentPage}
              onNavigate={handleNavigate}
              forceExpanded
              className="border-r-0"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
