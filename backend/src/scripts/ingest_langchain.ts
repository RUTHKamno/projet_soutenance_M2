// import "dotenv/config";
// import * as fs from "fs";
// import * as path from "path";
// import { Document } from "@langchain/core/documents";
// import { fileURLToPath } from "url";
// // import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
// import { LanceDB } from "@langchain/community/vectorstores/lancedb";
// import { OllamaEmbeddings } from "@langchain/ollama";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// async function main() {
//   console.log("=== Ingestion Vectorielle Officielle LangChain ===");

//   // Initialisation standard recommandée des embeddings Google
//   const embeddings = new OllamaEmbeddings({
//     model: "nomic-embed-text", // Remplace par ton modèle d'embedding (ex: "bge-m3", "nomic-embed-text")
//     baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
//   });

//   const dataDir = path.join(__dirname, "../data");
//   // const dwhPath = path.join(dataDir, "metadonnées_dwh_staging.json");
//   // const tripletsPath = path.join(dataDir, "triplets_data_staging.json");
//   const dwhPath = path.join(dataDir, "metadonnees_dwh.json");
//   const tripletsPath = path.join(dataDir, "triplets_data.json");
//   const docs: Document[] = [];

//   // --- PARSING DES FICHIERS ---
//   // if (fs.existsSync(dwhPath)) {
//   //   const dwhData = JSON.parse(fs.readFileSync(dwhPath, "utf-8"));
//   //   if (dwhData.tables_staging) {
//   //     dwhData.tables_staging.forEach((table: any) => {
//   //       docs.push(
//   //         new Document({
//   //           pageContent: JSON.stringify(table, null, 2),
//   //           metadata: {
//   //             id: `table_${table.nom_table}`,
//   //             type: "metadata_table",
//   //             domaine: "dwh_structure",
//   //           },
//   //         }),
//   //       );
//   //     });
//   //   }
//   //   if (dwhData.regles_metier_globales_staging) {
//   //     dwhData.regles_metier_globales_staging.forEach(
//   //       (regle: any, index: number) => {
//   //         docs.push(
//   //           new Document({
//   //             pageContent: JSON.stringify(regle, null, 2),
//   //             metadata: {
//   //               id: `regle_metier_${index}`,
//   //               type: "regle_metier",
//   //               domaine: "business_rules",
//   //             },
//   //           }),
//   //         );
//   //       },
//   //     );
//   //   }
//   // }
//   if (fs.existsSync(dwhPath)) {
//     const dwhData = JSON.parse(fs.readFileSync(dwhPath, "utf-8"));
//     if (dwhData.tables_dwh) {
//       dwhData.tables_dwh.forEach((table: any) => {
//         docs.push(
//           new Document({
//             pageContent: JSON.stringify(table, null, 2),
//             metadata: {
//               id: `table_${table.nom_table}`,
//               type: "metadata_table",
//               domaine: "dwh_structure",
//             },
//           }),
//         );
//       });
//     }
//     if (dwhData.regles_metier_globales) {
//       dwhData.regles_metier_globales.forEach((regle: any, index: number) => {
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
//       });
//     }
//   }

//   // if (fs.existsSync(tripletsPath)) {
//   //   const tripletsData = JSON.parse(fs.readFileSync(tripletsPath, "utf-8"));
//   //   if (tripletsData.triplets_extension) {
//   //     tripletsData.triplets_extension.forEach((triplet: any) => {
//   //       docs.push(
//   //         new Document({
//   //           pageContent: `Question: ${triplet.question}\nSQL: ${triplet.sql}\nVisualisation: ${triplet.visualisation}\nIntention: ${triplet.intention}`,
//   //           metadata: {
//   //             id: String(triplet.id),
//   //             type: "triplet_fewshot",
//   //             domaine: String(triplet.domaine || "general"),
//   //           },
//   //         }),
//   //       );
//   //     });
//   //   }
//   // }
//   if (fs.existsSync(tripletsPath)) {
//     const tripletsData = JSON.parse(fs.readFileSync(tripletsPath, "utf-8"));
//     if (tripletsData.triplets_extension) {
//       tripletsData.triplets_extension.forEach((triplet: any) => {
//         docs.push(
//           new Document({
//             pageContent: `Question: ${triplet.question}\nSQL: ${triplet.sql}\nVisualisation: ${triplet.visualisation}\nIntention: ${triplet.intention}`,
//             metadata: {
//               id: String(triplet.id),
//               type: "triplet_fewshot",
//               domaine: String(triplet.domaine || "general"),
//             },
//           }),
//         );
//       });
//     }
//   }

//   console.log(
//     `[LangChain] Nombre de documents prêts à l'indexation : ${docs.length}`,
//   );
//   if (docs.length === 0) return;

//   const dbPath = path.join(dataDir, "lancedb");
//   // const tableName = "langchain_vectorstore_staging"; // Nom de table propre conforme aux standards
//   const tableName = "langchain_vectorstore"; // Nom de table propre conforme aux standards

//   console.log(
//     `[LanceDB] Génération des embeddings et création automatique de la table via LangChain...`,
//   );

//   // Application stricte de la syntaxe de la documentation : LanceDB.fromDocuments
//   const vectorStore = await LanceDB.fromDocuments(docs, embeddings, {
//     uri: dbPath,
//     tableName: tableName,
//   });

//   console.log("=== Ingestion terminée avec succès ! La base est prête. ===");
// }

// main().catch(console.error);

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
  console.log("=== Ingestion Vectorielle Officielle LangChain ===");

  // 1. Initialisation avec contexte étendu
  // 1. Initialisation avec le paramètre num_ctx à la racine
  const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  });

  const dataDir = path.join(__dirname, "../data");
  const dwhPath = path.join(dataDir, "metadonnees_dwh.json");
  const tripletsPath = path.join(dataDir, "triplets_data.json");
  const rawDocs: Document[] = [];

  // --- PARSING DES FICHIERS ---
  if (fs.existsSync(dwhPath)) {
    const dwhData = JSON.parse(fs.readFileSync(dwhPath, "utf-8"));
    if (dwhData.tables_dwh) {
      dwhData.tables_dwh.forEach((table: any) => {
        rawDocs.push(
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
        rawDocs.push(
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

  if (fs.existsSync(tripletsPath)) {
    const tripletsData = JSON.parse(fs.readFileSync(tripletsPath, "utf-8"));
    if (tripletsData.triplets_extension) {
      tripletsData.triplets_extension.forEach((triplet: any) => {
        rawDocs.push(
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

  console.log(`[LangChain] Documents bruts chargés : ${rawDocs.length}`);
  if (rawDocs.length === 0) return;

  // 2. Découpage préventif pour ne dépasser aucun seuil d'embedding
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 2000,
    chunkOverlap: 200,
  });

  const docs = await splitter.splitDocuments(rawDocs);
  console.log(
    `[LangChain] Nombre de chunks prêts à l'indexation : ${docs.length}`,
  );

  const dbPath = path.join(dataDir, "lancedb");
  const tableName = "langchain_vectorstore";

  console.log(
    `[LanceDB] Génération des embeddings Ollama et création du store...`,
  );

  await LanceDB.fromDocuments(docs, embeddings, {
    uri: dbPath,
    tableName: tableName,
  });

  console.log("=== Ingestion terminée avec succès ! La base est prête. ===");
}

main().catch(console.error);
