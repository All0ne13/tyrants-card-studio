# Tyrants of the Underdark — Card Studio

A browser-based card builder and fan-material library for **Tyrants of the Underdark**. It lets players design print-ready cards, explore community decks and prepare physical-print exports at the game's card size.

**Live demo:** [underdarkcards.csproject.org](https://underdarkcards.csproject.org/)

> This is an unofficial, non-commercial fan tool. Game and fan-expansion artwork belongs to its respective creators.

## Highlights

- **Print-ready card editor** — fixed 63.5 × 88 mm card format, editable title, aspect, cost, type, rules, flavour text, victory points and footer.
- **Artwork controls** — image upload, direct drag-to-position, crop/zoom controls and responsive preview.
- **Game-aware symbols** — selectable aspect icons, deck marks and inline effect symbols, including custom uploads.
- **Faithful exports** — PNG, single-card PDF, print-sheet PDF and ZIP export with crop marks and long-edge duplex backs.
- **Deck library** — curated fan decks, player boards, maps, rules and printable files with an in-site reader.
- **Print-shop library PDFs** — choose one card side per 63.5 × 88 mm page, with alternating fronts and backs, or keep the existing A4 sheets. Physical copy counts and the deck's own back are included; fronts-only export is also available.
- **Community workflow** — build a deck from saved cards, submit it for owner review and publish it to the library only after approval.
- **Bilingual interface** — English and Ukrainian UI with persistent language selection.

## Technology

| Area                  | Implementation                      |
| --------------------- | ----------------------------------- |
| Client                | Vanilla JavaScript, HTML and CSS    |
| Build                 | esbuild                             |
| Print export          | jsPDF, fflate                       |
| Persistence           | IndexedDB in the browser            |
| Community submissions | Netlify Functions and Netlify Blobs |
| Tests                 | Node test runner                    |
| Hosting               | Netlify                             |

## Project structure

```text
content/              Curated deck guide metadata
dist/                 Production bundle and hosted library assets
netlify/functions/    Secure deck-submission endpoint
scripts/              Build, local server, verification and asset-preparation tools
server/               Submission and moderation domain service
src/                  Editor, print engine, library and community UI source
tests/                Automated behaviour and regression tests
```

`dist/` is intentionally versioned: it is the deployable site bundle used by the live project. Local previews, hosting linkage, environment files, dependency folders and test artifacts are ignored.

## Run locally

Requires Node.js 22 or later.

```bash
npm ci
npm run build
npm run dev
```

Open [http://localhost:4188](http://localhost:4188).

## Verify

```bash
npm test
```

Tests cover card editing, typography, export dimensions, library data, deck submissions and moderation rules.

## Printing a library deck

Open a deck in **Library** and choose **Print deck**. Select **One card side per page** for a print shop: page 1 is the first front, page 2 its back, then the next front and back. Every page is 63.5 × 88 mm. Untick **Include card backs** for a fronts-only PDF. **A4 sheets** remains available for home printing.

Decks supplied only as author print sheets also have prepared single-card PDFs. Cohorts includes both the original and alternative sets of ten cards from its source document; Svirfneblin & Kuo-Toa contains the ten supplied update cards. Rebuild those PDFs with `python scripts/prepare-single-card-pdfs.py` after installing PyMuPDF when the source documents change.

## Publishing a community deck

### Language versions and secondary aspects

The editor supports an optional secondary aspect: school name, temporary Unicode symbol or uploaded icon. Leave the name empty to keep the standard card layout. The secondary aspect is stored with the project and rendered by the same engine used for print exports. Exact Wizards artwork and positioning can be calibrated when its author supplies the PSD.

Library decks can provide a `translations` array with complete language-specific cards, rules, backs and printable files; see `content/translations.example.json`. Language links open separate versions without changing the interface language. Translations never silently reuse original-language rules or downloads. `?demo=translations#library/mercenaries` enables a labelled Portuguese switching example with no fabricated translated files or print export.

1. Create and save individual cards in **My cards**.
2. Use **Propose a deck** to choose saved cards, set copy counts, select one saved card as the shared back and add optional rules.
3. Submit for review. Submissions stay private until an owner approves them.

No player card data is committed from browser drafts; authors control when a completed deck is sent for review.

## License

Copyright © 2026 Vladislav Marchenko. See [LICENSE](LICENSE).
