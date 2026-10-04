import FormField from "../components/FormField";
import KeyValueEditor from "../components/KeyValueEditor";

/*
 * Database: a project/database name and any key/value pairs. The starting
 * rows (Database Name, Username, Password, Host, Port, Connection URI)
 * are only a convenience; rename, remove or add whatever you need.
 */
export default function DatabaseEditor({ draft, setDraft }) {
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div className="space-y-6">
      <FormField label="Project Name" htmlFor="item-title">
        <input
          id="item-title"
          value={draft.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Project or database name"
          maxLength={200}
          autoFocus
          className="input-field"
        />
      </FormField>

      <section>
        <h3 className="mb-3 font-heading text-lg font-medium">Fields</h3>
        <KeyValueEditor
          rows={draft.fields}
          onChange={(fields) => set({ fields })}
          defaultProtected="auto"
        />
      </section>
    </div>
  );
}
