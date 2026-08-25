import express from "express";
import User from "../models/user.js";
import { requireAnyAuth } from "../middleware/auth.js";
import { getLoginHistory } from "../services/loginHistoryService.js";
import { DEFAULT_KEYWORDS } from "../utils/keywordDetector.js";
import { LANGUAGE_CODES } from "../models/LanguageChangeOTP.js";
import { rateLimit } from "../utils/rateLimiter.js";
import {
  sendLanguageOtp,
  getLatestLanguageOtp,
  verifyLanguageOtp,
  signLanguageChangeToken,
  getChannelForLanguage,
  RESEND_COOLDOWN_MS,
} from "../services/languageOtpService.js";
import { verifyAuthToken } from "../utils/jwt.js";

const router = express.Router();

function sanitizeUser(u) {
  if (!u) return u;
  const obj = u.toObject ? u.toObject() : { ...u };
  delete obj.password;
  return obj;
}

// Profile fields a client is allowed to change. Everything else in the request
// body is ignored, so a caller can never silently overwrite plan/subscription
// or security-related fields via this endpoint.
const PROFILE_EDITABLE_FIELDS = [
  "displayName",
  "bio",
  "location",
  "website",
  "avatar",
  "banner",
  "accountType",
  "phone",
];

/**
 * PATCH /profile/update
 * Updates the signed-in user's editable profile fields (name, bio, location,
 * website, avatar, banner). Returns the full updated user document.
 * Auth: Firebase ID token or Twiller session JWT (requireAnyAuth).
 */
router.patch("/profile/update", requireAnyAuth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email || "" });
    if (!user) return res.status(404).send({ error: "User not found" });

    const patch = {};
    for (const key of PROFILE_EDITABLE_FIELDS) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }

    if (patch.displayName !== undefined && !String(patch.displayName).trim()) {
      return res.status(400).send({ error: "Display name cannot be empty." });
    }

    if (patch.accountType && !["public", "private"].includes(patch.accountType)) {
      return res.status(400).send({ error: "Invalid account type." });
    }

    if (patch.displayName && String(patch.displayName).length > 50) {
      return res.status(400).send({ error: "Display name too long (max 50 characters)." });
    }
    if (patch.bio && String(patch.bio).length > 500) {
      return res.status(400).send({ error: "Bio too long (max 500 characters)." });
    }
    if (patch.location && String(patch.location).length > 100) {
      return res.status(400).send({ error: "Location too long (max 100 characters)." });
    }
    if (patch.website && String(patch.website).length > 200) {
      return res.status(400).send({ error: "Website URL too long (max 200 characters)." });
    }

    Object.assign(user, patch);
    await user.save();
    return res.status(200).send(sanitizeUser(user));
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * PATCH /profile/banner
 * Sets only the profile banner (cover) image URL for the signed-in user.
 * Returns the full updated user document.
 */
router.patch("/profile/banner", requireAnyAuth, async (req, res) => {
  try {
    const banner = String(req.body?.banner || "").trim();
    if (!banner) {
      return res.status(400).send({ error: "Banner image URL is required." });
    }
    const user = await User.findOneAndUpdate(
      { email: req.user.email || "" },
      { $set: { banner } },
      { new: true }
    );
    if (!user) return res.status(404).send({ error: "User not found" });
    return res.status(200).send(user);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * TASK 3 / ADVANCED LOGIN SECURITY:
 * Paginated login history for the signed-in user, newest first.
 * Auth: Firebase ID token (existing) or Twiller session JWT.
 */
router.get("/login-history", requireAnyAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const user = await User.findOne({ email: req.user.email || "" });
    if (!user) return res.status(404).send({ error: "User not found" });

    const history = await getLoginHistory({ userId: user._id, page, limit });
    return res.status(200).send(history);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * TASK 5: Notification preference toggle
 */
router.patch("/notifications/:email", requireAnyAuth, async (req, res) => {
  try {
    const { email } = req.params;
    const { enabled } = req.body;
    if (req.user.email !== email) {
      return res.status(403).send({ error: "Cannot modify another user's settings" });
    }
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { notificationsEnabled: !!enabled } },
      { new: true }
    );
    if (!user) return res.status(404).send({ error: "User not found" });
    return res.status(200).send(user);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * TASK: KEYWORD-BASED BROWSER NOTIFICATIONS
 * Returns the user's keyword-notification preference plus the keywords that
 * are currently monitored (server-side single source of truth).
 */
router.get("/user/notification-settings", requireAnyAuth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email || "" });
    if (!user) return res.status(404).send({ error: "User not found" });
    return res.status(200).send({
      keywordNotifications: user.keywordNotifications !== false,
      keywords: DEFAULT_KEYWORDS,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * TASK: KEYWORD-BASED BROWSER NOTIFICATIONS
 * Enables/disables keyword notifications for the signed-in user.
 */
router.put("/user/notification-settings", requireAnyAuth, async (req, res) => {
  try {
    const value = req.body?.keywordNotifications;
    if (typeof value !== "boolean") {
      return res.status(400).send({ error: "keywordNotifications must be a boolean" });
    }
    const user = await User.findOneAndUpdate(
      { email: req.user.email || "" },
      { $set: { keywordNotifications: value } },
      { new: true }
    );
    if (!user) return res.status(404).send({ error: "User not found" });
    return res.status(200).send({
      keywordNotifications: user.keywordNotifications !== false,
      keywords: DEFAULT_KEYWORDS,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * TASK: MULTI-LANGUAGE SUPPORT WITH OTP VERIFICATION
 *
 * Switching language requires verification:
 *  - French (fr)  → Email OTP to the registered email address.
 *  - All others   → "Mobile" (SMS) OTP to the registered phone number.
 *
 * Only after a successful, single-use code is verified does the preferred
 * language change (gated by a short-lived `language-change` token).
 */

// Resolves the Mongo user from the authenticated session so language routes
// can never be driven by a client-supplied user id.
async function resolveLanguageUser(req, res, next) {
  try {
    const user = await User.findOne({ email: req.user?.email || "" });
    if (!user) return res.status(404).send({ error: "User not found" });
    req.langUser = user;
    next();
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
}

// Input validation: the requested language must be in the supported set.
function requireValidLanguage(req, res, next) {
  const targetLanguage = req.body?.targetLanguage;
  if (!LANGUAGE_CODES.includes(targetLanguage)) {
    return res.status(400).send({ error: "Unsupported language" });
  }
  next();
}

// Rate limit: max 5 OTP requests per 10 minutes per user.
const languageOtpLimiter = (req, res, next) => {
  const result = rateLimit({
    key: `language-otp:${req.langUser._id}`,
    windowMs: 10 * 60 * 1000,
    max: 5,
  });
  if (!result.allowed) {
    return res.status(429).send({
      error: "Too many code requests. Please wait a few minutes.",
      retryAfterMs: result.retryAfterMs,
    });
  }
  next();
};

// POST /language/request-otp — issue and deliver a language-change OTP.
async function requestLanguageOtpHandler(req, res) {
  try {
    const { targetLanguage } = req.body;
    const user = req.langUser;

    // 60s resend cooldown between codes for the same user.
    const latest = await getLatestLanguageOtp(user._id);
    if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil(
        (latest.createdAt.getTime() + RESEND_COOLDOWN_MS - Date.now()) / 1000
      );
      return res.status(429).send({
        error: `Please wait ${retryAfterSec}s before requesting a new code.`,
        retryAfterMs: retryAfterSec * 1000,
      });
    }

    const channel = getChannelForLanguage(targetLanguage);
    const { expiresAt, deliveredTo } = await sendLanguageOtp({
      userId: user._id,
      targetLanguage,
      emailTo: user.email,
      phone: user.phone,
      name: user.displayName || user.username,
    });

    return res.status(200).send({
      message:
        channel === "email"
          ? "Verification code sent to your email."
          : "Verification code sent to your registered mobile number.",
      channel,
      deliveredTo,
      expiresAt,
      resendAfterSec: RESEND_COOLDOWN_MS / 1000,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
}

// POST /language/verify-otp — check the code. On success issues a short-lived
// `language-change` token that authorizes PUT /language/change.
async function verifyLanguageOtpHandler(req, res) {
  try {
    const { targetLanguage, code } = req.body;
    const user = req.langUser;

    if (!/^\d{6}$/.test(String(code || "").trim())) {
      return res.status(400).send({ error: "Enter the 6-digit code." });
    }

    const result = await verifyLanguageOtp({ userId: user._id, targetLanguage, code });
    if (!result.ok) {
      return res.status(400).send({ error: result.reason, code: result.code });
    }

    const languageToken = signLanguageChangeToken({
      userId: user._id,
      email: user.email,
      targetLanguage,
    });

    return res.status(200).send({
      success: true,
      message: "Code verified.",
      targetLanguage,
      languageToken,
      expiresIn: 600,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
}

// PUT /language/change — apply the language change. Only allowed with a valid
// `language-change` token (issued after successful OTP verification).
async function changeLanguageHandler(req, res) {
  try {
    const { targetLanguage, languageToken } = req.body;
    const user = req.langUser;

    if (!languageToken) {
      return res.status(401).send({ error: "Verification required before changing language." });
    }
    if (!LANGUAGE_CODES.includes(targetLanguage)) {
      return res.status(400).send({ error: "Unsupported language" });
    }

    let decoded;
    try {
      decoded = verifyAuthToken(languageToken);
    } catch {
      return res.status(401).send({ error: "Invalid or expired verification." });
    }
    if (
      decoded?.type !== "language-change" ||
      decoded?.sub !== String(user._id) ||
      decoded?.targetLanguage !== targetLanguage
    ) {
      return res.status(401).send({ error: "Invalid verification for this language." });
    }

    user.preferredLanguage = targetLanguage;
    await user.save();

    return res.status(200).send({
      success: true,
      message: `Language switched to ${targetLanguage}.`,
      preferredLanguage: user.preferredLanguage,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
}

// GET /language/current — the user's persisted language preference.
async function getCurrentLanguageHandler(req, res) {
  try {
    const user = await User.findOne({ email: req.user?.email || "" }).select("preferredLanguage");
    if (!user) return res.status(404).send({ error: "User not found" });
    return res.status(200).send({
      preferredLanguage: user.preferredLanguage || "en",
      supportedLanguages: LANGUAGE_CODES,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
}

router.post(
  "/language/request-otp",
  requireAnyAuth,
  resolveLanguageUser,
  requireValidLanguage,
  languageOtpLimiter,
  requestLanguageOtpHandler
);

router.post(
  "/language/verify-otp",
  requireAnyAuth,
  resolveLanguageUser,
  requireValidLanguage,
  verifyLanguageOtpHandler
);

router.put(
  "/language/change",
  requireAnyAuth,
  resolveLanguageUser,
  changeLanguageHandler
);

router.get("/language/current", requireAnyAuth, getCurrentLanguageHandler);

// Legacy aliases so older clients keep working. The verify alias applies the
// change server-side immediately (the flow the old client expected).
router.post(
  "/language/otp/request",
  requireAnyAuth,
  resolveLanguageUser,
  requireValidLanguage,
  languageOtpLimiter,
  requestLanguageOtpHandler
);

router.post(
  "/language/otp/verify",
  requireAnyAuth,
  resolveLanguageUser,
  requireValidLanguage,
  async (req, res) => {
    try {
      const { targetLanguage, code } = req.body;
      const user = req.langUser;

      if (!/^\d{6}$/.test(String(code || "").trim())) {
        return res.status(400).send({ error: "Enter the 6-digit code." });
      }

      const result = await verifyLanguageOtp({ userId: user._id, targetLanguage, code });
      if (!result.ok) {
        return res.status(400).send({ error: result.reason, code: result.code });
      }

      user.preferredLanguage = targetLanguage;
      await user.save();
      return res.status(200).send(sanitizeUser(user));
    } catch (error) {
      return res.status(400).send({ error: error.message });
    }
  }
);

export default router;
