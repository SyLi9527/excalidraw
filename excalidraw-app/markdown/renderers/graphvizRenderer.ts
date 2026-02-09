export type GraphvizRenderResult = {
  dataURL: string;
  width: number;
  height: number;
};

type VizInstance = {
  renderString: (code: string) => Promise<string>;
};

type VizFactory = () => Promise<VizInstance>;

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

const getViz = async (): Promise<VizInstance> => {
  const module = await import("viz.js");
  const createViz = (module as { default?: VizFactory }).default;
  if (!createViz) {
    throw new Error("Viz.js module not available");
  }
  return createViz();
};

export const renderGraphviz = async (
  code: string,
): Promise<GraphvizRenderResult> => {
  const viz = await getViz();
  const svg = await viz.renderString(code);
  const { width, height } = parseSvgDimensions(svg);
  const dataURL = `data:image/svg+xml;base64,${encodeSvg(svg)}`;
  return { dataURL, width, height };
};
