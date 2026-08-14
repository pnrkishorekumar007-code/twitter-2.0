import { verifyAuthToken } from "../utils/jwt.js";

/**
 * Middleware that ensures the request contains a valid short‑lived login token (type "login").
 * It protects routes that must only be accessible after successful OTP verification.
 */
export const ensureOtpVerified = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  // Prefer Authorization header, fallback to http‑only cookie "auth_token"
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : (req.cookies?.auth_token || null);
  if (!token) {
    return res.status(401).send({ error: "Login token missing" });
  }
  try {
    const payload = verifyAuthToken(token);
    // Accept both short‑lived login tokens and full session auth tokens
    if (payload.type !== "login" && payload.type !== "auth") {
      throw new Error("Invalid token type");
    }
    // Attach userId for downstream handlers if needed
    req.userId = payload.sub;
    next();
  } catch (e) {
    return res.status(401).send({ error: "Invalid or expired login token" });
  }
};
