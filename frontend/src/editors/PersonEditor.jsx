import FormField from "../components/FormField";
import KeyValueEditor from "../components/KeyValueEditor";

const GROUPS = [
  { value: "myself", label: "Myself" },
  { value: "family", label: "Family" },
  { value: "other", label: "Other People" },
];

/*
 * People: a name, which group they belong to (Myself / Family / Other
 * People), whatever details you want to keep (Phone, Email, DOB, Address,
 * Occupation... all optional, all removable, add your own) and notes.
 */
export default function PersonEditor({ draft, setDraft }) {
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <FormField label="Name" htmlFor="item-title">
          <input
            id="item-title"
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Full name"
            maxLength={200}
            autoFocus
            className="input-field"
          />
        </FormField>

        <FormField label="Category" htmlFor="item-group">
          <select
            id="item-group"
            value={draft.personGroup}
            onChange={(e) => set({ personGroup: e.target.value })}
            className="input-field"
          >
            {GROUPS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {draft.personGroup === "myself" && (
        <p className="text-xs text-text-muted">
          This is your own profile. There can only be one “Myself”.
        </p>
      )}

      <section>
        <h3 className="mb-3 font-heading text-lg font-medium">Details</h3>
        <KeyValueEditor
          rows={draft.fields}
          onChange={(fields) => set({ fields })}
          defaultProtected="auto"
          keyPlaceholder="Label"
          addLabel="Add field"
        />
      </section>

      <FormField label="Notes" htmlFor="item-notes">
        <textarea
          id="item-notes"
          value={draft.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Anything else worth remembering"
          rows={4}
          maxLength={5000}
          className="input-field resize-y"
        />
      </FormField>
    </div>
  );
}
