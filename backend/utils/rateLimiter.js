// Lightweight in-memory sliding-window rate limiter.
//
// ✅ Single-process deployments (Render free tier, single dyno): fully safe.
// ⚠️  Multi-instance deployments (horizontal scaling): this limiter is per-
//    process and will NOT share state across instances.  For those, swap the
//    internals for a Redis-backed store (e.g. `@upstash/ratelimit`) while
//    keeping the same exported API.
//
// The periodic sweep ensures the Map never grows unbounded.

const buckets = new Map();
const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // run every 5 min
const STALE_THRESHOLD_MS = 15 * 60 * 1000; // drop entries older than 15 min

/**
 * @param {object} opts
 * @param {string} opts.key        unique bucket key, e.g. `login-otp:USERID`
 * @param {number} opts.windowMs   sliding window length in ms
 * @param {number} opts.max        max allowed requests per window
 * @returns {{ allowed: boolean, retryAfterMs: number }}
 */
export function rateLimit({ key, windowMs, max }) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = [];
    buckets.set(key, bucket);
  }
  while (bucket.length && bucket[0] <= now - windowMs) bucket.shift();

  if (bucket.length >= max) {
    return {
      allowed: false,
      retryAfterMs: Math.max(bucket[0] + windowMs - now, 0),
    };
  }
  bucket.push(now);
  return { allowed: true, retryAfterMs: 0 };
}

// Periodic sweep so the map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, arr] of buckets) {
    while (arr.length && arr[0] <= now - STALE_THRESHOLD_MS) arr.shift();
    if (arr.length === 0) buckets.delete(key);
  }
}, SWEEP_INTERVAL_MS).unref?.();

// Expose bucket count for health-check endpoints or logging.
export function getActiveBucketCount() {
  return buckets.size;
}

// Warn once at import time if scaling beyond a single process is detected.
if (process.env.WEB_CONCURRENCY && Number(process.env.WEB_CONCURRENCY) > 1) {
  console.warn(
    "⚠️  Rate limiter is in-memory and NOT shared across processes. " +
    "Set REDIS_URL and swap to a Redis-backed limiter for horizontal scaling."
  );
}
