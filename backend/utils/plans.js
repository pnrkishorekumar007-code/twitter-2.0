// Single source of truth for subscription plans. Plan names are validated
// on the server only — the frontend is never trusted with prices or limits.
export const PLANS = {
  FREE: { label: "Free", price: 0, tweetLimit: 1 },
  BRONZE: { label: "Bronze", price: 100, tweetLimit: 3 },
  SILVER: { label: "Silver", price: 300, tweetLimit: 5 },
  GOLD: { label: "Gold", price: 1000, tweetLimit: Infinity },
};

export function isUnlimited(planKey) {
  const plan = PLANS[planKey];
  return !!plan && plan.tweetLimit === Infinity;
}

// Finite value persisted for unlimited plans (Infinity becomes null in JSON)
export function storedTweetLimit(planKey) {
  const plan = PLANS[planKey];
  return isUnlimited(planKey) ? Number.MAX_SAFE_INTEGER : plan.tweetLimit;
}
