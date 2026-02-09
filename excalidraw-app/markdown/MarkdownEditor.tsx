import React from "react";

export const MarkdownEditor = ({
  value,
  onChange,
  previewHtml,
}: {
  value: string;
  onChange: (value: string) => void;
  previewHtml: string;
}) => {
  return (
    <div className="MarkdownEditor">
      <textarea
        aria-label="Markdown editor"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div
        className="MarkdownEditor__preview"
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />
    </div>
  );
};
