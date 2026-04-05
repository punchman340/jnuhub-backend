/** SVG 원본 viewBox와 일치 (JNUHUB-MAPDESIGN.svg) */
export const MAP_VIEWBOX = { w: 1440, h: 1024 } as const;

/** 이 줌 이상이면 상세 도로(road_detail), 미만이면 간략 도로(road_simple) 위주 */
export const ROAD_DETAIL_ZOOM_THRESHOLD = 0.82;

/** 이 줌 이상이면 건물명(lables 그룹) 표시 */
export const LABEL_ZOOM_THRESHOLD = 1.02;

/**
 * 앱에서 쓰는 논리 레이어 id (SVG 실제 id와 다를 수 있음 → MapViewport에서 매핑)
 */
export const MAP_LAYER_IDS = [
  "labels",
  "road_simple",
  "road_detail",
  "cafe",
  "convenience",
] as const;

export type MapLayerId = (typeof MAP_LAYER_IDS)[number];

/** POI 필터 (한 번에 하나만 활성) */
export type MapPoiFilter = "all" | "cafe" | "convenience" | "library";
