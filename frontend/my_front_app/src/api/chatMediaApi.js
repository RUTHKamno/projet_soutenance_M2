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

export const chatMediaApi = async (userId) => {
  const res = await fetch(`${API_BASE}/agent/chats/${userId}/media`, {
    headers: defaultHeaders(true),
  });
  if (!res.ok) throw new Error("Erreur lors du chargement des medias du chat.");
  return res.json();
};

export const deleteMedia = async (mediaId) => {
  const res = await fetch(`${API_BASE}/agent/chats/media/${mediaId}`, {
    method: "DELETE",
    headers: defaultHeaders(false), // ou simplement defaultHeaders() sans envoyer de JSON
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      err.message || err.error || "Erreur lors de la suppression.",
    );
  }
  return res.json();
};

// export const chatMediaApi = {
//   getUserMedia: async (userId) => {
//     const { data } = await apiClient.get(`/chats/${userId}/media`);
//     return data;
//   },
// };
