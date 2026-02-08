import React from "react";

import { Button } from "@excalidraw/excalidraw/components/Button";

import type { RecordingSessionStatus } from "./recordingAtoms";

import "./RecordingDialog.scss";

const formatTime = (elapsedMs: number) => {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export type RecordingHUDLabels = {
  pause: string;
  resume: string;
  stop: string;
};

export const RecordingHUD = ({
  status,
  elapsedMs,
  labels,
  onPause,
  onResume,
  onStop,
  micEnabled,
  cameraEnabled,
}: {
  status: RecordingSessionStatus;
  elapsedMs: number;
  labels: RecordingHUDLabels;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  micEnabled: boolean;
  cameraEnabled: boolean;
}) => {
  if (status === "idle") {
    return null;
  }

  const isPaused = status === "paused";

  return (
    <div className="RecordingHUD" role="status">
      <div className="RecordingHUD__timer">{formatTime(elapsedMs)}</div>
      <div className="RecordingHUD__controls">
        {isPaused ? (
          <Button onSelect={onResume} className="RecordingHUD__button">
            {labels.resume}
          </Button>
        ) : (
          <Button onSelect={onPause} className="RecordingHUD__button">
            {labels.pause}
          </Button>
        )}
        <Button onSelect={onStop} className="RecordingHUD__button">
          {labels.stop}
        </Button>
      </div>
      <div className="RecordingHUD__indicators" aria-hidden>
        <span
          className={
            micEnabled
              ? "RecordingHUD__indicator is-on"
              : "RecordingHUD__indicator"
          }
        >
          MIC
        </span>
        <span
          className={
            cameraEnabled
              ? "RecordingHUD__indicator is-on"
              : "RecordingHUD__indicator"
          }
        >
          CAM
        </span>
      </div>
    </div>
  );
};
