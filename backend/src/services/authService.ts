// import bcrypt from "bcrypt";
// import jwt, { JwtPayload } from "jsonwebtoken";
// import axios from "axios";
// import {
//   AdminUpdateUserDto,
//   CreateUserDto,
//   UpdateUserDto,
//   User,
// } from "../interfaces/auth.interface.js";
// import { pool } from "../db/pool.js";
// import { getSupersetHeaders } from "./supersetClient.js";

// const JWT_SECRET = process.env.JWT_SECRET || "SUPER_SECRET_CEPI_2026_KEY";
// const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
// const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || "RuthyStore@2026";
// const SALT_ROUNDS = 12;

// // ------------ Superset -------------
// const SUPERSET_URL = process.env.SUPERSET_URL || "http://localhost:8088";
// const SUPERSET_ADMIN_USERNAME = process.env.SUPERSET_ADMIN_USERNAME || "admin";
// const SUPERSET_ADMIN_PASSWORD =
//   process.env.SUPERSET_ADMIN_PASSWORD || "general";
// const DASHBOARD_ID = process.env.DASHBOARD_ID || "ton_uuid_ou_id_de_dashboard"; // L'ID du Dashboard à intégrer

// // ─── Helpers ────────────────────────────────────────────────────────────────

// function buildToken(user: User): string {
//   const payload: JwtPayload = {
//     userId: user.id,
//     email: user.email,
//     role: user.role,
//     firstName: user.first_name,
//     lastName: user.last_name,
//     contextInfo: { agence_utilisateur: user.agence },
//   };
//   return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
// }

// function sanitizeUser(user: User) {
//   const { password_hash, ...safe } = user;
//   return safe;
// }

// // ─── Service ────────────────────────────────────────────────────────────────

// // Colonnes candidates représentant l'agence, par ordre de priorité de détection
// const AGENCE_COLUMN_CANDIDATES = [
//   "Agence",
//   "agence",
//   "age",
//   "agence_utilisateur",
//   "code_agence",
// ];

// async function buildRlsClauses(
//   numericDashboardId: number,
//   agence: string,
//   headers: Record<string, string>,
// ): Promise<{ clause: string; dataset: number }[]> {
//   const res = await axios.get(
//     `${SUPERSET_URL}/api/v1/dashboard/${numericDashboardId}/datasets`,
//     { headers },
//   );

//   const datasets = res.data.result ?? res.data;

//   console.log(
//     `[RLS DEBUG] ${datasets.length} datasets trouvés pour le dashboard ${numericDashboardId} :`,
//   );
//   datasets.forEach((ds: any) => {
//     const cols = (ds.columns ?? []).map((c: any) => c.column_name);
//     console.log(
//       `  - Dataset [${ds.id}] "${ds.table_name}" — colonnes: ${cols.join(", ")}`,
//     );
//   });
//   const rlsClauses: { clause: string; dataset: number }[] = [];

//   for (const ds of datasets) {
//     const columnNames: string[] = (ds.columns ?? []).map(
//       (c: any) => c.column_name,
//     );
//     const matchedColumn = AGENCE_COLUMN_CANDIDATES.find((c) =>
//       columnNames.includes(c),
//     );

//     if (matchedColumn) {
//       // Échappement basique contre l'injection SQL dans la clause RLS
//       const safeAgence = agence.replace(/'/g, "''");
//       rlsClauses.push({
//         clause: `"${matchedColumn}" = '${safeAgence}'`, // ← quoter le nom de colonne
//         dataset: ds.id, // ← scope la clause à CE dataset précis uniquement
//       });
//     }
//     // Si aucune colonne candidate n'existe (ex: table dim_temps sans notion d'agence),
//     // on ne pousse aucune clause → pas de risque, ce dataset n'a simplement pas
//     // de dimension agence à filtrer.
//   }

//   return rlsClauses;
// }

// export const AuthService = {
//   // connexion au dashboard embed de superset

//   async getSupersetGuestToken(user: {
//     role: string;
//     agence: string | null;
//     email: string;
//     first_name: string;
//     last_name: string;
//     dashboardId: string;
//   }) {
//     try {
//       const DASHBOARD_UUID_TO_NUMERIC_ID: Record<string, number> = {
//         "84e98a10-319d-4073-9532-e46bc1bd6db2": 2, // Décaissements
//         "46b21232-cf43-4195-82be-81e77920742a": 1, // Crédit
//       };
//       // 1. Authentification du backend auprès de l'API Superset pour obtenir un Access Token temporaire
//       // const loginResponse = await axios.post(
//       //   `${SUPERSET_URL}/api/v1/security/login`,
//       //   {
//       //     username: SUPERSET_ADMIN_USERNAME,
//       //     password: SUPERSET_ADMIN_PASSWORD,
//       //     provider: "db",
//       //   },
//       // );

//       // const accessToken = loginResponse.data.access_token;
//       // ── Auth via la session cookie déjà validée (plus de login Bearer ici) ──
//       const authHeaders = await getSupersetHeaders();

//       const targetDashboardId = user.dashboardId || DASHBOARD_ID;
//       const numericDashboardId =
//         DASHBOARD_UUID_TO_NUMERIC_ID[targetDashboardId];

//       let rlsClauses: { clause: string; dataset: number }[] = [];
//       // 2. Préparation des clauses RLS dynamiques en fonction du rôle de l'utilisateur

//       // Si c'est un directeur d'agence, on lui applique la restriction sur son agence
//       // ── Construction dynamique des clauses RLS, dataset par dataset ─────────
//       console.log("before adding rlsClauses");
//       if (user.role === "directeur_agence" && user.agence) {
//         if (!numericDashboardId) {
//           console.warn(
//             `[RLS] Aucun ID numérique connu pour l'UUID ${targetDashboardId} — RLS non appliquée !`,
//           );
//           // ⚠️ Décision de sécurité : voir remarque ci-dessous
//         } else {
//           console.log(
//             "[RLS] Construction des clauses RLS pour l'agence:",
//             user.agence,
//             "[supersetDashboard]",
//             numericDashboardId,
//           );
//           rlsClauses = await buildRlsClauses(
//             numericDashboardId,
//             user.agence,
//             authHeaders,
//           );
//           console.log(
//             "[RLS] Clauses générées :",
//             JSON.stringify(rlsClauses, null, 2),
//           );
//           if (rlsClauses.length === 0) {
//             console.warn(
//               "[RLS] ⚠️ AUCUNE clause générée — aucun dataset du dashboard n'a de colonne agence reconnue !",
//             );
//           }
//         }
//       }
//       const loginResponse = await axios.post(
//         `${SUPERSET_URL}/api/v1/security/login`,
//         {
//           username: SUPERSET_ADMIN_USERNAME,
//           password: SUPERSET_ADMIN_PASSWORD,
//           provider: "db",
//         },
//       );
//       const guestAccessToken = loginResponse.data.access_token;

//       // const rlsClauses =
//       //   user.role === "directeur_agence" && user.agence
//       //     ? await buildRlsClauses(targetDashboardId, user.agence, authHeaders)
//       //     : [];
//       // console.log(
//       //   "[RLSCLAUSES GET SUPERSET GUEST TOKEN]rlsClauses applicated",
//       //   rlsClauses,
//       // );
//       // if (user.role === "directeur_agence" && user.agence) {
//       //   rlsClauses.push({
//       //     clause: `agence = '${user.agence}'`, // Adapte le nom de la colonne 'agence' selon ta table SQL
//       //   });
//       // }
//       // Pour l'admin, direction_generale, etc., rlsClauses reste vide -> accès total.

//       // 3. Demande du Guest Token à Superset
//       const guestTokenResponse = await axios.post(
//         `${SUPERSET_URL}/api/v1/security/guest_token/`,
//         {
//           user: {
//             username: user.email,
//             first_name: user.first_name,
//             last_name: user.last_name,
//           },
//           resources: [{ type: "dashboard", id: targetDashboardId }],
//           rls: rlsClauses,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${guestAccessToken}`,
//             "Content-Type": "application/json",
//           },
//         },
//       );
//       // const guestTokenResponse = await axios.post(
//       //   `${SUPERSET_URL}/api/v1/security/guest_token/`,
//       //   {
//       //     user: {
//       //       username: user.email,
//       //       first_name: user.first_name,
//       //       last_name: user.last_name,
//       //     },
//       //     resources: [
//       //       {
//       //         type: "dashboard",
//       //         id: user.dashboardId || DASHBOARD_ID,
//       //       },
//       //     ],
//       //     rls: rlsClauses,
//       //   },
//       //   {
//       //     headers: {
//       //       Authorization: `Bearer ${accessToken}`,
//       //       "Content-Type": "application/json",
//       //     },
//       //   },
//       // );

//       return {
//         guestToken: guestTokenResponse.data.token,
//         dashboardId: user.dashboardId || DASHBOARD_ID,
//         supersetUrl: SUPERSET_URL,
//       };
//     } catch (error: any) {
//       console.error(
//         "Erreur de récupération du Guest Token Superset:",
//         error?.response?.data || error.message,
//       );
//       throw new Error("Impossible de générer le jeton d'accès au Dashboard.");
//     }
//   },

//   /**
//    * ADMIN ONLY — Crée un utilisateur avec mot de passe par défaut.
//    * Retourne le token immédiatement (utile pour onboarding).
//    */
//   async createUser(dto: CreateUserDto) {
//     const { email, first_name, last_name, role, agence = null } = dto;
//     console.log("dto recues", dto);

//     // Vérifier doublon email
//     const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
//       email,
//     ]);
//     if (existing.rows.length > 0) {
//       throw new Error("Un utilisateur avec cet email existe déjà.");
//     }

//     const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

//     const result = await pool.query<User>(
//       `INSERT INTO users (email, password_hash, role, first_name, last_name, agence)
//        VALUES ($1, $2, $3, $4, $5, $6)
//        RETURNING *`,
//       [email, password_hash, role, first_name, last_name, agence],
//     );

//     const user = result.rows[0];
//     const token = buildToken(user);

//     return {
//       user: sanitizeUser(user),
//       token,
//       defaultPassword: DEFAULT_PASSWORD, // À communiquer à l'utilisateur via canal sécurisé
//     };
//   },

//   /**
//    * Connexion — retourne un token JWT signé.
//    */
//   async signIn(email: string, password: string) {
//     const result = await pool.query<User>(
//       "SELECT * FROM users WHERE email = $1",
//       [email],
//     );

//     const user = result.rows[0];

//     if (!user) {
//       throw new Error("Email ou mot de passe incorrect.");
//     }

//     if (!user.is_active) {
//       throw new Error("Ce compte a été désactivé. Contactez l'administrateur.");
//     }

//     const passwordMatch = await bcrypt.compare(password, user.password_hash);
//     if (!passwordMatch) {
//       throw new Error("Email ou mot de passe incorrect.");
//     }

//     const token = buildToken(user);

//     return { user: sanitizeUser(user), token };
//   },

//   /**
//    * Un utilisateur met à jour SES PROPRES infos.
//    * Le rôle est exclu — seul l'admin peut le modifier.
//    */
//   async updateSelf(userId: number, dto: UpdateUserDto) {
//     const fields: string[] = [];
//     const values: any[] = [];
//     let idx = 1;

//     if (dto.first_name !== undefined) {
//       fields.push(`first_name = $${idx++}`);
//       values.push(dto.first_name);
//     }
//     if (dto.last_name !== undefined) {
//       fields.push(`last_name = $${idx++}`);
//       values.push(dto.last_name);
//     }
//     if (dto.agence !== undefined) {
//       fields.push(`agence = $${idx++}`);
//       values.push(dto.agence);
//     }

//     // Changement de mot de passe optionnel
//     if (dto.new_password) {
//       if (!dto.current_password) {
//         throw new Error(
//           "Le mot de passe actuel est requis pour en définir un nouveau.",
//         );
//       }

//       const current = await pool.query<User>(
//         "SELECT password_hash FROM users WHERE id = $1",
//         [userId],
//       );
//       const match = await bcrypt.compare(
//         dto.current_password,
//         current.rows[0].password_hash,
//       );
//       if (!match) {
//         throw new Error("Mot de passe actuel incorrect.");
//       }

//       const newHash = await bcrypt.hash(dto.new_password, SALT_ROUNDS);
//       fields.push(`password_hash = $${idx++}`);
//       values.push(newHash);
//     }

//     if (fields.length === 0) {
//       throw new Error("Aucune donnée à mettre à jour.");
//     }

//     fields.push(`updated_at = NOW()`);
//     values.push(userId);

//     const result = await pool.query<User>(
//       `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
//       values,
//     );

//     const updated = result.rows[0];
//     const token = buildToken(updated); // Nouveau token avec les infos fraîches

//     return { user: sanitizeUser(updated), token };
//   },

//   /**
//    * ADMIN ONLY — Met à jour n'importe quel utilisateur, y compris le rôle.
//    */
//   async adminUpdateUser(targetUserId: number, dto: AdminUpdateUserDto) {
//     const fields: string[] = [];
//     const values: any[] = [];
//     let idx = 1;

//     if (dto.first_name !== undefined) {
//       fields.push(`first_name = $${idx++}`);
//       values.push(dto.first_name);
//     }
//     if (dto.last_name !== undefined) {
//       fields.push(`last_name = $${idx++}`);
//       values.push(dto.last_name);
//     }
//     if (dto.agence !== undefined) {
//       fields.push(`agence = $${idx++}`);
//       values.push(dto.agence);
//     }
//     if (dto.role !== undefined) {
//       fields.push(`role = $${idx++}`);
//       values.push(dto.role);
//     }
//     if (dto.is_active !== undefined) {
//       fields.push(`is_active = $${idx++}`);
//       values.push(dto.is_active);
//     }

//     if (dto.new_password) {
//       const newHash = await bcrypt.hash(dto.new_password, SALT_ROUNDS);
//       fields.push(`password_hash = $${idx++}`);
//       values.push(newHash);
//     }

//     if (fields.length === 0) throw new Error("Aucune donnée à mettre à jour.");

//     fields.push(`updated_at = NOW()`);
//     values.push(targetUserId);

//     const result = await pool.query<User>(
//       `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
//       values,
//     );

//     if (result.rows.length === 0) throw new Error("Utilisateur introuvable.");

//     return { user: sanitizeUser(result.rows[0]) };
//   },

//   /**
//    * Récupère tous les utilisateurs (ADMIN).
//    */
//   async getAllUsers() {
//     const result = await pool.query<User>(
//       "SELECT id, email, role, first_name, last_name, agence, is_active, created_at, updated_at FROM users ORDER BY created_at DESC",
//     );
//     return result.rows;
//   },

//   /**
//    * Récupère un utilisateur par ID.
//    */
//   async getUserById(userId: number) {
//     const result = await pool.query<User>(
//       "SELECT id, email, role, first_name, last_name, agence, is_active, created_at, updated_at FROM users WHERE id = $1",
//       [userId],
//     );
//     if (result.rows.length === 0) throw new Error("Utilisateur introuvable.");
//     return result.rows[0];
//   },
// };

import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import axios from "axios";
import {
  AdminUpdateUserDto,
  CreateUserDto,
  UpdateUserDto,
  User,
} from "../interfaces/auth.interface.js";
import { pool } from "../db/pool.js";
import { getSupersetHeaders } from "./supersetClient.js";

const JWT_SECRET = process.env.JWT_SECRET || "SUPER_SECRET_CEPI_2026_KEY";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || "RuthyStore@2026";
const SALT_ROUNDS = 12;

// ------------ Superset -------------
const SUPERSET_URL = process.env.SUPERSET_URL || "http://localhost:8088";
const SUPERSET_ADMIN_USERNAME = process.env.SUPERSET_ADMIN_USERNAME || "admin";
const SUPERSET_ADMIN_PASSWORD =
  process.env.SUPERSET_ADMIN_PASSWORD || "general";
const DASHBOARD_ID = process.env.DASHBOARD_ID || "ton_uuid_ou_id_de_dashboard"; // L'ID du Dashboard à intégrer

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildToken(user: User): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    firstName: user.first_name,
    lastName: user.last_name,
    contextInfo: { agence_utilisateur: user.agence },
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
}

function sanitizeUser(user: User) {
  const { password_hash, ...safe } = user;
  return safe;
}

// ─── Service ────────────────────────────────────────────────────────────────

// Colonnes candidates représentant l'agence, par ordre de priorité de détection
const AGENCE_COLUMN_CANDIDATES = [
  "Agence",
  "agence",
  "age",
  "agence_utilisateur",
  "code_agence",
];

async function buildRlsClauses(
  numericDashboardId: number,
  agence: string,
  headers: Record<string, string>,
): Promise<{ clause: string; dataset: number }[]> {
  const res = await axios.get(
    `${SUPERSET_URL}/api/v1/dashboard/${numericDashboardId}/datasets`,
    { headers },
  );

  const datasets = res.data.result ?? res.data;

  console.log(
    `[RLS DEBUG] ${datasets.length} datasets trouvés pour le dashboard ${numericDashboardId} :`,
  );
  datasets.forEach((ds: any) => {
    const cols = (ds.columns ?? []).map((c: any) => c.column_name);
    console.log(
      `  - Dataset [${ds.id}] "${ds.table_name}" — colonnes: ${cols.join(", ")}`,
    );
  });
  const rlsClauses: { clause: string; dataset: number }[] = [];

  for (const ds of datasets) {
    const columnNames: string[] = (ds.columns ?? []).map(
      (c: any) => c.column_name,
    );
    const matchedColumn = AGENCE_COLUMN_CANDIDATES.find((c) =>
      columnNames.includes(c),
    );

    if (matchedColumn) {
      // Échappement basique contre l'injection SQL dans la clause RLS
      const safeAgence = agence.replace(/'/g, "''");
      rlsClauses.push({
        clause: `"${matchedColumn}" = '${safeAgence}'`, // ← quoter le nom de colonne
        dataset: ds.id, // ← scope la clause à CE dataset précis uniquement
      });
    }
    // Si aucune colonne candidate n'existe (ex: table dim_temps sans notion d'agence),
    // on ne pousse aucune clause → pas de risque, ce dataset n'a simplement pas
    // de dimension agence à filtrer.
  }

  return rlsClauses;
}

export const AuthService = {
  // connexion au dashboard embed de superset

  async getSupersetGuestToken(user: {
    role: string;
    agence: string | null;
    email: string;
    first_name: string;
    last_name: string;
    dashboardId: string;
  }) {
    try {
      const DASHBOARD_UUID_TO_NUMERIC_ID: Record<string, number> = {
        "84e98a10-319d-4073-9532-e46bc1bd6db2": 2, // Décaissements
        "46b21232-cf43-4195-82be-81e77920742a": 1, // Crédit
      };
      // ── Auth via la session cookie déjà validée (plus de login Bearer ici) ──
      const authHeaders = await getSupersetHeaders();

      const targetDashboardId = user.dashboardId || DASHBOARD_ID;
      const numericDashboardId =
        DASHBOARD_UUID_TO_NUMERIC_ID[targetDashboardId];

      let rlsClauses: { clause: string; dataset: number }[] = [];

      console.log("before adding rlsClauses");
      if (user.role === "directeur_agence" && user.agence) {
        if (!numericDashboardId) {
          console.warn(
            `[RLS] Aucun ID numérique connu pour l'UUID ${targetDashboardId} — RLS non appliquée !`,
          );
        } else {
          console.log(
            "[RLS] Construction des clauses RLS pour l'agence:",
            user.agence,
            "[supersetDashboard]",
            numericDashboardId,
          );
          console.log("[Superset] appel dataset RLS...");
          rlsClauses = await buildRlsClauses(
            numericDashboardId,
            user.agence,
            authHeaders,
          );
          console.log(
            "[RLS] Clauses générées :",
            JSON.stringify(rlsClauses, null, 2),
          );
          if (rlsClauses.length === 0) {
            console.warn(
              "[RLS] ⚠️ AUCUNE clause générée — aucun dataset du dashboard n'a de colonne agence reconnue !",
            );
          }
        }
      }
      console.log("[Superset] appel login...");
      const loginResponse = await axios.post(
        `${SUPERSET_URL}/api/v1/security/login`,
        {
          username: SUPERSET_ADMIN_USERNAME,
          password: SUPERSET_ADMIN_PASSWORD,
          provider: "db",
        },
      );
      const guestAccessToken = loginResponse.data.access_token;
      console.log("[Superset] appel guest_token...");
      const guestTokenResponse = await axios.post(
        `${SUPERSET_URL}/api/v1/security/guest_token/`,
        {
          user: {
            username: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
          },
          resources: [{ type: "dashboard", id: targetDashboardId }],
          rls: rlsClauses,
        },
        {
          headers: {
            Authorization: `Bearer ${guestAccessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      return {
        guestToken: guestTokenResponse.data.token,
        dashboardId: user.dashboardId || DASHBOARD_ID,
        supersetUrl: SUPERSET_URL,
      };
    } catch (error: any) {
      console.error(
        "Erreur de récupération du Guest Token Superset:",
        error?.response?.data || error.message,
      );
      throw new Error("Impossible de générer le jeton d'accès au Dashboard.");
    }
  },

  /**
   * ADMIN ONLY — Crée un utilisateur avec mot de passe par défaut.
   * Retourne le token immédiatement (utile pour onboarding).
   */
  async createUser(dto: CreateUserDto) {
    const { email, first_name, last_name, role, agence = null } = dto;
    console.log("dto recues", dto);

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      throw new Error("Un utilisateur avec cet email existe déjà.");
    }

    const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

    const result = await pool.query<User>(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, agence)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [email, password_hash, role, first_name, last_name, agence],
    );

    const user = result.rows[0];
    const token = buildToken(user);

    return {
      user: sanitizeUser(user),
      token,
      defaultPassword: DEFAULT_PASSWORD, // À communiquer à l'utilisateur via canal sécurisé
    };
  },

  /**
   * Connexion — retourne un token JWT signé.
   */
  async signIn(email: string, password: string) {
    const result = await pool.query<User>(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );

    const user = result.rows[0];

    if (!user) {
      throw new Error("Email ou mot de passe incorrect.");
    }

    if (!user.is_active) {
      throw new Error("Ce compte a été désactivé. Contactez l'administrateur.");
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw new Error("Email ou mot de passe incorrect.");
    }

    const token = buildToken(user);

    // ── Traçabilité pour le Dashboard Admin ────────────────────────────────
    // Best-effort : une erreur d'insertion ne doit jamais bloquer la connexion.
    pool
      .query("INSERT INTO login_events (user_id) VALUES ($1)", [user.id])
      .catch((e: any) =>
        console.error(
          "[signIn] Échec de l'insertion dans login_events:",
          e.message,
        ),
      );

    return { user: sanitizeUser(user), token };
  },

  /**
   * Un utilisateur met à jour SES PROPRES infos.
   * Le rôle est exclu — seul l'admin peut le modifier.
   */
  async updateSelf(userId: number, dto: UpdateUserDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.first_name !== undefined) {
      fields.push(`first_name = $${idx++}`);
      values.push(dto.first_name);
    }
    if (dto.last_name !== undefined) {
      fields.push(`last_name = $${idx++}`);
      values.push(dto.last_name);
    }
    if (dto.agence !== undefined) {
      fields.push(`agence = $${idx++}`);
      values.push(dto.agence);
    }

    if (dto.new_password) {
      if (!dto.current_password) {
        throw new Error(
          "Le mot de passe actuel est requis pour en définir un nouveau.",
        );
      }

      const current = await pool.query<User>(
        "SELECT password_hash FROM users WHERE id = $1",
        [userId],
      );
      const match = await bcrypt.compare(
        dto.current_password,
        current.rows[0].password_hash,
      );
      if (!match) {
        throw new Error("Mot de passe actuel incorrect.");
      }

      const newHash = await bcrypt.hash(dto.new_password, SALT_ROUNDS);
      fields.push(`password_hash = $${idx++}`);
      values.push(newHash);
    }

    if (fields.length === 0) {
      throw new Error("Aucune donnée à mettre à jour.");
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await pool.query<User>(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values,
    );

    const updated = result.rows[0];
    const token = buildToken(updated);

    return { user: sanitizeUser(updated), token };
  },

  /**
   * ADMIN ONLY — Met à jour n'importe quel utilisateur, y compris le rôle.
   */
  async adminUpdateUser(targetUserId: number, dto: AdminUpdateUserDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.first_name !== undefined) {
      fields.push(`first_name = $${idx++}`);
      values.push(dto.first_name);
    }
    if (dto.last_name !== undefined) {
      fields.push(`last_name = $${idx++}`);
      values.push(dto.last_name);
    }
    if (dto.agence !== undefined) {
      fields.push(`agence = $${idx++}`);
      values.push(dto.agence);
    }
    if (dto.role !== undefined) {
      fields.push(`role = $${idx++}`);
      values.push(dto.role);
    }
    if (dto.is_active !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(dto.is_active);
    }

    if (dto.new_password) {
      const newHash = await bcrypt.hash(dto.new_password, SALT_ROUNDS);
      fields.push(`password_hash = $${idx++}`);
      values.push(newHash);
    }

    if (fields.length === 0) throw new Error("Aucune donnée à mettre à jour.");

    fields.push(`updated_at = NOW()`);
    values.push(targetUserId);

    const result = await pool.query<User>(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) throw new Error("Utilisateur introuvable.");

    return { user: sanitizeUser(result.rows[0]) };
  },

  /**
   * Récupère tous les utilisateurs (ADMIN).
   */
  async getAllUsers() {
    const result = await pool.query<User>(
      "SELECT id, email, role, first_name, last_name, agence, is_active, created_at, updated_at FROM users ORDER BY created_at DESC",
    );
    return result.rows;
  },

  /**
   * Récupère un utilisateur par ID.
   */
  async getUserById(userId: number) {
    const result = await pool.query<User>(
      "SELECT id, email, role, first_name, last_name, agence, is_active, created_at, updated_at FROM users WHERE id = $1",
      [userId],
    );
    if (result.rows.length === 0) throw new Error("Utilisateur introuvable.");
    return result.rows[0];
  },
};
