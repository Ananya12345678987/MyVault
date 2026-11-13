import {
  KeyRound,
  FileText,
  Code2,
  Database,
  Terminal,
  UserRound,
  Shield,
  Link2,
  Star,
  Archive,
  Trash2,
} from "lucide-react";

// Sidebar entries that are filtered VIEWS of existing items (the backend
// decides what they contain via ?view=...). Everything else in the
// sidebar is a category (an item type).
export const VIEW_TYPES = ["all", "starred", "archived", "trash"];

// Sidebar order. `type` is either a view above or a VaultItem type.
export const CATEGORIES = [
  { label: "All Items", type: "all", icon: Shield },
  { label: "Starred", type: "starred", icon: Star },
  { label: "Archived", type: "archived", icon: Archive },
  { label: "Trash", type: "trash", icon: Trash2 },
  { label: "Passwords", type: "password", icon: KeyRound },
  // { label: "API Keys", type: "secret", icon: KeyRound },
  // { label: "Environment", type: "env", icon: Terminal },
  // { label: "Database", type: "dbCredential", icon: Database },
  { label: "Notes", type: "note", icon: FileText },
  { label: "Code", type: "snippet", icon: Code2 },
  { label: "People", type: "person", icon: UserRound },
    { label: "Resources", type: "resource", icon: Link2 },
];

// Each type gets its own tint so cards are recognisable at a glance.
// (Full class names on purpose: Tailwind only keeps classes it can read.)
export const TYPE_STYLE = {
  password: { tile: "bg-emerald-500/15 text-emerald-300", ring: "hover:border-emerald-400/40" },
  secret: { tile: "bg-cyan-500/15 text-cyan-300", ring: "hover:border-cyan-400/40" },
  env: { tile: "bg-violet-500/15 text-violet-300", ring: "hover:border-violet-400/40" },
  dbCredential: { tile: "bg-teal-500/15 text-teal-300", ring: "hover:border-teal-400/40" },
  note: { tile: "bg-blue-500/15 text-blue-300", ring: "hover:border-blue-400/40" },
  snippet: { tile: "bg-sky-500/15 text-sky-300", ring: "hover:border-sky-400/40" },
  person: { tile: "bg-fuchsia-500/15 text-fuchsia-300", ring: "hover:border-fuchsia-400/40" },
  resource: { tile: "bg-indigo-500/15 text-indigo-300", ring: "hover:border-indigo-400/40" },
};
export const styleFor = (type) =>
  TYPE_STYLE[type] || { tile: "bg-vault-green/15 text-vault-green", ring: "hover:border-vault-green/40" };

export const ICON_BY_TYPE = Object.fromEntries(
  CATEGORIES.filter((c) => !VIEW_TYPES.includes(c.type)).map((c) => [c.type, c.icon])
);

// Singular label shown on a card ("Password", "API Key"...).
export const TYPE_LABEL = {
  password: "Password",
  secret: "API Key",
  env: "Environment",
  dbCredential: "Database",
  note: "Note",
  snippet: "Code",
  person: "Person",
  resource: "Resource",
};

export const PERSON_GROUP_LABEL = {
  myself: "Myself",
  family: "Family",
  other: "Other",
};

// "30 Sep 2026"
export function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Empty-state copy for each sidebar view.
export function emptyTitleFor(view, noItemsAtAll) {
  if (!noItemsAtAll) return "No items match";
  switch (view) {
    case "starred":
      return "No starred items";
    case "archived":
      return "Nothing archived";
    case "trash":
      return "Trash is empty";
    default:
      return "Your vault is empty";
  }
}

export function emptyHintFor(view) {
  switch (view) {
    case "starred":
      return "Star an item from its card and it will show up here.";
    case "archived":
      return "Archived items are hidden from your other views but never deleted.";
    case "trash":
      return "Deleted items wait here until you restore them or delete them for good.";
    default:
      return "Pick a category and add your first password, API key, environment file, database, note, snippet, person or website.";
  }
}
