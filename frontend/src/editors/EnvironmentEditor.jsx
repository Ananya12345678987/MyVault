import { useState } from "react";

import FormField from "../components/FormField";
import KeyValueEditor from "../components/KeyValueEditor";
import { MAX_ENV_BYTES, mergeEnvEntries, parseEnv } from "../lib/envParser";

const ENVIRONMENTS = ["Development", "Staging", "Production", "Testing"];

function readText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/*
 * Environment: a project, which environment it is for, and its variables,
 * either typed in or filled from a .env file. The file is read in the
 * browser and never uploaded; its variables only reach the vault when the
 * user clicks Save.
 */
export default function EnvironmentEditor({ draft, setDraft }) {
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const [status, setStatus] = useState(null); // { ok: boolean, text: string }

  async function importFile(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // so the same file can be chosen again
    if (!file) return;

    if (file.size > MAX_ENV_BYTES) {
      setStatus({ ok: false, text: `${file.name} is larger than 1 MB, which is too big for an environment file.` });
      return;
    }

    let text;
    try {
      text = await readText(file);
    } catch {
      setStatus({ ok: false, text: `Could not read ${file.name}.` });
      return;
    }

    if (text.includes("\u0000")) {
      setStatus({ ok: false, text: `${file.name} does not look like a text file.` });
      return;
    }

    const entries = parseEnv(text);
    if (entries.length === 0) {
      setStatus({ ok: false, text: `No variables found in ${file.name}. Expected lines like NAME=value.` });
      return;
    }

    const merged = mergeEnvEntries(draft.fields, entries);
    if (merged.error) {
      setStatus({ ok: false, text: merged.error });
      return;
    }

    set({ fields: merged.rows });
    setStatus({
      ok: true,
      text: `Imported ${entries.length} variable${entries.length === 1 ? "" : "s"} from ${file.name}: ${merged.added} new, ${merged.updated} updated.`,
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Project Name" htmlFor="item-title">
          <input
            id="item-title"
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Project name"
            maxLength={200}
            autoFocus
            className="input-field"
          />
        </FormField>

        <FormField label="Environment" htmlFor="item-environment">
          <input
            id="item-environment"
            list="environment-options"
            value={draft.environment}
            onChange={(e) => set({ environment: e.target.value })}
            placeholder="Development"
            maxLength={60}
            className="input-field"
          />
          <datalist id="environment-options">
            {ENVIRONMENTS.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </FormField>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Upload .env file</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center border border-border bg-surface-alt px-4 py-2 text-sm transition-colors hover:border-vault-green focus-within:border-vault-green">
            <input type="file" onChange={importFile} aria-label="Choose .env file" className="sr-only" />
            Choose file
          </label>
          <span className="text-xs text-text-muted">
            Read in your browser and never uploaded. Its variables fill the table below and are saved
            only when you click Save.
          </span>
        </div>
        {status && (
          <p
            role="status"
            className={`mt-2 text-sm ${status.ok ? "text-vault-green" : "text-danger"}`}
          >
            {status.text}
          </p>
        )}
      </div>

      <section>
        <h3 className="mb-3 font-heading text-lg font-medium">Fields</h3>
        <KeyValueEditor
          rows={draft.fields}
          onChange={(fields) => set({ fields })}
          defaultProtected="auto"
          keyPlaceholder="VARIABLE_NAME"
        />
      </section>
    </div>
  );
}
