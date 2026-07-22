import React from "react";
import "../../../styles/chat/chatsMediaPage/ConfirmModal.css";

const ConfirmModal = ({ title, message, onConfirm, onCancel }) => {
  return (
    <div className="cmodal-overlay" onClick={onCancel}>
      <div className="cmodal-content" onClick={(e) => e.stopPropagation()}>
        <p className="cmodal-title">{title || "Confirmation"}</p>
        <p className="cmodal-message">{message}</p>
        <div className="cmodal-actions">
          <button className="cmodal-cancel" onClick={onCancel}>
            Annuler
          </button>
          <button className="cmodal-confirm" onClick={onConfirm}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
