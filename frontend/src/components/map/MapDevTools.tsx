import { useNavigate } from "react-router-dom";
import { MAP_LAYER_IDS, type MapLayerId } from "./mapConstants";
import type { MapPickInfo } from "./MapViewport";

type Props = {
  zoom: number;
  lastPick: MapPickInfo | null;
  layerToggles: Record<MapLayerId, boolean>;
  onLayerToggle: (id: MapLayerId, value: boolean) => void;
  devLabelsAlways: boolean;
  onDevLabelsAlways: (v: boolean) => void;
};

export function MapDevTools({
  zoom,
  lastPick,
  layerToggles,
  onLayerToggle,
  devLabelsAlways,
  onDevLabelsAlways,
}: Props) {
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

      <div className="map-devtools-section">Layer visibility</div>
      <label className="map-devtools-check">
        <input
          type="checkbox"
          checked={devLabelsAlways}
          onChange={(e) => onDevLabelsAlways(e.target.checked)}
        />
        labels 항상 표시 (LOD 무시)
      </label>
      {MAP_LAYER_IDS.map((id) => (
        <label key={id} className="map-devtools-check">
          <input
            type="checkbox"
            checked={layerToggles[id]}
            onChange={(e) => onLayerToggle(id, e.target.checked)}
          />
          {id}
        </label>
      ))}

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
