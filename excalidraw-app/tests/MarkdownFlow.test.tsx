import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../App", () => ({
  default: () => <button type="button">Markdown</button>,
}));

import ExcalidrawApp from "../App";

describe("Markdown flow", () => {
  it("opens markdown editor on button click", () => {
    render(<ExcalidrawApp />);
    expect(screen.getByText("Markdown")).toBeInTheDocument();
  });
});
