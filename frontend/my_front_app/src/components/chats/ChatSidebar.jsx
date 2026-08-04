// import React, { useEffect, useRef, useState } from "react";
// import { useChat } from "../../hooks/useChat";
// import ChatBubble from "./ChatBubble";
// import { getChatQuickActions } from "../../data/chatSections";
// import "../../styles/chat/ChatSidebar.css";
// import { exportChatToPdf } from "../../utils/exportPdf";

// const ChatSidebar = ({ open, onClose, userRole }) => {
//   const {
//     messages,
//     loading,
//     pendingReformulation,
//     loadHistory,
//     sendQuestion,
//     sendQuestionDirect,
//     sendValidation,
//     retryLastQuestion,
//     cancelReformulation,
//     publishToSuperset,
//   } = useChat();

//   const [input, setInput] = useState("");
//   const [correcting, setCorrecting] = useState(false);
//   const [correctedText, setCorrectedText] = useState("");

//   const quickActions = getChatQuickActions(userRole);

//   const handleQuickAction = async (question) => {
//     if (!question || loading || pendingReformulation) return;
//     await sendQuestionDirect(question);
//   };
//   const bottomRef = useRef(null);
//   const inputRef = useRef(null);
//   const historyLoaded = useRef(false);

//   // Charger l'historique une seule fois à l'ouverture
//   useEffect(() => {
//     if (open && !historyLoaded.current) {
//       loadHistory();
//       historyLoaded.current = true;
//     }
//   }, [open, loadHistory]);

//   // Scroll automatique vers le bas
//   useEffect(() => {
//     bottomRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   const handleSend = async () => {
//     const q = input.trim();
//     if (!q || loading) return;
//     setInput("");
//     await sendQuestion(q);
//   };

//   const handleKeyDown = (e) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       handleSend();
//     }
//   };

//   const handleApprove = () => {
//     setCorrecting(false);
//     sendValidation(true);
//   };

//   const handleReject = () => {
//     setCorrecting(true);
//     setCorrectedText(pendingReformulation || "");
//   };

//   const handleSendCorrection = () => {
//     const text = correctedText.trim();
//     if (!text) return;
//     setCorrecting(false);
//     sendValidation(false, text);
//   };

//   const handleEdit = (message) => {
//     if (!message) return;
//     setCorrecting(false);
//     setInput(message.content || "");
//     setTimeout(() => {
//       inputRef.current?.focus();
//     }, 50);
//   };

//   const handlePublishSuperset = (message) => {
//     // Optionnel : Tu pourrais aussi ouvrir une modal pour demander sur quel dashboard publier.
//     // Ici, on utilise l'ID par défaut (ex: 2) ou celui configuré.
//     const targetDashboardId = 2;

//     publishToSuperset(message.id, targetDashboardId);
//   };

//   return (
//     <>
//       {/* Overlay sombre derrière la sidebar */}
//       <div
//         className={`chat-overlay ${open ? "overlay-visible" : ""}`}
//         onClick={onClose}
//       />

//       <aside className={`chat-sidebar ${open ? "sidebar-open" : ""}`}>
//         {/* Header */}
//         <div className="sidebar-header">
//           <div className="sidebar-header-left">
//             <div className="sidebar-avatar">BI</div>
//             <div>
//               <p className="sidebar-title">Assistant BI</p>
//               <p className="sidebar-subtitle">Microfinance · Be IT Africa</p>
//             </div>
//           </div>
//           <div className="sidebar-header-actions">
//             <button
//               className="sidebar-action-btn"
//               onClick={() => exportChatToPdf(messages)}
//               title="Exporter la conversation en PDF"
//             >
//               ↓ PDF
//             </button>
//             <button className="sidebar-close" onClick={onClose}>
//               ✕
//             </button>
//           </div>
//         </div>

//         <div className="sidebar-quick-actions">
//           <span className="sidebar-quick-label">Actions rapides :</span>
//           <div className="sidebar-quick-buttons">
//             {quickActions.map((action) => (
//               <button
//                 key={action.label}
//                 className="sidebar-quick-btn"
//                 onClick={() => handleQuickAction(action.question)}
//                 disabled={loading || !!pendingReformulation}
//               >
//                 {action.label}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Messages */}
//         <div className="sidebar-messages">
//           {messages.length === 0 && !loading && (
//             <div className="sidebar-empty">
//               <span className="sidebar-empty-icon">💬</span>
//               <p>Posez une question sur vos données microfinance.</p>
//             </div>
//           )}

//           {messages.map((msg) => (
//             <ChatBubble
//               key={msg.id}
//               message={msg}
//               onApprove={handleApprove}
//               onReject={handleReject}
//               onCancel={cancelReformulation}
//               onEdit={handleEdit}
//               onRetry={retryLastQuestion}
//               onPublishSuperset={handlePublishSuperset}
//             />
//           ))}

//           {loading && (
//             <div className="sidebar-typing" role="status" aria-live="polite">
//               <div className="sidebar-typing-loader" aria-hidden="true">
//                 <span />
//                 <span />
//                 <span />
//               </div>
//               <p className="sidebar-typing-text">
//                 L’assistant prépare la réponse…
//               </p>
//             </div>
//           )}

//           <div ref={bottomRef} />
//         </div>

//         {/* Zone correction si rejet */}
//         {correcting && (
//           <div className="sidebar-correction">
//             <p className="correction-label">✦ Corrigez la question :</p>
//             <textarea
//               value={correctedText}
//               onChange={(e) => setCorrectedText(e.target.value)}
//               rows={3}
//               className="correction-textarea"
//             />
//             <button
//               className="bubble-btn-approve"
//               onClick={handleSendCorrection}
//             >
//               Envoyer la correction →
//             </button>
//           </div>
//         )}

//         {/* Input */}
//         {!correcting && (
//           <div className="sidebar-input-zone">
//             <textarea
//               ref={inputRef}
//               className="sidebar-input"
//               placeholder="Posez votre question..."
//               value={input}
//               onChange={(e) => setInput(e.target.value)}
//               onKeyDown={handleKeyDown}
//               rows={2}
//               disabled={loading || !!pendingReformulation}
//             />
//             <button
//               className="sidebar-send"
//               onClick={handleSend}
//               disabled={loading || !input.trim() || !!pendingReformulation}
//             >
//               →
//             </button>
//           </div>
//         )}
//       </aside>
//     </>
//   );
// };

// export default ChatSidebar;
import React, { useEffect, useRef, useState } from "react";
import { useChat } from "../../hooks/useChat";
import ChatBubble from "./ChatBubble";
import ChatHelpGuide from "./ChatHelpGuide";
import { getChatQuickActions } from "../../data/chatSections";
import "../../styles/chat/ChatSidebar.css";
import { exportChatToPdf } from "../../utils/exportPdf";

const ChatSidebar = ({ open, onClose, userRole }) => {
  const {
    messages,
    loading,
    pendingReformulation,
    loadHistory,
    sendQuestion,
    sendQuestionDirect,
    sendValidation,
    retryLastQuestion,
    cancelReformulation,
    publishToSuperset,
  } = useChat();

  const [input, setInput] = useState("");
  const [correcting, setCorrecting] = useState(false);
  const [correctedText, setCorrectedText] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  const quickActions = getChatQuickActions(userRole);

  const handleQuickAction = async (question) => {
    if (!question || loading || pendingReformulation) return;
    await sendQuestionDirect(question);
  };
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
              className="sidebar-help-btn"
              onClick={() => setHelpOpen(true)}
              title="Guide d'utilisation"
              aria-label="Ouvrir le guide d'utilisation"
            >
              ?
            </button>
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

        <div className="sidebar-quick-actions">
          <span className="sidebar-quick-label">Actions rapides :</span>
          <div className="sidebar-quick-buttons">
            {quickActions.map((action) => (
              <button
                key={action.label}
                className="sidebar-quick-btn"
                onClick={() => handleQuickAction(action.question)}
                disabled={loading || !!pendingReformulation}
              >
                {action.label}
              </button>
            ))}
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
            <div className="sidebar-typing" role="status" aria-live="polite">
              <div className="sidebar-typing-loader" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p className="sidebar-typing-text">
                L’assistant prépare la réponse…
              </p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Panneau guide d'utilisation (superposé au-dessus des messages) */}
        <ChatHelpGuide open={helpOpen} onClose={() => setHelpOpen(false)} />

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
