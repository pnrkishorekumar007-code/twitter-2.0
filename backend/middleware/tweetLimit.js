import User from "../models/user.js";
import { PLANS } from "../utils/plans.js";

// Downgrades a user back to FREE once their paid subscription period ends.
export async function applyPlanExpiry(user) {
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
    await user.save();
  }
  return user;
}

// Express middleware run right before a tweet is persisted.
// Works for both text tweets (body.author) and audio tweets (body.authorId).
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

    if (user.tweetsUsed >= user.tweetLimit) {
      return res.status(403).send({
        error: "Tweet limit reached. Upgrade your subscription plan to continue posting.",
      });
    }

    req.limitedUser = user;
    next();
  } catch (err) {
    return res.status(500).send({ error: err.message });
  }
}

// Increment the tweet counter only after the tweet is actually saved.
export async function incrementTweetUsed(author) {
  await User.findByIdAndUpdate(author, { $inc: { tweetsUsed: 1 } });
}
