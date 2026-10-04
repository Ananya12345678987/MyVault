import { looksSensitive, newField } from "./fields";

/*
 * Reads the text of a .env file in the browser. Nothing is uploaded or
 * logged: the text is parsed in memory and the variables go into the
 * editor's rows, from where they are saved (encrypted, if the item is
 * protected) only when the user clicks Save.
 *
 * Follows the same rules as the popular `dotenv` package, so a file reads
 * the same here as it does in the app that uses it:
 *   - `export NAME=value` is accepted; lines without `=` and comments are skipped
 *   - "double", 'single' and `backtick` quotes may span several lines
 *   - \n and \r inside double quotes become real line breaks
 *   - an unquoted value ends at the first `#`
 *   - if a name appears twice, the last value wins
 */

export const MAX_ENV_BYTES = 1024 * 1024; // 1 MB is far more than any .env file
export const MAX_FIELDS = 100; // the backend's limit per item

const ASSIGNMENT = /^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*)$/;

// Index of the closing quote in `text` (which starts AFTER the opening
// quote), skipping backslash-escaped quotes. -1 if there isn't one.
function closingQuote(text, quote) {
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\\") {
      i++;
    } else if (text[i] === quote) {
      return i;
    }
  }
  return -1;
}

export function parseEnv(input) {
  const text = String(input ?? "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const values = new Map(); // keeps first-seen order, last value wins

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(ASSIGNMENT);
    if (!match) continue;

    const key = match[1];
    const rest = match[2];
    const quote = rest[0];
    let value;

    if (quote === '"' || quote === "'" || quote === "`") {
      let body = rest.slice(1);
      let end = closingQuote(body, quote);
      let last = i;

      // A quoted value can continue on the following lines.
      while (end === -1 && last + 1 < lines.length) {
        last++;
        body += `\n${lines[last]}`;
        end = closingQuote(body, quote);
      }

      // Only spaces and a comment may follow the closing quote.
      const tidyEnd = end !== -1 && /^\s*(#.*)?$/.test(body.slice(end + 1));

      if (!tidyEnd) {
        // Never closed, or stray text after the quote: read it as an
        // unquoted value instead (what dotenv does as well).
        value = rest.split("#")[0].trim();
      } else {
        value = body.slice(0, end);
        if (quote === '"') value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
        i = last; // skip the lines the value consumed
      }
    } else {
      value = rest.split("#")[0].trim();
    }

    values.set(key, value);
  }

  return [...values].map(([key, value]) => ({ key, value }));
}

/**
 * Put parsed variables into the editor's rows.
 *  - blank starter rows are dropped
 *  - a name that already has a row gets that row's value replaced
 *  - everything else becomes a new row, protected if its name looks secret
 * Returns { rows, added, updated } or { error }.
 */
export function mergeEnvEntries(rows, entries) {
  const isBlank = (r) => !r.key.trim() && r.value === "" && !r.info?.some((i) => i.label || i.text);
  const next = rows.filter((r) => !isBlank(r)).map((r) => ({ ...r }));
  let added = 0;
  let updated = 0;

  for (const entry of entries) {
    const existing = next.find((r) => r.key === entry.key);
    if (existing) {
      existing.value = entry.value;
      updated++;
    } else {
      next.push(
        newField({
          key: entry.key,
          value: entry.value,
          protected: looksSensitive(entry.key),
          touched: true,
        })
      );
      added++;
    }
  }

  if (next.length > MAX_FIELDS) {
    return {
      error: `An item can hold up to ${MAX_FIELDS} variables, and this would make ${next.length}. Split the file across two items.`,
    };
  }

  return { rows: next, added, updated };
}
