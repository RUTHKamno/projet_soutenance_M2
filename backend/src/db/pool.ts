// src/db/pool.ts
import pg from "pg";
const { Pool } = pg;

export const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test de connexion au démarrage
pool.connect((err, client, release) => {
  if (err) {
    console.error(`[Pool] ❌ Connexion échouée → host: ${process.env.DB_HOST}, user: ${process.env.DB_USER}`);
    console.error(`[Pool] ❌ Détail : ${err.message}`);
  } else {
    console.log(`[Pool] ✅ Connexion OK → host: ${process.env.DB_HOST}, db: ${process.env.DB_NAME}`);
    release();
  }
});