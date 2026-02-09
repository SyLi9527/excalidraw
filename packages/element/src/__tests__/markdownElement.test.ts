import { describe, expect, it } from "vitest";

import { isMarkdownElement } from "../typeChecks";

const base = {
  id: "md-1",
  type: "markdown",
  x: 0,
  y: 0,
  width: 100,
  height: 80,
  angle: 0,
  strokeColor: "#000",
  backgroundColor: "#fff",
  fillStyle: "solid",
  strokeWidth: 1,
  strokeStyle: "solid",
  roundness: null,
  roughness: 0,
  opacity: 100,
  seed: 1,
  version: 1,
  versionNonce: 1,
  index: null,
  isDeleted: false,
  groupIds: [],
  frameId: null,
  boundElements: null,
  updated: 1,
  link: null,
  locked: false,
  markdown: "# Hello",
  renderConfig: { theme: "light", fontSize: 14 },
  renderCache: { dataURL: "data:image/png;base64,AAA", width: 100, height: 80 },
};

describe("markdown element", () => {
  it("detects markdown element type", () => {
    expect(isMarkdownElement(base as any)).toBe(true);
  });
});
