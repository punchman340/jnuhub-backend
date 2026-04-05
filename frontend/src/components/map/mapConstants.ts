/** SVG 원본 viewBox와 일치 (JNUHUB-MAPDESIGN.svg) */
export const MAP_VIEWBOX = { w: 1440, h: 1024 } as const;

/** labels 그룹을 보이기 시작하는 최소 줌 */
export const LABEL_ZOOM_THRESHOLD = 1.15;
export const ROAD_DETAIL_ZOOM_THRESHOLD = 1.8;

/** ✅ 줌 범위 - 전남대 캠퍼스만 보면 되니까 축소 제한 */
export const MIN_SCALE = 0.6;
export const MAX_SCALE = 4.0;

export const MAP_LAYER_IDS = [
  "labels",
  "road_simple",
  "road_detail",
  "cafe",
  "convenience",
  "library",
  "parking",
] as const;



export type MapLayerId = (typeof MAP_LAYER_IDS)[number];

/** POI 필터 - "all" 이외엔 해당 카테고리 핀만 강조 */
export type MapPoiFilter = "all" | "library" | "cafe" | "convenience";
