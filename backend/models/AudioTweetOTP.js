import mongoose from "mongoose";

// OTP guarding audio tweet uploads. Only the HMAC hash of the code is stored —
// the plaintext is emailed and discarded. `attempts` enforces max 3 tries,
// `expiresAt` (5 min) plus the TTL index make expired codes unusable.
const AudioTweetOTPSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// TTL index — documents are auto-deleted at expiry, so expired codes can never
// be redeemed and the collection never grows unboundedly.
AudioTweetOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Fast lookup of the newest code for a user (verification + 60s cooldown).
AudioTweetOTPSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("AudioTweetOTP", AudioTweetOTPSchema);
