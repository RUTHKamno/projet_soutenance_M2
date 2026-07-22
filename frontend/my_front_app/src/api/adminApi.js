import { getToken } from "../utils/tokenUtils.js";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const defaultHeaders = (hasJson = true) => {
  const headers = {
    "ngrok-skip-browser-warning": "true",
  };
  if (hasJson) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

const handleUnauthorized = () => {
  try {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
  } catch (e) {
    console.warn("Erreur lors du nettoyage du token:", e);
  }
  window.location.href = "/login";
};

const checkResponse = async (res, defaultMsg) => {
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    // no-op: réponse vide ou non-JSON
  }

  try {
    const combined =
      (data && (data.error || data.message)) || JSON.stringify(data || {});
    if (
      typeof combined === "string" &&
      /session\s*expir|session\s*expir[eé]|token\s*inval/i.test(combined)
    ) {
      handleUnauthorized();
      throw new Error(
        "Session expirée ou token invalide. Vous allez être redirigé vers la connexion.",
      );
    }
  } catch (e) {
    // ignore erreurs JSON.stringify
  }

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error(
      "Session expirée ou token invalide. Vous allez être redirigé vers la connexion.",
    );
  }

  if (!res.ok) {
    throw new Error(data.error || defaultMsg || "Erreur serveur.");
  }

  return data;
};

const buildQuery = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null,
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries).toString();
};

export const adminApi = {
  // ── KPIs & connexions ──────────────────────────────────────────────────
  async getKpis(userId) {
    const res = await fetch(`${API_BASE}/admin/kpis${buildQuery({ userId })}`, {
      headers: defaultHeaders(false),
    });
    return checkResponse(res, "Erreur chargement des KPIs.");
  },

  async getConnectionsEvolution(granularity = "day", userId) {
    const res = await fetch(
      `${API_BASE}/admin/connections-evolution${buildQuery({ granularity, userId })}`,
      { headers: defaultHeaders(false) },
    );
    const data = await checkResponse(
      res,
      "Erreur chargement de l'évolution des connexions.",
    );
    return data.evolution || [];
  },

  // ── Utilisateurs ────────────────────────────────────────────────────────
  async getUsersWithStatus() {
    const res = await fetch(`${API_BASE}/admin/users-status`, {
      headers: defaultHeaders(false),
    });
    const data = await checkResponse(
      res,
      "Erreur chargement des utilisateurs.",
    );
    return data.users || [];
  },

  async createUser(payload) {
    // Réutilise la route existante POST /auth/users (déjà en place, admin only)
    const res = await fetch(`${API_BASE}/auth/users`, {
      method: "POST",
      headers: defaultHeaders(true),
      body: JSON.stringify(payload),
    });
    return checkResponse(res, "Erreur lors de la création de l'utilisateur.");
  },

  async updateUser(id, payload) {
    // Réutilise la route existante PUT /auth/users/:id (déjà en place, admin only)
    const res = await fetch(`${API_BASE}/auth/users/${id}`, {
      method: "PUT",
      headers: defaultHeaders(true),
      body: JSON.stringify(payload),
    });
    return checkResponse(
      res,
      "Erreur lors de la mise à jour de l'utilisateur.",
    );
  },

  async deactivateUser(id) {
    const res = await fetch(`${API_BASE}/admin/users/${id}/deactivate`, {
      method: "PATCH",
      headers: defaultHeaders(true),
      body: JSON.stringify({}),
    });
    return checkResponse(res, "Erreur lors de la désactivation.");
  },

  async reactivateUser(id) {
    const res = await fetch(`${API_BASE}/admin/users/${id}/reactivate`, {
      method: "PATCH",
      headers: defaultHeaders(true),
      body: JSON.stringify({}),
    });
    return checkResponse(res, "Erreur lors de la réactivation.");
  },

  // ── Commentaires & notations ────────────────────────────────────────────
  async getAllComments() {
    const res = await fetch(`${API_BASE}/commentaires/admin/all`, {
      headers: defaultHeaders(false),
    });
    const data = await checkResponse(
      res,
      "Erreur chargement des commentaires.",
    );
    return data.commentaires || [];
  },

  async updateCommentStatus(id, statut) {
    const res = await fetch(`${API_BASE}/commentaires/admin/${id}/statut`, {
      method: "PATCH",
      headers: defaultHeaders(true),
      body: JSON.stringify({ statut }),
    });
    return checkResponse(res, "Erreur lors de la mise à jour du statut.");
  },

  // ── Rôles ───────────────────────────────────────────────────────────────
  async getRoles() {
    const res = await fetch(`${API_BASE}/roles`, {
      headers: defaultHeaders(false),
    });
    const data = await checkResponse(res, "Erreur chargement des rôles.");
    return data.roles || [];
  },

  async createRole(payload) {
    const res = await fetch(`${API_BASE}/roles`, {
      method: "POST",
      headers: defaultHeaders(true),
      body: JSON.stringify(payload),
    });
    const data = await checkResponse(
      res,
      "Erreur lors de la création du rôle.",
    );
    return data.role;
  },

  async updateRole(id, payload) {
    const res = await fetch(`${API_BASE}/roles/${id}`, {
      method: "PUT",
      headers: defaultHeaders(true),
      body: JSON.stringify(payload),
    });
    const data = await checkResponse(
      res,
      "Erreur lors de la mise à jour du rôle.",
    );
    return data.role;
  },

  async deleteRole(id) {
    const res = await fetch(`${API_BASE}/roles/${id}`, {
      method: "DELETE",
      headers: defaultHeaders(false),
    });
    return checkResponse(res, "Erreur lors de la suppression du rôle.");
  },
};
