import crypto from "crypto";

const SCRYPT_KEYLEN = 64;

// scrypt password hashing using Node's built-in crypto (no extra deps).
// Stored format:  scrypt$<salt-hex>$<derived-key-hex>
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto
    .scryptSync(String(password), salt, SCRYPT_KEYLEN)
    .toString("hex");
  return `scrypt$${salt}$${derived}`;
}
