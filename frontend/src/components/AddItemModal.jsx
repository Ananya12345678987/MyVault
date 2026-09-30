import { useState } from "react";
import { X } from "lucide-react";
import * as api from "../lib/api";
import UnlockVault from "../pages/UnlockVault";

const TYPE_OPTIONS = [
  { value: "password", label: "Password" },
  { value: "secret", label: "API Key / Secret" },
  { value: "env", label: "Environment Variables" },
  { value: "dbCredential", label: "Database Credential" },
  { value: "note", label: "Note" },
  { value: "resource", label: "Saved Resource" },
  { value: "snippet", label: "Code Snippet" },
  { value: "person", label: "Person" },
];

// These 4 types require the user to explicitly choose protection level.
// The other 4 are ALWAYS encrypted — no toggle shown for them at all.
// Every type gets the toggle now.
const FLEXIBLE_TYPES = TYPE_OPTIONS.map((t) => t.value);


const EMPTY_FORM = {
  type: "note",
  title: "",
  sensitive: false,
  notes: "",
  username: "",
  password: "",
  secret: "",
  envContent: "",
  dbConnectionUri: "",
  dbName: "",
  dbHost: "",
  noteContent: "",
  url: "",
  whySaved: "",
  whatToRemember: "",
  language: "",
  code: "",
  name: "",
  email: "",
  phone: "",
  company: "",
  role: "",
  tagsInput: "",
};

export default function AddItemModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const isFlexible = FLEXIBLE_TYPES.includes(form.type);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function buildPayload() {
    const tags = form.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

        const payload = { type: form.type, title: form.title, tags, notes: form.notes };

    if (isFlexible) payload.sensitive = form.sensitive;

    switch (form.type) {
      case "password":
        payload.username = form.username;
        payload.password = form.password;
        break;
      case "secret":
        payload.secret = form.secret;
        break;
      case "env":
        payload.envContent = form.envContent;
        break;
      case "dbCredential":
        payload.dbConnectionUri = form.dbConnectionUri;
        payload.dbName = form.dbName;
        payload.dbHost = form.dbHost;
        break;
      case "note":
        payload.noteContent = form.noteContent;
        break;
      case "resource":
        payload.url = form.url;
        payload.whySaved = form.whySaved;
        payload.whatToRemember = form.whatToRemember;
        break;
      case "snippet":
        payload.language = form.language;
        payload.code = form.code;
        break;
      case "person":
        payload.name = form.name;
        payload.email = form.email;
        payload.phone = form.phone;
        payload.company = form.company;
        payload.role = form.role;
        break;
    }

    return payload;
  }

    async function attemptSave() {
    setError("");
    setSubmitting(true);
    try {
      const result = await api.createVaultItem(buildPayload());
      onCreated(result.item);
      onClose();
    } catch (err) {
      if (err.status === 423) {
        // Don't just show an error — open the unlock popup right here,
        // over this form, so the person can finish the action in one
        // flow instead of hunting for a separate unlock screen.
        setNeedsUnlock(true);
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    attemptSave();
  }

  function handleUnlocked() {
    setNeedsUnlock(false);
    attemptSave(); // retry the exact same save now that the vault is open
  }


  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-surface border border-border rounded-sm w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-heading text-lg font-semibold">New item</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...EMPTY_FORM, type: e.target.value })}
              className="input-field"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="input-field"
              placeholder="e.g. GitHub, Mongo Prod URI, Rahul"
            />
          </div>

          {/* --- Type-specific fields --- */}
          {form.type === "password" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Username</label>
                <input value={form.username} onChange={(e) => update("username", e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Password</label>
                <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} className="input-field" />
              </div>
            </>
          )}

          {form.type === "secret" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Secret value</label>
              <textarea value={form.secret} onChange={(e) => update("secret", e.target.value)} className="input-field" rows={3} />
            </div>
          )}

          {form.type === "env" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">.env content</label>
              <textarea value={form.envContent} onChange={(e) => update("envContent", e.target.value)} className="input-field font-mono text-sm" rows={6} placeholder={"KEY=value\nOTHER_KEY=value"} />
            </div>
          )}

          {form.type === "dbCredential" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Connection URI</label>
                <input value={form.dbConnectionUri} onChange={(e) => update("dbConnectionUri", e.target.value)} className="input-field font-mono text-sm" placeholder="mongodb+srv://..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Database name</label>
                <input value={form.dbName} onChange={(e) => update("dbName", e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Host</label>
                <input value={form.dbHost} onChange={(e) => update("dbHost", e.target.value)} className="input-field" />
              </div>
            </>
          )}

          {form.type === "note" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Note</label>
              <textarea value={form.noteContent} onChange={(e) => update("noteContent", e.target.value)} className="input-field" rows={4} />
            </div>
          )}

          {form.type === "resource" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">URL</label>
                <input value={form.url} onChange={(e) => update("url", e.target.value)} className="input-field" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Why did you save this?</label>
                <input value={form.whySaved} onChange={(e) => update("whySaved", e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">What do you want to remember?</label>
                <textarea value={form.whatToRemember} onChange={(e) => update("whatToRemember", e.target.value)} className="input-field" rows={3} />
              </div>
            </>
          )}

          {form.type === "snippet" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Language</label>
                <input value={form.language} onChange={(e) => update("language", e.target.value)} className="input-field" placeholder="e.g. javascript" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Code</label>
                <textarea value={form.code} onChange={(e) => update("code", e.target.value)} className="input-field font-mono text-sm" rows={6} />
              </div>
            </>
          )}

          {form.type === "person" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Name</label>
                <input value={form.name} onChange={(e) => update("name", e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Phone</label>
                <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Company</label>
                <input value={form.company} onChange={(e) => update("company", e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Role</label>
                <input value={form.role} onChange={(e) => update("role", e.target.value)} className="input-field" />
              </div>
            </>
          )}

                    <div>
            <label className="block text-sm font-medium mb-1.5">Tags (comma separated)</label>
            <input value={form.tagsInput} onChange={(e) => update("tagsInput", e.target.value)} className="input-field" placeholder="work, urgent" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Notes <span className="text-text-muted font-normal">(optional)</span></label>
            <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="input-field" rows={2} placeholder="Any extra context…" />
          </div>

          {/* --- The sensitivity toggle — only for the 4 flexible types --- */}
          {isFlexible && (
            <div className="border border-border rounded-sm p-4 bg-surface-alt">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.sensitive}
                  onChange={(e) => update("sensitive", e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium">Require master password for this item</span>
                  <span className="block text-xs text-text-muted mt-0.5">
                    {form.sensitive
                      ? "This will be encrypted. You'll need to unlock your vault to view or edit it."
                      : "This stays visible without unlocking your vault. Only choose this for non-sensitive info."}
                  </span>
                </span>
              </label>
            </div>
          )}

          
          {error && <p className="text-danger text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? "Saving…" : "Save item"}
            </button>
          </div>
                </form>
      </div>

      {needsUnlock && (
        <UnlockVault onUnlocked={handleUnlocked} onCancel={() => setNeedsUnlock(false)} />
      )}
    </div>
  );
}