import { atom } from "../app-jotai";

import {
  getRecordingSettings,
  type RecordingSettings,
} from "./recordingSettings";

export const recordingDialogStateAtom = atom({ isOpen: false });

export const recordingSettingsAtom = atom<RecordingSettings>(
  getRecordingSettings(),
);

export type RecordingSessionStatus = "idle" | "recording" | "paused";

export type RecordingSessionState = {
  status: RecordingSessionStatus;
  startedAt: number | null;
  elapsedMs: number;
};

export const recordingSessionAtom = atom<RecordingSessionState>({
  status: "idle",
  startedAt: null,
  elapsedMs: 0,
});
