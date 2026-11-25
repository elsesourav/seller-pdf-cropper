# Seller PDF Cropper & Compare

100% client-side React + Vite + TypeScript + Tailwind CSS application powered by `@elsesourav/react-ui` for cropping shipping labels and tax invoices, stamping sequential serial numbers and unique codes, merging unique-order PDFs, splitting output chunks, and comparing multi-PDF sets directly in the browser.

> Legacy vanilla JS v1 code is preserved on the [`legacy-v1`](https://github.com/elsesourav/seller-pdf-cropper/tree/legacy-v1) branch.

## Features

- **Multi-PDF Cropper (`Label` & `Bill`)**:
  - Upload 1 to 10,000+ PDFs with bounded-concurrency streaming inspection, SHA-256 duplicate-file detection, and virtualized queue rendering.
  - Visual interactive **Adjust Crop** modal (`Top`, `Left`, `Width`, `Height`) with accurate Flipkart Label & Tax Invoice presets (`Label: Top 27, Left 188, Width 219, Height 358`; `Bill: Top 382, Left 30, Width 535, Height 390`), aligned demo PDF preview, zoom/fit controls, and automatic `localStorage` persistence.
  - Optional right-side **Serial Number** (`Start From`, `Size`) and left-side **Unique Code** (`A–Z` keypad) with crisp localized white padding (`Pad X = 3`, `Pad Y = 1`).
- **Order-ID Duplicate Removal & Unique Merge**:
  - **Skip Duplicates** (default ON) removes duplicate **Order IDs** both **within the same PDF** and **across multiple uploaded PDFs**.
  - When more than 1 PDF is queued in Cropper or Compare (`Set 1` / `Set 2`), a **Merge** button lets you download a combined PDF containing only **unique Order IDs**.
- **Compare PDFs (`Set 1 − Set 2`)**:
  - Upload multiple PDFs into **Set 1** and **Set 2** with a single **Switch** control, Order-ID matching, internal Set-1 deduplication, searchable virtual result list, and a toggleable `✓✓ All` selector.
  - View the unique raw PDF or send selected pages directly to **PDF Cropper** via **Crop Label / Bill**.
- **Output Preview & PDF Chunk Splitter**:
  - Embedded PDF viewer on desktop and responsive canvas preview on mobile, with header chunk selector (`All`, `50`, `100`, `200`, `500`) to break large outputs into per-chunk PDFs while preserving existing serial numbers.
- **Themes & Privacy**:
  - `Auto` / `Light` / `Dark` single-button theme switcher with circular View Transition reveal.
  - 100% browser-only processing — PDFs never leave your device.

## Architecture

```text
src/
├── constants/      # PDF dimensions, defaults, concurrency tuning (pdf.ts)
├── types/          # Domain TypeScript interfaces (compare, crop, matching, ui, upload)
├── utils/          # Crop geometry, number/file formatting, SHA-256 hashing, localStorage migration
├── services/pdf/   # Worker setup, streaming inspection, Order-ID matcher, compare/crop/merge/chunk & preview engines
├── hooks/          # useCropConfig, useCompareWorkflow, useVirtualList
└── components/     # Modular UI (common, cropper, compare, viewer, layout), all <= 500 lines
```

## Development

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run preview
```

## Author & Contact

- **Website**: [elsesourav.com](https://elsesourav.com)
- **Contact**: [contact@elsesourav.com](mailto:contact@elsesourav.com)
- **GitHub**: [github.com/elsesourav/seller-pdf-cropper](https://github.com/elsesourav/seller-pdf-cropper)
