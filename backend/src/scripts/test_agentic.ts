import 'dotenv/config';
import { multiAgentSystem } from "../agentic/graph.js";
import { closeCache } from '../cache/sqlCache.js';

async function runFullSecuredTest() {
  process.env.LANGCHAIN_RUN_NAME = "custom_worflow_agent_test_1";
  console.log("==========================================================");
  console.log("🛡️ RUN : TEST MULTI-AGENTS SÉCURISÉ (RAG + RBAC)");
  console.log("==========================================================\n");

  // Données initiales injectées par ton API d'authentification
  const utilisateurConnecte = {
    userQuestion: "Comment évoluent les déblocages de prêts par rapport aux signatures de contrats au quotidien ?",
    userRole: "directeur_agence",
    userContextInfo: { agence_utilisateur: "20000" }
  };

  console.log(`[Authentification UI] Rôle détecté : ${utilisateurConnecte.userRole}`);
  console.log(`[Authentification UI] Contexte : Affecté à l'agence de ${utilisateurConnecte.userContextInfo.agence_utilisateur}`);
  console.log(`[Input UI] Question brute : "${utilisateurConnecte.userQuestion}"\n`);

  try {
    // --- CYCLE 1 : DEMANDE DE REFORMULATION ---
    console.log("--- [CYCLE 1] : Appel Initial ---");
    const premierResultat = await multiAgentSystem.invoke({
      userQuestion: utilisateurConnecte.userQuestion,
      userRole: utilisateurConnecte.userRole,
      userContextInfo: utilisateurConnecte.userContextInfo
    });

    console.log(`\n[UI Next.js] Affichage de la proposition : "${premierResultat.reformulatedQuestion}"`);
    console.log("[UI Next.js] 🖱️ L'utilisateur clique sur le bouton [OUI]");

    // --- CYCLE 2 : REPRISE DU GRAPHE APPRÈS VALIDATION ---
    console.log("\n--- [CYCLE 2] : Relance après validation humaine ---");
    const resultatFinal = await multiAgentSystem.invoke({
      userQuestion: premierResultat.userQuestion,
      reformulatedQuestion: premierResultat.reformulatedQuestion,
      isClarifiedByHuman: true, // L'utilisateur a dit OUI
      userRole: premierResultat.userRole,
      userContextInfo: premierResultat.userContextInfo
    },
  );

    console.log("\n==========================================================");
    console.log("📊 RÉSULTAT FINAL DU PIPELINE NORMALISÉ");
    console.log("==========================================================");
    
    // 1. Logs techniques intermédiaires toujours utiles pour débugger
    console.log(`🔹 SQL Généré         :\n${resultatFinal.generatedSQL}`);
    console.log(`🔹 Visualisation      : ${resultatFinal.suggestedVisualization}`);

    console.log("\n----------------------------------------------------------");
    console.log("📦 CONTENU DE LA RÉPONSE NORMALISÉE (CONTRAT FRONTEND)");
    console.log("----------------------------------------------------------");

    // 2. Gestion des cas d'erreurs ou blocages de sécurité réels
    if (resultatFinal.generatedSQL === "REJECTED_BY_SECURITY") {
      console.log("🚫 Requête bloquée par l'agent RBAC (Sécurité).");
    } else if (resultatFinal.queryError) {
      console.log(`❌ Erreur BDD détectée : ${resultatFinal.queryError}`);
    } 

    // 3. Affichage du contrat unique JSON généré par ton nouvel agentContent
    if (resultatFinal.finalResponse) {
      const { analyse, visualisation, notes } = resultatFinal.finalResponse;

      console.log(`\n📚 [ANALYSE MÉTIER] :\n${analyse}`);
      
      console.log(`\n📊 [CONFIG ECHARTS] :\n${JSON.stringify(visualisation, null, 2)}`);
      
      console.log(`\n📝 [NOTES & PERSPECTIVES] :\n${notes}`);
    } else {
      console.log("⚠️ Pipeline incomplet — La clé finalResponse est absente du State.");
    }

    console.log("==========================================================\n");

  } catch (error) {
    console.error("❌ Échec lors du test d'intégration :", error);
  } finally {
    await closeCache();   // ← ferme Redis proprement
    process.exit(0);      // ← force la sortie
  }
}

runFullSecuredTest();