// Keywords that trigger a browser notification when they appear in a new tweet.
// Kept server-side so the monitored set is a single source of truth shared by
// the detection logic and the notification-settings endpoint.
const DEFAULT_KEYWORDS = ["cricket", "science"];

function normalize(text) {
  return String(text || "").toLowerCase();
}

// Case-insensitive, substring match — "Cricket World Cup" and "cricket" both hit.
export function containsKeyword(text) {
  const content = normalize(text);
  if (!content) return false;
  return DEFAULT_KEYWORDS.some((keyword) => content.includes(keyword.toLowerCase()));
}

export { DEFAULT_KEYWORDS };
