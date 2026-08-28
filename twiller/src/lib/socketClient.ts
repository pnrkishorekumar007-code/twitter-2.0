import { io, Socket } from "socket.io-client";
import { auth } from "@/context/firebase";
import { getBackendBaseUrl } from "./backendUrl";

let socket: Socket | null = null;
let refCount = 0;

// Same token resolution the REST client uses: Twiller session JWT first,
// Firebase ID token as a fallback.
async function getSessionToken(): Promise<string | null> {
  if (typeof window !== "undefined") {
    const jwtToken = localStorage.getItem("twiller-jwt");
    if (jwtToken) return jwtToken;
  }
  const firebaseUser = auth?.currentUser;
  if (firebaseUser) {
    try {
      return await firebaseUser.getIdToken();
    } catch {
      return null;
    }
  }
  return null;
}

// Lazy singleton so multiple consumers share a single connection.
export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) return null;
  if (!socket) {
    socket = io(baseUrl, {
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socket;
}

// Reference-counted connect: each consumer acquires one reference for the
// lifetime of their effect, and releases it with disconnectSocket(). The
// underlying connection (and its listeners) are only torn down once the last
// consumer releases, so one consumer's unmount no longer silently kills the
// real-time listeners that another consumer still depends on.
export async function connectSocket(): Promise<Socket | null> {
  const s = getSocket();
  if (!s) return null;
  const token = await getSessionToken();
  if (!token) return null;
  s.auth = { token };
  if (s.disconnected) s.connect();
  refCount += 1;
  return s;
}

export function disconnectSocket() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
