import { Router } from "express";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { AdminController } from "../controllers/admin.controller.js";

const router = Router();

router.use(checkAuth); // toutes les routes /admin nécessitent un token valide (contrôle admin fait dans le controller)

router.get("/kpis", AdminController.getKpis);
router.get("/connections-evolution", AdminController.getConnectionsEvolution);
router.get("/users-status", AdminController.getUsersWithStatus);
router.patch("/users/:id/deactivate", AdminController.deactivateUser);
router.patch("/users/:id/reactivate", AdminController.reactivateUser);

export default router;

// ── À AJOUTER dans ton fichier principal (app.ts / server.ts) ──────────────
// Attention au préfixe /api : ton frontend (adminApi.js) appelle
// `${API_BASE}/admin/...` où API_BASE = ".../api" → il faut donc monter ici
// sous "/api/admin", pas "/admin", pour que ça matche.
// import adminRoutes from "./routes/admin.routes.js";
// import roleRoutes from "./routes/role.routes.js";
// app.use("/api/admin", adminRoutes);
// app.use("/api/roles", roleRoutes);
