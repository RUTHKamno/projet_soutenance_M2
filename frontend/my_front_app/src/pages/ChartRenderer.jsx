import React, { useEffect, useRef, useState } from "react";
import { authApi } from "../api/authApi";
import { embedDashboard } from "@superset-ui/embedded-sdk";
import DashboardStatus from "../components/dashboard/DashboardStatus";
import "../styles/Dashboard/DashboardRenderer.css"; // Fichier de styles dédié

const ChartRenderer = ({ dashboardId }) => {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  console.log("selected Dashboard", dashboardId);

  useEffect(() => {
    if (!dashboardId) return;

    // Vider le conteneur précédent avant de recharger
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }

    setLoading(true);
    setError(null);

    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const config = await authApi.getSupersetToken(dashboardId);
        if (cancelled) return;

        if (containerRef.current) {
          await embedDashboard({
            id: config.dashboardId,
            supersetDomain: config.supersetUrl,
            mountPoint: containerRef.current,
            fetchGuestToken: () => Promise.resolve(config.guestToken),
            dashboardUiConfig: {
              hideTitle: true,
              hideChartControls: true,
              hideTabNavigation: false,
            },
          });
          if (!cancelled) setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [dashboardId]); // ← dashboardId comme dépendance

  return (
    <div className="dashboard-view-container">
      {/* Sous-composant dédié à la gestion des états visuels */}
      <DashboardStatus loading={loading} error={error} />

      {/* Conteneur physique pour l'Iframe sécurisé Superset */}
      <div
        ref={containerRef}
        className={`superset-iframe-wrapper ${loading || error ? "hidden" : "visible"}`}
      />
    </div>
  );
};

export default ChartRenderer;
