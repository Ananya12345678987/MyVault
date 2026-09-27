import { useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

import { useAuth } from "../context/AuthContext";

function Login() {
  const { login, error, clearError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    clearError();
    setSubmitting(true);

    try {
      await login({
        email,
        password,
      });
    } catch {
      // AuthContext already stores the error.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left side — product identity */}
        <section className="hidden border-r border-border lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center border border-vault-green">
                <span className="font-mono text-sm text-vault-green">
                  M
                </span>
              </div>

              <span className="font-heading text-lg font-semibold tracking-tight">
                MyVault
              </span>
            </div>
          </div>

          <div className="max-w-lg">
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.3em] text-vault-green">
              PRIVATE STORAGE
            </p>

            <h1 className="font-heading text-5xl font-semibold leading-tight">
              Your secrets.
              <br />
              Under your control.
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-text-muted">
              Store passwords, API keys, environment variables, notes and
              other sensitive information in one private vault.
            </p>
          </div>

          <div className="font-mono text-xs text-text-muted">
            MYVAULT / SECURE SESSION
          </div>
        </section>

        {/* Right side — login form */}
        <section className="flex min-h-screen items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {/* Mobile brand */}
            <div className="mb-12 flex items-center gap-3 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center border border-vault-green">
                <span className="font-mono text-sm text-vault-green">
                  M
                </span>
              </div>

              <span className="font-heading text-lg font-semibold">
                MyVault
              </span>
            </div>

            <div className="mb-10">
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-vault-green">
                ACCOUNT ACCESS
              </p>

              <h2 className="font-heading text-4xl font-semibold tracking-tight">
                Welcome back.
              </h2>

              <p className="mt-3 text-text-muted">
                Sign in to access your MyVault account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="input-field"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium"
                  >
                    Account password
                  </label>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your account password"
                    className="input-field pr-12"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted transition-colors hover:text-text"
                    aria-label={
                      showPassword
                        ? "Hide account password"
                        : "Show account password"
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

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full gap-2"
              >
                {submitting ? "Signing in..." : "Sign in"}

                {!submitting && <ArrowRight size={18} />}
              </button>
            </form>

            <div className="mt-8 border-t border-border pt-6 text-center text-sm text-text-muted">
              Don't have an account?{" "}
              <button
                type="button"
                className="font-medium text-vault-green transition-colors hover:text-vault-green-hover"
              >
                Create one
              </button>
            </div>

            <p className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
              Account password ≠ master password
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;