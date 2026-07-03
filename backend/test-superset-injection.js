import fetch from "node-fetch";
import { CookieJar } from "tough-cookie";
import fetchCookieLib from "fetch-cookie";

const jar = new CookieJar();
const fetchC = fetchCookieLib(fetch, jar);

const SUPERSET_URL = "http://localhost:8088";
const USERNAME = "admin";
const PASSWORD = "general";
const SUPERSET_DATABASE_ID = 1;
const SCHEMA_NAME = "dwh";

async function loginSession() {
  // 1. Charger le formulaire HTML de login pour extraire le csrf_token embarqué
  const loginPage = await fetchC(`${SUPERSET_URL}/login/`);
  console.log("Statut /login/:", loginPage.status);
  const html = await loginPage.text();
  console.log("--- HTML reçu (2000 premiers caractères) ---");
  console.log(html.slice(0, 2000));
  console.log("--- FIN ---");

  const csrfMatch = html.match(/name="csrf_token"[^>]*value="([^"]+)"/);
  if (!csrfMatch)
    throw new Error("csrf_token introuvable — vérifie l'URL /login/");

  // 2. Soumettre le login (établit le cookie de session réel)
  const params = new URLSearchParams();
  params.append("username", USERNAME);
  params.append("password", PASSWORD);
  params.append("csrf_token", formCsrf);

  const loginRes = await fetchC(`${SUPERSET_URL}/api/v1/security/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: USERNAME,
      password: PASSWORD,
      provider: "db",
      refresh: true,
    }),
  });
  console.log("Set-Cookie reçu:", loginRes.headers.raw()["set-cookie"]);

  // redirect: "manual" -> statut attendu 302 si login OK
  if (![302, 200].includes(loginRes.status)) {
    throw new Error(`Login échoué, statut: ${loginRes.status}`);
  }

  // 3. Récupérer un csrf_token API, maintenant lié à la vraie session
  const csrfRes = await fetchC(`${SUPERSET_URL}/api/v1/security/csrf_token/`);
  const { result: apiCsrf } = await csrfRes.json();

  return {
    "Content-Type": "application/json",
    "X-CSRFToken": apiCsrf,
    Referer: SUPERSET_URL,
  };
}

async function createChartFromSQL(sqlQuery, chartTitle) {
  const H = await loginSession();
  console.log("🔑 Session établie.");

  // Dataset
  console.log("📊 Création du Dataset...");
  const tableName = `agent_table_${Date.now()}`;
  const datasetRes = await fetchC(`${SUPERSET_URL}/api/v1/dataset/`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      database: SUPERSET_DATABASE_ID,
      schema: SCHEMA_NAME,
      table_name: tableName,
      sql: sqlQuery,
    }),
  });
  const datasetData = await datasetRes.json();
  if (!datasetRes.ok)
    throw new Error(`Dataset: ${JSON.stringify(datasetData)}`);
  const datasetId = datasetData.id;
  console.log(`✅ Dataset créé (ID: ${datasetId})`);

  // Vérif immédiate — doit renvoyer 200 maintenant
  const checkRes = await fetchC(`${SUPERSET_URL}/api/v1/dataset/${datasetId}`, {
    headers: H,
  });
  console.log(`🔍 Vérification GET dataset: ${checkRes.status}`);

  // Chart
  console.log("📈 Création du Chart...");
  const chartRes = await fetchC(`${SUPERSET_URL}/api/v1/chart/`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      slice_name: chartTitle,
      datasource_id: datasetId,
      datasource_type: "table",
      viz_type: "table",
      params: JSON.stringify({
        datasource: `${datasetId}__table`,
        viz_type: "table",
        row_limit: 100,
      }),
    }),
  });
  const chartData = await chartRes.json();
  if (!chartRes.ok) throw new Error(`Chart: ${JSON.stringify(chartData)}`);
  const chartId = chartData.id;
  console.log(`✅ Chart créé (ID: ${chartId})`);

  return { datasetId, chartId };
}

const SQL_QUERY_TEST = `
  SELECT DATE_TRUNC('month', dt.date_val)::DATE AS snapshot_month,
         COUNT(DISTINCT fm.cli) AS nb_nouveaux_emprunteurs
  FROM dwh.fait_mep fm
  JOIN dwh.dim_temps dt ON fm.date_id_mep = dt.date_id
  WHERE dt.date_val >= CURRENT_DATE - INTERVAL '25 months'
  GROUP BY DATE_TRUNC('month', dt.date_val)::DATE
  ORDER BY snapshot_month ASC
`;

console.log("🚀 Démarrage...");
createChartFromSQL(
  SQL_QUERY_TEST,
  `Indicateur IA - ${new Date().toLocaleTimeString()}`,
)
  .then((res) => console.log("\n🎯 SUCCÈS !", res))
  .catch((err) => console.error("\n💥 Échec :", err.message));
