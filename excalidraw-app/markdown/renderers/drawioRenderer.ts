export type DrawioRenderResult = {
  dataURL: string;
  width: number;
  height: number;
};

type DrawioToSvg = (xml: string) => Promise<string> | string;

const encodeSvg = (svg: string) => btoa(unescape(encodeURIComponent(svg)));

const parseSvgDimensions = (svg: string): { width: number; height: number } => {
  const widthMatch = svg.match(/width=["']([0-9.]+)["']/i);
  const heightMatch = svg.match(/height=["']([0-9.]+)["']/i);
  if (widthMatch && heightMatch) {
    return {
      width: Math.ceil(parseFloat(widthMatch[1])),
      height: Math.ceil(parseFloat(heightMatch[1])),
    };
  }

  const viewBoxMatch = svg.match(
    /viewBox=["'][^"']*[\s,]([0-9.]+)[\s,]([0-9.]+)["']/i,
  );
  if (viewBoxMatch) {
    return {
      width: Math.ceil(parseFloat(viewBoxMatch[1])),
      height: Math.ceil(parseFloat(viewBoxMatch[2])),
    };
  }

  return { width: 400, height: 200 };
};

const getDrawioToSvg = async (): Promise<DrawioToSvg> => {
  const module = await import("@markdown-viewer/drawio2svg");
  const drawioToSvg = (module as { default?: DrawioToSvg }).default;
  if (!drawioToSvg) {
    throw new Error("Draw.io renderer module not available");
  }
  return drawioToSvg;
};

export const renderDrawio = async (xml: string): Promise<DrawioRenderResult> => {
  const drawioToSvg = await getDrawioToSvg();
  const svg = await Promise.resolve(drawioToSvg(xml));
  const { width, height } = parseSvgDimensions(svg);
  const dataURL = `data:image/svg+xml;base64,${encodeSvg(svg)}`;
  return { dataURL, width, height };
};
