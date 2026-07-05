import fetch, { RequestInit } from "node-fetch";

const SUPERSET_URL = process.env.SUPERSET_URL || "http://localhost:8088";

// interface SupersetTokens {
//   accessToken: string;
//   csrfToken: string;
//   cookieJar: string;
// }
interface SupersetTokens {
  cookieJar: string;
}

let cachedTokens: SupersetTokens | null = null;

// ─── Réinitialiser le cache des tokens (utile pour forcer une reconnexion) ────
export function resetTokenCache(): void {
  cachedTokens = null;
  console.log("[Superset] 🔄 Cache de tokens réinitialisé");
}

// ─── Auth : JWT + CSRF (obligatoire Superset 4.x) ────────────────────────────
interface SupersetTokens {
  cookieJar: string;
}

async function getTokens(): Promise<SupersetTokens> {
  if (cachedTokens) return cachedTokens;

  // 1. GET la page de login pour récupérer les cookies initiaux (session vierge)
  const loginPageRes = await fetch(`${SUPERSET_URL}/login/`);
  const initialCookies = (loginPageRes.headers.raw()["set-cookie"] || [])
    .map((c) => c.split(";")[0])
    .join("; ");

  // 2. POST des identifiants en form-urlencoded (CSRF désactivé côté Superset, donc pas de csrf_token requis)
  const params = new URLSearchParams();
  params.append("username", process.env.SUPERSET_USER || "admin");
  params.append("password", process.env.SUPERSET_PASSWORD || "general");

  const loginRes = await fetch(`${SUPERSET_URL}/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: initialCookies,
    },
    body: params.toString(),
    redirect: "manual",
  });

  const sessionCookies = (loginRes.headers.raw()["set-cookie"] || [])
    .map((c) => c.split(";")[0])
    .join("; ");

  if (!sessionCookies.includes("session=")) {
    throw new Error(
      `[Superset] Login formulaire échoué (status ${loginRes.status}) — vérifiez SUPERSET_USER / SUPERSET_PASSWORD`,
    );
  }

  cachedTokens = { cookieJar: sessionCookies };
  console.log("[Superset] ✅ Session cookie obtenu via /login/ formulaire.");
  return cachedTokens;
}
export async function buildHeaders(): Promise<Record<string, string>> {
  const tokens = await getTokens();
  return {
    "Content-Type": "application/json",
    Cookie: tokens.cookieJar,
  };
}

// ─── Headers communs ──────────────────────────────────────────────────────────
// async function buildHeaders(): Promise<Record<string, string>> {
//   const tokens = await getTokens();
//   return {
//     Authorization: `Bearer ${tokens.accessToken}`,
//     "Content-Type": "application/json",
//   };
// }

// ─── Récupère tous les charts d'un dashboard (par nom → ID) ──────────────────
export async function getDashboardCharts(dashboardId: string): Promise<
  {
    chartId: string;
    title: string;
  }[]
> {
  const headers = await buildHeaders();

  console.log(
    `[Superset] 📊 Tentative fetch dashboard ${dashboardId} depuis ${SUPERSET_URL}/api/v1/dashboard/${dashboardId}`,
  );

  // Récupère les noms des charts du dashboard
  const dashRes = await fetch(
    `${SUPERSET_URL}/api/v1/dashboard/${dashboardId}`,
    { headers },
  );
  if (!dashRes.ok) {
    const text = await dashRes.text();
    console.error(
      `[Superset] ❌ Dashboard ${dashboardId} non trouvé. Status: ${dashRes.status}`,
    );
    console.error(`[Superset] Response: ${text.substring(0, 300)}`);
    console.error(
      `[Superset] URL: ${SUPERSET_URL}/api/v1/dashboard/${dashboardId}`,
    );
    console.error(`[Superset] Headers: Authorization Bearer [...]`);
    throw new Error(
      `[Superset] Dashboard fetch failed ${dashRes.status} - Vérifiez que le dashboardId (${dashboardId}) existe dans Superset`,
    );
  }
  const dashData = (await dashRes.json()) as any;
  const chartNames: string[] = dashData.result?.charts ?? [];

  console.log(
    `[Superset] ✅ ${chartNames.length} charts détectés : ${chartNames.join(", ")}`,
  );

  // Convertit chaque nom en ID numérique (même logique que ton script Python)
  const chartIds: { chartId: string; title: string }[] = [];

  for (const name of chartNames) {
    const query = JSON.stringify({
      filters: [{ col: "slice_name", opr: "eq", value: name }],
      columns: ["id", "slice_name"],
    });

    const chartRes = await fetch(
      `${SUPERSET_URL}/api/v1/chart/?q=${encodeURIComponent(query)}`,
      { headers },
    );
    if (!chartRes.ok) {
      const text = await chartRes.text();
      console.warn(
        `[Superset] ⚠️ Chart lookup pour "${name}" échoué: ${chartRes.status}`,
      );
      continue;
    }
    const chartData = (await chartRes.json()) as any;

    for (const c of chartData.result ?? []) {
      if (c.id) {
        chartIds.push({ chartId: String(c.id), title: c.slice_name });
      }
    }
  }

  console.log(
    `[Superset] ✅ ${chartIds.length} IDs résolus : ${chartIds.map((c) => c.chartId).join(", ")}`,
  );
  return chartIds;
}

// ─── Récupère le SQL source d'un chart ───────────────────────────────────────
export async function getSupersetChartSQL(chartId: string): Promise<{
  title: string;
  sql: string;
  vizType: string;
}> {
  const headers = await buildHeaders();

  // Récupère les métadonnées du chart
  const chartRes = await fetch(`${SUPERSET_URL}/api/v1/chart/${chartId}`, {
    headers,
  });
  const chartData = (await chartRes.json()) as any;
  const result = chartData.result;
  const queryContext = result?.query_context;

  let sql = "SQL non disponible";

  if (queryContext) {
    // Appelle /chart/data avec force_cached: false pour obtenir le SQL généré
    const dataRes = await fetch(`${SUPERSET_URL}/api/v1/chart/data`, {
      method: "POST",
      headers,
      body: queryContext,
    });

    if (dataRes.ok) {
      const data = (await dataRes.json()) as any;
      // Le SQL est dans result[0].query (pas result[0].sql)
      sql = data.result?.[0]?.query ?? sql;
    }
  }

  return {
    title: result?.slice_name ?? `Chart ${chartId}`,
    sql,
    vizType: result?.viz_type ?? "unknown",
  };
}

// ─── Récupère les données brutes d'un chart ───────────────────────────────────
export async function getSupersetChartData(chartId: string): Promise<{
  columns: string[];
  rows: Record<string, unknown>[];
}> {
  const headers = await buildHeaders();

  // Étape 1 : récupère le query_context stocké dans le chart
  const chartRes = await fetch(`${SUPERSET_URL}/api/v1/chart/${chartId}`, {
    headers,
  });
  const chartData = (await chartRes.json()) as any;
  const queryContext = chartData.result?.query_context;

  if (!queryContext) {
    console.warn(`[Superset] ⚠️ Pas de query_context pour chart ${chartId}`);
    return { columns: [], rows: [] };
  }

  // Étape 2 : envoie le query_context à l'endpoint dédié
  const dataRes = await fetch(`${SUPERSET_URL}/api/v1/chart/data`, {
    method: "POST",
    headers,
    body: queryContext, // query_context est déjà une string JSON
  });

  if (!dataRes.ok) {
    const text = await dataRes.text();
    throw new Error(
      `[Superset] Chart data fetch failed ${dataRes.status} - ${text.substring(0, 200)}`,
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

// ─── Invalide le cache token (à appeler si 401) ───────────────────────────────
export function invalidateSupersetToken(): void {
  cachedTokens = null;
  console.log("[Superset] 🔄 Cache token invalidé.");
}

// ─── Liste les dashboards disponibles (utile pour debug) ──────────────────────
export async function listDashboards(): Promise<
  {
    id: string;
    title: string;
    slug: string;
  }[]
> {
  const headers = await buildHeaders();

  console.log(
    `[Superset] 📋 Récupération des dashboards depuis ${SUPERSET_URL}/api/v1/dashboard/?q=...`,
  );

  const query = JSON.stringify({
    columns: ["id", "dashboard_title", "slug"],
    order_column: "dashboard_title",
    order_direction: "asc",
    page_size: 100,
  });

  const dashRes = await fetch(
    `${SUPERSET_URL}/api/v1/dashboard/?q=${encodeURIComponent(query)}`,
    { headers },
  );

  if (!dashRes.ok) {
    const text = await dashRes.text();
    console.error(
      `[Superset] ❌ Impossible de lister les dashboards: ${dashRes.status}`,
    );
    console.error(`[Superset] Response: ${text.substring(0, 300)}`);
    throw new Error(`[Superset] List dashboards failed ${dashRes.status}`);
  }

  const data = (await dashRes.json()) as any;
  const dashboards = (data.result ?? []).map((d: any) => ({
    id: String(d.id),
    title: d.dashboard_title,
    slug: d.slug,
  }));

  console.log(`[Superset] ✅ ${dashboards.length} dashboards trouvés`);
  dashboards.forEach((d: any) => {
    console.log(`  - [${d.id}] ${d.title} (${d.slug})`);
  });

  return dashboards;
}

export async function listDatabases(): Promise<{ id: string; name: string }[]> {
  const headers = await buildHeaders();
  const res = await fetch(`${SUPERSET_URL}/api/v1/database/`, { headers });
  if (!res.ok)
    throw new Error(`[Superset] List databases failed ${res.status}`);
  const data = (await res.json()) as any;
  const dbs = (data.result ?? []).map((d: any) => ({
    id: String(d.id),
    name: d.database_name,
  }));
  dbs.forEach((d: any) => console.log(`  - [${d.id}] ${d.name}`));
  return dbs;
}
