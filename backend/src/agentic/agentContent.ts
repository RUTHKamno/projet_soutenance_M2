// agentContent.ts — Version ultra-sécurisée par découplage
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { StateAnnotation } from "./state.js";

const FinalResponseSchema = z.object({
  analyse: z
    .string()
    .describe(
      "L'analyse métier détaillée en français (tendances, pics, anomalies).",
    ),
  visualisation: z
    .record(z.unknown())
    .describe("L'objet de configuration ECharts complet fourni."),
  notes: z
    .string()
    .describe(
      "Recommandations, alertes sur la qualité des données ou conseils d'interprétation.",
    ),
});

// Modèle standard pour la génération brute
const baseModel = new ChatGoogleGenerativeAI({
  modelName: "gemini-3.1-flash-lite",
  temperature: 0.2,
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
});

// Modèle structuré strict pour l'assemblage final
const structuringModel = baseModel.withStructuredOutput(FinalResponseSchema);

export async function agentContent(state: typeof StateAnnotation.State) {
  console.log("\n[AgentContent] --- Normalisation du contenu final ---");

  if (state.queryError) {
    return {
      finalResponse: {
        analyse:
          "Impossible de générer l'analyse en raison d'une erreur technique survenue lors de l'extraction des données.",
        visualisation: {},
        notes: `Détail de l'erreur : ${state.queryError}`,
      },
    };
  }

  const resultsMap =
    (state.queryResults as unknown as Record<string, Record<string, any>[]>) ||
    {};
  const queries = state.sqlQueries ?? [];
  const isMulti = state.isMultiQuery ?? false;

  const firstQueryId = queries[0]?.id || "query_1";
  const firstResults: Record<string, any>[] = Array.isArray(state.queryResults)
    ? state.queryResults
    : resultsMap[firstQueryId] || [];

  // Récupération des informations du profil (RBAC) transmis via le state
  const userRole = (state as any).userRole || "directeur_agence"; // e.g. "direction_generale" ou "directeur_agence"
  const userAgence = (state as any).userContextInfo;
  const userName = (state as any).userName || "Décideur";

  let finalEchartsConfig: Record<string, any> = {};

  // ─── ÉTAPE 1 : GÉNÉRATION DU GRAPHIQUE EN ISOLEMENT (SI REQUIS) ───────────
  if (
    !(isMulti && queries.length > 1) &&
    state.suggestedVisualization !== "text_report" &&
    firstResults.length > 0
  ) {
    console.log(
      `[AgentContent] 📊 Étape 1 : Génération isolée du graphique ECharts...`,
    );

    const chartPrompt = `
      Tu es un expert ECharts. Génère UNIQUEEMNT un objet JSON de configuration ECharts valide pour la question suivante.
      QUESTION : "${state.userQuestion}"
      TYPE REQUIS : ${state.suggestedVisualization}
      DONNÉES : ${JSON.stringify(firstResults.slice(0, 50))}

      CONSIGNES :
      - Utilise un "dataset" pour les données.
      - Associe l'axe X à la colonne temporelle.
      - Crée les séries adaptées aux montants/volumes.
      - N'INCLUS AUCUNE FONCTION JAVASCRIPT (pas de "function(value)..."). Utilise uniquement des chaînes de caractères pour les formateurs si nécessaire.
      - Réponds uniquement par le JSON brut, sans balises \`\`\`json.
    `;

    try {
      const chartResponse = await baseModel.invoke([
        new HumanMessage(chartPrompt),
      ]);
      let cleanChart = (chartResponse.content as string).trim();
      // Nettoyage au cas où le modèle aurait mis des backticks malgré la consigne
      cleanChart = cleanChart.replace(/```json|```/g, "").trim();
      finalEchartsConfig = JSON.parse(cleanChart);
      console.log(
        "[AgentContent] 📊 Étape 1 : OK (Graphique généré avec succès)",
      );
    } catch (err: any) {
      console.error(
        "[AgentContent] ⚠️ Échec de la pré-génération du graphique, fallback sur {} :",
        err.message,
      );
      finalEchartsConfig = {};
    }
  }

  // ─── ÉTAPE 2 : ASSEMBLAGE ET RÉDACTION DE L'ANALYSE ────────────────────────
  console.log(
    "[AgentContent] 📝 Étape 2 : Rédaction du rapport et empaquetage structuré...",
  );

  let systemPrompt = `Tu es un **Expert Senior en Business Intelligence et Analyse Financière pour les Institutions de Microfinance (IMF)** (Ex: Be I.T Africa / CEPI SA).

  ### TON PROFIL ET TON OBJECTIF :
  Tu rédiges des synthèses exécutive et stratégiques pour la prise de décision.
  Tu t'adresses actuellement à un utilisateur occupant le rôle : **${userRole.toUpperCase()}** ${userRole === "directeur_agence" ? `(Agence : ${userAgence})` : "(Vue Réseau Consolidée)"}.
  
  ---
  
  ### RÈGLES MÉTIERS ET D'INTERPRÉTATION IMPÉRATIVES (CONTEXTE MICROFINANCE) :
  
  1. **RÈGLE DU SIGNE DES ENCOURS ET IMPAYÉS :**
     - Dans le Core Banking System / base de données, les **encours de crédit**, les **créances contentieuses** et les **impayés** sont stockés en **VALEURS NÉGATIVES** (ex: -6 532 171 223 FCFA = un encours total réel de 6,53 milliards de FCFA).
     - **ATTENTION :** NE CONSIDÈRE JAMAIS CES VALEURS NÉGATIVES COMME DES ERREURS DE SAISIE, DES ANOMALIES DE CALCUL OU DES ERREURS DE LOGIQUE.
     - Traduis-les immédiatement en langage métier en montant absolu positif (ex: *"Le montant total des encours de crédit s'élève à 6,53 milliards de FCFA"*), tout en rappelant avec subtilité si nécessaire qu'il s'agit du solde débiteur comptable.
  
  2. **DATES TIMESTAMP / UNIX :**
     - Convertis systématiquement les timestamps millisecondes (ex: 1777593600000 -> 01/05/2026 ou 30/04/2026) en dates lisibles (JJ/MM/AAAA) dans tes analyses.
  
  3. **ADAPTATION SELON LE RÔLE DE L'UTILISATEUR :**
     - **Si \`userRole\` == 'direction_generale' :**
       - AAdopt un ton exécutif, synthétique et stratégique.
       - Porte ton analyse sur le **risque systémique**, l'**équilibre global du portefeuille du réseau**, la distribution inter-agences, la liquidité et la gouvernance.
       - Propose des directives stratégiques pour le Comité de Direction.
     - **Si \`userRole\` == 'directeur_agence' :**
       - Adopte un ton opérationnel et orienté gestion du risque terrain.
       - Porte ton analyse sur la **performance de l'agence (${userAgence})**, la qualité du portefeuille (PAR / Impayés), le suivi des chargés de clientèle/gestionnaires, et le recouvrement.
       - Propose des actions concrètes immédiates (revue des dossiers à risque, relances, KYC).
  
  4. **DEVISE :**
     - Formate tous les montants financiers en **FCFA** (Franc CFA) avec des séparateurs de milliers clairs (ex: 2 532 947 511 FCFA).
  
  ---
  
  ### STRUCTURE DU RAPPORT attendue dans le champ 'analyse' :
  - **Synthèse Exécutive :** Un chiffre clé récapitulatif marquant.
  - **Analyse Détaillée :** Explication claire des volumes, tendances, portefeuilles ou clients observés.
  - **Constats Risques / Performance :** Points d'attention clés.
  
  ### STRUCTURE DU CHAMP 'notes' :
  - Fournis 2 à 3 recommandations concrètes et orientées action (Recommandations stratégiques pour la DG, ou plan d'action opérationnel pour le Directeur d'Agence).
  `;

  let userPrompt = "";

  if (isMulti && queries.length > 1) {
    userPrompt = `
      QUESTION : "${state.userQuestion}"
      DONNÉES : ${JSON.stringify(queries.map((q) => ({ label: q.label, data: (resultsMap[q.id] || []).slice(0, 20) })))}
      Rédige une grande analyse unifiée pour le champ 'analyse' et tes notes dans 'notes'. Le champ 'visualisation' doit être vide {}.
    `;
  } else if (state.suggestedVisualization === "text_report") {
    userPrompt = `
      QUESTION : "${state.userQuestion}"
      DONNÉES : ${JSON.stringify(firstResults.slice(0, 30))}
      Rédige l'analyse textuelle dans 'analyse' et tes conseils dans 'notes'. Le champ 'visualisation' doit être vide {}.
    `;
  } else {
    userPrompt = `
      QUESTION : "${state.userQuestion}"
      DONNÉES EXTRACTES : ${JSON.stringify(firstResults.slice(0, 30))}
      
      Voici la configuration ECharts déjà générée pour ces données :
      ${JSON.stringify(finalEchartsConfig)}

      CONSIGNES :
      1. Rédige une analyse métier approfondie des tendances dans le champ 'analyse'.
      2. Recopie EXACTEMENT l'objet ECharts fourni ci-dessus dans le champ 'visualisation'. Ne le modifie pas, ne le vide pas.
      3. Ajoute tes conseils de gestion des risques dans le champ 'notes'.
    `;
  }

  try {
    const structuredOutput = await structuringModel.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    // Force la ré-injection de sécurité si le modèle final a quand même vidé la clé
    if (
      Object.keys(finalEchartsConfig).length > 0 &&
      Object.keys(structuredOutput.visualisation).length === 0
    ) {
      structuredOutput.visualisation = finalEchartsConfig;
    }

    console.log("[AgentContent] ✅ Pipeline terminé et sécurisé.");
    return { finalResponse: structuredOutput };
  } catch (error: any) {
    console.error("[AgentContent] 🚨 Erreur finale :", error.message);
    return {
      finalResponse: {
        analyse: "Erreur lors de la compilation finale.",
        visualisation: finalEchartsConfig, // Au moins on sauve le graphique
        notes: error.message,
      },
    };
  }
}
