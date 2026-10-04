import FormField from "../components/FormField";
import KeyValueEditor from "../components/KeyValueEditor";

/*
 * API Keys: a service/account title and any key/value pairs the user
 * wants (OPENAI_API_KEY, ORGANIZATION_ID...). Every new value starts
 * protected, because almost everything stored here is a secret.
 */
export default function ApiKeyEditor({ draft, setDraft }) {
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div className="space-y-6">
      <FormField label="Service" htmlFor="item-title">
        <input
          id="item-title"
          value={draft.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Service — account or project"
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
          defaultProtected={true}
        />
      </section>
    </div>
  );
}
