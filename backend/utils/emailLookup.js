import User from "../models/user.js";

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// Finds a user by email regardless of the case stored in the database.
// Uses .lean() for read-only performance — returns plain JS objects instead
// of Mongoose documents (2-5x faster for reads).
export async function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return User.findOne({
    $or: [
      { email: normalized },
      { email: { $regex: new RegExp(`^${escapeRegExp(normalized)}$`, "i") } },
    ],
  }).lean();
}
