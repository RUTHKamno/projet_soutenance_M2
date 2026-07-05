import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
  // ── Messages LangChain (historique de la conversation) ───────────────────
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  // ── Données utilisateur transmises au démarrage ──────────────────────────
  userQuestion: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => "",
  }),
  userRole: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => "",
  }),
  userLanguage: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => "fr",
  }),

  // ── Résultat de la reformulation (rempli par reformulateNode) ────────────
  reformulatedQuestion: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => "",
  }),

  // ── Contexte RAG (rempli via tool_search_rag) ────────────────────────────
  ragContext: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => "",
  }),

  // ── SQL capturé par toolsNode avant passage au juge ──────────────────────
  lastSqlJson: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => "",
  }),

  summary: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => "",
  }),

  // ── Verdict du juge (rempli par judgeNode) ───────────────────────────────
  judgeVerdict: Annotation<{ isValid: boolean; feedback: string } | null>({
    reducer: (_current, update) => update,
    default: () => null,
  }),

  // ── Compteur de tentatives de correction SQL ─────────────────────────────
  correctionAttempts: Annotation<number>({
    reducer: (_current, update) => update,
    default: () => 0,
  }),

  awaitingValidation: Annotation<boolean>({
    reducer: (_current, update) => update,
    default: () => false,
  }),
  isChitchat: Annotation<boolean>({
    reducer: (_current, update) => update,
    default: () => false,
  }),
  humanValidated: Annotation<boolean>({
    reducer: (_current, update) => update,
    default: () => false,
  }),
  userContextInfo: Annotation<any>(), // ex: { agence_utilisateur: "Yaoundé" }
  isBlocked: Annotation<boolean>({
    reducer: (_current, update) => update,
    default: () => false,
  }),
  requireChart: Annotation<boolean>({
    reducer: (_current, update) => update, // ou (current, update) => update ?? current
    default: () => false,
  }),

  requireReport: Annotation<boolean>({
    reducer: (_current, update) => update,
    default: () => false,
  }),

  validatedSqlQuery: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => "",
  }),

  executedSqlQuery: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => "",
  }),
});

export type AgentStateType = typeof AgentState.State;
