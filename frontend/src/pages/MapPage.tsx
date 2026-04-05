import { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, List } from "lucide-react";
import {
  MAP_BUILDING_REGISTRY,
  type MapCategory,
} from "../components/map/mapBuildingRegistry";
import {
  LABEL_ZOOM_THRESHOLD,
  MAP_LAYER_IDS,
  MIN_SCALE,
  type MapLayerId,
  type MapPoiFilter,
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

  const [zoom, setZoom]           = useState(MIN_SCALE);
  const [lastPick, setLastPick]   = useState<MapPickInfo | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | MapCategory>("all");
  const [selectedId, setSelectedId]     = useState<string | null>(null);

  const [devLayers, setDevLayers]               = useState<Record<MapLayerId, boolean>>(() => initialLayerState(true));
  const [devLabelsAlways, setDevLabelsAlways]   = useState(false);
  const isDev = import.meta.env.DEV;

  // POI 필터 → MapViewport로 전달
  const poiFilter = useMemo<MapPoiFilter>(() => {
    if (activeFilter === "library" || activeFilter === "cafe" || activeFilter === "convenience") {
      return activeFilter;
    }
    return "all";
  }, [activeFilter]);

  const layerVisible = useMemo(() => {
    const labelsOn = zoom >= LABEL_ZOOM_THRESHOLD;
    if (!isDev) {
      const out = initialLayerState(true);
      out.labels = labelsOn;
      return out;
    }
    const out = { ...devLayers };
    out.labels = devLabelsAlways || labelsOn;
    return out;
  }, [isDev, devLayers, devLabelsAlways, zoom]);

  const selectedDetail = selectedId ? MAP_BUILDING_REGISTRY[selectedId] ?? null : null;

  const onPick = useCallback((info: MapPickInfo) => {
    setLastPick(info);
    if (!info.elementId) { setSelectedId(null); return; }
    const detail = MAP_BUILDING_REGISTRY[info.elementId];
    if (detail) {
      setSelectedId(info.elementId);
      setPanelOpen(true);          // 클릭하면 패널 열리면서 상세 표시
    } else {
      setSelectedId(null);
    }
  }, []);

  const handleSelectBuilding = useCallback((id: string) => {
    if (!id) { setSelectedId(null); return; }
    setSelectedId(id);
    viewportRef.current?.focusByBuildingId(id);
  }, []);

  return (
    <div className="map-page">
      {/* 상단 바 - 검색 제거, 패널 토글만 */}
      <header className="map-top-bar">
        <Link to="/" className="map-back">
          <ArrowLeft size={22} />
          <span>식단</span>
        </Link>
        <span className="map-top-title">캠퍼스 지도</span>
        <button
          className="map-panel-toggle"
          onClick={() => setPanelOpen((p) => !p)}
          aria-label="사이드 패널 열기"
        >
          <List size={22} />
        </button>
      </header>

      {/* 카테고리 칩 (상단 필터) */}
      <div className="map-filter-bar">
        {(["all", "library", "cafe", "convenience"] as const).map((key) => (
          <button
            key={key}
            className={`map-chip ${activeFilter === key ? "on" : ""}`}
            onClick={() => setActiveFilter(key)}
          >
            {{ all: "전체", library: "도서관", cafe: "카페", convenience: "편의점" }[key]}
          </button>
        ))}
      </div>

      {/* 지도 */}
      <div className="map-stage">
        <MapViewport
          ref={viewportRef}
          layerVisible={layerVisible}
          poiFilter={poiFilter}
          onZoomChange={setZoom}
          onPick={onPick}
        />
      </div>

      {/* 사이드 패널 (검색 + 목록 + 상세 통합) */}
      <MapSidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        selectedDetail={selectedDetail}
        onSelectBuilding={handleSelectBuilding}
        activeFilter={activeFilter}
        onFilterChange={(f) => setActiveFilter(f as "all" | MapCategory)}
      />

      {isDev && (
        <MapDevTools
          zoom={zoom}
          lastPick={lastPick}
          layerToggles={devLayers}
          onLayerToggle={(id, v) => setDevLayers((p) => ({ ...p, [id]: v }))}
          devLabelsAlways={devLabelsAlways}
          onDevLabelsAlways={setDevLabelsAlways}
        />
      )}
    </div>
  );
}
