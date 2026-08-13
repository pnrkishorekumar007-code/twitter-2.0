// SMS delivery for "mobile" OTPs (all languages except French).
//
// The project ships on free tiers, so no SMS provider is configured by
// default: when SMS_PROVIDER_API_KEY / SMS_PROVIDER_SECRET are missing, the
// "SMS" OTP is delivered to the user's email instead (dev fallback) so the
// end-to-end flow still works. To enable real SMS, pick a provider (Twilio,
// MSG91, Vonage, ...) and fill in the one place below.
import { sendMail } from "../utils/mailer.js";

/**
 * Sends an SMS via the configured provider.
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

  // ---------------------------------------------------------------
  // PROVIDER HOOK — swap the implementation below for your provider.
  // Example (Twilio-style REST):
  //   const res = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + apiKey + "/Messages.json", {
  //     method: "POST",
  //     headers: {
  //       "Authorization": "Basic " + Buffer.from(`${apiKey}:${secret}`).toString("base64"),
  //       "Content-Type": "application/x-www-form-urlencoded",
  //     },
  //     body: new URLSearchParams({ From: process.env.SMS_FROM, To: to, Body: text }),
  //   });
  //   if (!res.ok) throw new Error("SMS provider error: " + res.status);
  //   return { ok: true };
  // ---------------------------------------------------------------

  // Pluggable generic endpoint: set SMS_PROVIDER_URL to a webhook that
  // accepts { to, text } and authenticates with the API key in the header.
  const providerUrl = process.env.SMS_PROVIDER_URL;
  if (providerUrl) {
    const res = await fetch(providerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ to, text }),
    });
    if (!res.ok) throw new Error(`SMS provider error: ${res.status}`);
    return { ok: true };
  }

  // No provider URL configured either — treat as not deliverable so the caller
  // can fall back to the email dev channel.
  return { skipped: true };
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
