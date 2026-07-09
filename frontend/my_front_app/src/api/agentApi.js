import { getToken } from "../utils/tokenUtils.js";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const defaultHeaders = (hasJson = true) => {
  const headers = {
    "ngrok-skip-browser-warning": "true", // 👈 la clé du problème
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const base = {};
  if (hasJson) base["Content-Type"] = "application/json";
  const token = getToken();
  if (token) base["Authorization"] = `Bearer ${token}`;
  return base;
};

const handleUnauthorized = () => {
  try {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
  } catch (e) {
    console.warn("Erreur lors du nettoyage du token:", e);
  }
  // Force redirect vers la page de connexion
  window.location.href = "/login";
};

const checkResponse = async (res, defaultMsg) => {
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    // no-op: response may be empty or not JSON
  }

  // Detect textual session-expired messages even if status is 200
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
    // ignore JSON stringify issues
  }
  if (res.status === 401) {
    // Token invalide / session expirée: forcer logout
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

export const agentApi = {
  async ask(question, language = "fr") {
    const res = await fetch(`${API_BASE}/agent/ask`, {
      method: "POST",
      headers: defaultHeaders(true),
      body: JSON.stringify({ question, language }),
    });
    const data = await checkResponse(res, "Erreur lors de l'envoi.");
    return data; // { status, thread_id, reformulatedQuestion?, message? }
  },

  async resume(thread_id, approved, correctedQuestion = "") {
    const res = await fetch(`${API_BASE}/agent/resume`, {
      method: "POST",
      headers: defaultHeaders(true),
      body: JSON.stringify({ thread_id, approved, correctedQuestion }),
    });
    const data = await checkResponse(res, "Erreur lors de la reprise.");
    return data; // { status, summary, chartConfig?, audit? }
  },

  async getHistory() {
    const res = await fetch(`${API_BASE}/agent/history`, {
      headers: defaultHeaders(false),
    });
    const data = await checkResponse(res, "Erreur récupération historique.");
    return data.messages || [];
  },

  async getDashboards() {
    const res = await fetch(`${API_BASE}/auth/dashboards`, {
      headers: defaultHeaders(false),
    });
    const data = await checkResponse(res, "Erreur chargement dashboards.");
    return data.dashboards || [];
  },

  async exportPdfDashboard(dashboardId) {
    const res = await fetch(`${API_BASE}/pdf/export-pdf`, {
      method: "POST",
      headers: defaultHeaders(true),
      body: JSON.stringify({ dashboardId }),
    });
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error("Session expirée ou token invalide.");
    }
    if (!res.ok) {
      let data = {};
      try {
        data = await res.json();
      } catch (e) {}
      throw new Error(data.error || "Erreur export PDF.");
    }
    return res.blob();
  },

  async exportDashboardPdf(dashboardId, dashboardLabel) {
    // Décoder le token pour récupérer role et contextInfo
    const token = getToken();
    let role = "";
    let contextInfo = {};
    console.log(
      "Export PDF pour dashboard:",
      dashboardId,
      "label:",
      dashboardLabel,
    );

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      role = payload.role || "";
      contextInfo = payload.contextInfo || {};
    } catch (e) {
      console.error("Impossible de décoder le token:", e);
    }

    const res = await fetch(`${API_BASE}/pdf/export-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        dashboardId,
        role,
        contextInfo,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Échec export PDF.");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport_${dashboardLabel}_${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // 📌 AJOUT DE LA NOUVELLE MÉTHODE ICI
  async publishChart({ thread_id, dashboardId, chartTitle }) {
    const res = await fetch(`${API_BASE}/agent/publish-superset`, {
      method: "POST",
      headers: defaultHeaders(true),
      body: JSON.stringify({
        thread_id,
        dashboardId,
        chartTitle,
      }),
    });

    const data = await checkResponse(
      res,
      "Impossible de publier sur Superset.",
    );
    return data;
  },
};
