import mongoose from "mongoose";

// Standalone collection (separate from the small embedded array in User) that
// records every successful login with full device/browser context.
const LoginHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    browser: { type: String, default: "Unknown" },
    browserVersion: { type: String, default: "" },
    os: { type: String, default: "Unknown" },
    deviceType: {
      type: String,
      enum: ["desktop", "laptop", "mobile", "tablet", "unknown"],
      default: "unknown",
      index: true,
    },
    ipAddress: { type: String, default: "" },
    loginMethod: {
      type: String,
      enum: ["email", "google", "unknown"],
      default: "unknown",
    },
    loginTime: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// "Newest first per user" — the query pattern used by GET /user/login-history
// pagination (find({ userId }).sort({ loginTime: -1 }).skip().limit()).
LoginHistorySchema.index({ userId: 1, loginTime: -1 });

// Auto-delete documents older than 90 days to prevent unbounded growth.
// MongoDB TTL indexes delete documents `expireAfterSeconds` after the indexed
// date value. Setting 90 days = 7,776,000 seconds.
LoginHistorySchema.index({ loginTime: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.model("LoginHistory", LoginHistorySchema);
