# Seller PDF Cropper & Compare

Client-side React + Vite + TypeScript + Tailwind CSS application powered by `@elsesourav/react-ui` for cropping shipping labels/invoices, stamping sequential serial numbers, and comparing multiple PDF sets directly in the browser.

> Legacy vanilla JS v1 code has been preserved on the `legacy-v1` branch.

## Features

- **Multi-PDF & N-Set Cropper**:
  - Upload 1 to 10,000+ PDFs per set with streaming memory-safe file inspection, duplicate-file detection, and virtualized queue rendering.
  - Add multiple PDF sets (`PDF Set 1`, `PDF Set 2`, ..., `PDF Set N`) with continuous sequential serial numbering (`Start From` + `Serial Size`).
  - Interactive visual **Crop Area** editor (`Label` and `Bill / Invoice` presets) with zoom, fit, and manual coordinate controls (`Left`, `Bottom`, `Width`, `Height`).
  - Optional automatic duplicate-page removal across overlapping PDFs.
- **Compare 2 or N PDF Sets (`Set 1 − (Set 2 ∪ ... ∪ Set N)`)**:
  - Upload multiple PDFs into **Set 1** and **Set 2** (plus **Add Subtract Set** for 3..N sets).
  - One-click **Switch ① ⇄ ②** button (and **Make ①** on extra sets) to reverse comparison direction.
  - Supports Smart ID + Text (`OD*`, `FMPP*`, `FMPC*` + fuzzy fallback), OD ID Only, Fuzzy Match (80%), and Exact Text matching.
  - Export **Raw Unique PDF** or **Cropped + Serial Numbered PDF** directly from comparison results.
- **Mobile Responsive & Private**:
  - Responsive layout, touch-friendly crop handles, mobile canvas page preview with Share & Download, and 100% browser-only processing.

## Architecture

```text
src/
├── types/          # Domain-separated TypeScript interfaces (crop, upload, matching, compare, ui)
├── constants/      # PDF dimensions, defaults, concurrency tuning, matching options
├── utils/          # Formatting, SHA-256/text hashing, localStorage persistence
├── services/pdf/   # Bounded-concurrency streaming inspection, text extraction, compare & crop engines
├── hooks/          # useCropConfig, useCompareWorkflow, useVirtualList
└── components/     # Modular UI components (common, cropper, compare, viewer, layout), all <= 500 lines
```

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
```
