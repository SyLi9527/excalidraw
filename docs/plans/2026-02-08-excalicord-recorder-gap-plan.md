# Excalicord Recorder Gap Closure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the feature gaps between the current app-only Excalicord recorder and the features shown in the two reference videos (Day 1 + Day 2).

**Architecture:** Extend the recorder settings model, add richer settings UI (ratios, backgrounds, padding, cursor color, camera sizing), add compositor support (rounded canvas card, padding, cursor color, watermark), and enhance teleprompter controls (play/pause + opacity). Keep recording canvas-only using compositor canvas and MediaRecorder.

**Tech Stack:** React (excalidraw-app), Jotai (app store), Excalidraw static renderer, MediaRecorder, browser-fs-access, CSS/Sass.

---

## Task 1: Extend recording settings schema (ratios, padding, cursor color, PIP size)

**Files:**
- Modify: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/recording/recordingSettings.ts`
- Test: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/tests/recordingSettings.test.ts`

**Step 1: Write the failing test**

```ts
it("persists new settings fields", () => {
  const updated = {
    ...DEFAULT_RECORDING_SETTINGS,
    aspectRatio: "3:4" as const,
    customSize: { width: 1080, height: 1440 },
    canvasPadding: 80,
    cornerRadius: 16,
    cursorHighlightColor: "#FF4D4F",
    pipSize: 180,
  };

  saveRecordingSettings(updated as any);
  expect(getRecordingSettings()).toMatchObject({
    aspectRatio: "3:4",
    customSize: { width: 1080, height: 1440 },
    canvasPadding: 80,
    cornerRadius: 16,
    cursorHighlightColor: "#FF4D4F",
    pipSize: 180,
  });
});
```

**Step 2: Run test to verify it fails**

Run: `yarn test:app --watch=false excalidraw-app/tests/recordingSettings.test.ts`
Expected: FAIL with missing fields in settings.

**Step 3: Write minimal implementation**

Add to `RecordingSettings` and defaults:
```ts
export type RecordingAspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "custom";
customSize: { width: number; height: number } | null;
canvasPadding: number;
cornerRadius: number;
cursorHighlightColor: string;
pipSize: number; // px
```
Add sanitizers for new fields with bounds (padding 0-200, cornerRadius 0-32, pipSize 120-280, customSize 240-2160).

**Step 4: Run test to verify it passes**

Run: `yarn test:app --watch=false excalidraw-app/tests/recordingSettings.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add excalidraw-app/recording/recordingSettings.ts excalidraw-app/tests/recordingSettings.test.ts
git commit -m "feat(recording): extend settings schema"
```

---

## Task 2: Add layout helpers for padding + rounded canvas card

**Files:**
- Modify: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/recording/recordingLayout.ts`
- Test: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/tests/recordingLayout.test.ts`

**Step 1: Write the failing test**

```ts
it("computes padded inner rect", () => {
  expect(computeInnerRect({ width: 1000, height: 1000 }, 80)).toEqual({
    x: 80,
    y: 80,
    width: 840,
    height: 840,
  });
});
```

**Step 2: Run test to verify it fails**

Run: `yarn test:app --watch=false excalidraw-app/tests/recordingLayout.test.ts`
Expected: FAIL (function missing)

**Step 3: Write minimal implementation**

```ts
export const computeInnerRect = (size: CanvasSize, padding: number) => ({
  x: padding,
  y: padding,
  width: Math.max(0, size.width - padding * 2),
  height: Math.max(0, size.height - padding * 2),
});
```

**Step 4: Run test to verify it passes**

Run: `yarn test:app --watch=false excalidraw-app/tests/recordingLayout.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add excalidraw-app/recording/recordingLayout.ts excalidraw-app/tests/recordingLayout.test.ts
git commit -m "feat(recording): add padding helpers"
```

---

## Task 3: Background categories, tabs, and random selection

**Files:**
- Modify: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/recording/backgrounds.ts`
- Test: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/tests/recordingBackgrounds.test.ts`

**Step 1: Write the failing test**

```ts
import { getBackgroundsByCategory, pickRandomBackground } from "../recording/backgrounds";

it("filters backgrounds by category", () => {
  const all = getBackgroundsByCategory("all");
  const pastel = getBackgroundsByCategory("pastel");
  expect(all.length).toBeGreaterThan(pastel.length);
  expect(pastel.every((bg) => bg.category === "pastel")).toBe(true);
});

it("picks random background deterministically with injected rng", () => {
  const bg = pickRandomBackground("all", () => 0);
  expect(bg).not.toBeNull();
});
```

**Step 2: Run test to verify it fails**

Run: `yarn test:app --watch=false excalidraw-app/tests/recordingBackgrounds.test.ts`
Expected: FAIL (functions missing)

**Step 3: Write minimal implementation**

- Flatten backgrounds to list with `category` field.
- Implement:
```ts
export const getBackgroundsByCategory = (category: "all" | string) =>
  category === "all"
    ? flatBackgrounds
    : flatBackgrounds.filter((bg) => bg.category === category);

export const pickRandomBackground = (category: string, rng = Math.random) => {
  const list = getBackgroundsByCategory(category);
  if (!list.length) return null;
  return list[Math.floor(rng() * list.length)];
};
```

**Step 4: Run test to verify it passes**

Run: `yarn test:app --watch=false excalidraw-app/tests/recordingBackgrounds.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add excalidraw-app/recording/backgrounds.ts excalidraw-app/tests/recordingBackgrounds.test.ts
git commit -m "feat(recording): background tabs and random selection"
```

---

## Task 4: Update Recording Dialog UI to match video

**Files:**
- Modify: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/recording/RecordingDialog.tsx`
- Modify: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/recording/RecordingDialog.scss`
- Test: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/tests/RecordingDialog.test.tsx`

**Step 1: Write the failing test**

```ts
it("updates cursor color", () => {
  const onSettingsChange = vi.fn();
  render(<RecordingDialog ... />);
  fireEvent.click(screen.getByRole("button", { name: "Cursor color red" }));
  expect(onSettingsChange).toHaveBeenCalledWith(
    expect.objectContaining({ cursorHighlightColor: "#FF4D4F" }),
  );
});
```

**Step 2: Run test to verify it fails**

Run: `yarn test:app --watch=false excalidraw-app/tests/RecordingDialog.test.tsx`
Expected: FAIL (UI missing)

**Step 3: Write minimal implementation**

Add:
- Aspect ratio buttons: 16:9, 4:3, 3:4, 9:16, 1:1, Custom
- Custom size inputs (width/height)
- Background category tabs (All/Vibrant/Pastel/Dark/Nature)
- Random wallpaper button
- Corner radius slider (0-32)
- Canvas padding slider (0-200)
- Camera toggle + size slider (120-280)
- Cursor highlight toggle + color palette buttons

**Step 4: Run test to verify it passes**

Run: `yarn test:app --watch=false excalidraw-app/tests/RecordingDialog.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add excalidraw-app/recording/RecordingDialog.tsx excalidraw-app/recording/RecordingDialog.scss excalidraw-app/tests/RecordingDialog.test.tsx
git commit -m "feat(recording): expand settings dialog"
```

---

## Task 5: Teleprompter play/pause + background-only opacity

**Files:**
- Modify: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/recording/TeleprompterOverlay.tsx`
- Modify: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/recording/RecordingDialog.scss`
- Test: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/tests/TeleprompterOverlay.test.tsx`

**Step 1: Write the failing test**

```ts
it("toggles play/pause", () => {
  const { getByRole } = render(<TeleprompterOverlay ... />);
  fireEvent.click(getByRole("button", { name: "Pause" }));
  expect(getByRole("button", { name: "Play" })).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `yarn test:app --watch=false excalidraw-app/tests/TeleprompterOverlay.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

- Add `isScrolling` state and play/pause button
- Only advance scroll when `isScrolling` is true
- Apply opacity to background layer only (separate `::before` or inner div)

**Step 4: Run test to verify it passes**

Run: `yarn test:app --watch=false excalidraw-app/tests/TeleprompterOverlay.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add excalidraw-app/recording/TeleprompterOverlay.tsx excalidraw-app/recording/RecordingDialog.scss excalidraw-app/tests/TeleprompterOverlay.test.tsx
git commit -m "feat(recording): teleprompter play/pause"
```

---

## Task 6: Compositor updates (padding, radius, cursor color, circle PIP, watermark)

**Files:**
- Modify: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/recording/RecorderController.ts`
- Test: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/tests/RecorderController.test.ts`

**Step 1: Write the failing test**

```ts
it("accepts cursor color from settings", async () => {
  const controller = new RecorderController({
    mimeType: "video/webm",
    getStream: () => ({}) as MediaStream,
    getSettings: () => ({ cursorHighlightColor: "#FF4D4F" } as any),
    createMediaRecorder: () => new StubMediaRecorder() as any,
  });
  await controller.start();
  expect(controller.getState()).toBe("recording");
});
```

**Step 2: Run test to verify it fails**

Run: `yarn test:app --watch=false excalidraw-app/tests/RecorderController.test.ts`
Expected: FAIL if required settings not used

**Step 3: Write minimal implementation**

- Apply `canvasPadding` to compute inner rect
- Clip scene to rounded rect using `cornerRadius`
- Draw cursor highlight using `cursorHighlightColor`
- Draw camera PIP as circle (clip to circle) with size from `pipSize`
- Add optional watermark text in bottom-right

**Step 4: Run test to verify it passes**

Run: `yarn test:app --watch=false excalidraw-app/tests/RecorderController.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add excalidraw-app/recording/RecorderController.ts excalidraw-app/tests/RecorderController.test.ts
git commit -m "feat(recording): compositor padding and watermark"
```

---

## Task 7: i18n additions

**Files:**
- Modify: `/Users/test/Documents/GitHub/excalidraw/packages/excalidraw/locales/en.json`
- Modify: `/Users/test/Documents/GitHub/excalidraw/packages/excalidraw/locales/zh-CN.json`

**Step 1: Add new keys**

Add keys for: `recording.customSize`, `recording.cornerRadius`, `recording.canvasPadding`, `recording.cursorColor`, `recording.randomBackground`, `recording.cameraSize`, `recording.watermark`, `recording.account`.

**Step 2: Run i18n check (if any)**

Run: `yarn lint` (skip if not used in project)

**Step 3: Commit**

```bash
git add packages/excalidraw/locales/en.json packages/excalidraw/locales/zh-CN.json
git commit -m "feat(i18n): add recorder setting labels"
```

---

## Verification

Run:
```
yarn test:app --watch=false \
  excalidraw-app/tests/recordingSettings.test.ts \
  excalidraw-app/tests/recordingLayout.test.ts \
  excalidraw-app/tests/recordingBackgrounds.test.ts \
  excalidraw-app/tests/RecordingDialog.test.tsx \
  excalidraw-app/tests/TeleprompterOverlay.test.tsx \
  excalidraw-app/tests/RecorderController.test.ts
```

---

Plan complete and saved. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
