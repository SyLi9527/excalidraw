export const STORAGE_KEY_RECORDING_SETTINGS = "excalidraw-recording-settings";

const RECORDING_SETTINGS_VERSION = 1;

export type RecordingAspectRatio = "16:9" | "9:16" | "1:1";

export type RecordingBackground = {
  category: string;
  id: string;
};

export type RecordingPipRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RecordingSettings = {
  version: number;
  aspectRatio: RecordingAspectRatio;
  background: RecordingBackground;
  cursorHighlight: boolean;
  cameraEnabled: boolean;
  teleprompterEnabled: boolean;
  teleprompterText: string;
  teleprompterSpeed: number;
  teleprompterOpacity: number;
  pip: RecordingPipRect;
};

export const DEFAULT_RECORDING_SETTINGS: RecordingSettings = {
  version: RECORDING_SETTINGS_VERSION,
  aspectRatio: "16:9",
  background: { category: "solid", id: "white" },
  cursorHighlight: true,
  cameraEnabled: true,
  teleprompterEnabled: false,
  teleprompterText: "",
  teleprompterSpeed: 40,
  teleprompterOpacity: 0.85,
  pip: { x: 0.7, y: 0.7, width: 0.25, height: 0.25 },
};

const getDefaultRecordingSettings = (): RecordingSettings => ({
  ...DEFAULT_RECORDING_SETTINGS,
  background: { ...DEFAULT_RECORDING_SETTINGS.background },
  pip: { ...DEFAULT_RECORDING_SETTINGS.pip },
});

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isAspectRatio = (value: unknown): value is RecordingAspectRatio =>
  value === "16:9" || value === "9:16" || value === "1:1";

const isPipRect = (value: unknown): value is RecordingPipRect => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const rect = value as RecordingPipRect;
  return (
    isNumber(rect.x) &&
    isNumber(rect.y) &&
    isNumber(rect.width) &&
    isNumber(rect.height) &&
    rect.x >= 0 &&
    rect.x <= 1 &&
    rect.y >= 0 &&
    rect.y <= 1 &&
    rect.width > 0 &&
    rect.width <= 1 &&
    rect.height > 0 &&
    rect.height <= 1
  );
};

const sanitizeRecordingSettings = (raw: unknown): RecordingSettings => {
  const defaults = getDefaultRecordingSettings();
  if (!raw || typeof raw !== "object") {
    return defaults;
  }

  const data = raw as Partial<RecordingSettings> & { version?: number };
  if (data.version !== RECORDING_SETTINGS_VERSION) {
    return defaults;
  }

  const aspectRatio = isAspectRatio(data.aspectRatio)
    ? data.aspectRatio
    : defaults.aspectRatio;

  const background =
    data.background &&
    typeof data.background === "object" &&
    typeof (data.background as RecordingBackground).category === "string" &&
    typeof (data.background as RecordingBackground).id === "string"
      ? {
          category: (data.background as RecordingBackground).category,
          id: (data.background as RecordingBackground).id,
        }
      : defaults.background;

  const cursorHighlight =
    typeof data.cursorHighlight === "boolean"
      ? data.cursorHighlight
      : defaults.cursorHighlight;

  const cameraEnabled =
    typeof data.cameraEnabled === "boolean"
      ? data.cameraEnabled
      : defaults.cameraEnabled;

  const teleprompterEnabled =
    typeof data.teleprompterEnabled === "boolean"
      ? data.teleprompterEnabled
      : defaults.teleprompterEnabled;

  const teleprompterText =
    typeof data.teleprompterText === "string"
      ? data.teleprompterText
      : defaults.teleprompterText;

  const teleprompterSpeed =
    isNumber(data.teleprompterSpeed) &&
    data.teleprompterSpeed > 0 &&
    data.teleprompterSpeed <= 200
      ? data.teleprompterSpeed
      : defaults.teleprompterSpeed;

  const teleprompterOpacity =
    isNumber(data.teleprompterOpacity) &&
    data.teleprompterOpacity >= 0.1 &&
    data.teleprompterOpacity <= 1
      ? data.teleprompterOpacity
      : defaults.teleprompterOpacity;

  const pip = isPipRect(data.pip) ? data.pip : defaults.pip;

  return {
    version: RECORDING_SETTINGS_VERSION,
    aspectRatio,
    background,
    cursorHighlight,
    cameraEnabled,
    teleprompterEnabled,
    teleprompterText,
    teleprompterSpeed,
    teleprompterOpacity,
    pip,
  };
};

export const getRecordingSettings = (): RecordingSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_RECORDING_SETTINGS);
    if (!stored) {
      return getDefaultRecordingSettings();
    }
    return sanitizeRecordingSettings(JSON.parse(stored));
  } catch (error: any) {
    console.error(error);
    return getDefaultRecordingSettings();
  }
};

export const saveRecordingSettings = (settings: RecordingSettings) => {
  try {
    const payload: RecordingSettings = {
      ...settings,
      version: RECORDING_SETTINGS_VERSION,
    };
    localStorage.setItem(
      STORAGE_KEY_RECORDING_SETTINGS,
      JSON.stringify(payload),
    );
  } catch (error: any) {
    console.error(error);
  }
};
