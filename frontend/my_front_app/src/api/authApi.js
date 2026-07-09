import { getToken } from "../utils/tokenUtils.js";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export const authApi = {
  async signIn(email, password) {
    const res = await fetch(`${API_BASE}/auth/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur de connexion.");
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${getToken()}`,
      },
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error || "Erreur de récupération du profil.");
    return data.user;
  },

  async updateSelf(payload) {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "PUT",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur de mise à jour.");
    return data;
  },

  // Superset
  async getSupersetToken(dashboardId) {
    console.log("getSupersetToken", dashboardId);
    const res = await fetch(
      `${API_BASE}/auth/superset-token?dashboardId=${dashboardId}`,
      {
        headers: {
          "ngrok-skip-browser-warning": "true",
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    const data = await res.json();
    if (!res.ok)
      throw new Error(
        data.error ||
          "Impossible de charger les configurations du tableau de bord.",
      );
    return data; // Contient { guestToken, dashboardId, supersetUrl }
  },
};
