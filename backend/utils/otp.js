import crypto from "crypto";
import Otp from "../models/otp.js";
import { sendMail } from "./mailer.js";

const OTP_SECRET = process.env.LOGIN_OTP_SECRET || process.env.JWT_SECRET;
if (!OTP_SECRET) {
  console.warn("⚠️  Neither LOGIN_OTP_SECRET nor JWT_SECRET is set. Using fallback dev secret — DO NOT deploy with this.");
}
const OTP_SECRET_KEY = OTP_SECRET || "twiller-dev-otp-secret";
const MAX_ATTEMPTS = 5;

export function hmacOtp(code) {
  return crypto.createHmac("sha256", OTP_SECRET_KEY).update(String(code)).digest("hex");
}

export function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000)); // 6 digits
}

function safeEqual(a, b) {
  try {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Creates + emails an OTP. Invalidates any previous unconsumed codes for the
// same identifier+purpose to prevent multi-code confusion.
export async function issueOtp({ identifier, purpose, emailTo, label }) {
  await Otp.deleteMany({ identifier, purpose, consumed: false });
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
  const hashedCode = hmacOtp(code);
  await Otp.create({ identifier, purpose, code: hashedCode, expiresAt, attempts: 0 });

  const mailResult = await sendMail({
    to: emailTo,
    subject: `Your Twiller verification code${label ? " – " + label : ""}`,
    html: `<p>Your OTP code is:</p><h2 style="letter-spacing:4px">${code}</h2><p>This code expires in 5 minutes. If you didn't request this, ignore this email.</p>`,
  });
  if (mailResult?.skipped) {
    throw new Error("The verification email could not be sent (email service not configured).");
  }
  return { expiresAt };
}

export async function verifyOtp({ identifier, purpose, code }) {
  const otp = await Otp.findOne({ identifier, purpose, consumed: false }).sort({ createdAt: -1 });
  if (!otp) return { ok: false, reason: "No OTP requested" };
  if (otp.expiresAt < new Date()) return { ok: false, reason: "OTP expired" };

  const attempts = (otp.attempts || 0) + 1;
  if (attempts > MAX_ATTEMPTS) {
    await Otp.updateOne({ _id: otp._id }, { consumed: true });
    return { ok: false, reason: "Too many incorrect attempts. Please request a new code." };
  }
  await Otp.updateOne({ _id: otp._id }, { attempts });

  if (!safeEqual(otp.code, hmacOtp(code))) return { ok: false, reason: "Incorrect OTP" };
  otp.consumed = true;
  await otp.save();
  return { ok: true };
}
