export type MapCategory =
  | "library"
  | "cafe"
  | "convenience"
  | "dorm"
  | "hall"
  | "exit"
  | "college"
  | "other";

export interface MapBuildingDetail {
  id: string;
  displayName: string;
  category: MapCategory;
  /** 단과대 사이드바 2단 그룹 (college 전용) */
  collegeGroup?: string;
  photoSrc?: string;
  rows: { label: string; value: string }[];
  focus: { cx: number; cy: number };
}

function b(
  id: string,
  displayName: string,
  category: MapCategory,
  focus: { cx: number; cy: number },
  opts?: {
    collegeGroup?: string;
    rows?: { label: string; value: string }[];
    photoSrc?: string;
  },
): MapBuildingDetail {
  return {
    id,
    displayName,
    category,
    collegeGroup: opts?.collegeGroup,
    photoSrc: opts?.photoSrc,
    rows: opts?.rows ?? [{ label: "위치", value: "전남대 용봉캠퍼스" }],
    focus,
  };
}

/** SVG <path id> 또는 <text id> — 클릭·핀·포커스 기준 */
const COLLEGE: {
  id: string;
  name: string;
  group: string;
  cx: number;
  cy: number;
}[] = [
  { id: "eng-1", name: "공과대학 1호관", group: "공과대학 (공대)", cx: 1162, cy: 238 },
  { id: "eng-2", name: "공과대학 2호관", group: "공과대학 (공대)", cx: 1036, cy: 307 },
  { id: "eng-3", name: "공과대학 3호관", group: "공과대학 (공대)", cx: 1185, cy: 323 },
  { id: "eng-4", name: "공과대학 4호관", group: "공과대학 (공대)", cx: 1063, cy: 345 },
  { id: "eng-5", name: "공과대학 5호관", group: "공과대학 (공대)", cx: 1220, cy: 404 },
  { id: "eng-6", name: "공과대학 6호관", group: "공과대학 (공대)", cx: 1032, cy: 238 },
  { id: "eng-7", name: "공과대학 7호관", group: "공과대학 (공대)", cx: 1083, cy: 382 },
  { id: "eng-pra-1", name: "공대 실습동 1", group: "공과대학 (공대)", cx: 1113, cy: 186 },
  { id: "eng-pra-2", name: "공대 실습동 2", group: "공과대학 (공대)", cx: 1098, cy: 197 },
  { id: "wei-pra", name: "중량실습동", group: "공과대학 (공대)", cx: 1125, cy: 212 },
  { id: "ind-1", name: "산학협력관", group: "공과대학 (공대)", cx: 1177, cy: 206 },
  { id: "ind-3", name: "산업협력관 3", group: "공과대학 (공대)", cx: 919, cy: 112 },
  { id: "cre-hall", name: "창조관", group: "공과대학 (공대)", cx: 948, cy: 272 },
  { id: "it-center", name: "정보전산원", group: "공과대학 (공대)", cx: 958, cy: 336 },

  { id: "agri-1", name: "농업생명과학대학 1호관", group: "농업생명과학대학 (농대)", cx: 360, cy: 614 },
  { id: "agri-2", name: "농업생명과학대학 2호관", group: "농업생명과학대학 (농대)", cx: 470, cy: 551 },
  { id: "agri-3", name: "농업생명과학대학 3호관", group: "농업생명과학대학 (농대)", cx: 565, cy: 568 },
  { id: "agri-4", name: "농업생명과학대학 4호관", group: "농업생명과학대학 (농대)", cx: 452, cy: 615 },
  { id: "agri-5", name: "농업생명과학대학 5호관", group: "농업생명과학대학 (농대)", cx: 400, cy: 720 },
  { id: "agri-6", name: "농업생명과학대학 6호관", group: "농업생명과학대학 (농대)", cx: 206, cy: 914 },
  { id: "agri-pra", name: "농대 실습장", group: "농업생명과학대학 (농대)", cx: 348, cy: 711 },

  { id: "hum-1", name: "인문대학 1호관", group: "인문대학", cx: 714, cy: 482 },
  { id: "hum-2", name: "인문대학 2호관", group: "인문대학", cx: 758, cy: 408 },
  { id: "hum-3", name: "인문대학 3호관", group: "인문대학", cx: 736, cy: 514 },

  { id: "edu", name: "사범대학본관", group: "사범대학", cx: 808, cy: 330 },
  { id: "edu-sci", name: "사범대·과학교육관", group: "사범대학", cx: 1107, cy: 425 },
  { id: "fut", name: "미래교육관(사범)", group: "사범대학", cx: 805, cy: 432 },
  { id: "fut-edu", name: "미래교육관", group: "사범대학", cx: 904, cy: 298 },

  { id: "art-1", name: "예술대학 1호관", group: "예술대학", cx: 780, cy: 252 },
  { id: "art-2", name: "예술대학 2호관", group: "예술대학", cx: 852, cy: 175 },
  { id: "art-3", name: "예술대학 3호관", group: "예술대학", cx: 772, cy: 212 },

  { id: "ai", name: "AI융합대학", group: "AI융합대학", cx: 858, cy: 241 },

  { id: "man-1", name: "경영대학 1호관", group: "경영대학", cx: 665, cy: 548 },
  { id: "man-2", name: "경영대학 2호관", group: "경영대학", cx: 632, cy: 537 },
  { id: "man-gra", name: "경영전문대학원", group: "경영대학", cx: 1147, cy: 616 },

  { id: "soc-1", name: "사회과학대학", group: "사회과학대학", cx: 668, cy: 685 },
  { id: "soc-2", name: "사회과학대학 2", group: "사회과학대학", cx: 651, cy: 688 },

  { id: "law-1", name: "법과대학 1", group: "법과대학", cx: 650, cy: 784 },
  { id: "law-2", name: "법과대학 2", group: "법과대학", cx: 603, cy: 804 },
  { id: "law-3", name: "법과대학 3", group: "법과대학", cx: 569, cy: 787 },

  { id: "nat-1", name: "자연과학대학 1호관", group: "자연과학대학", cx: 1105, cy: 475 },
  { id: "nat-2", name: "자연과학대학 2호관", group: "자연과학대학", cx: 1160, cy: 515 },
  { id: "nat-3", name: "자연과학대학 3호관", group: "자연과학대학", cx: 1180, cy: 556 },
  { id: "nat-4", name: "자연과학대학 4호관", group: "자연과학대학", cx: 1112, cy: 577 },
  { id: "nat-5", name: "자연과학대학 5호관", group: "자연과학대학", cx: 1208, cy: 612 },
  { id: "basic-sci", name: "기초과학지원연구원", group: "자연과학대학", cx: 1086, cy: 546 },

  { id: "phar-1", name: "약학대학 1호관", group: "약학대학", cx: 1250, cy: 507 },
  { id: "phar-2", name: "약학대학 2호관", group: "약학대학", cx: 1267, cy: 541 },

  { id: "life-sci-1", name: "생활과학대학", group: "생활과학대학", cx: 1227, cy: 810 },
  { id: "life-sci-2", name: "생활과학대학 2", group: "생활과학대학", cx: 1174, cy: 828 },

  { id: "vet-1", name: "수의과대학 1호관", group: "수의과대학", cx: 397, cy: 800 },
  { id: "vet-2", name: "수의과대학 2호관", group: "수의과대학", cx: 478, cy: 784 },

  { id: "den", name: "치의전문대학원", group: "치의학·치과", cx: 1128, cy: 832 },
  { id: "den-hos", name: "전대치과병원", group: "치의학·치과", cx: 398, cy: 958 },

  { id: "lan", name: "언어교육원", group: "국제·언어", cx: 1085, cy: 68 },
  { id: "mand", name: "만들마루", group: "국제·언어", cx: 1003, cy: 78 },

  { id: "truth", name: "진리관", group: "기타 교육시설", cx: 602, cy: 492 },
  { id: "rotc", name: "학군단", group: "기타 교육시설", cx: 926, cy: 288 },
  { id: "storyium", name: "스토리움", group: "기타 교육시설", cx: 894, cy: 308 },
  { id: "sci-hall", name: "과학관", group: "기타 교육시설", cx: 1224, cy: 582 },
  { id: "com-lab", name: "공동실험실", group: "기타 교육시설", cx: 1178, cy: 601 },
  { id: "geumho", name: "금호연구관", group: "기타 교육시설", cx: 1113, cy: 608 },
  { id: "phy-edu", name: "체육교육관", group: "체육·건강", cx: 1276, cy: 731 },
  { id: "gym", name: "체육관", group: "체육·건강", cx: 1300, cy: 682 },
  { id: "museum", name: "박물관", group: "문화시설", cx: 1233, cy: 675 },
  { id: "sports-center", name: "스포츠센터", group: "체육·건강", cx: 1297, cy: 654 },
  { id: "yongji-hall", name: "용지관", group: "기타", cx: 1106, cy: 651 },
  { id: "yongbong-hall", name: "용봉관", group: "기타", cx: 857, cy: 612 },
  { id: "demo", name: "민주마루", group: "기타", cx: 928, cy: 603 },
  { id: "main-office", name: "대학본부", group: "행정", cx: 1016, cy: 608 },
  { id: "prime-hall", name: "프라임관", group: "기타", cx: 611, cy: 760 },
];

const collegeRecord: Record<string, MapBuildingDetail> = Object.fromEntries(
  COLLEGE.map((c) => [
    c.id,
    b(c.id, c.name, "college", { cx: c.cx, cy: c.cy }, { collegeGroup: c.group }),
  ]),
);

export const MAP_BUILDING_REGISTRY: Record<string, MapBuildingDetail> = {
  ...collegeRecord,

  "stu-center-1": b("stu-center-1", "제1학생마루", "hall", { cx: 948, cy: 528 }),
  "stu-center-2": b("stu-center-2", "제2학생마루", "hall", { cx: 575, cy: 715 }),
  haed: b("haed", "햇들마루", "hall", { cx: 1220, cy: 128 }),

  "dorm-5": b("dorm-5", "5생활관", "dorm", { cx: 1235, cy: 162 }),
  "dorm-6": b("dorm-6", "6생활관", "dorm", { cx: 1242, cy: 192 }),
  "dorm-7": b("dorm-7", "7생활관", "dorm", { cx: 299, cy: 558 }),
  "dorm-8": b("dorm-8", "8생활관", "dorm", { cx: 338, cy: 570 }),
  "dorm-8_2": b("dorm-8_2", "8생활관 별동", "dorm", { cx: 330, cy: 588 }),
  "dorm-9": b("dorm-9", "9생활관", "dorm", { cx: 795, cy: 148 }),
  "dorm-che": b("dorm-che", "청아관", "dorm", { cx: 1180, cy: 92 }),

  main_gate: b("main_gate", "정문", "exit", { cx: 736, cy: 908 }),
  back_gate: b("back_gate", "후문", "exit", { cx: 1301, cy: 608 }),
  back_sidegate: b("back_sidegate", "후문 쪽문", "exit", { cx: 1266, cy: 320 }),
  com_sidegate: b("com_sidegate", "상대 쪽문", "exit", { cx: 701, cy: 410 }),

  "library-main": b("library-main", "도서관 본관(홍도)", "library", { cx: 812, cy: 508 }),
  "library-info": b("library-info", "도서관정보마루(디도)", "library", { cx: 798, cy: 548 }),
  "library-annex": b("library-annex", "도서관별관(백도)", "library", { cx: 888, cy: 388 }),

  스타벅스: b("스타벅스", "카페 (예시)", "cafe", { cx: 1122, cy: 358 }),
  CU편의점: b("CU편의점", "편의점 (예시)", "convenience", { cx: 1086, cy: 265 }),
};

export function listSearchableBuildingIds(): string[] {
  return Object.keys(MAP_BUILDING_REGISTRY);
}

const ID_ALIASES: Record<string, string> = {
  storyum: "storyium",
  soc: "soc-1",
  law: "law-1",
  den_2: "den",
};

/** 라벨 id(hum-1_2) → 건물 id(hum-1) 등 레지스트리 키로 정규화 */
export function normalizeRegistryBuildingId(raw: string | null): string | null {
  if (!raw) return null;
  if (MAP_BUILDING_REGISTRY[raw]) return raw;
  const aliased = ID_ALIASES[raw];
  if (aliased && MAP_BUILDING_REGISTRY[aliased]) return aliased;
  if (raw.endsWith("_2")) {
    const base = raw.slice(0, -2);
    if (MAP_BUILDING_REGISTRY[base]) return base;
  }
  return null;
}

export function findBuildingsByQuery(q: string): string[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  return listSearchableBuildingIds().filter((id) => {
    const d = MAP_BUILDING_REGISTRY[id];
    return (
      id.toLowerCase().includes(t) ||
      d.displayName.toLowerCase().includes(t) ||
      (d.collegeGroup?.toLowerCase().includes(t) ?? false) ||
      d.rows.some((r) => r.value.toLowerCase().includes(t) || r.label.toLowerCase().includes(t))
    );
  });
}
