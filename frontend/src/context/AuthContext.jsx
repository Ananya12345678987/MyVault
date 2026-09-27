import { createContext, useContext, useEffect, useState } from "react";

import {
  getCurrentUser,
  getVaultStatus,
  loginUser,
  logoutUser,
  registerUser,
  unlockVault,
  lockVault,
} from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * Restore authentication state when the application starts.
   *
   * The browser automatically sends the HTTP-only authentication
   * cookie through api.js.
   */
  useEffect(() => {
    async function restoreSession() {
      try {
        const userResponse = await getCurrentUser();

        setUser(userResponse.user);

        /*
         * Account authentication succeeded.
         * Now check the separate vault session.
         */
        const vaultResponse = await getVaultStatus();

        setVaultUnlocked(Boolean(vaultResponse.unlocked));
      } catch (err) {
        /*
         * No valid account session means the user is logged out.
         */
        setUser(null);
        setVaultUnlocked(false);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  /*
   * Register a new account.
   *
   * The backend creates both security layers and immediately
   * establishes the account session, but the vault still needs
   * to be unlocked separately.
   */
  async function register({ email, password, masterPassword }) {
    setError("");

    try {
      const response = await registerUser({
        email,
        password,
        masterPassword,
      });

      setUser(response.user);
      setVaultUnlocked(false);

      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  /*
   * Login only authenticates the account.
   * It does NOT unlock the vault.
   */
  async function login({ email, password }) {
    setError("");

    try {
      const response = await loginUser({
        email,
        password,
      });

      setUser(response.user);
      setVaultUnlocked(false);

      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  /*
   * Unlock the separate vault session using the master password.
   */
  async function unlock(masterPassword) {
    setError("");

    try {
      const response = await unlockVault(masterPassword);

      setVaultUnlocked(Boolean(response.unlocked));

      return response;
    } catch (err) {
      setVaultUnlocked(false);
      setError(err.message);
      throw err;
    }
  }

  /*
   * Lock the vault without logging the user out.
   */
  async function lock() {
    setError("");

    try {
      const response = await lockVault();

      setVaultUnlocked(false);

      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  /*
   * Completely log out of the account.
   *
   * We also clear the local vault state immediately.
   */
  async function logout() {
    setError("");

    try {
      await logoutUser();
    } finally {
      setUser(null);
      setVaultUnlocked(false);
    }
  }

  const value = {
    user,
    vaultUnlocked,
    loading,
    error,

    register,
    login,
    unlock,
    lock,
    logout,

    clearError: () => setError(""),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
}