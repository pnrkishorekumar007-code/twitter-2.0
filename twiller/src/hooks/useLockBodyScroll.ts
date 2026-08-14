"use client";

import { useEffect } from "react";

// Locks the document body while an overlay/modal is open (prevents background
// scrolling on mobile), restoring the previous overflow value on cleanup.
export function useLockBodyScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [active]);
}
