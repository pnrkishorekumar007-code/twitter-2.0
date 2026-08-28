// Client-side hints that help the backend tell a laptop from a desktop
// (a User-Agent string alone carries no screen/touch information).
export interface ClientInfo {
  screenWidth: number;
  hasTouch: boolean;
}

export function getClientInfo(): ClientInfo | undefined {
  if (typeof window === "undefined") return undefined;
  return {
    screenWidth: window.screen?.width ?? 0,
    hasTouch:
      typeof navigator !== "undefined" && navigator.maxTouchPoints > 0,
  };
}
