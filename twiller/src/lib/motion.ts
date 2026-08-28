"use client";

import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import type { Variants } from "framer-motion";

// Timing tokens — X uses fast, subtle motion. Posts fade in at 150ms,
// pages at 250ms. Nothing bounces except modals (spring).
export const durations = {
  fast: 0.15,
  page: 0.25,
  modal: 0.3,
} as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.fast, ease: "easeOut" },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: durations.fast } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: durations.fast, ease: "easeOut" },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

export const springPop: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.04, transition: { type: "spring", stiffness: 500, damping: 15 } },
  pressed: { scale: 0.96 },
};

export { motion, AnimatePresence, MotionConfig };
