// src/cache/sqlCache.ts
import { createHash } from "crypto";
import { Redis } from "ioredis";
import { searchSimilar } from "../agentic/ragService.js";

// ─── Interface ───────────────────────────────────────────────────────────────
interface CacheEntry {
  sql:           string;
  visualisation: string;
  question:      string;
  roleHash:      string;
  hitCount:      number;
  createdAt:     string;
  validatedAt:   string;
  data_generated?: any;
}

// 1. On définit la structure d'un bloc de résultat individuel
export interface SQLQueryResult {
  userQuestion: string;
  role:         string;
  agence?:      string;
  sql: string;
  visualisation: string;
  data: any; // Les lignes retournées par CETTE requête spécifique
}

// ─── TTL par défaut : 7 jours (en secondes) ──────────────────────────────────
// Modifie selon la fréquence de mise à jour de ton schéma DWH
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

// ─── Connexion Redis ─────────────────────────────────────────────────────────
const redisClient = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: 3,
  lazyConnect: true,   // ne se connecte que lors du premier appel
});

redisClient.on("connect", () => console.log("⚙️  [Redis] Connecté avec succès."));
redisClient.on("error", (err: Error) => {
  console.error("❌ [Redis] Erreur :", err.message);
});
// ─── Clé Redis ───────────────────────────────────────────────────────────────
function buildCacheKey(question: string, role: string, agence?: string): string {
  const normalized = question
    .toLowerCase()
    .trim()
    .replace(/[?!.,;]/g, "")
    .replace(/\s+/g, " ");

  const rbacKey = `${role}:${agence ?? "all"}`;
  const hash    = createHash("sha256")
    .update(`${normalized}||${rbacKey}`)
    .digest("hex")
    .substring(0, 16);

  return `cache:sql:${hash}`;
}

// ─── NIVEAU 1 : Cache exact ───────────────────────────────────────────────────
export async function getCacheExact(
  question: string,
  role:     string,
  agence?:  string
): Promise<CacheEntry | null> {
  agence ??= undefined;
  const key = buildCacheKey(question, role, agence);

  try {
    const raw = await redisClient.get(key);
    if (!raw) {
      console.log(`[Cache] ❌ cache non trouvée (key: ${key})`);
      return null;
    }

    const entry: CacheEntry = JSON.parse(raw);
    entry.hitCount++;

    // Réécrit l'entrée ET réinitialise le TTL à chaque hit
    await redisClient.set(key, JSON.stringify(entry), "EX", CACHE_TTL_SECONDS);

    console.log(`[Cache] ✅cache trouvée (key: ${key}, hits: ${entry.hitCount})`);
    return entry;

  } catch (err) {
    console.error("[Cache] ❌ Erreur getCacheExact :", err);
    return null;  // fail silencieux → pipeline continue normalement
  }
}

// ─── NIVEAU 2 : Cache sémantique ─────────────────────────────────────────────
export async function getCacheSemantic(
  question:  string,
  role:      string,
  agence?:   string,
  threshold = 0.15   // ⚠️ Distance L2 : PLUS PETIT = plus similaire (inverse de cosinus)
                     // 0.15 correspond à ~92% de similarité en espace L2 normalisé
): Promise<CacheEntry | null> {

  try {
    const results = await searchSimilar(question, 1);
    if (!results || results.length === 0) return null;

    const topResult = results[0];

    // ⚠️ Correction : LanceDB retourne distance L2 (pas cosinus)
    // Distance L2 : 0 = identique, plus grand = plus différent
    // On vérifie que la distance EST INFÉRIEURE au seuil
    if (topResult._distance > threshold) {
      console.log(`[Cache] ❌ MISS sémantique (distance L2: ${topResult._distance.toFixed(4)} > seuil: ${threshold})`);
      return null;
    }

    const similarKey = buildCacheKey(topResult.question, role, agence);
    const raw        = await redisClient.get(similarKey);

    if (!raw) {
      console.log(`[Cache] ❌ Question similaire trouvée mais pas en cache Redis.`);
      return null;
    }

    const cached = JSON.parse(raw) as CacheEntry;
    cached.hitCount++;
    await redisClient.set(similarKey, JSON.stringify(cached), "EX", CACHE_TTL_SECONDS);

    console.log(`[Cache] ✅ HIT sémantique (distance L2: ${topResult._distance.toFixed(4)}, hits: ${cached.hitCount})`);
    return cached;

  } catch (err) {
    console.warn("[Cache] ⚠️ Recherche sémantique échouée, passage au LLM :", err);
    return null;
  }
}

// ─── STOCKAGE après validation Judge ─────────────────────────────────────────
export async function setCacheEntry(data: SQLQueryResult): Promise<void> {
  const key     = buildCacheKey(data?.userQuestion, data?.role, data?.agence);
  const rbacKey = `${data?.role}:${data?.agence ?? "all"}`;

  const entry: CacheEntry = {
    sql: data.sql,
    visualisation: data.visualisation,
    question: data.userQuestion,
    data_generated: data.data,
    roleHash:    rbacKey,
    hitCount:    0,
    createdAt:   new Date().toISOString(),
    validatedAt: new Date().toISOString(),
  };

  try {
    await redisClient.set(key, JSON.stringify(entry), "EX", CACHE_TTL_SECONDS);
    console.log(`[Cache] 💾 Stocké dans Redis (key: ${key}, TTL: 7j, role: ${rbacKey})`);
  } catch (err) {
    console.error("[Cache] ❌ Erreur setCacheEntry :", err);
    // fail silencieux → le pipeline continue sans cache
  }
}

// ─── STATS pour monitoring ────────────────────────────────────────────────────
export async function getCacheStats(): Promise<{
  totalKeys:  number;
  sampleKeys: string[];
}> {
  try {
    const keys = await redisClient.keys("cache:sql:*");
    return {
      totalKeys:  keys.length,
      sampleKeys: keys.slice(0, 5),
    };
  } catch (err) {
    return { totalKeys: 0, sampleKeys: [] };
  }
}

// ─── INVALIDATION manuelle (utile si tu mets à jour le schéma DWH) ───────────
export async function invalidateCache(role?: string): Promise<number> {
  try {
    const keys = await redisClient.keys("cache:sql:*");

    if (keys.length === 0) return 0;

    // Si un rôle est précisé, ne supprime que ses entrées
    if (role) {
      const toDelete: string[] = [];
      for (const key of keys) {
        const raw = await redisClient.get(key);
        if (raw) {
          const entry: CacheEntry = JSON.parse(raw);
          if (entry.roleHash.startsWith(role)) toDelete.push(key);
        }
      }
      if (toDelete.length > 0) await redisClient.del(...toDelete);
      console.log(`[Cache] 🗑️  ${toDelete.length} entrées supprimées pour le rôle "${role}"`);
      return toDelete.length;
    }

    // Sinon vide tout le cache SQL
    await redisClient.del(...keys);
    console.log(`[Cache] 🗑️  Cache entièrement vidé (${keys.length} entrées)`);
    return keys.length;

  } catch (err) {
    console.error("[Cache] ❌ Erreur invalidateCache :", err);
    return 0;
  }
}

export async function closeCache(): Promise<void> {
  await redisClient.quit();
  console.log("[Cache] 🔌 Connexion Redis fermée.");
}