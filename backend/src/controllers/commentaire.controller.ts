import { Request, Response } from "express";
import { CommentaireService } from "../services/commentaireService.js";

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
