import { lazy } from "react";

import PasswordEditor from "./PasswordEditor";
import ApiKeyEditor from "./ApiKeyEditor";
import EnvironmentEditor from "./EnvironmentEditor";
import DatabaseEditor from "./DatabaseEditor";
import CodeEditor from "./CodeEditor";
import ResourceEditor from "./ResourceEditor";
import PersonEditor from "./PersonEditor";
import { findDuplicateKey, newField, toRows, rowsToPayload, validateRows } from "../lib/fields";
import { isEmptyHtml } from "../lib/noteHtml";
import { normalizeUrl, safeHref } from "../lib/links";

// The rich-text editor is the heaviest part of the app, so it is only
// downloaded the first time a note is opened.
const NoteEditor = lazy(() => import("./NoteEditor"));

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

// People saved before key/value details existed kept phone, email, company
// and role in separate columns; show them as ordinary rows so editing the
// person moves them across.
function legacyPersonRows(item) {
  return [
    ["Phone", item.phone],
    ["Email", item.email],
    ["Company", item.company],
    ["Role", item.role],
  ]
    .filter(([, value]) => value)
    .map(([key, value]) => newField({ key, value, touched: true }));
}

Object.assign(EDITORS, {
  note: {
    label: "Note",
    Component: NoteEditor,
    defaults: () => ({ title: "", sensitive: false, noteContent: "" }),
    fromItem: (item) => ({
      title: item.title || "",
      sensitive: Boolean(item.sensitive),
      noteContent: item.noteContent || "",
    }),
    toPayload: (d) => ({
      title: d.title.trim(),
      sensitive: d.sensitive,
      noteContent: isEmptyHtml(d.noteContent) ? "" : d.noteContent,
    }),
    validate: (d) => (d.title.trim() ? "" : "Give this note a title."),
  },

  snippet: {
    label: "Code",
    Component: CodeEditor,
    defaults: () => ({ title: "", sensitive: false, language: "JavaScript", description: "", code: "" }),
    fromItem: (item) => ({
      title: item.title || "",
      sensitive: Boolean(item.sensitive),
      language: item.language || "Plain text",
      description: item.notes || "",
      code: item.code || "",
    }),
    toPayload: (d) => ({
      title: d.title.trim(),
      sensitive: d.sensitive,
      language: d.language,
      code: d.code,
      notes: d.description.trim(),
    }),
    validate: (d) => {
      if (!d.title.trim()) return "Give this snippet a title.";
      if (!d.code.trim()) return "Paste or type some code first.";
      return "";
    },
  },

  resource: {
    label: "Resource",
    Component: ResourceEditor,
    defaults: () => ({ title: "", sensitive: false, url: "", whySaved: "" }),
    fromItem: (item) => ({
      title: item.title || "",
      sensitive: Boolean(item.sensitive),
      url: item.url || "",
      whySaved: item.whySaved || "",
    }),
    toPayload: (d) => ({
      title: d.title.trim(),
      sensitive: d.sensitive,
      url: normalizeUrl(d.url),
      whySaved: d.whySaved.trim(),
    }),
    validate: (d) => {
      if (!d.title.trim()) return "Give this resource a title.";
      if (!d.url.trim()) return "Enter the website address.";
      if (!safeHref(d.url)) return "Enter a web address starting with http:// or https://";
      return "";
    },
  },

  person: {
    label: "Person",
    Component: PersonEditor,
    defaults: () => ({
      title: "",
      sensitive: true, // personal details: protected unless you say otherwise
      personGroup: "family",
      notes: "",
      // Starting rows only; every one is optional and can be renamed or removed.
      fields: ["Relationship", "Phone", "Email", "DOB", "Address", "Occupation"].map((key) =>
        newField({ key, touched: true })
      ),
    }),
    fromItem: (item) => {
      const rows = toRows(item.fields);
      return {
        title: item.title || "",
        sensitive: Boolean(item.sensitive),
        personGroup: item.personGroup || "other",
        notes: item.notes || "",
        fields: rows.length ? rows : legacyPersonRows(item),
      };
    },
    toPayload: (d) => ({
      title: d.title.trim(),
      sensitive: d.sensitive,
      personGroup: d.personGroup,
      notes: d.notes.trim(),
      fields: rowsToPayload(d.fields, { skipEmptyValues: true }),
    }),
    validate: (d) => (d.title.trim() ? validateRows(d.fields) : "Enter a name."),
  },
});

export const hasEditor = (type) => Boolean(EDITORS[type]);
