/**
 * Lightweight CSRF defense for API-only SPAs.
 *
 * Traditional CSRF tokens are unnecessary when:
 * 1. Auth cookies use `sameSite: "strict"` (browser won't send them cross-origin)
 * 2. CORS is locked to a specific origin whitelist
 *
 * As defense-in-depth, this middleware rejects state-changing requests (POST,
 * PUT, PATCH, DELETE) when the Origin header is present but doesn't match the
 * allowed frontend origin. This blocks CSRF from rogue origins even if a
 * browser bug bypasses sameSite.
 *
 * Requests without an Origin header (same-origin nav, server-to-server, curl)
 * are allowed through — same-origin requests don't set Origin.
 */
import { ALLOWED_ORIGINS } from "../utils/allowedOrigins.js";

export function csrfGuard(req, res, next) {
  const origin = req.headers.origin;
  // No Origin header = same-origin request or non-browser client → allow.
  if (!origin) return next();

  const normalised = origin.replace(/\/+$/, "");
  const allowed = ALLOWED_ORIGINS.some((o) => normalised === o || normalised === o.replace(/\/+$/, ""));
  if (allowed) return next();

  return res.status(403).send({ error: "CSRF origin mismatch" });
}
