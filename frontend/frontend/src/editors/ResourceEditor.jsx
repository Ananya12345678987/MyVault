import FormField from "../components/FormField";
import { safeHref } from "../lib/links";

/*
 * Resources: a saved website. Title / key, the address, and why it was
 * saved. The address is stored with https:// added if it was left out.
 */
export default function ResourceEditor({ draft, setDraft }) {
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const href = safeHref(draft.url);

  return (
    <div className="space-y-6">
      <FormField label="Title / Key" htmlFor="item-title">
        <input
          id="item-title"
          value={draft.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="What is this site called?"
          maxLength={200}
          autoFocus
          className="input-field"
        />
      </FormField>

      <FormField label="URL" htmlFor="item-url">
        <input
          id="item-url"
          value={draft.url}
          onChange={(e) => set({ url: e.target.value })}
          placeholder="https://example.com"
          maxLength={2000}
          inputMode="url"
          className="input-field font-mono"
        />
        {href && (
          <div className="mt-3 flex justify-end">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary gap-2 !px-4 !py-2 text-sm"
            >
              Open Website
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
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </a>
          </div>
        )}
      </FormField>

      <FormField label="Why saved?" htmlFor="item-why">
        <textarea
          id="item-why"
          value={draft.whySaved}
          onChange={(e) => set({ whySaved: e.target.value })}
          placeholder="Why is this worth keeping?"
          rows={4}
          maxLength={2000}
          className="input-field resize-y"
        />
      </FormField>
    </div>
  );
}
