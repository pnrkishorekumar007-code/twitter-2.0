/**
 * Shared list of allowed frontend origins used by both CORS and CSRF middleware.
 * Single source of truth — parsed from the FRONTEND_ORIGIN env var.
 *
 * The default already covers local development AND the documented production
 * frontend (Vercel). If your Vercel project uses a different domain, set
 * FRONTEND_ORIGIN to a comma-separated list of your real origins — never "*".
 */
const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "https://twitter-2-0-twiller.vercel.app",
];

// If FRONTEND_ORIGIN is explicitly set on Render it must include EVERY origin
// that calls the API (including the Vercel domain) — it completely overrides
// these defaults.
export const ALLOWED_ORIGINS = (
  process.env.FRONTEND_ORIGIN || DEFAULT_ORIGINS.join(",")
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);