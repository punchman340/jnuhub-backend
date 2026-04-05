import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LABEL_ZOOM_THRESHOLD, ROAD_DETAIL_ZOOM_THRESHOLD } from "./mapConstants";
import type { MapPickInfo } from "./MapViewport";

type Props = {
  zoom: number;
  lastPick: MapPickInfo | null;
  devForceLabels: boolean;
  onDevForceLabels: (v: boolean) => void;
};

export function MapDevTools({ zoom, lastPick, devForceLabels, onDevForceLabels }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // 기본 숨김

  return (
    <div className="map-devtools-wrap">
      <button
        className="map-devtools-toggle"
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="DevTools"
      >
        {open ? "✕" : "DEV"}
      </button>

      {open && (
        <div className="map-devtools">
          <div className="map-devtools-title">Map DevTools</div>
          <div className="map-devtools-row">
            <span>Zoom</span>
            <strong>{zoom.toFixed(3)}</strong>
          </div>
          <p className="map-devtools-hint">
            도로: &lt;{ROAD_DETAIL_ZOOM_THRESHOLD} → simple / ≥{ROAD_DETAIL_ZOOM_THRESHOLD} → detail
            <br />
            라벨: ≥{LABEL_ZOOM_THRESHOLD} (또는 아래 체크)
          </p>
          <label className="map-devtools-check">
            <input
              type="checkbox"
              checked={devForceLabels}
              onChange={(e) => onDevForceLabels(e.target.checked)}
            />
            labels 강제 표시
          </label>
          <div className="map-devtools-row map-devtools-pick">
            <span>Last pick</span>
            <code>
              {`id: ${lastPick?.elementId ?? "—"}\nsvg: (${lastPick?.svgX.toFixed(1) ?? "—"}, ${lastPick?.svgY.toFixed(1) ?? "—"})`}
            </code>
          </div>
          <div className="map-devtools-nav-btns">
            <button type="button" onClick={() => navigate("/")}>식단</button>
            <button type="button" onClick={() => navigate("/map")}>지도</button>
          </div>
        </div>
      )}
    </div>
  );
}
