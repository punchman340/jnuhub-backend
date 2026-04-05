export type MapCategory = "library" | "cafe" | "convenience" | "dorm" | "hall" | "other";

export interface MapBuildingDetail {
  id: string;
  displayName: string;
  category: MapCategory;
  photoSrc?: string;
  rows: { label: string; value: string }[];
  focus: { cx: number; cy: number };
}

export const MAP_BUILDING_REGISTRY: Record<string, MapBuildingDetail> = {
  제1학생마루: {
    id: "제1학생마루",
    displayName: "제1학생마루",
    category: "hall",
    photoSrc: undefined,
    rows: [
      { label: "위치", value: "광주 용봉캠퍼스" },
      { label: "메모", value: "학식 · 일품/한식 코너" },
    ],
    focus: { cx: 820, cy: 480 },
  },
  제2학생마루: {
    id: "제2학생마루",
    displayName: "제2학생마루",
    category: "hall",
    rows: [
      { label: "위치", value: "광주 용봉캠퍼스" },
      { label: "메모", value: "중식 위주" },
    ],
    focus: { cx: 780, cy: 520 },
  },
  햇들마루: {
    id: "햇들마루",
    displayName: "햇들마루",
    category: "hall",
    rows: [
      { label: "위치", value: "광주 용봉캠퍼스" },
      { label: "메모", value: "조·중·석" },
    ],
    focus: { cx: 900, cy: 420 },
  },
  명학회관: {
    id: "명학회관",
    displayName: "명학회관 (학동)",
    category: "hall",
    rows: [
      { label: "위치", value: "학동" },
      { label: "메모", value: "교내식당" },
    ],
    focus: { cx: 640, cy: 560 },
  },
  중앙도서관: {
    id: "중앙도서관",
    displayName: "중앙도서관",
    category: "library",
    rows: [{ label: "이용", value: "열람 · 스터디 (예시 데이터)" }],
    focus: { cx: 700, cy: 400 },
  },
  스타벅스: {
    id: "스타벅스",
    displayName: "스타벅스 (예시)",
    category: "cafe",
    rows: [{ label: "메뉴", value: "커피 · 베이커리 (직접 수정)" }],
    focus: { cx: 750, cy: 450 },
  },
  CU편의점: {
    id: "CU편의점",
    displayName: "CU (예시)",
    category: "convenience",
    rows: [{ label: "메모", value: "간식 · 생필품" }],
    focus: { cx: 680, cy: 500 },
  },

  "library-main": {
    id: "library-main",
    displayName: "도서관 본관(홍도)",
    category: "library",
    rows: [
      { label: "위치", value: "용봉캠퍼스" },
      { label: "메모", value: "SVG id: library-main" },
    ],
    focus: { cx: 812, cy: 508 },
  },
  "library-info": {
    id: "library-info",
    displayName: "도서관정보마루(디도)",
    category: "library",
    rows: [{ label: "메모", value: "SVG id: library-info" }],
    focus: { cx: 798, cy: 548 },
  },
  "library-annex": {
    id: "library-annex",
    displayName: "도서관별관(백도)",
    category: "library",
    rows: [{ label: "메모", value: "SVG id: library-annex" }],
    focus: { cx: 888, cy: 388 },
  },
};

export function listSearchableBuildingIds(): string[] {
  return Object.keys(MAP_BUILDING_REGISTRY);
}

export function findBuildingsByQuery(q: string): string[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  return listSearchableBuildingIds().filter((id) => {
    const d = MAP_BUILDING_REGISTRY[id];
    return (
      id.toLowerCase().includes(t) ||
      d.displayName.toLowerCase().includes(t) ||
      d.rows.some((r) => r.value.toLowerCase().includes(t) || r.label.toLowerCase().includes(t))
    );
  });
}
