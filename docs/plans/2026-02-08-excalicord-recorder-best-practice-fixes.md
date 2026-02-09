# Excalicord Recorder Best-Practice Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修正录屏相关 UI 的最佳实践问题（hover/focus 可视、可访问性、文案可操作性与降动效支持），并保持现有功能与风格一致。

**Architecture:** 仅在录屏相关组件与样式中做修正；通过新增/更新单元测试来锁定可访问性与文案要求。UI 样式通过 SCSS 与局部组件调整完成。

**Tech Stack:** React + SCSS, Vitest + Testing Library, i18n JSON.

---

## Summary
- 修复 Teleprompter 的可访问性（可键盘聚焦的拖拽手柄、键盘微调、文本输入属性补全）。
- 增加 ratio/背景选择按钮的 hover + focus-visible 样式、减少动画并支持 prefers-reduced-motion。
- 统一英文录屏文案 Title Case，并让错误文案具备“下一步操作”提示（中英文）。

---

## Public APIs / Interfaces
- **无公共 API 变更**。仅 app 内部 UI 与文案调整。

---

## Task 1: Teleprompter 可访问性修正（拖拽手柄 + 文本属性）
**Files:**
- Modify: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/recording/TeleprompterOverlay.tsx`
- Modify: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/recording/RecordingDialog.scss`
- Test: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/tests/TeleprompterOverlay.test.tsx`

**Step 1: 写失败测试（新增断言）**
```tsx
import { render, screen } from "@testing-library/react";

it("renders drag handle and text attributes", () => {
  render(
    <TeleprompterOverlay
      enabled
      text=""
      opacity={1}
      speed={40}
      onTextChange={() => {}}
      onOpacityChange={() => {}}
      onSpeedChange={() => {}}
    />,
  );

  expect(
    screen.getByRole("button", { name: /move teleprompter/i }),
  ).toBeInTheDocument();

  const textarea = screen.getByRole("textbox");
  expect(textarea).toHaveAttribute("name", "teleprompterText");
  expect(textarea).toHaveAttribute("autoComplete", "off");
});
```

**Step 2: 运行测试确认失败**
Run:
`yarn test:app --watch=false excalidraw-app/tests/TeleprompterOverlay.test.tsx`
Expected: FAIL（找不到拖拽按钮/属性不匹配）

**Step 3: 最小实现**
```tsx
const HANDLE_LABEL = "Move teleprompter";
const NUDGE = 10;

const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
  let dx = 0;
  let dy = 0;
  const step = event.shiftKey ? NUDGE * 2 : NUDGE;

  if (event.key === "ArrowUp") dy = -step;
  if (event.key === "ArrowDown") dy = step;
  if (event.key === "ArrowLeft") dx = -step;
  if (event.key === "ArrowRight") dx = step;

  if (dx || dy) {
    event.preventDefault();
    setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }
};

// header 内加入拖拽手柄按钮
<button
  type="button"
  className="TeleprompterOverlay__dragHandle"
  aria-label={HANDLE_LABEL}
  onPointerDown={(event) => {
    dragState.current = {
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
    };
  }}
  onKeyDown={handleKeyDown}
>
  Move
</button>

// textarea 增加属性
<textarea
  name="teleprompterText"
  autoComplete="off"
  ...
/>
```

**Step 4: 运行测试确认通过**
Run:
`yarn test:app --watch=false excalidraw-app/tests/TeleprompterOverlay.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add /Users/test/Documents/GitHub/excalidraw/excalidraw-app/recording/TeleprompterOverlay.tsx \
        /Users/test/Documents/GitHub/excalidraw/excalidraw-app/recording/RecordingDialog.scss \
        /Users/test/Documents/GitHub/excalidraw/excalidraw-app/tests/TeleprompterOverlay.test.tsx

git commit -m "fix(recording): improve teleprompter accessibility"
```

---

## Task 2: RecordingDialog/HUD 样式最佳实践（hover + focus-visible + reduced motion）
**Files:**
- Modify: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/recording/RecordingDialog.scss`
- Test: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/tests/RecordingDialogStyles.test.ts`

**Step 1: 写失败测试（校验 SCSS 关键选择器存在）**
```ts
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("RecordingDialog styles", () => {
  it("includes hover/focus-visible + reduced-motion rules", () => {
    const scss = fs.readFileSync(
      path.resolve(__dirname, "../recording/RecordingDialog.scss"),
      "utf8",
    );

    expect(scss).toContain("&__ratioButton:hover");
    expect(scss).toContain("&__ratioButton:focus-visible");
    expect(scss).toContain("&__backgroundSwatch:hover");
    expect(scss).toContain("&__backgroundSwatch:focus-visible");
    expect(scss).toContain("prefers-reduced-motion: reduce");
    expect(scss).toContain("&__textarea:focus-visible");
    expect(scss).toContain("&__dragHandle:focus-visible");
  });
});
```

**Step 2: 运行测试确认失败**
Run:
`yarn test:app --watch=false excalidraw-app/tests/RecordingDialogStyles.test.ts`
Expected: FAIL（SCSS 里尚无这些选择器）

**Step 3: 最小实现（SCSS）**
```scss
&__ratioButton {
  transition: transform 150ms ease;

  &:hover {
    border-color: var(--color-primary);
    background: var(--color-surface-primary-container);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}

&__backgroundSwatch {
  transition: transform 150ms ease;

  &:hover {
    border-color: var(--color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  &__ratioButton,
  &__backgroundSwatch {
    transition: none;
  }
}

.TeleprompterOverlay__dragHandle {
  min-height: 32px;
  min-width: 32px;
  border-radius: var(--border-radius-md);
  border: 1px solid var(--dialog-border-color);
  background: var(--island-bg-color);
  cursor: grab;

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}

.TeleprompterOverlay__textarea {
  outline: none;

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: var(--border-radius-md);
  }
}
```

**Step 4: 运行测试确认通过**
Run:
`yarn test:app --watch=false excalidraw-app/tests/RecordingDialogStyles.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add /Users/test/Documents/GitHub/excalidraw/excalidraw-app/recording/RecordingDialog.scss \
        /Users/test/Documents/GitHub/excalidraw/excalidraw-app/tests/RecordingDialogStyles.test.ts

git commit -m "fix(recording): add hover/focus-visible and reduced-motion styles"
```

---

## Task 3: i18n 文案最佳实践（Title Case + 可操作错误提示）
**Files:**
- Modify: `/Users/test/Documents/GitHub/excalidraw/packages/excalidraw/locales/en.json`
- Modify: `/Users/test/Documents/GitHub/excalidraw/packages/excalidraw/locales/zh-CN.json`
- Test: `/Users/test/Documents/GitHub/excalidraw/excalidraw-app/tests/recordingLocales.test.ts`

**Step 1: 写失败测试**
```ts
import en from "../../packages/excalidraw/locales/en.json";
import { describe, expect, it } from "vitest";

describe("recording locales", () => {
  it("uses Title Case and actionable error copy", () => {
    expect(en.recording.start).toBe("Start Recording");
    expect(en.recording.aspectRatio).toBe("Aspect Ratio");
    expect(en.recording.cursorHighlight).toBe("Cursor Highlight");

    expect(en.recording.downloadFailed).toMatch(/try again/i);
    expect(en.recording.micPermissionDenied).toMatch(/allow|check|try/i);
  });
});
```

**Step 2: 运行测试确认失败**
Run:
`yarn test:app --watch=false excalidraw-app/tests/recordingLocales.test.ts`
Expected: FAIL

**Step 3: 最小实现（文案更新）**
```json
// en.json
"start": "Start Recording",
"aspectRatio": "Aspect Ratio",
"cursorHighlight": "Cursor Highlight",
"downloadFailed": "Recording download failed. Try again.",
"micPermissionDenied": "Microphone permission denied. Allow access and try again."
```

```json
// zh-CN.json
"downloadFailed": "录制下载失败，请重试。",
"micPermissionDenied": "麦克风权限被拒绝，请在浏览器设置中允许后重试。"
```

**Step 4: 运行测试确认通过**
Run:
`yarn test:app --watch=false excalidraw-app/tests/recordingLocales.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add /Users/test/Documents/GitHub/excalidraw/packages/excalidraw/locales/en.json \
        /Users/test/Documents/GitHub/excalidraw/packages/excalidraw/locales/zh-CN.json \
        /Users/test/Documents/GitHub/excalidraw/excalidraw-app/tests/recordingLocales.test.ts

git commit -m "fix(recording): improve recording UI copy"
```

---

## Test Cases & Scenarios
- **Unit Tests**
  - TeleprompterOverlay: drag handle 可访问性、textarea name/autocomplete。
  - RecordingDialogStyles: hover/focus-visible/reduced-motion 选择器存在。
  - recordingLocales: Title Case + 可操作错误提示。
- **Manual QA**
  - Ratio 按钮与背景色卡 hover/focus-visible 显示清晰。
  - Teleprompter 拖拽手柄可聚焦；方向键可微调位置。
  - prefers-reduced-motion 启用时无过渡动画。
  - 错误提示包含“下一步操作”文案。

---

## Assumptions & Defaults
- 范围仅限录屏相关 UI；不扩展到全应用。
- 不引入新依赖；仅新增少量测试文件。
- 录屏功能本身不变，只做 UI/文案/可访问性修正。
