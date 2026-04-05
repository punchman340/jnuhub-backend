import { useMemo, useState } from "react";
import { Search, X, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { MAP_BUILDING_REGISTRY, type MapBuildingDetail, type MapCategory } from "./mapBuildingRegistry";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedDetail: MapBuildingDetail | null;
  onSelectBuilding: (id: string) => void;
  sidebarCategory: MapCategory | "all";
  onCategoryChange: (c: MapCategory | "all") => void;
  onClearCategory: () => void;
};

const CATEGORY_ORDER: (MapCategory | "all")[] = [
  "all",
  "exit",
  "hall",
  "dorm",
  "college",
  "library",
  "cafe",
  "convenience",
  "other",
];

const CATEGORY_LABEL: Record<MapCategory | "all", string> = {
  all: "전체",
  exit: "탈출 · 출입구",
  hall: "학생마루",
  dorm: "기숙사",
  college: "단과대",
  library: "도서관",
  cafe: "카페",
  convenience: "편의점",
  other: "기타",
};

export function MapSidePanel({
  open,
  onClose,
  selectedDetail,
  onSelectBuilding,
  sidebarCategory,
  onCategoryChange,
  onClearCategory,
}: Props) {
  const [search, setSearch] = useState("");
  const [expandedCollege, setExpandedCollege] = useState<Set<string>>(() => new Set());

  const allBuildings = useMemo(() => Object.values(MAP_BUILDING_REGISTRY), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allBuildings.filter((b) => {
      const matchFilter = sidebarCategory === "all" || b.category === sidebarCategory;
      const matchSearch =
        !q ||
        b.displayName.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        (b.collegeGroup?.toLowerCase().includes(q) ?? false) ||
        b.rows.some((r) => r.value.toLowerCase().includes(q));
      return matchFilter && matchSearch;
    });
  }, [allBuildings, search, sidebarCategory]);

  const collegeByGroup = useMemo(() => {
    const map = new Map<string, MapBuildingDetail[]>();
    for (const b of filtered) {
      if (b.category !== "college" || !b.collegeGroup) continue;
      if (!map.has(b.collegeGroup)) map.set(b.collegeGroup, []);
      map.get(b.collegeGroup)!.push(b);
    }
    for (const arr of map.values()) arr.sort((a, x) => a.displayName.localeCompare(x.displayName, "ko"));
    return map;
  }, [filtered]);

  const nonCollegeGroups = useMemo(() => {
    const map = new Map<MapCategory, MapBuildingDetail[]>();
    for (const b of filtered) {
      if (b.category === "college") continue;
      if (!map.has(b.category)) map.set(b.category, []);
      map.get(b.category)!.push(b);
    }
    for (const arr of map.values()) arr.sort((a, x) => a.displayName.localeCompare(x.displayName, "ko"));
    return map;
  }, [filtered]);

  const showCollegeList = sidebarCategory === "all" || sidebarCategory === "college";
  const showNonCollegeList = sidebarCategory !== "college";

  const toggleCollege = (g: string) => {
    setExpandedCollege((prev) => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });
  };

  return (
    <>
      {open && (
        <div
          className="side-panel-backdrop"
          onClick={onClose}
          role="button"
          aria-label="닫기"
        />
      )}

      <div className={`side-panel${open ? " open" : ""}`}>
        <div className="side-panel-header">
          <span className="side-panel-title">캠퍼스 시설</span>
          <button type="button" className="side-panel-close" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="side-panel-search">
          <Search size={15} className="side-panel-search-icon" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="건물·단과대 검색…"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="검색어 지우기">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="side-panel-filter-head">
          <span className="side-filter-label">카테고리</span>
          {sidebarCategory !== "all" && (
            <button type="button" className="side-filter-clear" onClick={onClearCategory} title="필터 해제">
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
        <div className="side-panel-chips" role="tablist" aria-label="시설 유형">
          {CATEGORY_ORDER.filter((k) => k !== "other" || nonCollegeGroups.has("other")).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={sidebarCategory === key}
              className={`side-chip${sidebarCategory === key ? " active" : ""}`}
              onClick={() => onCategoryChange(key)}
            >
              {CATEGORY_LABEL[key]}
            </button>
          ))}
        </div>

        {selectedDetail && (
          <div className="side-panel-detail">
            <div className="side-detail-head">
              <MapPin size={15} />
              <strong>{selectedDetail.displayName}</strong>
              <button
                type="button"
                className="side-detail-clear"
                onClick={() => onSelectBuilding("")}
                aria-label="선택 해제"
                title="선택 해제"
              >
                <X size={18} />
              </button>
            </div>
            {selectedDetail.photoSrc ? (
              <img
                src={selectedDetail.photoSrc}
                alt={selectedDetail.displayName}
                className="side-detail-photo"
              />
            ) : (
              <div className="side-detail-photo-placeholder">사진 없음</div>
            )}
            <dl className="side-detail-rows">
              {selectedDetail.rows.map((row) => (
                <div key={row.label} className="side-detail-row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="side-panel-list">
          {filtered.length === 0 && <p className="side-panel-empty">검색 결과가 없습니다.</p>}

          {showCollegeList &&
            Array.from(collegeByGroup.entries())
              .sort(([a], [b]) => a.localeCompare(b, "ko"))
              .map(([group, buildings]) => {
                const accordion = sidebarCategory === "college";
                const openG = !accordion || expandedCollege.has(group);
                return (
                  <div key={group} className="side-cat-group">
                    {accordion ? (
                      <button type="button" className="side-cat-header" onClick={() => toggleCollege(group)}>
                        {openG ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        {group}
                        <span className="side-cat-count">{buildings.length}</span>
                      </button>
                    ) : (
                      <div className="side-cat-header side-cat-header--static">
                        {group}
                        <span className="side-cat-count">{buildings.length}</span>
                      </div>
                    )}
                    {openG && (
                      <ul className="side-building-list">
                        {buildings.map((b) => (
                          <li key={b.id}>
                            <button
                              type="button"
                              className={`side-building-item${selectedDetail?.id === b.id ? " selected" : ""}`}
                              onClick={() => onSelectBuilding(b.id)}
                            >
                              <MapPin size={13} />
                              {b.displayName}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}

          {showNonCollegeList &&
            CATEGORY_ORDER.filter((c) => c !== "all" && c !== "college")
              .map((cat) => {
                const buildings = nonCollegeGroups.get(cat as MapCategory);
                if (!buildings?.length) return null;
                return (
                  <div key={cat} className="side-cat-group">
                    <div className="side-cat-header side-cat-header--static">{CATEGORY_LABEL[cat as MapCategory]}</div>
                    <ul className="side-building-list">
                      {buildings.map((b) => (
                        <li key={b.id}>
                          <button
                            type="button"
                            className={`side-building-item${selectedDetail?.id === b.id ? " selected" : ""}`}
                            onClick={() => onSelectBuilding(b.id)}
                          >
                            <MapPin size={13} />
                            {b.displayName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
        </div>
      </div>
    </>
  );
}
