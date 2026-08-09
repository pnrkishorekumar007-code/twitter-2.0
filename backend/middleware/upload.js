import multer from "multer";

// Audio tweets: 100 MB max, in-memory then streamed to disk/cloud in the route.
// On Render's free tier there's no persistent disk across deploys, so the
// audio route uploads straight to Cloudinary (free tier) — see routes/audio.js.
const storage = multer.memoryStorage();

export const uploadAudio = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("audio/")) {
      return cb(new Error("Only audio files are allowed"));
    }
    cb(null, true);
  },
});
