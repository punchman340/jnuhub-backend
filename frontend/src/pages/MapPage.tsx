import { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, List } from "lucide-react";
import type { MapCategory } from "../components/map/mapBuildingRegistry";
import { MAP_BUILDING_REGISTRY } from "../components/map/mapBuildingRegistry";
import {
  LABEL_ZOOM_THRESHOLD,
  MAP_LAYER_IDS,
  MIN_SCALE,
  ROAD_DETAIL_ZOOM_THRESHOLD,
  type MapLayerId,
} from "../components/map/mapConstants";
import { MapSidePanel } from "../components/map/MapSidePanel";
import { MapDevTools } from "../components/map/MapDevTools";
import {
  MapViewport,
  type MapPickInfo,
  type MapViewportHandle,
} from "../components/map/MapViewport";
import "../components/map/MapPage.css";

function initialLayerState(on: boolean): Record<MapLayerId, boolean> {
  return Object.fromEntries(MAP_LAYER_IDS.map((id) => [id, on])) as Record<MapLayerId, boolean>;
}

export default function MapPage() {
  const viewportRef = useRef<MapViewportHandle>(null);

  const [zoom, setZoom] = useState(MIN_SCALE);
  const [lastPick, setLastPick] = useState<MapPickInfo | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [sidebarCategory, setSidebarCategory] = useState<MapCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [devLayers, setDevLayers] = useState<Record<MapLayerId, boolean>>(() => initialLayerState(true));
  const [devLabelsAlways, setDevLabelsAlways] = useState(false);
  const isDev = import.meta.env.DEV;

  const showAllLabels = isDev ? devLabelsAlways || zoom >= LABEL_ZOOM_THRESHOLD : zoom >= LABEL_ZOOM_THRESHOLD;

  const layerVisible = useMemo(() => {
    const roadDetail = zoom >= ROAD_DETAIL_ZOOM_THRESHOLD;
    if (!isDev) {
      const out = initialLayerState(true);
      out.labels = true;
      out.road_detail = roadDetail;
      out.road_simple = !roadDetail;
      return out;
    }
    const out = { ...devLayers };
    out.labels = true;
    out.road_detail = roadDetail;
    out.road_simple = !roadDetail;
    return out;
  }, [isDev, devLayers, zoom]);

  const selectedDetail = selectedId ? (MAP_BUILDING_REGISTRY[selectedId] ?? null) : null;

  const onPick = useCallback((info: MapPickInfo) => {
    setLastPick(info);
    const rid = info.registryId;
    if (!rid) {
      setSelectedId(null);
      return;
    }
    if (MAP_BUILDING_REGISTRY[rid]) {
      setSelectedId(rid);
      setPanelOpen(true);
    } else {
      setSelectedId(null);
    }
  }, []);

  const handleSelectBuilding = useCallback((id: string) => {
    if (!id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(id);
    viewportRef.current?.focusByBuildingId(id);
  }, []);

  const clearCategory = useCallback(() => setSidebarCategory("all"), []);

  return (
    <div className="map-page">
      <header className="map-top-bar">
        <Link to="/" className="map-back">
          <ArrowLeft size={22} />
          <span>식단</span>
        </Link>
        <span className="map-top-title">캠퍼스 지도</span>
        <button
          type="button"
          className="map-panel-toggle"
          onClick={() => setPanelOpen((p) => !p)}
          aria-label="사이드 패널"
        >
          <List size={22} />
        </button>
      </header>

      <div className="map-stage">
        <MapViewport
          ref={viewportRef}
          layerVisible={layerVisible}
          sidebarCategory={sidebarCategory}
          highlightBuildingId={selectedId}
          showAllLabels={showAllLabels}
          onZoomChange={setZoom}
          onPick={onPick}
        />
      </div>

      <MapSidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        selectedDetail={selectedDetail}
        onSelectBuilding={handleSelectBuilding}
        sidebarCategory={sidebarCategory}
        onCategoryChange={setSidebarCategory}
        onClearCategory={clearCategory}
      />

      {isDev && (
        <MapDevTools
          zoom={zoom}
          lastPick={lastPick}
          devForceLabels={devLabelsAlways}
          onDevForceLabels={setDevLabelsAlways}
          layerToggles={devLayers}
          onLayerToggle={(id, v) => setDevLayers((p) => ({ ...p, [id]: v }))}
        />
      )}
    </div>
  );
}
