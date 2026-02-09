export type MarkdownRenderResult = {
  dataURL: string;
  width: number;
  height: number;
};

const encodeSvg = (svg: string) =>
  btoa(unescape(encodeURIComponent(svg)));

export const renderMarkdownToImage = async (
  markdown: string,
): Promise<MarkdownRenderResult> => {
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
