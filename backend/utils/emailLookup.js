import User from "../models/user.js";

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// Finds a user by email regardless of the case stored in the database.
// Emails were historically persisted exactly as the client sent them, while
// every lookup (login, OTP, password reset) normalizes to lowercase — so any
// account whose email contains an uppercase letter was invisible and could
// never log in. Exact match first, then a case-insensitive fallback that also
// covers legacy mixed-case records.
export async function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return User.findOne({
    $or: [
      { email: normalized },
      { email: { $regex: new RegExp(`^${escapeRegExp(normalized)}$`, "i") } },
    ],
  });
}
