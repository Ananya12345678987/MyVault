/*
 * Turn what the user typed ("reddit.com", "https://react.dev/") into a
 * link that is safe to open, or null. Only http and https are ever
 * returned, so "javascript:..." and friends can never become a link.
 */
export function safeHref(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(text);
  const href = hasScheme ? text : `https://${text}`;

  return /^https?:\/\//i.test(href) ? href : null;
}
