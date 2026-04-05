/** 줌이 낮아도 항상 보일 라벨 (#lables 내 <text>) 판별 */

const PRIORITY_TEXT_IDS = new Set<string>([
  "den-hos_2",
  "stu-center-1_2",
  "stu-center-2_2",
  "museum_2",
  "sports-center_2",
  "main_gate",
  "back_gate",
  "back_sidegate",
  "com_sidegate",
  "dorm-5_2",
  "dorm-6_2",
  "dorm-9_2",
  "dorm-che_2",
  "haed_2",
]);

function norm(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export function isPriorityMapLabel(textEl: SVGTextElement): boolean {
  const id = textEl.getAttribute("id") ?? "";
  if (PRIORITY_TEXT_IDS.has(id)) return true;
  const t = norm(textEl.textContent ?? "");
  if (!t) return false;
  if (t.includes("대학") || t.includes("생활과학")) return true;
  if (t.includes("생활관")) return true;
  if (t.includes("청아관")) return true;
  if (t.includes("전대치과병원") || t.includes("치과병원")) return true;
  if (t.includes("정문") || t === "후문") return true;
  if (t.includes("후문") && t.includes("쪽문")) return true;
  if (t.includes("상대") && t.includes("쪽문")) return true;
  if (t.includes("박물관")) return true;
  if (t.includes("스포츠센터")) return true;
  if (t.includes("제1학생마루") || t.includes("제2학생마루")) return true;
  return false;
}
