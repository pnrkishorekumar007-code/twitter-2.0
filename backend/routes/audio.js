import express from "express";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import Tweet from "../models/tweet.js";
import { uploadAudio } from "../middleware/upload.js";
import { requireISTWindow } from "../middleware/timeWindow.js";
import { issueOtp, verifyOtp } from "../utils/otp.js";

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * TASK 4: Audio tweets
 * - Requires an email OTP right before upload
 * - Max 5 min duration, max 100 MB (multer enforces size)
 * - Only allowed 14:00-19:00 IST
 */
router.post("/audio/otp/request", async (req, res) => {
  try {
    const { email } = req.body;
    const { devCode } = await issueOtp({
      identifier: email,
      purpose: "audio_upload",
      emailTo: email,
      label: "Audio tweet upload",
    });
    return res.status(200).send({ message: "OTP sent to your email", devCode });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

router.post(
  "/audio/upload",
  requireISTWindow(14, 0, 19, 0, "Audio tweets"),
  uploadAudio.single("audio"),
  async (req, res) => {
    try {
      const { authorId, code, email, durationSeconds } = req.body;

      const otpResult = await verifyOtp({ identifier: email, purpose: "audio_upload", code });
      if (!otpResult.ok) return res.status(400).send({ error: otpResult.reason });

      if (!req.file) return res.status(400).send({ error: "No audio file provided" });

      const duration = Number(durationSeconds || 0);
      if (duration > 5 * 60) {
        return res.status(400).send({ error: "Audio must be 5 minutes or shorter" });
      }
      if (req.file.size > 100 * 1024 * 1024) {
        return res.status(400).send({ error: "Audio must be under 100 MB" });
      }

      const uploadStream = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: "video", folder: "twiller/audio" }, // cloudinary treats audio under "video"
            (error, result) => (error ? reject(error) : resolve(result))
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });

      const result = await uploadStream();

      const tweet = new Tweet({
        author: authorId,
        type: "audio",
        audioUrl: result.secure_url,
        audioDurationSeconds: duration,
        audioSizeBytes: req.file.size,
      });
      await tweet.save();

      return res.status(201).send(tweet);
    } catch (error) {
      return res.status(400).send({ error: error.message });
    }
  }
);

export default router;
