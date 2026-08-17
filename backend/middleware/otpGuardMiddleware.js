import { verifyAuthToken } from "../utils/jwt.js";

/**
 * Middleware that ensures the request carries a valid Twiller JWT session
 * (short-lived "login" token or full "auth" session token).
 *
 * Firebase ID tokens are NOT accepted here — every session must go through
 * the Twiller OTP verification flow before a session JWT is issued.
 */
export const ensureOtpVerified = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : (req.cookies?.auth_token || null);
  if (!token) {
    return res.status(401).send({ error: "Login token missing" });
  }

  try {
    const payload = verifyAuthToken(token);
    if (payload.type !== "login" && payload.type !== "auth") {
      throw new Error("Invalid token type");
    }
    req.userId = payload.sub;
    req.user = { uid: String(payload.sub), email: payload.email || "", fromJwt: true };
    return next();
  } catch (e) {
    return res.status(401).send({ error: "Invalid or expired login token" });
  }
};
