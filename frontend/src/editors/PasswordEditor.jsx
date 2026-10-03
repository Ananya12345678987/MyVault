import FormField from "../components/FormField";
import KeyValueEditor from "../components/KeyValueEditor";
import { safeHref } from "../lib/links";

/*
 * Passwords: one website/account per item (so "Reddit - Personal" and
 * "Reddit - College" are two separate items), with whatever fields the
 * user wants: Email, Username, Password, 2FA, Recovery Code...
 */
export default function PasswordEditor({ draft, setDraft }) {
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const href = safeHref(draft.website);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Title" htmlFor="item-title">
          <input
            id="item-title"
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Service — account name"
            maxLength={200}
            autoFocus
            className="input-field"
          />
        </FormField>

        <FormField label="Website / URL" htmlFor="item-website">
          <div className="relative">
            <input
              id="item-website"
              value={draft.website}
              onChange={(e) => set({ website: e.target.value })}
              placeholder="example.com"
              maxLength={300}
              className="input-field pr-11"
            />
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open website"
                title="Open website"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted transition-colors hover:text-vault-green"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </div>
        </FormField>
      </div>

      <section>
        <h3 className="mb-3 font-heading text-lg font-medium">Fields</h3>
        <KeyValueEditor
          rows={draft.fields}
          onChange={(fields) => set({ fields })}
          defaultProtected="auto"
        />
      </section>
    </div>
  );
}
