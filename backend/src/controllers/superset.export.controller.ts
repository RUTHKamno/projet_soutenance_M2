// controllers/supersetExportController.ts
import { Request, Response } from "express";
import * as XLSX from "xlsx";
import {
  fetchChartFullData,
  buildMultiSheetWorkbook,
} from "../services/supersetExportService.js";

export async function exportChartMultiSheet(req: Request, res: Response) {
  try {
    const rawChartId = req.params.chartId;
    const chartId = Array.isArray(rawChartId) ? rawChartId[0] : rawChartId;

    if (!chartId) {
      return res.status(400).json({ message: "chartId manquant." });
    }

    const dimensions = req.body.dimensions || [
      { field: "Organisme", sheetName: "Organisme" },
      { field: "CLI", sheetName: "Client" },
    ];

    const { rows } = await fetchChartFullData(chartId);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Aucune donnée à exporter pour ce chart." });
    }

    const workbook = buildMultiSheetWorkbook(rows, dimensions);
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=export_${chartId}_${Date.now()}.xlsx`,
    );
    res.send(buffer);
  } catch (err: any) {
    console.error("[Export] 💥", err.message);
    res.status(500).json({ message: err.message });
  }
}
