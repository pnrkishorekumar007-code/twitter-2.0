// SMS delivery for "mobile" OTPs (all languages except French) and the phone
// forgot-password flow.
//
// Provider: Twilio (free tier works for testing with a verified recipient).
// Configure via env vars:
//   SMS_PROVIDER_API_KEY  = Twilio Account SID
//   SMS_PROVIDER_SECRET   = Twilio Auth Token
//   SMS_FROM              = your Twilio sender number (E.164, e.g. +1xxxxxxx)
//
// When these are missing the SMS is NOT delivered — the caller falls back to
// email (dev mode) so the end-to-end flow still works on free tiers.
import { sendMail } from "../utils/mailer.js";

/**
 * Sends an SMS via Twilio.
 *
 * @param {object} opts
 * @param {string} opts.to    E.164 recipient number, e.g. "+919876543210"
 * @param {string} opts.text  Message body
 * @returns {Promise<{ ok?: boolean, skipped?: boolean }>}
 */
export async function sendSms({ to, text }) {
  const apiKey = process.env.SMS_PROVIDER_API_KEY;
  const secret = process.env.SMS_PROVIDER_SECRET;

  if (!apiKey || !secret) {
    console.warn(
      "⚠️ SMS_PROVIDER_API_KEY / SMS_PROVIDER_SECRET not set — SMS not sent, logging instead:"
    );
    console.log({ to, text });
    return { skipped: true };
  }

  if (!to) {
    return { skipped: true };
  }

  // Twilio REST API: https://www.twilio.com/docs/messaging/api
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
      apiKey
    )}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${apiKey}:${secret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: process.env.SMS_FROM,
        To: to,
        Body: text,
      }),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`SMS provider error: ${res.status} ${detail}`);
    throw new Error(`SMS provider error: ${res.status}`);
  }
  return { ok: true };
}

/**
 * Dev fallback: when no SMS provider is configured, deliver the "mobile" OTP
 * to the user's email so the flow can be tested end-to-end on the free tier.
 */
export async function sendMobileOtpFallback({ emailTo, text }) {
  return sendMail({
    to: emailTo,
    subject: "Twiller Language Change Verification",
    html: `<p>${text.replace(/\n/g, "<br/>")}</p>`,
  });
}
