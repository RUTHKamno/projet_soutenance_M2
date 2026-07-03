// src/scripts/test_db.ts
import 'dotenv/config';
import pg from "pg";
const { Client } = pg;

const client = new Client({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

console.log("Config utilisée :", {
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

client.connect()
  .then(() => { console.log("✅ Connexion réussie !"); client.end(); })
  .catch(err => console.error("❌ Échec :", err.message));