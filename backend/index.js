import http from "http";
import dns from "dns";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Render's free tier has no IPv6 egress: Gmail SMTP resolves to an IPv6 address
// first, and with the default "verbatim" DNS order the connection stalls until
// timeout (ENETUNREACH). Prefer IPv4 globally so email/OTP sends complete.
dns.setDefaultResultOrder("ipv4first");
import User from "./models/user.js";
import Tweet from "./models/tweet.js";
import { initSocket } from "./socket.js";
import { notifyKeywordTweet } from "./services/notificationService.js";

import authRoutes from "./routes/auth.js";
import paymentRoutes from "./routes/payment.js";
import audioRoutes from "./routes/audio.js";
import userRoutes from "./routes/user.js";
import followRoutes from "./routes/follow.js";
import bookmarkRoutes from "./routes/bookmarks.js";
import messageRoutes from "./routes/messages.js";
import { ensureOtpVerified } from "./middleware/otpGuardMiddleware.js";
import { findUserByEmail, normalizeEmail } from "./utils/emailLookup.js";

import { requireTweetLimit, rollbackTweetUsed } from "./middleware/tweetLimit.js";
import { requireAnyAuth } from "./middleware/auth.js";
import { rateLimit } from "./utils/rateLimiter.js";

dotenv.config();
const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin ${origin} is not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const server = http.createServer(app);
initSocket(server);

app.get("/", (req, res) => {
  res.send("Twiller backend is running successfully");
});

app.use("/auth", authRoutes);
app.use("/payment", paymentRoutes);
// OTP protection middleware for all routes except the open auth/registration flows
app.use((req, res, next) => {
  const open = ["/auth", "/register", "/login", "/login/start", "/login/verify", "/send-login-otp", "/verify-login-otp", "/auth/register-otp", "/auth/register-verify", "/auth/send-register-otp"]; // paths that do not require OTP
  if (open.some(p => req.path.startsWith(p))) return next();
  return ensureOtpVerified(req, res, next);
});

app.use("/", audioRoutes); // /audio/otp/request, /audio/upload
app.use("/", userRoutes); // /notifications/:email, /language/otp*, /profile/*
app.use("/api", userRoutes); // alias so /api/profile/update and /api/profile/banner also work
app.use("/", followRoutes); // /users/follow/:id, /users/followers/:id, ...
app.use("/api", followRoutes); // alias so /api/users/* also works
app.use("/", bookmarkRoutes); // /bookmarks, /bookmarks/ids, /bookmarks/:tweetId
app.use("/api", bookmarkRoutes); // alias so /api/bookmarks* also works
app.use("/", messageRoutes); // /messages/conversations, /messages/:id, /messages/send
app.use("/api", messageRoutes); // alias so /api/messages* also works

app.use((err, req, res, next) => {
  if (err?.name === "MulterError") {
    const msg =
      err.code === "LIMIT_FILE_SIZE"
        ? "Audio size must not exceed 100 MB."
        : err.message;
    return res.status(400).send({ success: false, message: msg, error: msg });
  }
  console.error(err);
  return res.status(500).send({ error: err?.message || "Internal server error" });
});

const port = process.env.PORT || 5000;
const url = process.env.MONGODB_URL || process.env.MONGODB_URI || process.env.MONOGDB_URL;

if (!url) {
  console.error("❌ MONGODB_URL is not set. Add it to backend/.env.");
  process.exit(1);
}

mongoose
  .connect(url)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    server.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });

// Register — only whitelisted profile fields are persisted. Plan/tweet-limit
// fields are never accepted from the client (otherwise anyone could self-assign
// GOLD just by posting { subscriptionPlan: "GOLD" }).
const REGISTER_FIELDS = [
  "username",
  "displayName",
  "avatar",
  "email",
  "phone",
  "banner",
  "bio",
  "location",
  "website",
  "preferredLanguage",
];

// Only these profile fields are editable through the (legacy) unauthenticated
// /userupdate/:email route. Subscription fields are strictly forbidden here.
const PROFILE_FIELDS = [
  "displayName",
  "bio",
  "location",
  "website",
  "avatar",
  "banner",
  "accountType",
  "phone",
];

function pickFields(body, allowed) {
  const out = {};
  for (const key of allowed) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

// Pins the tweet author to the authenticated session. The client-supplied
// author id is ignored so users can't post (or burn quota) as someone else.
async function pinTextAuthor(req, res, next) {
  try {
    const user = await User.findOne({ email: req.user?.email || "" });
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }
    req.body = req.body || {};
    req.body.author = String(user._id);
    req.body.authorId = String(user._id);
    next();
  } catch (err) {
    return res.status(500).send({ error: err.message });
  }
}

const REGISTER_EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

app.post("/register", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email || !REGISTER_EMAIL_RE.test(email)) {
      return res.status(400).send({ error: "Invalid email address." });
    }
    const existinguser = await findUserByEmail(email);
    if (existinguser) {
      return res.status(200).send(existinguser);
    }
    const body = { ...req.body, email };
    const newUser = new User(pickFields(body, REGISTER_FIELDS));
    await newUser.save();
    return res.status(201).send(newUser);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// loggedinuser
app.get("/loggedinuser", async (req, res) => {
  try {
    const email = normalizeEmail(req.query.email);
    if (!email) {
      return res.status(400).send({ error: "Email required" });
    }
    const user = await findUserByEmail(email);
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
    const email = normalizeEmail(req.params.email);
    const updated = await User.findOneAndUpdate(
      { email },
      { $set: pickFields(req.body, PROFILE_FIELDS) },
      { new: true, upsert: false }
    );
    return res.status(200).send(updated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// Tweet API

// POST — enforces the subscription tweet-limit (per plan: FREE=1, BRONZE=3,
// SILVER=5, GOLD=unlimited). The counter increments only on successful save
// and the author is pinned from the authenticated session.
app.post("/post", pinTextAuthor, requireTweetLimit, async (req, res) => {
  try {
    // Rate limit tweet creation: max 20 per 10 minutes per account.
    const limiter = rateLimit({
      key: `tweet:${req.body.author}`,
      windowMs: 10 * 60 * 1000,
      max: 20,
    });
    if (!limiter.allowed) {
      await rollbackTweetUsed(req.body.author);
      return res.status(429).send({
        error: "You are posting too fast. Please slow down.",
      });
    }

    // Audio tweets must go through /audio/upload (OTP + 2-7PM window); posting
    // one via the text endpoint would bypass those protections.
    if (req.body?.type === "audio") {
      await rollbackTweetUsed(req.body.author);
      return res.status(400).send({
        error: "Audio tweets must be posted through the audio upload flow.",
      });
    }

    const tweet = new Tweet({
      author: req.body.author,
      content: String(req.body?.content || "").trim().slice(0, 200),
      image: req.body?.image || null,
      type: "text",
    });
    try {
      await tweet.save();
    } catch (saveErr) {
      await rollbackTweetUsed(req.body.author);
      throw saveErr;
    }
    notifyKeywordTweet(tweet);
    await tweet.populate("author");
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
// get single tweet with replies
app.get("/tweet/:id", async (req, res) => {
  try {
    const tweet = await Tweet.findById(req.params.id)
      .populate("author")
      .populate("replies.user");
    if (!tweet) return res.status(404).send({ error: "Tweet not found" });
    return res.status(200).send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// get the signed-in user's following feed — ONLY tweets from accounts the
// current user follows, newest first. The `following` array only ever contains
// accepted follows (public follows + approved private requests), so private
// pending requests are excluded automatically.
app.get(["/tweets/following", "/feed/following"], requireAnyAuth, async (req, res) => {
  try {
    const current = await User.findOne({ email: req.user?.email || "" });
    if (!current) return res.status(404).send({ error: "User not found" });

    const following = (current.following || []).map((id) => id.toString());

    if (following.length === 0) return res.status(200).send([]);

    const tweet = await Tweet.find({ author: { $in: following } })
      .sort({ timestamp: -1 })
      .populate("author");

    return res.status(200).send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// reply to a tweet
app.post("/tweet/:id/reply", async (req, res) => {
  try {
    const { userId, content } = req.body;
    if (!userId) return res.status(400).send({ error: "UserId required" });
    if (!content || !content.trim())
      return res.status(400).send({ error: "Reply cannot be empty" });

    const tweet = await Tweet.findById(req.params.id);
    if (!tweet) return res.status(404).send({ error: "Tweet not found" });

    tweet.replies.push({ user: userId, content: content.trim() });
    tweet.comments = tweet.replies.length;
    await tweet.save();

    const updated = await Tweet.findById(req.params.id)
      .populate("author")
      .populate("replies.user");
    return res.status(201).send(updated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
//  LIKE TWEET
app.post("/like/:tweetid", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweetid);
    const alreadyLiked = tweet.likedBy.some(
      (id) => String(id) === String(userId)
    );
    if (!alreadyLiked) {
      tweet.likes += 1;
      tweet.likedBy.push(userId);
    } else {
      tweet.likes = Math.max(0, tweet.likes - 1);
      tweet.likedBy = tweet.likedBy.filter((id) => String(id) !== String(userId));
    }
    await tweet.save();
    await tweet.populate("author");
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
    const alreadyRetweeted = tweet.retweetedBy.some(
      (id) => String(id) === String(userId)
    );
    if (!alreadyRetweeted) {
      tweet.retweets += 1;
      tweet.retweetedBy.push(userId);
    } else {
      tweet.retweets = Math.max(0, tweet.retweets - 1);
      tweet.retweetedBy = tweet.retweetedBy.filter(
        (id) => String(id) !== String(userId)
      );
    }
    await tweet.save();
    await tweet.populate("author");
    res.send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
