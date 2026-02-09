export type MermaidRenderResult = {
  dataURL: string;
  width: number;
  height: number;
};

type MermaidAPI = {
  initialize: (config: object) => void;
  render: (id: string, code: string) => Promise<{ svg: string }>;
};

const encodeSvg = (svg: string) =>
  btoa(unescape(encodeURIComponent(svg)));

const parseSvgDimensions = (svg: string): { width: number; height: number } => {
  const widthMatch = svg.match(/width=["']([0-9.]+)["']/i);
  const heightMatch = svg.match(/height=["']([0-9.]+)["']/i);
  if (widthMatch && heightMatch) {
    return {
      width: Math.ceil(parseFloat(widthMatch[1])),
      height: Math.ceil(parseFloat(heightMatch[1])),
    };
  }

  const viewBoxMatch = svg.match(/viewBox=["'][^"']*[\s,]([0-9.]+)[\s,]([0-9.]+)["']/i);
  if (viewBoxMatch) {
    return {
      width: Math.ceil(parseFloat(viewBoxMatch[1])),
      height: Math.ceil(parseFloat(viewBoxMatch[2])),
    };
  }

  return { width: 400, height: 200 };
};

const getMermaid = async (): Promise<MermaidAPI> => {
  const module = await import("mermaid");
  const mermaid = (module as { default?: MermaidAPI }).default;
  if (!mermaid) {
    throw new Error("Mermaid module not available");
  }
  return mermaid;
};

export const renderMermaid = async (code: string): Promise<MermaidRenderResult> => {
  const mermaid = await getMermaid();
  mermaid.initialize({ startOnLoad: false });
  const id = `mermaid-${Date.now()}`;
  const { svg } = await mermaid.render(id, code);
  const { width, height } = parseSvgDimensions(svg);
  const dataURL = `data:image/svg+xml;base64,${encodeSvg(svg)}`;
  return { dataURL, width, height };
};
