import User from "../models/user.js";
import { PLANS } from "./plans.js";

// Current IST month key (e.g. "2026-08").
function istMonthKey(date = new Date()) {
  const ist = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Batch-downgrade expired subscriptions. Runs in a single bulk write so it
// doesn't need to load every user document into memory.
async function revertExpiredSubscriptions() {
  const now = new Date();
  const result = await User.updateMany(
    {
      subscriptionPlan: { $ne: "FREE" },
      subscriptionEndDate: { $ne: null, $lt: now },
    },
    {
      $set: {
        subscriptionPlan: "FREE",
        tweetLimit: PLANS.FREE.tweetLimit,
        tweetsUsed: 0,
        paymentStatus: "expired",
        subscriptionEndDate: null,
        quotaMonth: istMonthKey(now),
      },
    }
  );
  if (result.modifiedCount > 0) {
    console.log(
      `[scheduler] Reverted ${result.modifiedCount} expired subscription(s) to FREE`
    );
  }
}

// Reset monthly tweet counters for users whose quotaMonth is stale.
async function resetMonthlyQuotas() {
  const month = istMonthKey();
  const result = await User.updateMany(
    {
      quotaMonth: { $ne: month },
      tweetLimit: { $gt: 0 },
    },
    {
      $set: { tweetsUsed: 0, quotaMonth: month },
    }
  );
  if (result.modifiedCount > 0) {
    console.log(
      `[scheduler] Reset tweet quota for ${result.modifiedCount} user(s) (new month: ${month})`
    );
  }
}

// Combined job: runs both maintenance tasks. Errors are logged but never
// crash the server — this is fire-and-forget background work.
async function runMaintenanceJobs() {
  try {
    await revertExpiredSubscriptions();
  } catch (err) {
    console.error("[scheduler] Expired subscription revert failed:", err.message);
  }
  try {
    await resetMonthlyQuotas();
  } catch (err) {
    console.error("[scheduler] Monthly quota reset failed:", err.message);
  }
}

// Start the periodic scheduler. Runs immediately on boot (after a short
// delay so the server can finish starting) then every INTERVAL_MS.
const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function startScheduler() {
  // First run after 30 seconds (let the server settle).
  setTimeout(() => {
    runMaintenanceJobs();
    setInterval(runMaintenanceJobs, INTERVAL_MS);
    console.log(`[scheduler] Running every ${INTERVAL_MS / 60000} min`);
  }, 30_000);
}
