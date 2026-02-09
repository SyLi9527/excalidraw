export type MarkdownRenderResult = {
  dataURL: string;
  width: number;
  height: number;
};

import { renderMermaid } from "./renderers/mermaidRenderer";
import { renderVega, renderVegaLite } from "./renderers/vegaRenderer";
import { renderGraphviz } from "./renderers/graphvizRenderer";
import { renderDrawio } from "./renderers/drawioRenderer";

const encodeSvg = (svg: string) =>
  btoa(unescape(encodeURIComponent(svg)));

export const renderMarkdownToImage = async (
  markdown: string,
): Promise<MarkdownRenderResult> => {
  const mermaidMatch = markdown.match(/```mermaid\s*([\s\S]*?)```/m);
  if (mermaidMatch) {
    return renderMermaid(mermaidMatch[1].trim());
  }
  const vegaLiteMatch = markdown.match(/```vega-lite\s*([\s\S]*?)```/m);
  if (vegaLiteMatch) {
    return renderVegaLite(JSON.parse(vegaLiteMatch[1].trim()));
  }
  const vegaMatch = markdown.match(/```vega\s*([\s\S]*?)```/m);
  if (vegaMatch) {
    return renderVega(JSON.parse(vegaMatch[1].trim()));
  }
  const graphvizMatch = markdown.match(/```graphviz\s*([\s\S]*?)```/m);
  if (graphvizMatch) {
    return renderGraphviz(graphvizMatch[1].trim());
  }
  const drawioMatch = markdown.match(/```drawio\s*([\s\S]*?)```/m);
  if (drawioMatch) {
    return renderDrawio(drawioMatch[1].trim());
  }
  const width = 400;
  const height = 200;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font: 14px sans-serif;">${markdown}</div>
  </foreignObject>
</svg>`;
  const dataURL = `data:image/svg+xml;base64,${encodeSvg(svg)}`;
  return { dataURL, width, height };
};
