import "dotenv/config";
import { Client } from "langsmith";
import { multiAgentSystem } from "../agentic/graph.js";
import { closeCache } from '../cache/sqlCache.js';
import { runAutonomousAgent } from "../agentic/agentic_/autonomousAgent.js";

const langsmithClient = new Client();

const TEST_QUESTIONS = [
  "Rapport analytique des tirages sur crédit segmenté par âge client.",
  "Quels sont les clients ayant effectué des décaissements mais dont le dossier indique un défaut de signature ?",
];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("==================================================================");
  console.log("🏁 DÉMARRAGE DU BENCHMARK COMPARATIF (LANGSMITH INTEGRATION)");
  console.log("==================================================================\n");

  const role    = "directeur_agence";
  const context = { agence_utilisateur: "20000" };

  // ──────────────────────────────────────────────────────────────────
  // 🏢 PARTIE 1 : BENCHMARK DU CUSTOM WORKFLOW
  // ──────────────────────────────────────────────────────────────────
  console.log("🚀 [1/2] Lancement du benchmark : Custom Workflow (LangGraph)...");
  process.env.LANGCHAIN_PROJECT = "dwh_custom_workflow_prod";

  for (const question of TEST_QUESTIONS) {
    console.log(`\n   👉 Question : "${question}"`);
    try {
      // CYCLE 1 : Reformulation + pause
      const cycle1Result = await multiAgentSystem.invoke({
        userQuestion:    question,
        userRole:        role,
        userContextInfo: context,
      });

      console.log(`   ✅ Cycle 1 OK — reformulation : "${cycle1Result.reformulatedQuestion}"`);

      // ─── CORRECTION PRINCIPALE ────────────────────────────────────
      // On reprend TOUT le state du cycle 1, on ajoute juste isClarifiedByHuman: true
      // Sans ça, ragContext, rbacConstraints etc. sont perdus → LangGraph repart de zéro
      const cycle2Result = await multiAgentSystem.invoke({
        ...cycle1Result,                  // ← tout le state du cycle 1
        isClarifiedByHuman: true,         // ← seul ajout
      });

      console.log(`   ✅ Cycle 2 OK — statut : ${cycle2Result.finalResponse ? "réponse générée" : "pas de réponse"}`);

    } catch (err: any) {
      console.error(`   ❌ Erreur LangGraph :`, err.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 🤖 PARTIE 2 : BENCHMARK DE L'AGENT AUTONOME
  // ──────────────────────────────────────────────────────────────────
  console.log("\n🚀 [2/2] Lancement du benchmark : Agent Autonome (ReAct)...");
  process.env.LANGCHAIN_PROJECT = "dwh_autonomous_agent_prod";

  for (const question of TEST_QUESTIONS) {
    console.log(`\n   👉 Question : "${question}"`);
    try {
      const result = await runAutonomousAgent(question, role, context, "fr");
      console.log(`   ✅ Agent OK — itérations : ${result.messageHistory?.length ?? 0}`);
    } catch (err: any) {
      console.error(`   ❌ Erreur Agent Autonome :`, err.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 📊 PARTIE 3 : EXTRACTION DES MÉTRIQUES DEPUIS LANGSMITH
  // ──────────────────────────────────────────────────────────────────
  console.log("\n⏳ Synchronisation LangSmith (8s)...");
  await sleep(8000);  // augmenté à 8s pour laisser le temps à LangSmith de recevoir

  const finalReport = [];

  const engines = [
    { name: "Custom Workflow", project: "dwh_custom_workflow_prod" },
    { name: "Agent Autonome",  project: "dwh_autonomous_agent_prod" },
  ];

  for (const engine of engines) {
    let totalLatency     = 0;
    let cacheHitLatency  = 0;
    let totalTokens      = 0;
    let cacheHitTokens   = 0;
    let successCount     = 0;
    let cacheHitCount    = 0;
    let runCount         = 0;

    // ─── CORRECTION : bonne signature SDK TypeScript LangSmith ────────
    const runsIterator = langsmithClient.listRuns({
      projectName: engine.project,
      isRoot:      true,    // ← remplace executionOrder: 1 (inexistant en TS)
      limit:       20,
    });

    for await (const run of runsIterator) {
      runCount++;

      if (run.status === "success") successCount++;

      const latency = run.end_time && run.start_time
        ? (new Date(run.end_time).getTime() - new Date(run.start_time).getTime()) / 1000
        : 0;

      // ─── CORRECTION : bonne propriété tokens LangSmith SDK ────────
      const tokens =
        (run.prompt_tokens     ?? 0) +
        (run.completion_tokens ?? 0);

      // Seuil empirique : cache HIT < 1.5s
      const isCacheHit = latency > 0 && latency < 3.0;

      if (isCacheHit) {
        cacheHitCount   += 1;
        cacheHitLatency += latency;
        cacheHitTokens  += tokens;
      } else {
        totalLatency += latency;
        totalTokens  += tokens;
      }
    }

    const normalRunCount = runCount - cacheHitCount;
    const avgLatency     = normalRunCount > 0 ? totalLatency / normalRunCount : 0;
    const avgTokens      = normalRunCount > 0 ? totalTokens  / normalRunCount : 0;
    const avgCacheLatency = cacheHitCount > 0 ? cacheHitLatency / cacheHitCount : 0;
    const avgCacheTokens  = cacheHitCount > 0 ? cacheHitTokens  / cacheHitCount : 0;

    // Coût Gemini Flash-Lite : ~$0.15 / 1M tokens input
    const costPerRun = avgTokens > 0 ? (avgTokens * 0.00000015).toFixed(5) : "0.00000";

    finalReport.push({
      "Architecture Engine":       engine.name,
      "Latence Moyenne (Froid)":   normalRunCount > 0  ? `${avgLatency.toFixed(2)}s`        : "N/A",
      "Latence Cache HIT":         cacheHitCount  > 0  ? `${avgCacheLatency.toFixed(2)}s`   : "N/A",
      "Tokens Moyen / Run":        normalRunCount > 0  ? Math.round(avgTokens)               : 0,
      "Tokens Cache HIT":          cacheHitCount  > 0  ? Math.round(avgCacheTokens)          : 0,
      "Taux de Succès":            runCount       > 0  ? `${((successCount / runCount) * 100).toFixed(0)}%` : "0%",
      "Coût Estimé / Run *":       `${costPerRun}$`,
      "Déterminisme SQL":          engine.name === "Custom Workflow"
                                     ? "Élevé (Graph rigide)"
                                     : "Variable (ReAct Autonome)",
    });
  }

  console.log("\n================================================================================");
  console.log("📊 TABLEAU COMPARATIF EXTRAIT DE LANGSMITH");
  console.log("================================================================================");
  console.table(finalReport);
  console.log("* Estimation basée sur la tarification Gemini Flash-lite ($0.15/1M tokens).");
  console.log("================================================================================");

  await closeCache();
  process.exit(0);
}

main().catch(console.error);