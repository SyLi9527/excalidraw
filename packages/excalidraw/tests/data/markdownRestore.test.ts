import { describe, expect, it } from "vitest";

import { restoreElements } from "../../data/restore";

const raw = [
  {
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
    renderCache: null,
  },
];

describe("markdown restore", () => {
  it("restores markdown elements", () => {
    const elements = restoreElements(raw as any, null);
    expect(elements[0].type).toBe("markdown");
  });
});
