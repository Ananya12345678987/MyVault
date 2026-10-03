import { ICON_BY_TYPE, TYPE_LABEL, formatDate } from "../lib/categories";

/*
 * Trash is a table (not cards): Name / Type / Deleted At / Actions, with
 * Restore, Delete (permanent) and Empty Trash. Permanent deletion always
 * asks first, because it cannot be undone.
 */
export default function TrashTable({ items, onRestore, onDeleteForever, onEmptyTrash }) {
  function confirmDelete(item) {
    if (window.confirm(`Permanently delete "${item.title}"? This cannot be undone.`)) {
      onDeleteForever(item);
    }
  }

  function confirmEmpty() {
    if (
      window.confirm(
        `Permanently delete all ${items.length} item${items.length === 1 ? "" : "s"} in Trash? This cannot be undone.`
      )
    ) {
      onEmptyTrash();
    }
  }

  return (
    <div className="mt-8 border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted">
          Items stay in Trash until you restore them or delete them permanently.
        </p>
        <button
          type="button"
          onClick={confirmEmpty}
          className="self-start border border-danger/60 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 sm:self-auto"
        >
          Empty Trash
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
              <th className="px-4 py-3 font-normal">Name</th>
              <th className="px-4 py-3 font-normal">Type</th>
              <th className="px-4 py-3 font-normal">Deleted at</th>
              <th className="px-4 py-3 text-right font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const Icon = ICON_BY_TYPE[item.type];
              return (
                <tr key={item._id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-surface-alt">
                        {Icon && <Icon size={14} className="text-vault-green" />}
                      </div>
                      <span className="truncate">{item.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{TYPE_LABEL[item.type]}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">
                    {formatDate(item.deletedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onRestore(item)}
                        className="border border-vault-green/60 px-3 py-1.5 text-xs font-medium text-vault-green transition-colors hover:bg-vault-green/10"
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDelete(item)}
                        className="border border-danger/60 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
