import { verifyAuthToken } from "../utils/jwt.js";
import { getFirebaseAdmin } from "../utils/firebaseAdmin.js";

/**
 * Middleware that ensures the request carries a valid session:
 *  - a Twiller JWT (short‑lived login token "login" or full session "auth"), or
 *  - a Firebase ID token (existing/older sessions).
 *
 * This mirrors the dual‑auth behavior of `requireAnyAuth` so routes behind this
 * guard keep working after the frontend's axios interceptor swaps its session
 * JWT for a Firebase ID token (e.g. after a Razorpay create‑order 401 retry).
 */
export const ensureOtpVerified = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  // Prefer Authorization header, fallback to http‑only cookie "auth_token"
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : (req.cookies?.auth_token || null);
  if (!token) {
    return res.status(401).send({ error: "Login token missing" });
  }

  // 1) Twiller JWT — accept short‑lived login tokens and full session auth tokens.
  try {
    const payload = verifyAuthToken(token);
    if (payload.type !== "login" && payload.type !== "auth") {
      throw new Error("Invalid token type");
    }
    // Attach userId for downstream handlers if needed
    req.userId = payload.sub;
    req.user = { uid: String(payload.sub), email: payload.email || "", fromJwt: true };
    return next();
  } catch (e) {
    // Not a Twiller JWT — fall through to the Firebase ID‑token check.
  }

  // 2) Firebase ID token (existing sessions / older client flows).
  const admin = getFirebaseAdmin();
  if (admin) {
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      if (decoded?.uid) {
        req.userId = decoded.uid;
        req.user = { uid: decoded.uid, email: decoded.email || "" };
        return next();
      }
    } catch (e) {
      // Not a valid Firebase token either.
    }
  }

  return res.status(401).send({ error: "Invalid or expired login token" });
};
