import { describe, expect, it, vi } from "vitest";

import { renderVegaLite } from "../markdown/renderers/vegaRenderer";

vi.mock("vega-embed", () => ({
  default: async () => ({
    view: {
      toSVG: async () => '<svg width="120" height="80" viewBox="0 0 120 80"></svg>',
    },
  }),
}));

describe("VegaRenderer", () => {
  it("renders vega-lite to bitmap", async () => {
    const spec = {
      mark: "bar",
      data: { values: [{ a: "A", b: 1 }] },
      encoding: {
        x: { field: "a", type: "nominal" },
        y: { field: "b", type: "quantitative" },
      },
    };
    const result = await renderVegaLite(spec as any);
    expect(result.dataURL).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(result.width).toBe(120);
    expect(result.height).toBe(80);
  });
});
