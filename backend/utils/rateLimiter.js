// Lightweight in-memory sliding-window rate limiter. Suitable for a single
// Node process (this app's deployment). For multi-instance setups, swap the
// internals for a Redis-backed limiter — the exported API stays the same.
const buckets = new Map();

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

// Periodic sweep so the map doesn't grow forever. Keeps entries for the
// longest window we ever use (10 min) plus a small margin.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, arr] of buckets) {
      while (arr.length && arr[0] <= now - 15 * 60 * 1000) arr.shift();
      if (arr.length === 0) buckets.delete(key);
    }
  },
  5 * 60 * 1000
).unref?.();
