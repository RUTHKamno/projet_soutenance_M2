import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { RoleService } from "../services/role.service.js";

function ensureAdmin(req: AuthenticatedRequest, res: Response): boolean {
  if (req.user?.role !== "admin") {
    res
      .status(403)
      .json({ error: "Accès refusé. Réservé à l'administrateur." });
    return false;
  }
  return true;
}

export const RoleController = {
  // GET /roles
  async getAll(req: AuthenticatedRequest, res: Response) {
    if (!ensureAdmin(req, res)) return;
    try {
      const roles = await RoleService.getAll();
      res.status(200).json({ roles });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // POST /roles
  async create(req: AuthenticatedRequest, res: Response) {
    if (!ensureAdmin(req, res)) return;
    try {
      const { name, label, description } = req.body;
      if (!name || typeof name !== "string") {
        res.status(400).json({ error: "Le nom du rôle est requis." });
        return;
      }
      const role = await RoleService.create({ name, label, description });
      res.status(201).json({ message: "Rôle créé avec succès.", role });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  // PUT /roles/:id
  async update(req: AuthenticatedRequest, res: Response) {
    if (!ensureAdmin(req, res)) return;
    try {
      const id = parseInt(req.params["id"] as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID de rôle invalide." });
        return;
      }
      const { name, label, description } = req.body;
      const role = await RoleService.update(id, { name, label, description });
      res.status(200).json({ message: "Rôle mis à jour.", role });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  // DELETE /roles/:id
  async remove(req: AuthenticatedRequest, res: Response) {
    if (!ensureAdmin(req, res)) return;
    try {
      const id = parseInt(req.params["id"] as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID de rôle invalide." });
        return;
      }
      const result = await RoleService.remove(id);
      res.status(200).json({ message: "Rôle supprimé.", ...result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },
};
