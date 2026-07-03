#!/usr/bin/env node
import dotenv from "dotenv";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    // Lire le fichier de migration SQL
    const migrationPath = path.join(
      __dirname,
      "migrations",
      "001_add_report_and_chart_config.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    console.log("⏳ Exécution de la migration...");
    await client.query(migrationSQL);
    console.log("✅ Migration exécutée avec succès !");

    // Vérifier que les colonnes ont été ajoutées
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'chat_messages' 
      AND column_name IN ('report', 'chart_config')
    `);

    console.log("\n📋 Colonnes vérifiées :");
    result.rows.forEach((row) => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    if (result.rows.length === 2) {
      console.log("\n✅ Toutes les colonnes sont présentes et correctes !");
    } else {
      console.warn(
        "\n⚠️ Attention: Pas toutes les colonnes attendues sont présentes.",
      );
    }
  } catch (err) {
    console.error("❌ Erreur lors de la migration :", err.message);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

runMigrations();
