import { Router } from "express";
import { validateCommentaire } from "../middlewares/validateCommentaire.middleware.js";
import {
  createCommentaire,
  getAllCommentairesAdmin,
  getCommentaires,
  updateCommentaireStatut,
} from "../controllers/commentaire.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/", validateCommentaire, createCommentaire);
router.get("/", getCommentaires);

//  ── Routes admin (nouvelles) ──────────────────────────────────────────────
router.get("/admin/all", checkAuth, getAllCommentairesAdmin);
router.patch("/admin/:id/statut", checkAuth, updateCommentaireStatut);

export default router;
