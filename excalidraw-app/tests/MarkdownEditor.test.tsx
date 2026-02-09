import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarkdownEditor } from "../markdown/MarkdownEditor";

describe("MarkdownEditor", () => {
  it("renders editor and preview", () => {
    render(
      <MarkdownEditor
        value="# Title"
        onChange={() => {}}
        previewHtml="<h1>Title</h1>"
      />,
    );

    expect(screen.getByRole("textbox")).toHaveAttribute(
      "aria-label",
      "Markdown editor",
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
  });
});
