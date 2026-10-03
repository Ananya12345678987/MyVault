import { useState, useEffect } from "react";
import { X, Copy, Check, Pencil, Trash2 } from "lucide-react";
import * as api from "../lib/api";
import UnlockVault from "../pages/UnlockVault";

// Which fields to show/edit for each type, and which field (if any)
// holds the decrypted secret value under the key "value".
const TYPE_FIELDS = {
  password: ["username"],
  secret: [],
  env: [],
  dbCredential: ["dbName", "dbHost"],
  note: [],
  resource: ["url", "whySaved", "whatToRemember"],
  snippet: ["language", "code"],
  person: ["name", "email", "phone", "company", "role"],
};

const HAS_SECRET_VALUE = ["password", "secret", "env", "dbCredential", "note"];
const FLEXIBLE_TYPES = ["note", "resource", "snippet", "person"];

const FIELD_LABELS = {
  username: "Username",
  dbName: "Database name",
  dbHost: "Host",
  url: "URL",
  whySaved: "Why you saved this",
  whatToRemember: "What to remember",
  language: "Language",
  code: "Code",
  name: "Name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  role: "Role",
};

export default function ItemDetailModal({ itemId, onClose, onUpdated, onDeleted }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsUnlock, setNeedsUnlock] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // "fetch" | "save" | "delete"

  async function fetchDetail() {
    setLoading(true);
    setError("");
    try {
      const result = await api.getVaultItem(itemId);
      setDetail(result.item);
      setForm(result.item);
    } catch (err) {
            if (err.status === 423) {
        setPendingAction("fetch");
        setNeedsUnlock(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

    function handleUnlocked() {
    setNeedsUnlock(false);
    if (pendingAction === "delete") handleDelete();
    else if (pendingAction === "save") handleSave();
    else fetchDetail();
    setPendingAction(null);
  }

  async function handleCopy() {
    if (!detail?.value) return;
    await navigator.clipboard.writeText(detail.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {

      for (const key of TYPE_FIELDS[detail.type] || []) {
        payload[key] = form[key];
      }
      if (HAS_SECRET_VALUE.includes(detail.type) && form.sensitiveValue !== undefined) {
        // Map the generic "sensitiveValue" edit field back to the
        // correct backend field name per type.
        const valueField = { password: "password", secret: "secret", env: "envContent", dbCredential: "dbConnectionUri", note: "noteContent" }[detail.type];
        payload[valueField] = form.sensitiveValue;
      }
      const result = await api.updateVaultItem(itemId, payload);
      onUpdated(result.item);
      setEditing(false);
      fetchDetail();
    } catch (err) {
           if (err.status === 423) {
        setPendingAction("save");
        setNeedsUnlock(true);
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  } 

    async function handleDelete() {
    try {
      await api.deleteVaultItem(itemId);
      onDeleted(itemId);
      onClose();
    } catch (err) {
      if (err.status === 423) {
        setPendingAction("delete");
        setNeedsUnlock(true);
      } else {
        setError(err.message);
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-surface border border-border rounded-sm w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-heading text-lg font-semibold">
            {detail?.title || "Item"}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading && <p className="text-text-muted text-sm">Loading…</p>}
          {error && <p className="text-danger text-sm">{error}</p>}

          {detail && !loading && (
            <>
              {editing ? (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Title</label>
                  <input
                    value={form.title || ""}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="input-field"
                  />
                </div>
              ) : (
                detail.sensitive === true && (
                  <p className="text-xs text-amber">🔒 This item is protected by your master password.</p>
                )
              )}

              {/* Type-specific plaintext fields */}
              {(TYPE_FIELDS[detail.type] || []).map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium mb-1.5">{FIELD_LABELS[field]}</label>
                  {editing ? (
                    field === "code" ? (
                      <textarea
                        value={form[field] || ""}
                        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                        className="input-field font-mono text-sm"
                        rows={6}
                      />
                    ) : (
                      <input
                        value={form[field] || ""}
                        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                        className="input-field"
                      />
                    )
                  ) : (
                    <p className="text-sm text-text-primary">{detail[field] || "—"}</p>
                  )}
                </div>
              ))}

              {/* The secret/sensitive value, if this type has one */}
              {HAS_SECRET_VALUE.includes(detail.type) && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {detail.type === "password" ? "Password" : detail.type === "note" ? "Note" : "Value"}
                  </label>
                  {editing ? (
                    <textarea
                      value={form.sensitiveValue ?? detail.value ?? ""}
                      onChange={(e) => setForm({ ...form, sensitiveValue: e.target.value })}
                      className="input-field font-mono text-sm"
                      rows={detail.type === "note" ? 4 : 2}
                      placeholder="Leave unchanged to keep the current value"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono text-text-primary break-all flex-1">
                        {detail.value ?? "—"}
                      </p>
                      {detail.value && (
                        <button onClick={handleCopy} className="text-text-muted hover:text-vault-green shrink-0">
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

                            {editing ? (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Notes</label>
                  <textarea
                    value={form.notes || ""}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="input-field"
                    rows={2}
                  />
                </div>
              ) : (
                detail.notes && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Notes</label>
                    <p className="text-sm text-text-primary whitespace-pre-wrap">{detail.notes}</p>
                  </div>
                )
              )}

              {detail.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detail.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-mono px-2 py-0.5 border border-border rounded-full text-text-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-border">
                {editing ? (
                  <>
                    <button onClick={() => setEditing(false)} className="btn-secondary flex-1">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                  </>
                ) : confirmingDelete ? (
                  <>
                    <button onClick={() => setConfirmingDelete(false)} className="btn-secondary flex-1">
                      Cancel
                    </button>
                    <button onClick={handleDelete} className="flex-1 bg-danger text-bg font-semibold px-4 py-2.5 rounded-sm">
                      Confirm delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setConfirmingDelete(true)}
                      className="btn-secondary flex items-center justify-center gap-2 px-4"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => setEditing(true)}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {needsUnlock && (
        <UnlockVault onUnlocked={handleUnlocked} onCancel={() => { setNeedsUnlock(false); onClose(); }} />
      )}
    </div>
  );
}