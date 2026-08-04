import * as path from "path";
import { fileURLToPath } from "url";
import * as lancedb from "@lancedb/lancedb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "../data/lancedb");
const cacheTableName = "question_cache_vectorstore";

async function clearCacheTable() {
  try {
    console.log(`[Cache Reset] 🔌 Connexion à LanceDB : ${dbPath}`);
    const db = await lancedb.connect(dbPath);

    const tables = await db.tableNames();

    if (tables.includes(cacheTableName)) {
      console.log(
        `[Cache Reset] 🗑️ Suppression de la table "${cacheTableName}"...`,
      );
      await db.dropTable(cacheTableName);
      console.log(
        `[Cache Reset] ✅ La table de cache "${cacheTableName}" a été entièrement vidée !`,
      );
    } else {
      console.log(
        `[Cache Reset] ⚠️ La table "${cacheTableName}" n'existe pas ou a déjà été supprimée.`,
      );
    }
  } catch (error) {
    console.error(
      "[Cache Reset] ❌ Erreur lors du réinitialisation du cache :",
      error,
    );
  }
}

clearCacheTable();
