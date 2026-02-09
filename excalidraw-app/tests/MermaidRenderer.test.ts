import { describe, expect, it, vi } from "vitest";

import { renderMermaid } from "../markdown/renderers/mermaidRenderer";

vi.mock("mermaid", () => ({
  default: {
    initialize: () => undefined,
    render: async () => ({
      svg: '<svg width="120" height="80" viewBox="0 0 120 80"></svg>',
    }),
  },
}));

describe("MermaidRenderer", () => {
  it("renders mermaid to bitmap", async () => {
    const result = await renderMermaid("graph TD; A-->B");
    expect(result.dataURL).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(result.width).toBe(120);
    expect(result.height).toBe(80);
  });
});
