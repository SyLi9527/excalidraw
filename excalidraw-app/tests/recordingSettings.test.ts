import {
  DEFAULT_RECORDING_SETTINGS,
  getRecordingSettings,
  saveRecordingSettings,
  STORAGE_KEY_RECORDING_SETTINGS,
} from "../recording/recordingSettings";

describe("recordingSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when no settings are stored", () => {
    expect(getRecordingSettings()).toEqual(DEFAULT_RECORDING_SETTINGS);
  });

  it("round-trips saved settings", () => {
    const updated = {
      ...DEFAULT_RECORDING_SETTINGS,
      aspectRatio: "9:16" as const,
      cameraEnabled: false,
      teleprompterText: "Hello",
      pip: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
    };

    saveRecordingSettings(updated);

    expect(getRecordingSettings()).toEqual(updated);
  });

  it("sanitizes invalid fields while preserving valid ones", () => {
    localStorage.setItem(
      STORAGE_KEY_RECORDING_SETTINGS,
      JSON.stringify({
        version: DEFAULT_RECORDING_SETTINGS.version,
        aspectRatio: "1:1",
        background: { category: "solid", id: "white" },
        cursorHighlight: "yes",
        cameraEnabled: false,
        teleprompterEnabled: true,
        teleprompterText: "Script",
        teleprompterSpeed: -5,
        teleprompterOpacity: 2,
        pip: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
      }),
    );

    const result = getRecordingSettings();

    expect(result.aspectRatio).toBe("1:1");
    expect(result.cameraEnabled).toBe(false);
    expect(result.cursorHighlight).toBe(
      DEFAULT_RECORDING_SETTINGS.cursorHighlight,
    );
    expect(result.teleprompterSpeed).toBe(
      DEFAULT_RECORDING_SETTINGS.teleprompterSpeed,
    );
    expect(result.teleprompterOpacity).toBe(
      DEFAULT_RECORDING_SETTINGS.teleprompterOpacity,
    );
    expect(result.pip).toEqual({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 });
  });
});
