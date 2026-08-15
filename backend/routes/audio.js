import express from "express";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import User from "../models/user.js";
import Tweet from "../models/tweet.js";
import AudioTweet from "../models/AudioTweet.js";
import { uploadAudio } from "../middleware/upload.js";
import { requireISTWindow } from "../middleware/timeWindow.js";
import { requireTweetLimit, rollbackTweetUsed } from "../middleware/tweetLimit.js";
import { requireAnyAuth } from "../middleware/auth.js";
import { verifyAuthToken } from "../utils/jwt.js";
import { rateLimit } from "../utils/rateLimiter.js";
import { notifyKeywordTweet } from "../services/notificationService.js";
import {
  sendAudioOTP,
  getLatestAudioOtp,
  verifyAudioOTP,
  signAudioUploadToken,
  RESEND_COOLDOWN_MS,
} from "../services/audioOtpService.js";

const router = express.Router();

// Cloudinary config must be applied lazily: in ESM, this module is imported
// (and evaluated) before dotenv.config() runs in index.js, so process.env is
// empty at module-load time. Re-applying config on each use is idempotent.
function getCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

const MAX_DURATION_SEC = 5 * 60;
const MAX_SIZE_BYTES = 100 * 1024 * 1024;

const specError = (res, status, message) =>
  res.status(status).send({ success: false, message, error: message });

// Resolves the Mongo user from the authenticated session (token email) and
// pins req.body.authorId to that user so the tweet limit + ownership checks
// can never be spoofed by the client.
async function resolveAudioUser(req, res, next) {
  try {
    const user = await User.findOne({ email: req.user?.email });
    if (!user) {
      return specError(res, 404, "User not found");
    }
    req.audioUser = user;
    req.body = req.body || {}; // DELETE/POST may arrive with no JSON body
    req.body.authorId = String(user._id);
    next();
  } catch (err) {
    return specError(res, 500, err.message);
  }
}

// Wraps multer so size/format rejections return the spec'd 400 message instead
// of falling through to the generic error handler.
function uploadAudioMiddleware(req, res, next) {
  uploadAudio.single("audio")(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Audio size must not exceed 100 MB."
        : err.message || "Invalid audio file";
    return specError(res, 400, message);
  });
}

/**
 * Audio tweets
 * - OTP (5-min expiry, 3 attempts, 60s resend cooldown, hashed) before upload
 * - Max 5 min duration / 100 MB, formats MP3/WAV/M4A/OGG (+ webm from recorder)
 * - Only allowed 2:00 PM - 7:00 PM IST
 * - All routes require authentication
 */

// Rate limit: max 5 OTP requests per 10 minutes per user.
const sendOtpLimiter = (req, res, next) => {
  const result = rateLimit({
    key: `audio-otp:${req.audioUser._id}`,
    windowMs: 10 * 60 * 1000,
    max: 5,
  });
  if (!result.allowed) {
    return res.status(429).send({
      success: false,
      message: "Too many code requests. Please wait a few minutes.",
      error: "Too many code requests. Please wait a few minutes.",
      retryAfterMs: result.retryAfterMs,
    });
  }
  next();
};

async function sendOtpHandler(req, res) {
  try {
    const latest = await getLatestAudioOtp(req.audioUser._id);
    if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil(
        (latest.createdAt.getTime() + RESEND_COOLDOWN_MS - Date.now()) / 1000
      );
      return res.status(429).send({
        success: false,
        message: `Please wait ${retryAfterSec}s before requesting a new code.`,
        error: `Please wait ${retryAfterSec}s before requesting a new code.`,
        retryAfterMs: retryAfterSec * 1000,
      });
    }

    const { expiresAt, devCode } = await sendAudioOTP({
      userId: req.audioUser._id,
      emailTo: req.audioUser.email,
      name: req.audioUser.displayName || req.audioUser.username,
    });

    return res.status(200).send({
      success: true,
      message: "Verification code sent to your email.",
      expiresAt,
      resendAfterSec: RESEND_COOLDOWN_MS / 1000,
      devCode,
    });
  } catch (error) {
    return specError(res, 400, error.message);
  }
}

// POST /audio/send-otp — issue a verification code.
router.post("/audio/send-otp", requireAnyAuth, resolveAudioUser, sendOtpLimiter, sendOtpHandler);

// Legacy alias kept so older clients keep working.
router.post("/audio/otp/request", requireAnyAuth, resolveAudioUser, sendOtpLimiter, sendOtpHandler);

// POST /audio/verify-otp — check the code and unlock the upload with a
// short-lived audio-upload token (single-use OTP is consumed here).
router.post("/audio/verify-otp", requireAnyAuth, resolveAudioUser, async (req, res) => {
  try {
    const code = String(req.body?.code || "").trim();
    if (!code) return specError(res, 400, "Verification code is required.");

    const result = await verifyAudioOTP({ userId: req.audioUser._id, code });
    if (!result.ok) {
      return specError(res, 400, result.reason);
    }

    const audioToken = signAudioUploadToken({
      userId: req.audioUser._id,
      email: req.audioUser.email,
    });

    return res.status(200).send({
      success: true,
      message: "Verification successful. You can now upload your audio tweet.",
      audioToken,
      expiresIn: 600,
    });
  } catch (error) {
    return specError(res, 400, error.message);
  }
});

// POST /audio/upload — OTP-verified upload, only inside the IST window.
// requireTweetLimit reserves the tweet slot atomically, so every early-exit
// path below must release it with rollbackTweetUsed before responding.
router.post(
  "/audio/upload",
  requireAnyAuth,
  requireISTWindow(14, 0, 19, 0, "Audio tweets"),
  uploadAudioMiddleware,
  resolveAudioUser,
  requireTweetLimit,
  async (req, res) => {
    const releaseSlot = () =>
      rollbackTweetUsed(req.audioUser._id).catch(() => {});
    const fail = (status, message) => {
      releaseSlot();
      return specError(res, status, message);
    };

    let persisted = false;
    try {
      // Authorization: short-lived audio-upload token from /audio/verify-otp,
      // or (legacy) the code itself verified inline.
      const { audioToken, code, durationSeconds, caption } = req.body;
      let authorized = false;
      if (audioToken) {
        try {
          const decoded = verifyAuthToken(audioToken);
          authorized =
            decoded?.type === "audio-upload" &&
            decoded?.sub === String(req.audioUser._id);
        } catch {
          authorized = false;
        }
      } else if (code) {
        const otpResult = await verifyAudioOTP({ userId: req.audioUser._id, code });
        authorized = otpResult.ok;
      }
      if (!authorized) {
        return fail(401, "Upload not authorized. Verify your code first.");
      }

      if (!req.file) {
        return fail(400, "No audio file provided");
      }
      if (req.file.size > MAX_SIZE_BYTES) {
        return fail(400, "Audio size must not exceed 100 MB.");
      }

      // Upload to Cloudinary (audio is treated as "video" resource type).
      const result = await new Promise((resolve, reject) => {
        const stream = getCloudinary()
          .uploader.upload_stream(
            { resource_type: "video", folder: "audio-tweets" },
            (error, r) => (error ? reject(error) : resolve(r))
          );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

      // Prefer the duration Cloudinary measures server-side; fall back to the
      // client-supplied value only when Cloudinary didn't return one.
      const serverDuration = Number(result?.duration);
      const duration =
        serverDuration > 0 ? serverDuration : Number(durationSeconds || 0);
      if (duration > MAX_DURATION_SEC) {
        await getCloudinary().uploader.destroy(result.public_id).catch(() => {});
        return fail(400, "Audio must not exceed 5 minutes.");
      }

      const safeCaption = String(caption || "").trim().slice(0, 500);

      const tweet = new Tweet({
        author: req.audioUser._id,
        type: "audio",
        content: safeCaption,
        audioUrl: result.secure_url,
        audioDurationSeconds: duration,
        audioSizeBytes: req.file.size,
      });
      await tweet.save();
      persisted = true;
      notifyKeywordTweet(tweet);

      const audioTweet = await AudioTweet.create({
        userId: req.audioUser._id,
        tweetId: tweet._id,
        audioUrl: result.secure_url,
        cloudinaryId: result.public_id,
        duration,
        fileSize: req.file.size,
        caption: safeCaption,
      });

      return res.status(201).send({
        success: true,
        message: "Audio tweet posted.",
        tweet,
        audioTweet,
      });
    } catch (error) {
      if (!persisted) releaseSlot();
      return specError(res, 400, error.message);
    }
  }
);

// GET /audio/feed — paginated audio tweets, newest first.
router.get("/audio/feed", requireAnyAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

    const [items, total] = await Promise.all([
      AudioTweet.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate("userId", "username displayName avatar email"),
      AudioTweet.countDocuments(),
    ]);

    return res.status(200).send({
      success: true,
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    return specError(res, 400, error.message);
  }
});

// DELETE /audio/:id — owner-only; removes the Cloudinary asset, the linked
// timeline Tweet, and the AudioTweet record.
router.delete("/audio/:id", requireAnyAuth, resolveAudioUser, async (req, res) => {
  try {
    const audioTweet = await AudioTweet.findById(req.params.id);
    if (!audioTweet) {
      return specError(res, 404, "Audio tweet not found");
    }
    if (String(audioTweet.userId) !== String(req.audioUser._id)) {
      return specError(res, 403, "You can only delete your own audio tweets");
    }

    if (audioTweet.cloudinaryId) {
      await getCloudinary().uploader.destroy(audioTweet.cloudinaryId).catch(() => {});
    }
    if (audioTweet.tweetId) {
      await Tweet.findByIdAndDelete(audioTweet.tweetId).catch(() => {});
    }
    await AudioTweet.findByIdAndDelete(audioTweet._id);

    return res.status(200).send({
      success: true,
      message: "Audio tweet deleted.",
    });
  } catch (error) {
    return specError(res, 400, error.message);
  }
});

export default router;
