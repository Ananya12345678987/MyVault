// True when a rich-text note has nothing in it (an empty editor reports "<p></p>").
export function isEmptyHtml(html) {
  const text = String(html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  return text === "" && !/<(hr|img|li)\b/i.test(String(html || ""));
}
