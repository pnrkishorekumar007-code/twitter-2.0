/**
 * Shared list of allowed frontend origins used by both CORS and CSRF middleware.
 * Single source of truth — parsed from the FRONTEND_ORIGIN env var.
 */
export const ALLOWED_ORIGINS = (process.env.FRONTEND_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
