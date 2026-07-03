// src/services/chartMapping.ts
export type SupportedViz = "bar" | "line" | "pie" | "table";

export function mapChartTypeToVizKind(chartConfig: any): SupportedViz {
  // 1. Essaie d'abord de lire le type ECharts natif (le plus fiable)
  const series = chartConfig?.series?.[0]?.type as string | undefined;

  const raw = (series || chartConfig?.chartType || "").toLowerCase();

  if (
    raw.includes("pie") ||
    raw.includes("camembert") ||
    raw.includes("secteur")
  ) {
    return "pie";
  }
  if (raw.includes("line") || raw.includes("courbe") || raw.includes("ligne")) {
    return "line";
  }
  if (raw.includes("table") || raw.includes("tableau")) {
    return "table";
  }
  // Par défaut : bar (le plus polyvalent, tolère bien dimension + métrique)
  return "bar";
}
