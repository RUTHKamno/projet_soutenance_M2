import { Router } from "express";
import { handlePdfExport } from "../controllers/pdf.controller.js"; // 🔄 Import du contrôleur
import { checkAuth } from "../middlewares/auth.middleware.js";
import { listDashboards } from "../services/supersetClient.js";

const router = Router();

// 💡 L'endpoint est parfaitement épuré
router.post("/export-pdf", checkAuth, handlePdfExport);

// 🔧 DEBUG : Lister les dashboards disponibles dans Superset
router.get("/debug/dashboards", checkAuth, async (req, res) => {
  try {
    console.log("[PDF Routes] 🔍 Requête de debug: lister les dashboards");
    const dashboards = await listDashboards();
    res.json({
      success: true,
      count: dashboards.length,
      dashboards,
      message: "Utilisez l'un des 'id' ci-dessus dans votre appel /export-pdf",
    });
  } catch (err: any) {
    console.error(
      "[PDF Routes] ❌ Erreur lors du listage des dashboards :",
      err.message,
    );
    res.status(500).json({
      success: false,
      error: err.message,
      hint: "Vérifiez que Superset est accessible et que vos credentials sont corrects",
    });
  }
});

export default router;
