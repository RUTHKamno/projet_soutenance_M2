import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getDwhContext } from "../ragService.js";
import { getSecurityConstraints } from "../rbacService.js";
import { pool } from "../../db/pool.js";
import { getCacheExact, setCacheEntry } from "../../cache/sqlCache.js";
import { HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
// ─── Définition des outils ────────────────────────────────────────────────────

const toolReformulate = tool(
  async ({ question }) => {
    const model = new ChatGoogleGenerativeAI({
      modelName: "gemini-3.1-flash-lite",
      temperature: 0.2,
      apiKey: process.env.GEMINI_API_KEY,
    });
    const response = await model.invoke([
      {
        role: "system",
        content: "Tu reformules les questions en langage décisionnel structuré. Réponds uniquement par la question reformulée.",
      },
      { role: "user", content: question },
    ]);
    return response.content as string;
  },
  {
    name: "tool_reformulate",
    description: "Reformule une question brute en langage décisionnel structuré adapté à un DWH de microfinance.",
    schema: z.object({
      question: z.string().describe("La question brute de l'utilisateur"),
    }),
  }
);

const toolSearchRag = tool(
  async ({ query }) => {
    return await getDwhContext(query, 5);
  },
  {
    name: "tool_search_rag",
    description: "Recherche le contexte sémantique du DWH (schémas, tables, colonnes) pertinent pour une question.",
    schema: z.object({
      query: z.string().describe("La question reformulée pour la recherche vectorielle"),
    }),
  }
);

const toolGetRbac = tool(
  async ({ role, contextInfo }) => {
    return getSecurityConstraints(role, contextInfo);
  },
  {
    name: "tool_get_rbac",
    description: "Récupère les contraintes de sécurité RBAC pour un rôle utilisateur donné.",
    schema: z.object({
      role:        z.string().describe("Le rôle de l'utilisateur (ex: directeur_agence)"),
      contextInfo: z.record(z.unknown()).describe("Le contexte utilisateur (agence, région, etc.)"),
    }),
  }
);

const toolGenerateSql = tool(
  async ({ question, ragContext, rbacConstraints }) => {
    const model = new ChatGoogleGenerativeAI({
      modelName: "gemini-3.1-flash-lite",
      temperature: 0.0,
      apiKey: process.env.GEMINI_API_KEY,
    });
    const prompt = `
      Génère des requêtes SQL PostgreSQL pour cette question de microfinance.
      QUESTION : "${question}"
      CONTEXTE DWH : ${ragContext}
      CONTRAINTES RBAC : ${rbacConstraints}

      Réponds en JSON strict :
      {
        "isMultiQuery": false,
        "queries": [
          {
            "id": "query_1",
            "label": "...",
            "sql": "SELECT ...",
            "visualisation": "echarts_timeseries_line",
            "justification": "..."
          }
        ]
      }
    `;
    const response = await model.invoke([
      { role: "system", content: "Expert SQL PostgreSQL. JSON strict uniquement." },
      { role: "user",   content: prompt },
    ]);
    console.log("[tool_generate_sql] SQL généré (brut) :", response.content);
    return (response.content as string).trim().replace(/```json|```/g, "").trim();
  },
  {
    name: "tool_generate_sql",
    description: "Génère une ou plusieurs requêtes SQL sécurisées à partir d'une question et du contexte DWH.",
    schema: z.object({
      question:         z.string(),
      ragContext:       z.string(),
      rbacConstraints:  z.string(),
    }),
  }
);

const toolJudgeSql = tool(
  async ({ sqlJson, ragContext }) => {
    const model = new ChatGoogleGenerativeAI({
      modelName: "gemini-3.1-flash-lite",
      temperature: 0.0,
      apiKey: process.env.GEMINI_API_KEY,
    });
    const prompt = `
      Valide ces requêtes SQL par rapport au contexte DWH.
      REQUÊTES : ${sqlJson}
      CONTEXTE DWH : ${ragContext}

      Réponds en JSON strict :
      {
        "isValid": true,
        "feedbackSQL": "...",
        "feedbackViz": "..."
      }
    `;
    const response = await model.invoke([
      { role: "system", content: "Expert audit SQL. JSON strict uniquement." },
      { role: "user",   content: prompt },
    ]);
    console.log("[tool_judge_sql] Feedback de validation (brut) :", response.content);
    return (response.content as string).trim().replace(/```json|```/g, "").trim();
  },
  {
    name: "tool_judge_sql",
    description: "Valide les requêtes SQL générées. Retourne isValid true/false avec feedback détaillé.",
    schema: z.object({
      sqlJson:    z.string().describe("Le JSON des requêtes généré par tool_generate_sql"),
      ragContext: z.string().describe("Le contexte DWH pour la validation"),
    }),
  }
);

const toolExecuteQuery = tool(
  async ({ sql }) => {
    try {
      console.log(`[tool_execute_query] Exécution SQL : ${sql}`);
      const result = await pool.query(sql);
      return JSON.stringify({
        success:  true,
        rowCount: result.rows.length,
        // 👇 On limite strictement à 5 ou 10 lignes pour éviter d'asphyxier le contexte du LLM
        rows:     result.rows.slice(0, 10), 
        columns:  result.fields.map(f => f.name),
      });
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message });
    }
  },
  {
    name: "tool_execute_query",
    description: "Exécute une requête SQL sur le Data Warehouse PostgreSQL et retourne un échantillon des données.",
    schema: z.object({
      sql: z.string().describe("La requête SQL PostgreSQL validée à exécuter"),
    }),
  }
);

const toolGenerateChart = tool(
  async ({ rows, chartType, label }) => {
    const model = new ChatGoogleGenerativeAI({
      modelName: "gemini-3.1-flash-lite",
      temperature: 0.2,
      apiKey: process.env.GEMINI_API_KEY,
    });
    const prompt = `
      Génère une config ECharts pour ce graphique.
      TYPE : ${chartType}
      TITRE : ${label}
      DONNÉES : ${JSON.stringify(rows.slice(0, 50), null, 2)}
      COLONNES : ${Object.keys(rows[0] ?? {}).join(", ")}

      RÈGLES :
      - Devise FCFA uniquement, jamais €
      - Dates ISO 8601 → xAxis.type = "time"
      - Grands nombres → formatter en Mrd/M FCFA
      - Valeurs signées : ne pas forcer ABS()

      JSON ECharts complet uniquement.
    `;
    const response = await model.invoke([
      { role: "system", content: "Expert ECharts. JSON strict." },
      { role: "user",   content: prompt },
    ]);
    console.log("[tool_generate_chart] Config ECharts générée (brut) :", response.content);
    return (response.content as string).trim().replace(/```json|```/g, "").trim();
  },
  {
    name: "tool_generate_chart",
    description: "Génère une configuration ECharts à partir de données brutes et d'un type de graphique.",
    schema: z.object({
      rows:      z.array(z.record(z.unknown())).describe("Les lignes de données"),
      chartType: z.string().describe("Le type de visualisation ECharts"),
      label:     z.string().describe("Le titre du graphique"),
    }),
  }
);

const toolWriteReport = tool(
  async ({ userQuestion, sectionsData, language }) => {
    const model = new ChatGoogleGenerativeAI({
      modelName: "gemini-3.1-flash-lite",
      temperature: 0.3,
      apiKey: process.env.GEMINI_API_KEY,
    });
    const prompt = `
      Rédige un rapport analytique complet en français pour un décideur de microfinance.
      QUESTION : "${userQuestion}"
      LANGUE DU RAPPORT : Rédige obligatoirement la réponse dans cette langue : "${language}".
      DONNÉES PAR SECTION : ${JSON.stringify(sectionsData, null, 2)}

      CONSIGNES :
      - Langage métier uniquement, pas de noms SQL
      - Tendances, anomalies, points saillants
      - Conclusion avec recommandations actionnables
      - Devise FCFA
    `;
    const response = await model.invoke([
      { role: "system", content: "Expert analytique microfinance. Français professionnel." },
      { role: "user",   content: prompt },
    ]);
    console.log("[tool_write_report] Rapport généré (brut) :", response.content);
    return response.content as string;
  },
  {
    name: "tool_write_report",
    description: "Rédige un rapport analytique dans la langue spécifiée à partir de plusieurs jeux de données.",
    schema: z.object({
      userQuestion: z.string(),
      language:     z.string().default("fr"),
      sectionsData: z.array(z.object({
        label: z.string(),
        rows:  z.array(z.record(z.unknown())),
      })),
    }),
  }
);

const toolCacheGet = tool(
  async ({ question, role, agence }) => {
    const hit = await getCacheExact(question, role, agence);
    if (hit) return JSON.stringify({ found: true, sql: hit.sql, visualisation: hit.visualisation });
    return JSON.stringify({ found: false });
  },
  {
    name: "tool_cache_get",
    description: "Vérifie si une question a déjà été traitée et son SQL mis en cache. Appelle cet outil en premier.",
    schema: z.object({
      question: z.string(),
      role:     z.string(),
      agence:   z.string().optional(),
    }),
  }
);

const toolCacheSet = tool(
  async ({ question, role, agence, sql, visualisation }) => {
    await setCacheEntry({
      userQuestion:  question,
      role,
      agence,
      sql,
      visualisation,
      data: [],
    });
    return "Entrée mise en cache avec succès.";
  },
  {
    name: "tool_cache_set",
    description: "Stocke un SQL validé dans le cache Redis pour les prochaines utilisations.",
    schema: z.object({
      question:     z.string(),
      role:         z.string(),
      agence:       z.string().optional(),
      sql:          z.string(),
      visualisation: z.string(),
    }),
  }
);

// ─── Agent orchestrateur ──────────────────────────────────────────────────────

const ALL_TOOLS = [
  toolReformulate,
  toolSearchRag,
  toolGetRbac,
  toolGenerateSql,
  toolJudgeSql,
  toolExecuteQuery,
  toolGenerateChart,
  toolWriteReport,
  toolCacheGet,
  toolCacheSet,
];

const orchestratorModel = new ChatGoogleGenerativeAI({
  modelName: "gemini-3.1-flash-lite",
  temperature: 0.1,
  apiKey: process.env.GEMINI_API_KEY,
}).bindTools(ALL_TOOLS);

// ─── Map d'outils indexée par nom ────────────────────────────────────────────
const TOOLS_MAP: Record<string, (input: any) => Promise<any>> = {
  tool_reformulate:    (args) => toolReformulate.invoke(args),
  tool_search_rag:     (args) => toolSearchRag.invoke(args),
  tool_get_rbac:       (args) => toolGetRbac.invoke(args),
  tool_generate_sql:   (args) => toolGenerateSql.invoke(args),
  tool_judge_sql:      (args) => toolJudgeSql.invoke(args),
  tool_execute_query:  (args) => toolExecuteQuery.invoke(args),
  tool_generate_chart: (args) => toolGenerateChart.invoke(args),
  tool_write_report:   (args) => toolWriteReport.invoke(args),
  tool_cache_get:      (args) => toolCacheGet.invoke(args),
  tool_cache_set:      (args) => toolCacheSet.invoke(args),
};


const FinalResponseSchema = z.object({
  analyse: z.string().describe("L'analyse métier détaillée en français (tendances, pics, anomalies) dans la langue demandée."),
  visualisation: z.record(z.unknown()).describe("L'objet de configuration ECharts complet et valide généré pendant le workflow."),
  notes: z.string().describe("Recommandations, alertes ou remarques sur la qualité des données dans la langue demandée.")
});

// Optionnel : Générer le type TypeScript associé
type FinalResponse = z.infer<typeof FinalResponseSchema>;

export async function runAutonomousAgent(
  userQuestion:   string,
  userRole:       string,
  userContextInfo: Record<string, unknown>,
  userLanguage:   string = "fr" // 👈 Étape 1 : Nouvel argument 'userLanguage' par défaut 'fr'
) {
  console.log("\n[Agent Autonome] 🤖 Démarrage...");
  console.log(`[Agent Autonome] Question : "${userQuestion}"`);


  const SYSTEM_PROMPT = `
  Tu es un agent analytique autonome pour une institution de microfinance en Afrique Centrale.
  Tu reçois une question d'un utilisateur et tu dois produire une réponse analytique complète.
  CONSIGNE DE LANGUE ABSOLUE : 
  L'utilisateur a configuré sa plateforme en langue : "${userLanguage}". 
  Tu dois OBLIGATOIREMENT formuler tes analyses finales, tes notes, et tes appels d'outils textuels (comme tool_write_report) dans cette langue : "${userLanguage}".
  TON WORKFLOW OBLIGATOIRE:
  1. tool_cache_get     → vérifie si la question existe déjà en cache
    - Si trouvé (found: true) → saute les étapes 2 à 6, va directement à 7
    - Si non trouvé → continue

  2. tool_reformulate   → reformule la question brute

  3. tool_search_rag    → récupère le contexte DWH pertinent

  4. tool_get_rbac      → récupère les contraintes de sécurité

  5. tool_generate_sql  → génère les requêtes SQL (1 ou plusieurs)

  6. tool_judge_sql     → valide les requêtes
    - Si isValid false → rappelle tool_generate_sql avec le feedback (max 3 fois)
    - Si isValid true  → continue

  7. tool_cache_set     → stocke le SQL validé en cache

  8. tool_execute_query → exécute chaque requête SQL

  9. Selon les résultats :
    - Si visualisation graphique → tool_generate_chart pour chaque requête
    - Si rapport textuel         → tool_write_report avec toutes les données

  10. Synthétise le tout et retourne la réponse finale structurée.

  RÈGLES ABSOLUES :
  - Devise = FCFA uniquement
  - Ne jamais forcer ABS() sur les montants, garder les valeurs signées
  - Si REJECTED_BY_SECURITY dans le SQL → arrête et explique le refus
  - Maximum 3 tentatives de correction SQL avant d'abandonner
  `;

  const messages: any[] = [
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(`
      Question : "${userQuestion}"
      Rôle utilisateur : ${userRole}
      Contexte : ${JSON.stringify(userContextInfo)}
      Langue préférée : ${userLanguage}
    `),
  ];

  let iterations  = 0;
  const MAX_ITER  = 20;
  let finalAnswer = "";

  while (iterations < MAX_ITER) {
    iterations++;
    console.log(`[Agent Autonome] 🔄 Itération ${iterations}/${MAX_ITER}`);

    let response;
    
    // ─── PROTECTION DE L'APPEL LLM ──────────────────────────────────────────
    try {
      response = await orchestratorModel.invoke(messages);
    } catch (llmError: any) {
      console.error(`\n[Agent Autonome] 🚨 CRASH DE L'ORCHESTRATEUR à l'itération ${iterations}:`, llmError.message);
      
      // On coupe court immédiatement et on renvoie un message propre au frontend
      return { 
        finalAnswer: `Désolé, une erreur technique interne est survenue lors de la communication avec l'IA (${llmError.message}).`, 
        messageHistory: messages,
        error: true 
      };
    }

    // Si l'appel a réussi, on stocke la réponse de l'assistant
    messages.push(response);

    const toolCalls = response.tool_calls ?? [];

    // Si plus d'outils à appeler, c'est que l'agent a terminé sa synthèse
    // Si plus d'outils à appeler, c'est que l'agent a terminé sa synthèse
    if (toolCalls.length === 0) {
      console.log("[Agent Autonome] 🧠 Fin du cycle d'outils. Normalisation de la réponse en JSON strict...");

      // ─── EXTRACTION DE SÉCURITÉ DU GRAPHIQUE DEPUIS L'HISTORIQUE ───
      let backupChartConfig: Record<string, any> = {};
      try {
        // On cherche le dernier ToolMessage qui provient de tool_generate_chart
        const lastChartMessage = [...messages]
          .reverse()
          .find(msg => msg.constructor.name === "ToolMessage" && msg.name === "tool_generate_chart");

        if (lastChartMessage && lastChartMessage.content) {
          console.log("[Agent Autonome] 🛡️ Sauvegarde de sécurité de l'ECharts trouvé dans l'historique.");
          backupChartConfig = JSON.parse(lastChartMessage.content.trim());
        }
      } catch (e) {
        console.log("[Agent Autonome] ⚠️ Impossible de parser l'ECharts de l'historique pour le backup.");
      }
      // ──────────────────────────────────────────────────────────────

      try {
        // On instancie un modèle dédié à la structuration
        const structuringModel = new ChatGoogleGenerativeAI({
          modelName: "gemini-3.1-flash-lite",
          temperature: 0.0,
          apiKey: process.env.GEMINI_API_KEY,
        }).withStructuredOutput(FinalResponseSchema);

        // On lui demande de compiler l'historique selon le schéma Zod
        const structuredOutput = await structuringModel.invoke([
          ...messages,
          new HumanMessage(`Formate maintenant l'ensemble des analyses et graphiques ci-dessus selon le schéma JSON strict requis. Recopie fidèlement la configuration ECharts générée précédemment dans le champ 'visualisation'.Rassure toi que les champs 'analyse' et 'notes' sont écrites dans la langue requises par l'utilisateur: ${userLanguage}".`)
        ]);

        // 🔥 LE FILET DE SÉCURITÉ : Si le modèle a vidé le graphique, on le ré-injecte de force
        if (Object.keys(backupChartConfig).length > 0 && (!structuredOutput.visualisation || Object.keys(structuredOutput.visualisation).length === 0)) {
          console.log("[Agent Autonome] 🩹 Filet de sécurité activé : Ré-injection forcée de la configuration ECharts.");
          structuredOutput.visualisation = backupChartConfig;
        }

        console.log("[Agent Autonome] ✅ Réponse normalisée avec succès.");
        
        return {
          success: true,
          error: null,
          data: structuredOutput 
        };

      } catch (structError: any) {
        console.error("[Agent Autonome] 🚨 Erreur de structuration finale:", structError.message);
        return {
          success: false,
          error: `Échec de la normalisation du JSON: ${structError.message}`,
          data: {
            analyse: "Erreur lors de la compilation finale.",
            visualisation: backupChartConfig, // Au moins on sauve le graphique pour l'UI !
            notes: structError.message
          }
        };
      }
    }

    // Exécution des outils demandés par l'agent
    for (const toolCall of toolCalls) {
      console.log(`[Agent Autonome] 🔧 Outil : ${toolCall.name}`);

      const toolFn = TOOLS_MAP[toolCall.name];
      let result;
      
      try {
        result = toolFn
          ? await toolFn(toolCall.args)
          : `Outil inconnu : ${toolCall.name}`;
      } catch (toolExecError: any) {
        result = `Erreur lors de l'exécution de l'outil ${toolCall.name}: ${toolExecError.message}`;
      }

      if (!result) {
        result = "Opération effectuée avec succès.";
      }

      // 🛠️ BLINDAGE SPÉCIFIQUE POUR GEMINI
      let cleanContent = "";
      
      if (toolCall.name === "tool_cache_get" && typeof result === "string") {
        // Si c'est le cache et que c'est une chaîne JSON, on essaie de la rendre purement textuelle
        try {
          const parsedCache = JSON.parse(result);
          if (parsedCache.found) {
            cleanContent = `RESULTAT DU CACHE : Une correspondance exacte a été trouvée. Le SQL validé à utiliser est: "${parsedCache.sql}" et le type de visualisation requis est: "${parsedCache.visualisation}". Tu peux directement passer à la synthèse finale.`;
          } else {
            cleanContent = "RESULTAT DU CACHE : Aucune correspondance trouvée dans le cache Redis. Tu dois continuer le workflow normal (reformuler, chercher le RAG, etc.).";
          }
        } catch (e) {
          cleanContent = result;
        }
      } else {
        // Pour les autres outils, comportement standard
        cleanContent = typeof result === "string" ? result.trim() : JSON.stringify(result);
      }

      messages.push(
        new ToolMessage({
          content: cleanContent, // 👈 Contenu textuel limpide, sans JSON brut agressif
          tool_call_id: toolCall.id ?? "",
          name: toolCall.name,
        })
      );
    }
  }

  // Si on a atteint la limite des 20 itérations sans break
  if (!finalAnswer) {
    finalAnswer = "Désolé, la limite maximale de réflexion de l'agent a été atteinte sans pouvoir formuler de réponse.";
    console.log("[Agent Autonome] 🚨 Limite MAX_ITER atteinte.");
  }

  return { finalAnswer, messageHistory: messages, error: false };
}