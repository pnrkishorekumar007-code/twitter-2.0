/**
 * Client-side mirror of the backend's Asia/Kolkata time-window rules so the
 * UI can show precise messages (the server always re-validates).
 */

/** Current wall-clock hour (0–23) in Asia/Kolkata. */
export function istHour(date: Date = new Date()): number {
  // IST is UTC+5:30 with no DST.
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000;
  const istMs = utcMs + 5.5 * 60 * 60 * 1000;
  return new Date(istMs).getUTCHours();
}

/** True when the current IST hour falls within [startHour, endHour). */
export function isWithinISTWindow(
  startHour: number,
  endHour: number,
  date: Date = new Date()
): boolean {
  const h = istHour(date);
  return h >= startHour && h < endHour;
}

/** Heuristic: does this browser look like a phone/tablet? */
export function looksLikeMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const width = window.screen?.width ?? 0;
  const hasTouch =
    typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
  return hasTouch && width > 0 && width < 820;
}
