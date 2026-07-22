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
  getUserMedia,
  hideMessage,
  saveMessage,
} from "../services/chatHistoryService.js";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { SupersetService } from "../services/supersetService.js";
import { mapChartTypeToVizKind } from "../services/chartMapping.js";

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
    const startTime = Date.now();
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
    const result = snapshot.values;
    const output = extractAgentOutput(result);
    if (result.isChitchat === true) {
      console.log("[API] 💬 Traitement d'une réponse de politesse (Chitchat)");
      output.summary =
        output.summary?.trim() ||
        result.summary ||
        "Bonjour ! Que puis-je faire pour vous aujourd'hui ?";
    }

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
    const executionTimeMs = Date.now() - startTime;
    const audit = extractAuditMetrics(result);

    console.log("[API /ask] ✅ Graphe terminé directement");
    res.status(200).json({
      status: result.isBlocked ? "blocked" : "completed",
      ...output,
      audit: {
        ...audit,
        executionTimeMs,
        executionTimeSec: (executionTimeMs / 1000).toFixed(2),
        timestamp: new Date().toISOString(),
        threadId: thread_id,
      },
    });
    // res.status(200).json({ status: "completed", thread_id });
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

    // 2. Définir la configuration enrichie avec la limite de récursion
    const resumeConfig = {
      ...config, // Garde ton thread_id actuel indispensable
      recursionLimit: 50, // Augmente la limite de 25 à 50 transitions max
    };

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
      resumeConfig, // ← même thread_id que /ask
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
    console.log("[Output]", output);

    if (result.isChitchat === true) {
      console.log(
        "[API /ask] 💬 Traitement d'une réponse de politesse (Chitchat)",
      );
      // Si extractAgentOutput ne l'a pas capturé, on force le message extrait du nœud
      output.summary =
        result.summary || "Bonjour ! Que puis-je faire pour vous aujourd'hui ?";
    }

    // ── Publication automatique dans Superset ──────────────────────────────
    // console.log(
    //   "[Superset Auto-Publish] 🔄 Vérification de la possibilité de publication...",
    // );
    // let supersetPublish: {
    //   success: boolean;
    //   message: string;
    //   chartId?: number;
    // } | null = null;

    // if (
    //   !result.isBlocked &&
    //   output.chartConfig &&
    //   output.queryResult &&
    //   output.queryResult.rows &&
    //   output.queryResult.rows.length > 0
    // ) {
    //   try {
    //     console.log(
    //       "[Superset Auto-Publish] 📊 Graphique détecté. Tentative de publication...",
    //     );
    //     const defaultDashboardId = parseInt(
    //       process.env.SUPERSET_DEFAULT_DASHBOARD_ID || "1",
    //       10,
    //     );

    //     console.log(
    //       `[Superset Auto-Publish] 📌 Graphique détecté. Publication dans le Dashboard ID: ${defaultDashboardId}...`,
    //     );

    //     const { dimensionColumn, metricColumn } = inferColumns(
    //       output.queryResult.columns,
    //       output.queryResult.rows[0],
    //     );

    //     console.log(
    //       "[DEBUG] SQL envoyé à Superset:",
    //       result.validatedSqlQuery || result.lastSqlJson,
    //     );
    //     console.log(
    //       "[DEBUG] Colonnes du résultat exécuté:",
    //       output.queryResult.columns,
    //     );

    //     const chartResult = await SupersetService.addChartToDashboard({
    //       dashboardId: defaultDashboardId,
    //       chartTitle:
    //         output.chartConfig?.title?.text ||
    //         `Graphique - ${new Date().toLocaleString("fr-FR")}`,
    //       // sqlQuery: result.validatedSqlQuery || result.lastSqlJson,
    //       sqlQuery:
    //         result.executedSqlQuery ||
    //         result.validatedSqlQuery ||
    //         result.lastSqlJson,
    //       vizKind: mapChartTypeToVizKind(output.chartConfig),
    //       columns: output.queryResult.columns,
    //       metricColumn,
    //       dimensionColumn,
    //     });

    //     supersetPublish = {
    //       success: true,
    //       message: "Graphique publié automatiquement dans Superset.",
    //       chartId: chartResult?.id,
    //     };

    //     console.log(
    //       `[Superset Auto-Publish] 🎉 Chart créé avec succès (ID: ${chartResult?.id}).`,
    //     );
    //   } catch (supersetError: any) {
    //     console.error(
    //       "[Superset Auto-Publish] ❌ Échec de la publication :",
    //       supersetError.message,
    //     );
    //     supersetPublish = {
    //       success: false,
    //       message: "Échec de la publication automatique dans Superset.",
    //     };
    //   }
    // }

    // ── Gestion du cas où l'agent est bloqué et n'a pas produit de résumé ──
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
    console.log("Output of agent response ", output);

    res.status(200).json({
      status: result.isBlocked ? "blocked" : "completed",
      ...output, // le frontend reçoit des champs plats et directs
      // supersetPublish, // ← ajoute cette ligne
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

// ------ Intégration des charts dans le dashboard superset (Optionnel) ------
function inferColumns(columns: string[], sampleRow: Record<string, unknown>) {
  const dimensionColumn =
    columns.find((c) => typeof sampleRow[c] !== "number") ?? columns[0];
  const metricColumn =
    columns.find((c) => typeof sampleRow[c] === "number") ??
    columns[1] ??
    columns[0];
  return { dimensionColumn, metricColumn };
}

export const handlePublishToSuperset = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const { thread_id, dashboardId, chartTitle } = req.body;

  console.log("\n=== [Superset] Début handlePublishToSuperset ===");
  console.log("👉 Thread ID reçu :", thread_id);
  console.log("👉 Dashboard ID ciblé :", dashboardId);

  if (!thread_id || !dashboardId) {
    console.warn("❌ Paramètres manquants dans la requête.");
    res
      .status(400)
      .json({ success: false, error: "thread_id et dashboardId requis." });
    return;
  }

  const config = { configurable: { thread_id } };

  try {
    let chartConfig: any = null;
    let queryResult: any = null;
    let sqlQuery: string = "";

    // ── PLAN A : Tentative de récupération depuis LangGraph ─────────────────
    console.log("🔄 Plan A : Lecture de l'état LangGraph...");
    const snapshot = await compiledGraph.getState(config);
    const result = snapshot?.values || {};

    console.log(
      "🔍 Snapshot values de LangGraph :",
      JSON.stringify(result, null, 2),
    );

    if (result && Object.keys(result).length > 0) {
      console.log("✅ État LangGraph trouvé. Extraction des configurations...");
      const output = extractAgentOutput(result);
      chartConfig = output.chartConfig;
      queryResult = output.queryResult;
      // sqlQuery = result.validatedSqlQuery || result.lastSqlJson;
      sqlQuery =
        result.executedSqlQuery ||
        result.validatedSqlQuery ||
        result.lastSqlJson;
    }

    // ── PLAN B : Secours via l'historique des messages (BDD) ────────────────
    if (!chartConfig || !queryResult) {
      console.log(
        `⚠️ Plan A échoué (État LangGraph vide). Bascule sur le Plan B (Historique BDD)...`,
      );

      // Récupération de l'historique complet pour ce thread
      const messages = await getThreadContext(thread_id);
      console.log(
        `📋 Nombre de messages récupérés dans l'historique : ${messages?.length || 0}`,
      );

      if (messages && messages.length > 0) {
        // Log du dernier message pour voir sa structure brute
        console.log(
          "🔍 Structure du dernier message de l'historique :",
          JSON.stringify(messages[messages.length - 1], null, 2),
        );

        // Recherche du dernier message assistant contenant un graphique ou un rapport
        const lastAssistantMessage = [...messages]
          .reverse()
          .find(
            (msg) =>
              msg.role === "assistant" && (msg.chartConfig || msg.report),
          );

        if (lastAssistantMessage) {
          console.log(
            "🎯 Message de secours assistant trouvé ! ID:",
            lastAssistantMessage || "N/A",
          );
          console.log(
            "   -> chartConfig présent :",
            !!lastAssistantMessage.chartConfig,
          );
          console.log("   -> report présent :", !!lastAssistantMessage.report);

          chartConfig = lastAssistantMessage.chartConfig;

          // Extraction selon la structure réelle stockée dans ton service d'historique
          queryResult =
            lastAssistantMessage.report?.queryResult ||
            lastAssistantMessage.chartConfig?.queryResult;
          sqlQuery =
            lastAssistantMessage.report?.sqlQuery ||
            lastAssistantMessage.chartConfig?.sql;
        } else {
          console.warn(
            "❌ Aucun message de l'assistant avec un chartConfig ou report n'a été trouvé dans cet historique.",
          );
        }
      }
    }

    // ── VALIDATION FINALE ──────────────────────────────────────────────────
    console.log("=== Analyse des données prêtes pour Superset ===");
    console.log("👉 chartConfig final disponible :", !!chartConfig);
    console.log("👉 queryResult final disponible :", !!queryResult);
    console.log(
      "👉 Requête SQL finale extraite :",
      sqlQuery ? "OUI (longueur: " + sqlQuery.length + ")" : "NON",
    );

    if (!chartConfig || !queryResult) {
      console.error(
        "❌ Échec des plans A et B : Données graphiques introuvables.",
      );
      res.status(400).json({
        success: false,
        error:
          "Aucun graphique ou résultat SQL disponible en mémoire ou dans l'historique de ce thread.",
      });
      return;
    }

    // Inférence des colonnes pour le jeu de données Superset
    console.log("🔄 Inférence des colonnes en cours...");
    const { dimensionColumn, metricColumn } = inferColumns(
      queryResult.columns,
      queryResult.rows[0],
    );
    console.log(
      `📊 Colonnes inférées -> Dimension: "${dimensionColumn}", Métrique: "${metricColumn}"`,
    );

    // Publication finale
    console.log(
      "🚀 Envoi des paramètres à SupersetService.addChartToDashboard...",
    );
    const chartResult = await SupersetService.addChartToDashboard({
      dashboardId: parseInt(dashboardId, 10),
      chartTitle:
        chartTitle ||
        chartConfig?.title?.text ||
        "Graphique généré par l'Agent",
      sqlQuery: sqlQuery,
      vizKind: mapChartTypeToVizKind(chartConfig),
      columns: queryResult.columns,
      metricColumn,
      dimensionColumn,
    });

    console.log(
      "🎉 Publication réussie ! Nouveau Chart ID Superset :",
      chartResult?.id,
    );

    res.status(200).json({
      success: true,
      message: "Graphique publié avec succès dans Superset.",
      chartId: chartResult?.id,
    });
  } catch (err: any) {
    console.error("[API /publish-superset] 🚨 Erreur critique :", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    console.log("=== [Superset] Fin handlePublishToSuperset ===\n");
  }
};

/////// medias_report section
export async function getMediaByUser(req: Request, res: Response) {
  try {
    const requestedUserId = Number(req.params.userId);
    const authUser = (req as any).user; // injecté par checkAuth

    // RBAC : un utilisateur ne peut voir que ses propres médias, sauf admin
    // if (authUser.role !== "admin" && authUser.id !== requestedUserId) {
    //   return res.status(403).json({ message: "Accès refusé." });
    // }

    const media = await getUserMedia(requestedUserId);
    return res.status(200).json(media);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}

export async function deleteMedia(req: Request, res: Response) {
  try {
    console.log("[deleteMessage] in deletingMedia");
    const messageId = Number(req.params.id);

    const authUser = (req as any).user;
    console.log("[deleteMessage] messageId and authUser", messageId, authUser);

    const success = await hideMessage(messageId, authUser.userId);
    if (!success) {
      return res
        .status(404)
        .json({ message: "Média introuvable ou non autorisé." });
    }
    return res.status(200).json({ message: "Média supprimé." });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}
