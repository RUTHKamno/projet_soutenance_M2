import React, { useState } from "react";
import "../../styles/chat/ChatFAB.css";

const ChatFAB = ({ onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="fab-wrapper">
      <div className={`fab-tooltip ${hovered ? "tooltip-visible" : ""}`}>
        Posez-moi des questions 💬
      </div>
      <button
        className="fab-btn"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Ouvrir le chat IA"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="8" cy="10" r="1" fill="#fff" />
          <circle cx="12" cy="10" r="1" fill="#fff" />
          <circle cx="16" cy="10" r="1" fill="#fff" />
        </svg>
      </button>
    </div>
  );
};

export default ChatFAB;
