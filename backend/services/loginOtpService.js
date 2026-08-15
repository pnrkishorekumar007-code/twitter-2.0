import crypto from "crypto";
import LoginOTP from "../models/LoginOTP.js";
import { sendMail } from "../utils/mailer.js";
import { getJwtSecret } from "../utils/jwt.js";

const OTP_TTL_MS =
  (Number(process.env.LOGIN_OTP_TTL_MINUTES) || 5) * 60 * 1000; // default 5 min
const MAX_ATTEMPTS = 3;
export const RESEND_COOLDOWN_MS = 60 * 1000;

// Derives a stable HMAC key used to hash OTPs at rest (never store plaintext).
// If LOGIN_OTP_SECRET is set it overrides JWT_SECRET for this purpose only.
function getOtpSecret() {
  const base = process.env.LOGIN_OTP_SECRET || getJwtSecret();
  return crypto.createHash("sha256").update(`twiller-login-otp|${base}`).digest();
}

// CSPRNG-based 6-digit code (crypto.randomInt is unbiased, unlike Math.random).
export function generateOTP() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
}

export function hashOtp(code) {
  return crypto.createHmac("sha256", getOtpSecret()).update(String(code)).digest("hex");
}

// Constant-time comparison so a wrong-length or wrong-value code can't be
// distinguished by timing.
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a), "utf8");
  const bufB = Buffer.from(String(b), "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loginOtpEmailTemplate({ name, code }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
      <h2 style="color:#1d9bf0">Login Verification Code</h2>
      <p>Hello ${escapeHtml(name)},</p>
      <p>Your login verification code is:</p>
      <p style="font-family:monospace;font-size:28px;font-weight:bold;letter-spacing:6px;background:#f4f4f4;padding:12px 16px;border-radius:8px;display:inline-block">${code}</p>
      <p>This code expires in 5 minutes.</p>
      <p>If you did not request this login, please ignore this email.</p>
    </div>
  `;
}

/**
 * Creates a fresh login OTP for a user and emails it.
 * Any previous unconsumed code for that user is invalidated so only the newest
 * code can be redeemed (prevents stale-code confusion/replay).
 *
 * @returns {Promise<{ expiresAt: Date, devCode?: string }>}
 */
export async function sendOTP({ userId, emailTo, name }) {
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await LoginOTP.updateMany(
    { userId, consumed: false },
    { $set: { consumed: true } }
  );
  await LoginOTP.create({ userId, otpHash: hashOtp(code), expiresAt });

  let mailResult = { skipped: true };
  let mailError;
  try {
    mailResult = await sendMail({
      to: emailTo,
      subject: "Login Verification Code",
      html: loginOtpEmailTemplate({ name, code }),
    });
  } catch (error) {
    // A broken/stalled SMTP connection must not block the login flow: the OTP
    // is still issued and exposed via devCode so verification can complete.
    console.error("Login OTP email failed:", error.message);
    mailError = error;
  }

  // Dev fallback: when SMTP isn't configured (or the send failed), expose the
  // code so the flow can still complete. Never included when the email is sent.
  const devCode = mailResult?.skipped ? code : undefined;
  return { expiresAt, devCode, mailError: mailError ? String(mailError.message) : undefined };
}

// Newest OTP document for a user (used to enforce the 60s resend cooldown).
export function getLatestOtp(userId) {
  return LoginOTP.findOne({ userId }).sort({ createdAt: -1 });
}

/**
 * Verifies a submitted code against the newest unconsumed LoginOTP.
 *
 * @returns {{ ok: boolean, reason?: string, code?: "EXPIRED" | "INCORRECT" | "TOO_MANY_ATTEMPTS" }}
 */
export async function verifyOTP({ userId, code }) {
  const otp = await LoginOTP.findOne({ userId, consumed: false }).sort({ createdAt: -1 });
  if (!otp) {
    return { ok: false, reason: "No login code was requested for this account." };
  }

  if (otp.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "This code has expired. Please request a new one.", code: "EXPIRED" };
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    return {
      ok: false,
      reason: "Too many incorrect attempts. Please request a new code.",
      code: "TOO_MANY_ATTEMPTS",
    };
  }

  if (!safeEqual(otp.otpHash, hashOtp(String(code).trim()))) {
    otp.attempts += 1;
    await otp.save();
    return { ok: false, reason: "Incorrect code. Please try again.", code: "INCORRECT" };
  }

  // One-time use: mark consumed immediately so the same code can't be replayed.
  otp.consumed = true;
  await otp.save();
  return { ok: true };
}
