import { StateGraph, START, END } from "@langchain/langgraph";
import { StateAnnotation } from "./state.js";
import { agentReformulation } from "./agent1.js";
import { agentSql } from "./agentSql.js";
import { agentJudge } from "./agentJudge.js";
import { executeSQL } from "./executeSQL.js";        // 🆕
import { agentContent } from "./agentContent.js";    // 🆕
import { getCacheExact, setCacheEntry, SQLQueryResult } from "../cache/sqlCache.js";

/**
 * ROUTEUR 1 : Aiguillage après Agent 1 (Validation Humaine)
 */
function routeAfterReformulation(state: typeof StateAnnotation.State) {
  console.log("\n[Routeur 1] Vérification de la validation humaine...");

  if (!state.isClarifiedByHuman) {
    console.log("[Routeur 1] 🛑 En attente de validation UI. Pause.");
    return "attente_validation_humaine";
  }

  console.log("[Routeur 1] ✅ Validation confirmée → Agent SQL.");
  return "agent_sql";
}

/**
 * ROUTEUR 2 : Aiguillage après AgentJudge (Boucle auto-correction ou suite)
 */
function routeAfterJudge(state: typeof StateAnnotation.State) {
  console.log("\n[Routeur 2] Lecture du verdict du Judge...");

  // ─── Rejet sécurité RBAC : inutile de boucler ────────────────────────────
  if (state.generatedSQL === "REJECTED_BY_SECURITY") {
    console.log("[Routeur 2] 🚫 Requête rejetée par RBAC → Fin forcée.");
    return "fin_parcours_valide";
  }

  // ─── SQL + Viz validés → on exécute ──────────────────────────────────────
  if (state.judgeEvaluation?.isValid === true) {
    console.log("[Routeur 2] 🎉 SQL et visualisation validés → Exécution SQL.");
    return "executer_sql";   // 🆕 on ne va plus vers END directement
  }

  // ─── Anti-boucle infinie ──────────────────────────────────────────────────
  const maxRetries = 3;
  const currentRetries = state.sqlRetryCount || 0;

  if (currentRetries >= maxRetries) {
    console.log(`[Routeur 2] 🚨 ${maxRetries} tentatives épuisées → Arrêt forcé.`);
    return "fin_parcours_valide";
  }

  // ─── SQL invalide → retour en correction ─────────────────────────────────
  console.log(`[Routeur 2] 🔄 Tentative ${currentRetries + 1}/${maxRetries} → Correction Agent SQL.`);
  return "corriger_sql";
}

/**
 * ROUTEUR 3 : Aiguillage après ExecuteSQL (erreur BDD ?)  🆕
 */
function routeAfterExecuteSQL(state: typeof StateAnnotation.State) {
  console.log("\n[Routeur 3] Vérification du résultat d'exécution SQL...");

  if (state.queryError) {
    console.log(`[Routeur 3] ❌ Erreur d'exécution : ${state.queryError} → Fin avec message d'erreur.`);
    return "fin_avec_erreur";
  }
// 1. On force le cast pour manipuler le dictionnaire sans râleries de TS
  const executionResults = state.queryResults as unknown as Record<string, unknown[]> | undefined;
  
  // 2. On calcule dynamiquement le total des lignes de toutes les requêtes présentes
  const totalLignes = executionResults 
    ? Object.values(executionResults).reduce((sum, rows) => sum + (rows?.length || 0), 0)
    : 0;

  console.log(`[Routeur 3] ✅ ${totalLignes} lignes récupérées → Passage à la sauvegarde.`);
  console.log(`[Routeur 3] ✅ Exécution réussie → Passage à la sauvegarde.`);
  return "sauvegarder_et_continuer"; // 👈 On retourne exactement la clé du mapping
}

// Nœud de sauvegarde cache (non-LLM, instantané)
// Nœud de sauvegarde cache (dans ton fichier de graphe)
async function saveSQLToCache(state: typeof StateAnnotation.State) {
  console.log("\n[Node : Save To Cache] 💾 Préparation de la sauvegarde dans Redis...");

  // 1. Double filet de sécurité
  if (!state.judgeEvaluation?.isValid || state.generatedSQL === "REJECTED_BY_SECURITY") {
    console.log("[Node : Save To Cache] 🛑 Requête invalide ou rejetée. Annulation.");
    return {};
  }

  // 2. Cast de queryResults pour pouvoir indexer par ID de requête sans erreur ts(7015)
  const executionResults = state.queryResults as unknown as Record<string, Record<string, any>[]> | undefined;

  // 🛡️ Définition du type d'un bloc de requête pour le cache
  interface CacheQueryResultItem {
    id: string;
    sql: string;
    visualisation: string;
    data: Record<string, any>[]; // Clés: [Tableau d'objets (lignes SQL)]
  }

  // On type notre tableau avec notre interface propre
  const resultsToCache: CacheQueryResultItem[] = [];

  // 3. Gestion Multi-requêtes vs Mono-requête
  if (state.sqlQueries && state.sqlQueries.length > 0) {
    for (const query of state.sqlQueries) {
      resultsToCache.push({
        id: query.id,
        sql: query.sql,
        visualisation: query.visualisation || state.suggestedVisualization || "text_report",
        data: executionResults?.[query.id] || [] // Plus aucune erreur !
      });
    }
  } else {
    // Cas Mono-requête standard
    let mainData: Record<string, any>[] = [];
    
    if (Array.isArray(state.queryResults)) {
      mainData = state.queryResults;
    } else if (executionResults?.["query_1"]) {
      mainData = executionResults["query_1"];
    }

    resultsToCache.push({
      id: "query_1",
      sql: state.generatedSQL,
      visualisation: state.suggestedVisualization || "text_report",
      data: mainData
    });
  }

  // 4. On prépare le payload final pour Redis
  const cachePayload: SQLQueryResult = {
    userQuestion:  state.userQuestion,
    role:          state.userRole ?? "unknown",
    agence:        state.userContextInfo?.agence_utilisateur,
    sql:           state.generatedSQL,
    visualisation: state.suggestedVisualization || "text_report",
    // On passe notre tableau d'objets parfaitement typé. 
    // Pense à vérifier que l'interface SQLQueryResult dans sqlCache.ts accepte "any" ou "unknown" pour la propriété "data"
    data:          resultsToCache as any 
  };

  try {
    await setCacheEntry(cachePayload);
    console.log("[Node : Save To Cache] ✅ Données transmises avec succès à setCacheEntry.");
  } catch (error) {
    console.error("[Node : Save To Cache] ❌ Erreur écriture Redis :", error);
  }

  return {};
}

// Noeud de check dans le cache avant reformulation
async function checkCacheQuestion(state: typeof StateAnnotation.State) {
  console.log("\n[Node] Vérification du cache avant reformulation...");
  const cacheHit = await getCacheExact(state.userQuestion, state.userRole, state.userContextInfo?.agence_utilisateur);
  if (cacheHit) {
    console.log("[Node] ⚡ Cache exact trouvé → bypass total, on remplit le state avec les données du cache.");
    return {
      generatedSQL:           cacheHit.sql,
      suggestedVisualization: cacheHit.visualisation,
      queryResults:           cacheHit.data_generated,
      userQuestion:           cacheHit.question,
      sqlFromCache:           true,   // ← flag pour indiquer que c'est du cache
    };
  }
  console.log("[Node] ❌ Cache exact non trouvé → poursuite normale du workflow.");
  return state;
}

function routeAfterCacheCheck(state: typeof StateAnnotation.State) {
  if (state.sqlFromCache === true) {
    console.log("[Routeur Cache] ⚡ HIT exact trouvé ! Redirection directe vers l'Agent Content.");
    return "bypass_to_content";
  }
  console.log("[Routeur Cache] ❌ MISS cache. Envoi à l'Agent Reformulation.");
  return "poursuite_normale";
}
/**
 * CONSTRUCTION DU WORKFLOW
 */
const workflow = new StateGraph(StateAnnotation)

  // ── Nœuds ──────────────────────────────────────────────────────────────────
  .addNode("checkCacheQuestion",         checkCacheQuestion)
  .addNode("agent_reformulation",        agentReformulation) // il faudrait qu'avant la reformulation, on puisse déja faire un check dans le cache pour savoir si la question à déja été posée
  .addNode("agent_sql",                  agentSql)
  .addNode("agent_judge",                agentJudge)
  .addNode("execute_sql",                executeSQL)       // 🆕
  .addNode("save_to_cache", saveSQLToCache) // Après le juge, et l'éxécution de la requete, on sauvegarde les résultats validés dans le cache pour optimiser les futures requetes similaires
  .addNode("agent_content",              agentContent)     // 🆕
  .addNode("attente_validation_humaine", async (state) => {
    console.log("[Node] Flux en pause — attente validation utilisateur...");
    return state;
  })

  // ── Edges fixes ────────────────────────────────────────────────────────────
  .addEdge(START, "checkCacheQuestion") // Le point d'entrée unique du graphe
  .addEdge("agent_sql", "agent_judge")
  .addEdge("save_to_cache", "agent_content") // Après la sauvegarde, on génère le contenu final
  .addEdge("agent_content", END)             // Sortie finale par défaut
  .addEdge("attente_validation_humaine", END)

  // Décide si on court-circuite tout le graphe (HIT) ou si on continue (MISS)
  .addConditionalEdges("checkCacheQuestion", routeAfterCacheCheck, {
    bypass_to_content: "agent_content",      // ⚡ Tour 2 : HIT -> On va direct au résumé/graphes
    poursuite_normale: "agent_reformulation" // 🔄 Tour 1 : MISS -> Chemin classique
  })

  // ── 4. Routeur Reformulation ───────────────────────────────────────────────
  .addConditionalEdges("agent_reformulation", routeAfterReformulation, {
    attente_validation_humaine: "attente_validation_humaine",
    agent_sql:                  "agent_sql",
  })

  // ── 5. Routeur Judge (Corrigé) ─────────────────────────────────────────────
  .addConditionalEdges("agent_judge", routeAfterJudge, {
    corriger_sql:        "agent_sql",    // 🔄 Boucle de correction si erreur de schéma
    executer_sql:        "execute_sql",  // 🚀 On exécute la requête d'abord !
    fin_parcours_valide: END,            // Rejet RBAC ou limite d'essais atteinte
  })

  // ── 6. Routeur Exécution SQL (Corrigé) ─────────────────────────────────────
  .addConditionalEdges("execute_sql", routeAfterExecuteSQL, {
    sauvegarder_et_continuer: "save_to_cache", // 🎉 Données OK -> On enregistre dans Redis
    fin_avec_erreur:          END,             // Erreur BDD -> Sortie propre
  });

/**
 * COMPILATION
 */
export const multiAgentSystem = workflow.compile();