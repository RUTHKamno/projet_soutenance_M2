import * as path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { LanceDB } from '@langchain/community/vectorstores/lancedb';
import * as lancedb from '@lancedb/lancedb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const embeddings = new GoogleGenerativeAIEmbeddings({
  modelName: 'gemini-embedding-001',
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
});

const dbPath    = path.join(__dirname, '../data/lancedb');
const tableName = 'langchain_vectorstore';

// ─── Connexion réutilisable (évite de reconnecter à chaque appel) ────────────
let dbInstance:    lancedb.Connection | null = null;
let tableInstance: lancedb.Table | null      = null;

async function getTable(): Promise<lancedb.Table> {
  if (!tableInstance) {
    dbInstance    = await lancedb.connect(dbPath);
    tableInstance = await dbInstance.openTable(tableName);
  }
  return tableInstance;
}

// ─── TYPE : résultat brut avec score ─────────────────────────────────────────
export interface RagSearchResult {
  question:    string;
  sql?:        string;
  pageContent: string;
  metadata:    Record<string, unknown>;
  _distance:   number;   // 0 = identique, 1 = totalement différent
}

/**
 * FONCTION 1 (existante) — Retourne le contexte formaté en string pour les prompts LLM
 */
export async function getDwhContext(query: string, limit: number = 5): Promise<string> {
  try {
    console.log(`[RAG Service] Connexion locale à LanceDB...`);
    const table = await getTable();

    const vectorStore = new LanceDB(embeddings, { table });

    console.log(`[RAG Service] 🔍 Recherche de proximité pour : "${query}"`);
    const results = await vectorStore.similaritySearch(query, limit);

    if (results.length === 0) {
      console.log('[RAG Service] ⚠️ Aucune métadonnée DWH trouvée.');
      return "Aucun contexte spécifique trouvé dans le DWH.";
    }

    console.log(`[RAG Service] ✨ ${results.length} éléments sémantiques pertinents récupérés.`);
    return results.map((doc, i) =>
      `--- Fragment de Contexte ${i + 1} (Source : ${doc.metadata?.type || 'Metadata DWH'}) ---\n${doc.pageContent}`
    ).join("\n\n");

  } catch (error) {
    console.error("[RAG Service] ❌ Erreur recherche vectorielle :", error);
    return "Erreur technique lors de la récupération du contexte sémantique.";
  }
}

/**
 * FONCTION 2 (nouvelle) — Retourne les objets bruts avec scores pour le cache sémantique
 */
export async function searchSimilar(query: string, limit: number = 1): Promise<RagSearchResult[]> {
  try {
    const table = await getTable();

    const vectorStore = new LanceDB(embeddings, { table });

    // similaritySearchWithScore retourne [Document, score][]
    const results = await vectorStore.similaritySearchWithScore(query, limit);

    return results.map(([doc, score]) => ({
      question:    (doc.metadata?.question as string) ?? doc.pageContent.substring(0, 100),
      sql:         (doc.metadata?.sql as string)      ?? undefined,
      pageContent: doc.pageContent,
      metadata:    doc.metadata ?? {},
      _distance:   score,   // LanceDB retourne la distance L2, plus petit = plus similaire
    }));

  } catch (error) {
    console.error("[RAG Service] ❌ Erreur searchSimilar :", error);
    return [];
  }
}