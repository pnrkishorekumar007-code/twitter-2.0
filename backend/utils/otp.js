import crypto from "crypto";
import Otp from "../models/otp.js";
import { sendMail } from "./mailer.js";

const OTP_SECRET = process.env.LOGIN_OTP_SECRET || process.env.JWT_SECRET || "twiller-dev-otp-secret";

function hmacOtp(code) {
  return crypto.createHmac("sha256", OTP_SECRET).update(String(code)).digest("hex");
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

// Creates + emails an OTP. (SMS would need a paid provider like Twilio;
// for the free-tier version we send every OTP to the user's email, and
// note in the message which channel it "represents" — see routes.)
export async function issueOtp({ identifier, purpose, emailTo, label }) {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
  const hashedCode = hmacOtp(code);
  await Otp.create({ identifier, purpose, code: hashedCode, expiresAt });

  // The code is delivered to the user's email only — it is never shown on
  // screen. Any delivery failure is surfaced to the caller as an error.
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
  if (!safeEqual(otp.code, hmacOtp(code))) return { ok: false, reason: "Incorrect OTP" };
  otp.consumed = true;
  await otp.save();
  return { ok: true };
}
