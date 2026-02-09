# Excalidraw Markdown Mixed Rendering Plan

## Goal
Add a mixed Markdown experience to Excalidraw: edit Markdown in a side panel/dialog, render results on the canvas as an image-backed element. Support the same extension surface as markdown-viewer-extension (Mermaid, Vega/Vega-Lite, Graphviz, draw.io, KaTeX, code highlighting), with local-only rendering and strong performance safeguards.

## Scope
### In scope
- Markdown editing in a side panel/dialog (not on-canvas text editing).
- Canvas element renders cached image produced from Markdown.
- Local-only rendering (no backend services).
- Extension support: Mermaid, Vega/Vega-Lite, Graphviz DOT, draw.io, KaTeX, code highlighting.
- XSS-safe HTML rendering and actionable error states.
- Debounced, cancellable rendering with caching.

### Out of scope (phase 1)
- Word export.
- High-fidelity SVG export of Markdown content.
- Multi-user collaborative editing of Markdown documents.

## Reference Architecture (from markdown-viewer-extension)
Key patterns to reuse:
- Unified markdown pipeline with remark/rehype and plugin registration.
- Async task manager with abort to prevent stale render overwrites.
- Renderer registry with a base renderer class (create container, render to SVG/canvas, return bitmap).
- Render worker bootstrap with message-based rendering and theme config.

## Architecture Overview
### Layers
1) **Editor layer**: Side panel/dialog for Markdown input and live preview.
2) **Render layer**: Unified pipeline that outputs a bitmap (data URL or ImageBitmap).
3) **Canvas layer**: New Markdown element renders the cached bitmap only.

### Data Flow
1. User edits Markdown (debounced 150-300ms).
2. Renderer pipeline parses Markdown, runs plugins, sanitizes HTML.
3. Diagrams render via dedicated renderers (Mermaid/Vega/Graphviz/draw.io) and produce bitmaps.
4. Cached bitmap stored in Markdown element; canvas redraws.
5. If render fails, keep prior bitmap and show actionable error in editor preview.

### Cancellation + Caching
- Each render cycle aborts previous tasks to avoid race conditions.
- Cache key = hash(markdown + options + theme). Use LRU to reduce re-renders.
- Two-pass render: low-res while typing, high-res after idle.

## Components and Code Locations
### New UI
- `excalidraw-app/markdown/MarkdownEditor.tsx` (editor + preview)
- `excalidraw-app/markdown/MarkdownDialog.tsx` (modal wrapper)

### Rendering
- `excalidraw-app/markdown/MarkdownRenderer.ts`
- `excalidraw-app/markdown/renderers/`
  - `mermaidRenderer.ts`
  - `vegaRenderer.ts`
  - `graphvizRenderer.ts`
  - `drawioRenderer.ts`
  - `katexRenderer.ts`
  - `codeRenderer.ts`

### Element model
- `packages/excalidraw/element/MarkdownElement` (new element type)
- Serialization/deserialization additions in `packages/excalidraw/data/`
- Rendering hook in `packages/excalidraw/renderer/` to draw bitmap

### State
- `markdownDialogStateAtom`, `markdownSettingsAtom`
- Mapping from element id -> cached render metadata

## Dependency Choices
- Markdown pipeline: `remark-parse`, `remark-gfm`, `remark-math`, `remark-rehype`, `rehype-stringify`
- KaTeX: `rehype-katex`
- Code highlighting: `rehype-highlight`
- Mermaid: `mermaid`
- Graphviz: `viz.js` (WASM)
- Vega/Vega-Lite: `vega-embed`
- draw.io: `@markdown-viewer/drawio2svg` (or equivalent local converter)
- Sanitization: `DOMPurify`

All heavy deps must be lazy-loaded on first use.

## UX Requirements
- Side panel/dialog for editing, with preview.
- Canvas shows rendered bitmap only.
- Double-click on Markdown element opens editor.
- Error messages include next-step guidance.
- Respect `prefers-reduced-motion`.
- Focus-visible styles for all interactive controls.

## Test Plan
### Unit tests
- Renderer pipeline output for core Markdown.
- KaTeX and code highlighting outputs.
- Diagram renderers return bitmap for valid input.
- Sanitization removes dangerous HTML.

### Integration tests
- Create Markdown element -> edit -> canvas updates.
- Rapid edits -> old render tasks cancelled.
- Render failure keeps old bitmap and shows error in editor.

### Performance tests
- 10k-20k chars input stays responsive.
- Large diagram does not block canvas interaction.

## Risks and Mitigations
- **Bundle size**: dynamic import everything beyond core Markdown.
- **Render jank**: use Worker/iframe for heavy diagram rendering.
- **Inconsistent render**: lock theme + fonts across preview and canvas.
- **Security**: sanitize HTML and block unsafe URL protocols.

## Milestones
1) **M1 (1-2 weeks)**: Core Markdown + KaTeX + code highlighting + canvas bitmap render.
2) **M2 (2-3 weeks)**: Mermaid + Vega/Vega-Lite + Graphviz with worker rendering.
3) **M3 (2-4 weeks)**: draw.io support + export enhancements.

## Open Questions
- Which editor UX: side panel vs modal default?
- Maximum allowed bitmap size for performance?
- Should rendered bitmap be persisted in file or regenerated on load?
