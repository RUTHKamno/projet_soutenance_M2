import jsPDF from "jspdf";

export const exportMessageToPdf = (message) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;

  // En-tête
  doc.setFillColor(138, 126, 3);
  doc.rect(0, 0, pageWidth, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Be IT Africa — Assistant BI Analytique", margin, 12);

  // Date
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(new Date().toLocaleString("fr-FR"), pageWidth - margin, 12, {
    align: "right",
  });

  // Contenu
  doc.setTextColor(31, 27, 22);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const lines = doc.splitTextToSize(message.content || "", maxWidth);
  let y = 30;

  lines.forEach((line) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, margin, y);
    y += 6;
  });

  doc.save(`reponse_agent_bi_${Date.now()}.pdf`);
};

export const exportChatToPdf = (messages) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;

  // En-tête
  doc.setFillColor(138, 126, 3);
  doc.rect(0, 0, pageWidth, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Be IT Africa — Historique de conversation", margin, 12);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(new Date().toLocaleString("fr-FR"), pageWidth - margin, 12, {
    align: "right",
  });

  let y = 30;

  messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .forEach((msg) => {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }

      // Label rôle
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(138, 126, 3);
      doc.text(msg.role === "user" ? "Vous" : "Agent BI", margin, y);
      y += 5;

      // Contenu
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(31, 27, 22);
      const lines = doc.splitTextToSize(msg.content || "", maxWidth);
      lines.forEach((line) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += 5.5;
      });

      y += 4;

      // Séparateur léger
      doc.setDrawColor(230, 220, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
    });

  doc.save(`conversation_agent_bi_${Date.now()}.pdf`);
};
