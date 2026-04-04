/** SVG 원본 viewBox와 일치 (JNUHUB-MAPDESIGN.svg) */
export const MAP_VIEWBOX = { w: 1440, h: 1024 } as const;

/** labels 그룹을 보이기 시작하는 최소 줌(스케일). LOD 튜닝용 */
export const LABEL_ZOOM_THRESHOLD = 1.15;

/**
 * SVG 안에서 `<g id="...">` 로 묶을 레이어 id.
 * 파일에 해당 그룹이 없으면 토글/LOD는 조용히 무시됩니다.
 */
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
