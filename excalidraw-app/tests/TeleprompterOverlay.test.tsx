import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TeleprompterOverlay } from "../recording/TeleprompterOverlay";

describe("TeleprompterOverlay", () => {
  it("renders nothing when disabled", () => {
    const { container } = render(
      <TeleprompterOverlay
        enabled={false}
        text=""
        opacity={1}
        speed={40}
        onTextChange={() => {}}
        onOpacityChange={() => {}}
        onSpeedChange={() => {}}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("updates text when edited", () => {
    const onTextChange = vi.fn();

    render(
      <TeleprompterOverlay
        enabled
        text="Hello"
        opacity={1}
        speed={40}
        onTextChange={onTextChange}
        onOpacityChange={() => {}}
        onSpeedChange={() => {}}
      />,
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Updated" } });

    expect(onTextChange).toHaveBeenCalledWith("Updated");
  });
});
