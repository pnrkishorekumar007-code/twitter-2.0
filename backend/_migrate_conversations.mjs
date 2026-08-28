import dotenv from "dotenv";
import path from "path";
import dns from "dns";
import { fileURLToPath } from "url";
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env") });
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import mongoose from "mongoose";

const url = process.env.MONGODB_URL;
const keyOf = (arr) => (arr || []).map((x) => String(x)).sort().join("_");

async function run() {
  await mongoose.connect(url, { serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;
  const convs = db.collection("conversations");

  // 1) Drop the broken unique multikey index on the participants ARRAY.
  //    A unique index on an array is enforced per-element, which is what made a
  //    user able to live in only one conversation (HTTP 400 duplicate key).
  try {
    await convs.dropIndex("participants_1");
    console.log("dropped old index participants_1 (unique multikey)");
  } catch (e) {
    console.log("participants_1 drop skipped:", e.message);
  }

  // 2) Backfill participantsKey for every existing conversation.
  const all = await convs.find({}).toArray();
  console.log("existing conversations:", all.length);

  // Detect duplicate pairs first (sanitize before adding the unique key).
  const seen = new Map();
  let dups = 0;
  for (const c of all) {
    const k = keyOf(c.participants);
    if (seen.has(k)) { dups++; console.log("DUPLICATE pair found:", k, String(seen.get(k)), "+", String(c._id)); }
    else seen.set(k, String(c._id));
  }
  if (dups > 0) {
    console.error("ABORT: duplicate pairs exist; resolve before re-running.");
    await mongoose.disconnect();
    process.exit(1);
  }

  for (const c of all) {
    const k = keyOf(c.participants);
    await convs.updateOne({ _id: c._id }, { $set: { participantsKey: k } });
  }
  console.log("backfilled participantsKey on", all.length, "conversations");

  // 3) Rebuild indexes: participants non-unique (for $in queries) + the new
  //    unique order-independent participantsKey.
  const idx = await convs.indexes();
  console.log("indexes after migration:");
  for (const i of idx) console.log("  ", JSON.stringify(i));
  console.log("DONE");
  await mongoose.disconnect();
}
run().catch((e) => { console.error("FATAL", e); process.exit(1); });
