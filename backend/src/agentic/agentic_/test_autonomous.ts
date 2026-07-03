import "dotenv/config";
import { runAutonomousAgent } from "./autonomousAgent.js";

async function run() {
  process.env.LANGCHAIN_RUN_NAME = "autonomous_agent_test_1";
  const result = await runAutonomousAgent(
    // "Génère la tendance chronologique de l'activité MEP vs Décaissements.",
    // "Comment évoluent les déblocages de prêts par rapport aux signatures de contrats au quotidien ?",
    "Quels sont les clients ayant effectué des décaissements mais dont le dossier indique un défaut de signature ?",
    "directeur_agence",
    { agence_utilisateur: "20000" },
    "fr"
    );

  console.log("\n=== RÉPONSE FINALE ===");
  if (result.success && result.data) {
    const { analyse, visualisation, notes } = result.data;

    console.log("📚 [ANALYSE CONTROLE & CONFORMITÉ] :");
    console.log(analyse);

    console.log("\n📊 [CONFIGURATION GRAPHIQUE ECHARTS] :");
    console.log(JSON.stringify(visualisation, null, 2));

    console.log("\n📝 [NOTES ET PERSPECTIVES ACTIONNABLES] :");
    console.log(notes);

  } else {
    console.log("❌ Le pipeline a échoué lors de l'exécution ou de la structuration.");
    console.log(`Détail de l'erreur : ${result.error}`);
  }
  process.exit(0);
}

run().catch(console.error);