import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateAnnotation } from "./state.js";

const model = new ChatGoogleGenerativeAI({
  modelName: "gemini-3.1-flash-lite",
  temperature: 0.0, // Rigueur absolue
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
});

/**
 * AGENT 3 : LLM as a Judge (Contrôleur Qualité SQL)
 * Ce nœud valide la requête SQL générée par rapport au contexte réel du DWH.
 */

export async function agentJudge(state: typeof StateAnnotation.State) {
  console.log("\n[Node : Agent Judge] --- Début de la vérification de la requête SQL ---");

  if (!state.generatedSQL || state.generatedSQL === "REJECTED_BY_SECURITY" || state.sqlQueries?.length === 0) {
    console.log("[Node : Agent Judge] 🛑 Aucune requête SQL valide à évaluer.");
    return {
      judgeEvaluation: { 
        isValid: false, 
        feedback: "Requête absente ou rejetée par la sécurité.",
        feedbackViz: "Non applicable."
      }
    };
  }

  const queriesToValidate = state.sqlQueries?.length > 0
  ? state.sqlQueries
  : [{ id: "query_1", sql: state.generatedSQL, visualisation: state.suggestedVisualization }];

    const prompt = `
    Tu es l'Agent Judge (Contrôleur Qualité) du système décisionnel.
    Tu dois effectuer DEUX validations simultanées :

    == VALIDATION 1 : SQL ==
    Vérifie que chaque table et colonne pour chaque requetes SQL existe mot pour mot dans le contexte DWH.
      Pour cela, Tu dois valider ${queriesToValidate.length} requête(s) SQL.
      ${queriesToValidate.map((q, i) => `
      === REQUÊTE ${i + 1} : ${ q?.id} ===
      SQL : ${q.sql}
      `).join("\n")}

      Réponds en JSON strict :
      {
        "isValid": true,
        "feedback": "Toutes les tables et colonnes sont présentes dans le contexte.",
        "feedbackViz": "La visualisation timeseries est cohérente : colonne date_val + 2 mesures numériques présentes.",
        "queriesValidation": [
          { "id": "query_1", "isValid": true, "feedback": "OK" },
          { "id": "query_2", "isValid": false, "feedback": "Colonne X inexistante" }
        ]
      }
      isValid global = true SEULEMENT si toutes les requêtes sont valides.

    == VALIDATION 2 : COHÉRENCE VISUALISATION ==
    Vérifie que le type de visualisation " ${queriesToValidate.map((q, i) => `
      === REQUÊTE ${i + 1} : ${ q?.id} ===
      SQL : ${q.sql},
      VISUALISATION : ${q.visualisation}
      `).join("\n")}" est cohérent avec la requête SQL.
    Règles de cohérence :
    - "echarts_timeseries_line" → le SELECT doit contenir une colonne de date/temps + au moins une mesure numérique
    - "echarts_bar" / "echarts_bar_horizontal" → doit avoir une dimension catégorielle + une mesure
    - "echarts_pie" → doit avoir exactement une dimension + une mesure (SUM/COUNT)
    - "text_report" → toujours valide

    CONTEXTE DWH :
    ======================================================================
    ${state.ragContext}
    ======================================================================
  `;

  try {
    const response = await model.invoke([
      { role: "system", content: "Tu es un expert en audit de schémas SQL. Tu réponds exclusivement en JSON strict." },
      { role: "user", content: prompt }
    ]);
    
    // Nettoyage de la réponse au cas où le modèle met du markdown
    let cleanContent = (response.content as string).trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.replace(/```json|```/g, "").trim();
    }

    const evaluation = JSON.parse(cleanContent);
    console.log(`[Node : Agent Judge] Verdict -> Valide : ${evaluation.isValid}`);
    console.log(`[Node : Agent Judge] Feedback : "${evaluation.feedback}"`);
    console.log(`[AgentJudge] feedbackViz: ${evaluation.feedbackViz}`);

    return {
      judgeEvaluation: evaluation
    };

  } catch (error) {
    console.error("[Node : Agent Judge] ❌ Erreur lors de l'évaluation :", error);
    // En cas d'erreur technique, on invalide par sécurité
    return {
      judgeEvaluation: { 
        isValid: false, 
        feedback: "Erreur technique lors de l'évaluation automatique.",
        feedbackViz: "Non évalué."
      }
    };
  }
}