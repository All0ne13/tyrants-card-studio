# Card Builder — Tyrants of the Underdark

A browser-based card constructor and fan-material library for **Tyrants of the Underdark**. Interface: English by default, with a persistent Ukrainian language switch. User-authored cards and original resources retain their own language.

## Features

- Blank front template with a fixed purple frame, aspect circle, title, cost, type, rules, flavour, victory points and footer.
- Upload artwork, adjust crop and zoom, choose a symbol or upload a custom icon.
- Source-derived Latin title lettering, card proportions, aspect symbols and the bottom-left deck mark with an editable card number.
- Click any text region or icon in the card preview to open its editor. Ten ready-to-select deck marks are available alongside custom image uploads.
- Card numbering is visible by default as **1/40**, with separate editable card-number and deck-size fields. Existing blank numbers and legacy fractions migrate automatically; invalid numbering blocks print export.
- Short (Lost Huntman), standard (Gremlin) and larger rules-area layouts preserve the print size and type sizes while changing the artwork/rules split.
- Inline Influence/Power symbols, aspect icons, Unicode characters and uploaded custom symbols. Insert at the cursor; apply bold or italic to selected text. Saved tokens such as `[influence]` render as icons in preview and print exports.
- Native **MINION** PNG back by default, editable purple-pattern back or uploaded back image. Existing custom backs stay intact.
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

`scripts/check-card-fidelity.mjs` rebuilds the supplied Gremlin reference from editable fields and checks cursor insertion, formatting, custom-symbol persistence, exports and responsive layouts. `scripts/prepare-card-components.py` documents how the source-derived Latin lettering and icon assets were recovered from the supplied raster cards. Non-Latin or unavailable title glyphs use the bundled serif fallback; the rules font supports Cyrillic.

`scripts/check-editable-card.mjs` checks all direct-editing regions, the deck-mark picker, default and custom numbering, validation, persistence, the short Lost Huntman layout and its print exports.

`scripts/check-minion-back.mjs` checks native-back rendering, source downloads, PNG/PDF exports, legacy-draft migration, preservation of custom backs, and layouts at 1440, 768, 390 and 320 pixels. Set `TEST_URL` to check a deployment instead of localhost.

`scripts/check-card-corners.mjs` checks that rounded front-card and custom-back corners remain transparent in the preview and exported PNG, including after switching sides, at desktop, tablet and phone widths. The native MINION image keeps its original border unchanged.

## Printing

Use **Actual size / 100%**, not Fit to page. A4 sheets hold up to nine cards. For double-sided sheets use **flip on long edge**. Print one test sheet first: printer registration and printable margins vary. The PDF page/placement dimensions are authoritative; PNG programs may ignore embedded physical-size metadata.

The requested card size is 63.5 × 88 mm. Check fit against your physical cards and sleeves before printing an entire deck. This version uses the trim size and does not add a professional-print bleed area.

Source PDFs retain their original page sizes and are available separately from the card constructor exports.

## Library preparation

The library separates individual card backs from printed front/back sheets and token reverses. Deck covers use front-facing components and stay within their thumbnail area. The Rules filter contains only classified rulebooks, expansion instructions and reference cards, rather than every available file.

`scripts/curate-library.py` runs after the library import. It assigns resource categories, produces full-card covers and readable rule-page previews, and preserves headings, lists and Word line breaks for the text reader. Original documents remain downloadable. The base-game rulebook opens from a verified public PDF mirror; it is an external resource and requires internet access.

### Optional support link

Set `supportUrl` in `dist/site-config.json` to your real HTTPS donation URL and deploy. The support link stays hidden while this value is empty. No payment service or destination is created automatically.

`scripts/prepare-library.py` documents the one-time import from the supplied local collection, using PyMuPDF and Pillow. It creates web previews and optimized printable source files without modifying the originals. Source paths are configurable in that script.

The sharp MINION back is extracted **directly from the embedded PNG on page 2 of the user-supplied `Faerie deck/Faerie 2.0.pdf`**, not reconstructed from a scan. `scripts/prepare-minion-back.py [source.pdf]` reproduces the extraction. The full 822 × 1122 image is preserved byte-for-byte as `dist/assets/minion-back-source.png`; `minion-back-print.png` is a lossless 750 × 1040 crop for the editor, with no resizing. The crop removes bleed and five additional pixels of black trim at the top and bottom to fit the requested aspect ratio. Source metadata and hash are in `minion-back-source.json`. Both PNGs can be downloaded in the Back tab.

The [BGG fan-deck creation kit](https://boardgamegeek.com/filepage/207673/fan-deck-creation-kit-card-template-plus-fonts) lists a `back.png` reference. BGG's download was inaccessible during this update; the bundled back comes from the supplied PDF, not from that download. No claim is made that this fan-created asset is an official publisher source.

This is an unofficial fan tool. Game and fan-expansion artwork belongs to its respective creators. Font licenses are included alongside the bundled fonts.
