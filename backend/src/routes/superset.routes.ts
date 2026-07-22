import { Router } from "express";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { exportChartMultiSheet } from "../controllers/superset.export.controller.js";
import { listDashboardCharts } from "../controllers/superset.charts.controller.js";

const router = Router();

router.post(
  "/superset/chart/:chartId/export-multi-sheet",
  checkAuth,
  exportChartMultiSheet,
);

router.get(
  "/superset/dashboards/:dashboardId/charts",
  checkAuth,
  listDashboardCharts,
);

export default router;
