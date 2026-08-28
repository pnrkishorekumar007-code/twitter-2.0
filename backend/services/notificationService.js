import User from "../models/user.js";
import { containsKeyword } from "../utils/keywordDetector.js";
import { emitToUser } from "../socket.js";

// Strip HTML and collapse whitespace so a notification body is clean. The
// content is intentionally NOT truncated — the spec requires the full tweet.
function sanitizeContent(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeKeywordList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((k) => typeof k === "string" && k.trim()).map((k) => k.trim());
}

/**
 * Keyword notifications: called after a tweet is created (text or audio).
 * Every user with keyword notifications enabled has their own saved keyword
 * list. If the tweet content contains any of a user's keywords, emits a
 * "keyword-tweet" payload to that user's private socket room.
 *
 * Fire-and-forget — it never blocks the tweet-creation response.
 */
export async function notifyKeywordTweet(tweet) {
  try {
    const content = tweet?.content || "";
    if (!content) return false;

    const authorId = tweet.author?._id || tweet.author;
    let authorInfo = { username: "", displayName: "", avatar: "" };
    if (authorId) {
      const author = await User.findById(authorId)
        .select("username displayName avatar")
        .lean();
      if (author) {
        authorInfo = {
          username: author.username,
          displayName: author.displayName,
          avatar: author.avatar,
        };
      }
    }

    const payload = {
      tweetId: String(tweet._id),
      content: sanitizeContent(content),
      author: authorInfo,
      timestamp: tweet.timestamp || new Date().toISOString(),
    };

    // Every user keeps their own keyword list; only users whose saved
    // keywords appear in this tweet are notified.
    const users = await User.find({
      keywordNotifications: { $ne: false },
      keywords: { $exists: true, $ne: [] },
    })
      .select("_id keywords")
      .lean();

    let delivered = false;
    for (const user of users) {
      const list = sanitizeKeywordList(user.keywords);
      if (list.length && containsKeyword(content, list)) {
        emitToUser(user._id, "keyword-tweet", payload);
        delivered = true;
      }
    }
    return delivered;
  } catch (err) {
    console.error("[keyword-notification]", err.message);
    return false;
  }
}
