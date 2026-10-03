import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { CopyButton, RevealButton } from "./SecretControls";
import { copyToClipboard } from "../lib/secrets";
import { looksSensitive, newField } from "../lib/fields";

/*
 * The one key/value editor behind Passwords, API Keys, Environment and
 * Database. The parent owns the rows and receives every change:
 *
 *   <KeyValueEditor rows={rows} onChange={setRows} />
 *
 * Each row has a name, a value, a "protected" state (masked on screen and
 * kept out of the bulk list), reveal + copy, and additional information.
 * The first piece of information sits in the table; the menu next to it
 * opens room for as many more label/detail pairs as the user wants.
 */

const REVEAL_FOR_MS = 30000;

const GRID =
  "md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)_minmax(0,1.1fr)_4.75rem]";

const CELL =
  "w-full border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-vault-green";

const ICON_BUTTON =
  "mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center border border-border bg-surface-alt text-text-muted transition-colors hover:border-vault-green hover:text-vault-green";

function Svg({ children }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// A textarea that grows with its content (for values that wrap or span lines).
function AutoTextarea({ value, ...props }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return <textarea ref={ref} rows={1} value={value} {...props} />;
}

function toggled(set, id) {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export default function KeyValueEditor({
  rows,
  onChange,
  defaultProtected = "auto", // "auto" | true | false: protection suggested for NEW fields
  addLabel = "Add field",
  keyPlaceholder = "Name",
  valuePlaceholder = "Value",
}) {
  const [revealed, setRevealed] = useState(() => new Set());
  const [infoOpen, setInfoOpen] = useState(
    () => new Set(rows.filter((r) => r.info.length > 1).map((r) => r.id))
  );
  const [copiedId, setCopiedId] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const timers = useRef([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const update = (id, patch) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const remove = (id) => onChange(rows.filter((r) => r.id !== id));

  function add() {
    const row = newField({ protected: defaultProtected === true });
    onChange([...rows, row]);
    setFocusId(row.id);
  }

  function rename(row, key) {
    const patch = { key };
    // Until the user picks a state by hand, suggest one from the name.
    if (defaultProtected === "auto" && !row.touched) patch.protected = looksSensitive(key);
    update(row.id, patch);
  }

  function toggleProtected(row) {
    update(row.id, { protected: !row.protected, touched: true });
  }

  function toggleReveal(id) {
    const wasShown = revealed.has(id);
    setRevealed((prev) => toggled(prev, id));
    if (!wasShown) {
      // Hide it again on its own.
      timers.current.push(
        setTimeout(
          () =>
            setRevealed((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            }),
          REVEAL_FOR_MS
        )
      );
    }
  }

  async function copy(row) {
    try {
      await copyToClipboard(row.value);
      setCopiedId(row.id);
      timers.current.push(setTimeout(() => setCopiedId(null), 1500));
    } catch {
      // Clipboard blocked by the browser: nothing useful to show.
    }
  }

  function setFirstInfo(row, text) {
    const info = row.info.length ? [...row.info] : [{ label: "", text: "" }];
    info[0] = { ...info[0], text };
    update(row.id, { info });
  }

  function setInfoEntry(row, index, patch) {
    update(row.id, {
      info: row.info.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    });
  }

  function addInfo(row) {
    const base = row.info.length ? row.info : [{ label: "", text: "" }];
    update(row.id, { info: [...base, { label: "", text: "" }] });
  }

  function removeInfo(row, index) {
    update(row.id, { info: row.info.filter((_, i) => i !== index) });
  }

  return (
    <div>
      <div
        className={`hidden gap-2 pb-2 text-xs font-medium text-text-muted md:grid ${GRID}`}
        aria-hidden="true"
      >
        <span>Key</span>
        <span>Value</span>
        <span>Additional Information</span>
        <span />
      </div>

      {rows.length === 0 && (
        <p className="border border-dashed border-border px-4 py-5 text-sm text-text-muted">
          No fields yet. Use “{addLabel}” to create the first one.
        </p>
      )}

      <ul className="space-y-3 md:space-y-2">
        {rows.map((row) => {
          const masked = row.protected && !revealed.has(row.id);
          const firstInfo = row.info[0];
          const label = row.key.trim() || "field";

          return (
            <li
              key={row.id}
              className="border border-border bg-surface-alt/40 p-3 md:border-0 md:bg-transparent md:p-0"
            >
              <div className={`grid gap-2 md:items-start ${GRID}`}>
                <div>
                  <span className="mb-1 block text-[11px] text-text-muted md:hidden">Name</span>
                  <input
                    aria-label="Field name"
                    value={row.key}
                    onChange={(e) => rename(row, e.target.value)}
                    placeholder={keyPlaceholder}
                    maxLength={200}
                    autoFocus={row.id === focusId}
                    className={CELL}
                  />
                </div>

                <div>
                  <span className="mb-1 block text-[11px] text-text-muted md:hidden">Value</span>
                  <div className="flex items-start gap-1.5">
                    {masked ? (
                      <input
                        type="password"
                        autoComplete="new-password"
                        aria-label={`Value of ${label}`}
                        value={row.value}
                        onChange={(e) => update(row.id, { value: e.target.value })}
                        placeholder={valuePlaceholder}
                        className={`${CELL} font-mono`}
                      />
                    ) : (
                      <AutoTextarea
                        aria-label={`Value of ${label}`}
                        value={row.value}
                        onChange={(e) => update(row.id, { value: e.target.value })}
                        placeholder={valuePlaceholder}
                        spellCheck={false}
                        className={`${CELL} resize-none overflow-hidden font-mono`}
                      />
                    )}

                    <div className="mt-1 flex shrink-0 gap-1.5">
                      {row.protected && (
                        <RevealButton shown={!masked} onClick={() => toggleReveal(row.id)} />
                      )}
                      <CopyButton
                        copied={copiedId === row.id}
                        onClick={() => copy(row)}
                        disabled={row.value === ""}
                      />
                      <button
                        type="button"
                        onClick={() => toggleProtected(row)}
                        aria-label={`Protect ${label}`}
                        aria-pressed={row.protected}
                        title={
                          row.protected
                            ? "Protected: masked on screen and kept out of lists"
                            : "Not protected: click to mask this value"
                        }
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center border transition-colors ${
                          row.protected
                            ? "border-amber/70 bg-amber/10 text-amber"
                            : "border-border bg-surface-alt text-text-muted hover:border-vault-green hover:text-vault-green"
                        }`}
                      >
                        <Svg>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d={row.protected ? "M7 11V7a5 5 0 0 1 10 0v4" : "M7 11V7a5 5 0 0 1 9.9-1"} />
                        </Svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="mb-1 block text-[11px] text-text-muted md:hidden">
                    Additional information
                  </span>
                  <input
                    aria-label={`Additional information for ${label}`}
                    value={firstInfo?.text ?? ""}
                    onChange={(e) => setFirstInfo(row, e.target.value)}
                    placeholder="Optional"
                    maxLength={2000}
                    className={CELL}
                  />
                  {firstInfo?.label && (
                    <span className="mt-1 block truncate text-[11px] text-text-muted">
                      {firstInfo.label}
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setInfoOpen((prev) => toggled(prev, row.id))}
                    aria-label={`More information for ${label}`}
                    aria-expanded={infoOpen.has(row.id)}
                    title="More information"
                    className={`${ICON_BUTTON} ${infoOpen.has(row.id) ? "!border-vault-green !text-vault-green" : ""}`}
                  >
                    <span aria-hidden="true" className="text-base leading-none">
                      ⋮
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(row.id)}
                    aria-label={`Remove ${label}`}
                    title="Remove field"
                    className={`${ICON_BUTTON} hover:!border-danger hover:!text-danger`}
                  >
                    <Svg>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </Svg>
                  </button>
                </div>
              </div>

              {infoOpen.has(row.id) && (
                <div className="mt-2 border-l-2 border-vault-green/40 pl-3 md:ml-1">
                  <p className="mb-2 text-xs text-text-muted">
                    More information for “{label}”
                  </p>

                  {row.info.slice(1).map((entry, i) => {
                    const index = i + 1;
                    return (
                      <div
                        key={index}
                        className="mb-2 grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)_auto] gap-2"
                      >
                        <input
                          aria-label={`Info label ${index} for ${label}`}
                          value={entry.label}
                          onChange={(e) => setInfoEntry(row, index, { label: e.target.value })}
                          placeholder="Label (e.g. Last changed)"
                          maxLength={200}
                          className={CELL}
                        />
                        <input
                          aria-label={`Info details ${index} for ${label}`}
                          value={entry.text}
                          onChange={(e) => setInfoEntry(row, index, { text: e.target.value })}
                          placeholder="Details"
                          maxLength={2000}
                          className={CELL}
                        />
                        <button
                          type="button"
                          onClick={() => removeInfo(row, index)}
                          aria-label={`Remove info ${index} for ${label}`}
                          className="h-[2.375rem] w-8 border border-border text-text-muted transition-colors hover:border-danger hover:text-danger"
                        >
                          <span aria-hidden="true">×</span>
                        </button>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => addInfo(row)}
                    className="text-xs text-vault-green hover:underline"
                  >
                    + Add info
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={add}
        className="mt-3 inline-flex items-center gap-2 border border-vault-green/60 px-3.5 py-2 text-sm text-vault-green transition-colors hover:bg-vault-green/10"
      >
        <span aria-hidden="true" className="text-base leading-none">
          +
        </span>
        {addLabel}
      </button>
    </div>
  );
}
