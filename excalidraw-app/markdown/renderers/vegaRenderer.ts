export type VegaRenderResult = {
  dataURL: string;
  width: number;
  height: number;
};

type VegaEmbed = (
  element: HTMLElement,
  spec: unknown,
  options?: { actions?: boolean; renderer?: "svg"; mode?: "vega" | "vega-lite" },
) => Promise<{ view: { toSVG: () => Promise<string> } }>;

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

const getVegaEmbed = async (): Promise<VegaEmbed> => {
  const module = await import("vega-embed");
  const vegaEmbed = (module as { default?: VegaEmbed }).default;
  if (!vegaEmbed) {
    throw new Error("Vega-embed module not available");
  }
  return vegaEmbed;
};

const renderVegaSpec = async (
  spec: unknown,
  mode: "vega" | "vega-lite",
): Promise<VegaRenderResult> => {
  const vegaEmbed = await getVegaEmbed();
  const container = document.createElement("div");
  const { view } = await vegaEmbed(container, spec, {
    actions: false,
    renderer: "svg",
    mode,
  });
  const svg = await view.toSVG();
  const { width, height } = parseSvgDimensions(svg);
  const dataURL = `data:image/svg+xml;base64,${encodeSvg(svg)}`;
  return { dataURL, width, height };
};

export const renderVegaLite = async (spec: unknown): Promise<VegaRenderResult> =>
  renderVegaSpec(spec, "vega-lite");

export const renderVega = async (spec: unknown): Promise<VegaRenderResult> =>
  renderVegaSpec(spec, "vega");
