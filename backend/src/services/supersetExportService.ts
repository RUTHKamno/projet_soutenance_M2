// services/supersetExportService.ts
import fetch from "node-fetch";
import * as XLSX from "xlsx";
import { buildHeaders } from "./supersetClient.js";

const SUPERSET_URL = process.env.SUPERSET_URL || "http://localhost:8088";

// ─── Récupère TOUTES les lignes d'un chart (row_limit désactivé) ──────────────
export async function fetchChartFullData(chartId: string): Promise<{
  columns: string[];
  rows: Record<string, unknown>[];
}> {
  const headers = await buildHeaders();

  // Étape 1 : récupérer le query_context stocké sur le chart
  const chartRes = await fetch(`${SUPERSET_URL}/api/v1/chart/${chartId}`, {
    headers,
  });
  if (!chartRes.ok) {
    throw new Error(
      `[Superset] Chart ${chartId} introuvable (${chartRes.status})`,
    );
  }
  const chartData = (await chartRes.json()) as any;
  const rawQueryContext = chartData.result?.query_context;

  if (!rawQueryContext) {
    console.warn(`[Superset] ⚠️ Pas de query_context pour chart ${chartId}`);
    return { columns: [], rows: [] };
  }

  // Étape 2 : parser le query_context et retirer la limite de lignes
  const queryContext = JSON.parse(rawQueryContext);
  queryContext.queries = (queryContext.queries || []).map((q: any) => ({
    ...q,
    row_limit: 0, // 0 = pas de limite côté Superset
  }));
  queryContext.force = true;

  // Étape 3 : envoyer le query_context modifié à /api/v1/chart/data
  const dataRes = await fetch(`${SUPERSET_URL}/api/v1/chart/data`, {
    method: "POST",
    headers,
    body: JSON.stringify(queryContext),
  });

  if (!dataRes.ok) {
    const text = await dataRes.text();
    throw new Error(
      `[Superset] Chart full data fetch failed ${dataRes.status} - ${text.substring(0, 200)}`,
    );
  }

  const data = (await dataRes.json()) as any;
  const queryData = data.result?.[0];
  if (!queryData) return { columns: [], rows: [] };

  return {
    columns: queryData.colnames ?? [],
    rows: queryData.data ?? [],
  };
}

// ─── Regroupe les lignes par un champ donné (ex: "Organisme", "CLI") ─────────
function groupBy(rows: Record<string, unknown>[], field: string) {
  const groups: Record<string, Record<string, unknown>[]> = {};
  rows.forEach((row) => {
    const key = (row[field] ?? "N/A")?.toString() ?? "N/A";
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });
  return groups;
}

// ─── Construit le classeur multi-feuilles : Global + une feuille par dimension
export function buildMultiSheetWorkbook(
  rows: Record<string, unknown>[],
  dimensions: { field: string; sheetName: string }[],
) {
  const workbook = XLSX.utils.book_new();

  const globalSheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, globalSheet, "Tableau_Complet");

  dimensions.forEach(({ field, sheetName }) => {
    const groups = groupBy(rows, field);
    const sortedRows = Object.keys(groups)
      .sort()
      .flatMap((key) => groups[key]);
    const sheet = XLSX.utils.json_to_sheet(sortedRows);
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName.substring(0, 31));
  });

  return workbook;
}
