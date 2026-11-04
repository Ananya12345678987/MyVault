import { Suspense, useCallback, useEffect, useState } from "react";

import { Lock, LockOpen } from "lucide-react";

import * as api from "../lib/api";
import { EDITORS } from "../editors";
import { ICON_BY_TYPE, styleFor } from "../lib/categories";
import { formatDateTime } from "../lib/dates";
import UnlockVault from "../pages/UnlockVault";

/*
 * The one window for adding and editing an item. It is a shell: the body
 * (what you actually fill in) comes from the category's editor in
 * ../editors, so every category gets the same loading, saving, delete,
 * archive, unlock and unsaved-changes behaviour.
 *
 *   mode "create": starts from the editor's defaults
 *   mode "edit":   loads the item (asking for the master password if it is
 *                  protected and the vault is locked)
 */

// Draft -> string, ignoring client-only keys, to detect unsaved changes.
const snapshot = (draft) =>
  JSON.stringify(draft, (key, value) => (key === "touched" ? undefined : value));

export default function ItemEditorModal({ mode, type, itemId, onClose, onSaved }) {
  const config = EDITORS[type];
  const Body = config.Component;
  const Icon = ICON_BY_TYPE[type];
  const isEdit = mode === "edit";

  // Build the starting draft ONCE: its rows get random ids, so building it
  // twice would make a brand-new editor look "edited" straight away.
  const [seed] = useState(() => (isEdit ? null : config.defaults()));
  const [draft, setDraft] = useState(seed);
  const [initial, setInitial] = useState(() => (seed ? snapshot(seed) : null));
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [unlock, setUnlock] = useState(null); // { retry, closeOnCancel }

  const dirty = draft !== null && initial !== null && snapshot(draft) !== initial;

  const load = useCallback(async () => {
    try {
      const response = await api.getVaultItem(itemId);
      const loaded = response.item;
      const next = config.fromItem(loaded);
      setItem(loaded);
      setDraft(next);
      setInitial(snapshot(next));
      setLoadError("");
      setLoading(false);
    } catch (err) {
      if (err.status === 423) {
        // Protected item and a locked vault: ask, then try again.
        setUnlock({ retry: load, closeOnCancel: true });
      } else {
        setLoadError(err.message);
        setLoading(false);
      }
    }
  }, [itemId, config]);

  useEffect(() => {
    if (isEdit) load();
  }, [isEdit, load]);

  function requestClose() {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    onClose();
  }

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && !unlock) requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Run an action. If the vault is locked (423), ask for the master
  // password and run the same action again afterwards.
  async function run(action) {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (err) {
      if (err.status === 423) setUnlock({ retry: () => run(action) });
      else setError(err.data?.details?.[0]?.msg || err.message);
    } finally {
      setBusy(false);
    }
  }

  function save() {
    const problem = config.validate(draft);
    if (problem) {
      setError(problem);
      return;
    }
    run(async () => {
      const payload = config.toPayload(draft);
      if (isEdit) await api.updateVaultItem(itemId, payload);
      else await api.createVaultItem({ type, ...payload });
      onSaved();
    });
  }

  function confirmDiscardEdits() {
    return !dirty || window.confirm("You have unsaved changes. Continue without saving them?");
  }

  function moveToTrash() {
    if (!confirmDiscardEdits()) return;
    run(async () => {
      await api.deleteVaultItem(itemId);
      onSaved();
    });
  }

  function toggleArchive() {
    if (!confirmDiscardEdits()) return;
    run(async () => {
      await api.archiveVaultItem(itemId, !item.isArchived);
      onSaved();
    });
  }

  const hasProtectedField = Boolean(draft?.fields?.some((f) => f.protected));

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        role="dialog"
        
        aria-modal="true"
        aria-labelledby="editor-title"
        className="w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl shadow-black"
      >
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-border px-6 py-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styleFor(type).tile}`}>
            {Icon && <Icon size={20} />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="editor-title" className="truncate font-heading text-xl font-semibold">
              {isEdit ? draft?.title || config.label : `Add ${config.label}`}
            </h2>
            <p className="text-sm text-text-muted">{config.label}</p>
          </div>

          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-text-muted transition-colors hover:bg-white/5 hover:text-text"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {loading && !loadError && <p className="text-sm text-text-muted">Loading…</p>}

          
          {loadError && (
            <div role="alert" className="rounded-xl border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
              {loadError}
            </div>
          )}

          {draft && (
            <div className="space-y-6">
              <Suspense fallback={<p className="text-sm text-text-muted">Loading editor…</p>}>
                <Body draft={draft} setDraft={setDraft} />
              </Suspense>

              
              <div>
                <p className="mb-2 text-sm font-medium">How should this item be stored?</p>
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Protection">
                  {[
                    {
                      value: true,
                      title: "Protected",
                      text: "Encrypted. You need your master password to open it.",
                      icon: Lock,
                    },
                    {
                      value: false,
                      title: "Open",
                      text: "Stored as plain text. Opens without the master password.",
                      icon: LockOpen,
                    },
                  ].map((choice) => {
                    const active = Boolean(draft.sensitive) === choice.value;
                    const ChoiceIcon = choice.icon;
                    return (
                      <button
                        key={choice.title}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setDraft((d) => ({ ...d, sensitive: choice.value }))}
                        className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                          active
                            ? "border-vault-green/70 bg-vault-green/10"
                            : "border-border hover:border-vault-green/40"
                        }`}
                      >
                        <ChoiceIcon
                          size={18}
                          className={`mt-0.5 shrink-0 ${active ? "text-vault-green" : "text-text-muted"}`}
                        />
                        <span className="text-sm">
                          <span className="block font-medium">{choice.title}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-text-muted">{choice.text}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {!draft.sensitive && hasProtectedField && (
                  <p className="mt-2 text-xs leading-5 text-amber">
                    This item is open, so hidden values (the eye icon) are only masked on screen.
                    They are stored as plain text. Choose Protected to encrypt them.
                  </p>
                )}
              </div>
            </div>
          )}

          
          {error && (
            <div role="alert" className="mt-6 rounded-xl border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        {draft && (
          <div className="border-t border-border px-6 py-4">
            {isEdit && item && (
              <p className="mb-4 flex flex-wrap gap-x-8 gap-y-1 font-mono text-xs text-text-muted">
                <span>Created: {formatDateTime(item.createdAt)}</span>
                <span>Updated: {formatDateTime(item.updatedAt)}</span>
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {isEdit && (
                <>
                  <button
                    type="button"
                    onClick={moveToTrash}
                    disabled={busy}
                    className="btn-danger"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={toggleArchive}
                    disabled={busy}
                    className="btn-secondary disabled:opacity-50"
                  >
                    {item?.isArchived ? "Unarchive" : "Archive"}
                  </button>
                </>
              )}

              <div className="ml-auto flex gap-3">
                {!isEdit && (
                  <button type="button" onClick={requestClose} className="btn-secondary">
                    Cancel
                  </button>
                )}
                <button type="button" onClick={save} disabled={busy} className="btn-primary">
                  {busy ? "Saving…" : isEdit ? "Save Changes" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {unlock && (
        <UnlockVault
          onCancel={() => {
            const closeEditor = unlock.closeOnCancel;
            setUnlock(null);
            if (closeEditor) onClose();
          }}
          onUnlocked={() => {
            const retry = unlock.retry;
            setUnlock(null);
            retry?.();
          }}
        />
      )}
    </div>
  );
}
