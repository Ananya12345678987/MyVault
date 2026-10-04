import PasswordEditor from "./PasswordEditor";
import ApiKeyEditor from "./ApiKeyEditor";
import EnvironmentEditor from "./EnvironmentEditor";
import DatabaseEditor from "./DatabaseEditor";
import { findDuplicateKey, newField, toRows, rowsToPayload, validateRows } from "../lib/fields";

/*
 * Registry of category editors. A category that appears here opens in the
 * shared ItemEditorModal (Add and Edit); any other category still uses the
 * older generic form until its editor is added.
 *
 * Each entry says how its editor starts (defaults), how a saved item turns
 * into an editable draft (fromItem), how a draft is sent to the backend
 * (toPayload) and what must be fixed before saving (validate).
 */

// Shared by every category whose body is a title + key/value fields.
//   hasWebsite     the item has a Website / URL (Passwords)
//   hasEnvironment the item names the environment it is for (Environment)
//   noDuplicates   refuse the same field name twice (Environment variables)
function keyValueCategory({
  label,
  Component,
  starter,
  sensitive = true,
  hasWebsite = false,
  hasEnvironment = false,
  noDuplicates = false,
  titleMessage = "Give this item a title.",
}) {
  return {
    label,
    Component,

    defaults: () => ({
      title: "",
      website: "",
      environment: hasEnvironment ? "Development" : "",
      sensitive,
      // Starting rows only; every one can be renamed or removed.
      fields: starter.map((s) =>
        newField({ key: s.key, protected: Boolean(s.protected), touched: s.touched ?? true })
      ),
    }),

    fromItem: (item) => ({
      title: item.title || "",
      website: item.website || "",
      environment: item.data?.environment || "",
      sensitive: Boolean(item.sensitive),
      fields: toRows(item.fields),
    }),

    toPayload: (d) => ({
      title: d.title.trim(),
      sensitive: d.sensitive,
      fields: rowsToPayload(d.fields),
      ...(hasWebsite ? { website: d.website.trim() } : {}),
      ...(hasEnvironment ? { data: { environment: d.environment.trim() } } : {}),
    }),

    validate: (d) => {
      if (!d.title.trim()) return titleMessage;
      const problem = validateRows(d.fields);
      if (problem) return problem;
      if (noDuplicates) {
        const duplicate = findDuplicateKey(d.fields);
        if (duplicate) return `The variable name "${duplicate}" is used more than once.`;
      }
      return "";
    },
  };
}

export const EDITORS = {
  password: keyValueCategory({
    label: "Password",
    Component: PasswordEditor,
    hasWebsite: true,
    starter: [
      { key: "Email" },
      { key: "Username" },
      { key: "Password", protected: true },
    ],
  }),

  secret: keyValueCategory({
    label: "API Key",
    Component: ApiKeyEditor,
    titleMessage: "Enter the service this key is for.",
    starter: [{ key: "API Key", protected: true }],
  }),

  env: keyValueCategory({
    label: "Environment",
    Component: EnvironmentEditor,
    hasEnvironment: true,
    noDuplicates: true,
    titleMessage: "Enter a project name.",
    // One empty row, ready to type into; its protection follows its name.
    starter: [{ key: "", touched: false }],
  }),

  dbCredential: keyValueCategory({
    label: "Database",
    Component: DatabaseEditor,
    titleMessage: "Enter a project name.",
    starter: [
      { key: "Database Name" },
      { key: "Username" },
      { key: "Password", protected: true },
      { key: "Host" },
      { key: "Port" },
      { key: "Connection URI", protected: true },
    ],
  }),
};

export const hasEditor = (type) => Boolean(EDITORS[type]);
