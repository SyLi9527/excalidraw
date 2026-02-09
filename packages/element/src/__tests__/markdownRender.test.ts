import { describe, expect, it } from "vitest";

import { renderElement } from "../renderElement";
import { newMarkdownElement } from "../newElement";

const getFakeContext = () =>
  ({
    drawImage: () => {},
  }) as any;

const getEmptyMap = () => new Map();

const getAppState = () =>
  ({
    openDialog: null,
    selectedElementIds: {},
    hoveredElementIds: {},
    scrollX: 0,
    scrollY: 0,
    zoom: { value: 1 },
    theme: "light",
  }) as any;

const getRenderConfig = () =>
  ({
    isExporting: false,
    elementsPendingErasure: new Set(),
    pendingFlowchartNodes: null,
    imageCache: new Map(),
  }) as any;

describe("markdown render", () => {
  it("renders markdown element without throwing", () => {
    const element = newMarkdownElement({
      x: 0,
      y: 0,
      width: 100,
      height: 80,
      markdown: "# A",
      renderConfig: { theme: "light", fontSize: 14 },
    });

    element.renderCache = {
      dataURL: "data:image/png;base64,AAA",
      width: 100,
      height: 80,
    };

    expect(() =>
      renderElement(
        element as any,
        getEmptyMap(),
        getEmptyMap(),
        {} as any,
        getFakeContext(),
        getRenderConfig(),
        getAppState(),
      ),
    ).not.toThrow();
  });
});
