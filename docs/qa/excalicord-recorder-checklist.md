# Excalicord Recorder QA Checklist

Date: 2026-02-08

## Setup
- [ ] Desktop app (not mobile) loaded on https://excalidraw.com
- [ ] Microphone available (and optional camera if testing PIP)
- [ ] Sample scene with shapes, text, and at least one image

## Core Recording Flow
- [ ] Click Record button (top right) opens recorder dialog
- [ ] Start recording begins HUD timer and controls
- [ ] Microphone audio is present and in sync
- [ ] Pause stops timer increment and resumes correctly
- [ ] Stop prompts file save and produces a playable file

## Canvas-Only Capture
- [ ] Recording includes only the Excalidraw canvas content
- [ ] Browser UI (tabs, URL bar, menus) is not present in the video
- [ ] Teleprompter overlay is visible on screen but NOT in the export

## Aspect Ratios
- [ ] 16:9 output is letterboxed correctly
- [ ] 9:16 output is letterboxed correctly
- [ ] 1:1 output is letterboxed correctly

## Background Presets
- [ ] Solid white and dark render correctly
- [ ] Vibrant, Pastel, Dark, Nature backgrounds render correctly
- [ ] Backgrounds do not appear tainted (no canvas security errors)

## Cursor Highlight + PIP
- [ ] Cursor highlight appears when enabled and follows pointer
- [ ] Cursor highlight is absent when disabled
- [ ] Camera PIP appears when camera enabled and a stream is available
- [ ] Camera PIP is absent when camera disabled

## Export Format
- [ ] If mp4 is supported, the saved file is .mp4
- [ ] If mp4 is unsupported, the saved file is .webm

## Permissions + Errors
- [ ] Denying microphone permission shows an error message
- [ ] Denying camera permission still allows recording without PIP
- [ ] Canceling file save does not show an error message

## Browser Coverage (if available)
- [ ] Chrome (or Chromium) passes core flow
- [ ] Safari passes core flow

## Regression Spot Checks
- [ ] Share/Collaboration UI still works
- [ ] Main menu and other top-right actions still render correctly
