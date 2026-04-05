// src/components/map/mapConstants.ts

export const MAP_VIEWBOX = { w: 1440, h: 1024 } as const;

export const LABEL_ZOOM_THRESHOLD       = 1.15;
export const ROAD_DETAIL_ZOOM_THRESHOLD = 1.5;

export const MAP_LAYER_IDS = [
  "labels",
  "road_simple",
  "road_detail",
  "cafe",
  "convenience",
  "library",
  "parking",
] as const;

export type MapLayerId   = (typeof MAP_LAYER_IDS)[number];
export type MapPoiFilter = "all" | "library" | "cafe" | "convenience";
