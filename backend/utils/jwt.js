import jwt from "jsonwebtoken";

let warnedMissingSecret = false;

// JWT_SECRET is the ONLY secret used for signing session tokens.
// Never fall back to LOGIN_OTP_SECRET (used only for OTP hashing) or a
// hardcoded value — doing so would let anyone forge auth tokens.
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is required in production");
    }
    if (!warnedMissingSecret) {
      warnedMissingSecret = true;
      console.warn(
        "⚠️ JWT_SECRET not set — using an insecure development secret. Set JWT_SECRET in backend/.env."
      );
    }
    return "twiller-dev-secret-change-me";
  }
  return secret;
}

// Short-lived token (10 min) that authorizes the OTP endpoints for a specific
// account. Only issued by POST /auth/login when the flow needs an OTP.
export function signLoginToken({ userId, email }) {
  return jwt.sign({ sub: userId, email, type: "login" }, getJwtSecret(), {
    expiresIn: "10m",
  });
}

// Full session token issued once a login is complete (direct login or after a
// successful OTP verification). type: "auth" distinguishes it from login
// tokens so requireAnyAuth refuses to accept the short-lived login tokens.
export function signAuthToken({ userId, email }) {
  return jwt.sign({ sub: userId, email, type: "auth" }, getJwtSecret(), {
    expiresIn: "7d",
  });
}

// Short-lived (10 min) single-purpose token that authorizes regenerating the
// generated password after a verified forgot-password reset. Its distinct
// `type` guarantees it can never be replayed against the login endpoints.
export function signPasswordResetSessionToken({ userId, email }) {
  return jwt.sign(
    { sub: userId, email, type: "password-reset-session" },
    getJwtSecret(),
    { expiresIn: "10m" }
  );
}

export function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}
