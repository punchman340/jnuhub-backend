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
  layerVisible: Record<MapLayerId, boolean>;
  /** 카페/편의점/도서관만 보기 (전체 제외) */
  poiFilter: MapPoiFilter;
  onZoomChange: (scale: number) => void;
  onPick: (info: MapPickInfo) => void;
};

/** 논리 id → SVG DOM id (Figma 오타 lables 등) */
const LAYER_DOM_ID: Record<MapLayerId, string> = {
  labels: "lables",
  road_simple: "road_simple",
  road_detail: "road_detail",
  cafe: "cafe",
  convenience: "convenience",
};

function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } | null {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const m = svg.getScreenCTM();
  if (!m) return null;
  const r = pt.matrixTransform(m.inverse());
  return { x: r.x, y: r.y };
}

function resolveClickableId(el: Element | null): string | null {
  let cur: Element | null = el;
  for (let i = 0; i < 12 && cur; i++) {
    const id = cur.getAttribute("id");
    if (!id) {
      cur = cur.parentElement;
      continue;
    }
    if (/^Vector |^Rectangle|^Ellipse|^path-\d|outside-\d/i.test(id)) {
      cur = cur.parentElement;
      continue;
    }
    if (id.includes("maki:") || id.includes("fluent-mdl2:")) {
      cur = cur.parentElement;
      continue;
    }
    if (/_2$/.test(id)) {
      cur = cur.parentElement;
      continue;
    }
    if (id === "road_simple" || id === "lables" || id === "roads" || id === "building") {
      cur = cur.parentElement;
      continue;
    }
    return id;
  }
  return null;
}

/** 줌에 따라 라벨 글자 크기 보정(지도 전체 스케일과 별도로 가독성) */
function applyLabelFontScale(svg: SVGSVGElement, mapScale: number) {
  const g = svg.querySelector("#lables");
  if (!g) return;
  const base = 10;
  const t = Math.min(1.45, Math.max(0.72, 0.72 + (mapScale - 0.55) * 0.35));
  g.querySelectorAll("text").forEach((node) => {
    node.setAttribute("font-size", String(Math.round(base * t * 10) / 10));
  });
}

function setDisplay(el: Element | null, visible: boolean) {
  if (!el) return;
  const node = el as HTMLElement | SVGElement;
  node.style.display = visible ? "" : "none";
}

export const MapViewport = forwardRef<MapViewportHandle, Props>(function MapViewport(
  { layerVisible, poiFilter, onZoomChange, onPick },
  ref,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [svgText, setSvgText] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [ox, setOx] = useState(0);
  const [oy, setOy] = useState(0);
  const [scale, setScale] = useState(0.4);

  const scaleRef = useRef(scale);
  const oxRef = useRef(ox);
  const oyRef = useRef(oy);
  scaleRef.current = scale;
  oxRef.current = ox;
  oyRef.current = oy;

  const drag = useRef<{ active: boolean; px: number; py: number; ox0: number; oy0: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(mapSvgUrl)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then((t) => {
        if (!cancelled) setSvgText(t);
      })
      .catch(() => {
        if (!cancelled) setLoadError("지도 SVG를 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const clampScale = (s: number) => Math.min(4.5, Math.max(0.2, s));

  const fitToView = useCallback(() => {
    const vp = viewportRef.current;
    const svg = svgRef.current;
    if (!vp || !svg) return;
    const s = Math.min(vp.clientWidth / MAP_VIEWBOX.w, vp.clientHeight / MAP_VIEWBOX.h) * 0.96;
    const clamped = clampScale(s);
    setScale(clamped);
    setOx(vp.clientWidth / 2 - (MAP_VIEWBOX.w / 2) * clamped);
    setOy(vp.clientHeight / 2 - (MAP_VIEWBOX.h / 2) * clamped);
  }, []);

  useEffect(() => {
    if (!svgText || !hostRef.current) return;
    hostRef.current.innerHTML = svgText;
    const svg = hostRef.current.querySelector("svg");
    if (svg instanceof SVGSVGElement) {
      svg.setAttribute("width", String(MAP_VIEWBOX.w));
      svg.setAttribute("height", String(MAP_VIEWBOX.h));
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.style.display = "block";
      svg.style.maxWidth = "none";
      svgRef.current = svg;
      requestAnimationFrame(() => fitToView());
    }
  }, [svgText, fitToView]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    let prevW = vp.clientWidth;
    let prevH = vp.clientHeight;
    const ro = new ResizeObserver(() => {
      const nw = vp.clientWidth;
      const nh = vp.clientHeight;
      if (nw <= 0 || nh <= 0) return;
      if (prevW <= 0 || prevH <= 0) {
        prevW = nw;
        prevH = nh;
        return;
      }
      const s = scaleRef.current;
      const ox0 = oxRef.current;
      const oy0 = oyRef.current;
      const wc = (prevW / 2 - ox0) / s;
      const wh = (prevH / 2 - oy0) / s;
      setOx(nw / 2 - wc * s);
      setOy(nh / 2 - wh * s);
      prevW = nw;
      prevH = nh;
    });
    ro.observe(vp);
    return () => ro.disconnect();
  }, []);

  const applyPoiFilter = useCallback(
    (svg: SVGSVGElement, layers: Record<MapLayerId, boolean>) => {
      const cafe = svg.querySelector("#cafe");
      const conv = svg.querySelector("#convenience");
      const labelsG = svg.querySelector("#lables");
      const building = svg.querySelector("#building");

      const cafeWanted = layers.cafe && (poiFilter === "all" || poiFilter === "cafe");
      const convWanted = layers.convenience && (poiFilter === "all" || poiFilter === "convenience");

      setDisplay(cafe, cafeWanted);
      setDisplay(conv, convWanted);

      if (labelsG) {
        if (poiFilter === "library") {
          labelsG.querySelectorAll("text").forEach((t) => {
            const id = t.getAttribute("id") ?? "";
            const show = id.startsWith("library-");
            (t as SVGElement).style.display = show ? "" : "none";
          });
        } else {
          labelsG.querySelectorAll("text").forEach((t) => {
            (t as SVGElement).style.display = "";
          });
        }
      }

      if (building) {
        if (poiFilter === "library") {
          building.querySelectorAll(":scope > path").forEach((p) => {
            const id = p.getAttribute("id") ?? "";
            const isLib = id.startsWith("library-");
            (p as SVGElement).style.opacity = isLib ? "1" : "0.14";
          });
        } else {
          building.querySelectorAll(":scope > path").forEach((p) => {
            (p as SVGElement).style.opacity = "";
          });
        }
      }
    },
    [poiFilter],
  );

  const applyLayers = useCallback(() => {
    const root = svgRef.current;
    if (!root) return;

    (Object.entries(layerVisible) as [MapLayerId, boolean][]).forEach(([logical, vis]) => {
      const domId = LAYER_DOM_ID[logical];
      let el: Element | null = null;
      try {
        el = root.querySelector(`#${CSS.escape(domId)}`);
      } catch {
        el = null;
      }
      if (!el) return;
      setDisplay(el, vis);
    });

    applyPoiFilter(root, layerVisible);
    if (layerVisible.labels) {
      applyLabelFontScale(root, scale);
    }
  }, [layerVisible, applyPoiFilter, scale]);

  useEffect(() => {
    applyLayers();
  }, [applyLayers, svgText]);

  useEffect(() => {
    onZoomChange(scale);
  }, [scale, onZoomChange]);

  const focusOnPoint = useCallback(
    (cx: number, cy: number, targetScale?: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const s = targetScale !== undefined ? clampScale(targetScale) : scale;
      const nx = vp.clientWidth / 2 - cx * s;
      const ny = vp.clientHeight / 2 - cy * s;
      setScale(s);
      setOx(nx);
      setOy(ny);
    },
    [scale],
  );

  const focusByBuildingId = useCallback(
    (id: string): boolean => {
      const svg = svgRef.current;
      if (!svg) return false;

      let el: Element | null = null;
      try {
        el = svg.querySelector(`#${CSS.escape(id)}`);
      } catch {
        el = null;
      }

      if (el && "getBBox" in el && typeof (el as SVGGraphicsElement).getBBox === "function") {
        const box = (el as SVGGraphicsElement).getBBox();
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        focusOnPoint(cx, cy, Math.max(scale, 1.05));
        el.classList.add("jnuhub-map-focus");
        window.setTimeout(() => el.classList.remove("jnuhub-map-focus"), 2200);
        return true;
      }

      const meta = MAP_BUILDING_REGISTRY[id];
      if (meta) {
        focusOnPoint(meta.focus.cx, meta.focus.cy, Math.max(scale, 1.02));
        return true;
      }
      return false;
    },
    [focusOnPoint, scale],
  );

  useImperativeHandle(
    ref,
    () => ({
      focusByBuildingId,
      getZoom: () => scale,
      fitToView,
    }),
    [focusByBuildingId, scale, fitToView],
  );

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.07 : 1 / 1.07;
    const newS = clampScale(scale * factor);
    const wx = (px - ox) / scale;
    const wy = (py - oy) / scale;
    setOx(px - wx * newS);
    setOy(py - wy * newS);
    setScale(newS);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { active: true, px: e.clientX, py: e.clientY, ox0: ox, oy0: oy };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d?.active) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    setOx(d.ox0 + dx);
    setOy(d.oy0 + dy);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    drag.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onClick = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const p = clientToSvg(svg, e.clientX, e.clientY);
    const target = e.target instanceof Element ? e.target : null;
    const elementId = resolveClickableId(target);
    onPick({
      elementId,
      svgX: p?.x ?? 0,
      svgY: p?.y ?? 0,
      clientX: e.clientX,
      clientY: e.clientY,
    });
  };

  return (
    <div
      className="map-viewport"
      ref={viewportRef}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onClick}
      role="application"
      aria-label="캠퍼스 지도"
    >
      {loadError && <div className="map-viewport-error">{loadError}</div>}
      {!svgText && !loadError && <div className="map-viewport-loading">지도 불러오는 중…</div>}
      <div
        className="map-surface"
        style={{
          transform: `translate(${ox}px, ${oy}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        <div ref={hostRef} className="map-svg-host" />
      </div>
      <style>{`
        .map-svg-host svg .jnuhub-map-focus {
          outline: 3px solid rgba(37, 99, 235, 0.95);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
});
