import { describe, expect, it } from "vitest";

import { renderMarkdownToImage } from "../markdown/MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("renders markdown to a data URL", async () => {
    const result = await renderMarkdownToImage("# Title");
    expect(result.dataURL).toMatch(/^data:image\/(png|svg\+xml);/);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });
});
