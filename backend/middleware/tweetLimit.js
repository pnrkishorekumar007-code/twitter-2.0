import User from "../models/user.js";
import { PLANS } from "../utils/plans.js";

// Current month key in IST (calendar-month quota reset).
function istMonthKey(date = new Date()) {
  const ist = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Downgrades a user back to FREE once their paid subscription period ends and
// resets the monthly posting counter when the IST calendar month changes.
export async function applyPlanExpiry(user) {
  const monthKey = istMonthKey();

  if (
    user.subscriptionPlan !== "FREE" &&
    user.subscriptionEndDate &&
    new Date(user.subscriptionEndDate) < new Date()
  ) {
    user.subscriptionPlan = "FREE";
    user.tweetLimit = PLANS.FREE.tweetLimit;
    user.tweetsUsed = 0;
    user.paymentStatus = "expired";
    user.subscriptionEndDate = null;
    user.quotaMonth = monthKey;
    await user.save();
    return user;
  }

  if (user.quotaMonth !== monthKey) {
    user.quotaMonth = monthKey;
    user.tweetsUsed = 0;
    await user.save();
  }
  return user;
}

// Express middleware run right before a tweet is persisted.
// Works for both text tweets (body.author) and audio tweets (body.authorId).
//
// Reserves the tweet slot ATOMICALLY with a conditional update so two
// concurrent requests can't both pass the "limit not reached" check and then
// both post (TOCTOU). If the downstream handler fails to persist the tweet it
// must call rollbackTweetUsed() to release the slot.
export async function requireTweetLimit(req, res, next) {
  try {
    const author = req.body?.author || req.body?.authorId;
    if (!author) {
      return res.status(400).send({ error: "Author is required" });
    }

    const user = await User.findById(author);
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    await applyPlanExpiry(user);

    // Atomically reserve one slot (unlimited plans never hit the guard).
    const reserved = await User.findOneAndUpdate(
      { _id: author, tweetsUsed: { $lt: user.tweetLimit } },
      { $inc: { tweetsUsed: 1 } },
      { new: true }
    );

    if (!reserved) {
      return res.status(403).send({
        error: "Tweet limit reached. Upgrade your subscription plan to continue posting.",
      });
    }

    req.limitedUser = reserved;
    next();
  } catch (err) {
    return res.status(500).send({ error: err.message });
  }
}

// Releases a reserved tweet slot when the tweet failed to persist.
export async function rollbackTweetUsed(author) {
  await User.updateOne(
    { _id: author },
    { $inc: { tweetsUsed: -1 }, $max: { tweetsUsed: 0 } }
  );
}
