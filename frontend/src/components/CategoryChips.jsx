import { CATEGORIES, VIEW_TYPES } from "../lib/categories";

/*
 * Quick type filter under the search box (All / Passwords / API Keys...).
 * It only narrows what the current view already shows; the sidebar still
 * decides the view.
 */
export default function CategoryChips({ value, onChange }) {
  const chips = [
    { type: "all", label: "All" },
    ...CATEGORIES.filter((c) => !VIEW_TYPES.includes(c.type)),
  ];

  return (
    <div className="-mx-6 mt-6 flex gap-2 overflow-x-auto px-6 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
      {chips.map((chip) => {
        const active = chip.type === value;
        return (
          <button
            key={chip.type}
            type="button"
            onClick={() => onChange(chip.type)}
            aria-pressed={active}
            className={`shrink-0 border px-3.5 py-1.5 text-xs transition-colors ${
              active
                ? "border-vault-green bg-vault-green/10 text-vault-green"
                : "border-border text-text-muted hover:border-vault-green/60 hover:text-text"
            }`}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
