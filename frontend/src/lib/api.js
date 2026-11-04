const API_BASE = "/api";

// One refresh at a time, even if several requests fail together.
let refreshing = null;

function refreshSession() {
  if (!refreshing) {
    refreshing = fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function request(endpoint, options = {}, retried = false) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
        ...options,
  });

  // The 15-minute login token ran out: get a new one quietly and retry
  // once, instead of throwing the user out. (Login/refresh calls skip this.)
  if (response.status === 401 && !retried && !endpoint.startsWith("/auth/")) {
    if (await refreshSession()) return request(endpoint, options, true);
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(
      data?.error || "Something went wrong. Please try again."
    );

        error.status = response.status;
    error.data = data;

    // The server locked the vault (idle timeout or restart): tell the app
    // so the "Vault locked" label is true again.
    if (response.status === 423) {
      window.dispatchEvent(new Event("vault:locked"));
    }

    throw error;
  }

  return data;
}

/* =========================================================
   AUTH
   ========================================================= */

export async function registerUser({ email, password, masterPassword }) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      masterPassword,
    }),
  });
}

export async function loginUser({ email, password }) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });
}

export async function logoutUser() {
  return request("/auth/logout", {
    method: "POST",
  });
}

export async function getCurrentUser() {
  return request("/auth/me");
}

/* =========================================================
   VAULT SESSION
   ========================================================= */

export async function unlockVault(masterPassword) {
  return request("/vault/unlock", {
    method: "POST",
    body: JSON.stringify({
      masterPassword,
    }),
  });
}

export async function lockVault() {
  return request("/vault/lock", {
    method: "POST",
  });
}

export async function getVaultStatus() {
  return request("/vault/status");
}

/* =========================================================
   VAULT ITEMS
   ========================================================= */

export async function getVaultItems(view = "all") {
  return request(`/vault/items?view=${encodeURIComponent(view)}`);
}

export async function getVaultItem(id) {
  return request(`/vault/items/${id}`);
}

export async function createVaultItem(item) {
  return request("/vault/items", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export async function updateVaultItem(id, item) {
  return request(`/vault/items/${id}`, {
    method: "PUT",
    body: JSON.stringify(item),
  });
}

export async function starVaultItem(id, value) {
  return request(`/vault/items/${id}/star`, {
    method: "PATCH",
    body: JSON.stringify({ value }),
  });
}

export async function archiveVaultItem(id, value) {
  return request(`/vault/items/${id}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ value }),
  });
}

export async function restoreVaultItem(id) {
  return request(`/vault/items/${id}/restore`, {
    method: "PATCH",
  });
}

export async function permanentlyDeleteVaultItem(id) {
  return request(`/vault/items/${id}/permanent`, {
    method: "DELETE",
  });
}

export async function emptyTrash() {
  return request("/vault/trash", {
    method: "DELETE",
  });
}

export async function deleteVaultItem(id) {
  return request(`/vault/items/${id}`, {
    method: "DELETE",
  });
}