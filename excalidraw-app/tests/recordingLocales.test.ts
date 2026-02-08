import en from "../../packages/excalidraw/locales/en.json";
import { describe, expect, it } from "vitest";

describe("recording locales", () => {
  it("uses Title Case and actionable error copy", () => {
    expect(en.recording.start).toBe("Start Recording");
    expect(en.recording.aspectRatio).toBe("Aspect Ratio");
    expect(en.recording.cursorHighlight).toBe("Cursor Highlight");

    expect(en.recording.downloadFailed).toMatch(/try again/i);
    expect(en.recording.micPermissionDenied).toMatch(/allow|check|try/i);
  });
});
