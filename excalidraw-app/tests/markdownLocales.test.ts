import { describe, expect, it } from "vitest";

import en from "../../packages/excalidraw/locales/en.json";

describe("markdown locales", () => {
  it("uses title case and actionable errors", () => {
    expect(en.markdown.title).toBe("Markdown");
    expect(en.markdown.renderError).toMatch(/try again|check/i);
  });
});
