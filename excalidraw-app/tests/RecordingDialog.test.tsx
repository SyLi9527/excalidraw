import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_RECORDING_SETTINGS } from "../recording/recordingSettings";
import { RecordingDialog } from "../recording/RecordingDialog";

vi.mock("@excalidraw/excalidraw/components/Dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const labels = {
  title: "Record",
  start: "Start",
  aspectRatio: "Aspect ratio",
  background: "Background",
  cursorHighlight: "Cursor highlight",
  camera: "Camera",
  teleprompter: "Teleprompter",
};

describe("RecordingDialog", () => {
  it("updates aspect ratio selection", () => {
    const onSettingsChange = vi.fn();

    render(
      <RecordingDialog
        isOpen
        settings={DEFAULT_RECORDING_SETTINGS}
        backgrounds={[]}
        labels={labels}
        onClose={vi.fn()}
        onSettingsChange={onSettingsChange}
        onStart={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "9:16" }));

    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ aspectRatio: "9:16" }),
    );
  });
});
