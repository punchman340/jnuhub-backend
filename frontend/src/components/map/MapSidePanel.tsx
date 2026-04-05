import { useState, useMemo } from "react";
import { Search, X, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import {
  MAP_BUILDING_REGISTRY,
} from "./mapBuildingRegistry";
import type { MapBuildingDetail, MapCategory } from "./mapBuildingRegistry";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedDetail: MapBuildingDetail | null;
  onSelectBuilding: (id: string) => void;
  activeFilter: "all" | MapCategory;
  onFilterChange: (f: "all" | MapCategory) => void;
};

const FILTER_META: { key: "all" | MapCategory; label: string; icon: string }[] = [
  { key: "all",          label: "전체",   icon: "🗺️" },
  { key: "library",      label: "도서관", icon: "📚" },
  { key: "cafe",         label: "카페",   icon: "☕" },
  { key: "convenience",  label: "편의점", icon: "🏪" },
  { key: "hall",         label: "학생마루", icon: "🍱" },
  { key: "dorm",         label: "기숙사", icon: "🏠" },
];

const CATEGORY_LABEL: Record<MapCategory, string> = {
  library:     "📚 도서관",
  cafe:        "☕ 카페",
  convenience: "🏪 편의점",
  hall:        "🍱 학생마루",
  dorm:        "🏠 기숙사",
  other:       "📌 기타",
};

export function MapSidePanel({
  open,
  onClose,
  selectedDetail,
  onSelectBuilding,
  activeFilter,
  onFilterChange,
}: Props) {
  const [search, setSearch] = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    new Set(["library", "cafe", "convenience", "hall"])
  );

  const allBuildings = useMemo(() => Object.values(MAP_BUILDING_REGISTRY), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allBuildings.filter((b) => {
      const matchFilter = activeFilter === "all" || b.category === activeFilter;
      const matchSearch =
        !q ||
        b.displayName.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.rows.some((r) => r.value.toLowerCase().includes(q));
      return matchFilter && matchSearch;
    });
  }, [allBuildings, search, activeFilter]);

  // 카테고리별 그룹핑
  const grouped = useMemo(() => {
    const map = new Map<MapCategory, MapBuildingDetail[]>();
    for (const b of filtered) {
      if (!map.has(b.category)) map.set(b.category, []);
      map.get(b.category)!.push(b);
    }
    return map;
  }, [filtered]);

  const toggleCat = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  return (
    <>
      {/* 백드롭 (모바일) */}
      {open && (
        <div
          className="side-panel-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`side-panel ${open ? "open" : ""}`} aria-label="건물 검색 패널">
        {/* 헤더 */}
        <div className="side-panel-header">
          <span className="side-panel-title">캠퍼스 탐색</span>
          <button className="side-panel-close" onClick={onClose} aria-label="패널 닫기">
            <X size={20} />
          </button>
        </div>

        {/* 검색 */}
        <div className="side-panel-search">
          <Search size={16} className="side-panel-search-icon" />
          <input
            type="search"
            placeholder="건물명 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="건물 검색"
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="검색 초기화">
              <X size={14} />
            </button>
          )}
        </div>

        {/* 카테고리 필터 칩 */}
        <div className="side-panel-chips">
          {FILTER_META.map(({ key, label, icon }) => (
            <button
              key={key}
              className={`side-chip ${activeFilter === key ? "active" : ""}`}
              onClick={() => onFilterChange(key)}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>

        {/* 상세 정보 영역 */}
        {selectedDetail && (
          <div className="side-panel-detail">
            <div className="side-detail-head">
              <MapPin size={16} />
              <strong>{selectedDetail.displayName}</strong>
            </div>
            {selectedDetail.photoSrc ? (
              <img
                src={selectedDetail.photoSrc}
                alt={selectedDetail.displayName}
                className="side-detail-photo"
              />
            ) : (
              <div className="side-detail-photo-placeholder">📷 사진 없음</div>
            )}
            <dl className="side-detail-rows">
              {selectedDetail.rows.map((row) => (
                <div key={row.label} className="side-detail-row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
            <button
              className="side-detail-dismiss"
              onClick={() => onSelectBuilding("")}
            >
              닫기
            </button>
          </div>
        )}

        {/* 건물 목록 */}
        <div className="side-panel-list">
          {grouped.size === 0 && (
            <p className="side-panel-empty">검색 결과가 없습니다.</p>
          )}
          {Array.from(grouped.entries()).map(([cat, buildings]) => (
            <div key={cat} className="side-cat-group">
              <button
                className="side-cat-header"
                onClick={() => toggleCat(cat)}
              >
                {expandedCats.has(cat) ? (
                  <ChevronDown size={15} />
                ) : (
                  <ChevronRight size={15} />
                )}
                <span>{CATEGORY_LABEL[cat] ?? cat}</span>
                <span className="side-cat-count">{buildings.length}</span>
              </button>
              {expandedCats.has(cat) && (
                <ul className="side-building-list">
                  {buildings.map((b) => (
                    <li key={b.id}>
                      <button
                        className={`side-building-item ${
                          selectedDetail?.id === b.id ? "selected" : ""
                        }`}
                        onClick={() => onSelectBuilding(b.id)}
                      >
                        <MapPin size={13} />
                        <span>{b.displayName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
