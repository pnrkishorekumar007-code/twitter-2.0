import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import mongoose from "mongoose";
import Tweet from "./models/tweet.js";

await mongoose.connect(process.env.MONGODB_URI);

const tweets = await Tweet.find({ image: { $ne: null } }).select("image timestamp").sort({ timestamp: -1 }).limit(40);
let bad = 0;
for (const t of tweets) {
  const url = t.image;
  const isBad =
    !url ||
    /^https:\/\/(www\.)?ibb\.co\//.test(url) || // viewer PAGE, not direct i.ibb.co
    !/^https:\/\//.test(url);
  if (isBad) {
    bad++;
    console.log("BAD:", JSON.stringify(url), "| ts:", t.timestamp);
  } else {
    console.log("OK :", url);
  }
}
console.log(`--- ${tweets.length} tweets with images, ${bad} bad`);
await mongoose.disconnect();
process.exit(0);
