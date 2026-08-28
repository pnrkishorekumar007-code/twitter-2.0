// Keyword matching for browser notifications. The monitored set is the
// keyword list owned by each individual user (stored on the User document),
// so detection is always scoped to a provided list rather than a global one.

function normalize(text) {
  return String(text || "").toLowerCase();
}

// Case-insensitive, substring match — "Cricket World Cup" and "cricket" both hit.
export function containsKeyword(text, keywords = []) {
  const content = normalize(text);
  if (!content) return false;
  const list = (keywords || []).filter(Boolean).map((k) => normalize(k));
  if (list.length === 0) return false;
  return list.some((keyword) => content.includes(keyword));
}
