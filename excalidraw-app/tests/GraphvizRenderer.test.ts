import { describe, expect, it, vi } from "vitest";

import { renderGraphviz } from "../markdown/renderers/graphvizRenderer";

vi.mock("viz.js", () => ({
  default: async () => ({
    renderString: async () =>
      '<svg width="160" height="90" viewBox="0 0 160 90"></svg>',
  }),
}));

describe("GraphvizRenderer", () => {
  it("renders graphviz to bitmap", async () => {
    const result = await renderGraphviz("digraph G { A -> B }");
    expect(result.dataURL).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(result.width).toBe(160);
    expect(result.height).toBe(90);
  });
});
