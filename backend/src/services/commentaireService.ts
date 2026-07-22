import { pool } from "../db/pool.js";
import {
  CommentaireNotation,
  CommentaireStats,
  CreateCommentaireDTO,
} from "../interfaces/commentaire.interface.js";

export class CommentaireService {
  static async create(
    data: CreateCommentaireDTO,
  ): Promise<CommentaireNotation> {
    const query = `
      INSERT INTO commentaires_notations (nom, email, note, commentaire)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [data.nom, data.email || null, data.note, data.commentaire];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getAll(
    limit: number,
    offset: number,
  ): Promise<CommentaireNotation[]> {
    const query = `
      SELECT * FROM commentaires_notations
      WHERE statut = 'approved'
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2;
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  static async getStats(): Promise<CommentaireStats> {
    const query = `
      SELECT ROUND(AVG(note)::numeric, 1) AS moyenne, COUNT(*) AS total
      FROM commentaires_notations
      WHERE statut = 'approved';
    `;
    const result = await pool.query(query);
    return {
      moyenne: parseFloat(result.rows[0].moyenne) || 0,
      total: parseInt(result.rows[0].total, 10) || 0,
    };
  }

  /**
   * ADMIN ONLY — tous les commentaires, quel que soit le statut.
   */
  static async getAllForAdmin(): Promise<CommentaireNotation[]> {
    const result = await pool.query<CommentaireNotation>(
      `SELECT * FROM commentaires_notations ORDER BY created_at DESC`,
    );
    return result.rows;
  }
  /**
   * ADMIN ONLY — bascule approved <-> not_approved (désactivation réversible,
   * cohérent avec le choix déjà fait pour les utilisateurs).
   */
  static async setStatut(
    id: number,
    statut: "approved" | "not_approved",
  ): Promise<CommentaireNotation> {
    const result = await pool.query<CommentaireNotation>(
      `UPDATE commentaires_notations SET statut = $1 WHERE id = $2 RETURNING *`,
      [statut, id],
    );
    if (result.rows.length === 0) throw new Error("Commentaire introuvable.");
    return result.rows[0];
  }
}
