import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { chatMediaApi, deleteMedia } from "../api/chatMediaApi";
import QuestionModal from "../components/chats/chatsMediaPage/QuestionModal";
import MediaCard from "../components/chats/chatsMediaPage/MediaCard";
import MediaViewerModal from "../components/chats/chatsMediaPage/MediaViewerModal";
import ConfirmModal from "../components/chats/chatsMediaPage/ConfirmModal";
import "../styles/chat/chatsMediaPage/ChatMediaPage.css";

// Helper pour formater les dates sous le format YYYY-MM-DD des inputs <input type="date">
const formatDateForInput = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const ChatMediaPage = () => {
  const { userId } = useParams();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // Filtres
  const [filterType, setFilterType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activePreset, setActivePreset] = useState(null); // 'today' | '7days' | '30days' | 'thisMonth' | null

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const data = await chatMediaApi(userId);
        setMedia(data);
      } catch (err) {
        setError("Impossible de charger vos médias.");
      } finally {
        setLoading(false);
      }
    };
    fetchMedia();
  }, [userId]);

  // FONCTION DES RACCOURCIS RAPIDES DE DATES
  const handlePresetClick = (presetKey) => {
    const now = new Date();
    const todayStr = formatDateForInput(now);

    if (activePreset === presetKey) {
      // Désactiver le preset si on reclique dessus
      setStartDate("");
      setEndDate("");
      setActivePreset(null);
      return;
    }

    setActivePreset(presetKey);

    if (presetKey === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (presetKey === "7days") {
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      setStartDate(formatDateForInput(past7));
      setEndDate(todayStr);
    } else if (presetKey === "30days") {
      const past30 = new Date();
      past30.setDate(now.getDate() - 30);
      setStartDate(formatDateForInput(past30));
      setEndDate(todayStr);
    } else if (presetKey === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatDateForInput(firstDay));
      setEndDate(todayStr);
    }
  };

  const handleCustomDateChange = (type, value) => {
    setActivePreset(null); // Réinitialiser le preset si l'utilisateur modifie manuellement les dates
    if (type === "start") setStartDate(value);
    if (type === "end") setEndDate(value);
  };

  // FILTRAGE
  const filteredMedia = useMemo(() => {
    return media.filter((item) => {
      // 1. Filtre par type
      const isChart = !!item.chartConfig;
      if (filterType === "chart" && !isChart) return false;
      if (filterType === "report" && isChart) return false;

      // 2. Filtre par Timestamp
      const rawTimestamp =
        item.timestamp || item.created_at || item.createdAt || item.date;
      if (!rawTimestamp) return true;

      const itemTime = new Date(rawTimestamp).getTime();
      if (isNaN(itemTime)) return true;

      if (startDate) {
        const startMs = new Date(`${startDate}T00:00:00`).getTime();
        if (itemTime < startMs) return false;
      }

      if (endDate) {
        const endMs = new Date(`${endDate}T23:59:59.999`).getTime();
        if (itemTime > endMs) return false;
      }

      return true;
    });
  }, [media, filterType, startDate, endDate]);

  const handleOpen = (mediaId) => {
    const index = filteredMedia.findIndex((m) => m.id === mediaId);
    if (index !== -1) setViewerIndex(index);
  };

  const confirmDelete = async () => {
    const mediaId = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      await deleteMedia(mediaId);
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    } catch (err) {
      setError("Échec de la suppression.");
    }
  };

  const hasActiveFilters =
    filterType !== "all" || startDate !== "" || endDate !== "";

  const resetFilters = () => {
    setFilterType("all");
    setStartDate("");
    setEndDate("");
    setActivePreset(null);
  };

  return (
    <>
      <div className="media-page">
        <div className="media-page-header">
          <h1>Mes Médias Analytics</h1>
          <p>
            Retrouvez ici tous vos graphiques et rapports générés par l'Agent
            BI.
          </p>
        </div>

        {/* BARRE DE FILTRES AVEC RACCOURCIS RAPIDES */}
        <div className="media-filters-container">
          <div className="filter-item">
            <label htmlFor="filterType">Type :</label>
            <div className="select-wrapper">
              <select
                id="filterType"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">Tous les médias</option>
                <option value="chart">📊 Graphiques (Charts)</option>
                <option value="report">📄 Rapports Analytiques</option>
              </select>
            </div>
          </div>

          <div className="filter-divider" />

          {/* Raccourcis temporels rapides */}
          <div className="preset-buttons-group">
            <button
              className={`preset-btn ${activePreset === "today" ? "active" : ""}`}
              onClick={() => handlePresetClick("today")}
            >
              Aujourd'hui
            </button>
            <button
              className={`preset-btn ${activePreset === "7days" ? "active" : ""}`}
              onClick={() => handlePresetClick("7days")}
            >
              7 derniers jours
            </button>
            <button
              className={`preset-btn ${activePreset === "30days" ? "active" : ""}`}
              onClick={() => handlePresetClick("30days")}
            >
              30 derniers jours
            </button>
            <button
              className={`preset-btn ${activePreset === "thisMonth" ? "active" : ""}`}
              onClick={() => handlePresetClick("thisMonth")}
            >
              Ce mois-ci
            </button>
          </div>

          <div className="filter-divider" />

          {/* Sélecteurs de dates personnalisées */}
          <div className="filter-item">
            <label htmlFor="startDate">Du :</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => handleCustomDateChange("start", e.target.value)}
            />
          </div>

          <div className="filter-item">
            <label htmlFor="endDate">Au :</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => handleCustomDateChange("end", e.target.value)}
            />
          </div>

          {hasActiveFilters && (
            <button className="reset-filters-btn" onClick={resetFilters}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Réinitialiser
            </button>
          )}
        </div>

        {loading && <p className="media-loading">Chargement...</p>}
        {error && <p className="media-error">{error}</p>}

        {!loading && !error && media.length === 0 && (
          <div className="media-empty">
            <span>📊</span>
            <p>Aucun média généré pour le moment.</p>
          </div>
        )}

        {!loading &&
          !error &&
          media.length > 0 &&
          filteredMedia.length === 0 && (
            <div className="media-empty">
              <span>🔍</span>
              <p>Aucun résultat ne correspond à vos critères de recherche.</p>
            </div>
          )}

        <div className="media-grid">
          {filteredMedia.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onOpen={handleOpen}
              onObserveQuestion={() => setActiveQuestion(item.question)}
              onDelete={(mediaId) => setPendingDeleteId(mediaId)}
            />
          ))}
        </div>
      </div>

      {activeQuestion && (
        <QuestionModal
          question={activeQuestion}
          onClose={() => setActiveQuestion(null)}
        />
      )}

      {viewerIndex !== null && (
        <MediaViewerModal
          mediaList={filteredMedia}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      {pendingDeleteId && (
        <ConfirmModal
          title="Supprimer ce média ?"
          message="Cette action masquera définitivement ce média de votre liste."
          onConfirm={confirmDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </>
  );
};

export default ChatMediaPage;
