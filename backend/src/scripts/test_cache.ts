// src/scripts/test_cache.ts
import 'dotenv/config';
import { 
  getCacheExact, 
  getCacheSemantic, 
  setCacheEntry, 
  getCacheStats, 
  invalidateCache, 
  closeCache 
} from "../cache/sqlCache.js";

// On simule une interface SQLQueryResult pour le test
const mockQueryResult = {
  userQuestion: "Quel est le total des encours par agence ?",
  role: "admin",
  agence: "Yaounde",
  sql: "SELECT agence, SUM(encours) FROM dwh_soutenance GROUP BY agence;",
  visualisation: "echarts_bar",
  data: [
    { agence: "Yaounde", encours: 25000000 },
    { agence: "Douala", encours: 42000000 }
  ]
};

async function runCacheTest() {
  console.log("🚀 --- DÉBUT DU TEST DU SYSTEME DE CACHE --- 🚀\n");

  // 0. Nettoyage initial pour repartir à zéro
  console.log("🧹 Vidage du cache existant...");
  await invalidateCache();

  const { userQuestion, role, agence } = mockQueryResult;

  // 1. TEST 1 : Vérification d'un Cache MISS
  console.log("\n--------------------------------------------------");
  console.log("📝 TEST 1 : Vérification initiale (Doit être un MISS)");
  const missCheck = await getCacheExact(userQuestion, role, agence);
  if (missCheck === null) {
    console.log("🔹 Résultat : ❌ MISS Confirmé. C'est normal, le cache est vide.");
  } else {
    console.log("⚠️ Résultat inattendu : Donnée trouvée alors que le cache vient d'être vidé.");
  }

  // 2. TEST 2 : Stockage dans Redis
  console.log("\n--------------------------------------------------");
  console.log("💾 TEST 2 : Écriture de la requête validée dans le cache...");
  await setCacheEntry(mockQueryResult);

  // 3. TEST 3 : Cache HIT Exact
  console.log("\n--------------------------------------------------");
  console.log("⚡ TEST 3 : Seconde tentative avec la question EXACTE (Doit être un HIT)");
  const hitExact = await getCacheExact(userQuestion, role, agence);
  if (hitExact) {
    console.log(`🔹 Résultat : 🎉 HIT EXACT RÉUSSI !`);
    console.log(`   - SQL récupéré : ${hitExact.sql}`);
    console.log(`   - Compteur de Hits : ${hitExact.hitCount}`);
  } else {
    console.log("❌ Échec : Le cache exact n'a pas retrouvé l'entrée.");
  }

  // 4. TEST 4 : Tolérance à la casse et ponctuation (Normalisation de la clé)
  console.log("\n--------------------------------------------------");
  console.log("🔤 TEST 4 : Test de normalisation (Espaces, Majuscules, Ponctuation)");
  const messyQuestion = "  QUEL est le total des encours par agence ??  ";
  const hitNormalisation = await getCacheExact(messyQuestion, role, agence);
  if (hitNormalisation) {
    console.log("🔹 Résultat : ✅ HIT Réussi grâce à la normalisation de la chaîne !");
  } else {
    console.log("❌ Échec : La ponctuation ou les espaces ont bloqué le cache exact.");
  }

  // 5. TEST 5 : Cache HIT Sémantique (Via LanceDB)
  console.log("\n--------------------------------------------------");
  console.log("🧠 TEST 5 : Test du Cache Sémantique (Question reformulée)");
  console.log("Remarque : Ce test nécessite que ton embedding soit aussi poussé dans LanceDB lors du setCacheEntry.");
  
  const semanticQuestion = "Donne-moi la somme des encours pour chaque agence";
  // On interroge le cache sémantique avec un seuil de distance L2 à 0.15 (~92% de proximité)
  const hitSemantic = await getCacheSemantic(semanticQuestion, role, agence, 0.15);
  
  if (hitSemantic) {
    console.log(`🔹 Résultat : 🔮 HIT SÉMANTIQUE RÉUSSI !`);
    console.log(`   - Question d'origine trouvée : "${hitSemantic.question}"`);
    console.log(`   - SQL associé : ${hitSemantic.sql}`);
  } else {
    console.log("ℹ️ MISS Sémantique : Soit la distance vectorielle est > 0.15, soit l'embedding n'est pas encore synchronisé dans LanceDB.");
  }

  // 6. Affichage des statistiques de fin
  console.log("\n--------------------------------------------------");
  console.log("📊 --- STATISTIQUES DU CACHE REDIS ---");
  const stats = await getCacheStats();
  console.log(`Total de clés SQL actives en cache : ${stats.totalKeys}`);
  console.log("Exemples de clés Redis générées :", stats.sampleKeys);

  // Fermeture propre de la connexion Redis
  await closeCache();
  console.log("\n🛑 --- FIN DES TESTS --- 🛑");
}

// Exécution du script
runCacheTest().catch(err => {
  console.error("❌ Le script de test a planté :", err);
});