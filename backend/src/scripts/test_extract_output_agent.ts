// 1. Coller la fonction d'extraction mise à jour
function extractAgentOutput(result: any) {
  const messages = result?.data?.messages ?? result?.messages ?? [];
  const toolResults: Record<string, string[]> = {};
  let lastAISummary: string | null = null;

  for (const msg of messages) {
    if (!msg) continue;
    const msgType =
      msg.type ??
      (typeof msg._getType === "function" ? msg._getType() : "") ??
      msg.constructor?.name ??
      "";
    const isToolMessage = msgType === "tool" || msgType === "ToolMessage";
    const isAIMessage = msgType === "ai" || msgType === "AIMessage";

    if (isToolMessage) {
      const name = msg.name;
      const content = msg.content;
      if (name && content !== undefined && content !== null) {
        if (!toolResults[name]) toolResults[name] = [];
        toolResults[name].push(
          typeof content === "string" ? content : JSON.stringify(content),
        );
      }
    }

    if (isAIMessage) {
      const toolCalls = msg.tool_calls ?? [];
      const content = msg.content;
      if (!toolCalls || toolCalls.length === 0) {
        if (typeof content === "string" && content.trim().length > 0) {
          lastAISummary = content;
        }
      }
    }
  }

  console.log("result, text extract", toolResults, lastAISummary);

  return {
    summary: lastAISummary,
    chartConfig: toolResults["tool_generate_chart"]?.at(-1)
      ? JSON.parse(toolResults["tool_generate_chart"]?.at(-1)!)
      : null,
    report: toolResults["tool_write_report"]?.at(-1) ?? null,
  };
}

// 2. Mock simulant exactement la structure d'instances observée dans vos logs
const runtimeResult = {
  messages: [
    {
      type: "HumanMessage",
      content: "Question validée par l'utilisateur...",
    },
    {
      type: "AIMessage",
      content: "Model generated function call(s).",
      tool_calls: [{ name: "tool_cache_get", id: "3kxNhkVk" }],
    },
    {
      type: "ToolMessage", // ou simuler une classe avec la clé type
      name: "tool_generate_chart",
      content: JSON.stringify({
        title: { text: "Répartition Crédit" },
        series: [{ type: "bar", data: [5000000] }],
      }),
      tool_call_id: "3kxNhkVk",
    },
    {
      type: "AIMessage",
      content:
        "L'analyse révèle que l'encours total se concentre principalement sur...",
      tool_calls: [], // Pas de call -> c'est la synthèse finale !
    },
  ],
};

// 3. Exécution
console.log("=== TEST EXTRACTION CLASSE RUNTIME ===");
const output = extractAgentOutput(runtimeResult);
console.log(output);
