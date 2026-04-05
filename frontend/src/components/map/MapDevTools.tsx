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

  const navTest = (to: string) => {
    if (import.meta.env.DEV) {
      console.info(`[JNUHUB Map DevTools] navigate → ${to}`, new Date().toISOString());
    }
    navigate(to);
  };

  return (
    <div className="map-devtools">
      <div className="map-devtools-title">Map DevTools</div>
      <div className="map-devtools-row">
        <span>Zoom</span>
        <strong>{zoom.toFixed(3)}</strong>
      </div>
      <p className="map-devtools-hint">
        도로: 줌 &lt; {ROAD_DETAIL_ZOOM_THRESHOLD} → road_simple / ≥ {ROAD_DETAIL_ZOOM_THRESHOLD} → road_detail.
        라벨(#lables): 줌 ≥ {LABEL_ZOOM_THRESHOLD} (또는 아래 체크로 강제).
      </p>
      <label className="map-devtools-check">
        <input type="checkbox" checked={devForceLabels} onChange={(e) => onDevForceLabels(e.target.checked)} />
        labels 항상 표시 (LOD 무시)
      </label>
      <div className="map-devtools-row map-devtools-pick">
        <span>Last target</span>
        <code>
          id: {lastPick?.elementId ?? "—"}
          <br />
          svg: ({lastPick?.svgX.toFixed(1) ?? "—"}, {lastPick?.svgY.toFixed(1) ?? "—"})
          <br />
          client: ({lastPick?.clientX.toFixed(0) ?? "—"}, {lastPick?.clientY.toFixed(0) ?? "—"})
        </code>
      </div>

      <div className="map-devtools-section">Navigation test</div>
      <div className="map-devtools-nav-btns">
        <button type="button" onClick={() => navTest("/")}>
          식단 /
        </button>
        <button type="button" onClick={() => navTest("/map")}>
          지도 /map
        </button>
      </div>
    </div>
  );
}
