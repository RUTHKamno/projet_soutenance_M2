import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { AdminService } from "../services/adminService.js";

function ensureAdmin(req: AuthenticatedRequest, res: Response): boolean {
  if (req.user?.role !== "admin") {
    res
      .status(403)
      .json({ error: "Accès refusé. Réservé à l'administrateur." });
    return false;
  }
  return true;
}

function parseOptionalUserId(req: AuthenticatedRequest): number | undefined {
  const raw = req.query.userId as string | undefined;
  if (!raw) return undefined;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? undefined : parsed;
}

export const AdminController = {
  // GET /admin/kpis?userId=123 (userId optionnel)
  async getKpis(req: AuthenticatedRequest, res: Response) {
    if (!ensureAdmin(req, res)) return;
    try {
      const userId = parseOptionalUserId(req);
      const kpis = await AdminService.getKpis(userId);
      res.status(200).json(kpis);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // GET /admin/connections-evolution?granularity=day|month|year&userId=123
  async getConnectionsEvolution(req: AuthenticatedRequest, res: Response) {
    if (!ensureAdmin(req, res)) return;
    try {
      const granularity = (req.query.granularity as string) || "day";
      if (!["day", "month", "year"].includes(granularity)) {
        res.status(400).json({
          error: "Granularité invalide (day, month ou year attendu).",
        });
        return;
      }
      const userId = parseOptionalUserId(req);
      const evolution = await AdminService.getConnectionsEvolution(
        granularity as "day" | "month" | "year",
        userId,
      );
      res.status(200).json({ evolution });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // GET /admin/users-status
  async getUsersWithStatus(req: AuthenticatedRequest, res: Response) {
    if (!ensureAdmin(req, res)) return;
    try {
      const users = await AdminService.getUsersWithStatus();
      res.status(200).json({ users });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // PATCH /admin/users/:id/deactivate
  async deactivateUser(req: AuthenticatedRequest, res: Response) {
    if (!ensureAdmin(req, res)) return;
    try {
      const id = parseInt(req.params["id"] as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID invalide." });
        return;
      }
      const result = await AdminService.setActiveStatus(id, false);
      res.status(200).json({ message: "Utilisateur désactivé.", user: result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  // PATCH /admin/users/:id/reactivate
  async reactivateUser(req: AuthenticatedRequest, res: Response) {
    if (!ensureAdmin(req, res)) return;
    try {
      const id = parseInt(req.params["id"] as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID invalide." });
        return;
      }
      const result = await AdminService.setActiveStatus(id, true);
      res.status(200).json({ message: "Utilisateur réactivé.", user: result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },
};
