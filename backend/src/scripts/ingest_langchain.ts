import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { Document } from "@langchain/core/documents";
import { fileURLToPath } from "url";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { LanceDB } from "@langchain/community/vectorstores/lancedb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("=== Ingestion Vectorielle Officielle LangChain ===");

  // Initialisation standard recommandée des embeddings Google
  const embeddings = new GoogleGenerativeAIEmbeddings({
    modelName: "gemini-embedding-001",
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  });

  const dataDir = path.join(__dirname, "../data");
  // const dwhPath = path.join(dataDir, "metadonnées_dwh_staging.json");
  // const tripletsPath = path.join(dataDir, "triplets_data_staging.json");
  const dwhPath = path.join(dataDir, "metadonnees_dwh.json");
  const tripletsPath = path.join(dataDir, "triplets_data.json");
  const docs: Document[] = [];

  // --- PARSING DES FICHIERS ---
  // if (fs.existsSync(dwhPath)) {
  //   const dwhData = JSON.parse(fs.readFileSync(dwhPath, "utf-8"));
  //   if (dwhData.tables_staging) {
  //     dwhData.tables_staging.forEach((table: any) => {
  //       docs.push(
  //         new Document({
  //           pageContent: JSON.stringify(table, null, 2),
  //           metadata: {
  //             id: `table_${table.nom_table}`,
  //             type: "metadata_table",
  //             domaine: "dwh_structure",
  //           },
  //         }),
  //       );
  //     });
  //   }
  //   if (dwhData.regles_metier_globales_staging) {
  //     dwhData.regles_metier_globales_staging.forEach(
  //       (regle: any, index: number) => {
  //         docs.push(
  //           new Document({
  //             pageContent: JSON.stringify(regle, null, 2),
  //             metadata: {
  //               id: `regle_metier_${index}`,
  //               type: "regle_metier",
  //               domaine: "business_rules",
  //             },
  //           }),
  //         );
  //       },
  //     );
  //   }
  // }
  if (fs.existsSync(dwhPath)) {
    const dwhData = JSON.parse(fs.readFileSync(dwhPath, "utf-8"));
    if (dwhData.tables_dwh) {
      dwhData.tables_dwh.forEach((table: any) => {
        docs.push(
          new Document({
            pageContent: JSON.stringify(table, null, 2),
            metadata: {
              id: `table_${table.nom_table}`,
              type: "metadata_table",
              domaine: "dwh_structure",
            },
          }),
        );
      });
    }
    if (dwhData.regles_metier_globales) {
      dwhData.regles_metier_globales.forEach((regle: any, index: number) => {
        docs.push(
          new Document({
            pageContent: JSON.stringify(regle, null, 2),
            metadata: {
              id: `regle_metier_${index}`,
              type: "regle_metier",
              domaine: "business_rules",
            },
          }),
        );
      });
    }
  }

  // if (fs.existsSync(tripletsPath)) {
  //   const tripletsData = JSON.parse(fs.readFileSync(tripletsPath, "utf-8"));
  //   if (tripletsData.triplets_extension) {
  //     tripletsData.triplets_extension.forEach((triplet: any) => {
  //       docs.push(
  //         new Document({
  //           pageContent: `Question: ${triplet.question}\nSQL: ${triplet.sql}\nVisualisation: ${triplet.visualisation}\nIntention: ${triplet.intention}`,
  //           metadata: {
  //             id: String(triplet.id),
  //             type: "triplet_fewshot",
  //             domaine: String(triplet.domaine || "general"),
  //           },
  //         }),
  //       );
  //     });
  //   }
  // }
  if (fs.existsSync(tripletsPath)) {
    const tripletsData = JSON.parse(fs.readFileSync(tripletsPath, "utf-8"));
    if (tripletsData.triplets_extension) {
      tripletsData.triplets_extension.forEach((triplet: any) => {
        docs.push(
          new Document({
            pageContent: `Question: ${triplet.question}\nSQL: ${triplet.sql}\nVisualisation: ${triplet.visualisation}\nIntention: ${triplet.intention}`,
            metadata: {
              id: String(triplet.id),
              type: "triplet_fewshot",
              domaine: String(triplet.domaine || "general"),
            },
          }),
        );
      });
    }
  }

  console.log(
    `[LangChain] Nombre de documents prêts à l'indexation : ${docs.length}`,
  );
  if (docs.length === 0) return;

  const dbPath = path.join(dataDir, "lancedb");
  // const tableName = "langchain_vectorstore_staging"; // Nom de table propre conforme aux standards
  const tableName = "langchain_vectorstore"; // Nom de table propre conforme aux standards

  console.log(
    `[LanceDB] Génération des embeddings et création automatique de la table via LangChain...`,
  );

  // Application stricte de la syntaxe de la documentation : LanceDB.fromDocuments
  const vectorStore = await LanceDB.fromDocuments(docs, embeddings, {
    uri: dbPath,
    tableName: tableName,
  });

  console.log("=== Ingestion terminée avec succès ! La base est prête. ===");
}

main().catch(console.error);
