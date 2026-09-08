import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { LanceDB } from "@langchain/community/vectorstores/lancedb";
import { Ollama, OllamaEmbeddings } from "@langchain/ollama";
import * as lancedb from "@lancedb/lancedb";
import {
  buildSqlGenerationPrompt,
  processRbacSecurity,
  rewriteQueryFast,
} from "../services/ragService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function queryRAG(
  question: string,
  userRole: string = "directeur_agence",
  userAgence: string = "AG_001",
) {
  try {
    console.log(`\n🔍 Question originale : "${question}" (Rôle: ${userRole})`);

    // 1. Expansion du prompt
    const enrichedQuery = rewriteQueryFast(question);

    const dataDir = path.join(__dirname, "../data");
    const dbPath = path.join(dataDir, "lancedb");
    const rbacPath = path.join(dataDir, "rbac_config.json");

    if (!fs.existsSync(dbPath)) {
      throw new Error(`Le dossier LanceDB est introuvable à : ${dbPath}`);
    }

    // 2. Connexion LanceDB
    const db = await lancedb.connect(dbPath);
    const tableNames = await db.tableNames();
    console.log(`📦 Tables disponibles dans LanceDB :`, tableNames);

    if (tableNames.length === 0) {
      throw new Error("Aucune table trouvée dans la base LanceDB.");
    }

    // Utilisation dynamique de la première table disponible ou fallback
    const targetTable = tableNames.includes("langchain_vectorstore")
      ? "langchain_vectorstore"
      : tableNames[0];

    const table = await db.openTable(targetTable);
    const rbacConfig = JSON.parse(fs.readFileSync(rbacPath, "utf-8"));

    const embeddings = new OllamaEmbeddings({
      model: "nomic-embed-text",
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    });

    const vectorStore = new LanceDB(embeddings, { table });

    // 3. Recherche vectorielle
    console.log("⏳ Exécution de la recherche vectorielle...");
    const rawResults = await vectorStore.similaritySearch(enrichedQuery, 25);
    console.log(`📊 Documents bruts récupérés : ${rawResults.length}`);

    // 4. Déduplication sécurisée
    const uniqueDocsMap = new Map();
    for (const doc of rawResults) {
      const meta = doc.metadata || {};
      const type = meta.type || "unknown";
      const identifier = meta.tableName || meta.id || Math.random().toString();
      const key = `${type}_${identifier}`;

      if (!uniqueDocsMap.has(key)) {
        uniqueDocsMap.set(key, doc);
      }
    }
    const uniqueDocs = Array.from(uniqueDocsMap.values());

    // 5. Traitement RBAC
    const rbacResult = processRbacSecurity(
      uniqueDocs,
      userRole,
      userAgence,
      rbacConfig,
    );

    const cleansedDocs = rbacResult?.cleansedDocs || uniqueDocs;
    const forbiddenColumns = rbacResult?.forbiddenColumns || [];
    const activeFilters = rbacResult?.activeFilters || [];

    // 6. Extraction des catégories
    const tables = cleansedDocs
      .filter((d) => d.metadata?.type === "metadata_table")
      .slice(0, 4);

    const rules = cleansedDocs
      .filter(
        (d) =>
          d.metadata?.type === "regle_metier" ||
          d.metadata?.type === "jointure_cle",
      )
      .slice(0, 3);

    const triplets = cleansedDocs
      .filter((d) => d.metadata?.type === "triplet_fewshot")
      .slice(0, 3);

    // 7. Affichage détaillé du contexte extrait
    console.log(
      "\n=================== CONTEXTE FINAL EXTRAIT ===================",
    );

    console.log("\n📌 TABLES AUTORISÉES :");
    tables.forEach((t) => {
      console.log(`  • [${t.metadata?.tableName || t.metadata?.id}]`);
    });

    console.log("\n📌 RÈGLES / JOINTURES (Contenu réinjecté) :");
    rules.forEach((r, idx) => {
      console.log(`  --- Règle #${idx + 1} (${r.metadata?.id}) ---`);
      console.log(`  ${r.pageContent.replace(/\n/g, " ")}`);
    });

    console.log("\n📌 FEW-SHOTS / EXEMPLES (Questions & SQL) :");
    triplets.forEach((t, idx) => {
      console.log(`  --- Exemple #${idx + 1} (${t.metadata?.id}) ---`);
      console.log(`  Question/Intent : ${t.pageContent.replace(/\n/g, " ")}`);
      console.log(`  SQL associé     : ${t.metadata?.sql || "Non spécifié"}`);
    });

    console.log("\n🚫 COLONNES INTERDITES :", forbiddenColumns);
    console.log("🔒 FILTRES OBLIGATOIRES :", activeFilters);
    console.log(
      "=================================================================\n",
    );

    // 8. Formatez ici la chaîne de contexte finale transmise au LLM Générateur SQL
    // 1. Mise en forme explicite de chaque table : Nom de la table -> Ses colonnes
    const formattedTables = tables
      .map((t) => {
        // Récupération du nom de la table depuis les métadonnées (ex: "dwh.fait_mep")
        const tableName =
          t.metadata?.tableName || t.metadata?.id || "Table Inconnue";
        return `TABLE : ${tableName}\nCOLONNES ET DESCRIPTION :\n${t.pageContent}`;
      })
      .join("\n\n-----------------------------------\n\n");

    // 2. Assemblage dans formattedContextForLLM
    const formattedContextForLLM = `
=== SCHÉMA DES TABLES AUTORISÉES (AVEC LEURS COLONNES) ===
${formattedTables}

=== RÈGLES MÉTIER ET CONDITIONS DE JOINTURE ===
${rules.map((r) => r.pageContent).join("\n\n")}

=== EXEMPLES DE REQUÊTES VALIDES (FEW-SHOT) ===
${triplets
  .map(
    (t) =>
      `Exemple:\nQuestion: ${t.pageContent}\nSQL: ${t.metadata?.sql || ""}`,
  )
  .join("\n\n")}

=== CONTRÂINTES DE SÉCURITÉ ET FILTRES STRICTS (RBAC) ===
- COLONNES STRICTEMENT INTERDITES (NE PAS UTILISER) : ${
      forbiddenColumns.length > 0 ? forbiddenColumns.join(", ") : "Aucune"
    }
- FILTRES PARTITIONNEMENT OBLIGATOIRES (À INCLURE DANS LE WHERE) :
${activeFilters.length > 0 ? activeFilters.join("\n") : "Aucun"}
`;

    // F. Instantication du LLM Générateur de SQL (ex: qwen2.5:14b, codellama, ou mistral)
    console.log("🤖 2. Génération de la requête SQL par le LLM...");
    const sqlGeneratorLLM = new Ollama({
      model: "qwen2.5:7b", // Ajustez selon les modèles installés chez vous (ex: qwen2.5-coder)
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      temperature: 0, // Température 0 obligatoire pour du code déterministe
    });

    const finalPrompt = buildSqlGenerationPrompt(
      question,
      formattedContextForLLM,
    );
    const response = await sqlGeneratorLLM.invoke(finalPrompt);

    // G. Nettoyage de la sortie (pour supprimer d'éventuelles balises ```sql ... ```)
    const cleanSql = response
      .replace(/```sql/g, "")
      .replace(/```/g, "")
      .trim();

    console.log(
      "\n=================== REQUÊTE SQL GÉNÉRÉE ===================",
    );
    console.log(cleanSql);
    console.log(
      "===========================================================\n",
    );

    // return cleanSql;

    return {
      formattedContextForLLM,
      tables,
      rules,
      triplets,
      forbiddenColumns,
      activeFilters,
      cleanSql,
    };
  } catch (error) {
    console.error("❌ ERREUR LORS DU DEBOGAGE RAG :", error);
  }
}

// Test
queryRAG(
  "Supprime les lignes de la table dwh.fait_encours_credit où l'impayé es nulle",
  "directeur_agence",
  "30000",
);
// queryRAG(
//   "Donne-moi le TEG appliqué sur les dossiers de crédit de mon agence",
//   "directeur_agence",
//   "30000",
// );
