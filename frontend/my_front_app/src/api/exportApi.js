// api/exportApi.js
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

export const exportChartMultiSheet = async (chartId, dimensions, fileName) => {
  const res = await fetch(
    `${API_BASE}/superset/chart/${chartId}/export-multi-sheet`,
    {
      method: "POST",
      headers: defaultHeaders(true),
      body: JSON.stringify({ dimensions }),
    },
  );

  if (!res.ok) {
    let errorMessage = "Erreur lors de l'exportation Excel.";
    try {
      const err = await res.json();
      errorMessage = err.message || err.error || errorMessage;
    } catch (_) {
      // Ignoré si la réponse d'erreur n'est pas du JSON
    }
    throw new Error(errorMessage);
  }

  // Récupération du fichier sous forme de Blob
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || `export_${Date.now()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
