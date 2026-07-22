import React, { useEffect, useState } from "react";
import { exportChartMultiSheet } from "../../api/exportApi";
import { getToken } from "../../utils/tokenUtils";
import "../../styles/Dashboard/ChartExportToolbar.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const ChartExportToolbar = ({ dashboardId }) => {
  const [charts, setCharts] = useState([]);
  const [selectedChartId, setSelectedChartId] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!dashboardId) return;

    const fetchCharts = async () => {
      try {
        const token = getToken();
        const res = await fetch(
          `${API_BASE}/superset/dashboards/${dashboardId}/charts`,
          {
            headers: {
              "ngrok-skip-browser-warning": "true",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          },
        );

        if (!res.ok) throw new Error();
        const data = await res.json();
        setCharts(data);
      } catch (err) {
        setCharts([]);
      }
    };

    fetchCharts();
  }, [dashboardId]);

  const handleExport = async () => {
    if (!selectedChartId) return;

    // Récupération du titre du graphique sélectionné pour nommer le fichier
    const selectedChart = charts.find(
      (c) => String(c.chartId) === String(selectedChartId),
    );
    const fileName = selectedChart
      ? `export_${selectedChart.title}.xlsx`
      : undefined;

    setExporting(true);
    try {
      await exportChartMultiSheet(
        selectedChartId,
        [
          { field: "Organisme", sheetName: "Organisme" },
          { field: "CLI", sheetName: "Client" },
        ],
        fileName,
      );
    } catch (err) {
      console.error("Erreur d'exportation :", err);
    } finally {
      setExporting(false);
    }
  };

  if (charts.length === 0) return null;

  return (
    <div className="chart-export-toolbar">
      <select
        value={selectedChartId}
        onChange={(e) => setSelectedChartId(e.target.value)}
      >
        <option value="">Choisir un tableau à exporter…</option>
        {charts.map((c) => (
          <option key={c.chartId} value={c.chartId}>
            {c.title}
          </option>
        ))}
      </select>
      <button onClick={handleExport} disabled={!selectedChartId || exporting}>
        {exporting ? "Export en cours…" : "⬇ Exporter (Excel multi-feuilles)"}
      </button>
    </div>
  );
};

export default ChartExportToolbar;
