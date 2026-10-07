const GROUPS = [
  ["myself", "Myself"],
  ["family", "Family"],
  ["other", "Other People"],
];

/*
 * The People page: cards grouped under Myself, Family and Other People
 * (a group with nobody in it is left out). `renderCard(item)` draws one
 * card and must give it a key.
 */
export default function PeopleGroups({ items, renderCard }) {
  const byGroup = { myself: [], family: [], other: [] };
  for (const item of items) (byGroup[item.personGroup] || byGroup.other).push(item);

  return (
    <div className="mt-6 space-y-8">
      {GROUPS.filter(([key]) => byGroup[key].length > 0).map(([key, label]) => (
        <section key={key} aria-label={label}>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-text-muted">
            {label} <span className="text-vault-green">{byGroup[key].length}</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {byGroup[key].map(renderCard)}
          </div>
        </section>
      ))}
    </div>
  );
}
