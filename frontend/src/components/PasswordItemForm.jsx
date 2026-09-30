import { useState } from "react";
import { X } from "lucide-react";
import * as api from "../lib/api";
import UnlockVault from "../pages/UnlockVault";

export default function PasswordItemForm({ onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [website, setWebsite] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [sensitive, setSensitive] = useState(true);
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);

  function buildPayload() {
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    return { type: "password", title, website, username, password, notes, sensitive, tags };
  }

  async function attemptSave() {
    setError("");
    setSubmitting(true);
    try {
      const result = await api.createVaultItem(buildPayload());
      onCreated(result.item);
      onClose();
    } catch (err) {
      if (err.status === 423) setNeedsUnlock(true);
      else setError(err.message);
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
    attemptSave();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-surface border border-border rounded-sm w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-heading text-lg font-semibold">New password</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="e.g. Reddit — Work"
            />
          </div>

          {/* Key / Value pair — the visual centerpiece of this form */}
          <div className="border border-border rounded-sm overflow-hidden">
            <div className="grid grid-cols-[100px_1fr] border-b border-border">
              <div className="px-3 py-2.5 text-xs font-mono uppercase tracking-wide text-text-muted bg-surface-alt flex items-center">
                Key
              </div>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="bg-transparent px-3 py-2.5 text-sm outline-none"
                placeholder="reddit.com"
              />
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <div className="px-3 py-2.5 text-xs font-mono uppercase tracking-wide text-text-muted bg-surface-alt flex items-center">
                Value
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent px-3 py-2.5 text-sm font-mono outline-none"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              placeholder="the.email.used@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Additional info <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field"
              rows={2}
              placeholder="Anything worth remembering about this login"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Tags (comma separated)</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="input-field"
              placeholder="work, urgent"
            />
          </div>

          <div className="border border-border rounded-sm p-4 bg-surface-alt">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sensitive}
                onChange={(e) => setSensitive(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium">Require master password for this item</span>
                <span className="block text-xs text-text-muted mt-0.5">
                  {sensitive
                    ? "This will be encrypted. You'll need to unlock your vault to view or edit it."
                    : "This stays visible without unlocking your vault."}
                </span>
              </span>
            </label>
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? "Saving…" : "Save password"}
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