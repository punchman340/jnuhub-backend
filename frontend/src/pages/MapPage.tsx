import { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { MAP_BUILDING_REGISTRY, findBuildingsByQuery, type MapCategory } from "../components/map/mapBuildingRegistry";
import { LABEL_ZOOM_THRESHOLD, MAP_LAYER_IDS, type MapLayerId } from "../components/map/mapConstants";
import { MapBottomSheet } from "../components/map/MapBottomSheet";
import { MapDevTools } from "../components/map/MapDevTools";
import { MapViewport, type MapPickInfo, type MapViewportHandle } from "../components/map/MapViewport";
import "../components/map/MapPage.css";

const CATEGORY_META: { key: MapCategory; label: string; layer: MapLayerId }[] = [
  { key: "library", label: "도서관", layer: "library" },
  { key: "cafe", label: "카페", layer: "cafe" },
  { key: "convenience", label: "편의점", layer: "convenience" },
];

function initialLayerState(on: boolean): Record<MapLayerId, boolean> {
  return Object.fromEntries(MAP_LAYER_IDS.map((id) => [id, on])) as Record<MapLayerId, boolean>;
}

export default function MapPage() {
  const viewportRef = useRef<MapViewportHandle>(null);
  const [zoom, setZoom] = useState(0.55);
  const [search, setSearch] = useState("");
  const [lastPick, setLastPick] = useState<MapPickInfo | null>(null);

  const [categoryOn, setCategoryOn] = useState<Record<MapCategory, boolean>>({
    library: true,
    cafe: true,
    convenience: true,
    dorm: true,
    hall: true,
    other: true,
  });

  const [devLayers, setDevLayers] = useState<Record<MapLayerId, boolean>>(() => initialLayerState(true));
  const [devLabelsAlways, setDevLabelsAlways] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDetail, setSheetDetail] = useState<(typeof MAP_BUILDING_REGISTRY)[string] | null>(null);

  const isDev = import.meta.env.DEV;

  const layerVisible = useMemo(() => {
    const labelsFromLod = zoom >= LABEL_ZOOM_THRESHOLD;

    if (!isDev) {
      const out = initialLayerState(true);
      out.labels = labelsFromLod;
      for (const { key, layer } of CATEGORY_META) {
        if (!categoryOn[key]) out[layer] = false;
      }
      return out;
    }

    const out = { ...devLayers };
    out.labels = devLabelsAlways || labelsFromLod;
    for (const { key, layer } of CATEGORY_META) {
      if (!categoryOn[key]) out[layer] = false;
    }
    return out;
  }, [isDev, devLayers, devLabelsAlways, zoom, categoryOn]);

  const onPick = useCallback((info: MapPickInfo) => {
    setLastPick(info);
    if (!info.elementId) {
      setSheetOpen(false);
      return;
    }
    const detail = MAP_BUILDING_REGISTRY[info.elementId];
    if (detail) {
      setSheetDetail(detail);
      setSheetOpen(true);
    } else {
      setSheetOpen(false);
    }
  }, []);

  const runSearch = () => {
    const matches = findBuildingsByQuery(search);
    if (matches.length === 0) {
      // eslint-disable-next-line no-console
      console.warn("[Map] 검색 결과 없음:", search);
      return;
    }
    const id = matches[0];
    const ok = viewportRef.current?.focusByBuildingId(id);
    if (ok && MAP_BUILDING_REGISTRY[id]) {
      setSheetDetail(MAP_BUILDING_REGISTRY[id]);
      setSheetOpen(true);
    }
  };

  const toggleCategory = (key: MapCategory) => {
    setCategoryOn((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const onLayerToggle = (id: MapLayerId, value: boolean) => {
    setDevLayers((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="map-page">
      <header className="map-top-bar">
        <Link to="/" className="map-back">
          <ArrowLeft size={22} />
          <span>식단</span>
        </Link>
        <div className="map-search">
          <input
            type="search"
            placeholder="건물명 검색 (레지스트리 id)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            aria-label="건물 검색"
          />
          <button type="button" className="map-search-btn" onClick={runSearch} aria-label="검색 실행">
            <Search size={18} />
          </button>
        </div>
      </header>

      <div className="map-filter-bar">
        {CATEGORY_META.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`map-chip ${categoryOn[key] ? "on" : ""}`}
            onClick={() => toggleCategory(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="map-stage">
        <MapViewport
          ref={viewportRef}
          layerVisible={layerVisible}
          onZoomChange={setZoom}
          onPick={onPick}
        />
      </div>

      <MapBottomSheet open={sheetOpen} detail={sheetDetail} onClose={() => setSheetOpen(false)} />

      {isDev && (
        <MapDevTools
          zoom={zoom}
          lastPick={lastPick}
          layerToggles={devLayers}
          onLayerToggle={onLayerToggle}
          devLabelsAlways={devLabelsAlways}
          onDevLabelsAlways={setDevLabelsAlways}
        />
      )}
    </div>
  );
}
