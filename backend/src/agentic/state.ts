import { Annotation } from "@langchain/langgraph";

export const StateAnnotation = Annotation.Root({
  userQuestion: Annotation<string>(),
  reformulatedQuestion: Annotation<string>(),
  isClarifiedByHuman: Annotation<boolean>(), // 'true' si l'utilisateur a dit "Oui"
  // 🔐 Informations de Sécurité RBAC de l'utilisateur connecté
  userRole: Annotation<string>(),         // ex: "directeur_agence"
  userContextInfo: Annotation<any>(),     // ex: { agence_utilisateur: "Yaoundé" }
  ragContext: Annotation<string>(),
  generatedSQL: Annotation<string>(),

  // --- NOUVEAU : visualisation suggérée par AgentSQL ---
  suggestedVisualization: Annotation<string>(),  // ex: "echarts_timeseries_line"

  // --- NOUVEAU : résultat d'exécution SQL ---
  queryResults: Annotation<Record<string, unknown>[]>(),
  queryError: Annotation<string | null>(),


  // NOUVEAU : pour gérer les boucles de l'agent content
  reportSections: Annotation<{
  title:   string;
  content: string;
  type:    string;
  }[]>(),

  sqlQueries: Annotation<{
  id:            string;
  label:         string;
  sql:           string;
  visualisation: string;
  justification: string;
  }[]>(),

  isMultiQuery:   Annotation<boolean>(),

  sqlFromCache: Annotation<boolean>(),

  reportCharts: Annotation<{
    title:  string;
    type:   string;
    config: Record<string, unknown>;
  }[]>(),

  sqlRetryCount: Annotation<number>({
    reducer: (x, y) => y, // Garde la valeur la plus récente
    default: () => 0,     // Initialisé à 0 au départ
  }),
  judgeEvaluation: Annotation<{ 
    isValid: boolean; 
    feedback: string;
    feedbackViz: string;        // NOUVEAU
 }>(),
 // --- NOUVEAU : sortie Agent Content ---
 
  responseType: Annotation<"text" | "chart">(),
  finalResponse: Annotation<{
    analyse: string;
    visualisation: Record<string, any>;
    notes: string;
  }>(),
  chartConfig: Annotation<Record<string, unknown> | null>(),
  supersetChartId: Annotation<number | null>(),
  finalAnswer: Annotation<string>(),
//   chartConfig: Annotation<any>(),
});