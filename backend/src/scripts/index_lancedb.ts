import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { Document } from "@langchain/core/documents";
import { fileURLToPath } from "url";
import { LanceDB } from "@langchain/community/vectorstores/lancedb";
import { OllamaEmbeddings } from "@langchain/ollama";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("=== Ingestion Vectorielle LanceDB avec LangChain ===");

  const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  });

  const dataDir = path.join(__dirname, "../data");
  const dwhPath = path.join(dataDir, "metadonnees_dwh.json");
  const tripletsPath = path.join(dataDir, "triplets_data.json");
  const rawDocs: Document[] = [];

  // --- 1. PARSING DE METADONNEES_DWH.JSON ---
  if (fs.existsSync(dwhPath)) {
    const dwhData = JSON.parse(fs.readFileSync(dwhPath, "utf-8"));

    // Processing des tables
    // Dans ingest_langchain_2.ts
    // --- DANS index_lancedb.ts ---

    // Processing des tables
    if (dwhData.tables_dwh) {
      dwhData.tables_dwh.forEach((table: any) => {
        const fullTableName = table.table.startsWith("dwh.")
          ? table.table
          : `dwh.${table.table}`;

        const colonnesTexte = Array.isArray(table.colonnes)
          ? table.colonnes
              .map((c: any) => `${c.nom || c.name}: ${c.description || ""}`)
              .join(", ")
          : "";

        const tagsTexte = Array.isArray(table.tags)
          ? table.tags.join(", ")
          : "";

        // Incursion explicite des TAGS dans le pageContent pour l'embedding
        rawDocs.push(
          new Document({
            pageContent: `Table du Data Warehouse: ${fullTableName}\nNom: ${table.table}\nMots-clés / Tags: ${tagsTexte}\nDomaine: ${table.domaine || "général"}\nDescription: ${table.description_courte || ""} ${table.description_longue || ""}\nChamps et colonnes: ${colonnesTexte}`,
            metadata: {
              id: `table_${fullTableName}`,
              type: "metadata_table",
              domaine: table.domaine || "dwh_structure",
              tableName: fullTableName,
            },
          }),
        );
      });
    }

    // Processing des règles métier
    if (dwhData.regles_metier_globales) {
      dwhData.regles_metier_globales.forEach((regle: any, index: number) => {
        rawDocs.push(
          new Document({
            pageContent: `Règle Métier [${regle.id}]: ${regle.regle}\nExemple SQL: ${regle.exemple_sql || ""}`,
            metadata: {
              id: `regle_${regle.id || index}`,
              type: "regle_metier",
              domaine: "business_rules",
            },
          }),
        );
      });
    }

    // Processing des jointures clés
    if (dwhData.jointures_cles) {
      dwhData.jointures_cles.forEach((jointure: any, index: number) => {
        rawDocs.push(
          new Document({
            pageContent: `Jointure entre ${jointure.table_source} et ${jointure.table_cible}: ${jointure.description}\nCondition: ${jointure.condition_sql}`,
            metadata: {
              id: `jointure_${index}`,
              type: "jointure_cle",
              domaine: "dwh_structure",
            },
          }),
        );
      });
    }
  }

  // --- 2. PARSING DE TRIPLETS_DATA.JSON ---
  if (fs.existsSync(tripletsPath)) {
    const tripletsData = JSON.parse(fs.readFileSync(tripletsPath, "utf-8"));
    if (tripletsData.triplets_extension) {
      tripletsData.triplets_extension.forEach((triplet: any) => {
        rawDocs.push(
          new Document({
            // On vectorise la question et l'intention pour la pertinence sémantique
            pageContent: `Question: ${triplet.question}\nIntention: ${triplet.intention || ""}`,
            metadata: {
              id: String(triplet.id),
              type: "triplet_fewshot",
              domaine: String(triplet.domaine || "general"),
              sql: triplet.sql, // SQL conservé dans les métadonnées
              visualisation:
                triplet.visualisation_conseillee || triplet.visualisation || "",
            },
          }),
        );
      });
    }
  }

  console.log(`[LangChain] Documents bruts chargés : ${rawDocs.length}`);
  if (rawDocs.length === 0) return;

  // Découpage préventif des gros blocs de texte
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 150,
  });

  const docs = await splitter.splitDocuments(rawDocs);
  console.log(`[LangChain] Chunks prêts à être indexés : ${docs.length}`);

  const dbPath = path.join(dataDir, "lancedb");
  const tableName = "langchain_vectorstore";

  console.log(
    `[LanceDB] Ingestion et génération des vector embeddings via Ollama...`,
  );

  await LanceDB.fromDocuments(docs, embeddings, {
    uri: dbPath,
    tableName: tableName,
  });

  console.log(
    "=== Ingestion terminée avec succès ! La base LanceDB est prête. ===",
  );
}

main().catch(console.error);
