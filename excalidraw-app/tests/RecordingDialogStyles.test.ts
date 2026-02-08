import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("RecordingDialog styles", () => {
  it("includes hover/focus-visible + reduced-motion rules", () => {
    const scss = fs.readFileSync(
      path.resolve(__dirname, "../recording/RecordingDialog.scss"),
      "utf8",
    );

    expect(scss).toContain("&__ratioButton:hover");
    expect(scss).toContain("&__ratioButton:focus-visible");
    expect(scss).toContain("&__backgroundSwatch:hover");
    expect(scss).toContain("&__backgroundSwatch:focus-visible");
    expect(scss).toContain("prefers-reduced-motion: reduce");
    expect(scss).toContain("&__textarea:focus-visible");
    expect(scss).toContain("&__dragHandle:focus-visible");
  });
});
