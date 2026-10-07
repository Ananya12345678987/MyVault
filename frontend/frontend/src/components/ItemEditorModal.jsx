import { Suspense, useCallback, useEffect, useState } from "react";

import * as api from "../lib/api";
import { EDITORS } from "../editors";
import { ICON_BY_TYPE } from "../lib/categories";
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
        className="w-full max-w-4xl border border-border bg-surface"
      >
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-border px-6 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-border bg-surface-alt">
            {Icon && <Icon size={20} className="text-vault-green" />}
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
            className="flex h-9 w-9 items-center justify-center text-xl text-text-muted transition-colors hover:text-text"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {loading && !loadError && <p className="text-sm text-text-muted">Loading…</p>}

          {loadError && (
            <div role="alert" className="border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
              {loadError}
            </div>
          )}

          {draft && (
            <div className="space-y-6">
              <Suspense fallback={<p className="text-sm text-text-muted">Loading editor…</p>}>
                <Body draft={draft} setDraft={setDraft} />
              </Suspense>

              <div>
                <label className="flex cursor-pointer items-start gap-3 border border-border bg-surface-alt/40 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={draft.sensitive}
                    onChange={(e) => setDraft((d) => ({ ...d, sensitive: e.target.checked }))}
                    className="mt-1 h-4 w-4 accent-[#34A67E]"
                  />
                  <span className="text-sm">
                    <span className="font-medium">Require master password to view this item</span>
                    <span className="mt-0.5 block text-xs leading-5 text-text-muted">
                      Encrypts everything in this item. It can only be opened while your vault is
                      unlocked.
                    </span>
                  </span>
                </label>

                {!draft.sensitive && hasProtectedField && (
                  <p className="mt-2 text-xs leading-5 text-amber">
                    This item is not encrypted. Protected values are only hidden on screen, but
                    they are stored as plain text.
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="mt-6 border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
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
                    className="inline-flex items-center justify-center border border-danger/60 px-5 py-3 font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
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
