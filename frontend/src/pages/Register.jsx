import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import VaultMark from "../components/VaultMark.jsx";

export default function Register({ onSwitchToLogin }) {
const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register({email, password, masterPassword});
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <VaultMark />
          <h1 className="font-display text-2xl font-semibold mt-4">Create your vault</h1>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5">
              Account password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="At least 10 characters"
            />
            <p className="text-xs text-text-muted mt-1.5">Used to sign in. We hash this — we never store it.</p>
          </div>

          <div className="pt-2 border-t border-border">
            <label htmlFor="masterPassword" className="block text-sm font-medium mb-1.5 mt-4">
              Master password
            </label>
            <input
              id="masterPassword"
              type="password"
              required
              minLength={10}
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              className="input-field"
              placeholder="At least 10 characters"
            />
            <p className="text-xs text-text-muted mt-1.5">
              Unlocks your vault. Kept separate from your account password on purpose — even if your
              account password leaked, your stored secrets would still be safe. We can't recover this
              if you forget it.
            </p>
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Creating vault…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted mt-6">
          Already have an account?{" "}
                  <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-vault-green hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}