import { Router, Response } from "express";
import {
  AuthenticatedRequest,
  checkAuth,
} from "../middlewares/auth.middleware.js";
import {
  deleteMedia,
  getMediaByUser,
  handleAgentAsk,
  handleAgentResume,
  handlePublishToSuperset,
} from "../controllers/agent.controller.js";
import { getUserHistory } from "../services/chatHistoryService.js";
import { listDatabases } from "../services/supersetClient.js";

const router = Router();

// Endpoint POST pour centraliser les requêtes vers tes moteurs IA
router.post("/ask", checkAuth, handleAgentAsk);
router.post("/resume", checkAuth, handleAgentResume);

// GET /api/agent/history
router.get(
  "/history",
  checkAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const history = await getUserHistory(userId);
      res.json({ messages: history });
    } catch (err: any) {
      console.log("Erreur lors de la récupération de l'historique :", err);
      res.status(500).json({ error: "Impossible de récupérer l'historique." });
    }
  },
);
router.post("/publish-superset", checkAuth, handlePublishToSuperset);

router.get("/dashboard-list", checkAuth, listDatabases);

router.get("/chats/:userId/media", checkAuth, getMediaByUser);

router.delete("/chats/media/:id", checkAuth, deleteMedia);

// router.post("/analyze",checkAuth, handleAgentAnalysis);

export default router;
