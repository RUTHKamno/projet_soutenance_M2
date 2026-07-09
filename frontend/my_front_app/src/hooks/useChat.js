import { useState, useCallback } from "react";
import { agentApi } from "../api/agentApi";
import { translateChatError } from "../utils/chatErrors";

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    "Bonjour ! Je suis l'Agent IA Analytics de Be IT Africa. Je suis spécialisé dans l'analyse de vos données microfinance. Posez-moi vos questions en langage naturel : encours, remboursements, performance d'agences, risques crédit...",
  isWelcome: true,
};

export const useChat = () => {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [pendingThread, setPendingThread] = useState(null);
  const [pendingReformulation, setPendingReformulation] = useState(null);
  const [lastQuestion, setLastQuestion] = useState("");

  const addMessage = (role, content, extra = {}) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), role, content, ...extra },
    ]);
  };

  const loadHistory = useCallback(async () => {
    try {
      const history = await agentApi.getHistory();
      const mapped = history.map((msg, i) => ({
        id: i,
        role: msg.role,
        content: msg.content,
        report: msg.report,
        chartConfig: msg.chartConfig,
        threadId: msg.threadId,
        fromHistory: true,
      }));
      // Garder le message de bienvenue en tête
      setMessages([WELCOME_MESSAGE, ...mapped]);
    } catch (err) {
      console.error("Historique non chargé :", err.message);
    }
  }, []);

  const sendQuestion = useCallback(async (question) => {
    setLastQuestion(question);

    // Ajouter le message utilisateur directement avec retryable: true
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        role: "user",
        content: question,
        retryable: true,
      },
    ]);

    setLoading(true);

    try {
      const result = await agentApi.ask(question);
      console.log("Résultat de l'API:", result);

      if (result.status === "awaiting_validation") {
        setPendingThread(result.thread_id);
        setPendingReformulation(result.reformulatedQuestion);
        addMessage("system", result.reformulatedQuestion, {
          isReformulation: true,
          thread_id: result.thread_id,
        });
      } else {
        addMessage(
          "assistant",
          result.summary ||
            "Je suis votre Assistant IA Analytics, Que puis-je pour vous?",
        );
      }
    } catch (err) {
      addMessage("error", translateChatError(err.message), {
        retryable: true,
        originalQuestion: question,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const retryLastQuestion = useCallback(() => {
    if (!lastQuestion) return;
    // Supprimer le dernier message d'erreur
    setMessages((prev) =>
      prev.filter((m) => m.role !== "error" || !m.retryable),
    );
    sendQuestion(lastQuestion);
  }, [lastQuestion, sendQuestion]);

  const sendValidation = useCallback(
    async (approved, correctedQuestion = "") => {
      if (!pendingThread) return;
      setLoading(true);
      setMessages((prev) => prev.filter((m) => !m.isReformulation));

      if (pendingReformulation) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.role === "user" && !m.reformulatedQuestion) {
              // Trouver le dernier message user sans reformulation
              const userMsgs = prev.filter(
                (msg) => msg.role === "user" && !msg.reformulatedQuestion,
              );
              const lastUserMsg = userMsgs[userMsgs.length - 1];
              if (lastUserMsg && m.id === lastUserMsg.id) {
                return { ...m, reformulatedQuestion: pendingReformulation };
              }
            }
            return m;
          }),
        );
      }

      try {
        const result = await agentApi.resume(
          pendingThread,
          approved,
          correctedQuestion,
        );

        if (result.status === "blocked") {
          addMessage(
            "assistant",
            result.summary || translateChatError("blocked"),
          );
        } else {
          addMessage("assistant", result.summary || "", {
            chartConfig: result.chartConfig || null,
            report: result.report || null,
            audit: result.audit || null,
            exportable: true,
          });
        }
      } catch (err) {
        addMessage("error", translateChatError(err.message), {
          retryable: true,
        });
      } finally {
        setLoading(false);
        setPendingThread(null);
        setPendingReformulation(null);
      }
    },
    [pendingThread, pendingReformulation],
  );

  const cancelReformulation = useCallback(() => {
    setMessages((prev) => prev.filter((m) => !m.isReformulation));
    setPendingThread(null);
    setPendingReformulation(null);
  }, []);

  const publishToSuperset = useCallback(
    async (messageId, dashboardId = 2) => {
      const targetMessage = messages.find((m) => m.id === messageId);
      console.log(
        "Publishing message:",
        messages,
        messageId,
        targetMessage,
        dashboardId,
      );
      if (!targetMessage) return;

      // On cherche le thread_id : soit attaché au message, soit le pendingThread de l'état global
      const activeThreadId = targetMessage.threadId || pendingThread;

      if (!activeThreadId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  publishStatus: {
                    success: false,
                    message: "ID de session (thread_id) manquant.",
                  },
                }
              : m,
          ),
        );
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, publishing: true, publishStatus: null }
            : m,
        ),
      );

      try {
        // On envoie uniquement ce que ton contrôleur backend attend !
        await agentApi.publishChart({
          thread_id: activeThreadId,
          dashboardId: dashboardId,
          chartTitle: `Graphique - ${targetMessage.chartConfig?.title || "Agent IA"}`,
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  publishing: false,
                  publishStatus: {
                    success: true,
                    message: "Graphique publié avec succès dans Superset !",
                  },
                }
              : m,
          ),
        );
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  publishing: false,
                  publishStatus: { success: false, message: err.message },
                }
              : m,
          ),
        );
      }
    },
    [messages, pendingThread],
  );

  return {
    messages,
    loading,
    pendingThread,
    pendingReformulation,
    lastQuestion,
    loadHistory,
    sendQuestion,
    sendValidation,
    retryLastQuestion,
    cancelReformulation,
    publishToSuperset,
  };
};
