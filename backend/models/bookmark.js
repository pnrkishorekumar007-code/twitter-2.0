import mongoose from "mongoose";

// A saved tweet for a user. One row per (user, tweet) — the unique index
// guarantees a single bookmark per user per tweet, so the toggle is safe.
const BookmarkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tweetId: { type: mongoose.Schema.Types.ObjectId, ref: "Tweet", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "bookmarks" }
);

BookmarkSchema.index({ userId: 1, tweetId: 1 }, { unique: true });
BookmarkSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Bookmark", BookmarkSchema);
