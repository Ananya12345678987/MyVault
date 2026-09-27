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
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const categories = [
  {
    label: "All Items",
    type: "all",
    icon: Shield,
  },
  {
    label: "Passwords",
    type: "password",
    icon: KeyRound,
  },
  {
    label: "API Keys",
    type: "secret",
    icon: KeyRound,
  },
  {
    label: "Environment",
    type: "env",
    icon: Terminal,
  },
  {
    label: "Database",
    type: "database",
    icon: Database,
  },
  {
    label: "Notes",
    type: "note",
    icon: FileText,
  },
  {
    label: "Code",
    type: "code",
    icon: Code2,
  },
  {
    label: "People",
    type: "person",
    icon: UserRound,
  },
];

function Dashboard() {
  const { user, lock, logout } = useAuth();

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

  return (
    <div className="min-h-screen bg-bg text-text">

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-border bg-bg lg:flex lg:flex-col">

        {/* Brand */}
        <div className="flex h-20 items-center border-b border-border px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border border-vault-green">
              <Shield size={17} className="text-vault-green" />
            </div>

            <div>
              <p className="font-heading font-semibold">
                MyVault
              </p>

              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted">
                PRIVATE STORAGE
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6">

          <p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
            Vault
          </p>

          <nav className="space-y-1">
            {categories.map((category) => {
              const Icon = category.icon;

              return (
                <button
                  key={category.type}
                  type="button"
                  className={`group flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                    category.type === "all"
                      ? "bg-surface-alt text-text"
                      : "text-text-muted hover:bg-surface hover:text-text"
                  }`}
                >
                  <Icon
                    size={17}
                    className={
                      category.type === "all"
                        ? "text-vault-green"
                        : "text-text-muted"
                    }
                  />

                  <span>{category.label}</span>

                  {category.type === "all" && (
                    <ChevronRight
                      size={14}
                      className="ml-auto text-vault-green"
                    />
                  )}
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

        {/* User */}
        <div className="border-t border-border p-4">
          <div className="mb-3 px-2">
            <p className="truncate font-mono text-xs text-text">
              {user?.email}
            </p>

            <p className="mt-1 text-[11px] text-vault-green">
              Vault unlocked
            </p>
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
      <main className="lg:pl-64">

        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-border bg-bg/95 px-6 backdrop-blur lg:px-10">

          <div className="flex items-center gap-3">

            <div className="relative hidden w-72 md:block">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />

              <input
                type="search"
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

        {/* Content */}
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">

          {/* Heading */}
          <div className="flex flex-col justify-between gap-5 border-b border-border pb-8 sm:flex-row sm:items-end">

            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-vault-green">
                SECURE STORAGE
              </p>

              <h1 className="font-heading text-4xl font-semibold tracking-tight">
                All items
              </h1>

              <p className="mt-2 text-sm text-text-muted">
                Everything stored inside your private vault.
              </p>
            </div>

            <button
              type="button"
              className="btn-primary gap-2"
            >
              <Plus size={17} />
              New item
            </button>
          </div>

          {/* Empty state */}
          <div className="mt-8 border border-dashed border-border px-6 py-20 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center border border-border bg-surface">
              <Shield size={22} className="text-vault-green" />
            </div>

            <h2 className="mt-6 font-heading text-xl font-medium">
              Your vault is empty
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
              Start by adding your first password, API key, secure note,
              environment file, database credential, or code snippet.
            </p>

            <button
              type="button"
              className="btn-secondary mt-6 gap-2"
            >
              <Plus size={16} />
              Add your first item
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}

export default Dashboard;