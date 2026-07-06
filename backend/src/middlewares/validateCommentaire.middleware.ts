import { Request, Response, NextFunction } from "express";

export const validateCommentaire = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { nom, note, commentaire } = req.body;

  if (!nom || typeof nom !== "string" || nom.trim().length < 2) {
    return res.status(400).json({ error: "Le nom est invalide." });
  }
  if (note === undefined || note < 1 || note > 5) {
    return res
      .status(400)
      .json({ error: "La note doit être comprise entre 1 et 5." });
  }
  if (
    !commentaire ||
    typeof commentaire !== "string" ||
    commentaire.trim().length < 5
  ) {
    return res.status(400).json({ error: "Le commentaire est trop court." });
  }

  next();
};
