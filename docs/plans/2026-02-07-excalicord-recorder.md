# Excalicord Recorder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan.

**Goal:** Add an in-app recording feature that captures only the Excalidraw canvas, with aspect ratio presets, background presets, cursor highlight, PIP camera, and a non-recorded teleprompter, exporting stable mp4/webm downloads.

**Architecture:** Build a compositor canvas that renders the Excalidraw scene via `renderStaticScene`, then overlays cursor highlight + PIP video. Use `captureStream()` + `MediaRecorder` for encoding, and `fileSave()` for reliable downloads. UI is app-only (excalidraw-app), wired through the existing top-right custom UI and `Dialog` components.

**Tech Stack:** React (excalidraw-app), Excalidraw renderer (`@excalidraw/excalidraw/renderer/staticScene`), MediaRecorder, browser-fs-access, i18n strings in `packages/excalidraw/locales`.

---

## Summary

- **Scope**: Excalidraw app only (no public package API changes).
- **Output**: Auto-select supported MIME (mp4 if supported, otherwise webm).
- **Backgrounds**: Built-in local presets + solid color (no remote URLs).
- **Recording Area**: Viewport-as-seen, letterboxed to selected ratio.
- **Audio**: Microphone only (no system audio to preserve “canvas-only” requirement).

---

## Public APIs / Interfaces

**No public API changes.**  
All new types/components are app-only. Internal app state atoms and utilities will be added under `excalidraw-app/recording/`.

---

## Key Implementation Components (Decision Complete)

### 1) Recording Settings + Persistence (App-only)
**Files:**
- Create: `excalidraw-app/recording/recordingSettings.ts`
- Test: `excalidraw-app/tests/recordingSettings.test.ts`

**Responsibilities:**
- Default settings (ratio, background category, background id, cursor highlight, camera enabled, teleprompter enabled, teleprompter text/speed/opacity, PIP position/size).
- Load/save to `localStorage` with versioned schema.
- Sanitization for missing/invalid fields.

**TDD Steps:**
1. Write tests for default settings and round-trip persistence.
2. Run tests (expect failure).
3. Implement `getRecordingSettings()` / `saveRecordingSettings()`.
4. Re-run tests (expect pass).

---

### 2) MIME + Export Helpers
**Files:**
- Create: `excalidraw-app/recording/recordingFormats.ts`
- Test: `excalidraw-app/tests/recordingFormats.test.ts`

**Responsibilities:**
- `getSupportedMimeType(isTypeSupported = MediaRecorder.isTypeSupported)` returns best supported MIME (prefer `video/mp4;codecs=avc1,mp4a` if supported; else `video/webm;codecs=vp9,opus`, fallback to `video/webm`).
- `getFileExtension(mime)` returns `mp4` or `webm`.
- Allow injection for tests (pure, deterministic).

**TDD Steps:**
1. Tests for preferred ordering and fallback behavior.
2. Run tests → fail.
3. Implement minimal logic → pass.

---

### 3) Compositor Math Helpers
**Files:**
- Create: `excalidraw-app/recording/recordingLayout.ts`
- Test: `excalidraw-app/tests/recordingLayout.test.ts`

**Responsibilities:**
- `computeOutputSize(viewW, viewH, ratio, maxLongEdge = 1080)` → output canvas size.
- `computeFitRect(srcW, srcH, dstW, dstH)` → scale + offset for letterboxing.
- `normalizePipRect()` for storing PIP as normalized coords.

**TDD Steps:**
1. Write tests for ratios (16:9, 9:16, 1:1).
2. Implement functions.

---

### 4) Recorder Controller (Compositor + MediaRecorder)
**Files:**
- Create: `excalidraw-app/recording/RecorderController.ts`
- Test (state-machine only): `excalidraw-app/tests/RecorderController.test.ts`

**Responsibilities:**
- Create `sceneCanvas` (viewport size) + `compositeCanvas` (output size).
- Render Excalidraw scene via:
  - `renderStaticScene` from `@excalidraw/excalidraw/renderer/staticScene`
  - `isElementInViewport` + `arrayToMap` to compute `visibleElements` and `elementsMap`
  - `updateImageCache` + `getInitializedImageElements` to ensure image rendering
  - `Fonts.loadElementsFonts(elements)` once on start
- Composite background, scene, cursor highlight, PIP video each frame.
- Use `compositeCanvas.captureStream(fps)` (30fps default; drop to 15 on low performance).
- Use `MediaRecorder` with MIME from `recordingFormats.ts`.
- Accumulate chunks, return Blob on stop.
- Provide `start()`, `pause()`, `resume()`, `stop()`; guard against invalid state transitions.
- Use `fileSave(blob, { name, extension, description })` for stable downloads.

**TDD Steps:**
1. Write tests for state transitions using a stubbed MediaRecorder.
2. Implement state machine + minimal functionality to satisfy tests.
3. Add rendering and stream logic (no direct tests; covered via smoke/manual).

---

### 5) Recording UI + Teleprompter
**Files:**
- Create: `excalidraw-app/recording/RecordingDialog.tsx`
- Create: `excalidraw-app/recording/RecordingHUD.tsx`
- Create: `excalidraw-app/recording/TeleprompterOverlay.tsx`
- Create: `excalidraw-app/recording/recordingAtoms.ts`
- Styles: `excalidraw-app/recording/RecordingDialog.scss`

**Responsibilities:**
- `RecordingDialog`: aspect ratio presets, background selector, toggles (cursor highlight, camera, teleprompter), start recording.
- `RecordingHUD`: during recording (timer, pause/resume, stop, mic/cam indicators).
- `TeleprompterOverlay`: resizable, draggable, adjustable speed/opacity; never drawn on composite canvas.
- All controls: accessible labels, keyboard focus, min 44px hit areas.

**UX Guidelines (ui-ux-pro-max):**
- Visible focus rings, no emoji icons, consistent icon sizes, minimal transitions (150–300ms).

---

### 6) App Wiring
**Files:**
- Modify: `excalidraw-app/App.tsx`
- Modify: `excalidraw-app/index.scss` (if needed)

**Responsibilities:**
- Add “Record” button to top-right UI (within `renderTopRightUI`), using existing button components.
- Mount `RecordingDialog`, `RecordingHUD`, `TeleprompterOverlay`.
- Pass `excalidrawAPI` to `RecorderController`.
- Clean up controller on unmount or dialog close.
- Persist settings to localStorage on change.

---

### 7) Background Presets (Local Assets)
**Files:**
- Add images: `public/recording/backgrounds/*`
- Add manifest: `excalidraw-app/recording/backgrounds.ts`

**Responsibilities:**
- Categories: Vibrant, Pastel, Dark, Nature.
- Use local asset URLs to avoid CORS and canvas tainting.

---

### 8) i18n Strings
**Files:**
- Modify: `packages/excalidraw/locales/en.json`
- Modify: `packages/excalidraw/locales/zh-CN.json`

**Add keys:**
- `recording.title`, `recording.start`, `recording.stop`, `recording.pause`, `recording.resume`
- `recording.aspectRatio`, `recording.background`, `recording.cursorHighlight`, `recording.camera`, `recording.teleprompter`
- `recording.formatAuto`, `recording.downloadFailed`, `recording.micPermissionDenied`

---

## Test Cases & Scenarios

**Unit/Logic Tests**
- `recordingSettings`: default values, persistence, invalid input handling.
- `recordingFormats`: MIME preference and fallback.
- `recordingLayout`: ratio computation and letterboxing.
- `RecorderController`: state transitions (start → pause → resume → stop), no invalid transitions.

**Manual/QA Scenarios**
- Start recording with each aspect ratio; verify output is letterboxed and contains only canvas.
- Teleprompter visible during recording, but not in output.
- PIP camera drag/resize; output reflects position.
- Background presets appear and are applied without tainting.
- Safari/Edge/Firefox download via `fileSave` works.
- Permissions denied → user sees clear error and can retry.

---

## Verification Commands

- `yarn test:app --watch=false excalidraw-app/tests/recordingSettings.test.ts`
- `yarn test:app --watch=false excalidraw-app/tests/recordingFormats.test.ts`
- `yarn test:app --watch=false excalidraw-app/tests/recordingLayout.test.ts`
- `yarn test:app --watch=false excalidraw-app/tests/RecorderController.test.ts`

---

## Assumptions & Defaults

- **Audio**: microphone only (no system audio to preserve “canvas-only” requirement).
- **Recording area**: current viewport as seen, letterboxed to chosen ratio.
- **Output size**: longest edge capped at 1080 to control CPU/bandwidth.
- **Backgrounds**: built-in only (no remote URLs).
- **Teleprompter**: DOM overlay; never part of recorded frames.
