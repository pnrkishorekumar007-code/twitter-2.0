import { io, Socket } from "socket.io-client";
import { auth } from "@/context/firebase";

let socket: Socket | null = null;

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
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000", {
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socket;
}

export async function connectSocket(): Promise<Socket | null> {
  const s = getSocket();
  if (!s) return null;
  const token = await getSessionToken();
  if (!token) return null;
  s.auth = { token };
  if (s.disconnected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
