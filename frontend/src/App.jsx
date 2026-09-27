import Login from "./pages/Login";
import UnlockVault from "./pages/UnlockVault";
import Dashboard from "./pages/Dashboard";

import { useAuth } from "./context/AuthContext";

function App() {
  const { user, vaultUnlocked, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg text-text">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-vault-green">
            MYVAULT
          </p>

          <p className="mt-4 text-sm text-text-muted">
            Restoring secure session...
          </p>
        </div>
      </main>
    );
  }

  /*
   * Layer 1:
   * No account session → Login.
   */
  if (!user) {
    return <Login />;
  }

  /*
   * Layer 2:
   * Account exists but vault is locked.
   *
   * We'll replace this with UnlockVault.jsx next.
   */
  if (!vaultUnlocked) {
  return <UnlockVault />;
}

  /*
   * Layer 3:
   * Account authenticated + vault unlocked.
   *
   * Dashboard will replace this next.
   */
  return <Dashboard />;
}

export default App;