import React, { useEffect, useRef, useState } from "react";
import { useChat } from "../../hooks/useChat";
import ChatBubble from "./ChatBubble";
import "../../styles/chat/ChatSidebar.css";
import { exportChatToPdf } from "../../utils/exportPdf";

const ChatSidebar = ({ open, onClose }) => {
  const {
    messages,
    loading,
    pendingReformulation,
    loadHistory,
    sendQuestion,
    sendValidation,
    retryLastQuestion,
    cancelReformulation,
    publishToSuperset,
  } = useChat();

  const [input, setInput] = useState("");
  const [correcting, setCorrecting] = useState(false);
  const [correctedText, setCorrectedText] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const historyLoaded = useRef(false);

  // Charger l'historique une seule fois à l'ouverture
  useEffect(() => {
    if (open && !historyLoaded.current) {
      loadHistory();
      historyLoaded.current = true;
    }
  }, [open, loadHistory]);

  // Scroll automatique vers le bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    await sendQuestion(q);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleApprove = () => {
    setCorrecting(false);
    sendValidation(true);
  };

  const handleReject = () => {
    setCorrecting(true);
    setCorrectedText(pendingReformulation || "");
  };

  const handleSendCorrection = () => {
    const text = correctedText.trim();
    if (!text) return;
    setCorrecting(false);
    sendValidation(false, text);
  };

  const handleEdit = (message) => {
    if (!message) return;
    setCorrecting(false);
    setInput(message.content || "");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handlePublishSuperset = (message) => {
    // Optionnel : Tu pourrais aussi ouvrir une modal pour demander sur quel dashboard publier.
    // Ici, on utilise l'ID par défaut (ex: 2) ou celui configuré.
    const targetDashboardId = 2;

    publishToSuperset(message.id, targetDashboardId);
  };

  return (
    <>
      {/* Overlay sombre derrière la sidebar */}
      <div
        className={`chat-overlay ${open ? "overlay-visible" : ""}`}
        onClick={onClose}
      />

      <aside className={`chat-sidebar ${open ? "sidebar-open" : ""}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-header-left">
            <div className="sidebar-avatar">BI</div>
            <div>
              <p className="sidebar-title">Assistant BI</p>
              <p className="sidebar-subtitle">Microfinance · Be IT Africa</p>
            </div>
          </div>
          <div className="sidebar-header-actions">
            <button
              className="sidebar-action-btn"
              onClick={() => exportChatToPdf(messages)}
              title="Exporter la conversation en PDF"
            >
              ↓ PDF
            </button>
            <button className="sidebar-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="sidebar-messages">
          {messages.length === 0 && !loading && (
            <div className="sidebar-empty">
              <span className="sidebar-empty-icon">💬</span>
              <p>Posez une question sur vos données microfinance.</p>
            </div>
          )}

          {messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              onApprove={handleApprove}
              onReject={handleReject}
              onCancel={cancelReformulation}
              onEdit={handleEdit}
              onRetry={retryLastQuestion}
              onPublishSuperset={handlePublishSuperset}
            />
          ))}

          {loading && (
            <div className="sidebar-typing">
              <span />
              <span />
              <span />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Zone correction si rejet */}
        {correcting && (
          <div className="sidebar-correction">
            <p className="correction-label">✦ Corrigez la question :</p>
            <textarea
              value={correctedText}
              onChange={(e) => setCorrectedText(e.target.value)}
              rows={3}
              className="correction-textarea"
            />
            <button
              className="bubble-btn-approve"
              onClick={handleSendCorrection}
            >
              Envoyer la correction →
            </button>
          </div>
        )}

        {/* Input */}
        {!correcting && (
          <div className="sidebar-input-zone">
            <textarea
              ref={inputRef}
              className="sidebar-input"
              placeholder="Posez votre question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              disabled={loading || !!pendingReformulation}
            />
            <button
              className="sidebar-send"
              onClick={handleSend}
              disabled={loading || !input.trim() || !!pendingReformulation}
            >
              →
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default ChatSidebar;
