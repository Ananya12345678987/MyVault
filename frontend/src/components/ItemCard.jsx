import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";

import * as api from "../lib/api";
import {
  ICON_BY_TYPE,
  TYPE_LABEL,
  PERSON_GROUP_LABEL,
  formatDate,
} from "../lib/categories";
import { CopyButton, RevealButton } from "./SecretControls";
import { SECRET_MASK, copyToClipboard } from "../lib/secrets";

// Types whose cards list key/value rows.
const FIELD_TYPES = ["password", "secret", "env", "dbCredential", "person"];
const MAX_ROWS = 4;
const HIDE_AFTER_MS = 15000;

const stop = (event) => event.stopPropagation();
const isHttp = (value) => /^https?:\/\//i.test(String(value || ""));

/*
 * Look one field up in an item-detail response. Items saved before
 * key/value fields existed list a single "Environment" row, while the
 * detail splits it into KEY=VALUE rows, so rebuild the text for that case.
 */
function valueFromDetail(detail, fieldId) {
  const fields = detail?.item?.fields || [];
  const exact = fields.find((f) => f.id === fieldId);
  if (exact) return exact.value ?? "";
  if (fieldId === "legacy-env") {
    return fields.map((f) => `${f.key}=${f.value ?? ""}`).join("\n");
  }
  return null;
}

function Protected() {
  return (
    <div className="flex items-center gap-2 text-xs text-text-muted">
      <Lock size={12} className="shrink-0 text-amber" />
      Protected — unlock to view
    </div>
  );
}

/* One key/value row on a card. Protected values are only ever fetched
 * when the eye or copy button is pressed, never with the list. */
function FieldRow({ field, itemId, onNeedUnlock }) {
  const [shown, setShown] = useState(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  async function run(action) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      // Vault locked (or its session expired): ask for the master
      // password, then retry exactly what the user just clicked.
      if (err.status === 423) onNeedUnlock?.(() => run(action));
    } finally {
      setBusy(false);
    }
  }

  async function fetchValue() {
    const detail = await api.getVaultItem(itemId);
    return valueFromDetail(detail, field.id);
  }

  function toggleReveal() {
    if (shown !== null) {
      setShown(null);
      return;
    }
    run(async () => {
      const value = await fetchValue();
      if (value === null) return;
      setShown(value);
      // Hide it again on its own.
      timers.current.push(setTimeout(() => setShown(null), HIDE_AFTER_MS));
    });
  }

  function copy() {
    run(async () => {
      const value = shown !== null ? shown : await fetchValue();
      if (value === null) return;
      await copyToClipboard(value);
      setCopied(true);
      timers.current.push(setTimeout(() => setCopied(false), 1500));
    });
  }

  let valueCell;
  if (field.locked) {
    valueCell = (
      <span className="flex items-center text-amber" title="Unlock the vault to view">
        <Lock size={12} aria-hidden="true" />
        <span className="sr-only">Locked</span>
      </span>
    );
  } else if (field.protected) {
    valueCell = (
      <>
        <span className="min-w-0 flex-1 truncate font-mono text-text">
          {shown !== null ? shown : SECRET_MASK}
        </span>
        <RevealButton shown={shown !== null} onClick={toggleReveal} disabled={busy} />
        <CopyButton copied={copied} onClick={copy} disabled={busy} />
      </>
    );
  } else {
    valueCell = (
      <span className="min-w-0 flex-1 truncate font-mono text-text" title={field.value || ""}>
        {field.value || "—"}
      </span>
    );
  }

  return (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-3 text-xs">
      <span className="truncate text-text-muted" title={field.key}>
        {field.key}
      </span>
      <div className="flex min-w-0 items-center gap-1.5">{valueCell}</div>
    </div>
  );
}

function Body({ item, onNeedUnlock }) {
  const isFieldType = FIELD_TYPES.includes(item.type);

  // Encrypted content we have no key for.
  if (!isFieldType && item.locked) return <Protected />;

  if (isFieldType) {
    const rows = [];

    // A person's built-in phone/email come before their extra fields.
    if (item.type === "person") {
      if (item.preview?.phone) {
        rows.push({ id: "person-phone", key: "Phone", value: item.preview.phone });
      }
      if (item.preview?.email) {
        rows.push({ id: "person-email", key: "Email", value: item.preview.email });
      }
    }
    rows.push(...(item.fields || []));

    if (rows.length === 0) {
      return item.locked ? (
        <Protected />
      ) : (
        <p className="text-xs text-text-muted">No fields yet</p>
      );
    }

    const visible = rows.slice(0, MAX_ROWS);
    const more = rows.length - visible.length;

    return (
      <div className="space-y-2">
        {visible.map((field) => (
          <FieldRow
            key={field.id}
            field={field}
            itemId={item._id}
            onNeedUnlock={onNeedUnlock}
          />
        ))}
        {more > 0 && <p className="text-[11px] text-text-muted">+{more} more</p>}
      </div>
    );
  }

  const preview = item.preview || {};

  switch (item.type) {
    case "note":
      return preview.text ? (
        <p className="line-clamp-3 text-xs leading-5 text-text-muted">{preview.text}</p>
      ) : (
        <p className="text-xs text-text-muted">Empty note</p>
      );

    case "snippet":
      return (
        <div className="space-y-2">
          {preview.description && (
            <p className="line-clamp-1 text-xs text-text-muted">{preview.description}</p>
          )}
          <pre className="max-h-[4.5rem] overflow-hidden whitespace-pre-wrap break-all border border-border bg-bg px-2.5 py-2 font-mono text-[11px] leading-4 text-text-muted">
            {preview.code || "—"}
          </pre>
        </div>
      );

    case "resource":
      return (
        <div className="space-y-1.5">
          {isHttp(preview.url) ? (
            <a
              href={preview.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stop}
              className="block truncate font-mono text-xs text-vault-green hover:underline"
            >
              {preview.url}
            </a>
          ) : (
            <p className="truncate font-mono text-xs text-text">{preview.url || "—"}</p>
          )}
          {preview.whySaved && (
            <p className="line-clamp-2 text-xs leading-5 text-text-muted">{preview.whySaved}</p>
          )}
        </div>
      );

    default:
      return null;
  }
}

function StarButton({ starred, onClick }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        stop(event);
        onClick();
      }}
      aria-label={starred ? "Remove star" : "Add star"}
      aria-pressed={starred}
      title={starred ? "Remove star" : "Star"}
      className={`flex h-7 w-7 items-center justify-center transition-colors ${
        starred ? "text-amber" : "text-text-muted hover:text-amber"
      }`}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill={starred ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}

export default function ItemCard({
  item,
  onOpen,
  onToggleStar,
  onArchive,
  onUnarchive,
  onDelete,
  onNeedUnlock,
}) {
  const Icon = ICON_BY_TYPE[item.type];
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function close(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const subtitle = [
    TYPE_LABEL[item.type],
    item.website,
    item.data?.environment,
    item.type === "person" ? PERSON_GROUP_LABEL[item.personGroup] : null,
    item.type === "snippet" ? item.preview?.language : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item._id)}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onOpen(item._id);
        }
      }}
      className="flex min-h-[11rem] cursor-pointer flex-col border border-border bg-surface p-4 transition-colors hover:border-vault-green focus:outline-none focus-visible:border-vault-green"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-surface-alt">
          {Icon && <Icon size={16} className="text-vault-green" />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={item.title}>
            {item.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-text-muted">{subtitle}</p>
        </div>

        <div className="flex shrink-0 items-center" onClick={stop} ref={menuRef}>
          <StarButton starred={Boolean(item.isStarred)} onClick={() => onToggleStar(item)} />

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex h-7 w-7 items-center justify-center text-lg leading-none text-text-muted transition-colors hover:text-text"
            >
              <span aria-hidden="true">⋮</span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 w-44 border border-border bg-surface py-1 shadow-lg shadow-black/60"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    (item.isArchived ? onUnarchive : onArchive)(item);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
                >
                  {item.isArchived ? "Unarchive" : "Archive"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(item);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-surface-alt"
                >
                  Move to Trash
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex-1">
        <Body item={item} onNeedUnlock={onNeedUnlock} />
      </div>

      <p className="mt-4 font-mono text-[11px] text-text-muted">
        Updated: {formatDate(item.updatedAt)}
      </p>
    </div>
  );
}
