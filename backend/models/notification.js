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

export default mongoose.model("Notification", NotificationSchema);
