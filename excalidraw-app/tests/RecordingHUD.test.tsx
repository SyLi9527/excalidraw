import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RecordingHUD } from "../recording/RecordingHUD";

const labels = {
  pause: "Pause",
  resume: "Resume",
  stop: "Stop",
};

describe("RecordingHUD", () => {
  it("renders formatted time and pause controls", () => {
    render(
      <RecordingHUD
        status="recording"
        elapsedMs={65000}
        labels={labels}
        onPause={() => {}}
        onResume={() => {}}
        onStop={() => {}}
        micEnabled
        cameraEnabled
      />,
    );

    expect(screen.getByText("01:05")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });

  it("renders resume control when paused", () => {
    render(
      <RecordingHUD
        status="paused"
        elapsedMs={0}
        labels={labels}
        onPause={() => {}}
        onResume={() => {}}
        onStop={() => {}}
        micEnabled
        cameraEnabled
      />,
    );

    expect(
      screen.getByRole("button", { name: "Resume" }),
    ).toBeInTheDocument();
  });
});
