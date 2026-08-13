import mongoose from "mongoose";

// Metadata record for every audio tweet upload. The Tweet document (type
// "audio") remains the source of truth for the timeline — this record holds
// the Cloudinary asset id needed to purge the file on delete.
const AudioTweetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tweetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tweet",
      index: true,
    },
    audioUrl: { type: String, required: true },
    cloudinaryId: { type: String, required: true },
    duration: { type: Number, default: 0 },
    fileSize: { type: Number, default: 0 },
    caption: { type: String, default: "" },
  },
  { timestamps: true }
);

// Fast feed queries: newest audio tweets for a user (or globally).
AudioTweetSchema.index({ userId: 1, createdAt: -1 });
AudioTweetSchema.index({ createdAt: -1 });

export default mongoose.model("AudioTweet", AudioTweetSchema);
