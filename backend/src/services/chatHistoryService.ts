import { pool } from "../db/pool.js";

export interface ChatMessageRow {
  threadId: string;
  userId: number;
  userRole: string;
  role: "user" | "assistant";
  content: string;
  agence?: string | null;
  language?: string;
  correctionAttempts?: number;
  report?: string | null;
  chartConfig?: any | null;
}

export async function saveMessage(msg: ChatMessageRow): Promise<void> {
  await pool.query(
    `INSERT INTO chat_messages 
      (thread_id, user_id, user_role, role, content, agence, language, correction_attempts, report, chart_config)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      msg.threadId,
      msg.userId,
      msg.userRole,
      msg.role,
      msg.content,
      msg.agence ?? null,
      msg.language ?? "fr",
      msg.correctionAttempts ?? 0,
      msg.report ?? null,
      msg.chartConfig ? JSON.stringify(msg.chartConfig) : null,
    ],
  );
}

export async function getUserHistory(userId: number) {
  const result = await pool.query(
    `SELECT thread_id, user_id, user_role, role, content, timestamp, agence, language, report, chart_config
     FROM chat_messages
     WHERE user_id = $1
     ORDER BY timestamp ASC`,
    [userId],
  );

  return result.rows.map((row: any) => ({
    threadId: row.thread_id,
    userId: row.user_id,
    userRole: row.user_role,
    role: row.role,
    content: row.content,
    timestamp: row.timestamp,
    agence: row.agence,
    language: row.language,
    report: row.report,
    chartConfig: row.chart_config
      ? typeof row.chart_config === "string"
        ? JSON.parse(row.chart_config)
        : row.chart_config
      : null,
  }));
}

export async function getThreadContext(threadId: string, limit = 6) {
  const result = await pool.query(
    `SELECT role, content, report, chart_config
     FROM chat_messages
     WHERE thread_id = $1
     ORDER BY timestamp DESC
     LIMIT $2`,
    [threadId, limit],
  );

  return result.rows
    .map((row: any) => ({
      role: row.role,
      content: row.content,
      report: row.report,
      chartConfig: row.chart_config
        ? typeof row.chart_config === "string"
          ? JSON.parse(row.chart_config)
          : row.chart_config
        : null,
    }))
    .reverse();
}

export async function getUserMedia(userId: number) {
  const result = await pool.query(
    `SELECT m.id, m.thread_id, m.timestamp, m.report, m.chart_config,
            (SELECT content FROM chat_messages u
             WHERE u.thread_id = m.thread_id AND u.role = 'user'
             ORDER BY u.timestamp ASC LIMIT 1) AS question
     FROM chat_messages m
     WHERE m.user_id = $1
       AND m.is_visible = true
       AND (m.report IS NOT NULL OR m.chart_config IS NOT NULL)
     ORDER BY m.timestamp DESC`,
    [userId],
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    threadId: row.thread_id,
    question: row.question,
    timestamp: row.timestamp,
    report: row.report,
    chartConfig: row.chart_config
      ? typeof row.chart_config === "string"
        ? JSON.parse(row.chart_config)
        : row.chart_config
      : null,
  }));
}

export async function hideMessage(
  messageId: number,
  userId: number,
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE chat_messages
     SET is_visible = false
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [messageId, userId],
  );
  return (result.rowCount ?? 0) > 0;
}
