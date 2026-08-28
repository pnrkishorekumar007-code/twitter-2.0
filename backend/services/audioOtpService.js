import crypto from "crypto";
import jwt from "jsonwebtoken";
import AudioTweetOTP from "../models/AudioTweetOTP.js";
import { sendMail } from "../utils/mailer.js";
import { getJwtSecret } from "../utils/jwt.js";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 3;
export const RESEND_COOLDOWN_MS = 60 * 1000; // 60s between sends

// Derives a stable HMAC key used to hash audio OTPs at rest (never store
// plaintext). AUDIO_OTP_SECRET overrides JWT_SECRET for this purpose only.
function getOtpSecret() {
  const base = process.env.AUDIO_OTP_SECRET || getJwtSecret();
  return crypto.createHash("sha256").update(`twiller-audio-otp|${base}`).digest();
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

function audioOtpEmailTemplate({ name, code }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
      <h2 style="color:#1d9bf0">Audio Tweet Verification Code</h2>
      <p>Hello ${escapeHtml(name)},</p>
      <p>You requested to post an audio tweet. Your verification code is:</p>
      <p style="font-family:monospace;font-size:28px;font-weight:bold;letter-spacing:6px;background:#f4f4f4;padding:12px 16px;border-radius:8px;display:inline-block">${code}</p>
      <p>This code expires in 5 minutes.</p>
      <p>If you did not request this audio upload, please ignore this email.</p>
    </div>
  `;
}

/**
 * Creates a fresh audio-tweet OTP for a user and emails it. Any previous
 * unconsumed code is invalidated so only the newest code can be redeemed.
 *
 * @returns {Promise<{ expiresAt: Date }>}
 */
export async function sendAudioOTP({ userId, emailTo, name }) {
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await AudioTweetOTP.deleteMany({ userId });
  await AudioTweetOTP.create({ userId, otpHash: hashOtp(code), expiresAt });

  // The code is delivered to the user's email only — it is never shown on
  // screen. Any delivery failure is surfaced to the caller as an error.
  const mailResult = await sendMail({
    to: emailTo,
    subject: "Audio Tweet Verification Code",
    html: audioOtpEmailTemplate({ name, code }),
  });
  if (mailResult?.skipped) {
    throw new Error("The verification email could not be sent (email service not configured).");
  }
  return { expiresAt };
}

// Newest OTP document for a user (used to enforce the 60s resend cooldown).
export function getLatestAudioOtp(userId) {
  return AudioTweetOTP.findOne({ userId }).sort({ createdAt: -1 });
}

/**
 * Verifies a submitted code against the newest AudioTweetOTP.
 *
 * @returns {{ ok: boolean, reason?: string, code?: "EXPIRED" | "INCORRECT" | "TOO_MANY_ATTEMPTS" }}
 */
export async function verifyAudioOTP({ userId, code }) {
  const otp = await AudioTweetOTP.findOne({ userId }).sort({ createdAt: -1 });
  if (!otp) {
    return { ok: false, reason: "No verification code was requested for this account." };
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

  // One-time use: purge the code so it can't be replayed.
  await AudioTweetOTP.deleteMany({ userId });
  return { ok: true };
}

// Short-lived authorization token (10 min) issued after successful OTP
// verification. The upload endpoint requires it — this enforces "upload only
// after successful verification" with a single-use code flow.
export function signAudioUploadToken({ userId, email }) {
  return jwt.sign(
    { sub: String(userId), email, type: "audio-upload" },
    getJwtSecret(),
    { expiresIn: "10m" }
  );
}
