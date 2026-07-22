import React from "react";
import ReactECharts from "echarts-for-react";
import {
  getMediaTitle,
  getMediaDate,
  getReportPreviewText,
  safeParseChartConfig,
} from "../../../utils/userMedias";
import "../../../styles/chat/chatsMediaPage/MediaCard.css";

const MediaCard = ({ item, onOpen, onObserveQuestion, onDelete }) => {
  const isChart = !!item.chartConfig;
  const { config, error } = isChart
    ? safeParseChartConfig(item.chartConfig)
    : { config: null, error: null };

  return (
    <div className="media-card">
      <button
        className="media-card-delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
        title="Supprimer"
      >
        🗑
      </button>

      <div className="media-card-preview" onClick={() => onOpen(item.id)}>
        {isChart ? (
          config ? (
            <ReactECharts
              option={config}
              style={{ height: "170px", width: "100%" }}
              notMerge={true}
              lazyUpdate={true}
              opts={{ renderer: "svg" }}
            />
          ) : (
            <div className="media-card-error">
              📈 {error || "Aperçu indisponible"}
            </div>
          )
        ) : (
          <div className="media-card-report-preview">
            <div className="media-card-report-fold" />
            <p>{getReportPreviewText(item.report)}</p>
          </div>
        )}
      </div>

      <div className="media-card-body">
        <p className="media-card-title">{getMediaTitle(item)}</p>
        <p className="media-card-date">{getMediaDate(item)}</p>
      </div>

      <div className="media-card-footer">
        <button className="media-card-expand" onClick={() => onOpen(item.id)}>
          {isChart ? "↗ Agrandir" : "👁 Aperçu"}
        </button>
        <button className="media-card-observe" onClick={onObserveQuestion}>
          Question
        </button>
      </div>
    </div>
  );
};

export default MediaCard;
