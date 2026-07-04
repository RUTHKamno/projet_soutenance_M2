import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateAnnotation } from "./state.js";
import { getDwhContext } from "./ragService.js";
import { getSecurityConstraints } from "./rbacService.js";
// insertion du cache dans l'agent SQL pour éviter les appels redondants à Gemini sur des questions similaires
import {
  getCacheExact,
  getCacheSemantic,
  setCacheEntry,
} from "../cache/sqlCache.js";

// Initialisation de Gemini 2.5 Flash-lite pour la génération SQL
const model = new ChatGoogleGenerativeAI({
  // modelName: "gemini-3.1-flash-lite",
  modelName: "gemini-2.5-pro",
  temperature: 0.0, // Température à 0 pour une rigueur mathématique et éviter toute créativité sur le SQL
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
});

/**
 * AGENT 2 : Générateur de Requêtes SQL Décisionnelles Sécurisées
 * Ce nœud combine le contexte du RAG et les restrictions du RBAC pour concevoir le SQL.
 */
export async function agentSql(state: typeof StateAnnotation.State) {
  console.log("\n[Node : Agent SQL] --- Début de la phase génération SQL ---");
  console.log(
    `[Node : Agent SQL] Question validée exploitée : "${state.reformulatedQuestion}"`,
  );

  try {
    // ─── NIVEAU 1 : LLM generate SQL ────────────────────────────────────────

    // 1. Récupération du contexte sémantique DWH depuis LanceDB
    const contexteDwh = await getDwhContext(state.reformulatedQuestion);

    const DIM_TEMPS_CONTEXT = `
      === DIMENSION TEMPORELLE — À UTILISER OBLIGATOIREMENT POUR LES DATES ===

      TABLE : dwh.dim_temps
      Colonnes exactes :
        - date_id     INTEGER   (clé de jointure, format YYYYMMDD ex: 20240115)
        - date_val    DATE      (vraie date PostgreSQL → utilisable pour timestamp)
        - mois        INTEGER
        - annee       INTEGER
        - trimestre   INTEGER
        - jour        INTEGER
        - semaine     INTEGER
        - libelle_mois VARCHAR  (ex: "Nom du mois en toutes lettres en français. Exemple : Janvier, Février, Mars.")

      RÈGLE OBLIGATOIRE SUR LES DATES :
      Si ta requête implique une dimension temporelle (évolution, tendance, historique),
      tu DOIS faire une jointure avec dwh.dim_temps via :
        JOIN dwh.dim_temps dt ON fec.date_id = dt.date_id

      Puis utiliser dt.date_val (type DATE PostgreSQL) comme axe temporel.
      dt.date_val sera correctement interprété comme timestamp par ECharts
      avec xAxis.type = "time".

      EXEMPLE OBLIGATOIRE pour une évolution mensuelle :
        SELECT
            DATE_TRUNC('month', dt.date_val) AS snapshot_month,
            SUM(fec.encours) AS total_encours
        FROM dwh.fait_encours_credit fec
        JOIN dwh.dim_temps dt ON fec.date_id = dt.date_id
        WHERE fec.age = '[CODE_AGENCE]'
        GROUP BY DATE_TRUNC('month', dt.date_val)
        ORDER BY snapshot_month;

      Avec cette structure, snapshot_month est un vrai timestamp PostgreSQL
      qui sera sérialisé en ISO 8601 par Node.js → ECharts peut utiliser
      xAxis.type = "time" correctement.
      ===================================================================
      `;

    // 2. Récupération des contraintes de sécurité dynamiques (RBAC) depuis le fichier JSON
    const contraintesSecurite = getSecurityConstraints(
      state.userRole,
      state.userContextInfo,
    );

    //-----------------------------------------------------------------------------

    console.log(
      `[Node : Agent SQL] Application des filtres de sécurité pour le rôle : ${state.userRole}`,
    );

    let blocCorrectionJudge = "";
    if (state.judgeEvaluation && state.judgeEvaluation.isValid === false) {
      console.log(
        `[Node : Agent SQL] 🔧 Tentative de correction suite au retour du Judge.`,
      );
      blocCorrectionJudge = `
        ⚠️ ATTENTION : Tu as déjà généré une requête précédemment, mais elle a été REJETÉE par le Judge pour l'erreur suivante :
        🔴 PROBLÈME SQL     : ${state.judgeEvaluation.feedback}
        🔴 PROBLÈME VIZ     : ${state.judgeEvaluation.feedbackViz}
        Les Requête SQL rejetées et visualisations sont (à NE PAS reproduire) :
        ${state.queryResults}
        Tu DOIS impérativement analyser ce retour, modifier tes jointures ou tes colonnes pour corriger cette erreur spécifique.
      `;
    }

    // 3. Rédaction du prompt système spécialisé incluant la sécurité et le contexte
    const prompt = `
    Tu es l'Agent SQL de notre architecture décisionnelle de microfinance.
    Ton rôle unique et strict est de traduire la question validée de l'utilisateur
    en une requête SQL valide (PostgreSQL), performante et hautement sécurisée,
    ET de déterminer le type de visualisation le plus adapté aux données retournées.

    ${blocCorrectionJudge}

    ======================================================================
    🛡️ CADRE STRICT DE SÉCURITÉ (RBAC) À RESPECTER OBLIGATOIREMENT :
    ${contraintesSecurite}
    ======================================================================

    ======================================================================
    📚 CONTEXTE SÉMANTIQUE DU DWH (Structures des tables et relations) :
    ${contexteDwh}
    ======================================================================

    ======================================================================
    📚 CONTEXTE TEMPORELLE DU DWH (Structures de la table) :
    ${DIM_TEMPS_CONTEXT}
    ======================================================================

    QUESTION DE L'UTILISATEUR À TRADUIRE EN SQL :
    "${state.reformulatedQuestion}"

    ======================================================================
    📊 RÈGLES DE SÉLECTION DE LA VISUALISATION :
    Choisis le type de visualisation parmi les valeurs suivantes UNIQUEMENT :

    - "echarts_timeseries_line"   → évolution temporelle, tendances jour/mois/année
    - "echarts_bar"               → comparaisons entre catégories (verticales)
    - "echarts_bar_horizontal"    → classements, top N, palmarès
    - "echarts_pie"               → répartition proportionnelle, parts de marché
    - "text_report"               → rapport textuel pur, aucune donnée chiffrable visuellement

    Règles de cohérence obligatoires :
    - "echarts_timeseries_line" → le SELECT doit contenir une colonne date/temps + ≥1 mesure numérique
    - "echarts_bar" / "echarts_bar_horizontal" → doit avoir ≥1 dimension catégorielle + ≥1 mesure
    - "echarts_pie" → doit avoir exactement 1 dimension + 1 mesure agrégée (SUM ou COUNT)
    - "text_report" → toujours valide, utilisé si aucune visualisation n'est pertinente
    ======================================================================

    RÈGLES D'OR POUR LA GÉNÉRATION SQL :
    1. Tu ne dois utiliser QUE les tables explicitement AUTORISÉES dans le cadre RBAC.
       Si la question porte sur une table interdite, renvoie "REJECTED_BY_SECURITY" dans le champ "sql".
    2. Applique scrupuleusement les filtres obligatoires (restrictions par agence, par rôle, etc.)
       dans ta clause WHERE, comme exigé dans le cadre RBAC.
    3. Ne fais jamais référence aux colonnes déclarées INTERDITES.
    4. Si aucune restriction de date n'est précisée dans la question, applique par défaut
       un filtre de cohérence sur l'année en cours ou la période la plus pertinente dans les métadonnées.
    5. Rédige le SQL de manière propre, lisible et performante (optimise les jointures Star Schema).
    6. NE PAS ajouter d'explications textuelles avant ou après le JSON.
    7. NE PAS entourer le JSON de balises markdown. Renvoie UNIQUEMENT le JSON brut.
    8. RÈGLE ENCOURS : les colonnes peuvent contenir
    des valeurs négatives (décaissements, remboursements, encours, ...).
    Ne pas utiliser ABS() — conserve les valeurs signées pour une analyse
    financière correcte. Le signe négatif est une information métier importante.
    Si l'utilisateur demande explicitement des "montants" ou "totaux" positifs,
    utilise SUM() sans ABS() et laisse ECharts gérer l'affichage.
    9. Avant d'écrire chaque nom de colonne,
     vérifie qu'il apparaît MOT POUR MOT dans le schéma officiel du DWH fourni dans le contexte. Si une colonne n'existe pas, corrige ta requête en conséquence.

    ======================================================================
     ANALYSE DE LA COMPLEXITÉ DE LA QUESTION :
    Avant de générer le SQL, détermine si la question nécessite :
    - UNE seule requête  → question simple (un indicateur, une évolution)
    - PLUSIEURS requêtes → question complexe (bilan, rapport, comparaison multi-axes)

    Mots-clés déclencheurs de rapport multi-requêtes :
    "bilan", "rapport", "analyse complète", "synthèse", "tableau de bord",
    "comparer", "plusieurs indicateurs", "vue d'ensemble"

    FORMAT DE RÉPONSE OBLIGATOIRE (JSON strict) :
    {
      "isMultiQuery": false,
      "queries": [
        {
          "id": "query_1",
          "label": "Évolution mensuelle des encours",
          "sql": "WITH MonthlySnapshots AS (...) SELECT ...",
          "visualisation": "echarts_timeseries_line",
          "justification": "..."
        }
      ]
    }

    Si plusieurs requêtes :
    {
      "isMultiQuery": true,
      "queries": [
        {
          "id": "query_1",
          "label": "Évolution mensuelle des encours",
          "sql": "SELECT ...",
          "visualisation": "echarts_timeseries_line",
          "justification": "..."
        },
        {
          "id": "query_2",
          "label": "Répartition par chapitre comptable",
          "sql": "SELECT ...",
          "visualisation": "echarts_pie",
          "justification": "..."
        }
      ]
    }
    ======================================================================
  `;

    // 4. Envoi du prompt blindé à Gemini
    const response = await model.invoke([
      {
        role: "system",
        content:
          "Tu es un expert SQL. Tu réponds exclusivement en JSON strict, sans markdown.",
      },
      { role: "user", content: prompt },
    ]);
    let clean = (response.content as string)
      .trim()
      .replace(/```json|```/g, "")
      .trim();
    const parsed = JSON.parse(clean);

    // ─── Vérification sécurité côté code (double filet) ───────────────────────
    if (parsed.queries[0].sql === "REJECTED_BY_SECURITY") {
      console.warn("[AgentSQL] 🛑 Requête rejetée par sécurité RBAC.");
      return {
        generatedSQL: "REJECTED_BY_SECURITY",
        suggestedVisualization: "text_report",
        ragContext: contexteDwh,
        sqlFromCache: false,
      };
    }

    console.log(
      `[AgentSQL] ✅ SQL généré : ${JSON.stringify(parsed.queries, null, 2)}`,
    );
    console.log(
      `[AgentSQL] 📊 Visualisation : ${parsed.queries[0].visualisation}`,
    );
    console.log(
      `[AgentSQL] 💬 Justification : ${parsed.queries[0].justification}`,
    );

    console.log(
      `[Node : Agent SQL] 💾 Requête SQL sécurisée générée avec succès.`,
    );

    // 5. On enrichit notre fiche de suivi centrale en augmentant le compteur
    const currentRetries = state.sqlRetryCount || 0;

    // 5. On enrichit notre fiche de suivi centrale
    return {
      ragContext: contexteDwh,
      generatedSQL: parsed.queries[0].sql,
      suggestedVisualization: parsed.queries[0].visualisation,
      sqlFromCache: false,
      sqlQueries: parsed.queries, // ← toutes les requêtes
      isMultiQuery: parsed.isMultiQuery,
      sqlRetryCount: currentRetries + 1, // 🔄 On incrémente le nombre de passes
    };
  } catch (error) {
    console.error(
      "[Node : Agent SQL] ❌ Erreur lors de l'exécution du nœud SQL :",
      error,
    );
    throw error;
  }
}
