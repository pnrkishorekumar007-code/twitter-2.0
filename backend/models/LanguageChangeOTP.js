import mongoose from "mongoose";

// Supported language codes — kept in sync with the frontend's translations.ts.
export const LANGUAGE_CODES = ["en", "es", "hi", "pt", "zh", "fr"];

// OTP guarding a language change. Only the HMAC hash of the code is ever
// stored — the plaintext is delivered (email for French, SMS otherwise) and
// discarded. `deliveryMethod` records the channel used, `targetLanguage` pins
// the code to the language it was requested for, and `attempts` enforces a max
// of 3 tries.
const LanguageChangeOTPSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  otpHash: { type: String, required: true },
  deliveryMethod: { type: String, enum: ["email", "sms"], required: true },
  targetLanguage: { type: String, enum: LANGUAGE_CODES, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// TTL index — documents are auto-deleted at expiry, so expired codes can never
// be redeemed and the collection never grows unboundedly.
LanguageChangeOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Fast lookup of the newest code for a user (verification + 60s cooldown).
LanguageChangeOTPSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("LanguageChangeOTP", LanguageChangeOTPSchema);
