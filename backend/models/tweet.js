import mongoose from "mongoose";

const TweetSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, default: "" },
  type: { type: String, enum: ["text", "audio"], default: "text" },
  likes: { type: Number, default: 0 },
  retweets: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  retweetedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  replies: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      content: { type: String, required: true, trim: true, maxlength: 280 },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  image: { type: String, default: null },

  // Task 4: audio tweets
  audioUrl: { type: String, default: null },
  audioDurationSeconds: { type: Number, default: null },
  audioSizeBytes: { type: Number, default: null },

  timestamp: { type: Date, default: Date.now },
});

TweetSchema.index({ author: 1, timestamp: -1 });
TweetSchema.index({ timestamp: -1 });

export default mongoose.model("Tweet", TweetSchema);
