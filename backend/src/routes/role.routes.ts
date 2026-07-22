import { Router } from "express";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { RoleController } from "../controllers/role.controller.js";

const router = Router();

router.use(checkAuth); // toutes les routes /roles nécessitent un token valide (contrôle admin fait dans le controller)

router.get("/", RoleController.getAll);
router.post("/", RoleController.create);
router.put("/:id", RoleController.update);
router.delete("/:id", RoleController.remove);

export default router;

// ── À AJOUTER dans ton fichier principal (app.ts / server.ts) ──────────────
// Attention au préfixe /api : ton frontend (adminApi.js) appelle
// `${API_BASE}/roles` où API_BASE = ".../api" → il faut donc monter ici
// sous "/api/roles", pas "/roles", pour que ça matche.
// import roleRoutes from "./routes/role.routes.js";
// app.use("/api/roles", roleRoutes);
