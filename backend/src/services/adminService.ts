import { pool } from "../db/pool.js";

const ONLINE_THRESHOLD_MINUTES = 5;

export const AdminService = {
  /**
   * Indicateurs pour la soutenance.
   * Deux modes :
   *  - GLOBAL (userId absent) : vue d'ensemble de la plateforme
   *  - UTILISATEUR (userId fourni) : KPIs recalculés pour ce seul utilisateur
   *    (clic sur une ligne du tableau côté frontend)
   *
   * ⚠️ ASSOMPTION SCHÉMA CHAT : on suppose que `chat_messages` a une colonne
   * `user_id` (en plus de `thread_id` et `role` que tu as confirmés). Si ce
   * n'est pas le cas (ex: le lien user↔thread passe par une autre table),
   * adapte uniquement le bloc marqué ci-dessous.
   */
  async getKpis(userId?: number) {
    if (userId) {
      return this._getUserKpis(userId);
    }
    return this._getGlobalKpis();
  },

  async _getGlobalKpis() {
    const dailyResult = await pool.query(`
      SELECT date_trunc('day', le.logged_in_at) AS day, COUNT(*) AS logins
      FROM login_events le
      JOIN users u ON u.id = le.user_id
      WHERE u.role != 'admin' AND le.logged_in_at >= NOW() - INTERVAL '30 days'
      GROUP BY 1
    `);
    const avgLoginsPerDay =
      dailyResult.rows.length > 0
        ? dailyResult.rows.reduce((sum, r) => sum + parseInt(r.logins, 10), 0) /
          dailyResult.rows.length
        : 0;

    let avgQuestionsPerSession = 0;
    let totalChatSessions = 0;
    let questionsIndicatorAvailable = true;
    try {
      const sessionsResult = await pool.query(`
        SELECT AVG(msg_count) AS avg_questions FROM (
          SELECT thread_id, COUNT(*) AS msg_count
          FROM chat_messages
          WHERE role = 'user'
          GROUP BY thread_id
        ) t
      `);
      avgQuestionsPerSession =
        parseFloat(sessionsResult.rows[0]?.avg_questions) || 0;

      const totalSessionsResult = await pool.query(`
        SELECT COUNT(DISTINCT thread_id)::int AS total FROM chat_messages
      `);
      totalChatSessions = totalSessionsResult.rows[0]?.total || 0;
    } catch (e: any) {
      console.warn(
        "[AdminService] Impossible de calculer les indicateurs chat — vérifie le schéma de chat_messages :",
        e.message,
      );
      questionsIndicatorAvailable = false;
    }

    return {
      scope: "global" as const,
      avgLoginsPerDay,
      totalChatSessions,
      avgQuestionsPerSession,
      questionsIndicatorAvailable,
    };
  },

  async _getUserKpis(userId: number) {
    const loginsResult = await pool.query(
      `SELECT COUNT(*)::int AS total, MAX(logged_in_at) AS last_login_at
       FROM login_events WHERE user_id = $1`,
      [userId],
    );
    const totalLogins = loginsResult.rows[0]?.total || 0;
    const lastLoginAt = loginsResult.rows[0]?.last_login_at || null;

    let totalMessages = 0;
    let totalChatSessions = 0;
    let avgQuestionsPerSession = 0;
    let questionsIndicatorAvailable = true;
    try {
      // ⚠️ Suppose chat_messages.user_id — adapte si le lien user↔thread est ailleurs.
      const messagesResult = await pool.query(
        `SELECT COUNT(*)::int AS total_messages,
                COUNT(DISTINCT thread_id)::int AS total_sessions
         FROM chat_messages
         WHERE role = 'user' AND user_id = $1`,
        [userId],
      );
      totalMessages = messagesResult.rows[0]?.total_messages || 0;
      totalChatSessions = messagesResult.rows[0]?.total_sessions || 0;
      avgQuestionsPerSession =
        totalChatSessions > 0 ? totalMessages / totalChatSessions : 0;
    } catch (e: any) {
      console.warn(
        "[AdminService] Impossible de calculer les indicateurs chat pour l'utilisateur — vérifie le schéma de chat_messages :",
        e.message,
      );
      questionsIndicatorAvailable = false;
    }

    return {
      scope: "user" as const,
      userId,
      totalLogins,
      lastLoginAt,
      totalChatSessions,
      totalMessages,
      avgQuestionsPerSession,
      questionsIndicatorAvailable,
    };
  },

  /**
   * Évolution du nombre de connexions, avec drill-down Jour / Mois / Année.
   * Si `userId` est fourni, restreint aux connexions de cet utilisateur.
   */
  async getConnectionsEvolution(
    granularity: "day" | "month" | "year",
    userId?: number,
  ) {
    if (userId) {
      const result = await pool.query(
        `SELECT date_trunc($1, logged_in_at) AS period,
                COUNT(*) AS logins,
                COUNT(DISTINCT user_id) AS active_users
         FROM login_events
         WHERE user_id = $2
         GROUP BY 1
         ORDER BY 1`,
        [granularity, userId],
      );
      return result.rows;
    }

    const result = await pool.query(
      `SELECT date_trunc($1, logged_in_at) AS period,
              COUNT(*) AS logins,
              COUNT(DISTINCT user_id) AS active_users
       FROM login_events
       GROUP BY 1
       ORDER BY 1`,
      [granularity],
    );
    return result.rows;
  },

  /**
   * Liste des utilisateurs avec statut en ligne (point vert/rouge) et
   * statistiques de connexion, pour le tableau du dashboard admin.
   */
  async getUsersWithStatus() {
    const result = await pool.query(`
      SELECT
        u.id, u.email, u.first_name, u.last_name, u.role, u.agence,
        u.is_active, u.created_at, u.last_seen_at,
        (u.last_seen_at IS NOT NULL
          AND u.last_seen_at >= NOW() - INTERVAL '${ONLINE_THRESHOLD_MINUTES} minutes') AS is_online,
        (SELECT COUNT(*) FROM login_events le WHERE le.user_id = u.id)::int AS total_logins,
        (SELECT MAX(logged_in_at) FROM login_events le WHERE le.user_id = u.id) AS last_login_at
      FROM users u
      ORDER BY is_online DESC, u.last_seen_at DESC NULLS LAST
    `);
    return result.rows;
  },

  /**
   * Active / désactive un utilisateur (suppression réversible).
   */
  async setActiveStatus(userId: number, isActive: boolean) {
    const result = await pool.query(
      "UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, is_active",
      [isActive, userId],
    );
    if (result.rows.length === 0) throw new Error("Utilisateur introuvable.");
    return result.rows[0];
  },
};
