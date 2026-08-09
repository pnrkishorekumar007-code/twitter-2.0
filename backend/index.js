import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/user.js";
import Tweet from "./models/tweet.js";

import authRoutes from "./routes/auth.js";
import paymentRoutes from "./routes/payment.js";
import audioRoutes from "./routes/audio.js";
import userRoutes from "./routes/user.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Twiller backend is running successfully");
});

app.use("/auth", authRoutes);
app.use("/payment", paymentRoutes);
app.use("/", audioRoutes); // /audio/otp/request, /audio/upload
app.use("/", userRoutes); // /notifications/:email, /language/otp/*

const port = process.env.PORT || 5000;
const url = process.env.MONGODB_URL || process.env.MONOGDB_URL; // support old typo'd env var too

mongoose
  .connect(url)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });

//Register
app.post("/register", async (req, res) => {
  try {
    const existinguser = await User.findOne({ email: req.body.email });
    if (existinguser) {
      return res.status(200).send(existinguser);
    }
    const newUser = new User(req.body);
    await newUser.save();
    return res.status(201).send(newUser);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// loggedinuser
app.get("/loggedinuser", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).send({ error: "Email required" });
    }
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }
    return res.status(200).send(user);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// update Profile
app.patch("/userupdate/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const updated = await User.findOneAndUpdate(
      { email },
      { $set: req.body },
      { new: true, upsert: false }
    );
    return res.status(200).send(updated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// Tweet API

// POST — now enforces the subscription tweet-limit (Task 1)
app.post("/post", async (req, res) => {
  try {
    const { author } = req.body;
    const user = await User.findById(author);
    if (!user) return res.status(404).send({ error: "User not found" });

    // reset monthly cycle if it has rolled over
    const cycleAge = Date.now() - new Date(user.subscription.cycleStart).getTime();
    if (cycleAge > 30 * 24 * 60 * 60 * 1000) {
      user.subscription.tweetsUsedThisCycle = 0;
      user.subscription.cycleStart = new Date();
    }

    if (user.subscription.tweetsUsedThisCycle >= user.subscription.tweetLimit) {
      return res.status(403).send({
        error: `You've hit your ${user.subscription.plan} plan's tweet limit (${user.subscription.tweetLimit}/month). Upgrade your plan to post more.`,
      });
    }

    const tweet = new Tweet(req.body);
    await tweet.save();

    user.subscription.tweetsUsedThisCycle += 1;
    await user.save();

    return res.status(201).send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// get all tweet
app.get("/post", async (req, res) => {
  try {
    const tweet = await Tweet.find().sort({ timestamp: -1 }).populate("author");
    return res.status(200).send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
//  LIKE TWEET
app.post("/like/:tweetid", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet.likedBy.includes(userId)) {
      tweet.likes += 1;
      tweet.likedBy.push(userId);
      await tweet.save();
    }
    res.send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// retweet
app.post("/retweet/:tweetid", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet.retweetedBy.includes(userId)) {
      tweet.retweets += 1;
      tweet.retweetedBy.push(userId);
      await tweet.save();
    }
    res.send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
