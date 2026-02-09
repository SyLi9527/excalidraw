import { describe, expect, it, vi } from "vitest";

import { renderDrawio } from "../markdown/renderers/drawioRenderer";

vi.mock("@markdown-viewer/drawio2svg", () => ({
  default: async () =>
    '<svg width="200" height="120" viewBox="0 0 200 120"></svg>',
}));

describe("DrawioRenderer", () => {
  it("renders drawio xml to bitmap", async () => {
    const xml = "<mxfile><diagram id=\"d1\">jVJNT8MwDP0rJcEos3bQ</diagram></mxfile>";
    const result = await renderDrawio(xml);
    expect(result.dataURL).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(result.width).toBe(200);
    expect(result.height).toBe(120);
  });
});
