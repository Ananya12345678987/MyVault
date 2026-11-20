import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

import { useAuth } from "./context/AuthContext";

function App() {
  const { user, loading } = useAuth();

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

  // Not signed in -> single master-password screen (no sign-up).
  if (!user) {
    return <Login />;
  }

  return <Dashboard />;
}

export default App;
