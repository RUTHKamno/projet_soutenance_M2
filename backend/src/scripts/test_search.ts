import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { LanceDB } from '@langchain/community/vectorstores/lancedb';
import * as lancedb from '@lancedb/lancedb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
  console.log('=== Test de Recherche Vectorielle Officielle ===');

  const embeddings = new GoogleGenerativeAIEmbeddings({
    modelName: 'gemini-embedding-001',
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  });

  const dbPath = path.join(__dirname, '../data/lancedb');
  const tableName = 'langchain_vectorstore';

  console.log(`[LanceDB] Verification de la source locale...`);
  const db = await lancedb.connect(dbPath);
  
  // Open the native table pointer to verify presence
  const table = await db.openTable(tableName);
  const count = await table.countRows();
  console.log(`📊 Lignes détectées physiquement dans la table : ${count}`);

  // Instanciation passing the opened native pointer directly as shown in the doc sheet
  const vectorStore = new LanceDB(embeddings, {
    table: table,
  });

  const query = "Donne-moi l'historique au jour le jour des fonds mis en place comparés aux retraits.";
  console.log(`\n🔍 Requête sémantique RAG : "${query}"`);

  // Execute search stream
  const results = await vectorStore.similaritySearch(query, 5);

  console.log('\n✨ Éléments sémantiques correspondants :');
  if (results.length === 0) {
    console.log('Aucune correspondance trouvée.');
  } else {
    results.forEach((doc, i) => {
      console.log(`\n[Document ${i + 1}] (Type : ${doc.metadata.type || 'Inconnu'})`);
      console.log(doc.pageContent);
      console.log('--------------------------------------------------');
    });
  }
}

test().catch(console.error);
