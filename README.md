# Card Builder — Tyrants of the Underdark

A browser-based card constructor and fan-material library for **Tyrants of the Underdark**. Interface: English by default, with a persistent Ukrainian language switch. User-authored cards and original resources retain their own language.

## Features

- Blank front template with a fixed purple frame, aspect circle, title, cost, type, rules, flavour, victory points and footer.
- Upload artwork, drag it directly in the card preview, or adjust its crop and zoom with sliders. Mouse and touch dragging use the same saved crop. When a fitted image has no room to move on an axis, dragging gently increases its zoom to make room without exposing blank edges.
- Undo frame-color changes and reuse the eight most recent colors. Recent colors persist in this browser; undo history lasts for the editing session and is separate for each card.
- Choose an aspect symbol or upload a custom icon. Obedience uses the chain symbol extracted from the supplied Wizards card, including in inline effects and print exports.
- Original complete heading typeface, card proportions, aspect symbols and the bottom-left deck mark with an editable card number.
- Click any text region or icon in the card preview to open its editor. Ten ready-to-select deck marks are available alongside custom image uploads.
- Card numbering is visible by default as **1/40**, with separate editable card-number and deck-size fields. Existing blank numbers and legacy fractions migrate automatically; invalid numbering blocks print export.
- Short (Lost Huntman), standard (Gremlin) and larger rules-area layouts preserve the print size and type sizes while changing the artwork/rules split.
- Inline Influence/Power symbols, aspect icons, Unicode characters and uploaded custom symbols. Insert at the cursor; apply bold or italic to selected text. Saved tokens such as `[influence]` render as icons in preview and print exports.
- Native **MINION** PNG back by default, editable purple-pattern back or uploaded back image. Existing custom backs stay intact.
- Automatic local IndexedDB saves; JSON import/export for moving projects between devices.
- Exact **63.5 × 88 mm PDF**, PNG with physical-size metadata, ZIP of individual images, and A4 sheets with crop marks and mirrored back positions for long-edge duplex printing.
- Library of the supplied fan decks, backs, player mats, modular boards and original rules. Incomplete or conflicting sources are identified rather than silently altered.

Drafts stay in the current browser. They are not synchronized across devices or sent to a server. Export a JSON project as a backup.

## Community deck submissions

**Propose a deck** is available in the library, My cards and the footer. Authors choose cards they saved in the constructor, give the deck a name, and set copy counts. Card titles can be changed directly in the proposal and are also saved in My cards, including previously untitled cards. A saved card can be included only once; its copy count controls repeated copies. There is no separate card-image upload in this form.

The shared back comes from the first selected card by default, or from another card chosen in My cards. **Edit card back** opens that exact card's Back editor. Text rules and an optional PDF can be added separately. Up to 60 unique cards are supported. Submission refreshes the fronts and selected back from the latest editor state before creating the private server copy. Existing unsent drafts and receipts remain available after upgrading, including any previously saved draft images. Unsubmitted drafts stay in a separate browser database; submitted images and metadata are stored privately in Netlify Blobs.

The owner signs in at `#moderation` to review full-size cards and rules, add feedback, approve/publish, decline or unpublish a deck. Approval connects the same data to the existing library, card viewer, rules reader and A4 printing. Only approved decks appear in the public catalog. Authors can refresh their receipt to see the decision; receipt access stays in the browser where they submitted it. Declined submissions can be permanently deleted by the owner.

This requires the Netlify Function in `netlify/functions/decks.js`, not just static hosting. `npm run build` also prepares a standalone function ZIP in the ignored `.netlify/functions-build` directory for manual deployments. Keep the function in every future Netlify deploy; a static-files-only deploy can remove it. Standard Netlify Git builds use `netlify.toml`.

Set `DECK_SESSION_SECRET` to a random secret and `DECK_ADMIN_SETUP_HASH` to the SHA-256 of a one-time setup token through Netlify's environment settings, never in browser code or Git. The setup link is `#moderation/setup/<token>`; it works only before an owner credential exists. The server stores a salted scrypt password hash and issues an eight-hour HttpOnly, Secure, SameSite=Strict cookie. The owner can change the password in the moderation page, invalidating previous sessions. Uploads require a private submission token; images/rules remain inaccessible until approval, except to the owner. Input size/type checks, atomic upload quotas and sign-in limits run on the server. Images are re-encoded in the browser; HTML and SVG uploads are not accepted.

`tests/submissions.test.mjs` covers a complete 30-card moderation cycle, private images, forged ownership/session attempts, cross-origin writes, quotas, upload retries and library print compatibility. Local server tests use an isolated in-memory store; production uses Netlify Blobs with strong consistency.

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

`scripts/check-card-fidelity.mjs` rebuilds the supplied Gremlin example from editable fields and checks cursor insertion, formatting, custom-symbol persistence, exports and responsive layouts. `scripts/prepare-card-components.py` documents how the frame components and icons were recovered.

Card lettering uses the complete **Modesto** and **Scala Sans** fonts from the user-supplied BGG creation kit. Title, cost, type, aspect, victory points, rules and footer have separate styles. `src/card-typography.js` records the PSD font sizes, tracking and horizontal transforms, scaled to the 750 × 1040 print canvas; aspect and flavour widths are calibrated against the supplied Faerie reference. Card fonts do not replace website fonts. The source fonts contain Latin characters; Ukrainian text uses the existing Cyrillic fallback.

`scripts/prepare-source-fonts.py <creation-kit-directory>` packages the supplied `Fonts` folder into WOFF2 without subsetting glyphs. Requires Python `fonttools` and `brotli`. The committed output is ready to deploy; the build does not require the source kit or Python. `dist/assets/card-fonts/source-fonts.json` records the original PostScript names, character coverage and source hashes. Preview and print exports wait for all original faces to load; a failed font request stops export instead of silently producing a substitute typeface.

`scripts/check-editable-card.mjs` checks all direct-editing regions, the deck-mark picker, default and custom numbering, validation, persistence, the short Lost Huntman layout and its print exports.

`scripts/check-minion-back.mjs` checks native-back rendering, source downloads, PNG/PDF exports, legacy-draft migration, preservation of custom backs, and layouts at 1440, 768, 390 and 320 pixels. Set `TEST_URL` to check a deployment instead of localhost.

`scripts/check-card-corners.mjs` checks that rounded front-card and custom-back corners remain transparent in the preview and exported PNG, including after switching sides, at desktop, tablet and phone widths. The native MINION image keeps its original border unchanged.

`scripts/check-card-typography.mjs` reproduces custom MoonElf and TEST123 cards, verifies that letters and digits use one font run, checks font loading after refresh, preserves saved fields across language changes, exports PNG and checks desktop/tablet/phone previews.

## Printing

Use **Actual size / 100%**, not Fit to page. A4 sheets hold up to nine cards. For double-sided sheets use **flip on long edge**. Print one test sheet first: printer registration and printable margins vary. The PDF page/placement dimensions are authoritative; PNG programs may ignore embedded physical-size metadata.

The requested card size is 63.5 × 88 mm. Check fit against your physical cards and sleeves before printing an entire deck. This version uses the trim size and does not add a professional-print bleed area.

Source PDFs retain their original page sizes and are available separately from the card constructor exports.

Each deck in the library has a **Print deck** button, both on its tile and on its detail page. For decks with individual card images, it creates an A4 PDF with the supplied copy counts, 3 mm gaps, crop marks and optional mirrored backs. Supporting cards can be excluded separately. Conflicting source counts are shown before export; no cards are silently removed.

For Cohort and the Svirfneblin/Kuo-Toa update, only author-made print sheets are available. Their print button downloads those original PDFs, including supplied backs, as a ZIP rather than changing their layout.

`scripts/check-community-feedback.mjs` checks mouse/touch crop persistence, frame-color undo and recent colors, both interface languages, responsive print dialogs, complete deck downloads, PDF dimensions and mirrored back positions. `scripts/prepare-obedience.mjs` reproduces the chain-icon extraction from the bundled Wizards card image.

## Library preparation

The library separates individual card backs from printed front/back sheets and token reverses. Deck covers use front-facing components and stay within their thumbnail area. The Rules filter contains only classified rulebooks, expansion instructions and reference cards, rather than every available file.

`scripts/curate-library.py` runs after the library import. It assigns resource categories, produces full-card covers and readable rule-page previews, and preserves headings, lists and Word line breaks for the text reader. Original documents remain downloadable. The base-game rulebook opens from a verified public PDF mirror; it is an external resource and requires internet access.

### Optional support link

Set `supportUrl` in `dist/site-config.json` to your real HTTPS donation URL and deploy. The support link stays hidden while this value is empty. No payment service or destination is created automatically.

`scripts/prepare-library.py` documents the one-time import from the supplied local collection, using PyMuPDF and Pillow. It creates web previews and optimized printable source files without modifying the originals. Source paths are configurable in that script.

The sharp MINION back is extracted **directly from the embedded PNG on page 2 of the user-supplied `Faerie deck/Faerie 2.0.pdf`**, not reconstructed from a scan. `scripts/prepare-minion-back.py [source.pdf]` reproduces the extraction. The full 822 × 1122 image is preserved byte-for-byte as `dist/assets/minion-back-source.png`; `minion-back-print.png` is a lossless 750 × 1040 crop for the editor, with no resizing. The crop removes bleed and five additional pixels of black trim at the top and bottom to fit the requested aspect ratio. Source metadata and hash are in `minion-back-source.json`. Both PNGs can be downloaded in the Back tab.

The [BGG fan-deck creation kit](https://boardgamegeek.com/filepage/207673/fan-deck-creation-kit-card-template-plus-fonts) lists a `back.png` reference. BGG's download was inaccessible during this update; the bundled back comes from the supplied PDF, not from that download. No claim is made that this fan-created asset is an official publisher source.

This is an unofficial fan tool. Game and fan-expansion artwork belongs to its respective creators. Font licenses are included alongside the bundled fonts.
