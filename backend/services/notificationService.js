import User from "../models/user.js";
import { containsKeyword } from "../utils/keywordDetector.js";
import { broadcastKeywordTweet } from "../socket.js";

// Strip HTML and collapse whitespace so a notification body is clean. The
// content is intentionally NOT truncated — the spec requires the full tweet.
function sanitizeContent(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Keyword notifications: called after a tweet is created (text or audio).
 * If the content contains a monitored keyword, broadcasts a sanitized
 * "keyword-tweet" event to users who have keyword notifications enabled.
 *
 * Fire-and-forget — it never blocks the tweet-creation response.
 */
export async function notifyKeywordTweet(tweet) {
  try {
    const content = tweet?.content || "";
    if (!containsKeyword(content)) return false;

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

    broadcastKeywordTweet(payload);
    return true;
  } catch (err) {
    console.error("[keyword-notification]", err.message);
    return false;
  }
}
