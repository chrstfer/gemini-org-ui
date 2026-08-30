# Gemini Org-Mode & Full-Width Firefox WebExtension

A high-density widescreen layout modification and authentic in-page Org-mode renderer for **Google Gemini (`gemini.google.com`)**, built with clean modular TypeScript and zero runtime dependencies.

---

## Key Features

- **Modular TypeScript Architecture**: Strictly typed AST block parser and token-safe inline lexer.
- **Dynamic Streaming Support**: Real-time mutation observer dynamically re-renders active Org views as Gemini streams tokens chunk-by-chunk without freezing or flickering.
- **Hierarchical Outline Tree & Subtree Folding**: Clicking any heading level ($L$) smoothly folds its content and all nested child subheadings ($> L$).
- **Widescreen Utilization**: Eliminates artificial ~768px constraints while preserving natural user prompt bubble proportions.
- **Authentic Org-Mode Styling**:
  - Headings 1 through 6 with color hierarchy and fold indicators (`▼` / `▶`).
  - Metadata banners (`#+TITLE:`, `#+AUTHOR:`, `#+DATE:`, `#+OPTIONS:`).
  - Status chips (`TODO`, `DONE`, `WAITING`, `NEXT`, `IN-PROGRESS`, `CANCELLED`, `HOLD`, `PROJECT`).
  - Priority badges (`[#A]`, `[#B]`, `[#C]`).
  - Right-aligned tag badges (`:TAG1:TAG2:`).
  - Collapsible Property Drawers (`:PROPERTIES:`, `:LOGBOOK:`, `:END:`).
  - Formatted data tables with header separation and numeric column alignment.
  - Interactive checkboxes (`- [ ]`, `- [X]`, `- [-]`) with live progress cookie recalculation (`[2/5]`).
  - Source blocks (`#+BEGIN_SRC [lang]`) with language chip and copy snippet button.
- **Floating HUD & Controls**:
  - `Alt + W`: Toggle Full Width on/off.
  - `Alt + O`: Toggle Org rendering across all code blocks simultaneously.
  - Width presets (80%, 90%, 94%, 100%) and collapsible pill mode.

---

## Development & Build Commands

This sub-package supports both **Deno 2.x** and **Node.js** task orchestrators:

```bash
# Build extension bundle to dist/
deno task build
# Or: npm run build

# Run headless unit test suite
deno task test
# Or: npm test

# Watch mode for rapid iteration
deno task watch
# Or: npm run watch
```

---

## Testing in Firefox / Zen Browser

### Option A: Local Interactive Test Fixture
Open `test-fixture.html` directly in Firefox to inspect the layout, HUD, interactive checkboxes, and test live response streaming:
```bash
firefox test-fixture.html
```

### Option B: Load into Firefox as Temporary Add-on
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **"Load Temporary Add-on..."**.
3. Select `dist/manifest.json` inside this folder.
4. Navigate to [gemini.google.com](https://gemini.google.com) and test any Org-mode prompt output.
