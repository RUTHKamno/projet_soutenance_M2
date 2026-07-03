import fetch from "node-fetch";
import { buildHeaders } from "./supersetClient.js"; // à exporter depuis supersetClient.ts
import {
  buildVizParams,
  SupersetChartCreationResult,
  SupportedViz,
} from "../interfaces/superset.interface.js";

// Récupération des configurations depuis les variables d'environnement
const SUPERSET_URL = process.env.SUPERSET_URL || "http://localhost:8088";
const SUPERSET_ADMIN_USERNAME = process.env.SUPERSET_ADMIN_USERNAME || "admin";
const SUPERSET_ADMIN_PASSWORD = process.env.SUPERSET_ADMIN_PASSWORD || "admin";
// L'ID de ta base de données (Data Warehouse) telle qu'enregistrée dans Superset
// const SUPERSET_DATABASE_ID = parseInt(process.env.DASHBOARD_ID || "1", 10);
const SUPERSET_DATABASE_ID = 2;
export const SupersetService = {
  /**
   * Étape A : Authentification auprès de l'API REST de Superset
   */
  async getAccessToken(): Promise<string> {
    try {
      const res = await fetch(`${SUPERSET_URL}/api/v1/security/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: SUPERSET_ADMIN_USERNAME,
          password: SUPERSET_ADMIN_PASSWORD,
          provider: "db",
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Erreur Auth Superset: ${res.status} - ${errorText}`);
      }

      const data = (await res.json()) as { access_token: string };
      return data.access_token;
    } catch (error: any) {
      console.error(
        "[SupersetService] 💥 Échec login API Superset:",
        error.message,
      );
      throw error;
    }
  },

  /**
   * Étapes B, C, D : Création du Dataset, du Chart et liaison au Dashboard
   */
  // async addChartToDashboard({
  //   dashboardId,
  //   chartTitle,
  //   sqlQuery,
  //   chartType = "dist_bar", // Type de graphique par défaut dans Superset
  // }: {
  //   dashboardId: number;
  //   chartTitle: string;
  //   sqlQuery: string;
  //   chartType?: string;
  // }): Promise<any> {
  //   try {
  //     const token = await this.getAccessToken();
  //     const headers = await buildHeaders();

  //     // 1. Création d'un Dataset virtuel basé sur la requête SQL de l'agent
  //     const datasetTableName = `agent_query_${Date.now()}`;
  //     const datasetRes = await fetch(`${SUPERSET_URL}/api/v1/dataset/`, {
  //       method: "POST",
  //       headers,
  //       body: JSON.stringify({
  //         //   database: SUPERSET_DATABASE_ID,
  //         database: "dwh",
  //         table_name: datasetTableName,
  //         sql: sqlQuery,
  //       }),
  //     });

  //     if (!datasetRes.ok) {
  //       const errData = await datasetRes.json();
  //       throw new Error(
  //         `Impossible de créer le Dataset: ${JSON.stringify(errData)}`,
  //       );
  //     }

  //     const datasetData = (await datasetRes.json()) as { id: number };
  //     const datasetId = datasetData.id;
  //     console.log(
  //       `[SupersetService] ✅ Dataset virtuel créé avec succès (ID: ${datasetId})`,
  //     );

  //     // 2. Configuration des paramètres visuels (options de tranche spécifiques à Superset)
  //     const vizParams = {
  //       datasource: `${datasetId}__table`,
  //       viz_type: chartType,
  //       slice_id: 0,
  //       granularity_sqla: null,
  //       time_grain_sqla: null,
  //       metrics: ["count"], // Ajustable selon la structure de ta donnée
  //       adhoc_filters: [],
  //     };

  //     // 3. Création du Chart et association immédiate à l'ID du Dashboard cible
  //     const chartRes = await fetch(`${SUPERSET_URL}/api/v1/chart/`, {
  //       method: "POST",
  //       headers,
  //       body: JSON.stringify({
  //         slice_name: chartTitle,
  //         datasource_id: datasetId,
  //         datasource_type: "table",
  //         viz_type: chartType,
  //         params: JSON.stringify(vizParams),
  //         dashboards: [dashboardId], // Liaison automatique native !
  //       }),
  //     });

  //     if (!chartRes.ok) {
  //       const errChart = await chartRes.json();
  //       throw new Error(
  //         `Impossible de créer le Chart: ${JSON.stringify(errChart)}`,
  //       );
  //     }

  //     const chartData = await chartRes.json();
  //     console.log(
  //       `[SupersetService] 🎉 Graphique "${chartTitle}" injecté nativement dans le Dashboard ${dashboardId}`,
  //     );

  //     return chartData;
  //   } catch (error: any) {
  //     console.error(
  //       "[SupersetService] 💥 Échec de l'injection Native Superset:",
  //       error.message,
  //     );
  //     // On log mais on ne bloque pas forcément l'agent si Superset a un souci temporaire
  //     return null;
  //   }
  // },

  async addChartToDashboard({
    dashboardId,
    chartTitle,
    sqlQuery,
    vizKind,
    columns,
    metricColumn,
    dimensionColumn,
  }: {
    dashboardId: number;
    chartTitle: string;
    sqlQuery: string;
    vizKind: SupportedViz;
    columns: string[];
    metricColumn: string;
    dimensionColumn: string;
  }): Promise<SupersetChartCreationResult> {
    // ← type de retour explicite ici
    const headers = await buildHeaders();

    const datasetRes = await fetch(`${SUPERSET_URL}/api/v1/dataset/`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        database: SUPERSET_DATABASE_ID,
        table_name: `agent_query_${Date.now()}`,
        sql: sqlQuery,
        schema: "public",
      }),
    });
    if (!datasetRes.ok) throw new Error(await datasetRes.text());
    const { id: datasetId } = (await datasetRes.json()) as { id: number };

    const vizParams = buildVizParams(
      vizKind,
      datasetId,
      columns,
      metricColumn,
      dimensionColumn,
    );

    const chartRes = await fetch(`${SUPERSET_URL}/api/v1/chart/`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        slice_name: chartTitle,
        datasource_id: datasetId,
        datasource_type: "table",
        viz_type: vizParams.viz_type,
        params: JSON.stringify(vizParams),
        dashboards: [dashboardId],
      }),
    });
    if (!chartRes.ok) throw new Error(await chartRes.text());

    // Cast explicite au lieu de laisser TS inférer {}
    return (await chartRes.json()) as SupersetChartCreationResult;
  },
};
