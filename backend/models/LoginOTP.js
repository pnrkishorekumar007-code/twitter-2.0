import mongoose from "mongoose";

// Login OTP for the Chrome login step-up. Only the HMAC hash of the code is
// ever stored — the plaintext is emailed and discarded. `attempts` enforces a
// max of 3 tries and `consumed` prevents replay of a used code.
const LoginOTPSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  consumed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// TTL index — documents are auto-deleted at their expiry time, so expired
// codes can never be reused and the collection never grows unboundedly.
LoginOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Fast lookup of the newest unconsumed code for a user during verification.
LoginOTPSchema.index({ userId: 1, consumed: 1, createdAt: -1 });

export default mongoose.model("LoginOTP", LoginOTPSchema);
