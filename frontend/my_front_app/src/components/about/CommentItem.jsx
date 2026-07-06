import React from "react";
import StarRating from "./StarRating";
import "../../styles/About/CommentsList.css";

const CommentItem = ({ commentaire }) => (
  <div className="comment-item">
    <div className="comment-header">
      <span className="comment-nom">{commentaire.nom}</span>
      <StarRating value={commentaire.note} onChange={() => {}} readOnly />
    </div>
    <p className="comment-texte">{commentaire.commentaire}</p>
    <span className="comment-date">
      {new Date(commentaire.created_at).toLocaleDateString("fr-FR")}
    </span>
  </div>
);

export default CommentItem;
