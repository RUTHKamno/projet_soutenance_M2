import React from "react";

const DashboardStatus = ({ loading, error }) => {
  if (loading) {
    return (
      <div className="dashboard-status-zone">
        <div className="dashboard-spinner"></div>
        <p className="dashboard-status-text animate-pulse">
          ✦ Initialisation de votre espace décisionnel sécurisé...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-status-zone status-error">
        <span className="error-icon">⚠️</span>
        <h3 className="error-title">Échec du chargement des données</h3>
        <p className="error-message">{error}</p>
        <button
          className="btn-primary auth-submit"
          onClick={() => window.location.reload()}
          style={{ marginTop: "15px", maxWidth: "200px" }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return null;
};

export default DashboardStatus;
