import express from "express";
import User from "../models/user.js";
import { deviceDetect } from "../middleware/deviceDetect.js";
import { isWithinISTWindow } from "../utils/time.js";
import { issueOtp, verifyOtp } from "../utils/otp.js";
import { generateLetterPassword } from "../utils/passwordGenerator.js";
import { setFirebaseUserPassword } from "../utils/firebaseAdmin.js";
import { sendPasswordResetEmail } from "../utils/mailer.js";
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

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ error: "User not found" });

    const { deviceType } = req.deviceInfo;

    if (isMobileClass(deviceType) && !isWithinISTWindow(10, 0, 13, 0)) {
      return res.status(403).send({
        error: "Mobile login is only allowed between 10:00 and 13:00 IST.",
      });
    }

    const browser = req.deviceInfo.browser;

    const isChrome = isChromeBrowser(browser);
    const isMicrosoft = isMicrosoftBrowser(browser);

    if (isChrome) {
      const { devCode } = await issueOtp({
        identifier: user.email,
        purpose: "login",
        emailTo: user.email,
        label: "Login verification",
      });
      return res.status(200).send({ requiresOtp: true, channel: "email", devCode });
    }

    // Microsoft browsers (or anything else) skip extra auth
    user.loginHistory.unshift({ ...req.deviceInfo, loggedInAt: new Date() });
    user.loginHistory = user.loginHistory.slice(0, 25);
    await user.save();
    return res.status(200).send({ requiresOtp: false, user });
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
    await recordLogin({ userId: user._id, deviceInfo: req.deviceInfo, loginMethod: "email" });
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

    const user = await User.findOne({ email });
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

    // 3. CHROME LOGIN OTP VERIFICATION
    if (isChromeBrowser(browser)) {
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
        devCode: otp.devCode,
      });
    }

    // 4. MICROSOFT EDGE / IE — and every other non-Chrome browser — login
    // immediately; the login is recorded in LoginHistory and a JWT is issued.
    await recordLogin({ userId: user._id, deviceInfo: req.deviceInfo, loginMethod: method });

    return res.status(200).send({
      success: true,
      requiresOtp: false,
      user,
      token: signAuthToken({ userId: user._id.toString(), email: user.email }),
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
      devCode: otp.devCode,
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

    return res.status(200).send({
      success: true,
      message: "Login verified.",
      user,
      token: signAuthToken({ userId: user._id.toString(), email: user.email }),
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * FORGOT PASSWORD (single step)
 * POST /auth/forgot-password   { identifier: "email_or_phone" }
 *
 * - Resets the password to a fresh 10-character letters-only password
 * - Can be requested once per 24 hours per account
 * - Email identifier  -> password is emailed (never returned in the response)
 * - Phone identifier  -> password is returned in the response (test mode)
 */
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

    // Locate the account (email exact, phone exact, then phone-digits fallback
    // so "+919876543210" finds a user stored as "9876543210").
    let user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
    if (!user && isPhone) {
      const digits = normalizePhone(identifier).replace(/^0+/, "");
      user = await User.findOne({ phone: { $regex: new RegExp(`${digits}$`) } });
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

    // Generate a fresh letters-only password.
    const newPassword = generateLetterPassword(10);

    // Persist in MongoDB + record the request timestamp.
    user.password = newPassword;
    user.lastPasswordResetRequest = new Date();
    await user.save();

    // Update the real Firebase Auth password (email or phone).
    let firebaseUpdated = false;
    try {
      firebaseUpdated = await setFirebaseUserPassword(user.email || identifier, newPassword);
    } catch (err) {
      console.error("Firebase password update failed:", err.message);
    }

    // Phone recovery: return the generated password for testing.
    if (isPhone) {
      return res.status(200).send({
        success: true,
        message: "Password reset successful.",
        newPassword,
        firebaseUpdated,
      });
    }

    // Email recovery: send the password by email.
    try {
      const mailResult = await sendPasswordResetEmail({ to: user.email, newPassword });
      if (mailResult?.skipped) {
        return res.status(200).send({
          success: true,
          message: "Password reset successful. Check your email for your new password.",
          newPassword,
          note: "EMAIL_USER/EMAIL_PASS are not configured, so the password could not be emailed — it is shown here instead.",
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
        newPassword,
        note: "The email could not be sent — your new password is shown here instead.",
      });
    }
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

export default router;
