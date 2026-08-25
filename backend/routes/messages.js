import express from "express";
import mongoose from "mongoose";
import User from "../models/user.js";
import Conversation from "../models/conversation.js";
import Message from "../models/message.js";
import { requireAnyAuth } from "../middleware/auth.js";
import { emitToUser } from "../socket.js";

const router = express.Router();

const PROFILE_SELECT = "displayName username avatar verified";

async function resolveCurrentUser(req, res) {
  const user = await User.findOne({ email: req.user?.email || "" });
  if (!user) {
    res.status(404).send({ error: "User not found" });
    return null;
  }
  return user;
}

// Participants are stored sorted so lookups and the unique index are stable
// regardless of which user creates the conversation.
function normalizeParticipants(a, b) {
  return [String(a), String(b)].sort();
}

// Reads the per-user unread counter whether the doc is hydrated (Map) or lean
// (plain object keyed by user id string).
function getUnreadCount(conversation, userId) {
  const key = String(userId);
  const map = conversation?.unreadCount;
  if (!map) return 0;
  if (typeof map.get === "function") return map.get(key) || 0;
  return map[key] || 0;
}

// Populates a conversation with profile fields and flattens it into the shape
// the UI consumes: otherUser + unreadCount (for the given user) precomputed.
async function buildConversationPayload(conversation, currentUserId) {
  const conv = await Conversation.findById(conversation._id)
    .populate("participants", PROFILE_SELECT)
    .populate("lastSenderId", PROFILE_SELECT)
    .lean();

  const currentId = String(currentUserId);
  const other = (conv.participants || []).find(
    (p) => String(p._id) !== currentId
  );

  return {
    ...conv,
    unreadCount: getUnreadCount(conv, currentUserId),
    otherUser: other || null,
  };
}

/**
 * GET /api/messages/conversations
 * The signed-in user's conversations, most recent first, each with the other
 * participant's profile and the current user's unread count.
 */
router.get("/messages/conversations", requireAnyAuth, async (req, res) => {
  try {
    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    const conversations = await Conversation.find({
      participants: current._id,
    })
      .sort({ lastMessageAt: -1 })
      .populate("participants", PROFILE_SELECT)
      .populate("lastSenderId", PROFILE_SELECT)
      .lean();

    const payload = conversations.map((c) => {
      const currentId = String(current._id);
      return {
        ...c,
        unreadCount: getUnreadCount(c, current._id),
        otherUser:
          (c.participants || []).find((p) => String(p._id) !== currentId) ||
          null,
      };
    });

    return res.status(200).send(payload);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * POST /api/messages/conversations
 * Creates (or returns the existing) 1:1 conversation with the given user.
 * Body: { receiverId }. Used to open a chat before any message is sent.
 */
router.post("/messages/conversations", requireAnyAuth, async (req, res) => {
  try {
    const { receiverId } = req.body;
    if (!mongoose.isValidObjectId(receiverId)) {
      return res.status(400).send({ error: "Invalid user id" });
    }

    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    if (String(receiverId) === String(current._id)) {
      return res.status(400).send({ error: "You cannot message yourself" });
    }
    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).send({ error: "User not found" });

    const participants = normalizeParticipants(current._id, receiverId);
    let conversation = await Conversation.findOne({ participants });
    if (!conversation) {
      conversation = await Conversation.create({
        participants,
        lastMessageAt: new Date(),
      });
    }

    const payload = await buildConversationPayload(conversation, current._id);
    return res.status(200).send(payload);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * POST /api/messages/send
 * Sends a direct message. Creates the conversation if it doesn't exist yet,
 * updates the conversation preview, bumps the receiver's unread counter, and
 * pushes the message to both users over Socket.IO.
 * Body: { receiverId, text }
 */
router.post("/messages/send", requireAnyAuth, async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const cleanText = String(text || "").trim();

    if (!cleanText) {
      return res.status(400).send({ error: "Message cannot be empty" });
    }
    if (cleanText.length > 1000) {
      return res.status(400).send({ error: "Message is too long (1000 chars max)" });
    }
    if (!mongoose.isValidObjectId(receiverId)) {
      return res.status(400).send({ error: "Invalid user id" });
    }

    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    if (String(receiverId) === String(current._id)) {
      return res.status(400).send({ error: "You cannot message yourself" });
    }
    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).send({ error: "User not found" });

    const participants = normalizeParticipants(current._id, receiverId);
    let conversation = await Conversation.findOne({ participants });
    if (!conversation) {
      conversation = await Conversation.create({
        participants,
        lastMessageAt: new Date(),
      });
    }

    const doc = await Message.create({
      conversationId: conversation._id,
      senderId: current._id,
      receiverId,
      text: cleanText,
    });
    await doc.populate("senderId", PROFILE_SELECT);

    conversation.lastMessage = cleanText;
    conversation.lastMessageAt = new Date();
    conversation.lastSenderId = current._id;
    const key = String(receiverId);
    if (!conversation.unreadCount || typeof conversation.unreadCount.get !== "function") {
      conversation.unreadCount = new Map();
    }
    conversation.unreadCount.set(key, (conversation.unreadCount.get(key) || 0) + 1);
    await conversation.save();

    const payload = {
      message: doc.toObject({ versionKey: false }),
      conversation: await buildConversationPayload(conversation, current._id),
    };

    // Sender gets a conversation update (reorders their list); the receiver
    // gets the message pushed live.
    emitToUser(current._id, "conversation:update", payload);
    emitToUser(receiverId, "message:new", payload);

    return res.status(201).send(payload);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * PUT /api/messages/conversations/:conversationId/read
 * Marks every incoming message in the conversation as read for the current
 * user and resets their unread counter. Called when a chat is opened.
 */
router.put(
  "/messages/conversations/:conversationId/read",
  requireAnyAuth,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      if (!mongoose.isValidObjectId(conversationId)) {
        return res.status(400).send({ error: "Invalid conversation id" });
      }

      const current = await resolveCurrentUser(req, res);
      if (!current) return;

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: current._id,
      });
      if (!conversation) {
        return res.status(404).send({ error: "Conversation not found" });
      }

      await Message.updateMany(
        { conversationId, receiverId: current._id, read: false },
        { $set: { read: true, readAt: new Date() } }
      );

      conversation.unreadCount.set(String(current._id), 0);
      await conversation.save();

      return res.status(200).send({ success: true });
    } catch (error) {
      return res.status(400).send({ error: error.message });
    }
  }
);

/**
 * PUT /api/messages/read/:messageId
 * Marks a single incoming message as read (used by fine-grained sync).
 */
router.put("/messages/read/:messageId", requireAnyAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).send({ error: "Invalid message id" });
    }

    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).send({ error: "Message not found" });

    if (String(message.receiverId) !== String(current._id)) {
      return res
        .status(400)
        .send({ error: "Only the receiver can mark a message as read" });
    }

    if (!message.read) {
      message.read = true;
      message.readAt = new Date();
      await message.save();
    }

    return res.status(200).send({ success: true, message });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * GET /api/messages/:conversationId
 * Full message history for a conversation the current user belongs to,
 * oldest first. Must be registered after the /conversations routes.
 */
router.get("/messages/:conversationId", requireAnyAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).send({ error: "Invalid conversation id" });
    }

    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: current._id,
    });
    if (!conversation) {
      return res.status(404).send({ error: "Conversation not found" });
    }

    const messages = await Message.find({ conversationId })
      .populate("senderId", PROFILE_SELECT)
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).send({
      conversation: await buildConversationPayload(conversation, current._id),
      messages,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

export default router;
