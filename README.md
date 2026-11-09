# Underdark Atelier

A browser-based card constructor and fan-material library for **Tyrants of the Underdark**. Interface: Ukrainian; card content accepts any language supported by the bundled fonts.

## Features

- Blank front template with a fixed purple frame, aspect circle, title, cost, type, rules, flavour, victory points and footer.
- Upload artwork, adjust crop and zoom, choose a symbol or upload a custom icon.
- Original Minion back, editable purple-pattern back or uploaded back image.
- Automatic local IndexedDB saves; JSON import/export for moving projects between devices.
- Exact **63.5 × 88 mm PDF**, PNG with physical-size metadata, ZIP of individual images, and A4 sheets with crop marks and mirrored back positions for long-edge duplex printing.
- Library of the supplied fan decks, backs, player mats, modular boards and original rules. Incomplete or conflicting sources are identified rather than silently altered.

Drafts stay in the current browser. They are not synchronized across devices or sent to a server. Export a JSON project as a backup.

## Run

Requires Node.js 22+.

```sh
npm ci
npm run build
npm run dev
```

Open http://localhost:4188. Deploy the `dist` directory; Vercel configuration is included. The committed library files are ready to use and do not require access to the original Windows folders.

```sh
npm test
```

`scripts/check-browser.mjs` is a local browser-verification harness. Adjust its Chrome and Playwright locations to run it on another computer. Its screenshots and generated test files are excluded from Git.

## Printing

Use **Actual size / 100%**, not Fit to page. A4 sheets hold up to nine cards. For double-sided sheets use **flip on long edge**. Print one test sheet first: printer registration and printable margins vary. The PDF page/placement dimensions are authoritative; PNG programs may ignore embedded physical-size metadata.

The requested card size is 63.5 × 88 mm. Check fit against your physical cards and sleeves before printing an entire deck. This version uses the trim size and does not add a professional-print bleed area.

Source PDFs retain their original page sizes and are available separately from the card constructor exports.

## Library preparation

`scripts/prepare-library.py` documents the one-time import from the supplied local collection, using PyMuPDF and Pillow. It creates web previews and optimized printable source files without modifying the originals. Source paths are configurable in that script.

This is an unofficial fan tool. Game and fan-expansion artwork belongs to its respective creators. Font licenses are included alongside the bundled fonts.
