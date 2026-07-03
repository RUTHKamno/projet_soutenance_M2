import fetch from "node-fetch";

// Remplace par tes vraies valeurs si elles sont différentes
const SUPERSET_URL = "http://localhost:8088";
const USERNAME = "admin";
const PASSWORD = "general";

async function discoverDatabaseIds() {
  try {
    console.log("⏳ Connexion à l'API Superset...");

    // 1. Authentification pour obtenir l'Access Token
    const loginRes = await fetch(`${SUPERSET_URL}/api/v1/security/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: USERNAME,
        password: PASSWORD,
        provider: "db",
      }),
    });

    if (!loginRes.ok) {
      throw new Error(`Erreur d'authentification : ${loginRes.statusText}`);
    }

    const loginData = await loginRes.json();
    const token = loginData.access_token;
    console.log("🔑 Authentification réussie ! Token obtenu.");

    // 2. Requête pour lister toutes les bases de données connectées
    console.log("🔍 Récupération de la liste des bases de données...");
    const dbRes = await fetch(`${SUPERSET_URL}/api/v1/database/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!dbRes.ok) {
      throw new Error(`Erreur récupération bases : ${dbRes.statusText}`);
    }

    const dbData = await dbRes.json();

    console.log("\n==================================================");
    console.log("🎯 COPIE L'ID DE TA BASE DE DONNÉES CI-DESSOUS :");
    console.log("==================================================");

    if (dbData.result && dbData.result.length > 0) {
      dbData.result.forEach((db) => {
        console.log(
          `➡️  ID : [ ${db.id} ]  |  Nom dans Superset : "${db.database_name}"  | Engine : ${db.backend}`,
        );
      });
    } else {
      console.log(
        "Aucune base de données trouvée ou l'utilisateur n'a pas les droits.",
      );
    }
    console.log("==================================================\n");
  } catch (error) {
    console.error("💥 Une erreur est survenue :", error.message);
  }
}

discoverDatabaseIds();
