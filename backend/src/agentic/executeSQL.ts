// executeSQL.ts
import { StateAnnotation } from "./state.js";
import { pool } from "../db/pool.js";   // ← import depuis le fichier partagé

export async function executeSQL(state: typeof StateAnnotation.State) {
  console.log("\n[ExecuteSQL] --- Exécution des requêtes validées ---");

  const queries = state.sqlQueries?.length > 0
    ? state.sqlQueries
    : [{ id: "query_1", sql: state.generatedSQL, label: "Requête principale" }];

  const allResults: Record<string, unknown[]> = {};

  for (const query of queries) {
    try {
      const result = await pool.query(query.sql);
      allResults[query.id] = result.rows;
      console.log(`📊 Contenu complet de result : ${JSON.stringify(result, null, 2)}`);
      console.dir(allResults, { depth: null, colors: true });
      console.log(`[ExecuteSQL] exécution sql réussie✅ ${query.id} → ${result.rows.length} lignes`);
    } catch (error: any) {
      console.error(`[ExecuteSQL] Exécution sql non réussie❌ ${query.id} → ${error.message}`);
      return {
        queryResults: [],
        queryError: `Erreur sur ${query.id}: ${error.message}`,
      };
    }
  }

  // Compatibilité : queryResults = résultats de la première requête
  const firstId    = queries[0].id;
  return {
    queryResults:    allResults,
    queryError:      null,
  };
}