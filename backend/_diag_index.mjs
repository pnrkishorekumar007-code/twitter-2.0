import dotenv from "dotenv";
import path from "path";
import dns from "dns";
import { fileURLToPath } from "url";
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env") });
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import mongoose from "mongoose";

const url = process.env.MONGODB_URL;

async function run() {
  await mongoose.connect(url, { serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;
  const convs = db.collection("conversations");

  const indexes = await convs.indexes();
  console.log("=== conversations indexes ===");
  for (const i of indexes) console.log(JSON.stringify(i));

  const total = await convs.countDocuments();
  console.log("total conversations:", total);

  // Find duplicates by normalized participants (string compare).
  const all = await convs.find({}, { projection: { participants: 1 } }).toArray();
  const norm = (arr) => arr.map((x) => String(x)).sort().join("|");
  const groups = new Map();
  for (const c of all) {
    const k = norm(c.participants || []);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(String(c._id));
  }
  let dupCount = 0;
  for (const [k, ids] of groups) {
    if (ids.length > 1) {
      dupCount++;
      console.log("DUPLICATE pair", k, "->", ids.join(", "));
    }
  }
  console.log("duplicate pairs:", dupCount);

  await mongoose.disconnect();
}
run().catch((e) => { console.error("FATAL", e); process.exit(1); });
