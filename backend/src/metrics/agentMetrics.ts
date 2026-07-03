// src/metrics/agentMetrics.ts

export interface RunMetrics {
  runId:             string;
  approach:          "custom_workflow" | "autonomous_agent";
  question:          string;
  userRole:          string;
  startTime:         number;
  endTime:           number;
  totalDurationMs:   number;
  llmCallsCount:     number;
  totalTokensInput:  number;
  totalTokensOutput: number;
  totalTokensTotal:  number;
  iterationsCount:   number;
  cacheHit:          boolean;
  sqlGeneratedCount: number;
  judgeCallsCount:   number;
  correctionLoops:   number;
  finalStatus:       "success" | "error" | "rbac_rejected" | "max_retries";
  errorMessage?:     string;
}

export class MetricsCollector {
  private metrics: Partial<RunMetrics>;

  constructor(approach: "custom_workflow" | "autonomous_agent", question: string, role: string) {
    this.metrics = {
      runId:             `${approach}_${Date.now()}`,
      approach,
      question,
      userRole:          role,
      startTime:         Date.now(),
      llmCallsCount:     0,
      totalTokensInput:  0,
      totalTokensOutput: 0,
      totalTokensTotal:  0,
      iterationsCount:   0,
      cacheHit:          false,
      sqlGeneratedCount: 0,
      judgeCallsCount:   0,
      correctionLoops:   0,
      finalStatus:       "success",
    };
  }

  recordLLMCall(usageMetadata?: any) {
    this.metrics.llmCallsCount! += 1;
    if (usageMetadata) {
      this.metrics.totalTokensInput!  += usageMetadata.promptTokenCount     ?? 0;
      this.metrics.totalTokensOutput! += usageMetadata.candidatesTokenCount ?? 0;
      this.metrics.totalTokensTotal!  += usageMetadata.totalTokenCount      ?? 0;
    }
  }

  recordIteration()      { this.metrics.iterationsCount!   += 1; }
  recordCacheHit()       { this.metrics.cacheHit            = true; }
  recordSQLGenerated()   { this.metrics.sqlGeneratedCount! += 1; }
  recordJudgeCall()      { this.metrics.judgeCallsCount!   += 1; }
  recordCorrectionLoop() { this.metrics.correctionLoops!   += 1; }

  recordEnd(status: RunMetrics["finalStatus"], errorMessage?: string) {
    this.metrics.endTime       = Date.now();
    this.metrics.totalDurationMs = this.metrics.endTime! - this.metrics.startTime!;
    this.metrics.finalStatus   = status;
    if (errorMessage) this.metrics.errorMessage = errorMessage;
  }

  getMetrics(): RunMetrics {
    return this.metrics as RunMetrics;
  }

  printSummary() {
    const m = this.getMetrics();
    console.log("\n" + "=".repeat(60));
    console.log(`📊 MÉTRIQUES — ${m.approach.toUpperCase()}`);
    console.log("=".repeat(60));
    console.log(`⏱️  Durée totale        : ${m.totalDurationMs} ms`);
    console.log(`🔁 Itérations          : ${m.iterationsCount}`);
    console.log(`🤖 Appels LLM          : ${m.llmCallsCount}`);
    console.log(`🪙 Tokens input        : ${m.totalTokensInput}`);
    console.log(`🪙 Tokens output       : ${m.totalTokensOutput}`);
    console.log(`🪙 Tokens total        : ${m.totalTokensTotal}`);
    console.log(`⚡ Cache HIT           : ${m.cacheHit}`);
    console.log(`🗄️  SQL générés         : ${m.sqlGeneratedCount}`);
    console.log(`⚖️  Appels Judge        : ${m.judgeCallsCount}`);
    console.log(`🔄 Boucles correction  : ${m.correctionLoops}`);
    console.log(`✅ Statut final        : ${m.finalStatus}`);
    if (m.errorMessage) console.log(`❌ Erreur             : ${m.errorMessage}`);
    console.log("=".repeat(60) + "\n");
  }
}