import React, { useEffect, useState } from "react";
import DashboardSelector from "../components/dashboard/DashboardSelector";
import "../styles/Dashboard/DashboardPage.css";
import ChartRenderer from "./ChartRenderer";
import ChatFAB from "../components/chats/ChatFAB";
import ChatSidebar from "../components/chats/ChatSidebar";
import { agentApi } from "../api/agentApi";
import { authApi } from "../api/authApi";

const DashboardPage = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exportSuccess, setExportSuccess] = useState("");
  const [userRole, setUserRole] = useState("");

  const handleExportPdf = async () => {
    if (!selectedDashboard) return;
    setExportError("");
    setExportSuccess("");
    setExporting(true);

    const dashboardId = selectedDashboard.ids;
    if (!dashboardId) {
      setExportError(
        "Impossible de déterminer quel tableau de bord exporter. Veuillez réessayer avec un tableau de bord valide.",
      );
      setExporting(false);
      return;
    }
    try {
      await agentApi.exportDashboardPdf(dashboardId, selectedDashboard.label);
      setExportSuccess(
        "Export PDF réussi. Le téléchargement devrait démarrer automatiquement.",
      );
    } catch (err) {
      console.error("Export PDF échoué:", err.message || err);
      setExportError(
        err.message ||
          "L'export PDF a échoué. Vérifiez votre connexion ou réessayez plus tard.",
      );
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const user = await authApi.getMe();
        setUserRole(user.role || "");
      } catch (err) {
        setUserRole("");
      }
    };

    loadUserRole();
  }, []);

  return (
    <div className="dashboard-page">
      <div className="dashboard-topbar">
        <DashboardSelector
          selected={selectedDashboard}
          onSelect={setSelectedDashboard}
        />
        {selectedDashboard && (
          <button
            className="dashboard-export-btn"
            onClick={handleExportPdf}
            disabled={exporting || userRole === "directeur_agence"}
            title={
              userRole === "directeur_agence"
                ? "Export désactivé pour le rôle Directeur d'Agence"
                : ""
            }
          >
            {exporting ? "Export..." : "↓ Exporter le PDF"}
          </button>
        )}
      </div>

      {exportError && (
        <div className="dashboard-export-error">⚠️ {exportError}</div>
      )}

      {exportSuccess && (
        <div className="dashboard-export-success">✅ {exportSuccess}</div>
      )}
      <div className="dashboard-main">
        {selectedDashboard && (
          <ChartRenderer dashboardId={selectedDashboard.id} />
        )}
      </div>
      <ChatFAB onClick={() => setChatOpen(true)} />
      <ChatSidebar
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        userRole={userRole}
      />
    </div>
  );
};

export default DashboardPage;
