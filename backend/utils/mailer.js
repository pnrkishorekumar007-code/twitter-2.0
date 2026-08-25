import nodemailer from "nodemailer";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// Email delivery — Brevo (preferred) with automatic Gmail SMTP fallback.
//
// Hierarchy:
//   1. Brevo Transactional Email API (when BREVO_API_KEY starts with xkeysib-)
//   2. Gmail SMTP (when EMAIL_USER + EMAIL_PASS are set and not placeholders)
//   3. Skip + log (no provider configured)
//
// If Brevo fails for any reason other than rate-limiting, the mailer
// automatically falls back to Gmail SMTP so that OTP / transactional emails
// are never silently dropped due to a single provider misconfiguration.
// ---------------------------------------------------------------------------

// Placeholders that must be treated as "not configured".
const PLACEHOLDER_USERS = new Set([
  "youraddress@gmail.com",
  "your_email@gmail.com",
  "email@example.com",
  "",
]);
const PLACEHOLDER_PASS = new Set([
  "your16charapppassword",
  "your_app_password",
  "xxxx-xxxx-xxxx-xxxx",
  "",
]);

/** Check if Gmail SMTP credentials are real (not placeholder). */
function isGmailConfigured() {
  const user = (process.env.EMAIL_USER || "").trim();
  const pass = (process.env.EMAIL_PASS || "").trim();
  if (!user || !pass) return false;
  if (PLACEHOLDER_USERS.has(user.toLowerCase())) return false;
  if (PLACEHOLDER_PASS.has(pass)) return false;
  // App passwords are exactly 16 chars (no dashes) or 16 chars with dashes (xxxx-xxxx-xxxx-xxxx)
  const stripped = pass.replace(/-/g, "");
  if (stripped.length < 10) return false;
  return true;
}

/** Human-readable Brevo status code messages (never expose API keys). */
const BREVO_ERROR_MAP = {
  400: "Brevo rejected the request — check that BREVO_FROM_EMAIL is a verified sender in your Brevo dashboard.",
  401: "Brevo authentication failed — BREVO_API_KEY is invalid or has been revoked. Check the key on Render.",
  429: "Brevo rate limit reached — too many requests. Please wait before retrying.",
};

function brevoStatusMessage(status) {
  return BREVO_ERROR_MAP[status] || `Brevo returned HTTP ${status}.`;
}

async function sendViaBrevo({ to, subject, html, attachments }) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail =
    process.env.BREVO_FROM_EMAIL || process.env.EMAIL_USER || "noreply@twiller.app";

  const payload = {
    sender: { email: fromEmail, name: process.env.BREVO_FROM_NAME || "Twiller" },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };
  if (attachments && attachments.length) {
    payload.attachment = attachments.map((a) => ({
      name: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content.toString("base64") : a.content,
    }));
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Brevo error ${res.status}: ${text.slice(0, 300)}`);
    err.brevoStatus = res.status;
    throw err;
  }
  return { delivered: true, provider: "brevo" };
}

// ---------------------------------------------------------------------------
// Gmail SMTP — port 587 + STARTTLS. Port 465 (implicit TLS, used by
// service:"gmail") is unreachable from some cloud hosts (e.g. Render).
// ---------------------------------------------------------------------------
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Short timeouts so a stalled SMTP connection (e.g. Gmail blocking a cloud
    // server's IP) fails fast instead of hanging login/OTP requests for minutes.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    sendTimeout: 10000,
  });
  return transporter;
}

async function sendViaGmail({ to, subject, html, attachments }) {
  if (!isGmailConfigured()) return null;
  const t = getTransporter();
  await t.sendMail({
    from: `"Twiller" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    attachments,
  });
  return { delivered: true, provider: "gmail" };
}

// ---------------------------------------------------------------------------
// Startup verification — called once after MongoDB connects. Prints a clear
// status line so ops can confirm email is working without checking logs.
// ---------------------------------------------------------------------------
export async function verifyEmailTransport() {
  const hasBrevo =
    !!process.env.BREVO_API_KEY &&
    process.env.BREVO_API_KEY.startsWith("xkeysib-");
  const hasGmail = isGmailConfigured();

  if (!hasBrevo && !hasGmail) {
    console.warn(
      "⚠️  Email not configured — no BREVO_API_KEY or valid EMAIL_USER/EMAIL_PASS found."
    );
    console.warn(
      "   Password-reset and subscription emails will be skipped."
    );
    return;
  }

  if (hasBrevo) {
    console.log("✓ Brevo Transactional Email API configured");
  }

  if (hasGmail) {
    try {
      const t = getTransporter();
      await t.verify();
      console.log("✓ Gmail SMTP Connected");
    } catch (err) {
      console.error(
        "✗ Gmail SMTP connection failed:",
        err.message || err.code || "unknown error"
      );
      console.error(
        "  Check that EMAIL_USER and EMAIL_PASS (Gmail App Password) are correct."
      );
      // Don't crash — the app can still run without email.
    }
  }
}

// ---------------------------------------------------------------------------
// Main export — tries Brevo first, falls back to Gmail, then skips.
// ---------------------------------------------------------------------------
export async function sendMail({ to, subject, html, attachments }) {
  const hasBrevoKey = !!process.env.BREVO_API_KEY;
  const brevoKeyFormat = hasBrevoKey && process.env.BREVO_API_KEY.startsWith("xkeysib-");

  // ── Attempt 1: Brevo Transactional Email API ──────────────────────────
  if (hasBrevoKey) {
    if (!brevoKeyFormat) {
      // Wrong key type — warn and skip straight to Gmail SMTP.
      console.warn(
        "⚠️ BREVO_API_KEY does not start with 'xkeysib-'. The key type is wrong " +
        "(expected a Brevo API key, got something else). Falling back to Gmail SMTP."
      );
    } else {
      try {
        return await sendViaBrevo({ to, subject, html, attachments });
      } catch (err) {
        const status = err.brevoStatus || 0;
        const msg = brevoStatusMessage(status);
        console.error(`⚠️ Brevo failed (${status}): ${msg}`);

        // 429 = Brevo rate limit. Do NOT fall back to Gmail — the user needs
        // to wait regardless of provider. Throw so the route handler returns 429.
        if (status === 429) {
          throw new Error("Email provider rate limit reached. Please wait before requesting another OTP.");
        }

        // For 400, 401, 5xx, and unknown errors: fall through to Gmail SMTP.
      }
    }
  }

  // ── Attempt 2: Gmail SMTP fallback ────────────────────────────────────
  const gmailResult = await sendViaGmail({ to, subject, html, attachments });
  if (gmailResult) return gmailResult;

  // ── No provider configured ────────────────────────────────────────────
  console.warn("⚠️ No email provider configured (BREVO_API_KEY or valid EMAIL_USER/EMAIL_PASS).");
  console.warn("   Email not sent — to:", to, "subject:", subject);
  return { skipped: true };
}

// ---------------------------------------------------------------------------
// Transactional email templates
// ---------------------------------------------------------------------------

export async function sendPasswordResetEmail({ to, newPassword }) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
      <h2 style="color:#1d9bf0">Password Reset Successful</h2>
      <p>Hello,</p>
      <p>Your password has been reset successfully.</p>
      <p style="margin:20px 0">
        <span style="color:#666">New Password:</span><br/>
        <span style="font-family:monospace;font-size:20px;font-weight:bold;letter-spacing:2px;background:#f4f4f4;padding:8px 12px;border-radius:6px;display:inline-block;margin-top:4px">${newPassword}</span>
      </p>
      <p>You can now login using this password.</p>
    </div>
  `;

  return sendMail({
    to,
    subject: "Password Reset Successful",
    html,
  });
}

export async function sendSubscriptionActivatedEmail({
  to,
  customerName,
  planLabel,
  amount,
  startDate,
  expiryDate,
  invoiceNumber,
  invoicePdfBuffer,
}) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
      <h2 style="color:#1d9bf0">Twiller Subscription Activated</h2>
      <p>Hello ${escapeHtml(customerName)},</p>
      <p>Your subscription has been activated successfully.</p>
      <table cellpadding="6" style="border-collapse:collapse;margin:16px 0">
        <tr><td><b>Plan:</b></td><td>${escapeHtml(planLabel)}</td></tr>
        <tr><td><b>Amount:</b></td><td>₹${escapeHtml(amount)}</td></tr>
        <tr><td><b>Start Date:</b></td><td>${escapeHtml(startDate)}</td></tr>
        <tr><td><b>Expiry Date:</b></td><td>${escapeHtml(expiryDate)}</td></tr>
      </table>
      <p>Invoice attached.</p>
      <p>Thank you for choosing Twiller.</p>
    </div>
  `;

  return sendMail({
    to,
    subject: "Twiller Subscription Activated",
    html,
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: invoicePdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}
