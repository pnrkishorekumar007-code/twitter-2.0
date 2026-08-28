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
  const actor = "6a7aca7d314b17cdf5eaf75b";
  const docs = await convs.find({ participants: new mongoose.Types.ObjectId(actor) }).toArray();
  console.log("conversations containing actor 6a7aca...75b:", docs.length);
  for (const d of docs) {
    console.log("  ", String(d._id), "participants:", (d.participants || []).map(p=>String(p)).join(","));
  }
  console.log("\nAll conversations in DB:");
  const all = await convs.find({}).toArray();
  for (const d of all) {
    console.log("  [", String(d._id), "] participants:", (d.participants||[]).map(p=>String(p)).join(","));
  }
  await mongoose.disconnect();
}
run().catch((e) => { console.error("FATAL", e); process.exit(1); });
