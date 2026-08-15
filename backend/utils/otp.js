import Otp from "../models/otp.js";
import { sendMail } from "./mailer.js";

export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

// Creates + emails an OTP. (SMS would need a paid provider like Twilio;
// for the free-tier version we send every OTP to the user's email, and
// note in the message which channel it "represents" — see routes.)
export async function issueOtp({ identifier, purpose, emailTo, label }) {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  await Otp.create({ identifier, purpose, code, expiresAt });

  let mailResult = { skipped: true };
  try {
    mailResult = await sendMail({
      to: emailTo,
      subject: `Your Twiller verification code${label ? " – " + label : ""}`,
      html: `<p>Your OTP code is:</p><h2 style="letter-spacing:4px">${code}</h2><p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p>`,
    });
  } catch (error) {
    console.error("OTP email failed:", error.message);
  }

  // Dev fallback: when no SMTP is configured (or the send failed), expose the
  // code so the flow can still complete. Never included when email is sent.
  const devCode = mailResult?.skipped ? code : undefined;
  return { expiresAt, devCode };
}

export async function verifyOtp({ identifier, purpose, code }) {
  const otp = await Otp.findOne({ identifier, purpose, consumed: false }).sort({ createdAt: -1 });
  if (!otp) return { ok: false, reason: "No OTP requested" };
  if (otp.expiresAt < new Date()) return { ok: false, reason: "OTP expired" };
  if (otp.code !== String(code)) return { ok: false, reason: "Incorrect OTP" };
  otp.consumed = true;
  await otp.save();
  return { ok: true };
}
