import { useState, useEffect, useMemo } from "react";
import {
  Shield,
  Lock,
  Plus,
  Search,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import AddItemModal from "../components/AddItemModal";
import ItemCard from "../components/ItemCard";
import TrashTable from "../components/TrashTable";
import AddMenu from "../components/AddMenu";
import CategoryChips from "../components/CategoryChips";
import UnlockVault from "./UnlockVault";
import { CATEGORIES, VIEW_TYPES, emptyTitleFor, emptyHintFor } from "../lib/categories";
import ItemDetailModal from "../components/ItemDetailModal";

const categories = CATEGORIES;



function Dashboard() {
  const { user, vaultUnlocked, lock, logout } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all"); // chips under the search box
  const [addType, setAddType] = useState(null);
  const [unlockRequest, setUnlockRequest] = useState(null);
  const [actionError, setActionError] = useState("");

  // "all", "starred", "archived" and "trash" are VIEWS of the item list
  // (the backend filters them). Every other sidebar entry is a category.
  const isView = VIEW_TYPES.includes(activeCategory);
  const view = isView ? activeCategory : "all";

  // Adding makes no sense inside Starred / Archived / Trash.
  const canAdd = !["starred", "archived", "trash"].includes(activeCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const [openItemId, setOpenItemId] = useState(null);


  async function fetchItems({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setLoadError("");
    try {
      const result = await api.getVaultItems(view);
      setItems(result.items || []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, [view, vaultUnlocked]);

  const filteredItems = useMemo(() => {
    let list = items;
    const typeKey = isView ? typeFilter : activeCategory;
    if (typeKey !== "all") {
      list = list.filter((i) => i.type === typeKey);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          i.website?.toLowerCase().includes(q) ||
          (i.fields || []).some((f) => f.key?.toLowerCase().includes(q)) ||
          (i.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, activeCategory, typeFilter, isView, searchQuery]);

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

  // Run an action; if the vault is locked (423) ask for the master
  // password and then run the same action again.
  async function runWithUnlock(action) {
    setActionError("");
    try {
      await action();
    } catch (err) {
      if (err.status === 423) setUnlockRequest({ retry: action });
      else setActionError(err.message);
    }
  }

  function openAdd(type) {
    setAddType(type);
    setShowAddModal(true);
  }

  const refresh = () => fetchItems({ silent: true });

  const toggleStar = (item) =>
    runWithUnlock(async () => {
      await api.starVaultItem(item._id, !item.isStarred);
      await refresh();
    });

  const archiveItem = (item) =>
    runWithUnlock(async () => {
      await api.archiveVaultItem(item._id, true);
      await refresh();
    });

  const unarchiveItem = (item) =>
    runWithUnlock(async () => {
      await api.archiveVaultItem(item._id, false);
      await refresh();
    });

  const moveToTrash = (item) =>
    runWithUnlock(async () => {
      await api.deleteVaultItem(item._id);
      await refresh();
    });

  const restoreItem = (item) =>
    runWithUnlock(async () => {
      await api.restoreVaultItem(item._id);
      await refresh();
    });

  const deleteForever = (item) =>
    runWithUnlock(async () => {
      await api.permanentlyDeleteVaultItem(item._id);
      await refresh();
    });

  const emptyTrash = () =>
    runWithUnlock(async () => {
      await api.emptyTrash();
      await refresh();
    });

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
        <AddItemModal defaultType={addType} onClose={() => setShowAddModal(false)} onCreated={handleItemCreated} />
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

      {unlockRequest && (
        <UnlockVault
          onCancel={() => setUnlockRequest(null)}
          onUnlocked={() => {
            const retry = unlockRequest.retry;
            setUnlockRequest(null);
            if (retry) runWithUnlock(retry);
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
  setTypeFilter("all");
  setActionError("");
  setMobileNavOpen(false);
}} 
                  className={`group flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${category.type === "password" ? "!mt-5 relative before:absolute before:-top-2.5 before:left-0 before:right-0 before:border-t before:border-border" : ""} ${
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
            <p className={`mt-1 text-[11px] ${vaultUnlocked ? "text-vault-green" : "text-amber"}`}>{vaultUnlocked ? "Vault unlocked" : "Vault locked"}</p>
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
            onClick={vaultUnlocked ? handleLock : () => setUnlockRequest({})}
            className="flex items-center gap-2 border border-border bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-vault-green hover:text-vault-green"
          >
            <Lock size={16} />
            {vaultUnlocked ? "Lock vault" : "Unlock vault"}
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

<AddMenu activeCategory={activeCategory} onAdd={openAdd} />
          </div>

          {isView && activeCategory !== "trash" && (
            <CategoryChips value={typeFilter} onChange={setTypeFilter} />
          )}

          {loading && <p className="mt-8 text-text-muted text-sm">Loading…</p>}

          {loadError && <p className="mt-8 text-danger text-sm">{loadError}</p>}

          {actionError && <p className="mt-6 text-danger text-sm">{actionError}</p>}

          {!loading && !loadError && filteredItems.length === 0 && (
            <div className="mt-8 border border-dashed border-border px-6 py-20 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center border border-border bg-surface">
                <Shield size={22} className="text-vault-green" />
              </div>
              <h2 className="mt-6 font-heading text-xl font-medium">
                {emptyTitleFor(view, items.length === 0)}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
                {items.length === 0
                  ? emptyHintFor(view)
                  : "Try a different category or search term."}
              </p>
              {items.length === 0 && canAdd && (
                <button type="button" onClick={() => openAdd(isView ? null : activeCategory)} className="btn-secondary mt-6 gap-2">
                  <Plus size={16} />
                  Add your first item
                </button>
              )}
            </div>
          )}

{!loading && !loadError && filteredItems.length > 0 && view === "trash" && (
            <TrashTable
              items={filteredItems}
              onRestore={restoreItem}
              onDeleteForever={deleteForever}
              onEmptyTrash={emptyTrash}
            />
          )}

          {!loading && !loadError && filteredItems.length > 0 && view !== "trash" && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item._id}
                  item={item}
                  onOpen={setOpenItemId}
                  onToggleStar={toggleStar}
                  onArchive={archiveItem}
                  onUnarchive={unarchiveItem}
                  onDelete={moveToTrash}
                  onNeedUnlock={(retry) => setUnlockRequest({ retry })}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;