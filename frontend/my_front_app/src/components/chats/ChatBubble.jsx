import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactECharts from "echarts-for-react"; // npm install echarts-for-react echarts
import { exportMessageToPdf } from "../../utils/exportPdf";
import "../../styles/chat/ChatBubble.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as XLSX from "xlsx";

// Utilitaire pour convertir en toute sécurité les chaînes de type
// "function(...) { ... }" en vraies fonctions JS, en parcourant
// récursivement la config et en traitant `formatter` et `valueFormatter`.
const parseFormatterFunction = (config) => {
  if (!config) return config;

  // Clone profond pour ne pas muter l'objet original du state
  const newConfig = JSON.parse(JSON.stringify(config));

  const tryParse = (fnStr) => {
    if (typeof fnStr !== "string") return fnStr;
    // Only attempt when it looks like a function
    if (!fnStr.trim().startsWith("function") && !fnStr.includes("=>"))
      return fnStr;
    try {
      return new Function(`return ${fnStr}`)();
    } catch (e) {
      console.error("Erreur lors du parsing d'un formatter:", e);
      return fnStr; // keep original string to detect invalid config
    }
  };

  const walk = (obj) => {
    if (!obj || typeof obj !== "object") return;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (
        (k === "formatter" || k === "valueFormatter") &&
        typeof v === "string"
      ) {
        obj[k] = tryParse(v);
      } else if (typeof v === "object") {
        walk(v);
      }
    }
  };

  walk(newConfig);
  return newConfig;
};

const isFunctionLikeFormatter = (value) =>
  typeof value === "string" &&
  (value.trim().startsWith("function") || value.includes("=>"));

const hasInvalidFormatter = (obj) => {
  if (!obj || typeof obj !== "object") return false;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (
      (k === "formatter" || k === "valueFormatter") &&
      isFunctionLikeFormatter(v)
    )
      return true;
    if (typeof v === "object" && hasInvalidFormatter(v)) return true;
  }
  return false;
};

const parseMarkdownTables = (text) => {
  const lines = text.split(/\r?\n/);
  const tables = [];
  let current = [];

  const pushCurrent = () => {
    if (current.length >= 2) {
      const [, separator] = current;
      if (/^\s*\|?[\s:-]+(?:\|[\s:-]+)+\|?\s*$/.test(separator)) {
        const parsed = current.map((line) =>
          line
            .replace(/^\s*\||\|\s*$/g, "")
            .split("|")
            .map((cell) => cell.trim()),
        );
        tables.push(parsed);
      }
    }
    current = [];
  };

  for (const line of lines) {
    if (/^\s*\|.*\|?\s*$/.test(line)) {
      current.push(line);
      continue;
    }
    if (current.length > 0) {
      pushCurrent();
    }
  }
  if (current.length > 0) {
    pushCurrent();
  }
  return tables;
};

const escapeCsvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;

const downloadBlob = (data, fileName, mimeType) => {
  const blob = new Blob([data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const exportTablesToCsv = (tables) => {
  const csv = tables
    .map((table, index) => {
      const rows = table.map((row) => row.map(escapeCsvCell).join(","));
      return [`Tableau ${index + 1}`, ...rows].join("\n");
    })
    .join("\n\n");
  downloadBlob(
    csv,
    `tableau_export_${Date.now()}.csv`,
    "text/csv;charset=utf-8;",
  );
};

// const escapeCsvCell = (cell) => {
//   if (cell === null || cell === undefined) return '""';
//   let stringValue = cell.toString();

//   // 1. Si la cellule contient uniquement un long numéro (ex: numéro de téléphone à 9-15 chiffres)
//   // On utilise la formule ="valeur" que seul Excel interprète pour forcer le format texte
//   if (/^\d{9,15}$/.test(stringValue.trim())) {
//     return `="${stringValue.trim()}"`;
//   }

//   // 2. Échappement standard des CSV (doubler les guillemets si présents)
//   if (
//     stringValue.includes('"') ||
//     stringValue.includes(",") ||
//     stringValue.includes("\n") ||
//     stringValue.includes("\r")
//   ) {
//     stringValue = stringValue.replace(/"/g, '""');
//     return `"${stringValue}"`;
//   }

//   return stringValue;
// };

// const exportTablesToCsv = (tables) => {
//   const csv = tables
//     .map((table, index) => {
//       const rows = table
//         // Étape 3 : Filtrer la ligne Markdown de séparation (ex: :---)
//         .filter(
//           (row) =>
//             !row.every(
//               (cell) =>
//                 cell.trim().startsWith(":") || cell.trim().startsWith("-"),
//             ),
//         )
//         .map((row) => row.map(escapeCsvCell).join(","));

//       return [`Tableau ${index + 1}`, ...rows].join("\n");
//     })
//     .join("\n\n");

//   // Étape 4 : Ajouter le BOM UTF-8 (\uFEFF) au début du fichier
//   // Cela permet à Excel d'ouvrir directement le CSV avec les bons accents (é, è, à...)
//   downloadBlob(
//     `\uFEFF${csv}`,
//     `tableau_export_${Date.now()}.csv`,
//     "text/csv;charset=utf-8;",
//   );
// };

const exportTablesToExcel = (tables) => {
  // 1. Créer un nouveau classeur (Workbook)
  const wb = XLSX.utils.book_new();

  tables.forEach((table, index) => {
    // 2. Filtrer la ligne de séparation Markdown (:---) si elle existe
    const cleanedTable = table.filter(
      (row) =>
        !row.every(
          (cell) => cell.trim().startsWith(":") || cell.trim().startsWith("-"),
        ),
    );

    // 3. Convertir le tableau en feuille (Worksheet)
    const ws = XLSX.utils.aoa_to_sheet(cleanedTable);

    // 4. Forcer le format TEXTE sur toutes les cellules pour éviter la notation scientifique
    Object.keys(ws).forEach((cellRef) => {
      if (cellRef.startsWith("!") || !ws[cellRef].v) return;

      // Si la valeur ressemble à un numéro de téléphone (uniquement des chiffres, long)
      if (/^\d{9,15}$/.test(ws[cellRef].v.toString().trim())) {
        ws[cellRef].t = "s"; // 's' signifie String (Texte) dans SheetJS
        ws[cellRef].z = "@"; // Force le format texte dans Excel
      }
    });

    // 5. Ajouter la feuille au classeur
    XLSX.utils.book_append_sheet(wb, ws, `Tableau ${index + 1}`);
  });

  // 6. Générer et télécharger le vrai fichier .xlsx
  XLSX.writeFile(wb, `tableau_export_${Date.now()}.xlsx`);
};

const ChatBubble = ({
  message,
  onApprove,
  onReject,
  onCancel,
  onEdit,
  onRetry,
  onPublishSuperset,
}) => {
  const {
    role,
    content,
    isReformulation,
    exportable,
    retryable,
    report,
    chartConfig,
  } = message;

  const [chartExpanded, setChartExpanded] = useState(false);
  const [parsedConfig, setParsedConfig] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const chartRef = useRef(null);
  const markdownTables = useMemo(
    () => parseMarkdownTables(content || ""),
    [content],
  );
  const hasTables = markdownTables.length > 0;

  const copyToClipboard = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
  };

  // Parser la config dès que le message ou le graphique change
  useEffect(() => {
    if (chartConfig) {
      try {
        const parsed = parseFormatterFunction(chartConfig);
        if (hasInvalidFormatter(parsed)) {
          console.warn(
            "Chart preview contains unparsable formatter/valueFormatter, skipping preview.",
          );
          setParsedConfig(null);
          setPreviewError(
            "Aperçu du graphique indisponible — configuration invalide. Réessayez la requête.",
          );
        } else {
          setParsedConfig(parsed);
          setPreviewError(null);
        }
      } catch (e) {
        console.error("Erreur lors du parsing de la config du graphique:", e);
        setParsedConfig(null);
        setPreviewError(
          "Aperçu du graphique indisponible — erreur interne. Réessayez.",
        );
      }
    }
  }, [chartConfig]);

  // Forcer le redimensionnement du graphique quand la taille du conteneur change
  useEffect(() => {
    if (chartRef.current) {
      const echartsInstance = chartRef.current.getEchartsInstance();
      setTimeout(() => {
        echartsInstance.resize();
      }, 200); // petit délai pour attendre la transition CSS
    }
  }, [chartExpanded]);

  if (isReformulation) {
    return (
      <div className="bubble-reformulation">
        <p className="bubble-reformulation-label">
          ✦ Question reformulée par l'agent :
        </p>
        <p className="bubble-reformulation-text">"{content}"</p>
        <div className="bubble-reformulation-actions">
          <button className="bubble-btn-reject" onClick={onReject}>
            ✕ Modifier
          </button>
          <button className="bubble-btn-cancel" onClick={onCancel}>
            ✕ Annuler
          </button>
          <button className="bubble-btn-approve" onClick={onApprove}>
            ✓ Valider
          </button>
        </div>
      </div>
    );
  }

  if (role === "error") {
    return (
      <div className="bubble bubble-error">
        <div className="bubble-error-content">
          <span>⚠️ {content}</span>
          <button className="bubble-retry-btn" onClick={onRetry}>
            ↺ Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (role === "user") {
    return (
      <div className="bubble bubble-user">
        <div className="bubble-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          {/* Afficher la question reformulée si elle existe */}
          {message.reformulatedQuestion && (
            <div className="bubble-reformulated-hint">
              <span className="bubble-reformulated-label">✦ Reformulée :</span>
              <span className="bubble-reformulated-text">
                {message.reformulatedQuestion}
              </span>
            </div>
          )}
        </div>
        <div className="bubble-meta-row">
          <div className="bubble-meta-actions">
            <button
              className="meta-icon"
              title="Copier le message"
              onClick={() => copyToClipboard(content || "")}
            >
              📋
            </button>
            <button
              className="meta-icon"
              title="Éditer la question"
              onClick={() => {
                if (typeof onEdit === "function") onEdit(message);
              }}
            >
              ✎
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cleanReport = report;

  return (
    <div className="bubble bubble-assistant">
      <div className="bubble-avatar">BI</div>
      <div className="bubble-content">
        {/* Résumé texte */}
        <div className="bubble-text-summary">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content || ""}
          </ReactMarkdown>
        </div>
        <div className="bubble-meta-row">
          <div className="bubble-meta-actions">
            <button
              className="meta-icon"
              title="Copier le message"
              onClick={() => copyToClipboard(content || "")}
            >
              📋
            </button>
          </div>
        </div>
        {/* Action sur tableaux markdown détectés */}
        {hasTables && (
          <div className="bubble-table-actions">
            <div className="bubble-table-label">
              📋 Tableau{markdownTables.length > 1 ? " x" : ""} détecté
            </div>
            <div className="bubble-table-buttons">
              <button
                className="bubble-chart-btn"
                onClick={() => exportTablesToCsv(markdownTables)}
              >
                Exporter CSV
              </button>
              <button
                className="bubble-chart-btn"
                onClick={() => exportTablesToExcel(markdownTables)}
              >
                Exporter Excel
              </button>
            </div>
          </div>
        )}

        {/* Rapport PDF téléchargeable */}
        {cleanReport && (
          <div className="bubble-report-card">
            <div className="bubble-report-icon">📄</div>
            <div className="bubble-report-info">
              <span className="bubble-report-label">
                Rapport analytique disponible
              </span>
              <span className="bubble-report-sub">
                Document complet avec tableaux et recommandations
              </span>
            </div>
            <button
              className="bubble-report-dl"
              onClick={() => exportMessageToPdf({ content: cleanReport })}
            >
              ↓ PDF
            </button>
          </div>
        )}

        {/* 📊 Aperçu et Agrandissement du Graphique */}
        {parsedConfig && (
          <div
            className={`bubble-chart-container ${chartExpanded ? "chart-fullscreen-modal" : ""}`}
          >
            {/* Si étendu en modal, on met un arrière-plan opaque derrière */}
            {chartExpanded && (
              <div
                className="modal-overlay"
                onClick={() => setChartExpanded(false)}
              />
            )}

            {/* 📌 Publication vers Superset */}
            {/* {parsedConfig && (
              <div className="bubble-publish-superset">
                <button
                  className="bubble-chart-btn"
                  onClick={() => onPublishSuperset(message)}
                  disabled={message.publishing}
                >
                  {message.publishing
                    ? "Publication..."
                    : "📌 Publier dans Superset"}
                </button>
                {message.publishStatus && (
                  <span
                    className={`publish-status ${message.publishStatus.success ? "ok" : "error"}`}
                  >
                    {message.publishStatus.message}
                  </span>
                )}
              </div>
            )} */}

            <div
              className={`bubble-chart-card ${chartExpanded ? "expanded" : "preview"}`}
            >
              <div className="bubble-chart-header">
                <span className="bubble-chart-label">
                  📊{" "}
                  {chartExpanded
                    ? "Visualisation grand écran"
                    : "Visualisation disponible"}
                </span>
                <div className="bubble-chart-actions">
                  <button
                    className="bubble-chart-btn"
                    onClick={() => setChartExpanded(!chartExpanded)}
                  >
                    {chartExpanded ? "↙ Réduire l'aperçu" : "↗ Agrandir"}
                  </button>
                </div>
              </div>

              <div className="bubble-chart-body">
                <ReactECharts
                  ref={chartRef}
                  option={parsedConfig}
                  style={{
                    height: chartExpanded ? "500px" : "280px",
                    width: "100%",
                  }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* Si parsing invalide ou erreur d'aperçu, afficher un message utilisateur clair */}
        {previewError && (
          <div className={`bubble-chart-container preview-error`}>
            <div className="bubble-chart-card preview-error-card">
              <div className="bubble-chart-header">
                <span className="bubble-chart-label">
                  📊 Aperçu indisponible
                </span>
              </div>
              <div className="bubble-chart-body">
                <p className="preview-error-text">{previewError}</p>
                <div className="preview-error-actions">
                  <button className="bubble-chart-btn" onClick={onRetry}>
                    ↺ Réessayer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions export */}
        {exportable && (
          <div className="bubble-actions">
            <button
              className="bubble-export-btn"
              onClick={() => exportMessageToPdf(message)}
            >
              ↓ Exporter ce message
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
