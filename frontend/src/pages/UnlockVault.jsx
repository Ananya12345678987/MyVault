import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, ArrowRight } from "lucide-react";

import { useAuth } from "../context/AuthContext";

function UnlockVault({ onUnlocked, onCancel }) {
const { user, unlock, error, clearError } = useAuth();

  const [masterPassword, setMasterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    clearError();
    setSubmitting(true);

        try {
      await unlock(masterPassword);
      setMasterPassword("");
      onUnlocked?.();
    } catch {
      // AuthContext stores the error.
    } finally {
      setSubmitting(false);
    }
  }

    return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-sm border border-border bg-surface p-8">

          {/* Brand */}
          <div className="mb-12 flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-vault-green">
              <LockKeyhole size={18} className="text-vault-green" />
            </div>

            <span className="font-heading text-xl font-semibold">
              MyVault
            </span>
          </div>

          {/* Header */}
          <div className="mb-10 text-center">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-vault-green">
              VAULT SECURITY
            </p>

            <h1 className="font-heading text-4xl font-semibold tracking-tight">
              Unlock your vault.
            </h1>

            <p className="mt-4 text-sm leading-6 text-text-muted">
              Your account is authenticated, but your vault is still locked.
              Enter your master password to continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <label
                htmlFor="masterPassword"
                className="mb-2 block text-sm font-medium"
              >
                Master password
              </label>

              <div className="relative">
                <input
                  id="masterPassword"
                  type={showPassword ? "text" : "password"}
                  value={masterPassword}
                  onChange={(event) => setMasterPassword(event.target.value)}
                  placeholder="Enter your master password"
                  autoComplete="current-password"
                  className="input-field pr-12"
                  required
                  autoFocus
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted transition-colors hover:text-text"
                  aria-label={
                    showPassword
                      ? "Hide master password"
                      : "Show master password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

                      {/* Unlock / Cancel */}
            <div className="flex gap-3">
              {onCancel && (
                <button type="button" onClick={onCancel} className="btn-secondary flex-1">
                  Cancel
                </button>
              )}
              <button type="submit" disabled={submitting} className="btn-primary flex-1 gap-2">
                {submitting ? "Unlocking..." : "Unlock vault"}
                {!submitting && <ArrowRight size={18} />}
              </button>
                        </div>
          </form>

          {/* Account information */}
          <div className="mt-10 border-t border-border pt-6 text-center">
            <p className="text-xs text-text-muted">
              Signed in as
            </p>

            <p className="mt-1 font-mono text-xs text-text">
              {user?.email}
            </p>
          </div>

          {/* Security note */}
          <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
            Master password unlocks vault access
          </p>

        </div>
      </div>
  );
}

export default UnlockVault;