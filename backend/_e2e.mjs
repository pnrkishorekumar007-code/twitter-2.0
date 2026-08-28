import dotenv from "dotenv";
import path from "path";
import dns from "dns";
import { fileURLToPath } from "url";
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env") });
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import mongoose from "mongoose";
import User from "./models/user.js";
import jwt from "jsonwebtoken";

const BASE = "http://localhost:5000";
const url = process.env.MONGODB_URL;

async function req(method, p, { body, token } = {}) {
  const h = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  const r = await fetch(BASE + p, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

async function run() {
  await mongoose.connect(url, { serverSelectionTimeoutMS: 5000 });
  const tag = Date.now();
  const a = await User.create({ username: "e2ea" + tag, displayName: "E2E A", avatar: "https://example.com/a.png", email: `e2ea${tag}@example.com` });
  const b = await User.create({ username: "e2eb" + tag, displayName: "E2E B", avatar: "https://example.com/b.png", email: `e2eb${tag}@example.com` });

  const secret = process.env.JWT_SECRET;
  const tokenA = jwt.sign({ sub: String(a._id), email: a.email, type: "auth" }, secret, { expiresIn: "7d" });

  console.log("User A id:", String(a._id));
  console.log("User B id:", String(b._id));

  // 1) POST with valid receiverId = B
  let r = await req("POST", "/messages/conversations", { body: { receiverId: String(b._id) }, token: tokenA });
  console.log("\n[1] POST valid receiverId ->", r.status, JSON.stringify(r.json));

  // 2) POST again (should reuse existing conversation, no duplicate)
  r = await req("POST", "/messages/conversations", { body: { receiverId: String(b._id) }, token: tokenA });
  console.log("[2] POST same receiverId again ->", r.status, JSON.stringify(r.json && { _id: r.json._id, otherUser: r.json.otherUser && { _id: String(r.json.otherUser._id) } }));

  // 3) Invalid receiverId (not an ObjectId)
  r = await req("POST", "/messages/conversations", { body: { receiverId: "not-a-valid-id" }, token: tokenA });
  console.log("[3] POST invalid id ->", r.status, JSON.stringify(r.json));

  // 4) Nonexistent but valid-format ObjectId
  r = await req("POST", "/messages/conversations", { body: { receiverId: "000000000000000000000000" }, token: tokenA });
  console.log("[4] POST nonexistent id ->", r.status, JSON.stringify(r.json));

  // 5) Duplicate conversation inspection after the two POSTs
  const count = await mongoose.model("Conversation").countDocuments({ participants: [String(a._id), String(b._id)].sort() });
  console.log("[5] conversation count for (A,B):", count);

  await mongoose.disconnect();
}
run().catch((e) => { console.error("FATAL", e); process.exit(1); });
