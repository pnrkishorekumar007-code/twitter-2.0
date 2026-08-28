"use client";

import { useEffect, useRef } from "react";

// Tracks how many active consumers want the body locked. The body stays
// overflow:hidden until the last consumer releases it, preventing a common
// bug where closing one modal unlocks scroll while another is still open.
let lockCount = 0;

export function useLockBodyScroll(active: boolean) {
  const prevOverflow = useRef<string>("");

  useEffect(() => {
    if (!active) return;

    if (lockCount === 0) {
      prevOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount <= 0) {
        lockCount = 0;
        document.body.style.overflow = prevOverflow.current;
      }
    };
  }, [active]);
}
