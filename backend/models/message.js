import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "messages" }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.model("Message", MessageSchema);
