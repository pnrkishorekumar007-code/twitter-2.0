import mongoose from "mongoose";

// Generic OTP store used by: login (Chrome), audio upload, language switch
const OtpSchema = new mongoose.Schema({
  identifier: { type: String, required: true }, // email or phone
  purpose: {
    type: String,
    enum: ["login", "audio_upload", "language_switch", "password_reset", "registration"],
    required: true,
  },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  consumed: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OtpSchema.index({ identifier: 1, purpose: 1, consumed: 1, createdAt: -1 });

export default mongoose.model("Otp", OtpSchema);
