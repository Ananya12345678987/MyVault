/*
 * Turn what the user typed ("reddit.com", "https://react.dev/") into a
 * link that is safe to open, or null. Only http and https are ever
 * returned, so "javascript:..." and friends can never become a link.
 */
export function safeHref(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  // "localhost:3000" is a host and a port, not a scheme called "localhost".
  const hostAndPort = /^[^\s/@:]+:\d+(?:[/?#]|$)/.test(text);
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) && !hostAndPort;
  const href = hasScheme ? text : `https://${text}`;

  if (!/^https?:\/\//i.test(href) || /\s/.test(href)) return null;
  try {
    return new URL(href).hostname ? href : null;
  } catch {
    return null;
  }
}

/*
 * What gets stored for a website address: "react.dev" becomes
 * "https://react.dev". Anything that is not a safe http(s) address is
 * returned unchanged so the form can report it.
 */
export function normalizeUrl(value) {
  const text = String(value || "").trim();
  return safeHref(text) || text;
}
