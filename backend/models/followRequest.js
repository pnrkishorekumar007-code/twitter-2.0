import mongoose from "mongoose";

// Follow requests for private accounts. Created when a user asks to follow
// a private account; the target may accept (establishes the follow) or
// reject (request is deleted). One pending request per (sender, receiver)
// pair is enforced via the compound unique index.
const FollowRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

FollowRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

export default mongoose.model("FollowRequest", FollowRequestSchema);
