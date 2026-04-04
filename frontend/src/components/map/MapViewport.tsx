import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import mapSvgUrl from "../../assets/JNUHUB-MAPDESIGN.svg?url";
import { MAP_VIEWBOX, type MapLayerId } from "./mapConstants";
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
};

type Props = {
  /** 레이어 id별 표시 여부 (SVG에 해당 <g id> 가 있을 때만 적용) */
  layerVisible: Record<MapLayerId, boolean>;
  onZoomChange: (scale: number) => void;
  onPick: (info: MapPickInfo) => void;
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
  for (let i = 0; i < 8 && cur; i++) {
    const id = cur.getAttribute("id");
    if (id && !id.startsWith("path-") && !id.endsWith("-outside-")) {
      return id;
    }
    cur = cur.parentElement;
  }
  return null;
}

export const MapViewport = forwardRef<MapViewportHandle, Props>(function MapViewport(
  { layerVisible, onZoomChange, onPick },
  ref,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [svgText, setSvgText] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [ox, setOx] = useState(0);
  const [oy, setOy] = useState(0);
  const [scale, setScale] = useState(0.55);

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

  useEffect(() => {
    if (!svgText || !hostRef.current) return;
    hostRef.current.innerHTML = svgText;
    const svg = hostRef.current.querySelector("svg");
    if (svg instanceof SVGSVGElement) {
      svg.setAttribute("width", String(MAP_VIEWBOX.w));
      svg.setAttribute("height", String(MAP_VIEWBOX.h));
      svg.style.display = "block";
      svg.style.maxWidth = "none";
      svgRef.current = svg;
      const vp = viewportRef.current;
      if (vp) {
        const s = scale;
        setOx(vp.clientWidth / 2 - (MAP_VIEWBOX.w / 2) * s);
        setOy(vp.clientHeight / 2 - (MAP_VIEWBOX.h / 2) * s);
      }
    }
  }, [svgText]);

  const applyLayers = useCallback(() => {
    const root = svgRef.current;
    if (!root) return;
    (Object.entries(layerVisible) as [MapLayerId, boolean][]).forEach(([id, vis]) => {
      let el: Element | null = null;
      try {
        el = root.querySelector(`#${CSS.escape(id)}`);
      } catch {
        el = null;
      }
      if (!el) return;
      const node = el as HTMLElement | SVGElement;
      node.style.display = vis ? "" : "none";
    });
  }, [layerVisible]);

  useEffect(() => {
    applyLayers();
  }, [applyLayers, svgText]);

  useEffect(() => {
    onZoomChange(scale);
  }, [scale, onZoomChange]);

  const clampScale = (s: number) => Math.min(4, Math.max(0.25, s));

  const focusOnPoint = useCallback((cx: number, cy: number, targetScale?: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const s = targetScale !== undefined ? clampScale(targetScale) : scale;
    const nx = vp.clientWidth / 2 - cx * s;
    const ny = vp.clientHeight / 2 - cy * s;
    setScale(s);
    setOx(nx);
    setOy(ny);
  }, [scale]);

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
        focusOnPoint(cx, cy, Math.max(scale, 1.1));
        el.classList.add("jnuhub-map-focus");
        window.setTimeout(() => el.classList.remove("jnuhub-map-focus"), 2200);
        return true;
      }

      const meta = MAP_BUILDING_REGISTRY[id];
      if (meta) {
        focusOnPoint(meta.focus.cx, meta.focus.cy, Math.max(scale, 1.05));
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
    }),
    [focusByBuildingId, scale],
  );

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.06 : 1 / 1.06;
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
        ref={surfaceRef}
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
