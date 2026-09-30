import { useState, useEffect, useMemo } from "react";
import {
  KeyRound,
  FileText,
  Code2,
  Database,
  Terminal,
  UserRound,
  Shield,
  Lock,
  Plus,
  Search,
  Settings,
  LogOut,
  ChevronRight,
  Link2,
  Menu,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import AddItemModal from "../components/AddItemModal";
import PasswordItemForm from "../components/PasswordItemForm";
import ItemDetailModal from "../components/ItemDetailModal";

const categories = [
  { label: "All Items", type: "all", icon: Shield },
  { label: "Passwords", type: "password", icon: KeyRound },
  { label: "API Keys", type: "secret", icon: KeyRound },
  { label: "Environment", type: "env", icon: Terminal },
  { label: "Database", type: "dbCredential", icon: Database },
  { label: "Notes", type: "note", icon: FileText },
  { label: "Code", type: "snippet", icon: Code2 },
  { label: "People", type: "person", icon: UserRound },
  { label: "Resources", type: "resource", icon: Link2 },
];

const ICON_BY_TYPE = Object.fromEntries(categories.map((c) => [c.type, c.icon]));

function subtitleFor(item) {
  if (item.sensitive === true) return "Protected — unlock to view";
  switch (item.type) {
    case "dbCredential":
      return [item.dbName, item.dbHost].filter(Boolean).join(" · ") || "Database credential";
    case "resource":
      return item.whySaved || item.url || "Saved resource";
    case "snippet":
      return item.language || "Code snippet";
    case "person":
      return item.email || item.company || "Contact";
    case "password":
      return "Password";
    case "secret":
      return "API key / secret";
    case "env":
      return "Environment variables";
    case "note":
      return "Note";
    default:
      return "";
  }
}

function Dashboard() {
  const { user, lock, logout } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [openItemId, setOpenItemId] = useState(null);


  async function fetchItems() {
    setLoading(true);
    setLoadError("");
    try {
      const result = await api.getVaultItems();
      setItems(result.items || []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    let list = items;
    if (activeCategory !== "all") {
      list = list.filter((i) => i.type === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          (i.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, activeCategory, searchQuery]);

  async function handleLock() {
    try {
      await lock();
    } catch {
      // AuthContext handles the error.
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Local auth state is cleared by AuthContext.
    }
  }

  function handleItemCreated(newItem) {
    setItems((prev) => [newItem, ...prev]);
    // Re-fetch too, since the create response is intentionally minimal
    // (id/type/title/sensitive/createdAt) and the list view benefits
    // from the fuller set of fields listVaultItems returns.
    fetchItems();
  }

  return (
    <div className="min-h-screen bg-bg text-text">
               {showAddModal && (
        <AddItemModal onClose={() => setShowAddModal(false)} onCreated={handleItemCreated} />
      )}

      {showPasswordForm && (
        <PasswordItemForm onClose={() => setShowPasswordForm(false)} onCreated={handleItemCreated} />
      )}   

      {openItemId && (
        <ItemDetailModal
          itemId={openItemId}
          onClose={() => setOpenItemId(null)}
          onUpdated={() => fetchItems()}
          onDeleted={() => {
            setOpenItemId(null);
            fetchItems();
          }}
        />
      )}

      {/* Sidebar */}
      {mobileNavOpen && (
  <div
    className="fixed inset-0 z-30 bg-black/60 lg:hidden"
    onClick={() => setMobileNavOpen(false)}
  />
)}
<aside className={`fixed left-0 top-0 z-40 h-screen w-64 flex flex-col border-r border-border bg-bg transition-transform duration-200 lg:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center border-b border-border px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border border-vault-green">
              <Shield size={17} className="text-vault-green" />
            </div>
            <div>
              <p className="font-heading font-semibold">MyVault</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted">
                PRIVATE STORAGE
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
            Vault
          </p>

          <nav className="space-y-1">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = category.type === activeCategory;

              return (
                <button
                  key={category.type}
                  type="button"
                 onClick={() => {
  setActiveCategory(category.type);
  setMobileNavOpen(false);
}} 
                  className={`group flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                    isActive ? "bg-surface-alt text-text" : "text-text-muted hover:bg-surface hover:text-text"
                  }`}
                >
                  <Icon size={17} className={isActive ? "text-vault-green" : "text-text-muted"} />
                  <span>{category.label}</span>
                  {isActive && <ChevronRight size={14} className="ml-auto text-vault-green" />}
                </button>
              );
            })}
          </nav>

          <div className="my-7 border-t border-border" />

          <p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
            Account
          </p>

          <nav className="space-y-1">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text"
            >
              <Settings size={17} />
              Settings
            </button>
          </nav>
        </div>

        <div className="border-t border-border p-4">
          <div className="mb-3 px-2">
            <p className="truncate font-mono text-xs text-text">{user?.email}</p>
            <p className="mt-1 text-[11px] text-vault-green">Vault unlocked</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-2 py-2 text-sm text-text-muted transition-colors hover:text-text"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
            <main className="lg:pl-64 w-full">
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-border bg-bg/95 px-6 backdrop-blur lg:px-10">
          <div className="flex items-center gap-3">
            <button
  type="button"
  onClick={() => setMobileNavOpen(true)}
  className="mr-1 text-text-muted hover:text-text lg:hidden"
>
  <Menu size={20} />
</button>
<div className="relative w-full max-w-xs md:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your vault..."
                className="w-full border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-text outline-none placeholder:text-text-muted focus:border-vault-green"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleLock}
            className="flex items-center gap-2 border border-border bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-vault-green hover:text-vault-green"
          >
            <Lock size={16} />
            Lock vault
          </button>
        </header>

        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
          <div className="flex flex-col justify-between gap-5 border-b border-border pb-8 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-vault-green">
                SECURE STORAGE
              </p>
              <h1 className="font-heading text-4xl font-semibold tracking-tight">
                {activeCategory === "all" ? "All items" : categories.find((c) => c.type === activeCategory)?.label}
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                {filteredItems.length} item{filteredItems.length === 1 ? "" : "s"}
              </p>
            </div>

            <button type="button" onClick={() => (activeCategory === "password" ? setShowPasswordForm(true) : setShowAddModal(true))} className="btn-primary flex items-center gap-2">
              <Plus size={17} />
              New item
            </button>
          </div>

          {loading && <p className="mt-8 text-text-muted text-sm">Loading…</p>}

          {loadError && <p className="mt-8 text-danger text-sm">{loadError}</p>}

          {!loading && !loadError && filteredItems.length === 0 && (
            <div className="mt-8 border border-dashed border-border px-6 py-20 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center border border-border bg-surface">
                <Shield size={22} className="text-vault-green" />
              </div>
              <h2 className="mt-6 font-heading text-xl font-medium">
                {items.length === 0 ? "Your vault is empty" : "No items match"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
                {items.length === 0
                  ? "Start by adding your first password, API key, secure note, environment file, database credential, or code snippet."
                  : "Try a different category or search term."}
              </p>
              {items.length === 0 && (
                <button type="button" onClick={() => setShowAddModal(true)} className="btn-secondary mt-6 gap-2">
                  <Plus size={16} />
                  Add your first item
                </button>
              )}
            </div>
          )}

          {!loading && !loadError && filteredItems.length > 0 && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const Icon = ICON_BY_TYPE[item.type] || Shield;
                return (
                                    <div
                    key={item._id}
                    onClick={() => setOpenItemId(item._id)}
                    className="border border-border bg-surface p-4 hover:border-vault-green transition-colors cursor-pointer"
                  >
                      <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-surface-alt">
                        <Icon size={16} className="text-vault-green" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        <p className="text-xs text-text-muted mt-0.5 truncate">{subtitleFor(item)}</p>
                      </div>
                      {item.sensitive === true && <Lock size={14} className="text-amber shrink-0 mt-1" />}
                    </div>
                    {item.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {item.tags.map((tag) => (
                          <span key={tag} className="text-[10px] font-mono px-2 py-0.5 border border-border rounded-full text-text-muted">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;