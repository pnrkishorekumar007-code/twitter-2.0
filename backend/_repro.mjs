import dotenv from "dotenv";
import path from "path";
import dns from "dns";
import { fileURLToPath } from "url";
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env") });
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import mongoose from "mongoose";
import User from "./models/user.js";
import Conversation from "./models/conversation.js";

const url = process.env.MONGODB_URL;

const PROFILE_SELECT = "displayName username avatar verified";

function normalizeParticipants(a, b) {
  return [String(a), String(b)].sort();
}

function getUnreadCount(conversation, userId) {
  const key = String(userId);
  const map = conversation?.unreadCount;
  if (!map) return 0;
  if (typeof map.get === "function") return map.get(key) || 0;
  return map[key] || 0;
}

async function buildConversationPayload(conversation, currentUserId) {
  const conv = await Conversation.findById(conversation._id)
    .populate("participants", PROFILE_SELECT)
    .populate("lastSenderId", PROFILE_SELECT)
    .lean();
  const currentId = String(currentUserId);
  const other = (conv.participants || []).find((p) => String(p._id) !== currentId);
  return { ...conv, unreadCount: getUnreadCount(conv, currentUserId), otherUser: other || null };
}

async function run() {
  await mongoose.connect(url, { serverSelectionTimeoutMS: 5000 });
  console.log("connected\n");

  const a = await User.create({ username: "reproA" + Date.now(), displayName: "Repro A", avatar: "https://example.com/a.png", email: `reproa${Date.now()}@example.com` });
  const b = await User.create({ username: "reproB" + Date.now(), displayName: "Repro B", avatar: "https://example.com/b.png", email: `reprob${Date.now()}@example.com` });

  console.log("User A _id:", String(a._id));
  console.log("User B _id:", String(b._id));

  // --- Simulate POST /messages/conversations with receiverId = String(b._id) ---
  const receiverId = String(b._id);

  try {
    if (!mongoose.isValidObjectId(receiverId)) {
      console.log("400: Invalid user id");
      return;
    }
    const current = a;
    if (String(receiverId) === String(current._id)) {
      console.log("400: You cannot message yourself");
      return;
    }
    const receiver = await User.findById(receiverId);
    if (!receiver) { console.log("404: User not found"); return; }

    const participants = normalizeParticipants(current._id, receiverId);
    console.log("participants (strings):", JSON.stringify(participants));

    let conversation = await Conversation.findOne({ participants });
    console.log("existing conversation:", conversation ? String(conversation._id) : "none");
    if (!conversation) {
      console.log("creating conversation with participants:", JSON.stringify(participants));
      conversation = await Conversation.create({ participants, lastMessageAt: new Date() });
      console.log("created _id:", String(conversation._id));
    }

    const payload = await buildConversationPayload(conversation, current._id);
    console.log("payload built OK, otherUser:", JSON.stringify(payload.otherUser && { _id: String(payload.otherUser._id), displayName: payload.otherUser.displayName }));
    console.log("\nRESULT: 200 OK");
  } catch (error) {
    console.log("\nRESULT: 400 ->", error.message);
    console.log(error);
  }

  await mongoose.disconnect();
}

run().catch((e) => { console.error("FATAL", e); process.exit(1); });
