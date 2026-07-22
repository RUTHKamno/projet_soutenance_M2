import React, { useState } from "react";
import "../../../styles/chat/chatsMediaPage/QuestionModal.css";

const QuestionModal = ({ question, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(question || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="qmodal-overlay" onClick={onClose}>
      <div className="qmodal-content" onClick={(e) => e.stopPropagation()}>
        <div className="qmodal-header">
          <p>Question posée</p>
          <button className="qmodal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="qmodal-body">
          <p>{question}</p>
        </div>
        <div className="qmodal-footer">
          <button className="qmodal-copy" onClick={handleCopy}>
            {copied ? "✓ Copié" : "⧉ Copier"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionModal;
