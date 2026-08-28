import dotenv from "dotenv";
import path from "path";
import dns from "dns";
import { fileURLToPath } from "url";
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env") });
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import mongoose from "mongoose";

const url = process.env.MONGODB_URL;

const normalizeParticipants = (a, b) => [String(a), String(b)].sort();

async function run() {
  await mongoose.connect(url, { serverSelectionTimeoutMS: 5000 });
  console.log("connected");

  const conversations = mongoose.connection.db.collection("conversations");
  const users = mongoose.connection.db.collection("users");

  // create a pair
  let docs = await users.find({}).limit(2).toArray();
  console.log("sample users count:", docs.length);

  const a = docs[0], b = docs[1];
  const participants = normalizeParticipants(a._id, b._id);
  console.log("participants for pair:", participants.join(","));

  // Find existing conversation for this pair
  let existing = null;
  try {
    existing = await conversations.findOne({ participants: participants.map((s) => new mongoose.Types.ObjectId(s)) });
  } catch (e) { console.log("find error", e.message); }
  console.log("existing for pair:", existing ? String(existing._id) : "none");

  if (!existing) {
    // Insert two duplicate conversations directly (bypass validation) to simulate stale/bad data
    const t0 = new Date();
    const ins = await conversations.insertMany([
      { participants: participants.map((s) => new mongoose.Types.ObjectId(s)), lastMessageAt: t0, lastMessage: "", unreadCount: {} },
      { participants: participants.map((s) => new mongoose.Types.ObjectId(s)), lastMessageAt: t0, lastMessage: "", unreadCount: {} },
    ]);
    console.log("inserted", ins.length, "duplicate conversations (simulating stale data)");
  }

  await mongoose.disconnect();
}
run().catch((e) => { console.error("FATAL", e); process.exit(1); });
