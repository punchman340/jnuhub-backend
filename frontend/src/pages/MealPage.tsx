import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Sunrise, Sun, Moon,
  MapPin, Utensils, RefreshCw,
  CalendarDays, X, Map as MapIcon,
} from "lucide-react";
import "../App.css";
import MealAiPanel from "../components/meal/MealAiPanel";

/* ──────────────────────── 상수 ──────────────────────── */
const CAMPUS_GROUPS = [
  {
    campus: "🏙️ 광주캠퍼스",
    restaurants: [
      { id: 1, name: "제1학생마루" },
      { id: 2, name: "햇들마루" },
      { id: 3, name: "제2학생마루" },
      { id: 4, name: "명학회관" },
      { id: 7, name: "광주생활관" },
    ],
  },
  {
    campus: "🌊 여수캠퍼스",
    restaurants: [
      { id: 5, name: "여수학생회관" },
      { id: 8, name: "여수생활관" },
    ],
  },
  {
    campus: "🏥 화순캠퍼스",
    restaurants: [{ id: 6, name: "화순여미샘" }],
  },
];

const MEAL_ORDER: Record<string, number> = { BREAKFAST: 1, LUNCH: 2, DINNER: 3 };
const MEAL_LABEL: Record<string, string> = { BREAKFAST: "조식", LUNCH: "중식", DINNER: "석식" };
const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER"] as const;
type MealType = (typeof MEAL_TYPES)[number];

const SUB_LABEL: Record<string, string> = {
  TYPE_A: "A코너",
  TYPE_B: "B코너",
  KOREAN: "한식",
  SPECIAL: "일품",
};

type Status = "idle" | "loading" | "error" | "empty" | "success";

interface MealEntry {
  rawType: string;
  mealLabel: string;
  subLabel: string;
  menuItems: string[];
}
interface WeeklyDayResult {
  date: string;
  mealsByType: Record<string, unknown[]>;
  freshness: string | null;
}

/* ──────────────────────── 유틸 ──────────────────────── */
function getLocalDateStr(date: Date): string {
  return date.toLocaleDateString("en-CA");
}

function getMealFocus(date: Date): MealType {
  const todayStr = getLocalDateStr(new Date());
  if (getLocalDateStr(date) !== todayStr) return "LUNCH";

  const now = new Date();
  const min = now.getHours() * 60 + now.getMinutes();
  if (min < 9 * 60) return "BREAKFAST";
  if (min < 13 * 60 + 30) return "LUNCH";
  if (min < 19 * 60) return "DINNER";
  return "LUNCH";
}

function formatDateKo(date: Date): string {
  return date.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function getWeekDates(base: Date): Date[] {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return x;
  });
}

function parseMealsData(mealsData: unknown): MealEntry[] {
  if (!mealsData || typeof mealsData !== "object") return [];
  const arr: MealEntry[] = [];
  Object.entries(mealsData as Record<string, unknown[]>).forEach(([type, items]) => {
    (items ?? []).forEach((item: unknown) => {
      const it = item as { subType?: string; menuItems?: string[] };
      arr.push({
        rawType: type,
        mealLabel: MEAL_LABEL[type] ?? type,
        subLabel: SUB_LABEL[it.subType ?? ""] ?? it.subType ?? "",
        menuItems: it.menuItems ?? [],
      });
    });
  });
  arr.sort((a, b) => (MEAL_ORDER[a.rawType] ?? 9) - (MEAL_ORDER[b.rawType] ?? 9));
  return arr;
}

/* ──────────────────────── 컴포넌트 ──────────────────────── */
export default function MealPage() {
  const allRestaurants = CAMPUS_GROUPS.flatMap((g) => g.restaurants);
  const todayStr = getLocalDateStr(new Date());

  const [selectedId, setSelectedId] = useState(allRestaurants[0].id);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [retryKey, setRetryKey] = useState(0);
  const [activeMeal, setActiveMeal] = useState<MealType>(() => getMealFocus(new Date()));
  const [showWeekly, setShowWeekly] = useState(false);
  const [weeklyMeals, setWeeklyMeals] = useState<Record<string, MealEntry[]>>({});
  const [weeklyStatus, setWeeklyStatus] = useState<Status>("idle");

  const weekDates = getWeekDates(currentDate);
  const dateSliderRef = useRef<HTMLDivElement>(null);
  const sliderDragging = useRef(false);
  const sliderStartX = useRef(0);
  const sliderScrollLeft = useRef(0);

  const mainFetchId = useRef(0);
  const weeklyFetchId = useRef(0);
  const mainAbortCtrl = useRef<AbortController | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const scrollStart = useRef(0);

  const dateStr = getLocalDateStr(currentDate);
  const isToday = dateStr === todayStr;

  useEffect(() => {
    const idx = weekDates.findIndex((d) => getLocalDateStr(d) === dateStr);
    if (idx === -1 || !dateSliderRef.current) return;
    const container = dateSliderRef.current;
    const slot = container.children[idx] as HTMLElement;
    if (!slot) return;
    const offset = slot.offsetLeft - container.offsetWidth / 2 + slot.offsetWidth / 2;
    container.scrollTo({ left: offset, behavior: "smooth" });
  }, [dateStr, weekDates]);

  useEffect(() => {
    chipRefs.current[selectedId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [selectedId]);

  const fetchMeals = useCallback((resId: number, ds: string) => {
    mainAbortCtrl.current?.abort();
    const ctrl = new AbortController();
    mainAbortCtrl.current = ctrl;

    const myId = ++mainFetchId.current;

    setStatus("loading");
    setMeals([]);

    (async () => {
      try {
        const res = await axios.get("/api/meals/daily", {
          params: { restaurantId: resId, date: ds },
          timeout: 6000,
          signal: ctrl.signal,
        });
        if (myId !== mainFetchId.current) return;

        const arr = parseMealsData(res.data?.data?.mealsByType);
        if (arr.length === 0) {
          setStatus("empty");
          return;
        }
        setMeals(arr);
        setStatus("success");

        setActiveMeal(() => {
          const want = getMealFocus(new Date(ds));
          return arr.some((m) => m.rawType === want)
            ? want
            : (MEAL_TYPES.find((t) => arr.some((m) => m.rawType === t)) ?? "LUNCH");
        });
      } catch (e: unknown) {
        if (axios.isCancel(e) || (e as { code?: string })?.code === "ERR_CANCELED") return;
        if (myId !== mainFetchId.current) return;
        setStatus("error");
      }
    })();
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchMeals(selectedId, dateStr);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [selectedId, dateStr, retryKey, fetchMeals]);

  useEffect(() => {
    if (!showWeekly) return;

    const myId = ++weeklyFetchId.current;
    const ctrl = new AbortController();

    setWeeklyStatus("loading");
    setWeeklyMeals({});

    const wDates = getWeekDates(currentDate);
    const fromStr = getLocalDateStr(wDates[0]);
    const toStr = getLocalDateStr(wDates[6]);

    (async () => {
      try {
        const res = await axios.get("/api/meals/weekly", {
          params: { restaurantId: selectedId, from: fromStr, to: toStr },
          timeout: 10000,
          signal: ctrl.signal,
        });

        if (myId !== weeklyFetchId.current) return;

        const list: WeeklyDayResult[] = res.data?.data ?? [];
        const map: Record<string, MealEntry[]> = {};

        wDates.forEach((d) => {
          map[getLocalDateStr(d)] = [];
        });

        list.forEach((day) => {
          map[day.date] = parseMealsData(day.mealsByType);
        });

        setWeeklyMeals(map);
        setWeeklyStatus("success");
      } catch (e: unknown) {
        if (axios.isCancel(e) || (e as { code?: string })?.code === "ERR_CANCELED") return;
        if (myId !== weeklyFetchId.current) return;
        setWeeklyStatus("error");
      }
    })();

    return () => ctrl.abort();
  }, [showWeekly, selectedId, currentDate, dateStr]);

  const selectDate = (d: Date) => {
    setCurrentDate(d);
    setActiveMeal(getMealFocus(d));
  };

  const getMealIcon = (raw: string) =>
    raw === "BREAKFAST" ? <Sunrise size={16} /> : raw === "LUNCH" ? <Sun size={16} /> : <Moon size={16} />;

  const filteredMeals = meals.filter((m) => m.rawType === activeMeal);
  const hasMeal = (t: MealType) => meals.some((m) => m.rawType === t);

  const onNavMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.pageX - (navRef.current?.offsetLeft ?? 0);
    scrollStart.current = navRef.current?.scrollLeft ?? 0;
  };
  const onNavMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !navRef.current) return;
    e.preventDefault();
    navRef.current.scrollLeft =
      scrollStart.current - (e.pageX - navRef.current.offsetLeft - dragStartX.current);
  };
  const stopNavDrag = () => {
    isDragging.current = false;
  };

  const onSliderMouseDown = (e: React.MouseEvent) => {
    sliderDragging.current = true;
    sliderStartX.current = e.pageX;
    sliderScrollLeft.current = dateSliderRef.current?.scrollLeft ?? 0;
  };
  const onSliderMouseMove = (e: React.MouseEvent) => {
    if (!sliderDragging.current || !dateSliderRef.current) return;
    e.preventDefault();
    dateSliderRef.current.scrollLeft = sliderScrollLeft.current - (e.pageX - sliderStartX.current);
  };
  const stopSliderDrag = () => {
    sliderDragging.current = false;
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-inner">
          <div>
            <h1>🌿 JNU Hub</h1>
            <div className="location-tag">
              <MapPin size={11} />
              전남대학교 식단 정보
            </div>
          </div>
          <div className="header-actions">
            <Link to="/map" className="map-nav-btn" title="캠퍼스 지도">
              <MapIcon size={18} />
              <span>지도</span>
            </Link>
            <button className="weekly-btn" onClick={() => setShowWeekly(true)}>
              <CalendarDays size={16} />
              <span>주간식단</span>
            </button>
          </div>
        </div>
      </header>

      <nav
        className="res-nav"
        ref={navRef}
        onMouseDown={onNavMouseDown}
        onMouseMove={onNavMouseMove}
        onMouseUp={stopNavDrag}
        onMouseLeave={stopNavDrag}
      >
        <div className="res-scroll-container">
          {CAMPUS_GROUPS.map((group) => (
            <React.Fragment key={group.campus}>
              <span className="campus-divider">{group.campus}</span>
              {group.restaurants.map((res) => (
                <button
                  key={res.id}
                  ref={(el) => {
                    chipRefs.current[res.id] = el;
                  }}
                  className={`res-chip ${selectedId === res.id ? "active" : ""}`}
                  onClick={() => setSelectedId(res.id)}
                >
                  {res.name}
                </button>
              ))}
            </React.Fragment>
          ))}
        </div>
      </nav>

      <div className="date-slider-wrapper">
        <div
          className="date-slider"
          ref={dateSliderRef}
          onMouseDown={onSliderMouseDown}
          onMouseMove={onSliderMouseMove}
          onMouseUp={stopSliderDrag}
          onMouseLeave={stopSliderDrag}
        >
          {weekDates.map((d) => {
            const ds = getLocalDateStr(d);
            const isSelected = ds === dateStr;
            const isThisToday = ds === todayStr;
            return (
              <button
                key={ds}
                className={`date-slot ${isSelected ? "selected" : ""} ${isThisToday ? "today" : ""}`}
                onClick={() => selectDate(d)}
              >
                <span className="date-slot-dow">{d.toLocaleDateString("ko-KR", { weekday: "short" })}</span>
                <span className="date-slot-day">{d.toLocaleDateString("ko-KR", { day: "numeric" })}</span>
                {isThisToday && <span className="date-slot-today-dot" />}
              </button>
            );
          })}
        </div>
        <div className="date-full-label">
          {formatDateKo(currentDate)}
          {isToday && <span className="today-badge">오늘</span>}
        </div>
      </div>

      {status === "success" && (
        <div className="meal-tabs">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              className={`meal-tab ${activeMeal === type ? "active" : ""} ${type} ${!hasMeal(type) ? "disabled" : ""}`}
              onClick={() => hasMeal(type) && setActiveMeal(type)}
            >
              <span className="meal-tab-icon">{getMealIcon(type)}</span>
              {MEAL_LABEL[type]}
            </button>
          ))}
        </div>
      )}

      <main className="meal-list">
        {status === "loading" && (
          <div className="loading-wrapper">
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <p className="loading-hint">잠시만 기다려 주세요 🍽️</p>
          </div>
        )}
        {status === "error" && (
          <div className="state-box error">
            <p>😥 식단 정보를 불러오지 못했어요.</p>
            <p className="state-sub">네트워크가 불안정하거나 서버 오류예요.</p>
            <button className="retry-btn" onClick={() => setRetryKey((k) => k + 1)}>
              <RefreshCw size={14} /> 다시 시도
            </button>
          </div>
        )}
        {status === "empty" && (
          <div className="state-box empty">
            <p>🍱 등록된 식단이 없어요.</p>
            <p className="state-sub">주말이거나 방학 기간일 수 있어요.</p>
          </div>
        )}
        {status === "success" && filteredMeals.length === 0 && (
          <div className="state-box empty">
            <p>🍱 해당 끼니 정보가 없어요.</p>
          </div>
        )}
        {status === "success" &&
          filteredMeals.map((meal, idx) => (
            <div key={idx} className={`meal-card ${meal.rawType}`}>
              <div className="card-header">
                <span className={`meal-icon-wrap ${meal.rawType}`}>{getMealIcon(meal.rawType)}</span>
                <span className="meal-label">{meal.mealLabel}</span>
                {meal.subLabel && <span className="sub-label">{meal.subLabel}</span>}
              </div>
              <ul className="menu-list">
                {meal.menuItems.map((item, i) => (
                  <li key={i} className="menu-item">
                    <Utensils size={13} className="item-icon" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </main>

      {showWeekly && (
        <div className="modal-overlay" onClick={() => setShowWeekly(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>📅 주간식단</h2>
                <p className="modal-sub">{allRestaurants.find((r) => r.id === selectedId)?.name}</p>
              </div>
              <button className="modal-close" onClick={() => setShowWeekly(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {weeklyStatus === "loading" && (
                <div className="loading-wrapper">
                  <div className="skeleton-card" />
                  <div className="skeleton-card" />
                  <p className="loading-hint">주간 식단을 불러오는 중이에요 📅</p>
                </div>
              )}
              {weeklyStatus === "error" && (
                <div className="state-box error">
                  <p>😥 불러오기 실패</p>
                </div>
              )}
              {weeklyStatus === "success" && (
                <div className="weekly-grid">
                  {weekDates.map((d) => {
                    const ds = getLocalDateStr(d);
                    const dayMeals = weeklyMeals[ds] ?? [];
                    const isThisToday = ds === todayStr;
                    return (
                      <div key={ds} className={`weekly-day-col ${isThisToday ? "today-col" : ""}`}>
                        <div className="weekly-day-header">
                          <span className="weekly-day-name">
                            {d.toLocaleDateString("ko-KR", { weekday: "short" })}
                          </span>
                          <span className="weekly-day-date">
                            {d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                          </span>
                          {isThisToday && <span className="weekly-today-dot" />}
                        </div>
                        {dayMeals.length === 0 ? (
                          <p className="weekly-empty">-</p>
                        ) : (
                          MEAL_TYPES.map((type) => {
                            const items = dayMeals.filter((m) => m.rawType === type);
                            if (!items.length) return null;
                            return (
                              <div key={type} className={`weekly-meal-block ${type}`}>
                                <div className="weekly-meal-title">
                                  {getMealIcon(type)}
                                  <span>{MEAL_LABEL[type]}</span>
                                </div>
                                {items.map((meal, i) => (
                                  <div key={i}>
                                    {meal.subLabel && <span className="weekly-sub-label">{meal.subLabel}</span>}
                                    <ul className="weekly-menu-list">
                                      {meal.menuItems.map((item, j) => (
                                        <li key={j}>{item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <MealAiPanel />
    </div>
  );
}
