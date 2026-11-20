import { useState } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";

import Dashboard from "./pages/Dashboard";

import { useAuth } from "./context/AuthContext";

function App() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState("login");
  

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
    return authView === "register" ? (
      <Register onSwitchToLogin={() => setAuthView("login")} />
    ) : (
      <Login onSwitchToRegister={() => setAuthView("register")} />
    );
  }

    /*
   * Account authenticated — go straight to the dashboard. The vault
   * unlock step is no longer a full-page gate; it now appears as an
   * inline popup only at the moment an action actually needs it
   * (see AddItemModal — item detail view will do the same later).
   */
  return <Dashboard />;
}

export default App;