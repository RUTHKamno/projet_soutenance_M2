import * as lancedb from "@lancedb/lancedb";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const dbUri = process.env.LANCEDB_URI || "./src/data/lancedb_store";

let dbInstance = null;

/**
 * Initialise ou retourne la connexion unique à LanceDB
 */
export async function getLanceDB() {
    if (!dbInstance) {
        try {
            // Se connecte au dossier local (le crée s'il n'existe pas)
            dbInstance = await lancedb.connect(dbUri);
            console.log(`📦 Connecté avec succès à LanceDB (Stockage : ${dbUri})`);
        } catch (error) {
            console.error("❌ Erreur de connexion à LanceDB :", error);
            throw error;
        }
    }
    return dbInstance;
}