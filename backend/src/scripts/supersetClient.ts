// supersetClient.ts  ← NOUVEAU FICHIER (optionnel)
const SUPERSET_URL = process.env.SUPERSET_URL || "http://localhost:8088";

async function getSupersetToken(): Promise<string> {
  const res = await fetch(`${SUPERSET_URL}/api/v1/security/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: process.env.SUPERSET_USER,
      password: process.env.SUPERSET_PASSWORD,
      provider: "db",
      refresh: true,
    }),
  });
  const data = await res.json();
  return data.access_token;
}

export async function pushChartToSuperset(
  chartConfig: Record<string, unknown>,
  title: string
): Promise<number> {
  const token = await getSupersetToken();

  // Crée un chart natif Superset de type ECharts
  const res = await fetch(`${SUPERSET_URL}/api/v1/chart/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      slice_name: title,
      viz_type: "echarts_timeseries_line", // adapter selon suggestedVisualization
      params: JSON.stringify(chartConfig),
      datasource_id: parseInt(process.env.SUPERSET_DATASOURCE_ID || "1"),
      datasource_type: "table",
    }),
  });

  const data = await res.json();
  console.log(`[Superset] ✅ Chart créé avec ID : ${data.id}`);
  return data.id;
}