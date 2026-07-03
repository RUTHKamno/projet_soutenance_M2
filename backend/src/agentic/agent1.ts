import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateAnnotation } from "./state.js";

// Initialisation de Gemini 2.5 Flash via LangChain
const model = new ChatGoogleGenerativeAI({
  modelName: "gemini-3.1-flash-lite",
  temperature: 0.2, // Température basse pour éviter que le LLM n'invente des choses
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

});

/**
 * AGENT 1 : Orchestrateur Sémantique & Reformulation
 * Ce nœud prend la question brute de l'utilisateur et propose une reformulation claire.
 */
export async function agentReformulation(state: typeof StateAnnotation.State) {
  // 🛡️ SÉCURITÉ REPRISE DE FLUX : Si l'utilisateur a déjà cliqué sur OUI, on passe directement à la suite
  if (state.isClarifiedByHuman === true) {
    console.log("\n[Node : Agent 1] ⏩ Question déjà clarifiée par l'utilisateur. Passage direct sans recalcul.");
    return state; // On renvoie l'état tel quel sans toucher à rien
  }

  console.log("\n[Node : Agent 1] --- Début de la reformulation sémantique ---");
  console.log(`[Node : Agent 1] Question brute reçue : "${state.userQuestion}"`);

  const prompt = `
    Tu es l'Agent 1 (Orchestrateur Sémantique) d'un système décisionnel d'entreprise de Business Intelligence.
    La question de l'utilisateur peut être vague, confuse, mal formulée ou utiliser des termes familiers.
    
    Ton rôle unique est de la transformer en une question simple, extrêmement claire, polie et professionnelle, parfaitement calibrée pour que d'autres agents puissent comprendre quelles tables ou indicateurs du Data Warehouse (DWH) sont visés.

    Question initiale de l'utilisateur : "${state.userQuestion}"

    CONSIGNE STRICTE : Rédige UNIQUEMENT une seule phrase interrogative destinée à être affichée directement à l'utilisateur pour validation.
    Exemple de ton attendu : "Voulez-vous obtenir le montant total des encours de crédit par agence pour l'année en cours ?"
  `;

  try {
    const response = await model.invoke(prompt);
    const reformulation = response.content as string;

    console.log(`[Node : Agent 1] Reformulation générée : "${reformulation.trim()}"`);

    // On ne retourne QUE les modifications
    return {
      reformulatedQuestion: reformulation.trim(),
      isClarifiedByHuman: false, // Initialisé à false au premier passage
    };
  } catch (error) {
    console.error("[Node : Agent 1] Erreur lors de l'appel à Gemini :", error);
    throw error;
  }
}