# Studio ID — Photo Studio

A browser-based ID photo and print-sheet editor built with React, Vite, and HTML Canvas. It combines Epson Photo+-inspired document setup with in-browser AI background removal, background replacement, manual touch-up, photo adjustments, and 4R/A4 print sheets.

## Open the live app

After GitHub Pages is enabled for this repository and the **Build and deploy Studio ID** workflow succeeds, the app is available at:

**https://sd201826.github.io/Remove-bg/**

In GitHub, open **Settings → Pages** and choose **GitHub Actions** as the build and deployment source if it is not already selected. The workflow builds and deploys the static site whenever `main` is updated.

## Run locally

Requirements: Node.js 20 LTS or newer and npm 9+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

Create and preview a production build:

```bash
npm run build
npm run preview
```

The generated static site is written to `dist/`.

## Included tools

- Passport / visa presets: 2 × 2 in (50.8 mm), Bangladesh / international 35 × 45 mm, and 40 × 50 mm.
- Driver's licence, employee badge, and student card presets.
- Custom dimensions in millimetres, inches, or pixels, calculated at 300 DPI.
- Head-and-shoulders guide with eye-line and chin references.
- AI background removal with model-load and processing progress.
- Manual erase / restore brush and edge feathering.
- White, passport blue, light gray, red, custom solid colors, or a custom picture background.
- Background scale, horizontal / vertical position, and blur controls.
- Brightness, contrast, saturation, warmth, rotation, scale, and subject positioning.
- Undo / redo (`Ctrl+Z`, `Ctrl+Y`, or `Ctrl+Shift+Z`).
- PNG / JPG exports and 4R / A4 multi-copy print sheets with optional trim marks.

## AI background removal

Studio ID uses [`@imgly/background-removal`](https://github.com/imgly/background-removal-js), an open-source browser-side segmentation library. On first use, the browser downloads its model/runtime assets. Processing runs on the user's device; this app does not upload the photo to an application server.

Review the upstream project's **AGPL-3.0** license and its obligations before redistributing or offering a modified version as a commercial hosted service. The app's own source is maintained in this repository.

## Print sizing

Dimensions are calculated using `pixels = millimetres ÷ 25.4 × 300` or `pixels = inches × 300`. For accurate physical output, select **Actual size / 100%** in the printer dialog and disable **Fit to page**. Borderless printing and printer-driver margins depend on the printer.

## Notes

- Background-removal quality depends on the source photo, lighting, subject separation, browser memory, and the upstream model. Use the touch-up brush for edge corrections.
- The restore brush restores pixels from the original source image in the painted area.
- This editor is not an official government photo-compliance checker. Confirm photo rules with the receiving authority.
- Large images and A4 300-DPI sheets can use substantial browser memory.
