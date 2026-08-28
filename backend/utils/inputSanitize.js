/**
 * Strips HTML tags from user-generated content to prevent stored XSS.
 * This is a defense-in-depth measure — React escapes output by default,
 * but API consumers or future server-rendered content may not.
 */
export function stripHtml(input) {
  if (typeof input !== "string") return input;
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Sanitizes a string for safe storage: strips HTML, trims whitespace,
 * and limits length.
 */
export function sanitizeContent(input, maxLength = Infinity) {
  if (typeof input !== "string") return "";
  const cleaned = stripHtml(input).trim();
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}
