import React from "react";

import { MarkdownEditor } from "./MarkdownEditor";

export const MarkdownDialog = ({
  open,
  value,
  onChange,
  previewHtml,
  onClose,
}: {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  previewHtml: string;
  onClose: () => void;
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="MarkdownDialog" role="dialog" aria-modal="true">
      <button type="button" onClick={onClose}>
        Close
      </button>
      <MarkdownEditor
        value={value}
        onChange={onChange}
        previewHtml={previewHtml}
      />
    </div>
  );
};
