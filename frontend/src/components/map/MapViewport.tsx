import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import mapSvgUrl from "../../assets/JNUHUB-MAPDESIGN.svg?url";
import pinSvgUrl from "../../assets/pin.svg?url";
import {
  MAP_VIEWBOX,
  MIN_SCALE,
  MAX_SCALE,
  LABEL_ZOOM_THRESHOLD,
} from "./mapConstants";
import { isPriorityMapLabel } from "./mapLabelPolicy";
import { MAP_BUILDING_REGISTRY, normalizeRegistryBuildingId } from "./mapBuildingRegistry";
import type { MapCategory } from "./mapBuildingRegistry";

const WHEEL_FACTOR = 1.08;
const SVG_NS = "http://www.w3.org/2000/svg";

export type MapPickInfo = {
  elementId: string | null;
  registryId: string | null;
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
  /** 사이드바 카테고리 — all 이면 카테고리 핀 없음 */
  sidebarCategory: MapCategory | "all";
  /** 목록/검색에서 선택된 건물 (초록 스트로크 + 포커스 핀) */
  highlightBuildingId: string | null;
  /** true면 줌과 무관하게 모든 라벨 표시 */
  showAllLabels: boolean;
  onZoomChange: (scale: number) => void;
  onPick: (info: MapPickInfo) => void;
};

const LAYER_DOM_ID: Record<string, string> = {
  labels: "lables",
  road_simple: "road_simple",
  road_detail: "road_detail",
  cafe: "cafe",
  convenience: "convenience",
  library: "library",
  parking: "parking",
};

const clamp = (v: number, mn: number, mx: number) => Math.min(mx, Math.max(mn, v));

function dist2(t0: Touch, t1: Touch) {
  const dx = t1.clientX - t0.clientX;
  const dy = t1.clientY - t0.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/** 뷰포트 DIV 좌표(좌상단 기준) → SVG 사용자 좌표(viewBox 공간) */
function clientToSvgUser(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  hostRect: DOMRect,
): { x: number; y: number } | null {
  const pt = svg.createSVGPoint();
  pt.x = clientX - hostRect.left;
  pt.y = clientY - hostRect.top;
  const m = svg.getScreenCTM();
  if (!m) return null;
  const inv = m.inverse();
  const r = pt.matrixTransform(inv);
  return { x: r.x, y: r.y };
}

function resolveClickableId(el: Element | null): string | null {
  const SKIP =
    /^(Vector|Rectangle|Ellipse|path-|outside-|road_simple|road_detail|lables|roads|building|cafe|convenience|library|parking)/i;
  let cur: Element | null = el;
  for (let i = 0; i < 14 && cur; i++) {
    const id = cur.getAttribute("id");
    if (id && !SKIP.test(id) && !id.includes("maki:") && !id.includes("fluent-mdl2:")) {
      return id;
    }
    cur = cur.parentElement;
  }
  return null;
}

function setDisplay(el: Element | null, visible: boolean) {
  if (!el) return;
  (el as HTMLElement | SVGElement).style.display = visible ? "" : "none";
}

function forceNonZeroFillRule(svg: SVGSVGElement) {
  svg.setAttribute("fill-rule", "nonzero");
  svg.querySelectorAll("[fill-rule]").forEach((n) => {
    if (n.getAttribute("fill-rule") === "evenodd") n.setAttribute("fill-rule", "nonzero");
  });
  svg.querySelectorAll("[clip-rule]").forEach((n) => {
    if (n.getAttribute("clip-rule") === "evenodd") n.setAttribute("clip-rule", "nonzero");
  });
}

function ensureOverlayGroup(svg: SVGSVGElement): SVGGElement {
  const existing = svg.querySelector("#jnuhub-overlay-root");
  if (existing instanceof SVGGElement) return existing;
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("id", "jnuhub-overlay-root");
  g.setAttribute("pointer-events", "none");
  svg.appendChild(g);
  return g;
}

function clearOverlayChildren(g: SVGGElement, className: string) {
  g.querySelectorAll(`.${className}`).forEach((n) => n.remove());
}

function placePin(
  parent: SVGGElement,
  cls: string,
  cx: number,
  cy: number,
  pinHref: string,
  w = 22,
  h = 26,
) {
  const img = document.createElementNS(SVG_NS, "image");
  img.setAttribute("class", cls);
  img.setAttribute("href", pinHref);
  img.setAttributeNS("http://www.w3.org/1999/xlink", "href", pinHref);
  img.setAttribute("width", String(w));
  img.setAttribute("height", String(h));
  img.setAttribute("x", String(cx - w / 2));
  img.setAttribute("y", String(cy - h));
  parent.appendChild(img);
}

function getPinCenterForId(svg: SVGSVGElement, id: string): { cx: number; cy: number } | null {
  let el: Element | null = null;
  try {
    el = svg.querySelector(`#${CSS.escape(id)}`);
  } catch {
    el = null;
  }
  if (el && "getBBox" in el && typeof (el as SVGGraphicsElement).getBBox === "function") {
    try {
      const box = (el as SVGGraphicsElement).getBBox();
      return { cx: box.x + box.width / 2, cy: box.y + box.height / 2 };
    } catch {
      /* ignore */
    }
  }
  const meta = MAP_BUILDING_REGISTRY[id];
  return meta ? { cx: meta.focus.cx, cy: meta.focus.cy } : null;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export const MapViewport = forwardRef<MapViewportHandle, Props>(function MapViewport(
  { layerVisible, sidebarCategory, highlightBuildingId, showAllLabels, onZoomChange, onPick },
  ref,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [svgText, setSvgText] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [ox, setOx] = useState(0);
  const [oy, setOy] = useState(0);
  const [scale, setScale] = useState(MIN_SCALE);

  const stateRef = useRef({ ox: 0, oy: 0, scale: MIN_SCALE });
  stateRef.current = { ox, oy, scale };

  const drag = useRef<{ px: number; py: number; ox0: number; oy0: number } | null>(null);
  const pinch = useRef<{
    dist0: number;
    scale0: number;
    ox0: number;
    oy0: number;
    midX: number;
    midY: number;
  } | null>(null);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const animRef = useRef<number | null>(null);
  const prevHighlightRef = useRef<SVGElement | null>(null);

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

  const fitToView = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp || vp.clientWidth === 0 || vp.clientHeight === 0) return;
    const s = clamp(
      Math.min(vp.clientWidth / MAP_VIEWBOX.w, vp.clientHeight / MAP_VIEWBOX.h) * 0.96,
      MIN_SCALE,
      MAX_SCALE,
    );
    setScale(s);
    setOx(vp.clientWidth / 2 - (MAP_VIEWBOX.w / 2) * s);
    setOy(vp.clientHeight / 2 - (MAP_VIEWBOX.h / 2) * s);
  }, []);

  useEffect(() => {
    if (!svgText || !hostRef.current) return;
    hostRef.current.innerHTML = svgText;
    const svg = hostRef.current.querySelector("svg");
    if (!(svg instanceof SVGSVGElement)) return;

    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.style.display = "block";
    svg.style.position = "absolute";
    svg.style.inset = "0";
    svg.style.overflow = "visible";

    forceNonZeroFillRule(svg);
    svgRef.current = svg;
    requestAnimationFrame(() => requestAnimationFrame(fitToView));
  }, [svgText, fitToView]);

  useEffect(() => {
    const svg = svgRef.current;
    const vp = viewportRef.current;
    if (!svg || !vp) return;
    const vpW = vp.clientWidth;
    const vpH = vp.clientHeight;
    if (vpW === 0 || vpH === 0) return;
    const vbX = -ox / scale;
    const vbY = -oy / scale;
    const vbW = vpW / scale;
    const vbH = vpH / scale;
    svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
  }, [ox, oy, scale]);

  const applyMapLayers = useCallback(() => {
    const root = svgRef.current;
    if (!root) return;

    (Object.entries(layerVisible) as [string, boolean][]).forEach(([logical, vis]) => {
      const domId = LAYER_DOM_ID[logical] ?? logical;
      let el: Element | null = null;
      try {
        el = root.querySelector(`#${CSS.escape(domId)}`);
      } catch {
        el = null;
      }
      if (!el) return;
      if (logical === "labels") {
        setDisplay(el, true);
        return;
      }
      setDisplay(el, vis);
    });

    const labG = root.querySelector("#lables");
    if (labG) {
      const showSecondary = showAllLabels || stateRef.current.scale >= LABEL_ZOOM_THRESHOLD;
      labG.querySelectorAll("text").forEach((node) => {
        const t = node as SVGTextElement;
        const pri = isPriorityMapLabel(t);
        (t as SVGElement).style.visibility = pri || showSecondary ? "visible" : "hidden";
        const base = 10;
        const s = stateRef.current.scale;
        const fs = clamp(base * (0.78 + s * 0.11), 7.5, 22);
        t.setAttribute("font-size", String(Math.round(fs * 10) / 10));
      });
    }

    const ov = ensureOverlayGroup(root);
    clearOverlayChildren(ov, "jnuhub-cat-pin");
    if (sidebarCategory !== "all") {
      for (const detail of Object.values(MAP_BUILDING_REGISTRY)) {
        if (detail.category !== sidebarCategory) continue;
        if (detail.id === highlightBuildingId) continue;
        const p = getPinCenterForId(root, detail.id);
        if (p) placePin(ov, "jnuhub-cat-pin", p.cx, p.cy, pinSvgUrl);
      }
    }

    clearOverlayChildren(ov, "jnuhub-focus-pin");
    const hl = highlightBuildingId;
    if (hl) {
      const p = getPinCenterForId(root, hl);
      if (p) placePin(ov, "jnuhub-focus-pin", p.cx, p.cy, pinSvgUrl, 26, 30);
    }
  }, [layerVisible, sidebarCategory, highlightBuildingId, showAllLabels, scale]);

  useEffect(() => {
    applyMapLayers();
  }, [applyMapLayers, svgText, ox, oy, scale]);

  useEffect(() => {
    const root = svgRef.current;
    if (!root) return;

    const prev = prevHighlightRef.current;
    if (prev) {
      const ps = prev.dataset.jnuhubStrokePrev;
      const pw = prev.dataset.jnuhubSwPrev;
      if (ps !== undefined) {
        if (ps === "") prev.removeAttribute("stroke");
        else prev.setAttribute("stroke", ps);
      }
      if (pw !== undefined) {
        if (pw === "") prev.removeAttribute("stroke-width");
        else prev.setAttribute("stroke-width", pw);
      }
      delete prev.dataset.jnuhubStrokePrev;
      delete prev.dataset.jnuhubSwPrev;
      prevHighlightRef.current = null;
    }

    if (!highlightBuildingId) return;

    let el: SVGElement | null = null;
    try {
      const q = root.querySelector(`#${CSS.escape(highlightBuildingId)}`);
      if (q instanceof SVGElement) el = q;
    } catch {
      el = null;
    }

    if (el && el.tagName.toLowerCase() === "text") {
      try {
        const q = root.querySelector(`#${CSS.escape(highlightBuildingId.replace(/_2$/, ""))}`);
        if (q instanceof SVGGraphicsElement) el = q;
      } catch {
        /* keep text */
      }
    }

    if (el instanceof SVGGraphicsElement && typeof el.getBBox === "function") {
      if (!el.dataset.jnuhubStrokePrev) {
        el.dataset.jnuhubStrokePrev = el.getAttribute("stroke") ?? "";
        el.dataset.jnuhubSwPrev = el.getAttribute("stroke-width") ?? "";
      }
      el.setAttribute("stroke", "#006940");
      el.setAttribute("stroke-width", "3");
      prevHighlightRef.current = el;
    }
  }, [highlightBuildingId, svgText]);

  useEffect(() => {
    onZoomChange(scale);
  }, [scale, onZoomChange]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    let pw = vp.clientWidth,
      ph = vp.clientHeight;
    const ro = new ResizeObserver(() => {
      const nw = vp.clientWidth,
        nh = vp.clientHeight;
      if (nw <= 0 || nh <= 0 || pw <= 0 || ph <= 0) {
        pw = nw;
        ph = nh;
        return;
      }
      const { ox: ox0, oy: oy0, scale: s } = stateRef.current;
      const wcx = (pw / 2 - ox0) / s;
      const wcy = (ph / 2 - oy0) / s;
      setOx(nw / 2 - wcx * s);
      setOy(nh / 2 - wcy * s);
      pw = nw;
      ph = nh;
    });
    ro.observe(vp);
    return () => ro.disconnect();
  }, []);

  const cancelAnim = () => {
    if (animRef.current != null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  };

  const animateCamera = useCallback(
    (to: { ox: number; oy: number; scale: number }, ms: number) => {
      cancelAnim();
      const from = { ...stateRef.current };
      const t0 = performance.now();
      const step = (now: number) => {
        const u = clamp((now - t0) / ms, 0, 1);
        const e = easeOutCubic(u);
        setOx(from.ox + (to.ox - from.ox) * e);
        setOy(from.oy + (to.oy - from.oy) * e);
        setScale(from.scale + (to.scale - from.scale) * e);
        if (u < 1) animRef.current = requestAnimationFrame(step);
        else animRef.current = null;
      };
      animRef.current = requestAnimationFrame(step);
    },
    [],
  );

  useEffect(() => () => cancelAnim(), []);

  const focusByBuildingId = useCallback((id: string): boolean => {
    const svg = svgRef.current;
    const vp = viewportRef.current;
    if (!svg || !vp) return false;

    const meta = MAP_BUILDING_REGISTRY[id];
    let cx: number;
    let cy: number;
    const p = getPinCenterForId(svg, id);
    if (p) {
      cx = p.cx;
      cy = p.cy;
    } else if (meta) {
      cx = meta.focus.cx;
      cy = meta.focus.cy;
    } else {
      return false;
    }

    const targetScale = clamp(Math.max(stateRef.current.scale, 1.45), MIN_SCALE, MAX_SCALE);
    const nx = vp.clientWidth / 2 - cx * targetScale;
    const ny = vp.clientHeight / 2 - cy * targetScale;
    animateCamera({ ox: nx, oy: ny, scale: targetScale }, 420);
    return true;
  }, [animateCamera]);

  useImperativeHandle(
    ref,
    () => ({
      focusByBuildingId,
      getZoom: () => stateRef.current.scale,
      fitToView,
    }),
    [focusByBuildingId, fitToView],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      cancelAnim();
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

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      cancelAnim();
      if (e.touches.length === 1) {
        const t = e.touches[0];
        drag.current = { px: t.clientX, py: t.clientY, ox0: stateRef.current.ox, oy0: stateRef.current.oy };
        pinch.current = null;
      } else if (e.touches.length === 2) {
        drag.current = null;
        const t0 = e.touches[0],
          t1 = e.touches[1];
        const rect = el.getBoundingClientRect();
        pinch.current = {
          dist0: dist2(t0, t1),
          scale0: stateRef.current.scale,
          ox0: stateRef.current.ox,
          oy0: stateRef.current.oy,
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
        const t0 = e.touches[0],
          t1 = e.touches[1];
        const d = dist2(t0, t1);
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
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    if (e.button !== 0) return;
    cancelAnim();
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
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onClick = (e: React.MouseEvent) => {
    const down = pointerDownPos.current;
    if (down) {
      const moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y);
      pointerDownPos.current = null;
      if (moved > 6) return;
    }
    const svg = svgRef.current;
    const host = hostRef.current;
    if (!svg || !host) return;
    const rect = host.getBoundingClientRect();
    const rawId = resolveClickableId(e.target instanceof Element ? e.target : null);
    const regId = normalizeRegistryBuildingId(rawId);
    const p = clientToSvgUser(svg, e.clientX, e.clientY, rect);
    onPick({
      elementId: rawId,
      registryId: regId,
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
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onClick}
      role="application"
      aria-label="캠퍼스 지도"
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
    >
      {loadError && <div className="map-viewport-error">{loadError}</div>}
      {!svgText && !loadError && <div className="map-viewport-loading">지도 불러오는 중…</div>}
      <div
        ref={hostRef}
        className="map-svg-host"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    </div>
  );
});
