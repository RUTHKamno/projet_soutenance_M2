// À placer dans : src/components/Chat/ChatHelpGuide.jsx
import React from "react";
import { helpGuideSections } from "../../data/helpGuideContent";
import ChatHelpAccordionItem from "./ChatHelpAccordionItem";
import "../../styles/chat/ChatHelpGuide.css";

const ChatHelpGuide = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="help-panel" role="dialog" aria-label="Guide d'utilisation">
      <div className="help-panel-header">
        <div>
          <p className="help-panel-title">Guide d'utilisation</p>
          <p className="help-panel-subtitle">
            Comment bien interroger vos données
          </p>
        </div>
        <button
          className="help-panel-close"
          onClick={onClose}
          aria-label="Fermer le guide"
        >
          ✕
        </button>
      </div>

      <div className="help-panel-body">
        {helpGuideSections.map((section) => (
          <ChatHelpAccordionItem key={section.id} title={section.title}>
            {section.body.map((paragraph, i) => (
              <p key={i} className="help-item-paragraph">
                {paragraph}
              </p>
            ))}
            {section.examples && (
              <ul className="help-item-examples">
                {section.examples.map((example, i) => (
                  <li key={i}>{example}</li>
                ))}
              </ul>
            )}
          </ChatHelpAccordionItem>
        ))}
      </div>
    </div>
  );
};

export default ChatHelpGuide;
