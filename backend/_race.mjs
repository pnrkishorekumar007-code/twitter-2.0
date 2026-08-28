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
import jwt from "jsonwebtoken";

const BASE = "http://localhost:5000";
const url = process.env.MONGODB_URL;

async function run() {
  await mongoose.connect(url, { serverSelectionTimeoutMS: 5000 });
  const tag = Date.now();
  const a = await User.create({ username: "racea" + tag, displayName: "Race A", avatar: "https://example.com/a.png", email: `racea${tag}@example.com` });
  const b = await User.create({ username: "raceb" + tag, displayName: "Race B", avatar: "https://example.com/b.png", email: `raceb${tag}@example.com` });
  const tokenA = jwt.sign({ sub: String(a._id), email: a.email, type: "auth" }, process.env.JWT_SECRET, { expiresIn: "7d" });

  const convModel = Conversation;

  console.log("A:", String(a._id), "B:", String(b._id));

  const post = () => fetch(BASE + "/messages/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ receiverId: String(b._id) }),
  }).then(async (r) => { let j = null; try { j = await r.json(); } catch {} return { status: r.status, error: j?.error || null, id: j?._id || null }; });

  const results = await Promise.all([post(), post(), post()]);
  console.log("concurrent POSTs:", JSON.stringify(results));

  const count = await convModel.countDocuments({ participants: [String(a._id), String(b._id)].sort() });
  console.log("conversation count for pair:", count);

  await mongoose.disconnect();
}
run().catch((e) => { console.error("FATAL", e); process.exit(1); });
