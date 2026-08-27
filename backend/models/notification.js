import mongoose from "mongoose";

// In-app notifications (e.g. "John started following you"). Stored per
// recipient so every account sees its own follow activity after refresh.
const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["follow", "follow_request", "request_accepted", "reply", "like", "retweet"],
      default: "follow",
    },
    read: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, read: 1, timestamp: -1 });

// Auto-delete notifications older than 90 days to prevent unbounded growth.
NotificationSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.model("Notification", NotificationSchema);
