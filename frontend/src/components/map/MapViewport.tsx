import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import mapSvgUrl from "../../assets/JNUHUB-MAPDESIGN.svg?url";
import { MAP_VIEWBOX, type MapLayerId, type MapPoiFilter } from "./mapConstants";
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
const MIN_SCALE = 0.2;
const MAX_SCALE = 5.0;
const WHEEL_FACTOR = 1.08;

const LAYER_DOM_ID: Record<string, string> = {
  labels:      "lables",
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

function dist2(t0: React.Touch, t1: React.Touch) {
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
  const SKIP = /^(Vector|Rectangle|Ellipse|path-\d|outside-\d|road_simple|road_detail|lables|roads|building|cafe|convenience|library|parking)/i;
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
    const [scale, setScale] = useState(0.4);

    const stateRef = useRef({ ox: 0, oy: 0, scale: 0.4 });
    stateRef.current = { ox, oy, scale };

    const drag  = useRef<{ px: number; py: number; ox0: number; oy0: number } | null>(null);
    const pinch = useRef<{
      dist0: number; scale0: number;
      ox0: number; oy0: number;
      midX: number; midY: number;
    } | null>(null);

    const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

    // ── SVG fetch ─────────────────────────────────────────
    useEffect(() => {
      let cancelled = false;
      fetch(mapSvgUrl)
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
        .then((t) => { if (!cancelled) setSvgText(t); })
        .catch(() => { if (!cancelled) setLoadError("지도 SVG를 불러오지 못했습니다."); });
      return () => { cancelled = true; };
    }, []);

    // ── SVG 삽입 ──────────────────────────────────────────
    const fitToView = useCallback(() => {
      const vp = viewportRef.current;
      if (!vp) return;
      const s = clamp(
        Math.min(vp.clientWidth / MAP_VIEWBOX.w, vp.clientHeight / MAP_VIEWBOX.h) * 0.96,
        MIN_SCALE, MAX_SCALE
      );
      setScale(s);
      setOx(vp.clientWidth  / 2 - (MAP_VIEWBOX.w / 2) * s);
      setOy(vp.clientHeight / 2 - (MAP_VIEWBOX.h / 2) * s);
    }, []);

    // ── SVG 삽입 useEffect 수정 ────────────────────────────────────
    useEffect(() => {
      if (!svgText || !hostRef.current) return;
      hostRef.current.innerHTML = svgText;
      const svg = hostRef.current.querySelector("svg");
      if (!(svg instanceof SVGSVGElement)) return;

      // ✅ width/height를 뷰포트에 꽉 차게 (100%로)
      svg.setAttribute("width",  "100%");
      svg.setAttribute("height", "100%");
      svg.style.display  = "block";
      svg.style.position = "absolute";
      svg.style.inset    = "0";
      svg.style.overflow = "visible";
      // ✅ preserveAspectRatio 제거 → viewBox로 직접 제어
      svg.setAttribute("preserveAspectRatio", "none");

      svgRef.current = svg;
      requestAnimationFrame(fitToView);
    }, [svgText, fitToView]);


    // ── 리사이즈 시 중심 유지 ─────────────────────────────
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

    // ── 레이어 + POI 필터 적용 ────────────────────────────
    const applyLayers = useCallback(() => {
      const root = svgRef.current;
      if (!root) return;

      (Object.entries(layerVisible) as [string, boolean][]).forEach(([logical, vis]) => {
        const domId = LAYER_DOM_ID[logical] ?? logical;
        let el: Element | null = null;
        try { el = root.querySelector(`#${CSS.escape(domId)}`); } catch { el = null; }
        setDisplay(el, vis);
      });

      const cafe  = root.querySelector("#cafe");
      const conv  = root.querySelector("#convenience");
      const lib   = root.querySelector("#library");
      const labG  = root.querySelector("#lables");
      const bldG  = root.querySelector("#building");

      setDisplay(cafe, layerVisible.cafe  && (poiFilter === "all" || poiFilter === "cafe"));
      setDisplay(conv, layerVisible.convenience && (poiFilter === "all" || poiFilter === "convenience"));
      setDisplay(lib,  layerVisible.library && (poiFilter === "all" || poiFilter === "library"));

      if (bldG) {
        bldG.querySelectorAll<SVGElement>(":scope > [id]").forEach((p) => {
          const id = p.getAttribute("id") ?? "";
          if (poiFilter === "all") {
            p.style.opacity = "";
          } else {
            p.style.opacity = id.startsWith(poiFilter + "-") ? "1" : "0.12";
          }
        });
      }

      if (labG) {
        labG.querySelectorAll<SVGElement>("text").forEach((t) => {
          const id = t.getAttribute("id") ?? "";
          t.style.display =
            poiFilter === "all" || id.startsWith(poiFilter + "-") ? "" : "none";
        });
      }
    }, [layerVisible, poiFilter]);

    useEffect(() => { applyLayers(); }, [applyLayers, svgText]);
    useEffect(() => { onZoomChange(scale); }, [scale, onZoomChange]);


    // ── focusByBuildingId ──────────────────────────────────
    const focusByBuildingId = useCallback(
      (id: string): boolean => {
        const svg = svgRef.current;
        const vp  = viewportRef.current;
        if (!svg || !vp) return false;

        let el: Element | null = null;
        try { el = svg.querySelector(`#${CSS.escape(id)}`); } catch { el = null; }

        const doFocus = (cx: number, cy: number) => {
          const s = clamp(Math.max(stateRef.current.scale, 1.5), MIN_SCALE, MAX_SCALE);
          setScale(s);
          setOx(vp.clientWidth  / 2 - cx * s);
          setOy(vp.clientHeight / 2 - cy * s);
        };

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
      },
      []
    );
    // ── viewBox를 직접 조작하는 함수 추가 ─────────────────────────
    // scale/ox/oy → viewBox 변환
    // ox, oy는 "SVG 원점이 뷰포트 어디에 있는가" 를 나타냄
    // viewBox: 뷰포트에서 (0,0)~(vpW, vpH)에 해당하는 SVG 좌표 영역
    const applyViewBox = useCallback(() => {
      const svg = svgRef.current;
      const vp  = viewportRef.current;
      if (!svg || !vp) return;

      const vpW = vp.clientWidth;
      const vpH = vp.clientHeight;
      const s   = stateRef.current.scale;
      const ox_ = stateRef.current.ox;
      const oy_ = stateRef.current.oy;

      // CSS transform: translate(ox,oy) scale(s) 와 동일한 효과를
      // viewBox로 표현:
      // SVG좌표 x = (viewport좌표 - ox) / s
      const vbX = -ox_ / s;
      const vbY = -oy_ / s;
      const vbW =  vpW / s;
      const vbH =  vpH / s;

      svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
    }, []);

    // ── scale/ox/oy 바뀔 때마다 viewBox 갱신 ─────────────────────
    useEffect(() => {
      applyViewBox();
    }, [ox, oy, scale, applyViewBox]);

    // ── onZoomChange도 유지 ───────────────────────────────────────
    useEffect(() => { onZoomChange(scale); }, [scale, onZoomChange]);

    useImperativeHandle(ref, () => ({
      focusByBuildingId,
      getZoom: () => stateRef.current.scale,
      fitToView,
    }), [focusByBuildingId, fitToView]);

    // ── 휠 줌 ─────────────────────────────────────────────
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

    // ── 터치 이벤트 ───────────────────────────────────────
    useEffect(() => {
      const el = viewportRef.current;
      if (!el) return;

      const onTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        if (e.touches.length === 1) {
          const t = e.touches[0];
          drag.current = {
            px: t.clientX, py: t.clientY,
            ox0: stateRef.current.ox, oy0: stateRef.current.oy,
          };
          pinch.current = null;
        } else if (e.touches.length === 2) {
          drag.current = null;
          const t0 = e.touches[0], t1 = e.touches[1];
          const rect = el.getBoundingClientRect();
          pinch.current = {
            dist0:  dist2(t0 as unknown as React.Touch, t1 as unknown as React.Touch),
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
          const dx = t1.clientX - t0.clientX;
          const dy = t1.clientY - t0.clientY;
          const d  = Math.sqrt(dx * dx + dy * dy);
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
          drag.current = {
            px: t.clientX, py: t.clientY,
            ox0: stateRef.current.ox, oy0: stateRef.current.oy,
          };
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

    // ── 마우스 드래그 ─────────────────────────────────────
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

    // ── 클릭 ─────────────────────────────────────────────
    const onClick = (e: React.MouseEvent) => {
      const down = pointerDownPos.current;
      if (down) {
        const moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y);
        pointerDownPos.current = null;
        if (moved > 5) return;
      }
      const svg = svgRef.current;
      if (!svg) return;
      const p = clientToSvg(svg, e.clientX, e.clientY);
      const elementId = resolveClickableId(e.target instanceof Element ? e.target : null);
      onPick({ elementId, svgX: p?.x ?? 0, svgY: p?.y ?? 0, clientX: e.clientX, clientY: e.clientY });
    };

    // ── JSX ───────────────────────────────────────────────
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
      >
        {loadError   && <div className="map-viewport-error">{loadError}</div>}
        {!svgText && !loadError && <div className="map-viewport-loading">지도 불러오는 중…</div>}

        <div
          className="map-surface"
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
          }}
        >
          <div ref={hostRef} className="map-svg-host" style={{ position: "relative", width: "100%", height: "100%" }} />
          </div>

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
