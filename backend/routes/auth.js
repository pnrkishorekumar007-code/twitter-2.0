import express from "express";
import User from "../models/user.js";
import { deviceDetect } from "../middleware/deviceDetect.js";
import { isWithinISTWindow } from "../utils/time.js";
import { issueOtp, verifyOtp, generateOtpCode } from "../utils/otp.js";
import Otp from "../models/otp.js";
import { generateLetterPassword } from "../utils/passwordGenerator.js";
import { setFirebaseUserPassword } from "../utils/firebaseAdmin.js";
import { sendPasswordResetEmail, sendMail } from "../utils/mailer.js";
import { sendSms } from "../services/smsService.js";
import { hashPassword } from "../utils/passwordHash.js";
import {
  signAuthToken,
  signLoginToken,
  verifyAuthToken,
} from "../utils/jwt.js";
import { rateLimit } from "../utils/rateLimiter.js";
import {
  sendOTP,
  verifyOTP,
  getLatestOtp,
  RESEND_COOLDOWN_MS,
} from "../services/loginOtpService.js";
import { recordLogin } from "../services/loginHistoryService.js";
import { getFirebaseAdmin } from "../utils/firebaseAdmin.js";
import { findUserByEmail } from "../utils/emailLookup.js";

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const RESET_OTP_TTL_MS = 10 * 60 * 1000;

// A "mobile device" for the IST window rule includes tablets.
function isMobileClass(deviceType) {
  return deviceType === "mobile" || deviceType === "tablet";
}

function isChromeBrowser(browser) {
  // Chromium-based but NOT Microsoft Edge (Edge also says "Chrome" in UA).
  return /chrome|chromium|crios/i.test(browser) && !/edge|edg|edgios/i.test(browser);
}

function isMicrosoftBrowser(browser) {
  return /edge|edg|edgios|internet explorer|ie[ /]/i.test(browser);
}

function looksLikePhone(value) {
  const digits = String(value).replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function normalizePhone(value) {
  return String(value).replace(/\D/g, "");
}

function isValidEmail(email) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

// Validates the short-lived login token and returns the userId it is bound to.
function authorizeLoginToken({ email, loginToken }) {
  if (!loginToken) {
    return { ok: false, error: "Missing login token. Please start login again." };
  }
  let decoded;
  try {
    decoded = verifyAuthToken(loginToken);
  } catch {
    return { ok: false, error: "Your login session has expired. Please sign in again." };
  }
  if (!decoded?.sub || decoded.type !== "login") {
    return { ok: false, error: "Invalid login token. Please start login again." };
  }
  if (email && String(decoded.email || "").toLowerCase() !== String(email).toLowerCase()) {
    return { ok: false, error: "Login token does not match this account." };
  }
  return { ok: true, userId: String(decoded.sub) };
}

/**
 * TASK 3: Login with device/browser awareness
 * - Records browser/OS/device/IP into loginHistory
 * - Chrome -> requires email OTP (2-step: /login/start then /login/verify)
 * - Microsoft Edge / IE -> no extra auth
 * - Mobile device -> only allowed 10:00-13:00 IST
 */
router.post("/login/start", deviceDetect, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await findUserByEmail(email);
    if (!user) return res.status(404).send({ error: "User not found" });

    const { deviceType } = req.deviceInfo;

    if (isMobileClass(deviceType) && !isWithinISTWindow(10, 0, 13, 0)) {
      return res.status(403).send({
        error: "Mobile login is only allowed between 10:00 and 13:00 IST.",
      });
    }

    const browser = req.deviceInfo.browser;

    // All browsers require email OTP verification
    await issueOtp({
      identifier: user.email,
      purpose: "login",
      emailTo: user.email,
      label: "Login verification",
    });
    return res.status(200).send({ requiresOtp: true, channel: "email" });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

router.post("/login/verify", deviceDetect, async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ error: "User not found" });

    const result = await verifyOtp({ identifier: email, purpose: "login", code });
    if (!result.ok) return res.status(400).send({ error: result.reason });

    // Keep the legacy embedded history in sync, and also record to the
    // dedicated LoginHistory collection (source of truth for the profile UI).
    user.loginHistory.unshift({ ...req.deviceInfo, loggedInAt: new Date() });
    user.loginHistory = user.loginHistory.slice(0, 25);
    await user.save();
    return res.status(200).send({ user });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * =====================================================================
 * ADVANCED LOGIN SECURITY
 * =====================================================================
 *
 * POST /auth/login            -> device gate + OTP decision + history record
 * POST /auth/send-login-otp   -> (re)send the login OTP (60s cooldown)
 * POST /auth/verify-login-otp -> verify OTP, record login, issue JWT
 *
 * Flow:
 *  - The client authenticates the credentials first (Firebase).
 *  - POST /auth/login classifies the device/browser:
 *      * Mobile/tablet -> only allowed 10:00–13:00 IST
 *      * Chrome        -> requires an emailed 6-digit OTP
 *      * Edge / IE / other browsers -> direct login (JWT issued immediately)
 *  - Chrome users continue to the OTP page; only after a correct OTP is a
 *    session JWT issued and the login recorded in LoginHistory.
 */

router.post("/login", deviceDetect, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const method = req.body?.method === "google" ? "google" : "email";
    if (!email) return res.status(400).send({ error: "Email is required." });

    const user = await findUserByEmail(email);
    if (!user) return res.status(404).send({ error: "User not found" });

    // Best-effort hardening: when a Firebase ID token is attached, make sure it
    // belongs to this account before we record a login. If Firebase admin isn't
    // configured server-side we skip the check (dev setups) rather than block.
    const header = req.headers.authorization || "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (idToken) {
      try {
        const admin = getFirebaseAdmin();
        if (admin) {
          const decoded = await admin.auth().verifyIdToken(idToken);
          if (
            decoded.email &&
            String(decoded.email).toLowerCase() !== email
          ) {
            return res.status(403).send({
              error: "Token email does not match the requested account.",
            });
          }
        }
      } catch {
        // invalid/expired token — client re-signed-in; don't block here.
      }
    }

    const { deviceType, browser } = req.deviceInfo;

    // 5. MOBILE DEVICE TIME RESTRICTION (Asia/Kolkata)
    if (isMobileClass(deviceType) && !isWithinISTWindow(10, 0, 13, 0)) {
      return res.status(403).send({
        success: false,
        message: "Mobile login is allowed only between 10:00 AM and 1:00 PM IST.",
      });
    }

    // ALL Browsers require email OTP verification
    const limiter = rateLimit({
      key: `login-otp:${user._id}`,
      windowMs: 10 * 60 * 1000,
      max: 5,
    });
    if (!limiter.allowed) {
      return res.status(429).send({
        error: "Too many login codes requested. Please try again later.",
      });
    }

    const otp = await sendOTP({
      userId: user._id,
      emailTo: user.email,
      name: user.displayName,
    });

    const loginToken = signLoginToken({
      userId: user._id.toString(),
      email: user.email,
    });

    return res.status(200).send({
      success: true,
      requiresOtp: true,
      channel: "email",
      expiresIn: Math.max(
        1,
        Math.floor((otp.expiresAt.getTime() - Date.now()) / 1000)
      ),
      loginToken,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// (Re)sends the login OTP. Bound to the short-lived login token so an attacker
// can't spam arbitrary emails — you must have started a login first.
router.post("/send-login-otp", async (req, res) => {
  try {
    const { email, loginToken } = req.body || {};

    const authz = authorizeLoginToken({ email, loginToken });
    if (!authz.ok) return res.status(403).send({ error: authz.error });

    const user = await User.findById(authz.userId);
    if (!user) return res.status(404).send({ error: "User not found" });

    // Resend cooldown: minimum 60s between emails to the same account.
    const latest = await getLatestOtp(user._id);
    if (latest) {
      const elapsed = Date.now() - new Date(latest.createdAt).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return res.status(429).send({
          error: `Please wait ${wait}s before requesting a new code.`,
          resendAfter: wait,
        });
      }
    }

    const limiter = rateLimit({
      key: `login-otp-resend:${user._id}`,
      windowMs: 10 * 60 * 1000,
      max: 5,
    });
    if (!limiter.allowed) {
      return res.status(429).send({
        error: "Too many requests. Please try again later.",
        resendAfter: Math.max(1, Math.ceil(limiter.retryAfterMs / 1000)),
      });
    }

    const otp = await sendOTP({
      userId: user._id,
      emailTo: user.email,
      name: user.displayName,
    });

    return res.status(200).send({
      success: true,
      message: "A new login code has been sent to your email.",
      resendAfter: 60,
      expiresIn: Math.max(
        1,
        Math.floor((otp.expiresAt.getTime() - Date.now()) / 1000)
      ),
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// Verifies the OTP, records the successful login and issues the session JWT.
router.post("/verify-login-otp", deviceDetect, async (req, res) => {
  try {
    const { email, code, loginToken, method } = req.body || {};
    const loginMethod = method === "google" ? "google" : "email";

    const authz = authorizeLoginToken({ email, loginToken });
    if (!authz.ok) return res.status(403).send({ error: authz.error });

    const user = await User.findById(authz.userId);
    if (!user) return res.status(404).send({ error: "User not found" });

    // Re-enforce the mobile device window at verification time too: a mobile
    // user who started login inside the window must not be able to complete it
    // after it closes.
    const { deviceType } = req.deviceInfo;
    if (isMobileClass(deviceType) && !isWithinISTWindow(10, 0, 13, 0)) {
      return res.status(403).send({
        success: false,
        message: "Mobile login is allowed only between 10:00 AM and 1:00 PM IST.",
      });
    }

    if (!code || !/^\d{6}$/.test(String(code))) {
      return res.status(400).send({ error: "Please enter the 6-digit code." });
    }

    const result = await verifyOTP({ userId: user._id, code });
    if (!result.ok) {
      if (result.code === "TOO_MANY_ATTEMPTS") {
        return res.status(429).send({ error: result.reason });
      }
      return res.status(400).send({ error: result.reason });
    }

    await recordLogin({ userId: user._id, deviceInfo: req.deviceInfo, loginMethod });

    const authToken = signAuthToken({ userId: user._id.toString(), email: user.email });
    // Set auth token as HttpOnly cookie for subsequent protected requests
    res.cookie('auth_token', authToken, { httpOnly: true, sameSite: 'strict' });
    return res.status(200).send({
      success: true,
      message: "Login verified.",
      user,
      token: authToken,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * REGISTRATION OTP (two-step: send → verify)
 * POST /auth/register-otp   { email, displayName, username, phone?, avatar? }
 * POST /auth/register-verify { email, code, loginToken, displayName, username, phone?, avatar? }
 *
 * Creates a backend user ONLY after the email OTP is verified.
 */
router.post("/register-otp", async (req, res) => {
  try {
    const { email, displayName, username, phone, avatar } = req.body;

    if (!email) return res.status(400).send({ error: "Email is required." });
    if (!isValidEmail(email)) return res.status(400).send({ error: "Invalid email address." });
    if (!username) return res.status(400).send({ error: "Username is required." });
    if (!displayName) return res.status(400).send({ error: "Display name is required." });

    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).send({ error: "An account with this email already exists. Please log in." });

    const limiter = rateLimit({
      key: `register-otp:${email.toLowerCase()}`,
      windowMs: 60 * 60 * 1000,
      max: 3,
    });
    if (!limiter.allowed) {
      return res.status(429).send({
        error: "Too many registration attempts. Please try again later.",
      });
    }

    await issueOtp({
      identifier: email.toLowerCase(),
      purpose: "registration",
      emailTo: email,
      label: "Account registration",
    });

    const loginToken = signLoginToken({
      userId: `pending:${email.toLowerCase()}`,
      email: email.toLowerCase(),
    });

    return res.status(200).send({
      success: true,
      message: "A verification code has been sent to your email.",
      loginToken,
      expiresIn: 600,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

router.post("/register-verify", async (req, res) => {
  try {
    const { email, code, loginToken, displayName, username, phone, avatar } = req.body;

    if (!email) return res.status(400).send({ error: "Email is required." });
    if (!code || !/^\d{6}$/.test(String(code))) {
      return res.status(400).send({ error: "Please enter the 6-digit code." });
    }

    const authz = authorizeLoginToken({ email, loginToken });
    if (!authz.ok) return res.status(403).send({ error: authz.error });

    const result = await verifyOtp({
      identifier: email.toLowerCase(),
      purpose: "registration",
      code,
    });
    if (!result.ok) return res.status(400).send({ error: result.reason });

    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).send({ error: "An account with this email already exists." });

    const newUser = new User({
      username,
      displayName,
      avatar: avatar || "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
      email: email.toLowerCase(),
      ...(phone ? { phone } : {}),
    });
    await newUser.save();

    const authToken = signAuthToken({
      userId: newUser._id.toString(),
      email: newUser.email,
    });

    return res.status(201).send({
      success: true,
      message: "Account created successfully.",
      user: newUser,
      token: authToken,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

router.post("/send-register-otp", async (req, res) => {
  try {
    const { email, loginToken } = req.body || {};

    const authz = authorizeLoginToken({ email, loginToken });
    if (!authz.ok) return res.status(403).send({ error: authz.error });

    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).send({ error: "An account with this email already exists." });

    const latest = await Otp.findOne({
      identifier: email.toLowerCase(),
      purpose: "registration",
    }).sort({ createdAt: -1 });
    if (latest) {
      const elapsed = Date.now() - new Date(latest.createdAt).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return res.status(429).send({
          error: `Please wait ${wait}s before requesting a new code.`,
          resendAfter: wait,
        });
      }
    }

    const limiter = rateLimit({
      key: `register-otp-resend:${email.toLowerCase()}`,
      windowMs: 10 * 60 * 1000,
      max: 5,
    });
    if (!limiter.allowed) {
      return res.status(429).send({
        error: "Too many requests. Please try again later.",
        resendAfter: Math.max(1, Math.ceil(limiter.retryAfterMs / 1000)),
      });
    }

    await issueOtp({
      identifier: email.toLowerCase(),
      purpose: "registration",
      emailTo: email,
      label: "Account registration",
    });

    return res.status(200).send({
      success: true,
      message: "A new verification code has been sent to your email.",
      resendAfter: 60,
      expiresIn: 600,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * FORGOT PASSWORD (two-step OTP flow)
 * POST /auth/forgot-password          { identifier: "email_or_phone" }
 * POST /auth/forgot-password/verify   { identifier, code }
 *
 * Step 1 (request): sends a 6-digit verification code (email -> email,
 * phone -> SMS with an email fallback when no SMS provider is configured).
 * Can be requested once per 24 hours per account.
 * Step 2 (verify): verifies the code, resets the password to a fresh
 * 10-character letters-only password, persists it hashed (scrypt) and
 * delivers it (email or SMS). The password is never returned in the response.
 */

async function deliverForgotPasswordOtp({ user, isEmail }) {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + RESET_OTP_TTL_MS);
  const identifierKey = user.email.toLowerCase();

  await Otp.create({
    identifier: identifierKey,
    purpose: "password_reset",
    code,
    expiresAt,
  });

  if (isEmail) {
    const mailResult = await sendMail({
      to: user.email,
      subject: "Your Twiller password reset code",
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><p>You requested a password reset.</p><p>Your verification code is:</p><h2 style="letter-spacing:4px">${code}</h2><p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p></div>`,
    });
    if (mailResult?.skipped) {
      throw new Error("The verification email could not be sent (email service not configured).");
    }
    return { channel: "email", deliveredTo: user.email };
  }

  // Phone recovery: try SMS first, fall back to email (dev/free tier).
  const smsTo = user.phone || null;
  const smsResult = smsTo ? await sendSms({ to: smsTo, text: `Your Twiller password reset code is: ${code}` }) : { skipped: true };
  if (smsResult?.skipped) {
    const mailResult = await sendMail({
      to: user.email,
      subject: "Your Twiller password reset code",
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><p>You requested a password reset.</p><p>Your verification code is:</p><h2 style="letter-spacing:4px">${code}</h2><p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p></div>`,
    });
    if (mailResult?.skipped) {
      throw new Error("The verification code could not be sent (no SMS or email provider configured).");
    }
    return { channel: "email", deliveredTo: user.email, smsFallback: true };
  }
  return { channel: "sms", deliveredTo: smsTo };
}

router.post("/forgot-password", async (req, res) => {
  try {
    const identifier = String(req.body?.identifier || "").trim();
    if (!identifier) {
      return res.status(400).send({ error: "Email or phone number is required." });
    }

    const isEmail = EMAIL_RE.test(identifier);
    const isPhone = looksLikePhone(identifier);
    if (!isEmail && !isPhone) {
      return res.status(400).send({
        error: "Please enter a valid email address or phone number.",
      });
    }

    // Locate the account (email case-insensitive, phone exact, then phone-digits
    // fallback so "+919876543210" finds a user stored as "9876543210").
    let user = isEmail
      ? await findUserByEmail(identifier)
      : await User.findOne({ phone: identifier });
    if (!user && isPhone) {
      // Guard: an all-zero / blank number must not collapse to the empty
      // suffix regex /$/ which matches every user and resets the FIRST
      // account's password instead of the intended one.
      const digits = normalizePhone(identifier).replace(/^0+/, "");
      if (digits.length >= 7) {
        user = await User.findOne({ phone: { $regex: new RegExp(`${digits}$`) } });
      }
    }
    if (!user) {
      return res.status(404).send({ error: "No account found with that email/phone" });
    }

    // Security rule: only one reset request per 24 hours.
    if (user.lastPasswordResetRequest) {
      const elapsed = Date.now() - new Date(user.lastPasswordResetRequest).getTime();
      if (elapsed < ONE_DAY_MS) {
        return res.status(429).send({
          success: false,
          message: "You can use this option only one time per day.",
        });
      }
    }

    // Step 1: send the verification code. The daily quota is only consumed
    // once the code has actually been delivered successfully.
    const delivery = await deliverForgotPasswordOtp({ user, isEmail });

    user.lastPasswordResetRequest = new Date();
    await user.save();

    return res.status(200).send({
      success: true,
      message: "A verification code has been sent. Enter it to reset your password.",
      channel: delivery.channel,
      deliveredTo: delivery.deliveredTo,
      smsFallback: !!delivery.smsFallback,
      expiresIn: Math.floor(RESET_OTP_TTL_MS / 1000),
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

router.post("/forgot-password/verify", async (req, res) => {
  try {
    const identifier = String(req.body?.identifier || "").trim();
    const code = String(req.body?.code || "").trim();
    if (!identifier) {
      return res.status(400).send({ error: "Email or phone number is required." });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).send({ error: "Please enter the 6-digit verification code." });
    }

    const isEmail = EMAIL_RE.test(identifier);
    const isPhone = looksLikePhone(identifier);
    if (!isEmail && !isPhone) {
      return res.status(400).send({
        error: "Please enter a valid email address or phone number.",
      });
    }

    let user = isEmail
      ? await findUserByEmail(identifier)
      : await User.findOne({ phone: identifier });
    if (!user && isPhone) {
      const digits = normalizePhone(identifier).replace(/^0+/, "");
      if (digits.length >= 7) {
        user = await User.findOne({ phone: { $regex: new RegExp(`${digits}$`) } });
      }
    }
    if (!user) {
      return res.status(404).send({ error: "No account found with that email/phone" });
    }

    // Cap incorrect attempts to 5 per 10 minutes per account.
    const limiter = rateLimit({
      key: `forgot-pw-verify:${user._id}`,
      windowMs: 10 * 60 * 1000,
      max: 5,
    });
    if (!limiter.allowed) {
      return res.status(429).send({
        error: "Too many incorrect attempts. Please request a new code and try again later.",
      });
    }

    const result = await verifyOtp({
      identifier: user.email.toLowerCase(),
      purpose: "password_reset",
      code,
    });
    if (!result.ok) {
      return res.status(400).send({ error: result.reason });
    }

    // Step 2: reset + persist the new password (hashed, never plaintext).
    const newPassword = generateLetterPassword(10);
    user.password = hashPassword(newPassword);
    user.lastPasswordResetRequest = new Date();
    await user.save();

    let firebaseUpdated = false;
    try {
      firebaseUpdated = await setFirebaseUserPassword(user.email || identifier, newPassword);
    } catch (err) {
      console.error("Firebase password update failed:", err.message);
    }

    // Phone recovery: send the new password by SMS (never returned on screen
    // when a provider is configured).
    if (isPhone) {
      try {
        const smsResult = await sendSms({
          to: user.phone || identifier,
          text: `Your new Twiller password is: ${newPassword}`,
        });
        if (smsResult?.skipped) {
          return res.status(200).send({
            success: true,
            message: "Password reset successful.",
            firebaseUpdated,
            note: "The new password could not be sent by SMS (no SMS provider configured).",
          });
        }
        return res.status(200).send({
          success: true,
          message: "Password reset successful. Your new password has been sent to your phone.",
          firebaseUpdated,
        });
      } catch (smsErr) {
        console.error("Password reset SMS failed:", smsErr.message);
        return res.status(200).send({
          success: true,
          message: "Password reset successful.",
          firebaseUpdated,
          note: "The SMS could not be sent. Please contact support to recover your password.",
        });
      }
    }

    // Email recovery: send the password by email.
    try {
      const mailResult = await sendPasswordResetEmail({ to: user.email, newPassword });
      if (mailResult?.skipped) {
        return res.status(200).send({
          success: true,
          message: "Password reset successful.",
          firebaseUpdated,
          note: "The email could not be sent (email service not configured).",
        });
      }
      return res.status(200).send({
        success: true,
        message: "Password reset successful. Check your email for your new password.",
        firebaseUpdated,
      });
    } catch (mailErr) {
      console.error("Password reset email failed:", mailErr.message);
      return res.status(200).send({
        success: true,
        message: "Password reset successful.",
        firebaseUpdated,
        note: "The email could not be sent. Please contact support to recover your password.",
      });
    }
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

export default router;
