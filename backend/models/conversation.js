import mongoose from "mongoose";

// A 1:1 direct-message conversation between two users. Participants are stored
// sorted (normalized at write time) so the unique index below prevents two
// users from ever ending up with duplicate conversations.
const ConversationSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
    lastSenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Per-participant unread count, keyed by String(userId). The receiver's
    // counter goes up on each new message and back to 0 when they read it.
    unreadCount: { type: Map, of: Number, default: () => ({}) },
  },
  { collection: "conversations", timestamps: true }
);

ConversationSchema.index({ participants: 1 }, { unique: true });

export default mongoose.model("Conversation", ConversationSchema);
