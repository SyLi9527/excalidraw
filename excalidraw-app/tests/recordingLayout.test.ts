import {
  computeFitRect,
  computeOutputSize,
  normalizePipRect,
} from "../recording/recordingLayout";

describe("recordingLayout", () => {
  it("computes output size for landscape ratio", () => {
    const { width, height } = computeOutputSize(1600, 900, "16:9");
    expect(width).toBe(1080);
    expect(height).toBe(608);
  });

  it("computes output size for portrait ratio", () => {
    const { width, height } = computeOutputSize(800, 1200, "9:16");
    expect(width).toBe(608);
    expect(height).toBe(1080);
  });

  it("avoids upscaling for square ratio", () => {
    const { width, height } = computeOutputSize(500, 400, "1:1");
    expect(width).toBe(500);
    expect(height).toBe(500);
  });

  it("computes fit rect with letterboxing", () => {
    const rect = computeFitRect(1000, 500, 1000, 1000);
    expect(rect).toEqual({
      x: 0,
      y: 250,
      width: 1000,
      height: 500,
      scale: 1,
    });
  });

  it("normalizes pip rect to canvas size", () => {
    const rect = normalizePipRect(
      { x: 900, y: 100, width: 100, height: 200 },
      { width: 1000, height: 1000 },
    );
    expect(rect).toEqual({ x: 0.9, y: 0.1, width: 0.1, height: 0.2 });
  });
});
