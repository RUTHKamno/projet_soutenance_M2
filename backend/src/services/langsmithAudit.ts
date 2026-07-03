// ── Utilitaire métriques LangSmith ──────────────────────────────────────────
export function extractAuditMetrics(result: any) {
  const messages = result.messages ?? [];
  
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalTokens = 0;
  const toolCallsLog: { tool: string; inputTokens: number; outputTokens: number }[] = [];

  for (const msg of messages) {
    const usage = msg.kwargs?.usage_metadata ?? msg.usage_metadata;
    const toolCalls = msg.kwargs?.tool_calls ?? msg.tool_calls ?? [];
    const runId = msg.kwargs?.id ?? msg.id ?? null;

    if (usage) {
      totalInputTokens  += usage.input_tokens  ?? 0;
      totalOutputTokens += usage.output_tokens ?? 0;
      totalTokens       += usage.total_tokens  ?? 0;

      if (toolCalls.length > 0) {
        for (const tc of toolCalls) {
          toolCallsLog.push({
            tool:         tc.name,
            inputTokens:  usage.input_tokens  ?? 0,
            outputTokens: usage.output_tokens ?? 0,
          });
        }
      }
    }
  }

  return {
    tokens: {
      input:  totalInputTokens,
      output: totalOutputTokens,
      total:  totalTokens,
    },
    toolCalls: toolCallsLog,
    langsmithProject: process.env.LANGCHAIN_PROJECT ?? null,
    langsmithRunName: process.env.LANGCHAIN_RUN_NAME ?? null,
  };
}