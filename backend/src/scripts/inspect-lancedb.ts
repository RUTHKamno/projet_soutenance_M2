import * as path from "path";
import { fileURLToPath } from "url";
import * as lancedb from "@lancedb/lancedb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ajustez le chemin vers votre dossier de données LanceDB
const dbPath = path.join(__dirname, "../data/lancedb");
const tableName = "langchain_vectorstore_staging";

async function inspectTable() {
  try {
    console.log(`[Inspection] 🔌 Connexion à LanceDB : ${dbPath}`);
    const db = await lancedb.connect(dbPath);

    // 1. Lister toutes les tables existantes dans la base
    const tableNames = await db.tableNames();
    console.log(
      `[Inspection] 🗄️ Tables disponibles dans LanceDB :`,
      tableNames,
    );

    if (!tableNames.includes(tableName)) {
      console.error(`❌ La table "${tableName}" n'existe pas !`);
      return;
    }

    const table = await db.openTable(tableName);

    // 2. Nombre total d'entrées
    const count = await table.countRows();
    console.log(
      `[Inspection] 📊 Nombre d'enregistrements dans "${tableName}" : ${count}\n`,
    );

    // 3. Récupérer les 10 premières lignes sans filtre vectoriel
    const rows = await table.query().limit(10).toArray();

    console.log("======== EXTRACT DES DONNÉES RÉELLES EN BASE ========\n");
    rows.forEach((row, index) => {
      console.log(`--- Enregistrement #${index + 1} ---`);
      // LangChain stocke généralement le texte sous 'text' ou 'pageContent'
      console.log("📄 Contenu texte :", row.text || row.pageContent);
      console.log("🏷️ Métadonnées :", row.metadata);
      console.log("----------------------------------------------------\n");
    });
  } catch (error) {
    console.error("[Inspection] ❌ Erreur :", error);
  }
}

inspectTable();
