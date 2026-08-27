/**
 * Strips sensitive/internal fields from a user document before sending
 * to the client. Used by every route that returns user data.
 */
const STRIP_FIELDS = [
  "password",
  "__v",
  "loginHistory",
  "lastPasswordResetRequest",
];

export default function sanitizeUser(u) {
  if (!u) return u;
  const obj = u.toObject ? u.toObject() : { ...u };
  for (const field of STRIP_FIELDS) {
    delete obj[field];
  }
  return obj;
}
