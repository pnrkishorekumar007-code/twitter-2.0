import nodemailer from "nodemailer";

// Email delivery.

async function sendViaBrevo({ to, subject, html, attachments }) {
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
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brevo error ${res.status}: ${text.slice(0, 300)}`);
  }
  return { delivered: true };
}

// Gmail SMTP over port 587 + STARTTLS. Port 465 (implicit TLS, used by
// service:"gmail") is unreachable from some cloud hosts (e.g. Render).
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

export async function sendMail({ to, subject, html, attachments }) {
  if (process.env.BREVO_API_KEY) {
    return sendViaBrevo({ to, subject, html, attachments });
  }
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ EMAIL_USER/EMAIL_PASS not set — email not sent, logging instead:");
    console.log({ to, subject, html });
    return { skipped: true };
  }
  const t = getTransporter();
  return t.sendMail({
    from: `"Twiller" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    attachments,
  });
}

// Password-reset email with the generated password.
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

// Post-payment confirmation email with the generated invoice PDF attached.
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
      <p>Hello ${customerName},</p>
      <p>Your subscription has been activated successfully.</p>
      <table cellpadding="6" style="border-collapse:collapse;margin:16px 0">
        <tr><td><b>Plan:</b></td><td>${planLabel}</td></tr>
        <tr><td><b>Amount:</b></td><td>₹${amount}</td></tr>
        <tr><td><b>Start Date:</b></td><td>${startDate}</td></tr>
        <tr><td><b>Expiry Date:</b></td><td>${expiryDate}</td></tr>
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
