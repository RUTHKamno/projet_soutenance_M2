// src/cache/questionCacheStore.ts
import * as path from "path";
import { fileURLToPath } from "url";
import * as lancedb from "@lancedb/lancedb";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const embeddings = new GoogleGenerativeAIEmbeddings({
  modelName: "gemini-embedding-001",
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
});

// Même racine data/lancedb que ragService.ts, mais une TABLE séparée
const dbPath = path.join(__dirname, "../data/lancedb");
const tableName = "question_cache_vectorstore"; // ← différent de "langchain_vectorstore"

let dbInstance: lancedb.Connection | null = null;
let tableInstance: lancedb.Table | null = null;

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

async function getOrCreateTable(): Promise<lancedb.Table> {
  if (tableInstance) return tableInstance;
  if (!dbInstance) dbInstance = await lancedb.connect(dbPath);

  const existingTables = await dbInstance.tableNames();
  if (existingTables.includes(tableName)) {
    tableInstance = await dbInstance.openTable(tableName);
  } else {
    // LanceDB déduit le schéma à partir du 1er enregistrement → on amorce la table
    const bootstrapVector = await embeddings.embedQuery("bootstrap");
    tableInstance = await dbInstance.createTable(tableName, [
      {
        vector: bootstrapVector,
        question: "__bootstrap__",
        role: "__system__",
        agence: "",
        redisKey: "",
        createdAt: new Date().toISOString(),
      },
    ]);
    console.log(`[QuestionCacheStore] 🆕 Table LanceDB "${tableName}" créée.`);
  }
  return tableInstance;
}

export async function indexCachedQuestion(params: {
  question: string;
  role: string;
  agence?: string;
  redisKey: string;
}): Promise<void> {
  try {
    const table = await getOrCreateTable();
    const vector = await embeddings.embedQuery(params.question);
    await table.add([
      {
        vector,
        question: params.question,
        role: params.role,
        agence: params.agence ?? "",
        redisKey: params.redisKey,
        createdAt: new Date().toISOString(),
      },
    ]);
    console.log(
      `[QuestionCacheStore] 💾 Question indexée : "${params.question}" (redisKey: ${params.redisKey})`,
    );
  } catch (err) {
    console.error("[QuestionCacheStore] ❌ Erreur indexation :", err);
    // fail silencieux — n'interrompt jamais le pipeline principal
  }
}

export async function searchCachedQuestions(
  query: string,
  role: string,
  agence: string | undefined,
  limit = 1,
): Promise<{ question: string; redisKey: string; distance: number } | null> {
  try {
    const table = await getOrCreateTable();
    const vector = await embeddings.embedQuery(query);

    // Filtre STRICT rôle + agence — jamais flou, même en sémantique
    const results = await table
      .search(vector)
      .where(
        `role = '${escapeSqlString(role)}' AND agence = '${escapeSqlString(agence ?? "")}'`,
      )
      .limit(limit)
      .toArray();

    if (!results || results.length === 0) return null;

    const top = results[0] as any;
    return {
      question: top.question,
      redisKey: top.redisKey,
      distance: top._distance,
    };
  } catch (err) {
    console.error("[QuestionCacheStore] ❌ Erreur recherche :", err);
    return null;
  }
}
