import { useState, useEffect, useCallback } from "react";
import { exportMessageToPdf } from "./exportPdf";

// ============================================================
// PARSING DES CONFIGS DE GRAPHIQUES (formatter functions)
// Repris de la logique de ChatBubble.jsx pour rester cohérent
// ============================================================
const tryParseFn = (fnStr) => {
  if (typeof fnStr !== "string") return fnStr;
  if (!fnStr.trim().startsWith("function") && !fnStr.includes("=>"))
    return fnStr;
  try {
    return new Function(`return ${fnStr}`)();
  } catch (e) {
    console.error("Erreur parsing formatter:", e);
    return fnStr;
  }
};

const parseFormatterFunction = (config) => {
  if (!config) return config;
  const newConfig = JSON.parse(JSON.stringify(config));

  const walk = (obj) => {
    if (!obj || typeof obj !== "object") return;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (
        (k === "formatter" || k === "valueFormatter") &&
        typeof v === "string"
      ) {
        obj[k] = tryParseFn(v);
      } else if (typeof v === "object") {
        walk(v);
      }
    }
  };

  walk(newConfig);
  return newConfig;
};

// Retourne { config, error } — jamais d'exception non gérée
export const safeParseChartConfig = (rawConfig) => {
  if (!rawConfig) return { config: null, error: null };
  try {
    const parsed = parseFormatterFunction(rawConfig);
    return { config: parsed, error: null };
  } catch (e) {
    return { config: null, error: "Impossible d'afficher ce graphique." };
  }
};

// ============================================================
// HELPERS D'AFFICHAGE (titre, date, aperçu de rapport)
// ============================================================
export const getMediaTitle = (item) => {
  if (!item.chartConfig) return "Rapport";
  const titleVal = item.chartConfig?.title;
  if (!titleVal) return "Graphique";
  return typeof titleVal === "object" ? titleVal.text || "Graphique" : titleVal;
};

export const getMediaDate = (item) =>
  new Date(item.timestamp).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const getReportPreviewText = (report, maxLength = 170) => {
  if (!report) return "Aucun contenu.";
  const stripped = report
    .replace(/[#*_`>|]/g, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .trim();
  return stripped.length > maxLength
    ? `${stripped.slice(0, maxLength)}…`
    : stripped;
};

// ============================================================
// EXPORT D'UN GRAPHIQUE EN IMAGE (PNG)
// chartRef = ref d'un composant <ReactECharts ref={chartRef} />
// ============================================================
export const exportChartToImage = (chartRef, fileName) => {
  const instance = chartRef?.current?.getEchartsInstance?.();
  if (!instance) {
    console.error("Instance ECharts introuvable pour l'export.");
    return;
  }
  const url = instance.getDataURL({
    type: "png",
    pixelRatio: 2,
    backgroundColor: "#ffffff",
  });
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || `graphique_${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

// ============================================================
// TÉLÉCHARGEMENT D'UN RAPPORT EN PDF (réutilise exportPdf.js existant)
// ============================================================
export const downloadReportAsPdf = (item) => {
  exportMessageToPdf({ content: item.report });
};

// ============================================================
// HOOK CARROUSEL — navigation clavier (← →) + Escape pour fermer
// ============================================================
export const useMediaCarousel = (mediaList, initialIndex, onClose) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex ?? 0);

  useEffect(() => {
    setCurrentIndex(initialIndex ?? 0);
  }, [initialIndex]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % mediaList.length);
  }, [mediaList.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
  }, [mediaList.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, onClose]);

  return {
    currentIndex,
    goNext,
    goPrev,
    currentItem: mediaList[currentIndex] || null,
  };
};
