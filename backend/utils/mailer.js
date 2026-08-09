import nodemailer from "nodemailer";

// Uses Gmail SMTP with an App Password (free) by default.
// Set EMAIL_USER + EMAIL_PASS (16-char Gmail App Password) in .env
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return transporter;
}

export async function sendMail({ to, subject, html }) {
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
  });
}
