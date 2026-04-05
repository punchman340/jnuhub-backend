import { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import "../App.css";
import { MAP_BUILDING_REGISTRY, findBuildingsByQuery } from "../components/map/mapBuildingRegistry";
import {
  LABEL_ZOOM_THRESHOLD,
  ROAD_DETAIL_ZOOM_THRESHOLD,
  type MapPoiFilter,
} from "../components/map/mapConstants";
import { MapBottomSheet } from "../components/map/MapBottomSheet";
import { MapDevTools } from "../components/map/MapDevTools";
import { MapViewport, type MapPickInfo, type MapViewportHandle } from "../components/map/MapViewport";
import "../components/map/MapPage.css";

const POI_OPTIONS: { value: MapPoiFilter; label: string }[] = [
  { value: "all",          label: "전체"   },
  { value: "library",      label: "도서관" },
  { value: "cafe",         label: "카페"   },
  { value: "convenience",  label: "편의점" },
];

export default function MapPage() {
  const viewportRef = useRef<MapViewportHandle>(null);

  const [zoom,           setZoom]          = useState(0.4);
  const [search,         setSearch]        = useState("");
  const [lastPick,       setLastPick]      = useState<MapPickInfo | null>(null);
  const [poiFilter,      setPoiFilter]     = useState<MapPoiFilter>("all");
  const [devForceLabels, setDevForceLabels]= useState(false); // ← 컴포넌트 안으로
  const [sheetOpen,      setSheetOpen]     = useState(false);
  const [sheetDetail,    setSheetDetail]   = useState<
    (typeof MAP_BUILDING_REGISTRY)[string] | null
  >(null);

  const isDev = import.meta.env.DEV;

  // ── 레이어 표시 여부 ──────────────────────────────────────────
  const layerVisible = useMemo(() => {
    const roadDetail = zoom >= ROAD_DETAIL_ZOOM_THRESHOLD;
    // dev: 체크박스 강제 on 또는 줌 기준. prod: 줌 기준만.
    const labelsOn = devForceLabels || zoom >= LABEL_ZOOM_THRESHOLD;

    return {
      labels:      labelsOn,
      road_simple: !roadDetail,
      road_detail:  roadDetail,
      cafe:         true,
      convenience:  true,
      library:      true,
      parking:      true,
    };
  }, [zoom, devForceLabels]);

  // ── 클릭 핸들러 ───────────────────────────────────────────────
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

  // ── 검색 ──────────────────────────────────────────────────────
  const runSearch = () => {
    const matches = findBuildingsByQuery(search);
    if (matches.length === 0) {
      if (isDev) console.warn("[Map] 검색 결과 없음:", search);
      return;
    }
    const id = matches[0];
    const ok = viewportRef.current?.focusByBuildingId(id);
    if (ok && MAP_BUILDING_REGISTRY[id]) {
      setSheetDetail(MAP_BUILDING_REGISTRY[id]);
      setSheetOpen(true);
    }
  };

  return (
    <div className="map-page">
      {/* ── 헤더 ── */}
      <header className="map-top-bar">
        <Link to="/" className="map-back">
          <ArrowLeft size={22} />
          <span>식단</span>
        </Link>
        <div className="map-search">
          <input
            type="search"
            placeholder="건물 검색 (예: 도서관, library-main)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            aria-label="건물 검색"
          />
          <button
            type="button"
            className="map-search-btn"
            onClick={runSearch}
            aria-label="검색 실행"
          >
            <Search size={18} />
          </button>
        </div>
      </header>

      {/* ── 카테고리 필터 ── */}
      <div className="map-filter-bar" role="tablist" aria-label="시설 유형">
        {POI_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={poiFilter === value}
            className={`map-chip${poiFilter === value ? " on" : ""}`}
            onClick={() => setPoiFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 지도 ── */}
      <div className="map-stage">
        <MapViewport
          ref={viewportRef}
          layerVisible={layerVisible}
          poiFilter={poiFilter}
          onZoomChange={setZoom}
          onPick={onPick}
        />
      </div>

      {/* ── 바텀시트 ── */}
      <MapBottomSheet
        open={sheetOpen}
        detail={sheetDetail}
        onClose={() => setSheetOpen(false)}
      />

      {/* ── DevTools (dev 빌드에서만) ── */}
      {isDev && (
        <MapDevTools
          zoom={zoom}
          lastPick={lastPick}
          devForceLabels={devForceLabels}
          onDevForceLabels={setDevForceLabels}
        />
      )}
    </div>
  );
}
