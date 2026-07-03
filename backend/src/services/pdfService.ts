// src/services/pdfService.ts
import PDFDocument from "pdfkit";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  getDashboardCharts,
  getSupersetChartSQL,
  getSupersetChartData,
} from "./supersetClient.js";
import { multiAgentSystem } from "../agentic/graph.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.join(__dirname, "../assets/logo_bg.png");

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ChartInput {
  chartId: string;
  title: string;
  screenshotB64?: string; // base64 PNG envoyé par le frontend (optionnel)
}

export interface PDFExportInput {
  dashboardId: string;
  charts?: ChartInput[];
  role: string;
  contextInfo: Record<string, unknown>;
}

// ─── Filigrane sur une page ───────────────────────────────────────────────────
function applyWatermark(doc: PDFKit.PDFDocument) {
  doc.save();
  doc
    .fontSize(52)
    .font("Helvetica-Bold")
    .fillColor("#cdae50")
    .opacity(0.1)
    .rotate(-45, { origin: [297, 420] })
    .text("BE I.T AFRICA", 60, 340, { align: "center", width: 500 });
  doc.restore();
  doc.opacity(1);
}

// ─── Ligne de séparation ─────────────────────────────────────────────────────
function drawSeparator(doc: PDFKit.PDFDocument, color = "#cdae50") {
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor(color)
    .lineWidth(0.8)
    .stroke()
    .moveDown(0.5);
}

// ─── Rapport analytique IA via Custom Workflow ────────────────────────────────
async function generateAnalyticsReport(
  chartTitle: string,
  sql: string,
  rows: Record<string, unknown>[],
  role: string,
  contextInfo: Record<string, unknown>,
): Promise<string> {
  try {
    console.log(`[PDFService] 🤖 Génération rapport IA pour "${chartTitle}"`);
    const result = await multiAgentSystem.invoke({
      userQuestion: `Analyse les données du graphique : "${chartTitle}"`,
      userRole: role,
      userContextInfo: contextInfo,
      isClarifiedByHuman: true,
      generatedSQL: sql,
      queryResults: rows,
      sqlFromCache: true,
      suggestedVisualization: "text_report",
      judgeEvaluation: {
        isValid: true,
        feedback: "Bypass — SQL issu de Superset",
        feedbackViz: "Bypass — rapport textuel forcé",
      },
    });

    return (
      result.finalResponse?.analyse ??
      result.finalResponse ??
      "Analyse non disponible."
    );
  } catch (err: any) {
    console.error(
      `[PDFService] ❌ Rapport IA échoué pour "${chartTitle}" :`,
      err.message,
    );
    return `Analyse indisponible : ${err.message}`;
  }
}

function formatCellValue(val: unknown, colName: string): string {
  if (val === null || val === undefined) return "—";

  // Détecte les colonnes de date par leur nom
  const isDateCol = /date|time|created|updated|crea|oper/i.test(colName);

  // Cas 1 : timestamp numérique (millisecondes Unix)
  if (typeof val === "number" && isDateCol && val > 1_000_000_000_000) {
    return new Date(val).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // Cas 2 : string ISO ou timestamp string
  if (typeof val === "string" && isDateCol) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  }

  // Cas 3 : nombre normal → formatage français
  if (typeof val === "number") {
    return val.toLocaleString("fr-FR");
  }

  // Cas 4 : supprime les balises HTML résiduelles (<div>, <span> etc.)
  return (
    String(val)
      .replace(/<[^>]*>/g, "")
      .trim() || "—"
  );
}

// ─── Génération principale du PDF ────────────────────────────────────────────
export async function generateDashboardPDF(
  input: PDFExportInput,
): Promise<Buffer> {
  console.log(
    `[PDFService] 📄 Début génération PDF — dashboard ${input.dashboardId}`,
  );

  // Résolution des charts
  const charts: ChartInput[] = input.charts?.length
    ? input.charts
    : await getDashboardCharts(input.dashboardId);

  if (charts.length === 0)
    throw new Error("Aucun chart trouvé pour ce dashboard.");

  // Récupère les noms des tables source depuis le premier SQL (pour la couverture)
  let sourceTables = "dwh";
  try {
    const firstMeta = await getSupersetChartSQL(charts[0].chartId);
    const tableMatches = firstMeta.sql.match(/dwh\.\w+/gi) ?? [];
    const uniqueTables = [...new Set(tableMatches)];
    if (uniqueTables.length > 0) sourceTables = uniqueTables.join(", ");
  } catch {}

  // ── Initialisation du document ────────────────────────────────────────────
  const doc = new PDFDocument({ margin: 50, size: "A4", autoFirstPage: false });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE DE COUVERTURE
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  applyWatermark(doc);

  // Logo centré
  if (fs.existsSync(LOGO_PATH)) {
    const logoSize = 120;
    doc.image(LOGO_PATH, (595 - logoSize) / 2, 60, { width: logoSize });
    doc.y = 195;
  } else {
    doc.y = 80;
  }

  // Bande dorée
  doc.rect(0, doc.y, 595, 3).fill("#cdae50");

  doc.moveDown(1.5);

  // Titre principal
  doc
    .fontSize(26)
    .font("Helvetica-Bold")
    .fillColor("#1a1a2e")
    .text("Rapport Décisionnel", { align: "center" });

  doc.moveDown(0.4);

  doc
    .fontSize(13)
    .font("Helvetica")
    .fillColor("#444444")
    .text("Analyse Automatisée par Intelligence Artificielle", {
      align: "center",
    });

  doc.moveDown(1.5);

  // Bloc infos
  const infoY = doc.y;
  doc.rect(120, infoY, 355, 70).fillAndStroke("#f9f6ee", "#cdae50");

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#333333")
    .text(
      `Date          : ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}\n` +
        `Rôle          : ${input.role}\n` +
        `Agence        : ${input.contextInfo.agence_utilisateur ?? "N/A"}\n` +
        `Source        : ${sourceTables}`,
      130,
      infoY + 12,
      { width: 335, lineGap: 4 },
    );

  doc.y = infoY + 85;
  doc.moveDown(1.5);

  // Bande dorée bas
  doc.rect(0, doc.y, 595, 3).fill("#cdae50");

  doc.moveDown(1);

  // Intro
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#333333")
    .text(
      `Ce rapport a été généré automatiquement à partir du Dashboard Superset ID ${input.dashboardId}. ` +
        `Il présente pour chaque graphique les données extraites du Data Warehouse, ` +
        `une analyse métier produite par le système d'intelligence artificielle, ` +
        `et si disponible une illustration du graphique.`,
      50,
      doc.y,
      { width: 495, align: "justify", lineGap: 3 },
    );

  // Pied de page couverture
  doc
    .fontSize(8)
    .fillColor("#999999")
    .text("BE I.T AFRICA — Le Numérique au Service de l'Afrique", 50, 780, {
      align: "center",
      width: 495,
    });

  // ══════════════════════════════════════════════════════════════════════════
  // UNE PAGE PAR CHART
  // ══════════════════════════════════════════════════════════════════════════
  for (let i = 0; i < charts.length; i++) {
    const chart = charts[i];
    doc.addPage();
    applyWatermark(doc);

    console.log(`[PDFService] 🔄 [${i + 1}/${charts.length}] "${chart.title}"`);

    // ── En-tête section ──────────────────────────────────────────────────
    doc.rect(50, 50, 495, 28).fill("#1a1a2e");

    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .fillColor("#cdae50")
      .text(`Analyse ${i + 1} — ${chart.title}`, 58, 57, { width: 479 });

    doc.y = 90;
    doc.moveDown(0.5);

    // Récupère SQL + données en parallèle
    const [chartMeta, chartData] = await Promise.all([
      getSupersetChartSQL(chart.chartId),
      getSupersetChartData(chart.chartId),
    ]);

    // ── Données extraites ────────────────────────────────────────────────
    // ── Données extraites ────────────────────────────────────────────────
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text("Données extraites");

    drawSeparator(doc);

    if (chartData.rows.length > 0) {
      const allRows = chartData.rows;
      const cols = chartData.columns;
      const colCount = cols.length;
      const tableStartX = 50;

      // ── Fonction utilitaire : tronque un texte si trop long ──────────
      const truncate = (val: string, maxLen: number) =>
        val.length > maxLen ? val.substring(0, maxLen - 1) + "…" : val;

      // ── Mode paysage si trop de colonnes ─────────────────────────────
      const isLandscape = colCount > 6;
      const tableWidth = isLandscape ? 742 : 495;

      if (isLandscape) {
        doc.addPage({ layout: "landscape" });
        applyWatermark(doc);

        doc.rect(50, 50, tableWidth, 28).fill("#1a1a2e");

        doc
          .fontSize(13)
          .font("Helvetica-Bold")
          .fillColor("#cdae50")
          .text(`Analyse ${i + 1} — ${chart.title} (données)`, 58, 57, {
            width: tableWidth - 16,
          });

        doc.y = 90;
        doc.moveDown(0.5);

        doc
          .fontSize(11)
          .font("Helvetica-Bold")
          .fillColor("#1a1a2e")
          .text("Données extraites");

        drawSeparator(doc, "#cdae50");
      }

      const colWidth = Math.floor(tableWidth / colCount);
      const maxCellChars = Math.max(8, Math.floor(colWidth / 5.2));

      // ── EN-TÊTE du tableau ───────────────────────────────────────────
      const headerHeight = 18;
      const headerY = doc.y;

      // Fond de l'en-tête
      doc.rect(tableStartX, headerY, tableWidth, headerHeight).fill("#1a1a2e");

      // Texte en-tête
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#cdae50");
      cols.forEach((col, idx) => {
        doc.text(
          truncate(col, maxCellChars),
          tableStartX + idx * colWidth + 3,
          headerY + 5,
          { width: colWidth - 6, lineBreak: false },
        );
      });

      doc.y = headerY + headerHeight;

      // ── LIGNES de données ────────────────────────────────────────────
      const rowHeight = 16;

      allRows.forEach((row, rowIdx) => {
        // Vérifie si on dépasse la page (marge basse à 750)
        if (doc.y + rowHeight > (isLandscape ? 530 : 750)) {
          doc.addPage({ layout: isLandscape ? "landscape" : "portrait" });
          applyWatermark(doc);

          // Répète l'en-tête sur la nouvelle page
          const newHeaderY = doc.y;
          doc
            .rect(tableStartX, newHeaderY, tableWidth, headerHeight)
            .fill("#1a1a2e");

          doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#cdae50");
          cols.forEach((col, idx) => {
            doc.text(
              truncate(col, maxCellChars),
              tableStartX + idx * colWidth + 3,
              newHeaderY + 5,
              { width: colWidth - 6, lineBreak: false },
            );
          });
          doc.y = newHeaderY + headerHeight;
        }

        const rowY = doc.y;

        // Fond alterné pour lisibilité
        doc
          .rect(tableStartX, rowY, tableWidth, rowHeight)
          .fill(rowIdx % 2 === 0 ? "#ffffff" : "#f5f2ea");

        // Bordure basse de chaque ligne
        doc
          .moveTo(tableStartX, rowY + rowHeight)
          .lineTo(tableStartX + tableWidth, rowY + rowHeight)
          .strokeColor("#e0d9c8")
          .lineWidth(0.3)
          .stroke();

        // Valeurs des cellules
        doc.font("Helvetica").fontSize(7.5).fillColor("#222222");
        cols.forEach((col, idx) => {
          const val = truncate(formatCellValue(row[col], col), maxCellChars);

          doc.text(val, tableStartX + idx * colWidth + 3, rowY + 5, {
            width: colWidth - 6,
            lineBreak: false,
          });
        });

        // Séparateurs verticaux entre colonnes
        doc.strokeColor("#cccccc").lineWidth(0.3);
        for (let c = 1; c < colCount; c++) {
          doc
            .moveTo(tableStartX + c * colWidth, rowY)
            .lineTo(tableStartX + c * colWidth, rowY + rowHeight)
            .stroke();
        }

        doc.y = rowY + rowHeight;
      });

      // Bordure extérieure du tableau
      doc
        .rect(
          tableStartX,
          headerY,
          tableWidth,
          headerHeight + allRows.length * rowHeight,
        )
        .strokeColor("#cdae50")
        .lineWidth(0.8)
        .stroke();
    } else {
      doc.fontSize(9).fillColor("#999999").text("Aucune donnée disponible.");
    }

    doc.moveDown(0.8);

    // ── Analyse Métier ───────────────────────────────────────────────────
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text("Analyse Métier");

    drawSeparator(doc);

    const rapport = await generateAnalyticsReport(
      chart.title,
      chartMeta.sql,
      chartData.rows,
      input.role,
      input.contextInfo,
    );

    doc
      .fontSize(9.5)
      .font("Helvetica")
      .fillColor("#111111")
      .text(rapport, 50, doc.y, {
        width: 495,
        lineBreak: true,
        lineGap: 3,
        align: "justify",
      });

    doc.moveDown(0.8);

    // ── Figure illustrée (screenshot envoyé par le frontend) ─────────────
    if (chart.screenshotB64) {
      // Vérifie qu'il reste de la place sur la page, sinon nouvelle page
      if (doc.y > 600) {
        doc.addPage();
        applyWatermark(doc);
      }

      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#1a1a2e")
        .text("Figure illustrée");

      drawSeparator(doc);

      try {
        const imgBuffer = Buffer.from(chart.screenshotB64, "base64");
        const imgY = doc.y;
        const imgWidth = 450;
        const imgX = (595 - imgWidth) / 2;

        doc.image(imgBuffer, imgX, imgY, {
          width: imgWidth,
          align: "center",
        });

        doc.y = imgY + 220;
      } catch (imgErr: any) {
        doc
          .fontSize(9)
          .fillColor("#999999")
          .text(`Figure non disponible : ${imgErr.message}`);
      }
    } else {
      doc
        .fontSize(9)
        .fillColor("#bbbbbb")
        .font("Helvetica")
        .text(
          "Figure illustrée : non fournie (envoyez screenshotB64 depuis le frontend).",
        );
    }

    // Pied de page
    doc
      .fontSize(7)
      .fillColor("#cccccc")
      .text(
        `BE I.T AFRICA — Page ${i + 2} — Analyse ${i + 1}/${charts.length}`,
        50,
        785,
        { align: "center", width: 495 },
      );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE CONCLUSION
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  applyWatermark(doc);

  doc.rect(0, 50, 595, 3).fill("#cdae50");

  doc.y = 65;
  doc.moveDown(0.5);

  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .fillColor("#1a1a2e")
    .text("Conclusion", { align: "center" });

  doc.moveDown(1);
  drawSeparator(doc);

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#333333")
    .text(
      `Ce rapport a couvert l'analyse de ${charts.length} graphique(s) issus du Dashboard Superset ID ${input.dashboardId}. ` +
        `Chaque section présente les données brutes extraites du Data Warehouse, ` +
        `une interprétation métier générée par intelligence artificielle, ` +
        `et les visualisations associées.\n\n` +
        `Les analyses produites sont basées sur les données disponibles au moment de l'export ` +
        `et sont destinées à appuyer la prise de décision opérationnelle et stratégique.`,
      50,
      doc.y,
      { width: 495, align: "justify", lineGap: 4 },
    );

  doc.moveDown(2);

  // Bloc signature
  doc.rect(50, doc.y, 495, 55).fillAndStroke("#f9f6ee", "#cdae50");

  const sigY = doc.y + 10;
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#555555")
    .text(`Exporté par : ${input.role}`, 60, sigY)
    .text(
      `Agence      : ${input.contextInfo.agence_utilisateur ?? "N/A"}`,
      60,
      sigY + 14,
    )
    .text(`Date        : ${new Date().toISOString()}`, 60, sigY + 28);

  // Logo bas de page conclusion
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, (595 - 60) / 2, 700, { width: 60 });
  }

  doc
    .fontSize(8)
    .fillColor("#cdae50")
    .text("BE I.T AFRICA — Le Numérique au Service de l'Afrique", 50, 770, {
      align: "center",
      width: 495,
    });

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => {
      console.log(`[PDFService] ✅ PDF finalisé — ${chunks.length} chunks`);
      resolve(Buffer.concat(chunks));
    });
  });
}
