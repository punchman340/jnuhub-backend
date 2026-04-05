import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import mapSvgUrl from "../../assets/JNUHUB-MAPDESIGN.svg?url";
import {
  MAP_VIEWBOX,
  MIN_SCALE,
  MAX_SCALE,
  type MapLayerId,
  type MapPoiFilter,
} from "./mapConstants";
import { MAP_BUILDING_REGISTRY } from "./mapBuildingRegistry";

// ── 공개 타입 ──────────────────────────────────────────────────
export type MapPickInfo = {
  elementId: string | null;
  svgX: number;
  svgY: number;
  clientX: number;
  clientY: number;
};

export type MapViewportHandle = {
  focusByBuildingId: (id: string) => boolean;
  getZoom: () => number;
  fitToView: () => void;
};

type Props = {
  layerVisible: Record<string, boolean>;
  poiFilter: MapPoiFilter;
  onZoomChange: (scale: number) => void;
  onPick: (info: MapPickInfo) => void;
};

// ── 상수 ──────────────────────────────────────────────────────
const WHEEL_FACTOR = 1.08;

// SVG 내부 <g id> → 실제 DOM id 매핑
// (Figma export 시 오타 "lables" 도 대응)
const LAYER_DOM_ID: Record<string, string> = {
  labels:      "lables",   // ← SVG 안에 오타 있으면 여기서 보정
  road_simple: "road_simple",
  road_detail: "road_detail",
  cafe:        "cafe",
  convenience: "convenience",
  library:     "library",
  parking:     "parking",
};

// ── 유틸 ──────────────────────────────────────────────────────
const clamp = (v: number, mn: number, mx: number) =>
  Math.min(mx, Math.max(mn, v));

function dist2(t0: Touch, t1: Touch) {
  const dx = t1.clientX - t0.clientX;
  const dy = t1.clientY - t0.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function clientToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } | null {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const m = svg.getScreenCTM();
  if (!m) return null;
  const r = pt.matrixTransform(m.inverse());
  return { x: r.x, y: r.y };
}

function resolveClickableId(el: Element | null): string | null {
  // 클릭 가능한 건물 id 탐색 - 구조적 그룹 id 제외
  const SKIP =
    /^(Vector|Rectangle|Ellipse|path-|outside-|road_simple|road_detail|lables|roads|building|cafe|convenience|library|parking)/i;
  let cur: Element | null = el;
  for (let i = 0; i < 12 && cur; i++) {
    const id = cur.getAttribute("id");
    if (id && !SKIP.test(id)) return id;
    cur = cur.parentElement;
  }
  return null;
}

function setDisplay(el: Element | null, visible: boolean) {
  if (!el) return;
  (el as HTMLElement | SVGElement).style.display = visible ? "" : "none";
}

// ── 컴포넌트 ──────────────────────────────────────────────────
export const MapViewport = forwardRef<MapViewportHandle, Props>(
  function MapViewport({ layerVisible, poiFilter, onZoomChange, onPick }, ref) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const hostRef     = useRef<HTMLDivElement>(null);
    const svgRef      = useRef<SVGSVGElement | null>(null);

    const [svgText,   setSvgText]   = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [ox,    setOx]    = useState(0);
    const [oy,    setOy]    = useState(0);
    const [scale, setScale] = useState(MIN_SCALE);

    // ref로 항상 최신값 유지 (이벤트 핸들러 클로저 문제 방지)
    const stateRef = useRef({ ox: 0, oy: 0, scale: MIN_SCALE });
    stateRef.current = { ox, oy, scale };

    const drag  = useRef<{ px: number; py: number; ox0: number; oy0: number } | null>(null);
    const pinch = useRef<{
      dist0: number; scale0: number;
      ox0: number; oy0: number;
      midX: number; midY: number;
    } | null>(null);
    const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

    // ── 1. SVG fetch ───────────────────────────────────────
    useEffect(() => {
      let cancelled = false;
      fetch(mapSvgUrl)
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
        .then((t)  => { if (!cancelled) setSvgText(t); })
        .catch(()  => { if (!cancelled) setLoadError("지도 SVG를 불러오지 못했습니다."); });
      return () => { cancelled = true; };
    }, []);

    // ── 2. fitToView ───────────────────────────────────────
    const fitToView = useCallback(() => {
      const vp = viewportRef.current;
      if (!vp || vp.clientWidth === 0 || vp.clientHeight === 0) return;
      const s = clamp(
        Math.min(vp.clientWidth / MAP_VIEWBOX.w, vp.clientHeight / MAP_VIEWBOX.h) * 0.96,
        MIN_SCALE,
        MAX_SCALE
      );
      setScale(s);
      setOx(vp.clientWidth  / 2 - (MAP_VIEWBOX.w / 2) * s);
      setOy(vp.clientHeight / 2 - (MAP_VIEWBOX.h / 2) * s);
    }, []);

    // ── 3. SVG 삽입 ────────────────────────────────────────
    useEffect(() => {
      if (!svgText || !hostRef.current) return;
      hostRef.current.innerHTML = svgText;
      const svg = hostRef.current.querySelector("svg");
      if (!(svg instanceof SVGSVGElement)) return;

      // viewBox 방식: width/height를 뷰포트에 맞추고 viewBox로 줌/팬 제어
      svg.setAttribute("width",  "100%");
      svg.setAttribute("height", "100%");
      svg.setAttribute("preserveAspectRatio", "none");
      svg.style.display  = "block";
      svg.style.position = "absolute";
      svg.style.inset    = "0";
      svg.style.overflow = "visible";

      svgRef.current = svg;
      // DOM이 안정된 다음 프레임에 fitToView
      requestAnimationFrame(() => requestAnimationFrame(fitToView));
    }, [svgText, fitToView]);

    // ── 4. viewBox 갱신 (ox/oy/scale 변경마다) ────────────
    useEffect(() => {
      const svg = svgRef.current;
      const vp  = viewportRef.current;
      if (!svg || !vp) return;

      const vpW = vp.clientWidth;
      const vpH = vp.clientHeight;
      if (vpW === 0 || vpH === 0) return;

      // translate(ox,oy) scale(s) → viewBox 변환
      // SVG좌표 = (뷰포트좌표 - ox) / scale
      const vbX = -ox / scale;
      const vbY = -oy / scale;
      const vbW =  vpW / scale;
      const vbH =  vpH / scale;

      svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
    }, [ox, oy, scale]);

    // ── 5. 레이어 + POI 필터 적용 ─────────────────────────
    const applyLayers = useCallback(() => {
      const root = svgRef.current;
      if (!root) return;

      // 레이어 show/hide
      (Object.entries(layerVisible) as [string, boolean][]).forEach(([logical, vis]) => {
        const domId = LAYER_DOM_ID[logical] ?? logical;
        let el: Element | null = null;
        try { el = root.querySelector(`#${CSS.escape(domId)}`); } catch { el = null; }
        setDisplay(el, vis);
      });

      // POI 필터 - 카테고리 레이어 그룹 자체 표시
      const cafe = root.querySelector("#cafe");
      const conv = root.querySelector("#convenience");
      const lib  = root.querySelector("#library");

      setDisplay(cafe, !!layerVisible.cafe        && (poiFilter === "all" || poiFilter === "cafe"));
      setDisplay(conv, !!layerVisible.convenience && (poiFilter === "all" || poiFilter === "convenience"));
      setDisplay(lib,  !!layerVisible.library     && (poiFilter === "all" || poiFilter === "library"));

      // building 그룹 내 개별 건물 opacity
      const bldG = root.querySelector("#building");
      if (bldG) {
        bldG.querySelectorAll<SVGElement>(":scope > [id]").forEach((p) => {
          const id = p.getAttribute("id") ?? "";
          p.style.opacity =
            poiFilter === "all" || id.startsWith(poiFilter + "-") ? "1" : "0.12";
        });
      }

      // labels 텍스트 필터
      const labG = root.querySelector("#lables"); // ← SVG 오타 대응
      if (labG) {
        labG.querySelectorAll<SVGElement>("text").forEach((t) => {
          const id = t.getAttribute("id") ?? "";
          t.style.display =
            poiFilter === "all" || id.startsWith(poiFilter + "-") ? "" : "none";
        });
      }
    }, [layerVisible, poiFilter]);

    useEffect(() => { applyLayers(); }, [applyLayers, svgText]);

    // ── 6. zoom 변경 알림 ──────────────────────────────────
    useEffect(() => { onZoomChange(scale); }, [scale, onZoomChange]);

    // ── 7. 리사이즈 시 중심 유지 ──────────────────────────
    useEffect(() => {
      const vp = viewportRef.current;
      if (!vp) return;
      let pw = vp.clientWidth, ph = vp.clientHeight;
      const ro = new ResizeObserver(() => {
        const nw = vp.clientWidth, nh = vp.clientHeight;
        if (nw <= 0 || nh <= 0 || pw <= 0 || ph <= 0) { pw = nw; ph = nh; return; }
        const { ox: ox0, oy: oy0, scale: s } = stateRef.current;
        const wcx = (pw / 2 - ox0) / s;
        const wcy = (ph / 2 - oy0) / s;
        setOx(nw / 2 - wcx * s);
        setOy(nh / 2 - wcy * s);
        pw = nw; ph = nh;
      });
      ro.observe(vp);
      return () => ro.disconnect();
    }, []);

    // ── 8. focusByBuildingId ───────────────────────────────
    const focusByBuildingId = useCallback((id: string): boolean => {
      const svg = svgRef.current;
      const vp  = viewportRef.current;
      if (!svg || !vp) return false;

      const doFocus = (cx: number, cy: number) => {
        const s = clamp(Math.max(stateRef.current.scale, 1.5), MIN_SCALE, MAX_SCALE);
        setScale(s);
        setOx(vp.clientWidth  / 2 - cx * s);
        setOy(vp.clientHeight / 2 - cy * s);
      };

      let el: Element | null = null;
      try { el = svg.querySelector(`#${CSS.escape(id)}`); } catch { el = null; }

      if (el && "getBBox" in el) {
        const box = (el as SVGGraphicsElement).getBBox();
        doFocus(box.x + box.width / 2, box.y + box.height / 2);
        el.classList.add("jnuhub-map-focus");
        window.setTimeout(() => el!.classList.remove("jnuhub-map-focus"), 2200);
        return true;
      }

      const meta = MAP_BUILDING_REGISTRY[id];
      if (meta) { doFocus(meta.focus.cx, meta.focus.cy); return true; }
      return false;
    }, []);

    useImperativeHandle(ref, () => ({
      focusByBuildingId,
      getZoom: () => stateRef.current.scale,
      fitToView,
    }), [focusByBuildingId, fitToView]);

    // ── 9. 휠 줌 ──────────────────────────────────────────
    useEffect(() => {
      const el = viewportRef.current;
      if (!el) return;
      const handler = (e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = el.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const { ox: ox0, oy: oy0, scale: s0 } = stateRef.current;
        const factor = e.deltaY < 0 ? WHEEL_FACTOR : 1 / WHEEL_FACTOR;
        const newS = clamp(s0 * factor, MIN_SCALE, MAX_SCALE);
        const wx = (px - ox0) / s0;
        const wy = (py - oy0) / s0;
        setOx(px - wx * newS);
        setOy(py - wy * newS);
        setScale(newS);
      };
      el.addEventListener("wheel", handler, { passive: false });
      return () => el.removeEventListener("wheel", handler);
    }, []);

    // ── 10. 터치 이벤트 ────────────────────────────────────
    useEffect(() => {
      const el = viewportRef.current;
      if (!el) return;

      const onTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        if (e.touches.length === 1) {
          const t = e.touches[0];
          drag.current = { px: t.clientX, py: t.clientY, ox0: stateRef.current.ox, oy0: stateRef.current.oy };
          pinch.current = null;
        } else if (e.touches.length === 2) {
          drag.current = null;
          const t0 = e.touches[0], t1 = e.touches[1];
          const rect = el.getBoundingClientRect();
          pinch.current = {
            dist0:  dist2(t0, t1),
            scale0: stateRef.current.scale,
            ox0:    stateRef.current.ox,
            oy0:    stateRef.current.oy,
            midX: (t0.clientX + t1.clientX) / 2 - rect.left,
            midY: (t0.clientY + t1.clientY) / 2 - rect.top,
          };
        }
      };

      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if (e.touches.length === 1 && drag.current) {
          const t = e.touches[0];
          setOx(drag.current.ox0 + (t.clientX - drag.current.px));
          setOy(drag.current.oy0 + (t.clientY - drag.current.py));
        } else if (e.touches.length === 2 && pinch.current) {
          const p = pinch.current;
          const t0 = e.touches[0], t1 = e.touches[1];
          const d  = dist2(t0, t1);
          const newS = clamp(p.scale0 * (d / p.dist0), MIN_SCALE, MAX_SCALE);
          const wx = (p.midX - p.ox0) / p.scale0;
          const wy = (p.midY - p.oy0) / p.scale0;
          setOx(p.midX - wx * newS);
          setOy(p.midY - wy * newS);
          setScale(newS);
        }
      };

      const onTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        if (e.touches.length === 0) {
          drag.current = null;
          pinch.current = null;
        } else if (e.touches.length === 1) {
          pinch.current = null;
          const t = e.touches[0];
          drag.current = { px: t.clientX, py: t.clientY, ox0: stateRef.current.ox, oy0: stateRef.current.oy };
        }
      };

      el.addEventListener("touchstart", onTouchStart, { passive: false });
      el.addEventListener("touchmove",  onTouchMove,  { passive: false });
      el.addEventListener("touchend",   onTouchEnd,   { passive: false });
      return () => {
        el.removeEventListener("touchstart", onTouchStart);
        el.removeEventListener("touchmove",  onTouchMove);
        el.removeEventListener("touchend",   onTouchEnd);
      };
    }, []);

    // ── 11. 마우스 드래그 ──────────────────────────────────
    const onPointerDown = (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (e.button !== 0) return;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      pointerDownPos.current = { x: e.clientX, y: e.clientY };
      drag.current = { px: e.clientX, py: e.clientY, ox0: ox, oy0: oy };
    };

    const onPointerMove = (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (!drag.current) return;
      setOx(drag.current.ox0 + (e.clientX - drag.current.px));
      setOy(drag.current.oy0 + (e.clientY - drag.current.py));
    };

    const onPointerUp = (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      drag.current = null;
      try { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
    };

    // ── 12. 클릭 ───────────────────────────────────────────
    const onClick = (e: React.MouseEvent) => {
      const down = pointerDownPos.current;
      if (down) {
        const moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y);
        pointerDownPos.current = null;
        if (moved > 5) return; // 드래그는 클릭으로 처리 안 함
      }
      const svg = svgRef.current;
      if (!svg) return;
      const p = clientToSvg(svg, e.clientX, e.clientY);
      const elementId = resolveClickableId(e.target instanceof Element ? e.target : null);
      onPick({ elementId, svgX: p?.x ?? 0, svgY: p?.y ?? 0, clientX: e.clientX, clientY: e.clientY });
    };

    // ── JSX ────────────────────────────────────────────────
    return (
      <div
        className="map-viewport"
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onClick}
        role="application"
        aria-label="캠퍼스 지도"
        style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
      >
        {loadError   && <div className="map-viewport-error">{loadError}</div>}
        {!svgText && !loadError && <div className="map-viewport-loading">지도 불러오는 중…</div>}

        {/* SVG 호스트: 절대위치 꽉 채움 */}
        <div
          ref={hostRef}
          className="map-svg-host"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />

        <style>{`
          .jnuhub-map-focus {
            outline: 3px solid rgba(37,99,235,0.9);
            outline-offset: 3px;
            animation: jnuhub-focus-fade 2.2s forwards;
          }
          @keyframes jnuhub-focus-fade {
            0%   { outline-color: rgba(37,99,235,0.9); }
            70%  { outline-color: rgba(37,99,235,0.6); }
            100% { outline-color: rgba(37,99,235,0);   }
          }
        `}</style>
      </div>
    );
  }
);
