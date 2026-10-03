import PasswordEditor from "./PasswordEditor";
import { newField, toRows, rowsToPayload, validateRows } from "../lib/fields";

/*
 * Registry of category editors. A category that appears here opens in the
 * shared ItemEditorModal (Add and Edit); any other category still uses the
 * older generic form until its editor is added.
 *
 * Each entry says how its editor starts (defaults), how a saved item turns
 * into an editable draft (fromItem), how a draft is sent to the backend
 * (toPayload) and what must be fixed before saving (validate).
 */

// Shared by every category whose body is a title + website + key/value fields.
function keyValueCategory({ label, Component, starter, sensitive = true }) {
  return {
    label,
    Component,

    defaults: () => ({
      title: "",
      website: "",
      sensitive,
      // Starting rows only; every one can be renamed or removed.
      fields: starter.map((s) => newField({ key: s.key, protected: s.protected, touched: true })),
    }),

    fromItem: (item) => ({
      title: item.title || "",
      website: item.website || "",
      sensitive: Boolean(item.sensitive),
      fields: toRows(item.fields),
    }),

    toPayload: (d) => ({
      title: d.title.trim(),
      website: d.website.trim(),
      sensitive: d.sensitive,
      fields: rowsToPayload(d.fields),
    }),

    validate: (d) => (!d.title.trim() ? "Give this item a title." : validateRows(d.fields)),
  };
}

export const EDITORS = {
  password: keyValueCategory({
    label: "Password",
    Component: PasswordEditor,
    starter: [
      { key: "Email", protected: false },
      { key: "Username", protected: false },
      { key: "Password", protected: true },
    ],
  }),
};

export const hasEditor = (type) => Boolean(EDITORS[type]);
