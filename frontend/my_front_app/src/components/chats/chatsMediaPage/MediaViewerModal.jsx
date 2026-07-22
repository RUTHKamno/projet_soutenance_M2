import React, { useRef } from "react";
import ReactECharts from "echarts-for-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useMediaCarousel,
  safeParseChartConfig,
  getMediaTitle,
  getMediaDate,
  exportChartToImage,
  downloadReportAsPdf,
} from "../../../utils/userMedias";
import "../../../styles/chat/chatsMediaPage/MediaViewerModal.css";

const MediaViewerModal = ({ mediaList, initialIndex, onClose }) => {
  const chartRef = useRef(null);
  const { currentIndex, goNext, goPrev, currentItem } = useMediaCarousel(
    mediaList,
    initialIndex,
    onClose,
  );

  if (!currentItem) return null;

  const isChart = !!currentItem.chartConfig;
  const { config, error } = isChart
    ? safeParseChartConfig(currentItem.chartConfig)
    : { config: null, error: null };

  return (
    <div className="mviewer-overlay" onClick={onClose}>
      <div className="mviewer-content" onClick={(e) => e.stopPropagation()}>
        <div className="mviewer-header">
          <div>
            <p className="mviewer-title">{getMediaTitle(currentItem)}</p>
            <span className="mviewer-date">{getMediaDate(currentItem)}</span>
          </div>
          <button className="mviewer-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {mediaList.length > 1 && (
          <>
            <button
              className="mviewer-nav mviewer-prev"
              onClick={goPrev}
              aria-label="Précédent"
            >
              ‹
            </button>
            <button
              className="mviewer-nav mviewer-next"
              onClick={goNext}
              aria-label="Suivant"
            >
              ›
            </button>
          </>
        )}

        <div className="mviewer-body">
          {isChart ? (
            config ? (
              <ReactECharts
                ref={chartRef}
                option={config}
                style={{ height: "480px", width: "100%" }}
                notMerge={true}
                lazyUpdate={true}
              />
            ) : (
              <p className="mviewer-error">{error || "Aperçu indisponible."}</p>
            )
          ) : (
            <div className="mviewer-report">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentItem.report || ""}
              </ReactMarkdown>
            </div>
          )}
        </div>

        <div className="mviewer-footer">
          <span className="mviewer-counter">
            {currentIndex + 1} / {mediaList.length}
          </span>
          <div className="mviewer-actions">
            {isChart ? (
              <button
                className="mviewer-action-btn"
                onClick={() =>
                  exportChartToImage(
                    chartRef,
                    `${getMediaTitle(currentItem)}.png`,
                  )
                }
                disabled={!config}
              >
                ⬇ Exporter en image
              </button>
            ) : (
              <button
                className="mviewer-action-btn"
                onClick={() => downloadReportAsPdf(currentItem)}
              >
                ⬇ Télécharger PDF
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaViewerModal;
