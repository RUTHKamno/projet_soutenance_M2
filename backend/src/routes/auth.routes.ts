import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Public
router.post("/signin", AuthController.signIn);

// Protégées
router.get("/me", checkAuth, AuthController.getMe);
router.put("/me", checkAuth, AuthController.updateSelf);

// Admin uniquement
router.post("/users", checkAuth, AuthController.createUser);
router.get("/users", checkAuth, AuthController.getAllUsers);
router.put("/users/:id", checkAuth, AuthController.adminUpdateUser);

// Superset
router.get("/superset-token", checkAuth, AuthController.getSupersetToken);
router.get("/dashboards", checkAuth, AuthController.getDashboards);

export default router;
