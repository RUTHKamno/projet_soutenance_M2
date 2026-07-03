import { Request, Response } from "express";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";
import { compiledGraph } from "../agentic/agentic_/agent_graph.js";
import { extractAuditMetrics } from "../services/langsmithAudit.js";
import { extractAgentOutput } from "../services/agentServices.js";
import {
  getThreadContext,
  saveMessage,
} from "../services/chatHistoryService.js";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { SupersetService } from "../services/supersetService.js";

// ── Requête 1 : lancer l'agent ─────────────────────────────────────────────
export const handleAgentAsk = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const { question, language = "fr" } = req.body;
  // Les infos sensibles viennent UNIQUEMENT du token décodé, jamais du body
  const userId = req.user!.userId;
  const role = req.user!.role;
  const contextInfo = req.user!.contextInfo;
  const agence = contextInfo?.agence_utilisateur ?? null;

  if (!question || !role || !contextInfo) {
    res.status(400).json({ success: false, error: "Paramètres manquants." });
    return;
  }

  const thread_id = uuidv4();
  const config = { configurable: { thread_id } };
  console.log(
    `\n[API /ask] 📥 Question : "${question}" | thread_id : ${thread_id}`,
  );

  const SYSTEM_PROMPT = `...`; // inchangé

  try {
    await saveMessage({
      threadId: thread_id,
      userId,
      userRole: role,
      role: "user",
      content: question,
      agence,
      language,
    });
    // ── Récupérer le contexte des échanges précédents de ce thread ────────
    // (utile si l'utilisateur relance sur le même thread_id,
    //  dans ton cas chaque /ask génère un nouveau thread_id
    //  donc ce sera vide au premier appel — préparé pour la suite)
    const threadContext = await getThreadContext(thread_id, 6);
    const contextMessages = threadContext.map((msg) =>
      msg.role === "user"
        ? new HumanMessage(`[Échange précédent] ${msg.content}`)
        : new AIMessage(`[Réponse précédente] ${msg.content}`),
    );

    await compiledGraph.invoke(
      {
        messages: [
          ...contextMessages, // historique des échanges précédents en premier
          new HumanMessage(question), // la vraie question de l'utilisateur en dernier
        ],
        userQuestion: question,
        userRole: role,
        userLanguage: language,
        userContextInfo: contextInfo,
        correctionAttempts: 0,
        lastSqlJson: "",
        judgeVerdict: null,
        ragContext: "",
        reformulatedQuestion: "",
      },
      config,
    );
    // ── En 0.2.74, invoke() ne retourne PAS __interrupt__ dans son résultat.
    // Le payload de l'interrupt est dans l'état checkpointé → on lit via getState().
    const snapshot = await compiledGraph.getState(config);

    // snapshot.next contient les nœuds en attente.
    // Si le graphe est suspendu sur un interrupt, next = ['reformulate'] (non vide).
    // Si le graphe a terminé normalement, next = [].
    const isInterrupted = snapshot.next.length > 0;

    if (isInterrupted) {
      // Récupérer tous les interrupts resumables dans les tasks checkpointées
      const pendingInterrupts = snapshot.tasks
        .flatMap((t: any) => t.interrupts ?? [])
        .filter((i: any) => i.resumable === true);

      const payload = pendingInterrupts[0]?.value;
      console.log("[API /ask] ⏸️ Graphe suspendu. Payload :", payload);

      res.status(200).json({
        status: "awaiting_validation",
        thread_id,
        reformulatedQuestion: payload?.reformulatedQuestion,
        message: payload?.message,
      });
      return;
    }

    console.log("[API /ask] ✅ Graphe terminé directement");
    res.status(200).json({ status: "completed", thread_id });
  } catch (err: any) {
    console.error("[API /ask] 🚨 Erreur inattendue :", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Requête 2 : reprendre après validation humaine ─────────────────────────
export const handleAgentResume = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  process.env.LANGCHAIN_RUN_NAME = "agent_graphe";
  const { thread_id, approved, correctedQuestion } = req.body;

  // Infos utilisateur depuis le token
  const userId = req.user!.userId;
  const role = req.user!.role;
  const agence = req.user!.contextInfo?.agence_utilisateur ?? null;
  const language = req.body.language ?? "fr";

  if (!thread_id || approved === undefined) {
    res.status(400).json({
      success: false,
      error:
        "Paramètres manquants : 'thread_id' et 'approved' sont obligatoires.",
    });
    return;
  }

  console.log(
    `\n[API /resume] 🔄 thread_id : ${thread_id} | approved : ${approved}`,
  );

  const config = { configurable: { thread_id } };

  try {
    // ── On vérifie d'abord que le thread existe et est bien en attente ──────
    const snapshot = await compiledGraph.getState(config);

    if (!snapshot || snapshot.next.length === 0) {
      res.status(400).json({
        success: false,
        error:
          "Ce thread_id n'est pas en attente de validation ou n'existe pas.",
      });
      return;
    }

    console.log("[API /resume] 📦 État retrouvé, reprise du graphe...");

    // ── Command({ resume: ... }) reprend le graphe depuis le checkpoint ─────
    // Le deuxième argument config avec le même thread_id dit à LangGraph
    // quel état checkpointé charger
    // La valeur de resume devient le retour de interrupt() dans reformulateNode
    const startTime = Date.now();

    const result = await compiledGraph.invoke(
      new Command({
        resume: {
          approved,
          correctedQuestion: correctedQuestion ?? "",
        },
      }),
      config, // ← même thread_id que /ask
    );

    console.log("[DEBUG] result.validatedSqlQuery =", result.validatedSqlQuery);
    console.log("[DEBUG] result.lastSqlJson =", result.lastSqlJson);
    // console.log("[DEBUG] output.chartConfig =", output.chartConfig);
    console.log("[DEBUG] result.isBlocked =", result.isBlocked);

    console.log("[API /resume] ✅ Graphe terminé");

    // Vérifie si le graphe s'est encore suspendu (cas improbable ici mais sécurité)
    const finalSnapshot = await compiledGraph.getState(config);
    if (finalSnapshot.next.length > 0) {
      res.status(200).json({
        success: false,
        error: "Le graphe s'est suspendu à nouveau de façon inattendue.",
      });
      return;
    }
    const executionTimeMs = Date.now() - startTime;

    // console.log(
    //   `[API /resume] ⏱️ Temps d'exécution : ${executionTimeMs} ms resultat :`,
    //   result,
    // );

    const output = extractAgentOutput(result);

    // if (!result.isBlocked && output.chartConfig && result.lastSqlJson) {
    //   try {
    //     // Récupération de l'ID du Dashboard Superset par défaut depuis les variables d'environnement
    //     const defaultDashboardId = parseInt(
    //       process.env.SUPERSET_DEFAULT_DASHBOARD_ID || "1",
    //       10,
    //     );

    //     console.log(
    //       `[Superset Auto-Inject] 📌 Graphique détecté. Injection automatique dans le Dashboard Superset ID: ${defaultDashboardId}...`,
    //     );

    //     await SupersetService.addChartToDashboard({
    //       dashboardId: defaultDashboardId,
    //       chartTitle:
    //         output.chartConfig.title?.text ||
    //         "Graphique généré par l'Agent Assistant",
    //       sqlQuery: result.validatedSqlQuery || result.lastSqlJson,
    //       chartType: "dist_bar", // Ajustable en fonction du type détecté dans output.chartConfig.series[0].type
    //     });

    //     console.log(
    //       "[Superset Auto-Inject] 🎉 Graphique injecté avec succès et synchronisé !",
    //     );
    //   } catch (supersetError: any) {
    //     // On log l'erreur mais on ne bloque pas la réponse de l'agent pour l'utilisateur
    //     console.error(
    //       "[Superset Auto-Inject] ❌ Échec de l'écriture dans Superset :",
    //       supersetError.message,
    //     );
    //   }
    // }

    if (
      result.isBlocked === true &&
      (!output.summary || output.summary.trim() === "")
    ) {
      output.summary =
        "Désolé, cette demande a été rejetée par le système d'audit car elle est hors-sujet et n'interroge pas le Data Warehouse.";
    }

    // ── Sauvegarder la réponse finale de l'agent ──────────────────────────
    if (output.summary && output.summary.trim() !== "") {
      await saveMessage({
        threadId: thread_id,
        userId,
        userRole: role,
        role: "assistant",
        content: output.summary,
        agence,
        language,
        correctionAttempts: result.correctionAttempts ?? 0,
        report: output.report,
        chartConfig: output.chartConfig,
      });
    }

    const audit = extractAuditMetrics(result);

    res.status(200).json({
      status: result.isBlocked ? "blocked" : "completed",
      ...output, // le frontend reçoit des champs plats et directs
      audit: {
        ...audit,
        executionTimeMs,
        executionTimeSec: (executionTimeMs / 1000).toFixed(2),
        timestamp: new Date().toISOString(),
        threadId: thread_id,
      },
    });
  } catch (err: any) {
    console.error("[API /resume] 🚨 Erreur :", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
