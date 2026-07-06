import React from "react";
import CommentItem from "./CommentItem";
import "../../styles/About/CommentsList.css";

const CommentsList = ({ commentaires, stats, loading }) => {
  if (loading)
    return <p className="comments-loading">Chargement des avis...</p>;

  return (
    <section className="comments-list">
      <div className="comments-stats">
        <span className="stats-moyenne">{stats.moyenne} / 5</span>
        <span className="stats-total">({stats.total} avis)</span>
      </div>
      {commentaires.length === 0 ? (
        <p>Aucun avis pour le moment. Soyez la première à commenter !</p>
      ) : (
        commentaires.map((c) => <CommentItem key={c.id} commentaire={c} />)
      )}
    </section>
  );
};

export default CommentsList;
