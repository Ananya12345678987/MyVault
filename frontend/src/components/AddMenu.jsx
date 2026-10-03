import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";

import { CATEGORIES, VIEW_TYPES } from "../lib/categories";

// Views where adding something makes no sense.
const NO_ADD = ["starred", "archived", "trash"];

/*
 * "+ Add".
 *  - Inside a category (Passwords, API Keys...) it goes straight to that
 *    category's editor.
 *  - On All Items it only asks WHICH category, then opens that category's
 *    editor. It is a picker, not a form.
 */
export default function AddMenu({ activeCategory, onAdd }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function close(event) {
      if (!ref.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (NO_ADD.includes(activeCategory)) return null;

  const isAll = activeCategory === "all";
  const choices = CATEGORIES.filter((c) => !VIEW_TYPES.includes(c.type));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => (isAll ? setOpen((o) => !o) : onAdd(activeCategory))}
        aria-haspopup={isAll ? "menu" : undefined}
        aria-expanded={isAll ? open : undefined}
        className="btn-primary flex items-center gap-2"
      >
        <Plus size={17} />
        Add
      </button>

      {isAll && open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-56 border border-border bg-surface py-1 shadow-lg shadow-black/60"
        >
          <p className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
            Add to
          </p>
          {choices.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.type}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onAdd(category.type);
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
              >
                <Icon size={15} className="text-vault-green" />
                {category.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
