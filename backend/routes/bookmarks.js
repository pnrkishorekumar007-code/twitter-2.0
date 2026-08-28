import express from "express";
import mongoose from "mongoose";
import User from "../models/user.js";
import Tweet from "../models/tweet.js";
import Bookmark from "../models/bookmark.js";
import { requireAnyAuth } from "../middleware/auth.js";

const router = express.Router();

const TWEET_AUTHOR_SELECT = "displayName username avatar verified";

async function resolveCurrentUser(req, res) {
  const user = await User.findOne({ email: req.user?.email || "" });
  if (!user) {
    res.status(404).send({ error: "User not found" });
    return null;
  }
  return user;
}

/**
 * GET /api/bookmarks
 * The signed-in user's bookmarked tweets, newest bookmark first, with the
 * tweet's author populated. Returns the tweets directly so the UI can render
 * them like any other feed.
 */
router.get("/bookmarks", requireAnyAuth, async (req, res) => {
  try {
    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    const docs = await Bookmark.find({ userId: current._id })
      .sort({ createdAt: -1 })
      .populate({
        path: "tweetId",
        populate: { path: "author", select: TWEET_AUTHOR_SELECT },
      })
      .lean();

    const tweets = docs
      .filter((d) => d.tweetId)
      .map((d) => ({ ...d.tweetId, bookmarkedAt: d.createdAt }));

    return res.status(200).send(tweets);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * GET /api/bookmarks/ids
 * Only the bookmarked tweet ids — drives the bookmark icon state across the
 * whole app (feed, detail modal, bookmarks page) without shipping full tweets.
 */
router.get("/bookmarks/ids", requireAnyAuth, async (req, res) => {
  try {
    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    const docs = await Bookmark.find({ userId: current._id })
      .select("tweetId")
      .lean();
    return res.status(200).send(docs.map((d) => String(d.tweetId)));
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * POST /api/bookmarks/:tweetId
 * Adds a bookmark. Idempotent — bookmarking a tweet that is already saved is
 * a no-op (the unique index prevents duplicates).
 */
router.post("/bookmarks/:tweetId", requireAnyAuth, async (req, res) => {
  try {
    const { tweetId } = req.params;
    if (!mongoose.isValidObjectId(tweetId)) {
      return res.status(400).send({ error: "Invalid tweet id" });
    }

    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) return res.status(404).send({ error: "Tweet not found" });

    await Bookmark.updateOne(
      { userId: current._id, tweetId },
      { $setOnInsert: { userId: current._id, tweetId } },
      { upsert: true }
    );

    return res.status(200).send({ success: true, bookmarked: true });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * DELETE /api/bookmarks/:tweetId
 * Removes a bookmark. Idempotent — removing a tweet that isn't saved is a no-op.
 */
router.delete("/bookmarks/:tweetId", requireAnyAuth, async (req, res) => {
  try {
    const { tweetId } = req.params;
    if (!mongoose.isValidObjectId(tweetId)) {
      return res.status(400).send({ error: "Invalid tweet id" });
    }

    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    await Bookmark.deleteOne({ userId: current._id, tweetId });

    return res.status(200).send({ success: true, bookmarked: false });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

export default router;
