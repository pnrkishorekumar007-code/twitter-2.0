import { Server } from "socket.io";
import User from "./models/user.js";
import { verifyAuthToken } from "./utils/jwt.js";
import { getFirebaseAdmin } from "./utils/firebaseAdmin.js";
import { ALLOWED_ORIGINS } from "./utils/allowedOrigins.js";

let io = null;

// Users who have keyword notifications enabled sit in the "keyword-tweets"
// room and receive a "keyword-tweet" event whenever a new tweet matches.
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: ALLOWED_ORIGINS, methods: ["GET", "POST"], credentials: true },
  });

  // Authenticate the socket with the same tokens the REST API accepts:
  // Twiller session JWT first, Firebase ID token as a fallback.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));

      try {
        const decoded = verifyAuthToken(token);
        if (decoded?.sub && (!decoded.type || decoded.type === "auth")) {
          socket.data.user = {
            uid: String(decoded.sub),
            email: decoded.email || "",
          };
          return next();
        }
      } catch {
        // not a Twiller JWT — try Firebase below
      }

      const admin = getFirebaseAdmin();
      if (!admin) return next(new Error("Firebase is not configured on the server"));
      const decoded = await admin.auth().verifyIdToken(token);
      if (!decoded?.uid) return next(new Error("Invalid authentication token"));
      socket.data.user = { uid: decoded.uid, email: decoded.email || "" };
      return next();
    } catch (err) {
      return next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", async (socket) => {
    try {
      const user = await User.findOne({
        email: socket.data.user?.email || "",
      })
        .select("_id")
        .lean();
      if (user) {
        socket.data.userId = String(user._id);
        socket.join(`user:${String(user._id)}`);
      }
    } catch (err) {
      // Room membership is best-effort; a DB hiccup shouldn't kill the socket.
    }
  });

  return io;
}

export function getIO() {
  return io;
}

// Emits an event to a single user's private room ("user:<mongoId>"). Used for
// direct-message delivery (message:new / conversation:update) and for
// per-user keyword-tweet notifications.
export function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${String(userId)}`).emit(event, payload);
}
