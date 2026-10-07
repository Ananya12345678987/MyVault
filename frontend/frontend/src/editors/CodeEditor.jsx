import { useRef, useState } from "react";

import FormField from "../components/FormField";
import { copyToClipboard } from "../lib/secrets";

/*
 * Code: a reusable snippet with a title, a language, an optional
 * description and the code itself (monospace, line numbers, Copy Code).
 * No syntax colouring: it would need a highlighting library for little
 * gain in a vault.
 */

const LANGUAGES = [
  "JavaScript", "TypeScript", "Python", "Java", "C", "C++", "C#", "Go", "Rust",
  "PHP", "Ruby", "Swift", "Kotlin", "SQL", "HTML", "CSS", "Bash / Shell",
  "PowerShell", "JSON", "YAML", "Markdown", "Plain text",
];

const TEXT = "font-mono text-[13px] leading-6";

export default function CodeEditor({ draft, setDraft }) {
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const gutter = useRef(null);
  const [trapTab, setTrapTab] = useState(true);
  const [copied, setCopied] = useState(false);

  // A language saved earlier that is not in the list stays selectable.
  const languages = LANGUAGES.includes(draft.language) ? LANGUAGES : [draft.language, ...LANGUAGES];
  const lineCount = Math.max(1, draft.code.split("\n").length);
  const numbers = Array.from({ length: lineCount }, (_, i) => i + 1).join("\n");

  async function copy() {
    try {
      await copyToClipboard(draft.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked by the browser.
    }
  }

  function onKeyDown(event) {
    // Escape first lets go of Tab (so keyboard users are never stuck here)
    // without closing the window; the next Escape closes it as usual.
    if (event.key === "Escape" && trapTab) {
      event.stopPropagation();
      setTrapTab(false);
      return;
    }
    if (event.key !== "Tab" || !trapTab || event.ctrlKey || event.metaKey || event.altKey) return;

    event.preventDefault();
    const el = event.currentTarget;
    const { selectionStart: start, selectionEnd: end, value } = el;

    if (event.shiftKey) {
      // Remove up to two spaces from the start of the current line.
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const lead = value.slice(lineStart).match(/^ {1,2}/)?.[0].length || 0;
      if (!lead) return;
      set({ code: value.slice(0, lineStart) + value.slice(lineStart + lead) });
      requestAnimationFrame(() =>
        el.setSelectionRange(Math.max(lineStart, start - lead), Math.max(lineStart, end - lead))
      );
    } else {
      set({ code: `${value.slice(0, start)}  ${value.slice(end)}` });
      requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2));
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <FormField label="Title" htmlFor="item-title">
          <input
            id="item-title"
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Snippet title"
            maxLength={200}
            autoFocus
            className="input-field"
          />
        </FormField>

        <FormField label="Language" htmlFor="item-language">
          <select
            id="item-language"
            value={draft.language}
            onChange={(e) => set({ language: e.target.value })}
            className="input-field"
          >
            {languages.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Description" htmlFor="item-description">
        <input
          id="item-description"
          value={draft.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Optional: what is it for?"
          maxLength={500}
          className="input-field"
        />
      </FormField>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="item-code" className="text-sm font-medium">
            Code
          </label>
          <button
            type="button"
            onClick={copy}
            disabled={draft.code === ""}
            className="border border-border bg-surface-alt px-3 py-1 text-xs text-text-muted transition-colors hover:border-vault-green hover:text-vault-green disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? "Copied" : "Copy Code"}
          </button>
        </div>

        <div className="flex h-80 border border-border bg-bg focus-within:border-vault-green">
          <pre
            ref={gutter}
            aria-hidden="true"
            className={`${TEXT} w-12 shrink-0 select-none overflow-hidden border-r border-border bg-surface-alt/60 py-3 pr-2 text-right text-text-muted`}
          >
            {numbers}
          </pre>
          <textarea
            id="item-code"
            value={draft.code}
            onChange={(e) => set({ code: e.target.value })}
            onKeyDown={onKeyDown}
            onFocus={() => setTrapTab(true)}
            onScroll={(e) => {
              if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
            }}
            wrap="off"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            placeholder="Paste or type your code here"
            style={{ tabSize: 2 }}
            className={`${TEXT} h-full min-w-0 flex-1 resize-none overflow-auto whitespace-pre border-0 bg-transparent px-3 py-3 text-text outline-none placeholder:text-text-muted`}
          />
        </div>
        <p className="mt-1.5 text-xs text-text-muted">
          Tab inserts spaces. Press Esc, then Tab, to move on to the next field.
        </p>
      </div>
    </div>
  );
}
