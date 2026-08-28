import crypto from "crypto";

// Random password using only uppercase + lowercase letters.
// NO numbers, NO special characters — per the task spec.
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";

function randomFrom(chars) {
  return chars[crypto.randomInt(0, chars.length)];
}

// Guarantees at least one uppercase and one lowercase letter, then fills
// the rest randomly. Length defaults to 10.
export function generateLetterPassword(length = 10) {
  if (!Number.isInteger(length) || length < 2) length = 10;
  const chars = [];
  chars.push(randomFrom(UPPER));
  chars.push(randomFrom(LOWER));
  for (let i = 2; i < length; i++) {
    chars.push(crypto.randomInt(0, 2) === 0 ? randomFrom(UPPER) : randomFrom(LOWER));
  }
  // Shuffle so the guaranteed letters aren't always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
