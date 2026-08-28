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

  // Find a real user that follows at least one person.
  const users = await User.find({}).select("email displayName following").limit(50).lean();
  let actor = null;
  for (const u of users) {
    if (u.following && u.following.length) { actor = u; break; }
  }
  if (!actor) { console.log("No real user with following found (limit 50)."); await mongoose.disconnect(); return; }

  console.log("actor:", String(actor._id), actor.email, "| following count:", actor.following.length);

  const token = jwt.sign({ sub: String(actor._id), email: actor.email, type: "auth" }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "7d" });

  // Mirror the frontend: GET /users/following/:id
  const foll = await req("GET", `/users/following/${actor._id}`, { token });
  console.log("GET following status:", foll.status, "| count:", Array.isArray(foll.json) ? foll.json.length : "n/a");

  if (Array.isArray(foll.json) && foll.json.length) {
    const target = foll.json[0];
    console.log("target._id (raw value):", JSON.stringify(target._id), "| type:", typeof target._id);
    console.log("isValidObjectId(target._id):", mongoose.isValidObjectId(target._id));

    // Mirror the frontend POST /messages/conversations with receiverId = String(target._id)
    const postBody = { receiverId: String(target._id) };
    console.log("POSTing body:", JSON.stringify(postBody));
    const r = await req("POST", "/messages/conversations", { body: postBody, token });
    console.log("POST conversations ->", r.status, JSON.stringify(r.json));
  }

  await mongoose.disconnect();
}
run().catch((e) => { console.error("FATAL", e); process.exit(1); });
