// À placer dans : src/components/Chat/ChatHelpAccordionItem.jsx
import React, { useState } from "react";

const ChatHelpAccordionItem = ({ title, children }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`help-item ${expanded ? "help-item-open" : ""}`}>
      <button
        className="help-item-trigger"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <span className="help-item-chevron" aria-hidden="true" />
      </button>
      <div className="help-item-panel">
        <div className="help-item-panel-inner">{children}</div>
      </div>
    </div>
  );
};

export default ChatHelpAccordionItem;
