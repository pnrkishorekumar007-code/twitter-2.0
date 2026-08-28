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
  const users = await User.find({}).select("email following").lean();
  let tested = 0;
  for (const actor of users) {
    if (tested >= 6) break;
    if (!actor.following || !actor.following.length) continue;
    const token = jwt.sign({ sub: String(actor._id), email: actor.email, type: "auth" }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "7d" });
    const foll = await req("GET", `/users/following/${actor._id}`, { token });
    const list = Array.isArray(foll.json) ? foll.json : [];
    for (const target of list) {
      if (tested >= 6) break;
      // Pass the exact raw _id value (mirroring the frontend: onPick(u._id))
      const rawId = target._id;
      const r = await req("POST", "/messages/conversations", { body: { receiverId: rawId }, token });
      console.log(`actor=${String(actor._id)} receiver=${String(rawId)} -> ${r.status} ${JSON.stringify(r.json && r.json.error ? r.json.error : (r.json && r.json._id ? "conv:" + String(r.json._id) : r.json))}`);
      tested++;
    }
  }
  await mongoose.disconnect();
}
run().catch((e) => { console.error("FATAL", e); process.exit(1); });
