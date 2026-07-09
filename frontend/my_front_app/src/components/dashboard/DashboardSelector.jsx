import React, { useEffect, useState } from "react";
import { agentApi } from "../../api/agentApi";
import "../../styles/Dashboard/DashboardSelector.css";

const DashboardSelector = ({ selected, onSelect }) => {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    agentApi
      .getDashboards()
      .then((list) => {
        console.log("get Dashboard", list);
        setDashboards(list);
        if (list.length > 0 && !selected) onSelect(list[0]);
      })
      .catch((err) => {
        console.error("Erreur getDashboards:", err);
        setError(err.message || "Impossible de charger les tableaux de bord.");
      })
      .finally(() => setLoading(false));
  }, [onSelect, selected]);

  if (loading) return null;

  if (error) return <div className="ds-error">⚠️ {error}</div>;

  return (
    <div className="ds-bar">
      <span className="ds-label">📊 Tableau de bord :</span>
      <div className="ds-tabs">
        {dashboards.map((db) => (
          <button
            key={db.id}
            className={`ds-tab ${selected?.id === db.id ? "ds-tab-active" : ""}`}
            onClick={() => onSelect(db)}
            title={db.description}
          >
            {db.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DashboardSelector;
