import { Router } from "express";
import { validateCommentaire } from "../middlewares/validateCommentaire.middleware.js";
import {
  createCommentaire,
  getCommentaires,
} from "../controllers/commentaire.controller.js";

const router = Router();

router.post("/", validateCommentaire, createCommentaire);
router.get("/", getCommentaires);

export default router;
