import { pool } from "../db/pool.js";
import {
  CreateRoleDto,
  Role,
  UpdateRoleDto,
} from "../interfaces/role.interface.js";

function slugifyRoleName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents pour la valeur technique
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export const RoleService = {
  /**
   * Liste tous les rôles, avec le nombre d'utilisateurs qui l'utilisent
   * (utile pour désactiver le bouton "Supprimer" côté UI).
   */
  async getAll(): Promise<Role[]> {
    const result = await pool.query<Role>(`
      SELECT r.id, r.name, r.label, r.description, r.is_system, r.created_at, r.updated_at,
             (SELECT COUNT(*) FROM users u WHERE u.role = r.name)::int AS users_count
      FROM roles r
      ORDER BY r.is_system DESC, r.name ASC
    `);
    return result.rows;
  },

  /**
   * ADMIN ONLY — Crée un nouveau rôle personnalisé (jamais is_system).
   */
  async create(dto: CreateRoleDto): Promise<Role> {
    const name = slugifyRoleName(dto.name);
    if (!name) {
      throw new Error("Le nom du rôle est invalide.");
    }

    const existing = await pool.query("SELECT id FROM roles WHERE name = $1", [
      name,
    ]);
    if (existing.rows.length > 0) {
      throw new Error("Un rôle avec ce nom existe déjà.");
    }

    const result = await pool.query<Role>(
      `INSERT INTO roles (name, label, description, is_system)
       VALUES ($1, $2, $3, false)
       RETURNING *`,
      [name, dto.label?.trim() || name, dto.description?.trim() || null],
    );
    return result.rows[0];
  },

  /**
   * ADMIN ONLY — Met à jour un rôle.
   * Renommer un rôle système (is_system=true) est interdit : ces noms sont
   * référencés en dur ailleurs dans le code (RLS, mapping des dashboards).
   * Le label et la description restent modifiables même pour un rôle système.
   */
  async update(id: number, dto: UpdateRoleDto): Promise<Role> {
    const current = await pool.query<Role>(
      "SELECT * FROM roles WHERE id = $1",
      [id],
    );
    if (current.rows.length === 0) throw new Error("Rôle introuvable.");
    const role = current.rows[0];

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.name !== undefined) {
      const newName = slugifyRoleName(dto.name);
      if (role.is_system && newName !== role.name) {
        throw new Error(
          `Le rôle "${role.label || role.name}" est un rôle système et ne peut pas être renommé.`,
        );
      }
      if (!role.is_system) {
        const existing = await pool.query(
          "SELECT id FROM roles WHERE name = $1 AND id != $2",
          [newName, id],
        );
        if (existing.rows.length > 0) {
          throw new Error("Un rôle avec ce nom existe déjà.");
        }
        fields.push(`name = $${idx++}`);
        values.push(newName);
      }
    }
    if (dto.label !== undefined) {
      fields.push(`label = $${idx++}`);
      values.push(dto.label.trim());
    }
    if (dto.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(dto.description.trim() || null);
    }

    if (fields.length === 0) {
      throw new Error("Aucune donnée à mettre à jour.");
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    // Grâce à la contrainte FK `ON UPDATE CASCADE`, renommer `name` ici met
    // automatiquement à jour tous les utilisateurs qui avaient ce rôle.
    const result = await pool.query<Role>(
      `UPDATE roles SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return result.rows[0];
  },

  /**
   * ADMIN ONLY — Supprime un rôle personnalisé.
   * Refusé si : rôle système, ou rôle encore utilisé par au moins un utilisateur.
   */
  async remove(id: number): Promise<{ id: number }> {
    const current = await pool.query<Role>(
      "SELECT * FROM roles WHERE id = $1",
      [id],
    );
    if (current.rows.length === 0) throw new Error("Rôle introuvable.");
    const role = current.rows[0];

    if (role.is_system) {
      throw new Error(
        `Le rôle "${role.label || role.name}" est un rôle système et ne peut pas être supprimé.`,
      );
    }

    const usersCount = await pool.query(
      "SELECT COUNT(*)::int AS count FROM users WHERE role = $1",
      [role.name],
    );
    if (usersCount.rows[0].count > 0) {
      throw new Error(
        `Impossible de supprimer ce rôle : ${usersCount.rows[0].count} utilisateur(s) l'utilisent encore. Réaffecte-les d'abord à un autre rôle.`,
      );
    }

    await pool.query("DELETE FROM roles WHERE id = $1", [id]);
    return { id };
  },
};
