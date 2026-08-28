import multer from "multer";
import path from "path";

// Audio tweets: 100 MB max, in-memory then streamed to Cloudinary in the route.
// On Render's free tier there's no persistent disk across deploys, so the
// audio route uploads straight to Cloudinary (free tier) — see routes/audio.js.
const storage = multer.memoryStorage();

// Supported formats per spec: MP3, WAV, M4A, OGG. We check both the declared
// MIME type and the file extension (browsers/MediaRecorder often send generic
// types like audio/x-m4a) and fall back to extension when the mimetype is
// ambiguous. .webm is also accepted because the in-browser recorder produces
// audio/webm (MediaRecorder/Opus) — the file picker still offers the 4 spec
// formats for manual uploads.
const ALLOWED_EXTENSIONS = [".mp3", ".wav", ".m4a", ".ogg", ".webm"];
const ALLOWED_MIMETYPES = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/ogg",
  "audio/vorbis",
  "audio/webm",
  "application/ogg",
]);

function isAllowedAudioFile(file) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) return true;
  return ALLOWED_MIMETYPES.has(mime);
}

export const uploadAudio = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (req, file, cb) => {
    if (!isAllowedAudioFile(file)) {
      return cb(new Error("Unsupported audio format. Use MP3, WAV, M4A, or OGG."));
    }
    cb(null, true);
  },
});
