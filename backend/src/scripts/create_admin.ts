import "dotenv/config"; // -- pour qu'il puisse charger les variables d'environnement

/**
 * Script one-shot pour créer le compte administrateur.
 * Usage : npx ts-node src/scripts/createAdmin.ts
 */
import bcrypt from "bcrypt";
import { pool } from "../db/pool.js";

async function main() {
  const email     = process.env.ADMIN_EMAIL    || "ruth@beit-africa.com";
  const password  = process.env.ADMIN_PASSWORD || "Admin@RuthyStore2026!";
  const firstName = "Ruth";
  const lastName  = "Kamche";

  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO users (email, password_hash, role, first_name, last_name)
     VALUES ($1, $2, 'admin', $3, $4)
     ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = 'admin'`,
    [email, hash, firstName, lastName]
  );

  console.log(`✅ Admin créé : ${email}`);
  console.log(`🔑 Mot de passe : ${password}`);
  await pool.end();
}

main().catch(console.error);