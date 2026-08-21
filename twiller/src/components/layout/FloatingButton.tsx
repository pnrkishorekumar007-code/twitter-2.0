"use client";

import React from "react";
import { motion } from "@/lib/motion";
import { Feather } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Floating compose action — solid blue circle anchored above the mobile
 * bottom bar, mirroring the X mobile FAB.
 */
export default function FloatingButton({ onClick }: { onClick: () => void }) {
  const { t } = useLanguage();

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      aria-label={t("post")}
      className="absolute bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] right-4 grid h-14 w-14 place-items-center rounded-full bg-brand text-white transition-colors duration-200 hover:bg-x-blue-hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Feather className="h-6 w-6" aria-hidden="true" />
    </motion.button>
  );
}
