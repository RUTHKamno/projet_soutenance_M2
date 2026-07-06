import React, { useState } from "react";
import StarRating from "./StarRating";
import "../../styles/About/CommentForm.css";

const CommentForm = ({ onSubmit, submitting }) => {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nom || !note || !commentaire) return;
    const ok = await onSubmit({ nom, email, note, commentaire });
    if (ok) {
      setNom("");
      setEmail("");
      setNote(0);
      setCommentaire("");
    }
  };

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <h2>Laissez-nous votre avis</h2>
      <input
        type="text"
        placeholder="Votre nom"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        required
      />
      <input
        type="email"
        placeholder="Votre email (optionnel)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <StarRating value={note} onChange={setNote} />
      <textarea
        placeholder="Votre commentaire"
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        required
      />
      <button type="submit" disabled={submitting}>
        {submitting ? "Envoi..." : "Envoyer"}
      </button>
    </form>
  );
};

export default CommentForm;
