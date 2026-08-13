import mongoose from "mongoose";

const LoginHistorySchema = new mongoose.Schema(
  {
    browser: String,
    os: String,
    device: { type: String, enum: ["desktop", "laptop", "mobile", "tablet", "unknown"], default: "unknown" },
    ip: String,
    loggedInAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  displayName: { type: String, required: true },
  avatar: { type: String, required: true },
  banner: { type: String, default: "" }, // profile banner / cover image URL
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: "" },
  password: { type: String, default: "" }, // hashed, only used if you add email/password login
  bio: { type: String, default: "" },
  location: { type: String, default: "" },
  website: { type: String, default: "" },
  joinedDate: { type: Date, default: Date.now },

  // Subscription (Razorpay)
  subscriptionPlan: {
    type: String,
    enum: ["FREE", "BRONZE", "SILVER", "GOLD"],
    default: "FREE",
  },
  tweetLimit: { type: Number, default: 1 },
  tweetsUsed: { type: Number, default: 0 },
  subscriptionStartDate: { type: Date, default: null },
  subscriptionEndDate: { type: Date, default: null },
  paymentStatus: { type: String, default: "inactive" },

  // Forgot password — timestamp of the last reset request (once per 24h)
  lastPasswordResetRequest: { type: Date, default: null },

  // Task 3: login history / device auth
  loginHistory: { type: [LoginHistorySchema], default: [] },

  // Task 5: notifications
  notificationsEnabled: { type: Boolean, default: true },

  // Task: keyword-based browser notifications
  keywordNotifications: { type: Boolean, default: true },

  // Task: follow system
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  accountType: { type: String, enum: ["public", "private"], default: "public" },

  // Task 6: language
  preferredLanguage: { type: String, enum: ["en", "es", "hi", "pt", "zh", "fr"], default: "en" },
});

export default mongoose.model("User", UserSchema);
