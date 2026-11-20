import { useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

/*
 * Single-user sign-in. One master password signs you in AND unlocks
 * the vault. No email, no "create account".
 */
function Login() {
  const [masterPassword, setMasterPassword] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/owner-login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterPassword }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      // Reload so the app restores the new session (signed in + unlocked).
      window.location.reload();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 py-12 text-text">
      <div className="w-full max-w-md">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center border border-vault-green">
            <span className="font-mono text-sm text-vault-green">M</span>
          </div>
          <span className="font-heading text-lg font-semibold tracking-tight">MyVault</span>
        </div>

        <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-vault-green">
          PRIVATE STORAGE
        </p>
        <h1 className="font-heading text-4xl font-semibold tracking-tight">Welcome back.</h1>
        <p className="mt-3 text-text-muted">Enter your master password to open your vault.</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <div>
            <label htmlFor="masterPassword" className="mb-2 block text-sm font-medium">
              Master password
            </label>
            <div className="relative">
              <input
                id="masterPassword"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={masterPassword}
                onChange={(event) => setMasterPassword(event.target.value)}
                placeholder="Enter your master password"
                className="input-field pr-12"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-text-muted hover:text-text"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full gap-2">
            {submitting ? "Opening…" : "Open vault"}
            {!submitting && <ArrowRight size={17} />}
          </button>
        </form>
      </div>
    </main>
  );
}

export default Login;
