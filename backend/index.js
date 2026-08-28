import http from "http";
import dns from "dns";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Render's free tier has no IPv6 egress: Gmail SMTP resolves to an IPv6 address
// first, and with the default "verbatim" DNS order the connection stalls until
// timeout (ENETUNREACH). Prefer IPv4 globally so email/OTP sends complete.
dns.setDefaultResultOrder("ipv4first");
// Node on this Windows host fails to enumerate the system DNS resolver and
// falls back to 127.0.0.1, which refuses every lookup (ECONNREFUSED) — even
// google.com. Pin real resolvers so mongoose can resolve the Atlas SRV record.
dns.setServers(["8.8.8.8", "1.1.1.1"]);
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
import sanitizeUser from "./utils/sanitizeUser.js";
import { stripHtml } from "./utils/inputSanitize.js";
import { ALLOWED_ORIGINS } from "./utils/allowedOrigins.js";
import { csrfGuard } from "./middleware/csrfGuard.js";

import { requireTweetLimit, rollbackTweetUsed } from "./middleware/tweetLimit.js";
import { requireAnyAuth } from "./middleware/auth.js";
import { rateLimit } from "./utils/rateLimiter.js";
import { startScheduler } from "./utils/scheduler.js";
import { verifyEmailTransport } from "./utils/mailer.js";

dotenv.config();
const app = express();
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin ${origin} is not allowed`));
    },
    credentials: true,
  })
);
// Preserve the raw body for Razorpay webhook signature verification (must run
// before express.json() parses the body). The webhook handler reads req.rawBody.
app.use("/payment/webhook", (req, _res, next) => {
  let data = "";
  const MAX_WEBHOOK_BODY = 1024 * 1024; // 1 MB
  req.setEncoding("utf8");
  req.on("data", (chunk) => { data += chunk; if (data.length > MAX_WEBHOOK_BODY) { req.destroy(); } });
  req.on("end", () => { req.rawBody = data; next(); });
});
app.use(express.json());
app.use(cookieParser());
app.use(helmet({
  contentSecurityPolicy: false, // disabled to allow inline scripts/styles used by the frontend
  crossOriginEmbedderPolicy: false,
}));
app.use(csrfGuard);

const server = http.createServer(app);
initSocket(server);

app.get("/", (req, res) => {
  res.send("Twiller backend is running successfully");
});

app.use("/auth", authRoutes);
app.use("/payment", paymentRoutes);
// OTP protection middleware — only applies to mutating requests (POST, PATCH,
// PUT, DELETE). GET requests are always public so the feed, tweet details, and
// profile pages load without a session token.
app.use((req, res, next) => {
  if (req.method === "GET") return next();
  const open = ["/auth", "/register", "/login", "/login/start", "/login/verify", "/send-login-otp", "/verify-login-otp", "/auth/register-otp", "/auth/register-verify", "/auth/send-register-otp", "/payment/webhook", "/loggedinuser"]; // paths that do not require OTP
  if (open.some(p => req.path.startsWith(p))) return next();
  return ensureOtpVerified(req, res, next);
});

app.use("/", audioRoutes); // /audio/otp/request, /audio/upload
app.use("/", userRoutes); // /notifications/:email, /language/otp*, /profile/*
app.use("/", followRoutes); // /users/follow/:id, /users/followers/:id, ...
app.use("/", bookmarkRoutes); // /bookmarks, /bookmarks/ids, /bookmarks/:tweetId
app.use("/", messageRoutes); // /messages/conversations, /messages/:id, /messages/send

app.use((err, req, res, next) => {
  if (err?.name === "MulterError") {
    const msg =
      err.code === "LIMIT_FILE_SIZE"
        ? "Audio size must not exceed 100 MB."
        : err.message;
    return res.status(400).send({ success: false, message: msg, error: msg });
  }
  console.error(err);
  const isDev = process.env.NODE_ENV !== "production";
  return res.status(500).send({ error: isDev ? (err?.message || "Internal server error") : "Internal server error" });
});

const port = process.env.PORT || 5000;
const url = process.env.MONGODB_URL || process.env.MONGODB_URI;

if (!url) {
  console.error("❌ MONGODB_URL is not set. Add it to backend/.env.");
  process.exit(1);
}
if (url.includes("user:pass@") || url.includes("your_cloud_name")) {
  console.error("❌ MONGODB_URL still contains placeholder values. Replace it with your real MongoDB connection string in backend/.env");
  console.error("   Local dev:  mongodb://localhost:27017/twiller");
  console.error("   Atlas:      mongodb+srv://USER:PASSWORD@cluster.mongodb.net/twiller");
  process.exit(1);
}

mongoose
  .connect(url, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("✅ Connected to MongoDB");
    server.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      startScheduler();
      verifyEmailTransport();
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
    const limiter = rateLimit({ key: `register:${req.ip}`, windowMs: 60 * 60 * 1000, max: 10 });
    if (!limiter.allowed) {
      return res.status(429).send({ error: "Too many registration attempts. Please try again later." });
    }
    const email = normalizeEmail(req.body.email);
    if (!email || !REGISTER_EMAIL_RE.test(email)) {
      return res.status(400).send({ error: "Invalid email address." });
    }
    const existinguser = await findUserByEmail(email);
    if (existinguser) {
      return res.status(200).send(sanitizeUser(existinguser));
    }
    const body = { ...req.body, email };
    const newUser = new User(pickFields(body, REGISTER_FIELDS));
    await newUser.save();
    return res.status(201).send(sanitizeUser(newUser));
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// loggedinuser — rate limited to prevent enumeration attacks.
app.get("/loggedinuser", async (req, res) => {
  try {
    const limiter = rateLimit({ key: `loggedinuser:${req.ip}`, windowMs: 60 * 1000, max: 30 });
    if (!limiter.allowed) {
      return res.status(429).send({ error: "Too many requests. Please slow down." });
    }
    const email = normalizeEmail(req.query.email);
    if (!email) {
      return res.status(400).send({ error: "Email required" });
    }
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }
    return res.status(200).send(sanitizeUser(user));
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// update Profile — requires authentication; user can only update their own profile.
app.patch("/userupdate/:email", requireAnyAuth, async (req, res) => {
  try {
    const email = normalizeEmail(req.params.email);
    if (normalizeEmail(req.user?.email) !== email) {
      return res.status(403).send({ error: "You can only update your own profile." });
    }
    const updated = await User.findOneAndUpdate(
      { email },
      { $set: pickFields(req.body, PROFILE_FIELDS) },
      { new: true, upsert: false }
    );
    if (!updated) return res.status(404).send({ error: "User not found" });
    return res.status(200).send(sanitizeUser(updated));
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
      content: stripHtml(String(req.body?.content || "")).trim().slice(0, 200),
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
    await tweet.populate("author", "displayName username avatar verified");
    return res.status(201).send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// get all tweet — paginated for performance
app.get("/post", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const tweets = await Tweet.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "displayName username avatar verified")
      .lean();

    return res.status(200).send(tweets);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// get single tweet with replies
app.get("/tweet/:id", async (req, res) => {
  try {
    const tweet = await Tweet.findById(req.params.id)
      .populate("author", "displayName username avatar verified")
      .populate("replies.user", "displayName username avatar verified");
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
    const current = await User.findOne({ email: req.user?.email || "" })
      .select("following")
      .lean();
    if (!current) return res.status(404).send({ error: "User not found" });

    const following = (current.following || []).map((id) => id.toString());

    if (following.length === 0) return res.status(200).send([]);

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const tweets = await Tweet.find({ author: { $in: following } })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "displayName username avatar verified")
      .lean();

    return res.status(200).send(tweets);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// reply to a tweet
app.post("/tweet/:id/reply", requireAnyAuth, async (req, res) => {
  try {
    const limiter = rateLimit({ key: `reply:${req.user.uid}`, windowMs: 10 * 60 * 1000, max: 30 });
    if (!limiter.allowed) return res.status(429).send({ error: "Too many replies. Please slow down." });
    const userId = req.user.uid;
    const { content } = req.body;
    if (!userId) return res.status(400).send({ error: "UserId required" });
    if (!content || !content.trim())
      return res.status(400).send({ error: "Reply cannot be empty" });

    const trimmed = stripHtml(content).trim().slice(0, 280);
    const tweet = await Tweet.findById(req.params.id);
    if (!tweet) return res.status(404).send({ error: "Tweet not found" });

    tweet.replies.push({ user: userId, content: trimmed });
    tweet.comments = tweet.replies.length;
    await tweet.save();

    const updated = await Tweet.findById(req.params.id)
      .populate("author", "displayName username avatar verified")
      .populate("replies.user", "displayName username avatar verified");
    return res.status(201).send(updated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
//  LIKE TWEET — atomic toggle (no TOCTOU race)
app.post("/like/:tweetid", requireAnyAuth, async (req, res) => {
  try {
    const limiter = rateLimit({ key: `like:${req.user.uid}`, windowMs: 10 * 60 * 1000, max: 60 });
    if (!limiter.allowed) return res.status(429).send({ error: "Too many requests. Please slow down." });
    const userId = req.user.uid;
    const tweetId = req.params.tweetid;
    // Try to add the like atomically (only if user not already in array)
    const added = await Tweet.findOneAndUpdate(
      { _id: tweetId, likedBy: { $ne: userId } },
      { $addToSet: { likedBy: userId }, $inc: { likes: 1 } },
      { new: true }
    ).populate("author", "displayName username avatar verified");

    if (added) return res.send(added);

    // User already liked — remove atomically
    const removed = await Tweet.findOneAndUpdate(
      { _id: tweetId, likedBy: userId },
      { $pull: { likedBy: userId }, $inc: { likes: -1 } },
      { new: true }
    ).populate("author", "displayName username avatar verified");

    if (!removed) return res.status(404).send({ error: "Tweet not found" });
    res.send(removed);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// retweet — atomic toggle (no TOCTOU race)
app.post("/retweet/:tweetid", requireAnyAuth, async (req, res) => {
  try {
    const limiter = rateLimit({ key: `retweet:${req.user.uid}`, windowMs: 10 * 60 * 1000, max: 30 });
    if (!limiter.allowed) return res.status(429).send({ error: "Too many retweets. Please slow down." });
    const userId = req.user.uid;
    const tweetId = req.params.tweetid;
    const added = await Tweet.findOneAndUpdate(
      { _id: tweetId, retweetedBy: { $ne: userId } },
      { $addToSet: { retweetedBy: userId }, $inc: { retweets: 1 } },
      { new: true }
    ).populate("author", "displayName username avatar verified");

    if (added) return res.send(added);

    const removed = await Tweet.findOneAndUpdate(
      { _id: tweetId, retweetedBy: userId },
      { $pull: { retweetedBy: userId }, $inc: { retweets: -1 } },
      { new: true }
    ).populate("author", "displayName username avatar verified");

    if (!removed) return res.status(404).send({ error: "Tweet not found" });
    res.send(removed);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
