import crypto from "crypto";
import jwt from "jsonwebtoken";
import LanguageChangeOTP, { LANGUAGE_CODES } from "../models/LanguageChangeOTP.js";
import { sendMail } from "../utils/mailer.js";
import { sendSms, sendMobileOtpFallback } from "./smsService.js";
import { getJwtSecret } from "../utils/jwt.js";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 3;
export const RESEND_COOLDOWN_MS = 60 * 1000; // 60s between sends

// Languages that verify with an email OTP (French). All others use the "mobile"
// (SMS) channel.
export function isEmailChannel(targetLanguage) {
  return targetLanguage === "fr";
}

export function getChannelForLanguage(targetLanguage) {
  return isEmailChannel(targetLanguage) ? "email" : "sms";
}

// Derives a stable HMAC key used to hash language-change OTPs at rest (never
// store plaintext). LANGUAGE_OTP_SECRET overrides JWT_SECRET for this purpose.
function getOtpSecret() {
  const base = process.env.LANGUAGE_OTP_SECRET || getJwtSecret();
  return crypto.createHash("sha256").update(`twiller-language-otp|${base}`).digest();
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

const LANGUAGE_NAMES = {
  en: "English",
  es: "Spanish",
  hi: "Hindi",
  pt: "Portuguese",
  zh: "Chinese",
  fr: "French",
};

// Exact copy per spec: French selection uses this email.
function languageOtpEmailTemplate({ name, code, targetLanguage }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
      <h2 style="color:#1d9bf0">Language Change Verification</h2>
      <p>Hello ${escapeHtml(name)},</p>
      <p>Your verification code is:</p>
      <p style="font-family:monospace;font-size:28px;font-weight:bold;letter-spacing:6px;background:#f4f4f4;padding:12px 16px;border-radius:8px;display:inline-block">${code}</p>
      <p>Use this code to switch your language to ${LANGUAGE_NAMES[targetLanguage] || targetLanguage}.</p>
      <p>Code expires in 5 minutes.</p>
      <p>If you did not request this change, please ignore this email.</p>
    </div>
  `;
}

// Exact copy per spec: non-French languages use the "mobile" (SMS) channel.
function smsTemplate({ code }) {
  return `Your language verification code is: ${code}. Code expires in 5 minutes.`;
}

/**
 * Creates a fresh language-change OTP for a user and delivers it over the
 * correct channel (email for French, SMS otherwise). Any previous code for the
 * user is purged so only the newest code can be redeemed.
 *
 * @returns {Promise<{ channel: string, expiresAt: Date, devCode?: string }>}
 */
export async function sendLanguageOtp({ userId, targetLanguage, emailTo, phone, name }) {
  if (!LANGUAGE_CODES.includes(targetLanguage)) {
    throw new Error("Unsupported language");
  }

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  const channel = getChannelForLanguage(targetLanguage);

  await LanguageChangeOTP.deleteMany({ userId });
  await LanguageChangeOTP.create({
    userId,
    otpHash: hashOtp(code),
    deliveryMethod: channel,
    targetLanguage,
    expiresAt,
  });

  let devCode;
  if (channel === "email") {
    const mailResult = await sendMail({
      to: emailTo,
      subject: "Language Change Verification",
      html: languageOtpEmailTemplate({ name, code, targetLanguage }),
    });
    devCode = mailResult?.skipped ? code : undefined;
  } else {
    const smsResult = await sendSms({
      to: phone || "",
      text: smsTemplate({ code }),
    });
    if (smsResult?.skipped) {
      // Dev fallback (free tier): deliver the "mobile" OTP to the email so the
      // flow still completes end-to-end until a real SMS provider is added.
      const mailResult = await sendMobileOtpFallback({ emailTo, text: smsTemplate({ code }) });
      devCode = mailResult?.skipped ? code : undefined;
    }
  }

  return { channel, expiresAt, devCode };
}

// Newest OTP document for a user (used to enforce the 60s resend cooldown).
export function getLatestLanguageOtp(userId) {
  return LanguageChangeOTP.findOne({ userId }).sort({ createdAt: -1 });
}

/**
 * Verifies a submitted code against the newest LanguageChangeOTP. The code is
 * pinned to the target language it was requested for.
 *
 * @returns {{ ok: boolean, reason?: string, code?: "EXPIRED" | "INCORRECT" | "TOO_MANY_ATTEMPTS" }}
 */
export async function verifyLanguageOtp({ userId, targetLanguage, code }) {
  const otp = await LanguageChangeOTP.findOne({ userId }).sort({ createdAt: -1 });
  if (!otp) {
    return { ok: false, reason: "No verification code was requested for this account." };
  }

  if (otp.targetLanguage !== targetLanguage) {
    return { ok: false, reason: "This code was requested for a different language." };
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
  await LanguageChangeOTP.deleteMany({ userId });
  return { ok: true };
}

// Short-lived authorization token (10 min) issued after successful OTP
// verification. PUT /language/change requires it — this enforces "only update
// the language after successful verification" with a single-use code flow.
export function signLanguageChangeToken({ userId, email, targetLanguage }) {
  return jwt.sign(
    { sub: String(userId), email, targetLanguage, type: "language-change" },
    getJwtSecret(),
    { expiresIn: "10m" }
  );
}
