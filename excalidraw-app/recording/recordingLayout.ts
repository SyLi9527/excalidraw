export type CanvasSize = {
  width: number;
  height: number;
};

export type FitRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
};

const parseRatio = (ratio: string): number => {
  const [w, h] = ratio.split(":").map((value) => Number(value));
  if (!Number.isFinite(w) || !Number.isFinite(h) || h === 0) {
    return 1;
  }
  return w / h;
};

export const computeOutputSize = (
  viewWidth: number,
  viewHeight: number,
  ratio: string,
  maxLongEdge = 1080,
): CanvasSize => {
  const ratioValue = parseRatio(ratio);
  const longEdge = Math.min(maxLongEdge, Math.max(viewWidth, viewHeight));

  if (ratioValue >= 1) {
    return {
      width: longEdge,
      height: Math.round(longEdge / ratioValue),
    };
  }

  return {
    width: Math.round(longEdge * ratioValue),
    height: longEdge,
  };
};

export const computeFitRect = (
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
): FitRect => {
  const scale = Math.min(dstWidth / srcWidth, dstHeight / srcHeight);
  const width = srcWidth * scale;
  const height = srcHeight * scale;

  return {
    x: (dstWidth - width) / 2,
    y: (dstHeight - height) / 2,
    width,
    height,
    scale,
  };
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const normalizePipRect = (
  rect: { x: number; y: number; width: number; height: number },
  canvas: CanvasSize,
): { x: number; y: number; width: number; height: number } => ({
  x: clamp01(rect.x / canvas.width),
  y: clamp01(rect.y / canvas.height),
  width: clamp01(rect.width / canvas.width),
  height: clamp01(rect.height / canvas.height),
});
