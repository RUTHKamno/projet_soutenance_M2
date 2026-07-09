import jsPDF from "jspdf";

// ─── Palette identique au backend (pdfService.ts / PDFKit) ──────────────────
const NAVY = "#1a1a2e";
const GOLD = "#cdae50";
const BG_LIGHT = "#f9f6ee";
const BORDER = "#e0d9c8";
const TEXT_DARK = "#111111";
const TEXT_MUTED = "#555555";
const TEXT_LIGHT = "#999999";

const MARGIN = 20;
const HEADER_H = 18;
const FOOTER_Y_OFFSET = 10;

// ─── Filigrane diagonal ───────────────────────────────────────────────────────
function applyWatermark(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.08 }));
  doc.setTextColor(GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(46);
  doc.text("BE I.T AFRICA", pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: 45,
  });
  doc.restoreGraphicsState();
}

function drawHeaderBand(doc, title) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(NAVY);
  doc.rect(0, 0, pageWidth, HEADER_H, "F");

  doc.setTextColor(GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, MARGIN, 12);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(new Date().toLocaleString("fr-FR"), pageWidth - MARGIN, 12, {
    align: "right",
  });
}

function drawFooter(doc, label) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setTextColor(TEXT_LIGHT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(label, pageWidth / 2, pageHeight - FOOTER_Y_OFFSET, {
    align: "center",
  });
}

function drawSeparator(doc, x, y, width, color = GOLD) {
  doc.setDrawColor(color);
  doc.setLineWidth(0.5);
  doc.line(x, y, x + width, y);
}

function newContentPage(doc, headerTitle, footerLabel) {
  doc.addPage();
  applyWatermark(doc);
  drawHeaderBand(doc, headerTitle);
  drawFooter(doc, footerLabel);
  return HEADER_H + 14;
}

// ══════════════════════════════════════════════════════════════════════════
// PARSING MARKDOWN LÉGER : tableaux, titres, séparateurs, gras
// ══════════════════════════════════════════════════════════════════════════

function isRowLine(line) {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|") && t.length > 2;
}

function isSeparatorLine(line) {
  const t = line.trim();
  return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(t);
}

function splitRow(line) {
  const t = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return t.split("|").map((c) => c.trim());
}

// Ligne "---", "***", "___" (avec ou sans espaces) = filet horizontal
function isHrLine(line) {
  const t = line.trim().replace(/\s+/g, "");
  return /^[-*_]{3,}$/.test(t);
}

// Ligne "### Titre", "## Titre", "# Titre"
function matchHeading(line) {
  const m = line.match(/^(#{1,6})\s+(.*)$/);
  if (!m) return null;
  return { level: m[1].length, text: m[2].trim() };
}

// Découpe le contenu en blocs ordonnés : text | table | heading | hr
function parseContentBlocks(content) {
  const rawLines = (content || "").split("\n");
  const blocks = [];
  let buffer = [];

  const flushText = () => {
    const text = buffer.join("\n").trim();
    if (text) blocks.push({ type: "text", text });
    buffer = [];
  };

  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];

    if (
      isRowLine(line) &&
      i + 1 < rawLines.length &&
      isSeparatorLine(rawLines[i + 1])
    ) {
      flushText();
      const headers = splitRow(line);
      i += 2;
      const rows = [];
      while (i < rawLines.length && isRowLine(rawLines[i])) {
        rows.push(splitRow(rawLines[i]));
        i += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    if (isHrLine(line)) {
      flushText();
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    const heading = matchHeading(line);
    if (heading) {
      flushText();
      blocks.push({
        type: "heading",
        level: heading.level,
        text: heading.text,
      });
      i += 1;
      continue;
    }

    buffer.push(line);
    i += 1;
  }
  flushText();
  return blocks;
}

// ─── Tokenise un paragraphe en mots, avec info gras (issu de **...**) ───────
function tokenizeInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  const words = [];

  parts.forEach((part) => {
    const isBold = /^\*\*[^*]+\*\*$/.test(part);
    const clean = (isBold ? part.slice(2, -2) : part).replace(/\*\*/g, "");
    const chunks = clean.split(/(\s+)/).filter((c) => c.length > 0);

    chunks.forEach((c) => {
      if (/^\s+$/.test(c)) {
        if (words.length > 0) words[words.length - 1].space = true;
      } else {
        words.push({ text: c, bold: isBold, space: false });
      }
    });
  });

  return words;
}

// ─── Tronque un texte à une largeur donnée (mesure réelle) ───────────────────
function truncateToWidth(doc, text, maxWidth) {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = text.slice(0, mid) + "…";
    if (doc.getTextWidth(candidate) <= maxWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return low > 0 ? text.slice(0, low) + "…" : "…";
}

// ─── Rendu d'un paragraphe avec gras inline et retour à la ligne manuel ──────
function renderParagraphInline(
  doc,
  text,
  x,
  yStart,
  maxWidth,
  lineHeight,
  pageHeight,
  headerTitle,
  footerLabel,
  fontSize,
) {
  let y = yStart;
  let cursorX = x;
  doc.setFontSize(fontSize);

  const words = tokenizeInline(text);
  const spaceWidth = doc.getTextWidth(" ");

  words.forEach((w) => {
    doc.setFont("helvetica", w.bold ? "bold" : "normal");
    const wordWidth = doc.getTextWidth(w.text);

    if (cursorX > x && cursorX + wordWidth > x + maxWidth) {
      y += lineHeight;
      cursorX = x;
      if (y + lineHeight > pageHeight - 22) {
        y = newContentPage(doc, headerTitle, footerLabel);
        cursorX = x;
        doc.setFontSize(fontSize);
      }
    }

    doc.setTextColor(TEXT_DARK);
    doc.text(w.text, cursorX, y);
    cursorX += wordWidth + (w.space ? spaceWidth : 0);
  });

  return y + lineHeight;
}

function renderTextBlock(
  doc,
  text,
  x,
  yStart,
  maxWidth,
  pageHeight,
  lineHeight,
  headerTitle,
  footerLabel,
) {
  let y = yStart;
  const fontSize = lineHeight > 5 ? 10 : 9.5;
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

  paragraphs.forEach((para, idx) => {
    if (y + lineHeight > pageHeight - 22) {
      y = newContentPage(doc, headerTitle, footerLabel);
    }
    y = renderParagraphInline(
      doc,
      para,
      x,
      y,
      maxWidth,
      lineHeight,
      pageHeight,
      headerTitle,
      footerLabel,
      fontSize,
    );
    if (idx < paragraphs.length - 1) y += lineHeight * 0.6;
  });

  return y;
}

// ─── Rendu d'un titre de section (### etc.) façon "Analyse Métier" ───────────
function renderHeadingBlock(
  doc,
  text,
  level,
  x,
  yStart,
  maxWidth,
  pageHeight,
  headerTitle,
  footerLabel,
) {
  let y = yStart + 2;
  const fontSize = level <= 1 ? 13.5 : level === 2 ? 12 : 11;
  const cleanText = text.replace(/\*\*/g, "").trim();

  if (y + fontSize / 2 + 8 > pageHeight - 22) {
    y = newContentPage(doc, headerTitle, footerLabel);
  }

  doc.setTextColor(NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(cleanText, maxWidth);
  lines.forEach((line) => {
    doc.text(line, x, y);
    y += fontSize / 2 + 2.5;
  });

  y += 1;
  drawSeparator(doc, x, y, maxWidth, level <= 2 ? GOLD : BORDER);
  return y + 7;
}

function renderHrBlock(
  doc,
  x,
  yStart,
  maxWidth,
  pageHeight,
  headerTitle,
  footerLabel,
) {
  let y = yStart + 2;
  if (y + 4 > pageHeight - 22) {
    y = newContentPage(doc, headerTitle, footerLabel);
  }
  drawSeparator(doc, x, y, maxWidth, BORDER);
  return y + 6;
}

// ─── Rendu d'un tableau, façon backend ────────────────────────────────────────
function renderTableBlock(
  doc,
  headers,
  rows,
  x,
  yStart,
  maxWidth,
  pageHeight,
  headerTitle,
  footerLabel,
) {
  const colCount = headers.length;
  const colWidth = maxWidth / colCount;
  const cellFontSize = colCount > 5 ? 6.5 : 7.5;
  const headerHeight = 7;
  const rowHeight = 6;
  const cellPad = 2;

  const drawHeaderRow = (hy) => {
    doc.setFillColor(NAVY);
    doc.rect(x, hy, maxWidth, headerHeight, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(cellFontSize);
    doc.setTextColor(GOLD);
    headers.forEach((h, idx) => {
      const cx = x + idx * colWidth + cellPad;
      const truncated = truncateToWidth(doc, h, colWidth - cellPad * 2);
      doc.text(truncated, cx, hy + headerHeight - 2.3);
    });
  };

  let y = yStart;
  if (y + headerHeight + rowHeight > pageHeight - 22) {
    y = newContentPage(doc, headerTitle, footerLabel);
  }

  let segmentStartY = y;
  drawHeaderRow(y);
  y += headerHeight;

  const closeSegmentBorder = (topY) => {
    doc.setDrawColor(GOLD);
    doc.setLineWidth(0.5);
    doc.rect(x, topY, maxWidth, y - topY, "S");
  };

  rows.forEach((row, rowIdx) => {
    if (y + rowHeight > pageHeight - 22) {
      closeSegmentBorder(segmentStartY);
      y = newContentPage(doc, headerTitle, footerLabel);
      segmentStartY = y;
      drawHeaderRow(y);
      y += headerHeight;
    }

    const rowY = y;
    doc.setFillColor(rowIdx % 2 === 0 ? "#ffffff" : BG_LIGHT);
    doc.rect(x, rowY, maxWidth, rowHeight, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(cellFontSize);
    doc.setTextColor(TEXT_DARK);
    row.forEach((cell, idx) => {
      const cx = x + idx * colWidth + cellPad;
      const truncated = truncateToWidth(
        doc,
        cell ?? "",
        colWidth - cellPad * 2,
      );
      doc.text(truncated, cx, rowY + rowHeight - 1.8);
    });

    doc.setDrawColor("#cccccc");
    doc.setLineWidth(0.2);
    for (let c = 1; c < colCount; c++) {
      doc.line(x + c * colWidth, rowY, x + c * colWidth, rowY + rowHeight);
    }

    doc.setDrawColor(BORDER);
    doc.line(x, rowY + rowHeight, x + maxWidth, rowY + rowHeight);

    y = rowY + rowHeight;
  });

  closeSegmentBorder(segmentStartY);
  return y + 5;
}

// ─── Rendu générique d'une liste de blocs ─────────────────────────────────────
function renderBlocks(
  doc,
  blocks,
  x,
  yStart,
  maxWidth,
  pageHeight,
  headerTitle,
  footerLabel,
  textLineHeight,
) {
  let y = yStart;
  blocks.forEach((block) => {
    if (block.type === "table") {
      y = renderTableBlock(
        doc,
        block.headers,
        block.rows,
        x,
        y,
        maxWidth,
        pageHeight,
        headerTitle,
        footerLabel,
      );
    } else if (block.type === "heading") {
      y = renderHeadingBlock(
        doc,
        block.text,
        block.level,
        x,
        y,
        maxWidth,
        pageHeight,
        headerTitle,
        footerLabel,
      );
    } else if (block.type === "hr") {
      y = renderHrBlock(
        doc,
        x,
        y,
        maxWidth,
        pageHeight,
        headerTitle,
        footerLabel,
      );
    } else {
      y = renderTextBlock(
        doc,
        block.text,
        x,
        y,
        maxWidth,
        pageHeight,
        textLineHeight,
        headerTitle,
        footerLabel,
      );
    }
  });
  return y;
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORT D'UNE RÉPONSE UNIQUE
// ════════════════════════════════════════════════════════════════════════════
export const exportMessageToPdf = (message) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - MARGIN * 2;
  const footerLabel = "BE I.T AFRICA — Le Numérique au Service de l'Afrique";
  const headerTitle = "Be IT Africa — Réponse de l'Agent BI";
  const headerTitleSuite = "Be IT Africa — Réponse de l'Agent BI (suite)";

  applyWatermark(doc);
  drawHeaderBand(doc, headerTitle);
  drawFooter(doc, footerLabel);

  let y = HEADER_H + 14;

  doc.setTextColor(NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Analyse Métier", MARGIN, y);
  y += 3;
  drawSeparator(doc, MARGIN, y, maxWidth);
  y += 8;

  const blocks = parseContentBlocks(message.content);
  renderBlocks(
    doc,
    blocks,
    MARGIN,
    y,
    maxWidth,
    pageHeight,
    headerTitleSuite,
    footerLabel,
    5.5,
  );

  doc.save(`reponse_agent_bi_${Date.now()}.pdf`);
};

// ════════════════════════════════════════════════════════════════════════════
// EXPORT DE LA CONVERSATION COMPLÈTE
// ════════════════════════════════════════════════════════════════════════════
export const exportChatToPdf = (messages) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - MARGIN * 2;
  const footerLabel = "BE I.T AFRICA — Le Numérique au Service de l'Afrique";
  const headerTitle = "Be IT Africa — Historique de conversation";

  const filtered = messages.filter(
    (m) => m.role === "user" || m.role === "assistant",
  );

  // ══════════════════════════════════════════════════════════════════════
  // PAGE DE COUVERTURE
  // ══════════════════════════════════════════════════════════════════════
  applyWatermark(doc);

  doc.setFillColor(GOLD);
  doc.rect(0, 55, pageWidth, 1.2, "F");

  doc.setTextColor(NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("Historique de Conversation", pageWidth / 2, 75, {
    align: "center",
  });

  doc.setTextColor(TEXT_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Assistant BI Analytique — Be IT Africa", pageWidth / 2, 84, {
    align: "center",
  });

  const boxW = 110;
  const boxX = (pageWidth - boxW) / 2;
  const boxY = 100;
  const boxH = 26;

  doc.setFillColor(BG_LIGHT);
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.5);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, "FD");

  doc.setTextColor(TEXT_DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(
    `Date    : ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`,
    boxX + 8,
    boxY + 9,
  );
  doc.text(`Messages : ${filtered.length}`, boxX + 8, boxY + 17);

  doc.setFillColor(GOLD);
  doc.rect(0, boxY + boxH + 12, pageWidth, 1.2, "F");

  doc.setTextColor(TEXT_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(
    "Ce document reprend l'ensemble des échanges avec l'assistant décisionnel " +
      "Be IT Africa, incluant les questions posées et les réponses analytiques fournies.",
    pageWidth / 2,
    boxY + boxH + 22,
    { align: "center", maxWidth: maxWidth - 20 },
  );

  drawFooter(doc, footerLabel);

  // ══════════════════════════════════════════════════════════════════════
  // PAGES DE MESSAGES
  // ══════════════════════════════════════════════════════════════════════
  let y = newContentPage(doc, headerTitle, footerLabel);

  filtered.forEach((msg) => {
    const isUser = msg.role === "user";

    if (y + 12 > pageHeight - 22) {
      y = newContentPage(doc, headerTitle, footerLabel);
    }

    doc.setFillColor(NAVY);
    doc.roundedRect(MARGIN, y, isUser ? 18 : 24, 6, 1, 1, "F");
    doc.setTextColor(GOLD);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(isUser ? "VOUS" : "AGENT BI", MARGIN + 3, y + 4.3);
    y += 10;

    const blocks = parseContentBlocks(msg.content);
    y = renderBlocks(
      doc,
      blocks,
      MARGIN,
      y,
      maxWidth,
      pageHeight,
      headerTitle,
      footerLabel,
      5,
    );

    if (y + 6 > pageHeight - 22) {
      y = newContentPage(doc, headerTitle, footerLabel);
    }
    doc.setDrawColor(BORDER);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
    y += 8;
  });

  doc.save(`conversation_agent_bi_${Date.now()}.pdf`);
};

// export const exportMessageToPdf = (message) => {
//   const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
//   const margin = 20;
//   const pageWidth = doc.internal.pageSize.getWidth();
//   const maxWidth = pageWidth - margin * 2;

//   // En-tête
//   doc.setFillColor(138, 126, 3);
//   doc.rect(0, 0, pageWidth, 18, "F");
//   doc.setTextColor(255, 255, 255);
//   doc.setFontSize(11);
//   doc.setFont("helvetica", "bold");
//   doc.text("Be IT Africa — Assistant BI Analytique", margin, 12);

//   // Date
//   doc.setFontSize(8);
//   doc.setFont("helvetica", "normal");
//   doc.text(new Date().toLocaleString("fr-FR"), pageWidth - margin, 12, {
//     align: "right",
//   });

//   // Contenu
//   doc.setTextColor(31, 27, 22);
//   doc.setFontSize(10);
//   doc.setFont("helvetica", "normal");

//   const lines = doc.splitTextToSize(message.content || "", maxWidth);
//   let y = 30;

//   lines.forEach((line) => {
//     if (y > 270) {
//       doc.addPage();
//       y = 20;
//     }
//     doc.text(line, margin, y);
//     y += 6;
//   });

//   doc.save(`reponse_agent_bi_${Date.now()}.pdf`);
// };

// export const exportChatToPdf = (messages) => {
//   const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
//   const margin = 20;
//   const pageWidth = doc.internal.pageSize.getWidth();
//   const maxWidth = pageWidth - margin * 2;

//   // En-tête
//   doc.setFillColor(138, 126, 3);
//   doc.rect(0, 0, pageWidth, 18, "F");
//   doc.setTextColor(255, 255, 255);
//   doc.setFontSize(11);
//   doc.setFont("helvetica", "bold");
//   doc.text("Be IT Africa — Historique de conversation", margin, 12);
//   doc.setFontSize(8);
//   doc.setFont("helvetica", "normal");
//   doc.text(new Date().toLocaleString("fr-FR"), pageWidth - margin, 12, {
//     align: "right",
//   });

//   let y = 30;

//   messages
//     .filter((m) => m.role === "user" || m.role === "assistant")
//     .forEach((msg) => {
//       if (y > 265) {
//         doc.addPage();
//         y = 20;
//       }

//       // Label rôle
//       doc.setFontSize(8);
//       doc.setFont("helvetica", "bold");
//       doc.setTextColor(138, 126, 3);
//       doc.text(msg.role === "user" ? "Vous" : "Agent BI", margin, y);
//       y += 5;

//       // Contenu
//       doc.setFontSize(10);
//       doc.setFont("helvetica", "normal");
//       doc.setTextColor(31, 27, 22);
//       const lines = doc.splitTextToSize(msg.content || "", maxWidth);
//       lines.forEach((line) => {
//         if (y > 270) {
//           doc.addPage();
//           y = 20;
//         }
//         doc.text(line, margin, y);
//         y += 5.5;
//       });

//       y += 4;

//       // Séparateur léger
//       doc.setDrawColor(230, 220, 200);
//       doc.line(margin, y, pageWidth - margin, y);
//       y += 6;
//     });

//   doc.save(`conversation_agent_bi_${Date.now()}.pdf`);
// };
