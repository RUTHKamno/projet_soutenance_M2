const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export const fetchCommentaires = async (limit = 20, offset = 0) => {
  const res = await fetch(
    `${API_BASE}/commentaires?limit=${limit}&offset=${offset}`,
    { headers: { "ngrok-skip-browser-warning": "true" } },
  );
  if (!res.ok) throw new Error("Erreur lors du chargement des avis.");
  return res.json();
};

export const postCommentaire = async (data) => {
  const res = await fetch(`${API_BASE}/commentaires`, {
    method: "POST",
    headers: {
      "ngrok-skip-browser-warning": "true",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erreur lors de l'envoi.");
  }
  return res.json();
};

// // ── Commentaires & notations ────────────────────────────────────────────
// export const getAllComments = async () => {
//   const res = await fetch(`${API_BASE}/commentaires/admin/all`, {
//     headers: {
//       "ngrok-skip-browser-warning": "true",
//       "Content-Type": "application/json",
//     },
//   });
//   return res.json();
// };

// export const updateCommentStatus = async (id, statut) => {
//   const res = await fetch(`${API_BASE}/commentaires/admin/${id}/statut`, {
//     method: "PATCH",
//     headers: {
//       "ngrok-skip-browser-warning": "true",
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({ statut }),
//   });
//   return res.json();
// };
