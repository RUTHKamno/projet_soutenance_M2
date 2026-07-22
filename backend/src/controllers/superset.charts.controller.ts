// controllers/supersetChartsController.ts
import { Request, Response } from "express";
import { getDashboardCharts } from "../services/supersetClient.js";

export async function listDashboardCharts(req: Request, res: Response) {
  try {
    const dashboardId = String(req.params.dashboardId);
    const charts = await getDashboardCharts(dashboardId);
    res.status(200).json(charts);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
