import { Request, Response } from "express";
import { CommentaireService } from "../services/commentaireService.js";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

export const createCommentaire = async (req: Request, res: Response) => {
  try {
    const { nom, email, note, commentaire } = req.body;
    const nouveau = await CommentaireService.create({
      nom,
      email,
      note,
      commentaire,
    });
    return res.status(201).json(nouveau);
  } catch (error) {
    console.error("Erreur création commentaire:", error);
    return res.status(500).json({ error: "Erreur serveur." });
  }
};

export const getCommentaires = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const [commentaires, stats] = await Promise.all([
      CommentaireService.getAll(limit, offset),
      CommentaireService.getStats(),
    ]);
    return res.status(200).json({ commentaires, stats });
  } catch (error) {
    console.error("Erreur récupération commentaires:", error);
    return res.status(500).json({ error: "Erreur serveur." });
  }
};

// ADMIN ONLY — tous les commentaires, quel que soit leur statut
export const getAllCommentairesAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (req.user?.role !== "admin") {
      res
        .status(403)
        .json({ error: "Accès refusé. Réservé à l'administrateur." });
      return;
    }
    const commentaires = await CommentaireService.getAllForAdmin();
    return res.status(200).json({ commentaires });
  } catch (error) {
    console.error("Erreur récupération commentaires (admin):", error);
    return res.status(500).json({ error: "Erreur serveur." });
  }
};

// ADMIN ONLY — bascule approved <-> not_approved
export const updateCommentaireStatut = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (req.user?.role !== "admin") {
      res
        .status(403)
        .json({ error: "Accès refusé. Réservé à l'administrateur." });
      return;
    }
    const id = parseInt(req.params["id"] as string, 10);
    const { statut } = req.body;
    if (isNaN(id)) {
      res.status(400).json({ error: "ID de commentaire invalide." });
      return;
    }
    if (!["approved", "not_approved"].includes(statut)) {
      res
        .status(400)
        .json({ error: "Statut invalide (approved ou not_approved attendu)." });
      return;
    }
    const updated = await CommentaireService.setStatut(id, statut);
    return res
      .status(200)
      .json({ message: "Statut mis à jour.", commentaire: updated });
  } catch (error: any) {
    console.error("Erreur mise à jour statut commentaire:", error);
    return res.status(400).json({ error: error.message || "Erreur serveur." });
  }
};
