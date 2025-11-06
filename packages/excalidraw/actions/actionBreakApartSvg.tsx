import { MIME_TYPES, randomId } from "@excalidraw/common";
import {
  isInitializedImageElement,
  newElement,
  newLinearElement,
  newFreeDrawElement,
  CaptureUpdateAction,
} from "@excalidraw/element";
import type {
  ExcalidrawElement,
  InitializedExcalidrawImageElement,
  OrderedExcalidrawElement,
} from "@excalidraw/element/types";

import { ToolButton } from "../components/ToolButton";
import { MagicIcon } from "../components/icons";
import { t } from "../i18n";
import { dataURLToString } from "../data/blob";
import { normalizeSVG } from "@excalidraw/element";
import { isSomeElementSelected } from "../scene";
import { register } from "./register";
import type { AppClassProperties, AppState } from "../types";
import { pointFrom } from "@excalidraw/math";
import type { LocalPoint } from "@excalidraw/math";

// Resolve computed styles (fill/stroke/width/opacity) with inheritance
const resolveComputedStyles = (
  node: Element,
  svg: SVGSVGElement,
): {
  strokeColor: string | undefined;
  backgroundColor: string;
  strokeWidth: number | undefined;
  opacity: number | undefined;
} => {
  const cs = window.getComputedStyle(node as unknown as Element);
  const rawFill = cs.fill || node.getAttribute("fill") || "";
  const rawStroke = cs.stroke || node.getAttribute("stroke") || "";
  const rawStrokeWidth = cs.strokeWidth || node.getAttribute("stroke-width") || "";
  const rawOpacity = cs.opacity || node.getAttribute("opacity") || "";

  let backgroundColor: string = "transparent";
  let strokeColor: string | undefined = undefined;

  const toColor = (v: string | null | undefined) => {
    if (!v) return undefined;
    const s = String(v).trim();
    if (!s || s === "none") return undefined;
    return s;
  };

  // Handle gradients/patterns by approximating to a representative stop color
  const resolveUrlColor = (value: string): string | undefined => {
    const m = value.match(/url\(#([^\)]+)\)/i);
    if (!m) return undefined;
    const ref = svg.querySelector(`#${m[1]}`);
    if (!ref) return undefined;
    const stops = Array.from(ref.querySelectorAll("stop"));
    if (!stops.length) return undefined;
    // Pick the stop closest to 50%
    let picked = stops[0];
    let best = Infinity;
    for (const st of stops) {
      const offRaw = st.getAttribute("offset") || "0";
      const off = parseFloat(String(offRaw).replace(/%/, ""));
      const pct = /%/.test(offRaw) ? off / 100 : off;
      const diff = Math.abs(pct - 0.5);
      if (diff < best) {
        best = diff;
        picked = st;
      }
    }
    const stopColor = picked.getAttribute("stop-color") || (picked.getAttribute("style") || "").match(/stop-color\s*:\s*([^;]+)/)?.[1];
    return toColor(stopColor) || undefined;
  };

  // Fill
  const fillColor = toColor(rawFill);
  if (!fillColor) {
    backgroundColor = "transparent";
  } else if (/^url\(/i.test(fillColor)) {
    backgroundColor = resolveUrlColor(fillColor) || "transparent";
  } else {
    backgroundColor = fillColor;
  }

  // Stroke
  const strokeResolved = toColor(rawStroke);
  if (!strokeResolved) {
    strokeColor = "transparent";
  } else if (/^url\(/i.test(strokeResolved)) {
    strokeColor = resolveUrlColor(strokeResolved) || "transparent";
  } else {
    strokeColor = strokeResolved;
  }

  const strokeWidth = (() => {
    const n = parseFloat(String(rawStrokeWidth).replace(/px|\s+/g, ""));
    return Number.isFinite(n) ? n : undefined;
  })();

  const opacity = (() => {
    const s = String(rawOpacity).trim();
    if (!s) return undefined;
    // support percentage-like values defensively, though SVG opacity uses 0..1
    if (/%$/.test(s)) {
      const n = parseFloat(s.replace(/%/, ""));
      if (!Number.isFinite(n)) return undefined;
      // clamp to 0..100
      return Math.max(0, Math.min(100, Math.round(n)));
    }
    const n = parseFloat(s);
    if (!Number.isFinite(n)) return undefined;
    // if value is in 0..1 range, convert to percentage 0..100
    if (n <= 1) {
      return Math.max(0, Math.min(100, Math.round(n * 100)));
    }
    // otherwise assume already in percentage 0..100
    return Math.max(0, Math.min(100, Math.round(n)));
  })();

  return { strokeColor, backgroundColor, strokeWidth, opacity };
};

// Transform a point using element CTM
const transformPoint = (
  node: SVGGraphicsElement,
  x: number,
  y: number,
): [number, number] => {
  try {
    const ctm = node.getCTM();
    const svg = (node.ownerSVGElement || (node as any).nearestViewportElement) as SVGSVGElement | null;
    if (!ctm || !svg || !svg.createSVGPoint) {
      return [x, y];
    }
    const p = svg.createSVGPoint();
    p.x = x;
    p.y = y;
    const t = p.matrixTransform(ctm);
    return [t.x, t.y];
  } catch {
    return [x, y];
  }
};

const logStyleDiff = (
  tag: string,
  orig: { strokeColor?: string; backgroundColor: string; strokeWidth?: number; opacity?: number },
  el: ExcalidrawElement,
) => {
  try {
    const diffs: string[] = [];
    if ((orig.strokeColor || "transparent") !== (el.strokeColor || "transparent")) {
      diffs.push(`stroke: ${orig.strokeColor} -> ${el.strokeColor}`);
    }
    if ((orig.backgroundColor || "transparent") !== (el.backgroundColor || "transparent")) {
      diffs.push(`fill: ${orig.backgroundColor} -> ${el.backgroundColor}`);
    }
    if ((orig.strokeWidth ?? 0) !== (el.strokeWidth ?? 0)) {
      diffs.push(`strokeWidth: ${orig.strokeWidth} -> ${el.strokeWidth}`);
    }
    if ((orig.opacity ?? 1) !== (el.opacity ?? 1)) {
      diffs.push(`opacity: ${orig.opacity} -> ${el.opacity}`);
    }
    if (diffs.length) {
      console.warn(`[BreakApartSVG] ${tag} style mismatch: ${diffs.join(", ")}`);
    }
  } catch {}
};

const parseFloatAttr = (node: Element, name: string): number | null => {
  const raw = node.getAttribute(name);
  if (!raw) {
    return null;
  }
  const val = parseFloat(raw.replace(/px|\s+/g, ""));
  return Number.isFinite(val) ? val : null;
};

const parsePointsAttr = (node: Element): Array<[number, number]> => {
  const raw = node.getAttribute("points") || "";
  const pts: Array<[number, number]> = [];
  raw
    .trim()
    .split(/\s+/)
    .forEach((pair) => {
      const [xStr, yStr] = pair.split(/[,\s]/).filter(Boolean);
      const x = parseFloat(xStr);
      const y = parseFloat(yStr);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        pts.push([x, y]);
      }
    });
  return pts;
};

const isDiamondPolygon = (points: Array<[number, number]>): boolean => {
  if (points.length !== 4) {
    return false;
  }
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const tolX = (maxX - minX) * 0.02;
  const tolY = (maxY - minY) * 0.02;
  const expected = [
    [cx, minY],
    [maxX, cy],
    [cx, maxY],
    [minX, cy],
  ];
  let matched = 0;
  for (const e of expected) {
    if (
      points.some(
        (p) => Math.abs(p[0] - e[0]) <= tolX && Math.abs(p[1] - e[1]) <= tolY,
      )
    ) {
      matched++;
    }
  }
  return matched === 4;
};

const enableBreakApartSvg = (
  appState: AppState,
  app: AppClassProperties,
) => {
  const selected = app.scene.getSelectedElements({
    selectedElementIds: appState.selectedElementIds,
    includeBoundTextElement: false,
  });
  if (selected.length !== 1) {
    return false;
  }
  const el = selected[0];
  if (!isInitializedImageElement(el)) {
    return false;
  }
  const fileData = app.files[el.fileId];
  if (!fileData) {
    return false;
  }
  if (fileData.mimeType === MIME_TYPES.svg) {
    try {
      const svgString = normalizeSVG(dataURLToString((fileData as any).dataURL));
      const doc = new DOMParser().parseFromString(svgString, MIME_TYPES.svg);
      const svg = doc.querySelector("svg");
      if (!svg) return false;
      const topGroups = Array.from(svg.children).filter(
        (n) => n.tagName.toLowerCase() === "g",
      );
      return topGroups.length > 1;
    } catch {
      return false;
    }
  }
  // Fallback: detect SVG via dataURL header if mimeType is missing/incorrect
  try {
    const dataURL: string | undefined = (fileData as any).dataURL;
    if (typeof dataURL === "string" && /^data:image\/svg\+xml/i.test(dataURL)) {
      try {
        const svgString = normalizeSVG(dataURLToString(dataURL));
        const doc = new DOMParser().parseFromString(svgString, MIME_TYPES.svg);
        const svg = doc.querySelector("svg");
        if (!svg) return false;
        const topGroups = Array.from(svg.children).filter(
          (n) => n.tagName.toLowerCase() === "g",
        );
        return topGroups.length > 1;
      } catch {
        return false;
      }
    }
  } catch {}
  return false;
};

export const actionBreakApartSvg = register({
  name: "breakApartSvg",
  label: "buttons.breakApartSvg",
  icon: MagicIcon,
  trackEvent: { category: "element", action: "break_apart_svg" },
  perform: (elements, appState, _, app) => {
    const selected = app.scene.getSelectedElements({
      selectedElementIds: appState.selectedElementIds,
      includeBoundTextElement: false,
    });

    const imageEls = selected.filter(isInitializedImageElement) as readonly InitializedExcalidrawImageElement[];
    if (imageEls.length === 0) {
      return {
        elements,
        appState,
        captureUpdate: CaptureUpdateAction.EVENTUALLY,
      };
    }

    let nextElements: readonly OrderedExcalidrawElement[] | readonly ExcalidrawElement[] = elements;
    let anyInserted = false;

    for (const img of imageEls) {
      const fileData = app.files[img.fileId];
      if (!fileData || fileData.mimeType !== MIME_TYPES.svg) {
        continue;
      }
      let svgString: string;
      try {
        svgString = normalizeSVG(dataURLToString(fileData.dataURL));
      } catch (error) {
        console.error(error);
        continue;
      }
      const doc = new DOMParser().parseFromString(svgString, MIME_TYPES.svg);
      const svg = doc.querySelector("svg");
      if (!svg) {
        continue;
      }

      // attach to DOM temporarily so getComputedStyle reflects CSS inheritance
      const tempHost = document.createElement("div");
      tempHost.style.position = "absolute";
      tempHost.style.left = "-99999px";
      tempHost.style.top = "-99999px";
      tempHost.style.width = "0";
      tempHost.style.height = "0";
      // ensure we don't propagate zero opacity to computed styles
      // use visibility to hide instead of opacity
      tempHost.style.visibility = "hidden";
      tempHost.style.pointerEvents = "none";
      try {
        document.body.appendChild(tempHost);
        tempHost.appendChild(svg);
      } catch {}

      // determine original coordinate system
      const width = parseFloatAttr(svg, "width") ?? 0;
      const height = parseFloatAttr(svg, "height") ?? 0;
      const vb = (svg.getAttribute("viewBox") || "").trim();
      let vbX = 0,
        vbY = 0,
        vbW = width,
        vbH = height;
      if (vb) {
        const parts = vb.split(/\s+/).map((n) => parseFloat(n));
        if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
          [vbX, vbY, vbW, vbH] = parts;
        }
      }
      const sx = vbW ? img.width / vbW : 1;
      const sy = vbH ? img.height / vbH : 1;

      const groupIds = img.groupIds;
      const frameId = img.frameId;

  // iterate only top-level <g> groups and create elements within each group
  const createdElements: ExcalidrawElement[] = [];
  const groups = Array.from(svg.children).filter(
    (n) => n.tagName.toLowerCase() === "g",
  ) as unknown as SVGGraphicsElement[];
  groups.forEach((groupNode) => {
    const groupId = randomId();
    const shapes = groupNode.querySelectorAll(
      "rect, ellipse, circle, line, polygon, polyline, path",
    );
    shapes.forEach((node) => {
      const tag = node.tagName.toLowerCase();
      const { strokeColor, backgroundColor, strokeWidth, opacity } =
        resolveComputedStyles(node, svg);

        // map dasharray to strokeStyle when possible
        const cs = (node as SVGElement).style;
        const dash = (cs as any)?.strokeDasharray || node.getAttribute("stroke-dasharray") || "";
        const linecap = (cs as any)?.strokeLinecap || node.getAttribute("stroke-linecap") || "butt";
        const strokeStyle: "solid" | "dashed" | "dotted" = (() => {
          const raw = String(dash).trim();
          if (!raw || raw === "none") return "solid";
          const nums = raw.split(/[\s,]+/).map((v) => parseFloat(v)).filter((n) => Number.isFinite(n));
          if (!nums.length) return "dashed";
          const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
          if (linecap === "round" && strokeWidth && avg <= strokeWidth * 1.5) return "dotted";
          return "dashed";
        })();

        if (tag === "rect") {
          const gNode = node as unknown as SVGGraphicsElement;
          const bbox = gNode.getBBox();
          const x = bbox.x - vbX;
          const y = bbox.y - vbY;
          const w = bbox.width;
          const h = bbox.height;
          const el = newElement({
            type: "rectangle",
            x: img.x + x * sx,
            y: img.y + y * sy,
            width: w * sx,
            height: h * sy,
            groupIds: [...groupIds, groupId],
            frameId,
            strokeColor,
            strokeWidth,
            strokeStyle,
            backgroundColor,
            opacity,
          });
          createdElements.push(el);
          logStyleDiff(tag, { strokeColor, backgroundColor, strokeWidth, opacity }, el);
        } else if (tag === "ellipse") {
          const gNode = node as unknown as SVGGraphicsElement;
          const bbox = gNode.getBBox();
          const cx = bbox.x - vbX + bbox.width / 2;
          const cy = bbox.y - vbY + bbox.height / 2;
          const rx = bbox.width / 2;
          const ry = bbox.height / 2;
          const el = newElement({
            type: "ellipse",
            x: img.x + (cx - rx) * sx,
            y: img.y + (cy - ry) * sy,
            width: rx * 2 * sx,
            height: ry * 2 * sy,
            groupIds: [...groupIds, groupId],
            frameId,
            strokeColor,
            strokeWidth,
            strokeStyle,
            backgroundColor,
            opacity,
          });
          createdElements.push(el);
          logStyleDiff(tag, { strokeColor, backgroundColor, strokeWidth, opacity }, el);
        } else if (tag === "circle") {
          const gNode = node as unknown as SVGGraphicsElement;
          const bbox = gNode.getBBox();
          const cx = bbox.x - vbX + bbox.width / 2;
          const cy = bbox.y - vbY + bbox.height / 2;
          const r = Math.max(bbox.width, bbox.height) / 2;
          const el = newElement({
            type: "ellipse",
            x: img.x + (cx - r) * sx,
            y: img.y + (cy - r) * sy,
            width: r * 2 * sx,
            height: r * 2 * sy,
            groupIds: [...groupIds, groupId],
            frameId,
            strokeColor,
            strokeWidth,
            strokeStyle,
            backgroundColor,
            opacity,
          });
          createdElements.push(el);
          logStyleDiff(tag, { strokeColor, backgroundColor, strokeWidth, opacity }, el);
        } else if (tag === "line") {
          const gNode = node as unknown as SVGGraphicsElement;
          const x1Raw = parseFloatAttr(node, "x1") ?? 0;
          const y1Raw = parseFloatAttr(node, "y1") ?? 0;
          const x2Raw = parseFloatAttr(node, "x2") ?? 0;
          const y2Raw = parseFloatAttr(node, "y2") ?? 0;
          const [tx1, ty1] = transformPoint(gNode, x1Raw, y1Raw);
          const [tx2, ty2] = transformPoint(gNode, x2Raw, y2Raw);
          const x1 = tx1 - vbX;
          const y1 = ty1 - vbY;
          const x2 = tx2 - vbX;
          const y2 = ty2 - vbY;
          const el = newLinearElement({
            type: "line",
            x: img.x + x1 * sx,
            y: img.y + y1 * sy,
            points: [
              pointFrom<LocalPoint>(0, 0),
              pointFrom<LocalPoint>((x2 - x1) * sx, (y2 - y1) * sy),
            ],
            groupIds: [...groupIds, groupId],
            frameId,
            strokeColor,
            strokeWidth,
            strokeStyle,
            opacity,
          });
          createdElements.push(el);
          logStyleDiff(tag, { strokeColor, backgroundColor, strokeWidth, opacity }, el);
        } else if (tag === "polygon") {
          const gNode = node as unknown as SVGGraphicsElement;
          const ptsRaw = parsePointsAttr(node);
          const pts = ptsRaw.map(([px, py]) => transformPoint(gNode, px, py));
          if (!pts.length) {
            // malformed polygon without points, skip
            return;
          }
          const localPoints = pts.map(([px, py], i) => {
            const lx = (px - vbX) * sx;
            const ly = (py - vbY) * sy;
            if (i === 0) {
              return pointFrom<LocalPoint>(0, 0);
            }
            const prev = pts[i - 1];
            const lpx = (prev[0] - vbX) * sx;
            const lpy = (prev[1] - vbY) * sy;
            return pointFrom<LocalPoint>(lx - lpx, ly - lpy);
          });

          // ensure the polygon is closed by adding a final segment back to start
          if (pts.length >= 2) {
            const firstAbsX = (pts[0][0] - vbX) * sx;
            const firstAbsY = (pts[0][1] - vbY) * sy;
            const lastAbsX = (pts[pts.length - 1][0] - vbX) * sx;
            const lastAbsY = (pts[pts.length - 1][1] - vbY) * sy;
            const closeDX = firstAbsX - lastAbsX;
            const closeDY = firstAbsY - lastAbsY;
            // only push if the closing distance isn't negligible
            if (Math.hypot(closeDX, closeDY) > 0) {
              localPoints.push(pointFrom<LocalPoint>(closeDX, closeDY));
            }
          }

          const start = pts[0];
          const el = newLinearElement({
            type: "line",
            x: img.x + (start[0] - vbX) * sx,
            y: img.y + (start[1] - vbY) * sy,
            points: localPoints,
            groupIds: [...groupIds, groupId],
            frameId,
            strokeColor,
            strokeWidth,
            strokeStyle,
            opacity,
            polygon: true,
            backgroundColor,
          });
          createdElements.push(el);
          logStyleDiff(tag, { strokeColor, backgroundColor, strokeWidth, opacity }, el);
        } else if (tag === "polyline") {
          const gNode = node as unknown as SVGGraphicsElement;
          const ptsRaw = parsePointsAttr(node);
          const pts = ptsRaw.map(([px, py]) => transformPoint(gNode, px, py));
          if (!pts.length) {
            // malformed polyline without points, skip
            return;
          }
          const localPoints = pts.map(([px, py], i) => {
            const lx = (px - vbX) * sx;
            const ly = (py - vbY) * sy;
            if (i === 0) {
              return pointFrom<LocalPoint>(0, 0);
            }
            const prev = pts[i - 1];
            const lpx = (prev[0] - vbX) * sx;
            const lpy = (prev[1] - vbY) * sy;
            return pointFrom<LocalPoint>(lx - lpx, ly - lpy);
          });

          const start = pts[0];
          const el = newLinearElement({
            type: "line",
            x: img.x + (start[0] - vbX) * sx,
            y: img.y + (start[1] - vbY) * sy,
            points: localPoints,
            groupIds: [...groupIds, groupId],
            frameId,
            strokeColor,
            strokeWidth,
            strokeStyle,
            opacity,
          });
          createdElements.push(el);
          logStyleDiff(tag, { strokeColor, backgroundColor, strokeWidth, opacity }, el);
        } else if (tag === "path") {
          const gNode = node as unknown as SVGGraphicsElement;
          const path = gNode as unknown as SVGPathElement;
          const dAttr = (path.getAttribute("d") || "").trim();
          const hasCloseCmd = /z/i.test(dAttr);
          let total = 0;
          try {
            total = path.getTotalLength();
          } catch {}
          const sampleCount = Math.max(32, Math.min(512, Math.round(total / 4)));
          const pts: [number, number][] = [];
          for (let i = 0; i <= sampleCount; i++) {
            const l = (total * i) / sampleCount;
            let pt: DOMPoint | { x: number; y: number } | null = null;
            try {
              pt = path.getPointAtLength(l);
            } catch {
              pt = null;
            }
            if (pt) {
              const [tx, ty] = transformPoint(gNode, pt.x, pt.y);
              pts.push([tx, ty]);
            }
          }

          if (pts.length >= 2) {
            const bbox = gNode.getBBox();
            const originX = bbox.x;
            const originY = bbox.y;
            const local = pts.map(([px, py]) =>
              pointFrom<LocalPoint>((px - originX) * sx, (py - originY) * sy),
            );

            // if path is closed (Z command), ensure loop by appending start point
            if (hasCloseCmd && local.length >= 2) {
              const first = local[0];
              const last = local[local.length - 1];
              if (Math.hypot(first[0] - last[0], first[1] - last[1]) > 0) {
                local.push(pointFrom<LocalPoint>(first[0], first[1]));
              }
            }
            const el = newFreeDrawElement({
              type: "freedraw",
              x: img.x + (originX - vbX) * sx,
              y: img.y + (originY - vbY) * sy,
              points: local,
              simulatePressure: true,
              groupIds: [...groupIds, groupId],
              frameId,
              strokeColor,
              strokeWidth,
              strokeStyle,
              backgroundColor,
              opacity,
            });
            createdElements.push(el);
            logStyleDiff(tag, { strokeColor, backgroundColor, strokeWidth, opacity }, el);
          }
        }
      });
    // end group iteration
  });

      // splice new elements near original position
      if (createdElements.length) {
        const idx = nextElements.findIndex((e) => e.id === img.id);
        if (idx >= 0) {
          const before = nextElements.slice(0, idx);
          const after = nextElements.slice(idx + 1);
          nextElements = [...before, ...createdElements, ...after];
        } else {
          nextElements = nextElements.filter((e) => e.id !== img.id);
          nextElements = [...nextElements, ...createdElements];
        }
        anyInserted = true;
      }

      // cleanup temp svg host
      try {
        tempHost.remove();
      } catch {}
    }

    if (!anyInserted) {
      return {
        elements,
        appState,
        captureUpdate: CaptureUpdateAction.EVENTUALLY,
      };
    }

    return {
      elements: nextElements,
      appState,
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },

  predicate: (elements, appState, _appProps, app) => enableBreakApartSvg(appState, app),

  PanelComponent: ({ elements, appState, updateData, app }) => (
    <ToolButton
      hidden={!enableBreakApartSvg(appState, app)}
      type="button"
      icon={MagicIcon}
      onClick={() => updateData(null)}
      title={t("buttons.breakApartSvg") || "Break Apart SVG"}
      aria-label={t("buttons.breakApartSvg") || "Break Apart SVG"}
      visible={isSomeElementSelected(elements, appState)}
    ></ToolButton>
  ),
});
