import jwt from "jsonwebtoken";

const DEV_SECRET = "twiller-dev-secret-change-me";

let warnedMissingSecret = false;

// One shared secret keeps the number of env vars small; set JWT_SECRET in
// production. LOGIN_OTP_SECRET is an optional second secret used only for
// hashing OTPs (see services/loginOtpService.js).
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.LOGIN_OTP_SECRET || DEV_SECRET;
  if (!process.env.JWT_SECRET && !process.env.LOGIN_OTP_SECRET && !warnedMissingSecret) {
    warnedMissingSecret = true;
    console.warn(
      "⚠️ JWT_SECRET not set — using an insecure development secret. Set JWT_SECRET in backend/.env."
    );
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

export function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}
