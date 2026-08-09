import mongoose from "mongoose";

const LoginHistorySchema = new mongoose.Schema(
  {
    browser: String,
    os: String,
    device: { type: String, enum: ["desktop", "laptop", "mobile", "unknown"], default: "unknown" },
    ip: String,
    loggedInAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  displayName: { type: String, required: true },
  avatar: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: "" },
  password: { type: String, default: "" }, // hashed, only used if you add email/password login
  bio: { type: String, default: "" },
  location: { type: String, default: "" },
  website: { type: String, default: "" },
  joinedDate: { type: Date, default: Date.now },

  // Task 1: subscription
  subscription: {
    plan: { type: String, enum: ["free", "bronze", "silver", "gold"], default: "free" },
    tweetLimit: { type: Number, default: 1 },
    tweetsUsedThisCycle: { type: Number, default: 0 },
    cycleStart: { type: Date, default: Date.now },
    renewsAt: { type: Date, default: null },
  },

  // Task 2: forgot password
  passwordReset: {
    lastRequestedAt: { type: Date, default: null },
  },

  // Task 3: login history / device auth
  loginHistory: { type: [LoginHistorySchema], default: [] },

  // Task 5: notifications
  notificationsEnabled: { type: Boolean, default: true },

  // Task 6: language
  preferredLanguage: { type: String, enum: ["en", "es", "hi", "pt", "zh", "fr"], default: "en" },
});

export default mongoose.model("User", UserSchema);
